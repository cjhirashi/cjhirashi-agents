/**
 * Global Error Handler
 *
 * Provides consistent error handling across all API routes with:
 * - Standard error response format
 * - HTTP status code mapping
 * - Request ID tracking
 * - Structured logging
 * - PII protection
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import logger, { redactPII } from '../logging/logger';

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    requestId: string;
    details?: Record<string, any>;
  };
}

/**
 * Custom API Error Class
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to JSON response
   */
  toJSON(requestId: string): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: new Date().toISOString(),
        requestId,
        ...(this.details && { details: redactPII(this.details) }),
      },
    };
  }
}

/**
 * Format Zod validation errors
 */
function formatZodError(error: ZodError): string {
  const firstError = error.errors[0];
  if (!firstError) return 'Validation failed';

  const field = firstError.path.join('.');
  return `${field}: ${firstError.message}`;
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Main Error Handler
 * Converts any error into a standardized API response
 */
export function handleError(error: unknown, requestId: string): NextResponse<ApiErrorResponse> {
  // Zod Validation Errors
  if (error instanceof ZodError) {
    const formattedMessage = formatZodError(error);

    logger.warn('Validation error', {
      requestId,
      error: error.errors,
      message: formattedMessage,
    });

    return NextResponse.json(
      new ApiError(formattedMessage, 400, 'VALIDATION_ERROR', {
        issues: error.errors,
      }).toJSON(requestId),
      { status: 400 }
    );
  }

  // Custom API Errors
  if (error instanceof ApiError) {
    // Log based on severity
    if (error.statusCode >= 500) {
      logger.error('API Error (5xx)', {
        requestId,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
      });
    } else {
      logger.warn('API Error (4xx)', {
        requestId,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    return NextResponse.json(error.toJSON(requestId), { status: error.statusCode });
  }

  // Prisma Errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: any };

    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target?.[0] || 'field';
      logger.warn('Prisma unique constraint violation', {
        requestId,
        code: prismaError.code,
        field,
      });

      return NextResponse.json(
        new ApiError(`${field} already exists`, 409, 'UNIQUE_CONSTRAINT_VIOLATION', {
          field,
        }).toJSON(requestId),
        { status: 409 }
      );
    }

    // Database connection error
    if (prismaError.code === 'P1001') {
      logger.error('Database connection failed', {
        requestId,
        code: prismaError.code,
      });

      return NextResponse.json(
        new ApiError('Database connection error', 500, 'DATABASE_ERROR').toJSON(requestId),
        { status: 500 }
      );
    }
  }

  // Generic Errors
  if (error instanceof Error) {
    logger.error('Unhandled error', {
      requestId,
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Don't leak internal details in production
    const message =
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Our team has been notified.'
        : error.message;

    return NextResponse.json(
      new ApiError(message, 500, 'INTERNAL_ERROR').toJSON(requestId),
      { status: 500 }
    );
  }

  // Unknown error type
  logger.error('Unknown error type', {
    requestId,
    error: String(error),
  });

  return NextResponse.json(
    new ApiError(
      'An unexpected error occurred. Our team has been notified.',
      500,
      'INTERNAL_ERROR'
    ).toJSON(requestId),
    { status: 500 }
  );
}

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors
 */
export function withErrorHandling<T>(
  handler: (req: Request, context?: any) => Promise<NextResponse<T>>
) {
  return async (req: Request, context?: any): Promise<NextResponse<T | ApiErrorResponse>> => {
    const requestId = generateRequestId();

    try {
      return await handler(req, context);
    } catch (error) {
      return handleError(error, requestId);
    }
  };
}

/**
 * Common API Errors (for reusability)
 */
export const Errors = {
  // Authentication
  UNAUTHORIZED: (message = 'Authentication required') =>
    new ApiError(message, 401, 'UNAUTHORIZED'),

  TOKEN_EXPIRED: () => new ApiError('Authentication token has expired', 401, 'TOKEN_EXPIRED'),

  TOKEN_INVALID: () => new ApiError('Authentication token is invalid', 401, 'TOKEN_INVALID'),

  // Authorization
  FORBIDDEN: (message = 'You do not have permission to access this resource') =>
    new ApiError(message, 403, 'FORBIDDEN'),

  INSUFFICIENT_PERMISSIONS: (requiredRole: string, currentRole: string) =>
    new ApiError(`${requiredRole} role required`, 403, 'INSUFFICIENT_PERMISSIONS', {
      requiredRole,
      currentRole,
    }),

  // Resources
  NOT_FOUND: (resource: string) =>
    new ApiError(`${resource} not found`, 404, 'RESOURCE_NOT_FOUND', { resource }),

  // Validation
  VALIDATION_FAILED: (message: string, details?: Record<string, any>) =>
    new ApiError(message, 400, 'VALIDATION_ERROR', details),

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: (limit: number, resetAt: Date) =>
    new ApiError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', {
      limit,
      resetAt: resetAt.toISOString(),
    }),

  // Storage
  STORAGE_QUOTA_EXCEEDED: (used: number, limit: number) =>
    new ApiError('Storage quota exceeded', 507, 'STORAGE_QUOTA_EXCEEDED', {
      used,
      limit,
    }),

  FILE_TOO_LARGE: (fileSize: number, maxSize: number) =>
    new ApiError('File exceeds maximum size', 413, 'FILE_TOO_LARGE', {
      fileSize,
      maxSize,
    }),

  // External Services
  LLM_SERVICE_ERROR: (provider: string) =>
    new ApiError('AI service is temporarily unavailable', 503, 'LLM_SERVICE_ERROR', {
      provider,
    }),

  RAG_SERVICE_ERROR: () =>
    new ApiError('Document search is temporarily unavailable', 503, 'RAG_SERVICE_ERROR'),

  // Database
  DATABASE_ERROR: () => new ApiError('Database error occurred', 500, 'DATABASE_ERROR'),
};

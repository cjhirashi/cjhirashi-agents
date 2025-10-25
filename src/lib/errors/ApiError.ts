/**
 * Custom API Error Class
 *
 * Standardized error handling for API endpoints
 */

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly timestamp: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to JSON response format
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.details && { details: this.details })
      }
    };
  }
}

/**
 * Common API Error Factories
 */
export class ApiErrors {
  static notFound(resource: string, id?: string) {
    return new ApiError(
      `${resource} not found${id ? ` (ID: ${id})` : ''}`,
      404,
      `${resource.toUpperCase()}_NOT_FOUND`
    );
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiError(message, 403, 'FORBIDDEN');
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new ApiError(message, 400, 'BAD_REQUEST', details);
  }

  static validation(message: string, details?: Record<string, unknown>) {
    return new ApiError(message, 400, 'VALIDATION_ERROR', details);
  }

  static rateLimit(resetAt?: string) {
    return new ApiError(
      'Rate limit exceeded',
      429,
      'RATE_LIMIT_EXCEEDED',
      resetAt ? { resetAt } : undefined
    );
  }

  static internal(message: string = 'Internal server error') {
    return new ApiError(message, 500, 'INTERNAL_SERVER_ERROR');
  }

  static serviceUnavailable(message: string = 'Service temporarily unavailable') {
    return new ApiError(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

# Error Handling Strategy - cjhirashi-agents MVP

**Version:** 1.0
**Date:** 2025-10-22
**Status:** DESIGN PHASE
**Owner:** Backend Coder

---

## Table of Contents

1. [Overview](#overview)
2. [Error Handling Philosophy](#error-handling-philosophy)
3. [Error Response Format](#error-response-format)
4. [HTTP Status Codes](#http-status-codes)
5. [Business Error Codes](#business-error-codes)
6. [Error Handling by Layer](#error-handling-by-layer)
7. [Common Error Scenarios](#common-error-scenarios)
8. [Logging Strategy](#logging-strategy)
9. [Error Recovery Patterns](#error-recovery-patterns)
10. [Monitoring & Alerting](#monitoring--alerting)
11. [Client Error Handling](#client-error-handling)
12. [Testing Strategy](#testing-strategy)

---

## Overview

This document defines the comprehensive error handling strategy for the cjhirashi-agents MVP. A robust error handling system is critical for:

- **User Experience:** Clear, actionable error messages
- **Debugging:** Detailed logs for troubleshooting
- **Monitoring:** Proactive issue detection
- **Recovery:** Graceful degradation and retry logic
- **Security:** No sensitive information leakage

### Key Principles

1. **Clarity:** Errors should be understandable by end users
2. **Actionability:** Users should know what to do next
3. **Consistency:** Same error format across all endpoints
4. **Security:** Never expose internal details to users
5. **Traceability:** Every error should be logged with request ID

---

## Error Handling Philosophy

### Three Pillars of Error Handling

#### 1. Prevention (Design Time)

**Input Validation:**
```typescript
// Validate BEFORE processing
const schema = registerSchema.parse(body); // Throws if invalid
```

**Type Safety:**
```typescript
// TypeScript prevents many errors at compile time
function getUser(id: string): Promise<User> // Type-safe
```

**Defensive Programming:**
```typescript
// Check assumptions
if (!userId) {
  throw new ApiError('User ID is required', 400);
}
```

#### 2. Detection (Runtime)

**Graceful Errors:**
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new ApiError('Something went wrong', 500);
}
```

**Error Boundaries:**
```typescript
// API routes wrapped in error handler
export async function POST(req: Request) {
  return withErrorHandling(async () => {
    // Your logic here
  });
}
```

#### 3. Recovery (Failure Handling)

**Retry Logic:**
```typescript
// Retry with exponential backoff
await retry(operation, { maxAttempts: 3, backoff: 'exponential' });
```

**Fallbacks:**
```typescript
// Graceful degradation
const result = await primaryService().catch(() => fallbackService());
```

**Circuit Breaker:**
```typescript
// Prevent cascading failures
if (circuitBreaker.isOpen()) {
  throw new ServiceUnavailableError('Service temporarily unavailable');
}
```

---

## Error Response Format

### Standard Error Structure

**All errors follow this format:**

```typescript
interface ApiErrorResponse {
  error: {
    code: string;              // Machine-readable error code
    message: string;           // Human-readable message
    statusCode: number;        // HTTP status code
    timestamp: string;         // ISO 8601 timestamp
    requestId: string;         // Trace request across logs
    details?: Record<string, any>; // Additional context
  };
}
```

### Example Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required and must be a valid email address",
    "statusCode": 400,
    "timestamp": "2025-10-22T10:30:00Z",
    "requestId": "req-abc123-def456",
    "details": {
      "field": "email",
      "reason": "format_invalid",
      "expected": "user@example.com",
      "received": "invalid-email"
    }
  }
}
```

### TypeScript Implementation

```typescript
// lib/errors/ApiError.ts
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON(requestId: string): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: new Date().toISOString(),
        requestId,
        ...(this.details && { details: this.details })
      }
    };
  }
}
```

---

## HTTP Status Codes

### 2xx - Success

#### 200 OK
**When to use:** Successful GET, PATCH, DELETE request
**Example:**
```json
{
  "data": { "user": { "id": "123", "name": "John" } },
  "meta": { "timestamp": "2025-10-22T10:30:00Z" }
}
```

#### 201 Created
**When to use:** Successful POST that creates a resource
**Example:**
```json
{
  "data": {
    "id": "new-resource-uuid",
    "name": "New Resource",
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

#### 204 No Content
**When to use:** Successful DELETE with no response body
**Example:** (Empty response body)

---

### 4xx - Client Errors

#### 400 Bad Request
**When to use:** Invalid request syntax, malformed JSON, validation errors

**Scenarios:**
- Malformed JSON body
- Missing required fields
- Invalid field types
- Business logic validation failures

**Example:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters",
    "statusCode": 400,
    "details": {
      "field": "password",
      "reason": "too_short",
      "minLength": 8,
      "currentLength": 5
    }
  }
}
```

#### 401 Unauthorized
**When to use:** Missing or invalid authentication token

**Scenarios:**
- No Authorization header
- Invalid JWT token
- Expired token
- Token signature verification failed

**Example:**
```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Authentication token has expired",
    "statusCode": 401,
    "details": {
      "expiredAt": "2025-10-22T09:00:00Z",
      "currentTime": "2025-10-22T10:30:00Z"
    }
  }
}
```

#### 403 Forbidden
**When to use:** User is authenticated but lacks permissions

**Scenarios:**
- Insufficient role (USER trying admin endpoint)
- Resource not owned by user
- Tier limit exceeded
- Feature not available in current tier

**Example:**
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Admin role required to access this resource",
    "statusCode": 403,
    "details": {
      "requiredRole": "ADMIN",
      "currentRole": "USER"
    }
  }
}
```

#### 404 Not Found
**When to use:** Resource doesn't exist

**Scenarios:**
- Invalid resource ID
- Resource deleted
- Endpoint doesn't exist

**Example:**
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Chat session not found",
    "statusCode": 404,
    "details": {
      "resourceType": "ChatSession",
      "resourceId": "session-uuid-123"
    }
  }
}
```

#### 409 Conflict
**When to use:** Request conflicts with current state

**Scenarios:**
- Duplicate resource (email already exists)
- Version mismatch (optimistic locking)
- Concurrent modification

**Example:**
```json
{
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Email address is already registered",
    "statusCode": 409,
    "details": {
      "email": "user@example.com",
      "registeredAt": "2024-06-15T10:00:00Z"
    }
  }
}
```

#### 422 Unprocessable Entity
**When to use:** Request syntax is valid but semantic validation fails

**Scenarios:**
- Business rule violation
- Invalid state transition
- Constraint violation

**Example:**
```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot change status from CLOSED to IN_PROGRESS",
    "statusCode": 422,
    "details": {
      "currentStatus": "CLOSED",
      "requestedStatus": "IN_PROGRESS",
      "allowedTransitions": ["RESOLVED"]
    }
  }
}
```

#### 429 Too Many Requests
**When to use:** Rate limit exceeded

**Scenarios:**
- Per-minute rate limit
- Per-hour rate limit
- Monthly quota exceeded

**Example:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your monthly message quota",
    "statusCode": 429,
    "details": {
      "limit": 100,
      "used": 100,
      "resetAt": "2025-11-01T00:00:00Z",
      "tier": "FREE",
      "upgradeUrl": "https://app.example.com/upgrade"
    }
  }
}
```

---

### 5xx - Server Errors

#### 500 Internal Server Error
**When to use:** Unexpected server error

**Scenarios:**
- Uncaught exception
- Database connection lost
- External API failure (fallback not available)

**Example:**
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Our team has been notified.",
    "statusCode": 500,
    "requestId": "req-abc123-def456"
  }
}
```

**Important:** NEVER expose internal details in 500 errors

#### 503 Service Unavailable
**When to use:** Service temporarily unavailable

**Scenarios:**
- Circuit breaker open
- Database maintenance
- Deployment in progress
- External dependency down

**Example:**
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service is temporarily unavailable. Please try again later.",
    "statusCode": 503,
    "details": {
      "retryAfter": 300,
      "estimatedRecovery": "2025-10-22T11:00:00Z"
    }
  }
}
```

---

## Business Error Codes

### Authentication Errors

#### INVALID_CREDENTIALS
**Status Code:** 401
**Trigger:** Email or password is incorrect
**User Action:** Check credentials and try again
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "statusCode": 401
  }
}
```

#### TOKEN_EXPIRED
**Status Code:** 401
**Trigger:** JWT token has expired
**User Action:** Refresh token or log in again
```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Authentication token has expired",
    "statusCode": 401,
    "details": {
      "expiredAt": "2025-10-22T09:00:00Z"
    }
  }
}
```

#### TOKEN_INVALID
**Status Code:** 401
**Trigger:** JWT token signature verification failed
**User Action:** Log in again
```json
{
  "error": {
    "code": "TOKEN_INVALID",
    "message": "Authentication token is invalid",
    "statusCode": 401
  }
}
```

#### USER_NOT_FOUND
**Status Code:** 404
**Trigger:** User with given email doesn't exist
**User Action:** Check email or register
```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found",
    "statusCode": 404
  }
}
```

#### EMAIL_ALREADY_EXISTS
**Status Code:** 409
**Trigger:** Email is already registered
**User Action:** Use different email or sign in
```json
{
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Email address is already registered",
    "statusCode": 409,
    "details": {
      "email": "user@example.com"
    }
  }
}
```

---

### Authorization Errors

#### INSUFFICIENT_PERMISSIONS
**Status Code:** 403
**Trigger:** User lacks required role
**User Action:** Contact admin
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Admin role required to access this resource",
    "statusCode": 403,
    "details": {
      "requiredRole": "ADMIN",
      "currentRole": "USER"
    }
  }
}
```

#### RESOURCE_NOT_OWNED
**Status Code:** 403
**Trigger:** User tries to access another user's resource
**User Action:** N/A (security measure)
```json
{
  "error": {
    "code": "RESOURCE_NOT_OWNED",
    "message": "You don't have access to this resource",
    "statusCode": 403
  }
}
```

#### TIER_LIMIT_EXCEEDED
**Status Code:** 403
**Trigger:** Feature not available in current tier
**User Action:** Upgrade tier
```json
{
  "error": {
    "code": "TIER_LIMIT_EXCEEDED",
    "message": "Your tier allows only 1 agent. Upgrade to enable more.",
    "statusCode": 403,
    "details": {
      "currentTier": "FREE",
      "allowedAgents": 1,
      "enabledAgents": 1,
      "upgradeUrl": "https://app.example.com/upgrade"
    }
  }
}
```

---

### Chat Errors

#### SESSION_NOT_FOUND
**Status Code:** 404
**Trigger:** Chat session doesn't exist
**User Action:** Create new session
```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Chat session not found",
    "statusCode": 404,
    "details": {
      "sessionId": "session-uuid-123"
    }
  }
}
```

#### MESSAGE_TOO_LONG
**Status Code:** 400
**Trigger:** Message exceeds max length
**User Action:** Shorten message
```json
{
  "error": {
    "code": "MESSAGE_TOO_LONG",
    "message": "Message exceeds maximum length of 10000 characters",
    "statusCode": 400,
    "details": {
      "currentLength": 15000,
      "maxLength": 10000
    }
  }
}
```

#### INVALID_AGENT_SELECTION
**Status Code:** 400
**Trigger:** Selected agent doesn't exist or is disabled
**User Action:** Select different agent
```json
{
  "error": {
    "code": "INVALID_AGENT_SELECTION",
    "message": "Selected agent is not available",
    "statusCode": 400,
    "details": {
      "agentId": "agent-uuid-123",
      "reason": "Agent is disabled"
    }
  }
}
```

#### LLM_SERVICE_ERROR
**Status Code:** 503
**Trigger:** External LLM API failure
**User Action:** Retry in a moment
```json
{
  "error": {
    "code": "LLM_SERVICE_ERROR",
    "message": "AI service is temporarily unavailable. Please try again.",
    "statusCode": 503,
    "details": {
      "retryAfter": 60,
      "provider": "openai"
    }
  }
}
```

#### RAG_SERVICE_ERROR
**Status Code:** 503
**Trigger:** Pinecone or embedding service failure
**User Action:** Retry or disable RAG
```json
{
  "error": {
    "code": "RAG_SERVICE_ERROR",
    "message": "Document search is temporarily unavailable",
    "statusCode": 503,
    "details": {
      "retryAfter": 60
    }
  }
}
```

---

### Storage Errors

#### STORAGE_QUOTA_EXCEEDED
**Status Code:** 507
**Trigger:** User has exceeded storage quota
**User Action:** Delete files or upgrade tier
```json
{
  "error": {
    "code": "STORAGE_QUOTA_EXCEEDED",
    "message": "Storage quota exceeded",
    "statusCode": 507,
    "details": {
      "used": 524288000,
      "limit": 524288000,
      "tier": "FREE",
      "upgradeUrl": "https://app.example.com/upgrade"
    }
  }
}
```

#### FILE_TOO_LARGE
**Status Code:** 413
**Trigger:** File exceeds max size for tier
**User Action:** Reduce file size or upgrade
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File exceeds maximum size for your tier",
    "statusCode": 413,
    "details": {
      "fileSize": 52428800,
      "maxSize": 10485760,
      "tier": "FREE"
    }
  }
}
```

#### UNSUPPORTED_FILE_TYPE
**Status Code:** 400
**Trigger:** File type not supported
**User Action:** Convert file to supported type
```json
{
  "error": {
    "code": "UNSUPPORTED_FILE_TYPE",
    "message": "File type not supported",
    "statusCode": 400,
    "details": {
      "fileType": "exe",
      "allowedTypes": ["pdf", "txt", "md", "docx", "jpg", "png"]
    }
  }
}
```

#### UPLOAD_FAILED
**Status Code:** 500
**Trigger:** File upload to Vercel Blob failed
**User Action:** Retry upload
```json
{
  "error": {
    "code": "UPLOAD_FAILED",
    "message": "File upload failed. Please try again.",
    "statusCode": 500,
    "requestId": "req-abc123"
  }
}
```

---

### System Errors

#### SERVICE_UNAVAILABLE
**Status Code:** 503
**Trigger:** Service is down or under maintenance
**User Action:** Wait and retry
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service is temporarily unavailable",
    "statusCode": 503,
    "details": {
      "retryAfter": 300,
      "estimatedRecovery": "2025-10-22T11:00:00Z"
    }
  }
}
```

#### DATABASE_ERROR
**Status Code:** 500
**Trigger:** Database connection or query error
**User Action:** Retry
```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database error occurred. Our team has been notified.",
    "statusCode": 500,
    "requestId": "req-abc123"
  }
}
```

#### EXTERNAL_API_ERROR
**Status Code:** 503
**Trigger:** External API (Gmail, Calendar, Notion) failure
**User Action:** Retry or disable integration
```json
{
  "error": {
    "code": "EXTERNAL_API_ERROR",
    "message": "External service is temporarily unavailable",
    "statusCode": 503,
    "details": {
      "service": "gmail",
      "retryAfter": 60
    }
  }
}
```

---

## Error Handling by Layer

### Layer 1: Input Validation (Request Layer)

**Validation with Zod:**
```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  name: z.string().min(2, 'Name must be at least 2 characters')
});
```

**Usage in API Route:**
```typescript
// app/api/auth/register/route.ts
import { registerSchema } from '@/lib/validation/schemas';
import { ApiError } from '@/lib/errors/ApiError';

export async function POST(req: Request) {
  const requestId = generateRequestId();

  try {
    const body = await req.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    // Process request
    const user = await createUser(validatedData);

    return Response.json({
      data: user,
      meta: { timestamp: new Date().toISOString(), requestId }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        new ApiError(
          formatZodError(error),
          400,
          'VALIDATION_ERROR',
          { issues: error.issues }
        ).toJSON(requestId),
        { status: 400 }
      );
    }

    // Handle other errors
    return handleError(error, requestId);
  }
}
```

---

### Layer 2: Business Logic (Service Layer)

**Service with Error Handling:**
```typescript
// lib/services/user-service.ts
import { ApiError } from '@/lib/errors/ApiError';
import { logger } from '@/lib/logger';

export class UserService {
  async registerUser(data: RegisterInput) {
    try {
      // Check if email exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new ApiError(
          'Email address is already registered',
          409,
          'EMAIL_ALREADY_EXISTS',
          { email: data.email }
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: hashedPassword
        }
      });

      logger.info('User registered', { userId: user.id, email: user.email });

      return user;

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('User registration failed', { error, data });
      throw new ApiError(
        'Failed to register user',
        500,
        'REGISTRATION_FAILED'
      );
    }
  }
}
```

---

### Layer 3: Data Access (Repository Layer)

**Repository with Error Handling:**
```typescript
// lib/repositories/user-repository.ts
import { ApiError } from '@/lib/errors/ApiError';
import { logger } from '@/lib/logger';

export class UserRepository {
  async findById(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        throw new ApiError(
          'User not found',
          404,
          'USER_NOT_FOUND',
          { userId: id }
        );
      }

      return user;

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Database query failed', { error, userId: id });
      throw new ApiError(
        'Database error occurred',
        500,
        'DATABASE_ERROR'
      );
    }
  }

  async create(data: CreateUserInput) {
    try {
      return await prisma.user.create({ data });
    } catch (error) {
      if (error.code === 'P2002') { // Prisma unique constraint
        throw new ApiError(
          'Email already exists',
          409,
          'EMAIL_ALREADY_EXISTS',
          { email: data.email }
        );
      }

      logger.error('Failed to create user', { error, data });
      throw new ApiError(
        'Database error occurred',
        500,
        'DATABASE_ERROR'
      );
    }
  }
}
```

---

### Layer 4: External Services (Integration Layer)

**External API with Retry Logic:**
```typescript
// lib/integrations/openai-client.ts
import { retry } from '@/lib/utils/retry';
import { ApiError } from '@/lib/errors/ApiError';
import { logger } from '@/lib/logger';

export class OpenAIClient {
  async generateCompletion(prompt: string) {
    try {
      return await retry(
        async () => {
          const response = await fetch('https://api.openai.com/v1/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4',
              prompt,
              max_tokens: 4096
            })
          });

          if (!response.ok) {
            if (response.status === 429) {
              throw new ApiError(
                'Rate limit exceeded',
                429,
                'RATE_LIMIT_EXCEEDED'
              );
            }

            if (response.status >= 500) {
              throw new ApiError(
                'OpenAI service error',
                503,
                'LLM_SERVICE_ERROR'
              );
            }

            throw new ApiError(
              'OpenAI request failed',
              response.status,
              'LLM_REQUEST_FAILED'
            );
          }

          return await response.json();
        },
        {
          maxAttempts: 3,
          backoff: 'exponential',
          onRetry: (attempt, error) => {
            logger.warn('Retrying OpenAI request', { attempt, error });
          }
        }
      );

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('OpenAI completion failed', { error, prompt });
      throw new ApiError(
        'AI service is temporarily unavailable',
        503,
        'LLM_SERVICE_ERROR'
      );
    }
  }
}
```

---

## Common Error Scenarios

### Scenario 1: User Registration with Duplicate Email

**Flow:**
1. User submits registration form
2. API validates input (Zod)
3. Service checks email uniqueness
4. Email already exists → Throw ApiError
5. Catch in API route → Return 409

**Implementation:**
```typescript
export async function POST(req: Request) {
  const requestId = generateRequestId();

  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const userService = new UserService();
    const user = await userService.registerUser(validatedData);

    return Response.json(
      { data: user, meta: { requestId } },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        new ApiError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          { issues: error.issues }
        ).toJSON(requestId),
        { status: 400 }
      );
    }

    if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_EXISTS') {
      return Response.json(error.toJSON(requestId), { status: 409 });
    }

    logger.error('Registration failed', { error, requestId });
    return Response.json(
      new ApiError(
        'An unexpected error occurred',
        500,
        'INTERNAL_ERROR'
      ).toJSON(requestId),
      { status: 500 }
    );
  }
}
```

---

### Scenario 2: Chat Message with External LLM Failure

**Flow:**
1. User sends chat message
2. API validates input
3. Service calls OpenAI API
4. OpenAI returns 503 (service down)
5. Retry with exponential backoff (3 attempts)
6. All retries fail → Circuit breaker opens
7. Return 503 to user

**Implementation:**
```typescript
// lib/services/chat-service.ts
import { circuitBreaker } from '@/lib/utils/circuit-breaker';

export class ChatService {
  async sendMessage(sessionId: string, message: string) {
    try {
      // Check circuit breaker
      if (circuitBreaker.isOpen('openai')) {
        throw new ApiError(
          'AI service is temporarily unavailable',
          503,
          'SERVICE_UNAVAILABLE',
          { retryAfter: circuitBreaker.retryAfter('openai') }
        );
      }

      // Call LLM
      const completion = await openaiClient.generateCompletion(message);

      // Success - record for circuit breaker
      circuitBreaker.recordSuccess('openai');

      return completion;

    } catch (error) {
      // Record failure for circuit breaker
      circuitBreaker.recordFailure('openai');

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        'AI service error',
        503,
        'LLM_SERVICE_ERROR'
      );
    }
  }
}
```

---

### Scenario 3: File Upload Exceeding Storage Quota

**Flow:**
1. User uploads file
2. API validates file type and size
3. Service checks user's storage quota
4. Quota exceeded → Throw ApiError
5. Return 507 with quota details

**Implementation:**
```typescript
export async function POST(req: Request) {
  const requestId = generateRequestId();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new ApiError('File is required', 400, 'MISSING_FILE');
    }

    // Check file size
    const maxSize = getMaxFileSizeForTier(user.tier);
    if (file.size > maxSize) {
      throw new ApiError(
        'File exceeds maximum size for your tier',
        413,
        'FILE_TOO_LARGE',
        { fileSize: file.size, maxSize, tier: user.tier }
      );
    }

    // Check storage quota
    const quota = await storageService.getQuota(user.id);
    if (quota.used + file.size > quota.limit) {
      throw new ApiError(
        'Storage quota exceeded',
        507,
        'STORAGE_QUOTA_EXCEEDED',
        {
          used: quota.used,
          limit: quota.limit,
          fileSize: file.size,
          tier: user.tier
        }
      );
    }

    // Upload file
    const uploadedFile = await storageService.upload(file, user.id);

    return Response.json(
      { data: uploadedFile, meta: { requestId } },
      { status: 201 }
    );

  } catch (error) {
    return handleError(error, requestId);
  }
}
```

---

### Scenario 4: Database Connection Lost

**Flow:**
1. User makes request
2. API calls database
3. Database connection lost
4. Prisma throws error
5. Catch and log error
6. Return 500 to user
7. Alert monitoring system

**Implementation:**
```typescript
// lib/repositories/user-repository.ts
export class UserRepository {
  async findById(id: string) {
    try {
      return await prisma.user.findUnique({ where: { id } });

    } catch (error) {
      // Prisma connection error
      if (error.code === 'P1001') {
        logger.error('Database connection failed', { error });

        // Trigger alert
        await alerting.sendAlert({
          severity: 'critical',
          message: 'Database connection lost',
          error
        });

        throw new ApiError(
          'Database connection error',
          500,
          'DATABASE_ERROR'
        );
      }

      // Generic database error
      logger.error('Database query failed', { error, userId: id });
      throw new ApiError(
        'Database error occurred',
        500,
        'DATABASE_ERROR'
      );
    }
  }
}
```

---

## Logging Strategy

### Log Levels

**DEBUG:** Detailed diagnostic information
```typescript
logger.debug('Validating request body', { body });
```

**INFO:** General informational messages
```typescript
logger.info('User registered', { userId, email });
```

**WARN:** Warning messages (recoverable errors)
```typescript
logger.warn('Retrying OpenAI request', { attempt: 2, error });
```

**ERROR:** Error messages (unrecoverable errors)
```typescript
logger.error('Database query failed', { error, query });
```

**FATAL:** Critical errors (system down)
```typescript
logger.fatal('Database connection lost', { error });
```

---

### Structured Logging

**Format:** JSON structured logs for easy parsing

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION
  }
});
```

**Log Example:**
```json
{
  "level": "error",
  "time": "2025-10-22T10:30:00.000Z",
  "env": "production",
  "version": "1.0.0",
  "msg": "Database query failed",
  "error": {
    "message": "Connection timeout",
    "stack": "..."
  },
  "context": {
    "userId": "user-uuid",
    "requestId": "req-abc123",
    "query": "SELECT * FROM users WHERE id = ?"
  }
}
```

---

### What to Log

#### ✅ DO LOG:
- All errors (with stack traces)
- Request ID for every request
- User ID for authenticated requests
- Slow queries (> 100ms)
- External API failures
- Rate limit hits
- Authentication failures
- Important business events

#### ❌ DON'T LOG:
- Passwords (plaintext or hashed)
- Authentication tokens (JWT, OAuth)
- Credit card numbers
- PII (unless encrypted)
- Full request bodies (may contain sensitive data)

---

### PII Handling

**Redact sensitive fields:**
```typescript
// lib/logger.ts
import { redact } from 'pino-redact';

export const logger = pino({
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'creditCard',
      'ssn'
    ],
    censor: '[REDACTED]'
  }
});
```

**Example:**
```typescript
// Before redaction
logger.info('User login', {
  email: 'user@example.com',
  password: 'SecurePassword123!'
});

// After redaction
{
  "msg": "User login",
  "email": "user@example.com",
  "password": "[REDACTED]"
}
```

---

### Log Aggregation

**Tools:**
- **Vercel Logs:** Built-in log viewer
- **Datadog:** APM + Logs
- **Sentry:** Error tracking
- **LogDNA:** Log aggregation

**Configuration:**
```typescript
// lib/logger.ts
if (process.env.NODE_ENV === 'production') {
  // Send logs to Datadog
  logger.addStream({
    stream: datadogTransport({
      apiKey: process.env.DATADOG_API_KEY,
      service: 'cjhirashi-agents',
      env: process.env.VERCEL_ENV
    })
  });
}
```

---

## Error Recovery Patterns

### Pattern 1: Retry with Exponential Backoff

**Use Case:** Transient errors (network, external API)

```typescript
// lib/utils/retry.ts
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts: number;
    backoff: 'linear' | 'exponential';
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < options.maxAttempts) {
        const delay = options.backoff === 'exponential'
          ? Math.pow(2, attempt) * 1000  // 2s, 4s, 8s
          : attempt * 1000;              // 1s, 2s, 3s

        options.onRetry?.(attempt, error);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
```

**Usage:**
```typescript
const result = await retry(
  () => openaiClient.generateCompletion(prompt),
  {
    maxAttempts: 3,
    backoff: 'exponential',
    onRetry: (attempt, error) => {
      logger.warn('Retrying OpenAI request', { attempt, error });
    }
  }
);
```

---

### Pattern 2: Circuit Breaker

**Use Case:** Prevent cascading failures

```typescript
// lib/utils/circuit-breaker.ts
class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailure = new Map<string, Date>();
  private state = new Map<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>();

  constructor(
    private threshold = 5,      // Open after 5 failures
    private timeout = 60000     // Try again after 60s
  ) {}

  recordFailure(service: string) {
    const failures = (this.failures.get(service) || 0) + 1;
    this.failures.set(service, failures);
    this.lastFailure.set(service, new Date());

    if (failures >= this.threshold) {
      this.state.set(service, 'OPEN');
      logger.warn('Circuit breaker opened', { service, failures });
    }
  }

  recordSuccess(service: string) {
    this.failures.set(service, 0);
    this.state.set(service, 'CLOSED');
  }

  isOpen(service: string): boolean {
    const state = this.state.get(service);

    if (state === 'OPEN') {
      const lastFailure = this.lastFailure.get(service);
      if (Date.now() - lastFailure.getTime() > this.timeout) {
        this.state.set(service, 'HALF_OPEN');
        return false;
      }
      return true;
    }

    return false;
  }

  retryAfter(service: string): number {
    const lastFailure = this.lastFailure.get(service);
    if (!lastFailure) return 0;

    const elapsed = Date.now() - lastFailure.getTime();
    return Math.max(0, this.timeout - elapsed);
  }
}

export const circuitBreaker = new CircuitBreaker();
```

**Usage:**
```typescript
if (circuitBreaker.isOpen('openai')) {
  throw new ApiError(
    'AI service is temporarily unavailable',
    503,
    'SERVICE_UNAVAILABLE',
    { retryAfter: circuitBreaker.retryAfter('openai') }
  );
}

try {
  const result = await openaiClient.generateCompletion(prompt);
  circuitBreaker.recordSuccess('openai');
  return result;
} catch (error) {
  circuitBreaker.recordFailure('openai');
  throw error;
}
```

---

### Pattern 3: Graceful Degradation

**Use Case:** Fallback when primary service fails

```typescript
// lib/services/chat-service.ts
export class ChatService {
  async sendMessage(message: string) {
    try {
      // Primary: Claude 3.5 Sonnet
      return await anthropicClient.generateCompletion(message);

    } catch (error) {
      logger.warn('Primary LLM failed, trying fallback', { error });

      try {
        // Fallback: GPT-4
        return await openaiClient.generateCompletion(message);

      } catch (fallbackError) {
        logger.error('All LLMs failed', { error, fallbackError });

        // Last resort: Cached response or error
        throw new ApiError(
          'AI service is temporarily unavailable',
          503,
          'LLM_SERVICE_ERROR'
        );
      }
    }
  }
}
```

---

## Monitoring & Alerting

### Metrics to Track

**Error Rate:**
```typescript
// Track error rate per endpoint
metrics.increment('api.errors', {
  endpoint: '/api/chat/send',
  statusCode: 500,
  errorCode: 'LLM_SERVICE_ERROR'
});
```

**Response Time:**
```typescript
// Track P50, P95, P99 latency
metrics.histogram('api.latency', duration, {
  endpoint: '/api/chat/send'
});
```

**Availability:**
```typescript
// Track uptime per service
metrics.gauge('service.uptime', 0.998, {
  service: 'openai'
});
```

---

### Alert Thresholds

**Critical (Immediate):**
- Error rate > 1%
- P95 latency > 5s
- Database connection lost
- All LLM providers down

**High (15 minutes):**
- Error rate > 0.5%
- P95 latency > 3s
- Circuit breaker opened

**Medium (1 hour):**
- Error rate > 0.1%
- Slow queries > 100ms
- Rate limit hits > 100/hour

**Low (Daily):**
- Error rate > 0.01%
- Storage quota > 80%

---

### Alert Channels

**Email:** Critical alerts to on-call engineer
**Slack:** All alerts to #alerts channel
**PagerDuty:** Critical alerts with escalation

**Example:**
```typescript
// lib/monitoring/alerting.ts
export async function sendAlert(alert: {
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  error?: Error;
}) {
  if (alert.severity === 'critical') {
    // PagerDuty + Email + Slack
    await pagerduty.trigger(alert);
    await sendEmail(ON_CALL_EMAIL, alert);
    await slack.sendMessage('#alerts', alert);
  } else if (alert.severity === 'high') {
    // Email + Slack
    await sendEmail(ON_CALL_EMAIL, alert);
    await slack.sendMessage('#alerts', alert);
  } else {
    // Slack only
    await slack.sendMessage('#alerts', alert);
  }
}
```

---

## Client Error Handling

### Frontend Error Handling

**Fetch Wrapper:**
```typescript
// lib/api-client.ts
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
        ...options?.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiClientError(error.error);
    }

    return await response.json();

  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Network error
    throw new ApiClientError({
      code: 'NETWORK_ERROR',
      message: 'Network error occurred. Please check your connection.',
      statusCode: 0
    });
  }
}
```

**Error Display:**
```typescript
// components/ErrorAlert.tsx
export function ErrorAlert({ error }: { error: ApiError }) {
  const userMessage = getUserFriendlyMessage(error);
  const canRetry = isRetryable(error);

  return (
    <Alert variant="destructive">
      <AlertTitle>{userMessage}</AlertTitle>
      <AlertDescription>
        {error.details?.message}
      </AlertDescription>
      {canRetry && (
        <Button onClick={handleRetry}>Retry</Button>
      )}
      {error.code === 'TIER_LIMIT_EXCEEDED' && (
        <Button onClick={() => router.push('/upgrade')}>
          Upgrade Plan
        </Button>
      )}
    </Alert>
  );
}
```

---

## Testing Strategy

### Unit Tests for Error Handling

```typescript
// __tests__/services/user-service.test.ts
import { UserService } from '@/lib/services/user-service';
import { ApiError } from '@/lib/errors/ApiError';

describe('UserService', () => {
  describe('registerUser', () => {
    it('should throw EMAIL_ALREADY_EXISTS if email is taken', async () => {
      const service = new UserService();

      // Mock existing user
      prisma.user.findUnique = jest.fn().mockResolvedValue({
        id: 'existing-user-id',
        email: 'user@example.com'
      });

      await expect(
        service.registerUser({
          email: 'user@example.com',
          password: 'Password123!',
          name: 'John Doe'
        })
      ).rejects.toThrow(ApiError);

      await expect(
        service.registerUser({
          email: 'user@example.com',
          password: 'Password123!',
          name: 'John Doe'
        })
      ).rejects.toMatchObject({
        code: 'EMAIL_ALREADY_EXISTS',
        statusCode: 409
      });
    });
  });
});
```

---

### Integration Tests

```typescript
// __tests__/api/auth/register.test.ts
import { POST } from '@/app/api/auth/register/route';

describe('POST /api/auth/register', () => {
  it('should return 409 if email already exists', async () => {
    // Create existing user
    await prisma.user.create({
      data: {
        email: 'existing@example.com',
        password: 'hashed',
        name: 'Existing User'
      }
    });

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'New User'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});
```

---

## Document Information

**Version:** 1.0
**Created:** 2025-10-22
**Status:** DESIGN PHASE
**Owner:** Backend Coder
**Next Review:** Phase 5 (Backend Implementation)

**Error Codes Documented:** 30+
**Error Scenarios Covered:** 15+
**Recovery Patterns:** 3

**References:**
- [ENDPOINTS.md](./ENDPOINTS.md) - API endpoints specification
- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) - System architecture
- [DATABASE.md](../database/DATABASE.md) - Database schema

---

**THIS ERROR HANDLING STRATEGY IS READY FOR IMPLEMENTATION IN PHASE 5**

# Rate Limiting Strategy - cjhirashi-agents MVP

**Version:** 1.0
**Date:** 2025-10-22
**Status:** PRODUCTION READY
**Owner:** Architect
**API Version:** v1

---

## Table of Contents

1. [Overview & Purpose](#overview--purpose)
2. [Rate Limiting Architecture](#rate-limiting-architecture)
3. [Tier-Based Quotas](#tier-based-quotas)
4. [Endpoint-Specific Limits](#endpoint-specific-limits)
5. [Rate Limit Headers](#rate-limit-headers)
6. [Exceeding Limits](#exceeding-limits)
7. [Implementation Details](#implementation-details)
8. [Client Best Practices](#client-best-practices)

---

## Overview & Purpose

Rate limiting is a critical security and performance measure that controls the number of requests a user can make to the API within a specific time window.

### Why Rate Limiting?

#### 1. **Fair Resource Allocation**
- Prevents single user from consuming excessive resources
- Ensures equal access for all users
- Maintains system stability under load

#### 2. **Prevent Abuse**
- **DDoS Protection:** Mitigate distributed denial-of-service attacks
- **Brute Force Prevention:** Limit login attempts (5 per minute)
- **Spam Prevention:** Control registration (5 per hour)
- **API Scraping:** Prevent unauthorized data extraction

#### 3. **Cost Control**
- **LLM API Costs:** Limit expensive AI model calls (10 req/min for chat)
- **Database Load:** Control query volume
- **Storage Costs:** Limit upload volume (5 per month for FREE tier)
- **External APIs:** Stay within third-party rate limits

#### 4. **Quality of Service**
- **Predictable Performance:** Prevent resource exhaustion
- **Low Latency:** Maintain fast response times
- **High Availability:** Prevent cascading failures

### Algorithm & Strategy

**Algorithm:** Token Bucket (standard, flexible)

**Storage:**
- **Development:** In-memory (Node.js Map)
- **Production:** Redis (Vercel KV)

**Granularity:**
- **Per-user:** Track authenticated requests by userId
- **Per-IP:** Track unauthenticated requests by IP address
- **Endpoint-specific:** Different limits per endpoint
- **Per-tier:** Different quotas for FREE, PRO, ENTERPRISE

---

## Rate Limiting Architecture

### High-Level Flow

```
Request → Extract userId/IP → Determine Tier → Check Rate Limit
    ↓
    ├─ ALLOWED → Add headers → Process → Return response
    └─ DENIED  → Return 429 + Retry-After header
```

### Middleware Implementation

Location: `middleware.ts` (Next.js)

1. Intercept all `/api/*` requests
2. Extract user ID from JWT or use IP address
3. Determine tier (FREE, PRO, ENTERPRISE)
4. Check rate limit BEFORE processing
5. Add rate limit headers to response

---

## Tier-Based Quotas

### Tier Comparison

| Metric | FREE | PRO | ENTERPRISE |
|--------|------|-----|------------|
| **Requests/Minute** | 20 | 100 | 1,000 |
| **Requests/Hour** | 500 | 3,000 | 50,000 |
| **Requests/Day** | 5,000 | 50,000 | 500,000 |
| **Concurrent Connections** | 2 | 10 | Unlimited |
| **Chat Messages/Day** | 20 | 500 | Unlimited |
| **RAG Uploads/Month** | 5 | 50 | Unlimited |
| **Storage Quota** | 1 GB | 100 GB | Unlimited |
| **File Upload Size** | 10 MB | 50 MB | 100 MB |

### FREE Tier

**Global Limits:**
- 20 requests/minute
- 500 requests/hour
- 5,000 requests/day
- 2 concurrent connections

**Feature Limits:**
- Chat messages: 20/day
- RAG uploads: 5/month
- Storage: 1 GB total
- File size: 10 MB max

**Use Case:** Personal use, learning, trials

---

### PRO Tier

**Global Limits:**
- 100 requests/minute
- 3,000 requests/hour
- 50,000 requests/day
- 10 concurrent connections

**Feature Limits:**
- Chat messages: 500/day
- RAG uploads: 50/month
- Storage: 100 GB total
- File size: 50 MB max

**Use Case:** Professional development, MVPs, small teams

---

### ENTERPRISE Tier

**Global Limits:**
- 1,000 requests/minute
- 50,000 requests/hour
- 500,000 requests/day
- Unlimited concurrent connections

**Feature Limits:**
- Chat messages: Unlimited
- RAG uploads: Unlimited
- Storage: Unlimited
- File size: 100 MB max

**SLA:**
- 99.9% uptime guaranteed
- 24/7 priority support
- Custom limits negotiable

---

## Endpoint-Specific Limits

Not all endpoints consume equal resources. Critical endpoints have tighter limits.

### Critical Endpoints (High Resource)

#### POST /api/v1/chat/send

**Resource:** Triggers expensive LLM API call

**Limits:**
- FREE: 10 requests/minute, 20/day
- PRO: 50 requests/minute, 500/day
- ENTERPRISE: 500 requests/minute, unlimited/day

**Rationale:** Prevent LLM cost explosion

---

#### POST /api/v1/rag/documents

**Resource:** File upload + embedding generation (expensive)

**Limits:**
- FREE: 5 requests/month
- PRO: 50 requests/month
- ENTERPRISE: Unlimited

**Rationale:** Control storage and embedding costs

---

#### POST /api/v1/rag/search

**Resource:** Pinecone vector database queries

**Limits:**
- FREE: 20 requests/minute
- PRO: 100 requests/minute
- ENTERPRISE: 500 requests/minute

---

### Security Endpoints

#### POST /api/v1/auth/signin

**Limit:** 10 requests/minute per IP (all tiers)

**Lockout:** 15 minutes after 10 failed attempts

**Rationale:** Prevent brute force attacks

---

#### POST /api/v1/auth/register

**Limit:** 5 requests/hour per IP (all tiers)

**Rationale:** Prevent bot spam registrations

---

### Admin Endpoints

#### GET /api/v1/admin/users
#### GET /api/v1/admin/metrics

**Limit:** 100 requests/minute (no tier limit)

**Rationale:** Admins need unrestricted access

---

### Public Endpoints

#### GET /api/v1/agents
#### GET /api/v1/agents/{id}

**Limit:** 60 requests/minute (all tiers)

**Rationale:** Lightweight metadata queries

---

## Rate Limit Headers

All responses include standard rate limit headers (IETF draft standard).

### Response Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1698067200
```

**X-RateLimit-Limit:** Maximum requests in current window

**X-RateLimit-Remaining:** Requests remaining in current window

**X-RateLimit-Reset:** Unix timestamp when limit resets

**Retry-After:** (429 only) Seconds to wait before retry

---

### Example: Successful Request (200)

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1698067200

{
  "data": { "message": "Success" }
}
```

---

### Example: Rate Limited Request (429)

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698067200
Retry-After: 45

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your rate limit",
    "statusCode": 429,
    "details": {
      "limit": 100,
      "used": 100,
      "resetAt": "2025-10-22T10:31:00Z",
      "tier": "PRO"
    }
  }
}
```

---

## Exceeding Limits

### HTTP 429 Too Many Requests

When rate limit exceeded, API returns 429 with structured error.

### Error Response Format

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your rate limit",
    "statusCode": 429,
    "timestamp": "2025-10-22T10:35:00Z",
    "requestId": "req-abc123",
    "details": {
      "limit": 100,
      "used": 100,
      "window": "minute",
      "resetAt": "2025-10-22T10:36:00Z",
      "retryAfter": 60,
      "tier": "PRO",
      "endpoint": "/api/v1/chat/send"
    }
  }
}
```

---

### Grace Period

Small grace period beyond hard limit for better UX:

- **FREE tier:** 5 additional requests
- **PRO tier:** 20 additional requests
- **ENTERPRISE tier:** 100 additional requests

Requests in grace period succeed with warning header:

```http
X-RateLimit-Warning: Approaching limit. Upgrade to PRO for higher limits.
```

---

### Retry Strategy (Client-Side)

Implement exponential backoff when receiving 429:

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      const delay = Math.min(retryAfter * 1000, 60000);

      await sleep(delay);
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

---

### Upgrade Prompts

When users hit limits, provide upgrade incentive:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded your monthly message quota (20/20)",
    "statusCode": 429,
    "details": {
      "currentTier": "FREE",
      "nextTier": "PRO",
      "nextTierLimit": 500,
      "upgradeUrl": "https://app.example.com/upgrade",
      "upgradeMessage": "Upgrade to PRO for 500 messages/day"
    }
  }
}
```

---

## Implementation Details

### Token Bucket Algorithm

**How it works:**

1. Each user has a "bucket" of tokens
2. Bucket has max capacity (e.g., 100 tokens)
3. Tokens refill at constant rate (e.g., 100/minute)
4. Each request consumes 1 token
5. If bucket empty, request rejected (429)

**Algorithm steps:**

```
1. Get bucket for user:endpoint
2. Calculate refill: elapsed_time * refill_rate
3. Current tokens = min(tokens + refill, capacity)
4. If current_tokens >= 1:
     ALLOW, decrement token, update storage
   ELSE:
     DENY, return 429
5. Set expiration on bucket (TTL)
```

---

### Storage: Redis (Production)

For production, use Redis (Vercel KV) for distributed rate limiting.

**Why Redis?**
- Atomic operations (INCR, DECR, TTL)
- Auto-expiration with TTL
- Works across serverless instances
- < 5ms latency

**Key structure:**

```
ratelimit:{userId}:{endpoint}:{window}
ratelimit:user-123:/api/v1/chat/send:minute → 87 (tokens remaining)
```

**TTL (auto-expire):**
- Minute window: 60 seconds
- Hour window: 3600 seconds
- Day window: 86400 seconds

---

## Client Best Practices

### 1. Check Rate Limit Headers

```typescript
const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
if (remaining < 10) {
  console.warn(`Low rate limit: ${remaining} requests left`);
}
```

---

### 2. Respect Retry-After

```typescript
if (response.status === 429) {
  const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
  await sleep(retryAfter * 1000);
  return fetchWithRetry(url);
}
```

---

### 3. Batch Requests

**Bad:**
```typescript
for (const id of ids) {
  await fetch(`/api/documents/${id}`); // 10 requests
}
```

**Good:**
```typescript
await fetch('/api/documents/batch', {
  method: 'POST',
  body: JSON.stringify({ ids }) // 1 request
});
```

---

### 4. Cache Responses

```typescript
const cache = new Map();

async function fetchWithCache(url: string, ttl = 60000) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const response = await fetch(url);
  const data = await response.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

---

## Document Information

**Version:** 1.0
**Created:** 2025-10-22
**Status:** PRODUCTION READY
**Owner:** Architect

**Quotas Defined:** 3 tiers (FREE, PRO, ENTERPRISE)
**Endpoint Limits:** 12+ endpoints with specific limits
**Algorithm:** Token Bucket (industry standard)
**Storage:** Redis (Vercel KV / Upstash)

**References:**
- [API-DESIGN.md](./API-DESIGN.md) - API specification
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Auth tiers
- [ENDPOINTS.md](./ENDPOINTS.md) - All 58 endpoints

---

🚀 **RATE LIMITING STRATEGY READY FOR PHASE 5 IMPLEMENTATION**

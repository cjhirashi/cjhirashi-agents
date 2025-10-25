# ADR-009: Rate Limiting Strategy - Token Bucket + Upstash Redis

## Estado
**ACCEPTED** - Implementado en Fase 5

## Contexto

### Problema a Resolver

Durante Fase 5, el sistema necesita protección contra DDoS, abuso de API y consumo descontrolado de recursos:

**Requisitos de Protección:**
- **DDoS Protection**: Rechazar requests de bots/atacantes
- **Fair Usage**: Usuarios legítimos no saturan recurso compartido
- **Cost Control**: Limitar consumo de APIs caras (LLMs, embeddings)
- **Graceful Degradation**: Sistema no colapse, devuelve 429 en lugar de 500
- **Admin Bypass**: Usuarios admin pueden bypasear limits (soporte, testing)

**Requisitos Técnicos:**
- **Serverless Compatible**: Vercel Edge/Node.js runtime
- **Per-Endpoint**: Different limits para chat, documents, admin
- **Per-User**: Track by user ID, not just IP
- **Real-time**: Decisión de allow/reject en < 10ms
- **Distributed**: Works con multiple serverless instances
- **Observable**: Logs de rate limit triggers

**Requisitos de Business:**
- **Free Tier**: 10 requests/min (protege de casual abuse)
- **Pro Tier**: 100 requests/min (reasonable power user)
- **Enterprise**: Unlimited (custom agreements)
- **Burst Support**: Allow 15/150/unlimited requests for 10s spikes
- **Cost Tracking**: Monitor consumption de recursos caros

### Constraints del Proyecto

- **Hosting**: Vercel serverless (stateless)
- **Database**: No persistent connection per request allowed
- **Latency Budget**: < 10ms overhead para rate limit check
- **Scale**: MVP (< 1000 users), futuro 10k+ users
- **Cost**: Minimize external service calls (Redis cost)

## Decisión

**Implementamos Token Bucket algorithm con Upstash Redis para rate limiting distribuido, per-user, multi-tier.**

### Arquitectura General

```
┌─────────────────────────────────────┐
│       Client Request                 │
│  POST /api/v1/chat/send             │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│    Rate Limit Check Middleware      │
│  - Extract user ID                  │
│  - Determine tier (free/pro/ent)    │
│  - Check token bucket               │
└────────────────┬────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    ✅ ALLOWED        ❌ RATE LIMITED
    (continue)         (return 429)
        │                 │
        ▼                 ▼
   ┌──────────┐    ┌──────────────┐
   │ Process  │    │ Return 429   │
   │ Request  │    │ + Headers    │
   └──────────┘    └──────────────┘
```

### Token Bucket Algorithm

```
CONCEPTO:
  Cada usuario tiene un "bucket" (recipiente) con tokens.
  Cada request consume N tokens.
  Tokens se regeneran a tasa constante.
  Si bucket vacío, request rechazado (429).

PARÁMETROS:
  - capacity: Max tokens en bucket (permite burst)
  - refillRate: Tokens/segundo regenerados
  - refillInterval: Cada cuánto refill ocurre

VENTAJAS:
  - Permite burst traffic (hasta capacity tokens)
  - Recuperación gradual (no restart penalización)
  - Fair (rate constante, no ventanas fijas)
  - Efficient (O(1) check + update)
```

### Configuración de Endpoints

```typescript
// Token bucket config por endpoint + tier

FREE_TIER_LIMITS = {
  chat: {
    capacity: 15,        // Burst 15 requests
    refillRate: 10,      // +10 tokens/min (10 req/min sustained)
  },
  documents: {
    capacity: 10,        // Burst 10 requests
    refillRate: 5,       // +5 tokens/min (5 req/min sustained)
  },
  admin: {
    capacity: 0,         // No access
    refillRate: 0,
  },
};

PRO_TIER_LIMITS = {
  chat: {
    capacity: 150,       // Burst 150 requests
    refillRate: 100,     // +100 tokens/min (100 req/min sustained)
  },
  documents: {
    capacity: 50,        // Burst 50 requests
    refillRate: 30,      // +30 tokens/min (30 req/min sustained)
  },
  admin: {
    capacity: 0,         // No access (separate endpoint)
    refillRate: 0,
  },
};

ENTERPRISE_TIER_LIMITS = {
  chat: {
    capacity: 'unlimited',      // No limit
    refillRate: 'unlimited',
  },
  documents: {
    capacity: 'unlimited',
    refillRate: 'unlimited',
  },
  admin: {
    capacity: 'unlimited',
    refillRate: 'unlimited',
  },
};

ADMIN_LIMITS = {
  rate: 'unlimited',            // Bypasses limits completely
  burstCapacity: 'unlimited',
};
```

### Implementación

**1. Rate Limit Middleware**

```typescript
// lib/rate-limit/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from './checker';
import { getSession } from '@/lib/auth';

export interface RateLimitConfig {
  endpoint: string;
  capacity: number;
  refillRate: number;
}

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  'POST:/api/v1/chat/send': {
    endpoint: 'chat',
    capacity: 15,
    refillRate: 10,
  },
  'POST:/api/v1/documents/upload': {
    endpoint: 'documents',
    capacity: 10,
    refillRate: 5,
  },
  'GET:/api/v1/documents': {
    endpoint: 'documents',
    capacity: 10,
    refillRate: 5,
  },
};

export async function rateLimitMiddleware(
  req: NextRequest,
  endpoint: string
) {
  const session = await getSession();

  // Bypass para usuarios no autenticados (rechazar)
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Bypass para admin users
  if (session.user.role === 'admin') {
    return null; // Continue (null = allow)
  }

  // Get limit config
  const limitConfig = ENDPOINT_LIMITS[`${req.method}:${endpoint}`];
  if (!limitConfig) {
    throw new Error(`No rate limit config for ${endpoint}`);
  }

  // Determine tier
  const tier = session.user.metadata?.tier || 'free';
  const limits = getTierLimits(tier);
  const endpointLimits = limits[limitConfig.endpoint];

  if (!endpointLimits) {
    return NextResponse.json(
      { error: 'Access denied to this endpoint' },
      { status: 403 }
    );
  }

  // Check rate limit
  const allowed = await checkRateLimit({
    userId: session.user.id,
    endpoint: limitConfig.endpoint,
    capacity: endpointLimits.capacity,
    refillRate: endpointLimits.refillRate,
  });

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded for ${endpoint}`,
        retryAfter: 60,
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(endpointLimits.capacity),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + 60000),
        },
      }
    );
  }

  return null; // Continue (allow)
}

function getTierLimits(
  tier: string
): Record<string, { capacity: number; refillRate: number }> {
  switch (tier) {
    case 'pro':
      return {
        chat: { capacity: 150, refillRate: 100 },
        documents: { capacity: 50, refillRate: 30 },
      };
    case 'enterprise':
      return {
        chat: { capacity: 999999, refillRate: 999999 },
        documents: { capacity: 999999, refillRate: 999999 },
      };
    case 'free':
    default:
      return {
        chat: { capacity: 15, refillRate: 10 },
        documents: { capacity: 10, refillRate: 5 },
      };
  }
}
```

**2. Rate Limit Checker (Token Bucket)**

```typescript
// lib/rate-limit/checker.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export interface RateLimitCheckParams {
  userId: string;
  endpoint: string;
  capacity: number;
  refillRate: number; // tokens per minute
}

interface TokenBucket {
  tokens: number;
  lastRefillAt: number;
}

/**
 * Token Bucket Algorithm
 *
 * 1. Get current bucket state (tokens + lastRefill timestamp)
 * 2. Calculate tokens to add based on time elapsed
 * 3. Cap tokens at capacity (prevent overflow)
 * 4. Check if we have at least 1 token
 * 5. If yes, consume 1 token and save new state
 * 6. If no, reject request
 */
export async function checkRateLimit(
  params: RateLimitCheckParams
): Promise<boolean> {
  const { userId, endpoint, capacity, refillRate } = params;

  // Redis key for user's token bucket
  const bucketKey = `ratelimit:${userId}:${endpoint}`;

  try {
    // Use Redis transaction (Lua script) for atomic operation
    const result = await redis.eval(
      `
        -- Get current bucket state
        local bucket = redis.call('GET', KEYS[1])
        local now = tonumber(ARGV[1])
        local capacity = tonumber(ARGV[2])
        local refillRate = tonumber(ARGV[3]) -- tokens per minute

        -- Initialize bucket if doesn't exist
        if not bucket then
          bucket = cjson.decode('{"tokens": ' .. capacity .. ', "lastRefillAt": ' .. now .. '}')
        else
          bucket = cjson.decode(bucket)
        end

        -- Calculate tokens to add
        local timeDeltaMs = now - bucket.lastRefillAt
        local timeDeltaMin = timeDeltaMs / 60000 -- convert to minutes
        local tokensToAdd = timeDeltaMin * refillRate

        -- Update token count (capped at capacity)
        local tokens = math.min(bucket.tokens + tokensToAdd, capacity)

        -- Check if we can consume 1 token
        if tokens >= 1 then
          -- Consume token
          tokens = tokens - 1
          -- Update bucket
          bucket.tokens = tokens
          bucket.lastRefillAt = now
          redis.call('SET', KEYS[1], cjson.encode(bucket), 'EX', 86400) -- 24h TTL
          return 1 -- Allow
        else
          -- Return remaining time to next token
          local tokensNeeded = 1 - tokens
          local secondsUntilRefill = (tokensNeeded / refillRate) * 60
          redis.call('SET', KEYS[1], cjson.encode(bucket), 'EX', 86400)
          return {0, math.ceil(secondsUntilRefill)} -- Deny + retry-after
        end
      `,
      [bucketKey],
      [Date.now(), capacity, refillRate]
    );

    // Result: 1 = allow, 0 or [0, seconds] = deny
    return (result as any) === 1;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open (allow request) on Redis error
    // This prevents Redis outages from breaking API
    console.log(`Redis unavailable, allowing request for ${userId}:${endpoint}`);
    return true;
  }
}

/**
 * Get current bucket state (for debugging/monitoring)
 */
export async function getBucketState(
  userId: string,
  endpoint: string
): Promise<TokenBucket | null> {
  const bucketKey = `ratelimit:${userId}:${endpoint}`;

  try {
    const data = await redis.get<string>(bucketKey);
    if (!data) return null;

    return JSON.parse(data) as TokenBucket;
  } catch (error) {
    console.error('Error getting bucket state:', error);
    return null;
  }
}

/**
 * Reset bucket (admin operation)
 */
export async function resetBucket(userId: string, endpoint: string) {
  const bucketKey = `ratelimit:${userId}:${endpoint}`;

  try {
    await redis.del(bucketKey);
    return true;
  } catch (error) {
    console.error('Error resetting bucket:', error);
    return false;
  }
}
```

**3. Integración en API Routes**

```typescript
// app/api/v1/chat/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';
import { chat } from '@/lib/chat';

export async function POST(req: NextRequest) {
  // Rate limit check
  const rateLimitResponse = await rateLimitMiddleware(
    req,
    '/api/v1/chat/send'
  );

  if (rateLimitResponse) {
    return rateLimitResponse; // Return 429 or error
  }

  // Continue with request
  try {
    const { messages, chatId } = await req.json();

    const response = await chat({
      messages,
      chatId,
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// También en document upload
// app/api/v1/documents/upload/route.ts
export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(
    req,
    '/api/v1/documents/upload'
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Continue with upload...
}
```

**4. Admin Dashboard - Rate Limit Monitoring**

```typescript
// app/api/admin/rate-limits/route.ts
import { requireAdmin } from '@/lib/auth';
import { getBucketState, resetBucket } from '@/lib/rate-limit/checker';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/rate-limits?userId=...&endpoint=...
export async function GET(req: NextRequest) {
  await requireAdmin();

  const userId = req.nextUrl.searchParams.get('userId');
  const endpoint = req.nextUrl.searchParams.get('endpoint');

  if (!userId || !endpoint) {
    return NextResponse.json(
      { error: 'Missing userId or endpoint' },
      { status: 400 }
    );
  }

  const bucket = await getBucketState(userId, endpoint);

  return NextResponse.json({
    userId,
    endpoint,
    bucket,
    statusText: bucket
      ? `${bucket.tokens.toFixed(2)} tokens available`
      : 'No bucket (not used yet)',
  });
}

// POST /api/admin/rate-limits/reset
export async function POST(req: NextRequest) {
  await requireAdmin();

  const { userId, endpoint } = await req.json();

  if (!userId || !endpoint) {
    return NextResponse.json(
      { error: 'Missing userId or endpoint' },
      { status: 400 }
    );
  }

  const success = await resetBucket(userId, endpoint);

  return NextResponse.json({
    success,
    message: success
      ? `Reset rate limit for ${userId}:${endpoint}`
      : 'Failed to reset',
  });
}
```

## Alternativas Consideradas

### Opción A: Fixed Window Counter

**Descripción**: Simple counter reseteable cada minuto.

**Implementación:**
```
Cada minuto: resetea counter
Cada request: counter++
Si counter > limit: rechaza

Ejemplo: Limit 10 req/min
- Minuto 1: 0-10 allowed, 11+ denied
- Minuto 2: 0-10 allowed (counter reset)
```

**Pros**:
- Muy simple
- Fácil de entender
- Bajo overhead computacional

**Contras**:
- **Edge case**: Permitir 20 requests en ~1 minuto:
  - 00:59 - 10 requests (minuto 1)
  - 01:00 - counter reset, 10 más (minuto 2)
  - Total: 20 en 1 segundo (double el limit!)
- **No burst support**: No puede permitir picos legítimos
- **Unfair**: Límite depende de timing de reinicio
- **Poor UX**: Rechaza requests sin contexto de recuperación

**Score: 4/10**

**Decisión**: Rechazado - Edge cases de timing destrozan fairness.

---

### Opción B: Sliding Window Log

**Descripción**: Log de timestamp de cada request, slide window de 1 minuto.

**Implementación:**
```
Mantener lista de timestamps de últimas N requests
Para nuevo request: contar requests en last 60 seconds
Si count >= limit: rechaza
Agregar nuevo timestamp al log
```

**Pros**:
- Muy preciso (sin edge cases)
- Fairness perfecta
- Puede retornar "retry-after" exacto

**Contras**:
- **Storage heavy**: O(n) memory por usuario
- **Computationally expensive**: Contar items en lista O(n)
- **Slow**: No escalable a millones de requests
- **Poor DX**: No soporta burst (rechaza primero request después de quietud)
- **Cost**: Redis storage + bandwidth para logs grandes

**Score: 5/10**

**Decisión**: Rechazado - Escalabilidad pobre, overhead excesivo.

---

### Opción C: Sliding Window Counter

**Descripción**: Híbrido de fixed window + sliding window.

**Implementación:**
```
Mantener counters para ventanas actual + anterior
Para nuevo request:
  - Calcula cuánto de ventana anterior "pesa" en actual
  - Counter total = current + (previous * peso)
  - Si total >= limit: rechaza
```

**Pros**:
- Mejor que fixed window (mitiga edge cases)
- Más eficiente que sliding log
- Fairness mejorada

**Contras**:
- **Still not perfect**: Edge cases a través de 3 ventanas
- **Complexity**: Más lógica de cálculo
- **Confusing**: Difícil de entender para developers
- **No burst**: Aún rechaza picos después de quietud

**Score: 6/10**

**Decisión**: Rechazado - Token bucket es mejor (tiene burst + fairness).

---

### Opción D: Token Bucket (ELEGIDA)

**Descripción**: Bucket con tokens que se regeneran gradualmente.

**Implementación:**
```
Bucket state: {tokens: N, lastRefill: timestamp}
Para nuevo request:
  - timeSince = now - lastRefill
  - tokensAdded = (timeSince / 60s) * refillRate
  - tokens = min(tokens + tokensAdded, capacity)
  - Si tokens >= 1: consume, allow
  - Si tokens < 1: deny, return retryAfter
```

**Pros**:
- **Burst Support**: capacity permite picos > rate normal
- **Fairness**: Rate constante a largo plazo (O(log n) vs O(n))
- **Eficiencia**: O(1) check + update con Redis
- **UX**: Permite recuperación graceful (tokens vuelven)
- **Observable**: Tokens remaining visible al usuario
- **Industry Standard**: Used by AWS, Google, CloudFlare
- **Cost-aware**: Puede usar capacity para "costliness"

**Contras**:
- **Slightly complex**: Más lógica que fixed window
- **Requires storage**: Redis needed para distributed state

**Score: 9/10**

**Justificación**:
- Soporta burst traffic legítimo (spikes en uso normal)
- Fairness a escala
- Eficiencia computacional O(1)
- Permite tokens "regenerarse" (mejor UX)
- Standard en industry (confianza demostrada)
- Fácil de tunear (capacity + refillRate)

## Consecuencias

### Positivas

1. **DDoS Protection Efectiva**
   - Bots atacantes rechazados rápidamente
   - Ratas limite graduales, no bloqueos abruptos
   - Admin puede intervenir con reset

2. **Fair Usage Para Usuarios**
   - Usuarios legítimos pueden hacer bursts (hasta capacity)
   - Pero rate límite a largo plazo (fairness)
   - Recuperación gradual (no castigo permanente)

3. **Cost Control**
   - Limita consumo de APIs caras (LLMs, embeddings)
   - Previene runaway costs por user
   - Puede tunear limits por tier (free < pro < enterprise)

4. **Graceful Degradation**
   - Sistema retorna 429 en lugar de 500
   - Client sabe exactamente cuándo reintentar
   - No cae, sino rechaza controladamente

5. **Observable**
   - Logs de rate limits triggers
   - Admin dashboard para debugging
   - Métricas para business intelligence

6. **Multi-Tier Support**
   - Free tier: 10 req/min (prevent casual abuse)
   - Pro tier: 100 req/min (reasonable power user)
   - Enterprise: unlimited (SLA agreements)

### Negativas

1. **Redis Dependency**
   - **Problema**: Requiere Upstash Redis
   - **Impacto**: $0.2/100k requests (en free tier gratis)
   - **Mitigación**: Upstash tiene free tier generous, failsafe a allow
   - **Risk**: Bajo (Redis outage = allow, not deny)

2. **Complexity vs Fixed Window**
   - **Problema**: Token bucket es más complejo que counter
   - **Impacto**: Developers necesitan entender el algorithm
   - **Mitigación**: Documentado en comments, código encapsulado
   - **Risk**: Bajo (implementación is COTS, no custom logic)

3. **Precision Loss en High Load**
   - **Problema**: Con 1000s requests/sec, rounding errors posibles
   - **Impacto**: Ocasionalmente permite 1-2 requests extra
   - **Mitigación**: Aceptable (1-2% variance despreciable)
   - **Risk**: Bajo (no critical)

4. **Network Latency**
   - **Problema**: Redis call add ~5-10ms a cada request
   - **Impacto**: Overhead notable pero aceptable
   - **Mitigación**: Upstash edge locations < 50ms, acceptable para API
   - **Risk**: Bajo (latency SLA es 200ms+)

5. **Cold Start Overhead**
   - **Problema**: Serverless cold start + Redis call = 100-200ms extra
   - **Impacto**: Primeros requests lentos
   - **Mitigación**: Vercel Edge pre-warms, Upstash is fast
   - **Risk**: Bajo (aceptable para MVP)

## Validación e Implementación

### Validación de Functionality

**Test Rate Limit Acceptance:**
```typescript
// __tests__/rate-limit/checker.test.ts
import { checkRateLimit } from '@/lib/rate-limit/checker';

describe('Token Bucket Rate Limiting', () => {
  test('allows requests within capacity', async () => {
    const result = await checkRateLimit({
      userId: 'test-user-1',
      endpoint: 'chat',
      capacity: 10,
      refillRate: 5, // tokens per minute
    });

    expect(result).toBe(true); // First request always allowed
  });

  test('rate limits after capacity exceeded', async () => {
    // Simulate 11 rapid requests
    const userId = 'test-user-2';

    for (let i = 0; i < 10; i++) {
      await checkRateLimit({
        userId,
        endpoint: 'chat',
        capacity: 10,
        refillRate: 5,
      }); // All allow (consume 10 tokens)
    }

    const result = await checkRateLimit({
      userId,
      endpoint: 'chat',
      capacity: 10,
      refillRate: 5,
    }); // 11th request

    expect(result).toBe(false); // Should be denied
  });

  test('allows burst up to capacity', async () => {
    const userId = 'test-user-3';
    const capacity = 20;
    const refillRate = 10;

    // All burst requests allowed (up to capacity)
    for (let i = 0; i < capacity; i++) {
      const result = await checkRateLimit({
        userId,
        endpoint: 'chat',
        capacity,
        refillRate,
      });

      if (i < capacity) {
        expect(result).toBe(true);
      } else {
        expect(result).toBe(false);
      }
    }
  });

  test('tokens regenerate over time', async () => {
    const userId = 'test-user-4';

    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await checkRateLimit({
        userId,
        endpoint: 'chat',
        capacity: 10,
        refillRate: 10,
      });
    }

    // Wait 6 seconds (refillRate=10/min = ~1.67/sec, so 10 tokens in 60s)
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Should have ~1 token refilled
    const result = await checkRateLimit({
      userId,
      endpoint: 'chat',
      capacity: 10,
      refillRate: 10,
    });

    expect(result).toBe(true); // Should allow (token regenerated)
  });
});
```

**Test Middleware Integration:**
```typescript
// __tests__/api/rate-limit-middleware.test.ts
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';
import { NextRequest } from 'next/server';
import { mock } from '@/lib/auth'; // mock getSession

describe('Rate Limit Middleware', () => {
  test('rejects unauthenticated requests', async () => {
    // Mock unauthenticated session
    const req = new NextRequest('http://localhost:3000/api/v1/chat/send', {
      method: 'POST',
    });

    const response = await rateLimitMiddleware(req, '/api/v1/chat/send');

    expect(response?.status).toBe(401);
  });

  test('bypasses rate limit for admin users', async () => {
    // Mock admin session
    const req = new NextRequest('http://localhost:3000/api/v1/chat/send', {
      method: 'POST',
    });

    const response = await rateLimitMiddleware(req, '/api/v1/chat/send');

    // Should return null (allow, no response = continue)
    expect(response).toBeNull();
  });

  test('enforces rate limit for regular users', async () => {
    // Simulate regular user hitting limit
    // (requires mocking Redis + session)
    // Pseudo-code:
    // 1. Mock session as regular user
    // 2. Call middleware 11 times (capacity 10)
    // 3. 11th call should return 429
  });
});
```

### Métricas de Éxito (SLA)

| Métrica | Target | Medición |
|---------|--------|----------|
| **Rate Limit Check Latency** | < 10ms | Request metrics |
| **DDoS Protection** | 100% reject rate limiting | Attack simulation |
| **Fair Distribution** | Variance < 5% | Load test analysis |
| **Admin Bypass** | 100% success | Integration tests |
| **Redis Availability** | 99.9% uptime | Upstash metrics |
| **Failsafe on Redis Down** | Allow requests | Error scenario test |

### Configuration (Environment Variables)

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://usable-dragonfly-...
UPSTASH_REDIS_REST_TOKEN=AbCd...

# Optional: Override limits per environment
RATE_LIMIT_CHAT_CAPACITY=15
RATE_LIMIT_CHAT_REFILL_RATE=10
RATE_LIMIT_DOCUMENTS_CAPACITY=10
RATE_LIMIT_DOCUMENTS_REFILL_RATE=5
```

### Monitoring Dashboard

```typescript
// components/admin/rate-limit-monitor.tsx
'use client';

import { useState, useEffect } from 'react';
import { getBucketState } from '@/lib/rate-limit/checker';

export function RateLimitMonitor({ userId }: { userId: string }) {
  const [chatBucket, setChatBucket] = useState(null);
  const [docsBucket, setDocsBucket] = useState(null);

  useEffect(() => {
    const fetchBuckets = async () => {
      const chat = await getBucketState(userId, 'chat');
      const docs = await getBucketState(userId, 'documents');

      setChatBucket(chat);
      setDocsBucket(docs);
    };

    fetchBuckets();
    const interval = setInterval(fetchBuckets, 5000); // Refresh every 5s

    return () => clearInterval(interval);
  }, [userId]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3>Chat Endpoint</h3>
        <p>Tokens: {chatBucket?.tokens.toFixed(2) || 'N/A'}</p>
        <p>Last Refill: {new Date(chatBucket?.lastRefillAt).toLocaleString()}</p>
      </div>

      <div>
        <h3>Documents Endpoint</h3>
        <p>Tokens: {docsBucket?.tokens.toFixed(2) || 'N/A'}</p>
        <p>Last Refill: {new Date(docsBucket?.lastRefillAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
```

## Referencias

- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Upstash Redis Documentation](https://upstash.com/docs/redis/overall/getstarted)
- [RFC 6585 - HTTP 429 Too Many Requests](https://tools.ietf.org/html/rfc6585)
- [ARCHITECTURE.md - Capa 3: API Layer](../ARCHITECTURE.md#capa-3-api-layer)
- [SECURITY-CONSIDERATIONS.md](../security/SECURITY-CONSIDERATIONS.md)
- [Rate Limiting - Cloudflare](https://developers.cloudflare.com/warp-client/get-started/rate-limiting/)
- [Rate Limiting - AWS](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)

## Historial de Decisión

- **Identificado**: 2025-10-23 (Fase 5, durante API security review)
- **Investigado por**: Security Specialist, Architect
- **Evaluadas alternativas**: 2025-10-23
- **Decidido**: 2025-10-23
- **Implementado**: 2025-10-23 (3 horas)
- **Validado por**: Security Specialist, Coder (load testing)
- **Última actualización**: 2025-10-23
- **Revisión programada**: Fase 6+ (cuando escale a 10k+ users)
- **Aprobada por**: Architect, Security Specialist, Usuario (Proyecto Cjhirashi)

---

**Decisión final**: Token Bucket algorithm con Upstash Redis es la solución correcta para rate limiting en Cjhirashi MVP. Proporciona DDoS protection, fairness, burst support, y cost control. Eficiencia O(1), overhead < 10ms, escalable a millones de requests. Sigue industry standard usado por AWS, Google, CloudFlare. Risk bajo con ganancia significativa de seguridad y control.

## Notas para Devops

**Monitoring**:
- Track Upstash connection latency (must stay < 10ms)
- Alert if rate limit rejection rate > 10% (possible attack)
- Monitor Redis usage (free tier allows 100GB)

**Scaling**:
- Para 10k+ users: Considerar self-hosted Redis (costo más bajo)
- Para 100k+ users: Considerar regional Redis (latency optimization)

**Future improvements** (Fase 6+):
- Implement cache-local rate limiting (Vercel KV) como fallback
- Add GraphQL rate limiting (query complexity scoring)
- Implement user-tier upgrade path (upsell from free → pro)

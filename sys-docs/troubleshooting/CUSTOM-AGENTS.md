# Custom Agents - Troubleshooting Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-26
**Related**: [Custom Agents User Guide](../guides/CUSTOM-AGENTS.md)

---

## Table of Contents

1. [Authentication Errors (401)](#authentication-errors-401)
2. [Authorization Errors (403)](#authorization-errors-403)
3. [Validation Errors (400)](#validation-errors-400)
4. [Not Found Errors (404)](#not-found-errors-404)
5. [Timeout Errors (408)](#timeout-errors-408)
6. [Rate Limiting (429)](#rate-limiting-429)
7. [Server Errors (500)](#server-errors-500)
8. [SSE Streaming Issues](#sse-streaming-issues)
9. [Cost & Token Issues](#cost--token-issues)
10. [Performance Optimization](#performance-optimization)

---

## Authentication Errors (401)

### Error: `UNAUTHORIZED`

**Status Code**: 401
**Error Response**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "statusCode": 401
  }
}
```

### Symptoms
- API returns 401 when calling `/api/v1/agents/{agentId}/execute`
- Error occurs even with seemingly valid credentials

### Common Causes

#### 1. Missing Authentication Token
**Cause**: No `Authorization` header or session cookie provided
**Solution**:
```javascript
// Add Authorization header
fetch('/api/v1/agents/123/execute', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
})

// OR ensure cookies are sent
fetch('/api/v1/agents/123/execute', {
  credentials: 'include' // Send session cookies
})
```

#### 2. Expired Session
**Cause**: NextAuth session expired (default: 30 days)
**Solution**:
- Log in again to get a fresh session
- Check session expiration: `const session = await auth();`
- Implement automatic session refresh

#### 3. Invalid Token Format
**Cause**: Malformed Bearer token
**Solution**: Ensure token format is exactly `Bearer <token>`, not `<token>` alone

### Verification Steps

1. **Check if user is logged in**:
```typescript
import { auth } from '@/lib/auth';

const session = await auth();
if (!session?.user) {
  // Redirect to login
}
```

2. **Verify token in headers**:
```bash
# Using curl
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/agents/123/execute
```

3. **Check NextAuth configuration**:
- File: `auth.config.ts`
- Verify `session.strategy = "jwt"` is set
- Verify `session.maxAge = 30 * 24 * 60 * 60` (30 days)

---

## Authorization Errors (403)

### Error: `FORBIDDEN` (Not Owner)

**Status Code**: 403
**Error Response**:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to execute this agent",
    "statusCode": 403
  }
}
```

### Symptoms
- User is authenticated but cannot execute agent
- Error specifically says "permission" or "forbidden"

### Common Causes

#### 1. User is Not Agent Owner
**Cause**: Trying to execute someone else's agent
**How to Check**:
```sql
-- Query the database
SELECT id, name, "createdBy"
FROM "custom_agents"
WHERE id = 'agent-id';

-- Check if createdBy matches current user ID
```

**Solutions**:
- Only execute agents you created
- Ask agent owner to grant access (future feature)
- Use an ADMIN or SUPER_ADMIN account (bypasses ownership)

#### 2. Incorrect Role Assignment
**Cause**: User should be ADMIN but role is CLIENT
**Solution**: Elevate user role:
```bash
npm run set-admin user@example.com
# OR
npm run set-super-admin user@example.com
```

**Verify role in database**:
```sql
SELECT id, email, role FROM users WHERE email = 'user@example.com';
```

### Error: `INSUFFICIENT_TIER`

**Status Code**: 403
**Error Response**:
```json
{
  "error": {
    "code": "INSUFFICIENT_TIER",
    "message": "Agent requires PRO tier or higher",
    "statusCode": 403,
    "details": {
      "requiredTier": "PRO",
      "userTier": "FREE"
    }
  }
}
```

### Symptoms
- User tier is lower than agent tier requirement
- Error message explicitly mentions tier mismatch

### Tier Hierarchy
```
FREE < BASIC < PRO < ENTERPRISE < CUSTOM < UNLIMITED
```

### Solutions

#### 1. Upgrade User Tier
```sql
-- Manually update tier in database
UPDATE users
SET tier = 'PRO'
WHERE id = 'user-id';
```

#### 2. Downgrade Agent Tier
```sql
-- Lower the agent's tier requirement
UPDATE "custom_agents"
SET tier = 'FREE'
WHERE id = 'agent-id';
```

#### 3. Verify Tier Logic
File: `src/app/api/v1/agents/[agentId]/execute/route.ts`

```typescript
const tierHierarchy = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM', 'UNLIMITED'];
const userTierLevel = tierHierarchy.indexOf(user.tier);
const agentTierLevel = tierHierarchy.indexOf(agent.tier);

if (userTierLevel < agentTierLevel) {
  throw new ApiError('Insufficient tier', 403, 'INSUFFICIENT_TIER');
}
```

---

## Validation Errors (400)

### Error: `VALIDATION_ERROR`

**Status Code**: 400
**Error Response**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "statusCode": 400,
    "details": [
      {
        "code": "too_small",
        "minimum": 1,
        "path": ["message"],
        "message": "Message cannot be empty"
      }
    ]
  }
}
```

### Common Validation Issues

#### 1. Empty Message
**Error**: `Message cannot be empty`
**Cause**: `message` field is empty string
**Solution**:
```typescript
// ❌ WRONG
{ message: '' }

// ✅ CORRECT
{ message: 'Hello, agent!' }
```

#### 2. Message Too Long
**Error**: `Message exceeds maximum length of 10000 characters`
**Cause**: Message > 10,000 characters
**Solution**: Truncate or split message
```typescript
const maxLength = 10000;
const truncated = message.slice(0, maxLength);
```

#### 3. Invalid Temperature
**Error**: `Temperature must be between 0 and 2`
**Cause**: Temperature < 0 or > 2
**Solution**:
```typescript
// ❌ WRONG
{ temperature: 3.0 }

// ✅ CORRECT
{ temperature: 0.7 }  // Range: 0-2
```

#### 4. Invalid maxTokens
**Error**: `Max tokens cannot exceed 8192`
**Cause**: maxTokens > 8192
**Solution**:
```typescript
// ❌ WRONG
{ maxTokens: 10000 }

// ✅ CORRECT
{ maxTokens: 4096 }  // Range: 1-8192
```

#### 5. Invalid Timeout
**Error**: `Timeout cannot exceed 60 seconds for MVP`
**Cause**: Timeout > 60 seconds
**Solution**:
```typescript
// ❌ WRONG
{ timeout: 120 }

// ✅ CORRECT
{ timeout: 30 }  // Range: 5-60 seconds
```

### Validation Schema Reference

File: `src/lib/validations/agent.ts`

```typescript
export const AgentExecuteRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  temperature: z.number().min(0).max(2).default(0.7).optional(),
  maxTokens: z.number().int().min(1).max(8192).default(4096).optional(),
  timeout: z.number().int().min(5).max(60).default(30).optional(),
  stream: z.boolean().default(true).optional()
});
```

---

## Not Found Errors (404)

### Error: `AGENT_NOT_FOUND`

**Status Code**: 404
**Error Response**:
```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent not found",
    "statusCode": 404
  }
}
```

### Symptoms
- Agent ID exists in your records but API says not found
- Typo in agent ID

### Common Causes

#### 1. Incorrect Agent ID
**Solution**: Verify agent ID
```sql
SELECT id, name FROM "custom_agents" WHERE id = 'your-agent-id';
```

#### 2. Agent Was Deleted
**Check deletion**:
```sql
-- If using soft deletes
SELECT id, name, "deletedAt" FROM "custom_agents" WHERE id = 'agent-id';
```

#### 3. Database Connection Issues
**Verify Prisma connection**:
```typescript
// Test database connection
const agent = await prisma.customAgent.findUnique({
  where: { id: agentId }
});

if (!agent) {
  console.error('Agent not found in database');
}
```

---

## Timeout Errors (408)

### Error: `EXECUTION_TIMEOUT`

**Status Code**: 408
**Error Response**:
```json
{
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Agent execution timed out after 30 seconds",
    "statusCode": 408
  }
}
```

### SSE Error Event:
```json
{
  "error": "Agent execution timed out after 30 seconds",
  "code": "EXECUTION_TIMEOUT",
  "executionId": "exec-123abc"
}
```

### Symptoms
- Request takes longer than configured timeout
- SSE stream stops mid-response
- Receives 408 error or SSE error event

### Common Causes & Solutions

#### 1. Complex Query Exceeds Timeout
**Cause**: Query requires more processing time
**Solution**: Increase timeout (max 60s for MVP)
```typescript
{
  message: "Complex analysis...",
  timeout: 60  // Increase from default 30s
}
```

#### 2. Model is Slow
**Cause**: Some models (Claude Opus) are slower than others
**Solution**: Use faster model
```typescript
// Prefer faster models for time-sensitive requests
- Claude 3.5 Sonnet: ~1-3s avg
- Claude 3.5 Haiku: ~0.5-1s avg (fastest)
- GPT-4o: ~2-4s avg
- Gemini 2.0 Flash: ~1-2s avg
```

#### 3. Network Issues
**Cause**: Slow connection to LLM provider
**Solution**:
- Check network connectivity
- Retry request
- Increase timeout temporarily

#### 4. Large Context Window
**Cause**: System prompt + message + history is very long
**Solution**: Reduce context size
```typescript
// Reduce maxTokens
{ maxTokens: 2048 }  // Instead of 8192

// Simplify system prompt
// Truncate conversation history
```

### Debug Timeout Issues

**Enable timeout logging**:
File: `src/lib/agents/executor.ts`

```typescript
logger.warn('[Agent Executor] Execution timeout', {
  executionId,
  agentId: agent.id,
  timeout
});
```

**Check logs**:
```bash
# Search for timeout logs
grep "Execution timeout" logs/app.log
```

---

## Rate Limiting (429)

### Error: `RATE_LIMIT_EXCEEDED`

**Status Code**: 429
**Error Response**:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 45 seconds.",
    "statusCode": 429
  }
}
```

### Symptoms
- Requests succeed initially, then start failing with 429
- Headers show rate limit info

### Rate Limits by Tier
- **FREE**: 10 requests/min
- **PRO**: 50 requests/min
- **ENTERPRISE**: 500 requests/min

### Solutions

#### 1. Wait Before Retrying
**Exponential backoff**:
```typescript
async function executeWithRetry(agentId, message, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await executeAgent(agentId, message);
    } catch (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        const waitTime = Math.pow(2, retries) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retries++;
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries exceeded');
}
```

#### 2. Upgrade Tier
```sql
UPDATE users SET tier = 'PRO' WHERE id = 'user-id';
```

#### 3. Batch Requests
Combine multiple queries into one request when possible

#### 4. Check Rate Limit Headers
```typescript
const response = await fetch('/api/v1/agents/123/execute');

console.log('Limit:', response.headers.get('X-RateLimit-Limit'));
console.log('Remaining:', response.headers.get('X-RateLimit-Remaining'));
console.log('Reset:', response.headers.get('X-RateLimit-Reset'));
```

### Note
Rate limiting is currently **disabled** due to Next.js 15 type compatibility (systematic issue). Will be re-enabled post-MVP.

---

## Server Errors (500)

### Error: `EXECUTION_ERROR`

**Status Code**: 500
**Error Response**:
```json
{
  "error": {
    "code": "EXECUTION_ERROR",
    "message": "Agent execution failed",
    "statusCode": 500
  }
}
```

### Common Causes

#### 1. LLM Provider API Outage
**Check status pages**:
- Anthropic: https://status.anthropic.com
- OpenAI: https://status.openai.com
- Google: https://status.cloud.google.com

**Solution**: Wait for provider to recover, or switch model

#### 2. Invalid Model Configuration
**Verify model exists**:
```sql
SELECT id, modelId, modelProvider FROM "custom_agents" WHERE id = 'agent-id';
```

**Valid models**:
- `claude-3-5-sonnet-20241022`
- `gpt-4o`
- `gemini-2.0-flash`
- `deepseek-chat`

#### 3. Database Connection Failed
**Check Prisma connection**:
```bash
npx prisma studio  # Should open successfully
```

### Error: `SERVICE_CONFIG_ERROR`

**Status Code**: 500
**Error Response**:
```json
{
  "error": {
    "code": "SERVICE_CONFIG_ERROR",
    "message": "AI service configuration error",
    "statusCode": 500
  }
}
```

### Cause
Missing `ANTHROPIC_API_KEY` environment variable

### Solution
Add API key to `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Restart server:
```bash
npm run dev
```

---

## SSE Streaming Issues

### Issue: Events Not Received

#### Symptom
- Request returns 200 but no SSE events arrive
- Stream hangs without data

#### Solutions

**1. Verify Content-Type header**:
```javascript
const response = await fetch('/api/v1/agents/123/execute');
console.log(response.headers.get('Content-Type'));
// Should be: text/event-stream
```

**2. Check browser SSE support**:
```javascript
if (typeof EventSource !== 'undefined') {
  // Browser supports SSE
} else {
  // Fallback to polling
}
```

**3. Use proper SSE parser**:
```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });

  // Parse SSE format: event: type\ndata: json\n\n
  const lines = chunk.split('\n');
  // ...process lines
}
```

### Issue: Incomplete Responses

#### Symptom
- Stream starts but cuts off mid-response
- Never receives `done` event

#### Solutions

**1. Check timeout**:
Increase timeout if response takes longer than default 30s

**2. Monitor network tab**:
Look for connection drops or errors

**3. Add error handling**:
```typescript
try {
  // SSE processing
} catch (error) {
  console.error('SSE stream error:', error);
  // Retry logic
}
```

---

## Cost & Token Issues

### Issue: Unexpectedly High Costs

#### Symptoms
- `done` event shows high cost
- Token usage exceeds expectations

#### Common Causes

**1. Long System Prompts**:
System prompts count as input tokens every request

**Solution**: Optimize system prompt length
```typescript
// ❌ Verbose system prompt (500 tokens)
systemPrompt: "You are an extremely detailed and comprehensive expert..."

// ✅ Concise system prompt (100 tokens)
systemPrompt: "You are an expert Python developer. Be concise and accurate."
```

**2. High maxTokens**:
Requesting more tokens than needed

**Solution**: Use appropriate maxTokens
```typescript
// Short answers
{ maxTokens: 512 }

// Medium responses
{ maxTokens: 2048 }

// Only use max if absolutely needed
{ maxTokens: 8192 }  // Expensive!
```

**3. Expensive Model**:
Using Claude Opus ($15/$75) instead of Haiku ($0.80/$4)

**Solution**: Choose cost-effective model
```sql
-- Update agent to use Haiku for simple tasks
UPDATE "custom_agents"
SET "modelId" = 'claude-3-5-haiku-20241022'
WHERE id = 'agent-id';
```

### Token Calculation

**Formula**:
```
Input cost = (promptTokens / 1,000,000) × model.inputPrice
Output cost = (completionTokens / 1,000,000) × model.outputPrice
Total cost = Input cost + Output cost
```

**Example (Claude 3.5 Sonnet)**:
```
Prompt tokens: 1,000
Completion tokens: 500

Input: (1000 / 1000000) × $3 = $0.003
Output: (500 / 1000000) × $15 = $0.0075
Total: $0.0105
```

---

## Performance Optimization

### Slow Response Times

#### Symptoms
- Requests take >5 seconds to respond
- User experience feels sluggish

#### Solutions

**1. Use Faster Models**:
```
Haiku: ~0.5-1s (fastest)
Gemini Flash: ~1-2s
Sonnet: ~1-3s
Opus: ~3-5s (slowest)
```

**2. Reduce Context Size**:
- Shorter system prompts
- Smaller maxTokens
- Less conversation history

**3. Enable Caching (Future)**:
Cache frequently used agent responses

**4. Optimize System Prompt**:
```typescript
// ❌ Slow: Very long system prompt (2000 tokens)
systemPrompt: `[massive wall of text...]`

// ✅ Fast: Concise system prompt (200 tokens)
systemPrompt: `Expert in X. Rules: 1) ..., 2) ..., 3) ...`
```

### High Memory Usage

#### Symptoms
- Server runs out of memory
- Crashes during agent execution

#### Solutions

**1. Limit Concurrent Executions**:
```typescript
// Add queue/throttling
const MAX_CONCURRENT = 5;
```

**2. Stream Instead of Buffering**:
Use SSE streaming (default) instead of buffering entire response

**3. Clean Up Resources**:
```typescript
try {
  await executeAgent(...);
} finally {
  // Always clean up
  clearTimeout(timeoutId);
  abortController = null;
}
```

---

## Debug Checklist

When troubleshooting Custom Agent issues, check:

- [ ] User is authenticated (session exists)
- [ ] User owns the agent (or is ADMIN)
- [ ] User tier >= agent tier
- [ ] Agent exists in database
- [ ] Request validates against schema
- [ ] Environment variables set (ANTHROPIC_API_KEY)
- [ ] Model ID is valid
- [ ] Timeout is within range (5-60s)
- [ ] Rate limits not exceeded
- [ ] Network connectivity to LLM provider
- [ ] Logs show detailed error messages

---

## Getting Help

If issues persist after following this guide:

1. **Check Logs**:
   ```bash
   # Search for execution errors
   grep "Agent Executor" logs/*.log
   ```

2. **Verify Implementation**:
   - Code: `src/lib/agents/executor.ts`
   - Tests: `src/__tests__/unit/executor.test.ts`

3. **Run Tests**:
   ```bash
   npm test src/__tests__/unit/executor.test.ts
   npm test src/__tests__/integration/agent-execute.test.ts
   ```

4. **Contact Support**:
   - GitHub Issues: [Create issue](https://github.com/your-repo/issues)
   - Documentation: [User Guide](../guides/CUSTOM-AGENTS.md)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-26
**Related**: [Custom Agents User Guide](../guides/CUSTOM-AGENTS.md), [API Reference](../api/ENDPOINTS.md)

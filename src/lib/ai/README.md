# LLM Hybrid Router

Multi-LLM routing system with hybrid scoring algorithm (quality + cost + availability).

---

## Overview

The LLM Hybrid Router automatically selects the optimal LLM model for each request based on:

- **Quality (40%)**: Model capabilities and task fit
- **Cost (30%)**: Cost efficiency per token
- **Availability (30%)**: Uptime, latency, and queue depth

### Supported Models

| Model | Provider | Quality | Cost/1k Tokens | Latency | Context |
|-------|----------|---------|----------------|---------|---------|
| **Claude 3.5 Sonnet** | Anthropic | 0.95 | $0.009 | 800ms | 200k |
| **GPT-4o** | OpenAI | 0.92 | $0.00625 | 1200ms | 128k |
| **Gemini 2.0 Flash** | Google | 0.88 | $0.000375 | 500ms | 1M |
| **DeepSeek Chat** | DeepSeek | 0.85 | $0.00021 | 1500ms | 64k |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LLM Hybrid Router                       │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Quality   │  │    Cost     │  │Availability │        │
│  │  Score 40%  │  │  Score 30%  │  │  Score 30%  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                │
│         └────────────────┴────────────────┘                │
│                          │                                 │
│                    Final Score                             │
│                          │                                 │
│              ┌───────────┴───────────┐                     │
│              │   Model Selection     │                     │
│              └───────────┬───────────┘                     │
│                          │                                 │
│              ┌───────────┴───────────┐                     │
│              │  Fallback Strategy    │                     │
│              │  (max 3 attempts)     │                     │
│              └───────────┬───────────┘                     │
│                          │                                 │
│                   ┌──────┴──────┐                          │
│                   │  LLM Call   │                          │
│                   └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/lib/ai/
├── models.ts       - Model configurations (quality, cost, capabilities)
├── router.ts       - Hybrid routing algorithm (40-30-30 scoring)
├── vercel-ai.ts    - Vercel AI SDK integration + fallback strategy
├── tokens.ts       - Token counting and cost calculation
├── prompts.ts      - System prompts for different use cases
└── README.md       - This file
```

---

## Usage

### 1. Basic Routing

```typescript
import { routeToModel, createRoutingContext } from '@/lib/ai/router';
import { callModelWithFallback } from '@/lib/ai/vercel-ai';

// Create routing context
const context = createRoutingContext({
  userId: 'user-123',
  userTier: 'PRO',
  prompt: 'Explain quantum computing',
  requestId: 'req-123',
});

// Get routing decision
const routing = routeToModel(context);

console.log('Selected model:', routing.selectedModel);
console.log('Reasoning:', routing.reasoning);
console.log('Fallbacks:', routing.fallbacks);

// Call model with fallback
const response = await callModelWithFallback(routing, {
  model: routing.selectedModel,
  prompt: context.prompt,
  systemPrompt: 'You are a helpful AI assistant.',
  temperature: 0.7,
  maxTokens: 4096,
});

console.log('Response:', response.content);
console.log('Cost:', response.cost);
```

### 2. With System Metrics

```typescript
import type { SystemMetrics } from '@/types/llm';

const metrics: SystemMetrics = {
  'claude-3.5-sonnet-20241022': {
    uptime: 0.99,
    currentLatency: 800,
    queueDepth: 10,
  },
  'gpt-4o': {
    uptime: 0.98,
    currentLatency: 1200,
    queueDepth: 20,
  },
  // ...
};

// Route with metrics (availability scoring uses this)
const routing = routeToModel(context, metrics);
```

### 3. Auto-detect System Prompt

```typescript
import { buildSystemPromptAuto } from '@/lib/ai/prompts';

const prompt = 'Write Python code to sort an array';

// Auto-detects "code" type and uses code system prompt
const systemPrompt = buildSystemPromptAuto(prompt);

const response = await callModelWithFallback(routing, {
  model: routing.selectedModel,
  prompt,
  systemPrompt, // Optimized for code tasks
});
```

---

## Routing Algorithm

### Quality Score (40% weight)

```typescript
baseScore + boosts - penalties

Boosts:
- Code tasks + Claude → +0.1
- Analysis tasks + GPT-4o → +0.05

Penalties:
- Latency > 2000ms → -0.1
```

### Cost Score (30% weight)

```typescript
score = 1 - min(1, actualCost / maxCost)

// Cheaper models get higher scores
// Max cost reference: $0.01 per 1k tokens
```

### Availability Score (30% weight)

```typescript
score = 1.0
  - (1 - uptime) * 0.5
  - latencyPenalty
  - queueDepthPenalty

Penalties:
- Latency > 3000ms → -0.3
- Latency > 1500ms → -0.1
- Queue depth > 100 → -0.2
```

### Final Score

```typescript
finalScore =
  0.4 * qualityScore +
  0.3 * costScore +
  0.3 * availabilityScore
```

---

## Tier Constraints

### FREE Tier

**Allowed models:**
- Gemini 2.0 Flash
- DeepSeek Chat

**Rationale:** Cost-efficient models only

### PRO Tier

**Allowed models:**
- All 4 models

**Rationale:** Balance quality and cost

### ENTERPRISE Tier

**Allowed models:**
- All 4 models

**Rationale:** Full access, prioritize quality

---

## Fallback Strategy

1. **Try primary model** (selected by router)
2. **If fails → try 1st fallback** (next best score)
3. **If fails → try 2nd fallback** (third best score)
4. **Max 3 attempts** total
5. **Timeout: 30 seconds** per attempt

```typescript
const models = [
  routing.selectedModel,  // Primary
  ...routing.fallbacks    // Fallbacks (sorted by score)
];

for (let i = 0; i < Math.min(models.length, 3); i++) {
  try {
    const response = await callLLM(models[i], request);
    return response; // Success
  } catch (error) {
    console.log(`Model ${models[i]} failed, trying next...`);
  }
}

throw new Error('All models failed after 3 attempts');
```

---

## Token Counting

Simple character-based approximation:

```typescript
estimatedTokens = Math.ceil(text.length / 4);

// Example:
// "Hello, world!" (13 chars) → 4 tokens
// "Lorem ipsum dolor sit amet" (26 chars) → 7 tokens
```

For production, use `tiktoken` library for accurate counting.

---

## Cost Calculation

```typescript
inputCost = (inputTokens / 1000) * inputCostPer1k;
outputCost = (outputTokens / 1000) * outputCostPer1k;
totalCost = inputCost + outputCost;
```

**Example:**

Request: "Explain quantum computing" (500 input tokens)
Response: 1,000 output tokens

Using **Claude 3.5 Sonnet**:
- Input: 500 × $0.003/1k = $0.0015
- Output: 1,000 × $0.015/1k = $0.015
- **Total: $0.0165**

Using **Gemini 2.0 Flash**:
- Input: 500 × $0.00015/1k = $0.000075
- Output: 1,000 × $0.0006/1k = $0.0006
- **Total: $0.000675** (24x cheaper!)

---

## System Prompts

### Available Types

- **default**: General assistant
- **code**: Code generation and debugging
- **analysis**: Data analysis and problem-solving
- **creative**: Creative writing

### Auto-detection

```typescript
detectPromptType("Write Python code") → "code"
detectPromptType("Analyze this dataset") → "analysis"
detectPromptType("Write a story") → "creative"
detectPromptType("Hello") → "default"
```

---

## Testing

```bash
# Run unit tests
npm run test:router

# Watch mode
npm run test:router -- --watch

# Coverage
npm run test:router -- --coverage
```

### Test Coverage Goals

- **Overall**: >80%
- **Router**: >90%
- **Tokens**: >85%
- **Prompts**: >75%

---

## Environment Setup

See [scripts/setup-env.md](../../../scripts/setup-env.md) for detailed instructions on obtaining API keys.

Required environment variables:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...
```

---

## Monitoring

### Logging

All routing attempts are logged:

```typescript
logRoutingAttempt({
  requestId: 'req-123',
  model: 'claude-3.5-sonnet-20241022',
  success: true,
  attempt: 1,
});
```

### Metrics to Track

- **Model selection distribution** (which models get selected most)
- **Fallback frequency** (how often fallbacks are used)
- **Cost per request** (average cost by tier)
- **Latency per model** (actual vs expected)
- **Success rate** (% of requests that succeed)

---

## Future Enhancements

- [ ] **Streaming support** (SSE for real-time responses)
- [ ] **Fine-tuned models** (custom models per user/tenant)
- [ ] **Caching layer** (cache frequent queries)
- [ ] **Load balancing** (distribute across replicas)
- [ ] **A/B testing** (compare routing strategies)
- [ ] **Machine learning routing** (ML-based model selection)

---

## Troubleshooting

### Error: "All models failed after 3 attempts"

**Cause**: All models timed out or returned errors

**Solutions**:
1. Check API keys are valid
2. Verify network connectivity
3. Check provider status pages
4. Increase timeout (if needed)

### Error: "Model not found"

**Cause**: Invalid model name

**Solutions**:
1. Check model name matches `MODELS` config
2. Verify model is supported
3. Check for typos

### High costs

**Cause**: Expensive models being selected frequently

**Solutions**:
1. Adjust tier constraints (use cheaper models)
2. Optimize prompts (reduce token usage)
3. Implement caching for frequent queries

---

## License

MIT

---

## Contributors

- **ai-specialist** - LLM routing implementation
- **architect** - System design and oversight

---

**LLM Hybrid Router** - Optimizing quality, cost, and availability for every request.

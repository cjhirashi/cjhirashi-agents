# ADR-006: Server-Sent Events (SSE) para Chat Real-Time

## Estado
**ACCEPTED** - Implementado en Fase 1

## Contexto

### Problema a Resolver

El sistema Cjhirashi necesita **streaming de tokens en tiempo real** para chat con LLMs:

**Requisitos de Usuario:**
- **Tokens aparecen progresivamente** (no esperar respuesta completa)
- **Latency perceptible** < 200ms para primer token
- **Smooth rendering** sin lag perceptible
- **Interruption support** (cancelar generación mid-stream)
- **Connection resilience** (reconectar si falla)

**Requisitos Técnicos:**
- **Serverless compatible** (Vercel Edge/Node runtime)
- **Multiplexing** (múltiples chats concurrentes por usuario)
- **Backpressure handling** (no overwhelm client)
- **Error propagation** (errores lleguen a UI)
- **Cost efficiency** (< $0.01 por sesión de chat)

### Opciones de Protocolo

**1. WebSocket (WS)**
- **Pro**: Bidireccional, low latency, persistent
- **Contra**: Stateful (no serverless-friendly), más complejo

**2. Server-Sent Events (SSE)**
- **Pro**: Unidireccional (suficiente), HTTP/1.1, simple
- **Contra**: Solo server → client (no problema para streaming LLM)

**3. HTTP Long Polling**
- **Pro**: Compatible universal
- **Contra**: Latency alta, overhead de connections

**4. gRPC-web Streaming**
- **Pro**: Type-safe, efficient
- **Contra**: Requiere proxy, complex setup

### Constraints del Proyecto

- **Hosting**: Vercel serverless (Edge + Node.js runtimes)
- **Timeouts**: 60s Edge, 300s Node.js
- **Stateless**: No persistent connections entre requests
- **Budget**: Minimize serverless invocations

## Decisión

**Adoptamos Server-Sent Events (SSE) sobre HTTP para streaming de chat.**

### Justificación Principal

**SSE es óptimo porque:**
1. **Serverless native**: HTTP-based, stateless
2. **Simple**: Standard EventSource API en browser
3. **Vercel AI SDK**: Soporte first-class (`streamText()`)
4. **Unidireccional suficiente**: Client → Server (HTTP POST), Server → Client (SSE)
5. **Reconnection**: Automatic retry built-in browser

### Arquitectura de Streaming

```
┌──────────────────────────────────────────────────────┐
│                 SSE CHAT FLOW                         │
└──────────────────────────────────────────────────────┘

1. CLIENT REQUEST
   ┌──────────────┐
   │   Browser    │
   │  (React)     │
   └──────┬───────┘
          │ POST /api/chat
          │ {messages, taskType}
          ▼
   ┌──────────────┐
   │  Next.js     │
   │  API Route   │
   └──────┬───────┘
          │
          ▼

2. STREAMING RESPONSE
   ┌──────────────┐
   │  Vercel AI   │ streamText()
   │     SDK      │ → SSE stream
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   Claude/    │ Token stream
   │   Gemini     │
   └──────┬───────┘
          │
          ▼

3. CLIENT CONSUMPTION
   ┌──────────────┐
   │ EventSource  │ addEventListener('message')
   │   or         │ → Update UI progressively
   │ useChat()    │
   └──────────────┘

PROTOCOL:
- Content-Type: text/event-stream
- Connection: keep-alive
- Cache-Control: no-cache
- X-Accel-Buffering: no (disable nginx buffering)

EVENT FORMAT:
data: {"type":"token","content":"Hello"}

data: {"type":"token","content":" world"}

data: {"type":"finish","usage":{"tokens":15}}

data: [DONE]
```

### Backend Implementation (Next.js API Route)

```typescript
// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { selectLLMModel } from '@/lib/ai/model-selector';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export const runtime = 'edge'; // Edge runtime para low latency
export const maxDuration = 60; // 60s timeout

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const { messages, chatId, taskType } = body;

    // Select LLM model
    const modelConfig = selectLLMModel(taskType || 'general');

    // Stream text
    const result = streamText({
      model: modelConfig.model,
      messages,
      maxTokens: 4096,
      temperature: 0.7,
      onFinish: async ({ text, usage, finishReason }) => {
        // Persist message to database
        await prisma.message.create({
          data: {
            chatId,
            role: 'assistant',
            content: text,
            model: modelConfig.provider,
            tokensUsed: usage.totalTokens,
            latencyMs: Date.now() - startTime,
          },
        });
      },
    });

    // Return SSE stream
    return result.toDataStreamResponse({
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('Chat streaming error:', error);

    // Return error as SSE event
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }
    );
  }
}
```

### Frontend Implementation (React)

**Opción 1: Vercel AI SDK `useChat` Hook**

```typescript
// components/chat/ChatInterface.tsx
'use client';

import { useChat } from 'ai/react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatInterface({ chatId }: { chatId: string }) {
  const {
    messages,
    input,
    setInput,
    append,
    isLoading,
    error,
    stop,
  } = useChat({
    api: '/api/chat',
    body: {
      chatId,
      taskType: 'general',
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('Failed to send message');
    },
    onFinish: (message) => {
      console.log('Message finished:', message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    await append({
      role: 'user',
      content: input,
    });

    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} isLoading={isLoading} />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onStop={stop}
        disabled={isLoading}
      />

      {error && (
        <div className="text-red-500 text-sm p-2">
          Error: {error.message}
        </div>
      )}
    </div>
  );
}
```

**Opción 2: Native EventSource (Custom Implementation)**

```typescript
// lib/chat/sse-client.ts
export class ChatSSEClient {
  private eventSource: EventSource | null = null;
  private controller: AbortController | null = null;

  async streamChat(params: {
    messages: Message[];
    chatId: string;
    taskType?: string;
    onToken: (token: string) => void;
    onFinish: (data: { usage: any }) => void;
    onError: (error: Error) => void;
  }) {
    this.controller = new AbortController();

    try {
      // POST request to initiate stream
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: params.messages,
          chatId: params.chatId,
          taskType: params.taskType,
        }),
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove "data: " prefix

            if (data === '[DONE]') {
              return;
            }

            try {
              const event = JSON.parse(data);

              switch (event.type) {
                case 'token':
                  params.onToken(event.content);
                  break;
                case 'finish':
                  params.onFinish(event);
                  break;
                case 'error':
                  params.onError(new Error(event.error));
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', data);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        params.onError(error as Error);
      }
    }
  }

  stop() {
    if (this.controller) {
      this.controller.abort();
    }
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

// Usage in component
const sseClient = new ChatSSEClient();

sseClient.streamChat({
  messages,
  chatId,
  onToken: (token) => {
    setStreamingMessage(prev => prev + token);
  },
  onFinish: (data) => {
    console.log('Finished:', data.usage);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
});
```

### Progressive Rendering

```typescript
// components/chat/StreamingMessage.tsx
'use client';

import { useState, useEffect } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CodeBlock } from './CodeBlock';

export function StreamingMessage({ content }: { content: string }) {
  const [displayContent, setDisplayContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Simulate progressive rendering (if content is updated in chunks)
    setDisplayContent(content);

    // Detect completion (no update for 500ms)
    const timer = setTimeout(() => {
      setIsComplete(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [content]);

  return (
    <div className="relative">
      <MarkdownRenderer content={displayContent} />

      {!isComplete && (
        <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
      )}
    </div>
  );
}
```

### Error Handling & Reconnection

```typescript
// lib/chat/reconnection.ts
export class SSEReconnectionManager {
  private maxRetries = 3;
  private retryDelay = 1000; // 1s
  private currentRetry = 0;

  async streamWithRetry(
    streamFn: () => Promise<void>,
    onError: (error: Error, retry: number) => void
  ) {
    while (this.currentRetry < this.maxRetries) {
      try {
        await streamFn();
        this.currentRetry = 0; // Reset on success
        return;
      } catch (error) {
        this.currentRetry++;

        if (this.currentRetry >= this.maxRetries) {
          onError(new Error('Max retries exceeded'), this.currentRetry);
          throw error;
        }

        console.log(`Retry ${this.currentRetry}/${this.maxRetries} after ${this.retryDelay}ms`);
        onError(error as Error, this.currentRetry);

        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        this.retryDelay *= 2; // Exponential backoff
      }
    }
  }

  reset() {
    this.currentRetry = 0;
    this.retryDelay = 1000;
  }
}
```

### Heartbeat (Keep-Alive)

```typescript
// app/api/chat/route.ts (with heartbeat)
export async function POST(req: NextRequest) {
  // ... setup

  const result = streamText({
    model: modelConfig.model,
    messages,
    // ... other options
  });

  // Add heartbeat to prevent timeout
  const stream = result.toDataStream();

  const heartbeatStream = new ReadableStream({
    async start(controller) {
      const heartbeatInterval = setInterval(() => {
        controller.enqueue(': heartbeat\n\n'); // SSE comment (ignored by client)
      }, 30000); // Every 30s

      try {
        const reader = stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        clearInterval(heartbeatInterval);
        controller.close();
      }
    },
  });

  return new Response(heartbeatStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Alternativas Consideradas

### Opción A: WebSocket

**Descripción**: Full-duplex connection con ws:// protocol.

**Pros**:
- Bidireccional (útil si necesitamos server → client push arbitrario)
- Lower latency (persistent connection)
- Binary data support

**Contras**:
- **No Serverless**: Requiere stateful server (no Vercel Edge compatible)
- **Complexity**: Connection management, reconnection logic manual
- **Scaling**: Load balancing WebSocket más complejo
- **Cost**: Persistent connections = más recursos
- **Overkill**: Solo necesitamos server → client (unidireccional)

**Score: 5/10**

**Decisión**: Rechazado - Stateful no compatible con serverless. Over-engineering.

---

### Opción B: HTTP Long Polling

**Descripción**: Client hace requests repetidos, server retiene hasta tener data.

**Pros**:
- Compatible universal (HTTP/1.0+)
- Simple de implementar

**Contras**:
- **Latency**: 100-500ms overhead por request
- **Overhead**: Connection setup/teardown constante
- **Inefficient**: Más requests = más cost
- **Not True Streaming**: Batch de tokens, no progressive

**Score: 4/10**

**Decisión**: Rechazado - Latency y efficiency muy inferiores a SSE.

---

### Opción C: gRPC-web Streaming

**Descripción**: gRPC streaming sobre HTTP/2.

**Pros**:
- Type-safe (Protobuf)
- Efficient binary protocol
- Bidirectional streaming

**Contras**:
- **Complexity**: Requiere Envoy proxy, code generation
- **Browser Support**: Necesita gRPC-web library (no native)
- **Overkill**: Protobuf no necesario (JSON suficiente)
- **Setup**: 1-2 semanas solo para setup
- **Team Expertise**: Nadie conoce gRPC

**Score: 4/10**

**Decisión**: Rechazado - Complejidad extrema para beneficio mínimo.

---

### Opción D: HTTP Chunked Transfer Encoding

**Descripción**: HTTP/1.1 chunked transfer sin SSE format.

**Pros**:
- HTTP standard
- Simple backend

**Contras**:
- **No Structure**: Sin event types (vs SSE data: format)
- **Client Parsing**: Manual parsing de chunks
- **Reconnection**: Sin automatic retry (vs EventSource)
- **Less DX**: Vercel AI SDK usa SSE, no chunked

**Score: 6/10**

**Decisión**: Rechazado - SSE es superset de chunked (más features, mismo overhead).

---

### Opción Elegida: **Server-Sent Events (SSE)**

**Score: 10/10**

**Pros Clave**:
- **Serverless Native**: HTTP-based, stateless, Vercel compatible
- **Simple**: EventSource API built-in browser
- **Structured**: `data:` format, event types
- **Automatic Retry**: Browser reconnects on failure
- **Vercel AI SDK**: First-class support (`streamText()`)
- **Low Latency**: < 200ms first token
- **Cost Efficient**: Pay-per-use, no persistent connections

**Contras Mitigados**:
- **Unidireccional**: No problema (solo server → client necesario)
- **HTTP/1.1 Limit**: 6 connections/domain - Mitigado con HTTP/2 (Vercel usa HTTP/2)

**Justificación**:
- Perfect fit para serverless streaming
- Best practice para LLM streaming
- Zero configuration en Vercel

## Consecuencias

### Positivas

1. **Latency Óptima**
   - First token: < 200ms P95
   - Progressive rendering: Smooth UX
   - Perceived performance: 10x mejor vs batch

2. **Serverless Compatible**
   - Vercel Edge: < 60s timeout suficiente
   - No state management
   - Auto-scaling sin issues

3. **Developer Experience**
   - `useChat()` hook: 5 líneas de código
   - Type-safe con TypeScript
   - Hot reload funciona

4. **Cost Efficiency**
   - No persistent connections
   - Pay-per-use
   - ~$0.001 por sesión chat

5. **Resilience**
   - Automatic reconnection (EventSource)
   - Timeout handling
   - Error propagation

### Negativas

1. **Connection Limits**
   - **Problema**: HTTP/1.1 limit 6 connections/domain
   - **Impacto**: Múltiples chats concurrentes pueden saturar
   - **Mitigación**: Vercel usa HTTP/2 (multiplexing), no aplica límite
   - **Riesgo**: Bajo

2. **Timeouts**
   - **Problema**: 60s timeout Edge, 300s Node.js
   - **Impacto**: Respuestas muy largas pueden cortarse
   - **Mitigación**: Heartbeat cada 30s, split responses > 300s
   - **Riesgo**: Bajo (mayoría responses < 60s)

3. **No Bidireccional**
   - **Limitación**: Solo server → client
   - **Impacto**: Si necesitamos server push arbitrario, no funciona
   - **Mitigación**: No requerido en MVP (solo streaming LLM)
   - **Plan B**: Agregar WebSocket Fase 3 si colaboración real-time

4. **Buffer Issues**
   - **Problema**: Proxies (nginx) pueden buffear SSE
   - **Mitigación**: Header `X-Accel-Buffering: no`
   - **Vercel**: No aplica (Vercel no buffera)

5. **Browser Compatibility**
   - **Problema**: EventSource no soporta request headers custom (auth)
   - **Mitigación**: Usar fetch + ReadableStream (polyfill EventSource)
   - **Soporte**: 98%+ browsers (IE no, pero no target)

## Validación e Implementación

### Métricas de Éxito (SLA)

| Métrica | Target | Medición |
|---------|--------|----------|
| **First Token Latency P95** | < 200ms | Custom metrics |
| **Streaming Stability** | 99.5% | Connection success rate |
| **Reconnection Success** | > 95% | Logs analysis |
| **User Perceived Latency** | "Instant" | UX surveys |
| **Cost per Session** | < $0.001 | Vercel analytics |

### Testing Strategy

```typescript
// __tests__/api/chat-stream.test.ts
import { POST } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';

describe('Chat Streaming', () => {
  test('streams tokens progressively', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        chatId: 'test-chat',
      }),
    });

    const response = await POST(request);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.status).toBe(200);

    // Parse stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    let receivedTokens = 0;
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      if (chunk.includes('data: ')) {
        receivedTokens++;
      }
    }

    expect(receivedTokens).toBeGreaterThan(0);
  });

  test('handles errors gracefully', async () => {
    // Test error handling
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [], // Invalid (empty)
        chatId: 'test-chat',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const text = await response.text();
    expect(text).toContain('error');
  });
});
```

### Monitoring Dashboard

```typescript
// lib/monitoring/streaming-metrics.ts
import { Axiom } from '@axiomhq/js';

const axiom = new Axiom({ token: process.env.AXIOM_TOKEN });

export async function logStreamingSession(data: {
  chatId: string;
  userId: string;
  model: string;
  firstTokenLatency: number;
  totalTokens: number;
  duration: number;
  success: boolean;
  errorMessage?: string;
}) {
  await axiom.ingest('streaming-sessions', [
    {
      ...data,
      timestamp: new Date().toISOString(),
    },
  ]);
}
```

### Load Testing

```bash
# Artillery config for SSE load test
# artillery-sse.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
  processor: "./processor.js"

scenarios:
  - name: "Chat streaming"
    flow:
      - post:
          url: "/api/chat"
          json:
            messages:
              - role: "user"
                content: "Write a story about AI"
            chatId: "{{ $randomString() }}"
          expect:
            - statusCode: 200
            - contentType: "text/event-stream"
          capture:
            - stream:
                as: "tokens"

# processor.js
module.exports = {
  afterResponse: function(requestParams, response, context, ee, next) {
    if (response.headers['content-type'] === 'text/event-stream') {
      // Track streaming metrics
      ee.emit('counter', 'streaming.sessions', 1);
    }
    return next();
  },
};
```

**Expected Results:**
- 50 concurrent users
- < 200ms P95 first token
- 99.5%+ success rate
- < 1% reconnections

## Referencias

- [ARCHITECTURE.md - Capa 3: API Layer](../ARCHITECTURE.md#capa-3-api-layer)
- [ADR-001: Vercel AI SDK Multi-LLM](./ADR-001-vercel-ai-sdk-multi-llm.md)
- [ADR-003: Next.js API Routes](./ADR-003-nextjs-api-routes.md)
- [Vercel AI SDK Streaming](https://sdk.vercel.ai/docs/guides/streaming)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

## Historial de Decisión

- **Creada**: 2025-10-22
- **Revisada por**: Architect, AI Specialist, Coder
- **Implementación**: Fase 1 (Semanas 1-2)
- **Última actualización**: 2025-10-22
- **Siguiente revisión**: Fase 3 - Evaluar WebSocket si colaboración multi-user real-time necesaria
- **Aprobada por**: Usuario (Proyecto Cjhirashi)

---

**Decisión final**: SSE es la solución perfecta para streaming LLM en serverless. Simple, eficiente, compatible con Vercel y best practice industry-wide.

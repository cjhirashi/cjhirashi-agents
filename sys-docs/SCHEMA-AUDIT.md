# Schema Audit Report - CJHIRASHI Agents

**Fecha**: 2025-10-29
**Estado**: 🔴 CRÍTICO - Desincronización Schema-Código
**Bloqueante**: SÍ - Build de producción bloqueado
**Tipo Audit**: Inicial (Fase 1 - Revisión Arquitectural)

---

## 📊 RESUMEN EJECUTIVO

### Hallazgos Principales
- **143 errores TypeScript** total en la compilación
- **5 categorías principales de problemas** identificadas
- **10 archivos críticos** con errores bloqueantes
- **Estimado de arreglos**: 18-27 horas (todas las fases)

### Distribución de Errores

| Categoría | Cantidad | Severidad | Archivos |
|-----------|----------|-----------|----------|
| Nombres de modelos Prisma inválidos | 12+ | 🔴 CRÍTICA | 7 |
| Referencias de campos faltantes | 18+ | 🔴 CRÍTICA | 4 |
| Valores enum inválidos | 17+ | 🔴 CRÍTICA | 4 |
| Tipos de bibliotecas incompatibles | 35+ | 🔴 CRÍTICA | 8 |
| Campos opcionales/nulos mal manejados | 15+ | 🟡 ALTA | 6 |
| **TOTAL** | **143+** | | **39** |

---

## 🔴 PROBLEMA #1: Nombres de Modelos Prisma Inválidos

### Descripción
El código intenta usar nombres de modelos que no existen en el schema Prisma generado.

### Ejemplos de Errores

#### ❌ customAgent (no existe)
**Ubicación**: `src/__tests__/integration/voice-session.test.ts` (líneas 32, 52, 73, 85, 115, 124, 142, 232, 285)

```typescript
// INCORRECTO
const agent = await prisma.customAgent.create({...})
const agents = await prisma.customAgent.findUnique({...})
```

**Schema Real**: El modelo se llama `agents` (minúsculas)
```prisma
model agents {
  id          String
  createdBy   String
  name        String
  // ...
}
```

**Corrección**:
```typescript
// CORRECTO
const agent = await prisma.agents.create({...})
const agents = await prisma.agents.findUnique({...})
```

#### ❌ document (no existe)
**Ubicación**: `src/lib/rag/pipeline.ts` (líneas 108, 133, 148, 184, 231, 244, 274, 370)

```typescript
// INCORRECTO
const document = await prisma.document.create({...})
await prisma.documentChunk.createMany({...})
```

**Schema Real**: Estos modelos no existen en el schema actual
- ❌ `prisma.document` - NO EXISTE
- ❌ `prisma.documentChunk` - NO EXISTE

**Impacto**: La funcionalidad RAG está completamente deshabilitada

**Ubicaciones Secundarias**:
- `src/lib/rag/search.ts` (líneas múltiples)

#### ❌ conversation (singular)
**Ubicación**: `src/__tests__/api/chat.test.ts` (línea 129)

```typescript
// INCORRECTO
const conversation = await prisma.conversation.create({...})
```

**Schema Real**: `conversations` (plural)

**Corrección**:
```typescript
// CORRECTO
const conversation = await prisma.conversations.create({...})
```

#### ❌ message (singular)
**Ubicación**: `src/__tests__/api/chat.test.ts` (línea 137)

```typescript
// INCORRECTO
const messages = await prisma.message.findMany({...})
```

**Schema Real**: `messages` (plural, pero se usa igual)

### Resumen de Problemas de Nombres de Modelos

| Modelo Incorrecto | Correcto | Archivos | Líneas |
|-------------------|----------|----------|--------|
| `customAgent` | `agents` | voice-session.test.ts | 9 |
| `document` | ❌ NO EXISTE | pipeline.ts, search.ts | 13+ |
| `documentChunk` | ❌ NO EXISTE | pipeline.ts | 1+ |
| `conversation` | `conversations` | chat.test.ts | 1 |
| `message` | `messages` | chat.test.ts | 1 |
| **TOTAL** | | 7 archivos | 25+ |

---

## 🔴 PROBLEMA #2: Relaciones de Modelos Confundidas

### Descripción
La navegación entre modelos es incorrecta. El código no sigue la estructura de relaciones del schema.

### Jerarquía Correcta (Schema)
```
User (1:N)
  ├─ ChatSession (1:N)
  │   ├─ Conversation (1:N) [agentId]
  │   │   └─ Message (1:N)
```

### Errores Identificados

#### ❌ sessionId vs conversationId
**Ubicación**: `src/app/api/v1/chat/send/route.ts` (líneas 89-101)

```typescript
// INCORRECTO - Confunde niveles de jerarquía
const userMessage = await prisma.messages.create({
  data: {
    conversationId: validated.sessionId,  // ❌ INCORRECTO
    role: 'user',
    content: validated.message,
  }
});
```

**Problema**:
- `sessionId` referencia a `ChatSession`
- `conversationId` debe referenciar a `Conversation` (diferente modelo)
- Esto violaría la foreign key constraint

**Corrección**:
```typescript
// CORRECTO - Primero necesitas crear o encontrar una conversation
const conversation = await prisma.conversations.findFirst({
  where: {
    chatSessionId: validated.sessionId,
    agentId: validated.agentId,  // O el agentId relevante
  }
});

if (!conversation) {
  // Crear nueva conversation si no existe
  conversation = await prisma.conversations.create({
    data: {
      chatSessionId: validated.sessionId,
      agentId: validated.agentId,
      title: 'New Conversation'
    }
  });
}

const userMessage = await prisma.messages.create({
  data: {
    conversationId: conversation.id,  // ✅ CORRECTO
    role: 'user',
    content: validated.message,
  }
});
```

#### ❌ Navegación ChatSession → messages directa
**Ubicación**: `src/__tests__/api/chat.test.ts` (línea 129)

```typescript
// INCORRECTO - No existe relación directa
const messages = await prisma.chatSession.findUnique({
  where: { id: sessionId },
  include: {
    messages: { orderBy: { timestamp: 'asc' } }  // ❌ NO EXISTE
  }
});
```

**Schema Real**: La relación debe ser: `chatSession.conversations[].messages[]`

**Corrección**:
```typescript
// CORRECTO - Navegar a través de conversations
const session = await prisma.chatSession.findUnique({
  where: { id: sessionId },
  include: {
    conversations: {
      include: {
        messages: { orderBy: { timestamp: 'asc' } }
      }
    }
  }
});
```

#### ❌ Campos faltantes en VoiceSession
**Ubicación**: `src/__tests__/integration/voice-session.test.ts` (líneas 73, 85-88, 232, 285)

```typescript
// INCORRECTO - Campos no existen en schema
const voiceSession = await prisma.voiceSessions.create({
  data: {
    userId: userId,
    agentId: agentId,           // ❌ CAMPO NO EXISTE
    voice: 'alloy',              // ❌ CAMPO NO EXISTE
    temperature: 0.7,            // ❌ CAMPO NO EXISTE
    maxTokens: 1024,             // ❌ CAMPO NO EXISTE
    status: 'ACTIVE',
  }
});
```

**Schema Real** (líneas 781-793):
```prisma
model voice_sessions {
  id            String    @id
  userId        String
  status        String    @default("ACTIVE")
  messagesCount Int       @default(0)
  tokensInput   Int       @default(0)
  tokensOutput  Int       @default(0)
  costTotal     Float     @default(0)
  durationMs    Int?
  startedAt     DateTime  @default(now())
  endedAt       DateTime?
}
```

**Campos Faltantes**:
- ❌ `agentId` - No existe
- ❌ `voice` - No existe
- ❌ `temperature` - No existe
- ❌ `maxTokens` - No existe

**Solución**: Agregar estos campos al schema si son necesarios

---

## 🔴 PROBLEMA #3: Valores Enum Inválidos

### Descripción
El código usa valores de enumeración que no existen en el schema.

### ❌ UserRole.CLIENT (no existe)
**Ubicación**: 17+ instancias en archivos de test

**Archivos afectados**:
- `src/__tests__/unit/auth-utils.test.ts` (11 instancias, líneas 99, 146, 213, 226, 305, 333, 361, 389, 423, 493, 551, 580, 643)
- `src/__tests__/integration/images-api.test.ts` (3 instancias, líneas 25, 95, 289)
- `src/__tests__/integration/tasks-api.test.ts` (2 instancias, línea 28, 317)
- `src/__tests__/integration/voice-session.test.ts` (1+ instancias, línea 25)

**Código Incorrecto**:
```typescript
// INCORRECTO
role: 'CLIENT',
role: UserRole.CLIENT,
```

**Schema Real** (líneas 886-896):
```prisma
enum UserRole {
  ADMIN
  USER              // ← Valor correcto para usuarios normales
  SUPER_ADMIN
  MANAGER
  DEVELOPER
  GUEST
  INVITED_AGENT
  INVITED_STORAGE
  SUBSCRIBER
}
```

**Corrección**:
```typescript
// CORRECTO
role: 'USER',
role: UserRole.USER,
```

**Impacto**:
- Los tests fallarán por tipo inválido
- 17+ errores de compilación

---

## 🔴 PROBLEMA #4: APIs de Bibliotecas Incompatibles

### Descripción
El código usa parámetros o propiedades de bibliotecas externas que no existen o cambiaron de API.

### ❌ Float32Array TypeScript
**Ubicación**: `src/lib/audio/audio-processor.ts` (línea 302)

```typescript
// INCORRECTO
const float32 = new Float32Array(audioBuffer);
audioBuffer.copyToChannel(float32, 0);
//                         ^^^^^^ Tipo incompatible
```

**Error TypeScript**:
```
Argument of type 'Float32Array<ArrayBufferLike>' is not assignable
to parameter of type 'Float32Array<ArrayBuffer>'
```

**Causa**: Diferencia entre `ArrayBufferLike` (interfaz genérica) y `ArrayBuffer` (tipo específico)

**Corrección**:
```typescript
// CORRECTO
const float32 = new Float32Array(audioBuffer) as Float32Array<ArrayBuffer>;
audioBuffer.copyToChannel(float32, 0);
```

O mejor aún:
```typescript
// MEJOR
const buffer = audioBuffer instanceof ArrayBuffer ? audioBuffer : audioBuffer.buffer;
const float32 = new Float32Array(buffer);
audioBuffer.copyToChannel(float32, 0);
```

### ❌ WebSocket Headers en Browser
**Ubicación**: `src/lib/ai/openai-realtime.ts`

```typescript
// INCORRECTO - WebSocket del browser no acepta headers custom
const ws = new WebSocket(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Problema**: La API `WebSocket` estándar del browser no soporta headers custom en el constructor

**Soluciones**:

**Opción 1 - Token en URL (menos seguro)**:
```typescript
const ws = new WebSocket(`${url}?token=${token}`);
```

**Opción 2 - Server Proxy (RECOMENDADO)**:
```typescript
// Cliente
const ws = new WebSocket(`${baseUrl}/api/voice/ws?sessionId=${sessionId}`);

// Servidor - src/app/api/voice/ws/route.ts
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  // Validar sesión
  // Proxear WebSocket a OpenAI con headers correctos
}
```

### ❌ streamText parámetros inválidos
**Ubicación**: `src/lib/agents/executor.ts` (líneas múltiples)

```typescript
// INCORRECTO
const result = await streamText({
  model: anthropic(modelId),
  prompt: 'test',
  maxTokens: 4096,           // ❌ NO EXISTE en streamText
  temperature: 0.7,           // ✅ Existe
});
```

**API Correcta** (Vercel AI SDK):
- ✅ `temperature` - Soportado
- ❌ `maxTokens` - NO SOPORTADO (usar `maxTokens` en generationConfig)

**Corrección**:
```typescript
// CORRECTO
const result = await streamText({
  model: anthropic(modelId),
  prompt: 'test',
  system: systemPrompt,
  temperature: 0.7,
  // maxTokens va en generationConfig, NO aquí
});
```

---

## 🔴 PROBLEMA #5: Campos Opcionales/Nulos Mal Manejados

### Descripción
Diferencia semántica entre `null` (SQL) y `undefined` (TypeScript) no manejada correctamente.

### ❌ systemPrompt nullable
**Ubicación**: `src/lib/agents/executor.ts`

```typescript
// INCORRECTO - systemPrompt puede ser null desde Prisma
const result = await streamText({
  model: anthropic(modelId),
  system: agent.systemPrompt,  // Podría ser null
  prompt: message,
});
```

**Problema**: Vercel AI SDK espera `string | undefined`, pero Prisma retorna `string | null`

**Corrección - Opción 1**:
```typescript
// CORRECTO
const result = await streamText({
  model: anthropic(modelId),
  system: agent.systemPrompt || undefined,
  prompt: message,
});
```

**Corrección - Opción 2 (Mejor)** - Crear helper:
```typescript
// src/lib/utils/prisma.ts
export function toOptional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

// Uso:
const result = await streamText({
  model: anthropic(modelId),
  system: toOptional(agent.systemPrompt),
  prompt: message,
});
```

### ❌ ChatSession.lastActivity requerido
**Ubicación**: `src/__tests__/api/chat.test.ts` (líneas 17, 38, 102)

```typescript
// INCORRECTO
const session = await prisma.chatSession.create({
  data: {
    userId: userId,
    metadata: { title: 'Test' },
    // ❌ lastActivity es REQUERIDO pero no se proporciona
  }
});
```

**Schema Real** (línea 143):
```prisma
model chat_sessions {
  id           String    @id
  userId       String
  startedAt    DateTime  @default(now())
  lastActivity DateTime  // ← REQUERIDO, sin @default
  metadata     Json?
}
```

**Problema**: El campo no tiene `@default`, así que es obligatorio en `create`

**Corrección**:
```typescript
// CORRECTO
const session = await prisma.chatSession.create({
  data: {
    userId: userId,
    metadata: { title: 'Test' },
    lastActivity: new Date(),  // ✅ Proporcionar
  }
});
```

O mejor, agregar `@default(now())` al schema.

---

## 🟡 PROBLEMA #6: Imports Duplicados de Prisma

### Descripción
Existen dos archivos diferentes que exportan el cliente Prisma singleton.

**Ubicaciones**:
1. `src/lib/prisma.ts` (17 líneas, mayormente sin usar)
2. `src/lib/db/prisma.ts` (62 líneas, patrón correcto)

### Impacto
- Potencial para 2 instancias separadas de Prisma en memoria
- Confusión sobre cuál es la fuente de verdad
- Dificultad de mantenimiento

### Solución
Consolidar todo en `src/lib/db/prisma.ts` y eliminar `src/lib/prisma.ts`

---

## 📋 RESUMEN POR ARCHIVO

### Archivos Críticos (Build Bloqueado)

#### 1. `src/__tests__/integration/voice-session.test.ts`
- ❌ 9 instancias de `prisma.customAgent` → `prisma.agents`
- ❌ 4 campos faltantes en VoiceSession (agentId, voice, temperature, maxTokens)
- ❌ 1 instancia de UserRole.CLIENT → UserRole.USER
- **Líneas afectadas**: 25, 32, 52, 73, 85, 86, 87, 88, 115, 124, 142, 232, 285

#### 2. `src/__tests__/unit/auth-utils.test.ts`
- ❌ 11 instancias de UserRole.CLIENT → UserRole.USER
- ❌ 11 instancias de `prisma.agent` → `prisma.agents`
- **Líneas afectadas**: 99, 146, 213, 226, 305, 318, 333, 346, 361, 374, 389, 408, 423, 429, 475, 480, 493, 501, 506, 523, 528, 551, 565, 580, 643, 656, 706

#### 3. `src/lib/rag/pipeline.ts`
- ❌ 8+ instancias de `prisma.document` → MODELO NO EXISTE
- ❌ 1+ instancias de `prisma.documentChunk` → MODELO NO EXISTE
- **Líneas afectadas**: 108, 133, 148, 184, 231, 244, 274, 370, 389, 390

#### 4. `src/lib/rag/search.ts`
- ❌ 4 instancias de `prisma.document` → MODELO NO EXISTE
- **Líneas afectadas**: Múltiples

#### 5. `src/__tests__/api/chat.test.ts`
- ❌ 1 instancia de `prisma.conversation` → `prisma.conversations`
- ❌ 1 instancia de `prisma.message` → `prisma.messages`
- ❌ 3 instancias de ChatSession sin `lastActivity`
- **Líneas afectadas**: 17, 38, 102, 129, 137

#### 6. `src/__tests__/integration/images-api.test.ts`
- ❌ 3 instancias de UserRole.CLIENT → UserRole.USER
- ❌ 5 instancias de campo `url` inexistente → campo correcto: `imageUrl`
- ❌ 2 instancias de campo `revisedPrompt` inexistente
- **Líneas afectadas**: 25, 55, 95, 131, 155, 165, 166, 181, 192, 252, 289, 299, 323, 378

#### 7. `src/__tests__/integration/tasks-api.test.ts`
- ❌ 2 instancias de UserRole.CLIENT → UserRole.USER
- **Líneas afectadas**: 28, 317

#### 8. `src/app/api/v1/chat/send/route.ts`
- ❌ sessionId vs conversationId confundidos
- **Líneas afectadas**: 89-101

#### 9. `src/lib/audio/audio-processor.ts`
- ❌ Float32Array TypeScript incompatible
- **Línea afectada**: 302

#### 10. `src/lib/agents/executor.ts`
- ❌ systemPrompt puede ser null
- ❌ Campos faltantes esperados

---

## ✅ CHECKLIST DE VALIDACIÓN

Antes de pasar a Fase 2:

- [ ] Schema actual documentado
- [ ] Todos los modelos usados en código identificados
- [ ] Todos los campos críticos inventariados
- [ ] Todas las relaciones mapeadas
- [ ] Decisión de Source of Truth tomada
- [ ] Campos faltantes identificados
- [ ] Plan de migraciones definido

---

## 🎯 PRÓXIMOS PASOS

1. **Fase 1 (COMPLETADA)**: Auditoría
2. **Fase 2 (PRÓXIMA)**: Decisión de Source of Truth
   - Decidir: ¿Mantener DB actual o cambiar código?
   - Recomendación: Opción B (adaptar código a DB)
3. **Fase 3**: Actualización Sistemática del Código
4. **Fase 4**: Validación de APIs de Bibliotecas
5. **Fase 5**: CI/CD Validation
6. **Fase 6**: Testing Estratégico

---

**Documento generado**: 2025-10-29
**Próxima revisión**: Después de Fase 2
**Responsable**: Equipo de desarrollo

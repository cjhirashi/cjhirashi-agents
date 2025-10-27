# Plan de Revisión Arquitectural - Problemas Estructurales

**Fecha**: 2025-10-27
**Estado**: CRÍTICO - Requiere revisión antes de deployment
**Responsable**: Equipo de desarrollo

---

## 🚨 Resumen Ejecutivo

Durante la preparación del build de producción, se identificaron **~100+ errores de TypeScript** que revelan problemas estructurales fundamentales en el diseño del sistema. Estos errores no son bugs aislados, sino **síntomas de inconsistencias arquitecturales** que deben resolverse desde la raíz.

### Impacto
- ❌ **Build de producción bloqueado**
- ⚠️ **Riesgo de bugs en runtime** si se hacen parches superficiales
- 🔴 **Deuda técnica significativa** acumulada
- 📉 **Mantenibilidad comprometida**

---

## 📊 Categorías de Problemas Identificados

### 1. **CRÍTICO: Inconsistencia Prisma Schema ↔ Código**

#### Problema
El schema Prisma no coincide con lo que el código TypeScript espera. Esto sugiere que hubo cambios en la base de datos que no se reflejaron en el código, o viceversa.

#### Evidencia
```typescript
// ❌ Código espera:
prisma.customAgent.findUnique()
// ✅ Schema real:
prisma.agents.findUnique()

// ❌ Código espera:
prisma.chatMessage.create()
// ✅ Schema real:
prisma.messages.create()

// ❌ Código espera campo:
user.tier
// ✅ Schema real:
user.subscriptionTier

// ❌ Código espera relación directa:
ChatSession → messages
// ✅ Schema real:
ChatSession → conversations → messages
```

#### Archivos Afectados
- `src/app/api/v1/chat/**/*.ts` (10+ archivos)
- `src/app/api/v1/agents/**/*.ts` (5+ archivos)
- `src/lib/agents/executor.ts`
- `src/app/dashboard/page.tsx`

#### Causa Raíz
1. **No hay source of truth** - El schema fue sobrescrito con `prisma db pull` sin actualizar el código
2. **Falta de types generados** - No se regeneraron los tipos de Prisma después del pull
3. **Sin validación continua** - No hay CI que valide schema ↔ código

---

### 2. **ALTO: APIs de Biblioteca Incompatibles**

#### Problema
Se usan APIs de bibliotecas externas con tipos/parámetros que no existen o cambiaron.

#### Evidencia
```typescript
// ❌ WebSocket no acepta headers en browser
new WebSocket(url, { headers: {...} })

// ❌ streamText no acepta maxTokens
await streamText({ maxTokens: 4096 })

// ❌ Float32Array con ArrayBufferLike vs ArrayBuffer
audioBuffer.copyToChannel(float32, 0)

// ❌ ApiError espera Record, no string
new ApiError('msg', 500, 'CODE', 'string')

// ❌ createRoutingContext no acepta modelPreference
createRoutingContext({ modelPreference: 'gpt-4' })
```

#### Archivos Afectados
- `src/lib/ai/openai-realtime.ts` (WebSocket)
- `src/lib/agents/executor.ts` (streamText, ApiError)
- `src/lib/audio/audio-processor.ts` (AudioBuffer)
- `src/lib/ai/router.ts` (RoutingContext)

#### Causa Raíz
1. **Documentación desactualizada** - Se implementó basándose en docs viejas
2. **Sin tests de integración** - No se validaron las integraciones reales
3. **Actualizaciones de paquetes** - Las APIs cambiaron entre versiones

---

### 3. **MEDIO: Validación Zod Inconsistente**

#### Problema
Se usa una API de Zod que fue deprecada o cambiada.

#### Evidencia
```typescript
// ❌ API vieja
error.errors.forEach()

// ✅ API correcta
error.issues.forEach()
```

#### Archivos Afectados
- `src/components/admin/UserCreateDialog.tsx`
- `src/components/admin/UserEditDialog.tsx`
- `src/app/api/v1/**/*.ts` (múltiples)

#### Causa Raíz
1. **Actualización de Zod** sin actualizar código
2. **Copiar/pegar código** sin validar APIs actuales
3. **Sin linting para deprecations**

---

### 4. **MEDIO: Campos Opcionales/Nulos Mal Manejados**

#### Problema
Campos que son `string | null` en Prisma se pasan a funciones que esperan `string | undefined`.

#### Evidencia
```typescript
// ❌ systemPrompt es string | null
system: agent.systemPrompt

// ✅ Corrección necesaria
system: agent.systemPrompt || undefined
```

#### Archivos Afectados
- `src/lib/agents/executor.ts`
- `src/app/api/v1/voice/session/route.ts`

#### Causa Raíz
1. **Diferencia semántica** entre `null` (SQL) y `undefined` (TypeScript)
2. **Sin utility types** para conversión automática
3. **Falta de strictNullChecks** en tsconfig

---

## 🎯 Plan de Acción Estructural

### **Fase 1: Auditoría y Documentación** (Prioridad: URGENTE)

#### Objetivo
Entender el estado real del sistema antes de hacer cambios.

#### Tareas
1. **Generar snapshot del schema actual**
   ```bash
   npx prisma db pull --force
   npx prisma generate
   ```

2. **Documentar modelos esperados vs reales**
   - Crear tabla comparativa: Código → Prisma
   - Identificar todos los nombres de modelos usados en código
   - Mapear a nombres reales en schema

3. **Inventario de campos faltantes**
   - `agents.tier` (esperado, no existe)
   - `agents.complexity` (esperado, no existe)
   - `agents.instructions` (esperado, no existe)
   - `VoiceSession.agentId` (esperado, no existe)

4. **Análisis de relaciones**
   - Documentar todas las relaciones esperadas vs reales
   - Identificar navegaciones incorrectas

**Entregable**: `SCHEMA-AUDIT.md` con mapeo completo

---

### **Fase 2: Decisión de Source of Truth** (Prioridad: CRÍTICO)

#### Pregunta Clave
¿Cuál es la fuente de verdad?
- **Opción A**: El código está correcto → Modificar schema/migraciones
- **Opción B**: La base de datos está correcta → Modificar código
- **Opción C**: Híbrido → Evaluar caso por caso

#### Recomendación
**Opción B + Extensión del Schema** porque:
1. La base de datos en producción ya tiene datos
2. Cambiar nombres de tablas requiere migraciones complejas
3. Es más seguro adaptar código que reestructurar DB

#### Acciones
1. **Mantener nombres actuales de modelos**
   - `agents` (no `customAgent`)
   - `messages` (no `chatMessage`)

2. **Agregar campos faltantes al schema**
   ```prisma
   model agents {
     // ... campos existentes
     tier         String?  // Para routing
     complexity   String?  // Para clasificación
     instructions String?  @db.Text  // Para voice chat
   }
   ```

3. **Crear migration para campos nuevos**
   ```bash
   npx prisma migrate dev --name add_missing_agent_fields
   ```

**Entregable**: Schema actualizado + migración aplicada

---

### **Fase 3: Actualización Sistemática del Código** (Prioridad: ALTA)

#### Estrategia
Cambios en **un solo commit atómico** para evitar estados inconsistentes.

#### Tareas

**3.1 Actualizar Referencias a Modelos**
```bash
# Script de reemplazo masivo (verificar antes de aplicar)
find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  -e 's/prisma\.customAgent/prisma.agents/g' \
  -e 's/prisma\.chatMessage/prisma.messages/g'
```

**3.2 Actualizar Referencias a Campos**
- Crear helper function para conversión `null → undefined`
  ```typescript
  // src/lib/utils/prisma.ts
  export function toOptional<T>(value: T | null): T | undefined {
    return value === null ? undefined : value;
  }
  ```

- Aplicar en todos los casos problemáticos:
  ```typescript
  system: toOptional(agent.systemPrompt)
  ```

**3.3 Corregir Relaciones**
- Actualizar todas las queries con includes incorrectos
- Usar el patrón correcto:
  ```typescript
  include: {
    conversations: {
      include: {
        messages: { orderBy: { timestamp: 'asc' } }
      }
    }
  }
  ```

**3.4 Actualizar Validaciones Zod**
```bash
# Reemplazar error.errors → error.issues
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  's/error\.errors/error.issues/g' {} +
```

**Entregable**: PR con cambios validados + tests pasando

---

### **Fase 4: Validación de APIs de Bibliotecas** (Prioridad: MEDIA)

#### Tareas

**4.1 Revisar Documentación Oficial**
- `ai` SDK (Vercel AI SDK): Verificar parámetros de `streamText`
- `ws` vs `WebSocket`: Determinar cuál usar (Node vs Browser)
- `zod`: Confirmar API actual

**4.2 Crear Abstracciones**
Para evitar acoplamiento directo a APIs que pueden cambiar:

```typescript
// src/lib/ai/streaming.ts
export async function streamLLM(config: StreamConfig) {
  // Wrapper que maneja diferencias de API
  const validParams = {
    model: config.model,
    system: config.system,
    prompt: config.prompt,
    temperature: config.temperature,
    // NO incluir parámetros no soportados
  };

  return streamText(validParams);
}
```

**4.3 WebSocket Strategy**
Decidir entre:
- **Client-side**: Usar WebSocket nativo (sin headers custom)
- **Server-side**: Usar biblioteca `ws` (soporta headers)
- **Proxy**: Backend endpoint que maneja auth y proxy a OpenAI

**Recomendación**: Proxy pattern para mayor seguridad

**Entregable**: Wrappers validados + documentación de uso

---

### **Fase 5: Configuración de Validación Continua** (Prioridad: ALTA)

#### Objetivo
Prevenir regresiones futuras.

#### Tareas

**5.1 CI Pipeline**
```yaml
# .github/workflows/validation.yml
name: Schema Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

**5.2 Pre-commit Hook**
```bash
# .husky/pre-commit
#!/bin/sh
npx prisma generate
npx tsc --noEmit
```

**5.3 Schema Drift Detection**
Script que compara schema con código:
```typescript
// scripts/check-schema-drift.ts
// Valida que todos los modelos usados en código existen en schema
```

**Entregable**: CI configurado + hooks instalados

---

### **Fase 6: Testing Estratégico** (Prioridad: MEDIA)

#### Objetivo
Validar que las correcciones funcionan en runtime.

#### Tareas

**6.1 Tests de Integración de Schema**
```typescript
// src/__tests__/integration/schema-validation.test.ts
describe('Prisma Schema Consistency', () => {
  it('should create agent with all fields', async () => {
    const agent = await prisma.agents.create({
      data: {
        name: 'Test',
        createdBy: userId,
        // Validar todos los campos críticos
      }
    });
    expect(agent).toBeDefined();
  });

  it('should navigate ChatSession → conversations → messages', async () => {
    const session = await prisma.chatSession.findFirst({
      include: {
        conversations: {
          include: { messages: true }
          }
        }
    });
    expect(session.conversations).toBeDefined();
  });
});
```

**6.2 Tests de API de Bibliotecas**
```typescript
// src/__tests__/integration/llm-streaming.test.ts
describe('LLM Streaming', () => {
  it('should stream with valid parameters only', async () => {
    const result = await streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt: 'test',
      temperature: 0.7,
      // NO incluir maxTokens u otros parámetros inválidos
    });

    let chunks = 0;
    for await (const chunk of result.textStream) {
      chunks++;
    }
    expect(chunks).toBeGreaterThan(0);
  });
});
```

**Entregable**: Suite de tests que valida integraciones críticas

---

## 📋 Checklist de Validación Final

Antes de considerar el trabajo completo:

### Schema & Database
- [ ] `npx prisma generate` ejecuta sin errores
- [ ] `npx prisma migrate deploy` ejecuta sin errores
- [ ] Todos los modelos usados en código existen en schema
- [ ] Todos los campos críticos existen en schema
- [ ] Relaciones navegables correctamente

### Código TypeScript
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] `npm run lint` pasa sin errores críticos
- [ ] `npm run build` completa exitosamente
- [ ] No hay `@ts-ignore` agregados

### Tests
- [ ] Tests unitarios pasan: `npm run test:unit`
- [ ] Tests de integración pasan: `npm run test:integration`
- [ ] Tests e2e críticos pasan: `npm run test:e2e`

### Runtime
- [ ] App arranca sin errores: `npm run dev`
- [ ] Endpoints críticos responden correctamente
- [ ] No hay errores en console del navegador

---

## 🔄 Cronograma Sugerido

| Fase | Duración | Dependencias | Bloqueante para Deploy |
|------|----------|--------------|------------------------|
| Fase 1: Auditoría | 4-6 horas | Ninguna | ✅ SÍ |
| Fase 2: Source of Truth | 2-3 horas | Fase 1 | ✅ SÍ |
| Fase 3: Actualización Código | 8-12 horas | Fase 2 | ✅ SÍ |
| Fase 4: APIs Bibliotecas | 4-6 horas | Fase 3 | ✅ SÍ |
| Fase 5: CI/CD | 3-4 horas | Fase 3 | ⚠️ Recomendado |
| Fase 6: Testing | 6-8 horas | Fase 4 | ⚠️ Recomendado |

**Total Crítico**: ~18-24 horas
**Total Completo**: ~27-39 horas

---

## 🚀 Estrategia de Ejecución Inmediata

### Opción A: Fix Rápido para Desbloquear (2-3 horas)
**Solo si hay presión urgente de deploy**

1. Completar parches superficiales actuales
2. Agregar `// @ts-ignore` donde sea necesario
3. Deploy con monitoreo intensivo
4. **Ejecutar plan completo en paralelo**

⚠️ **Riesgos**:
- Bugs en producción
- Deuda técnica aumenta
- Dificulta debugging futuro

### Opción B: Hacer las Cosas Bien (Recomendado)
**Invertir 1-2 días ahora para ahorrar semanas después**

1. Ejecutar Fases 1-4 completas
2. Deploy con confianza
3. Fases 5-6 en sprint siguiente

✅ **Beneficios**:
- Sistema robusto
- Mantenibilidad mejorada
- Menos bugs en producción

---

## 📝 Próximos Pasos Inmediatos

1. **Decisión de Management**: ¿Opción A o B?
2. **Si Opción B** (recomendado):
   - Asignar desarrollador senior a Fase 1
   - Revisar resultados de auditoría
   - Tomar decisión informada sobre source of truth
   - Proceder con Fases 2-4
3. **Si Opción A** (emergencia):
   - Completar parches
   - Documentar todos los `@ts-ignore`
   - Crear issues para cada uno
   - Planificar sprint de refactor

---

## 📚 Referencias

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Zod API](https://zod.dev/)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)

---

**Última actualización**: 2025-10-27
**Revisar antes de**: Antes de siguiente deploy

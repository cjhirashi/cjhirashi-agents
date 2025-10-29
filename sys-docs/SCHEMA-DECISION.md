# Schema Decision Report - CJHIRASHI Agents

**Fecha**: 2025-10-29
**Estado**: 🟢 DECISION TOMADA
**Opción Seleccionada**: **Opción B - Mantener DB, Adaptar Código**
**Justificación**: Basada en análisis de riesgos y viabilidad

---

## 📊 ANÁLISIS DE OPCIONES

### Opción A: El Código Está Correcto, Modificar DB
**Descripción**: Cambiar los nombres de tablas/campos en el schema para que coincidan con lo que espera el código.

**Ventajas**:
- ✅ El código ya está "correcto" conceptualmente
- ✅ Menos cambios en lógica de aplicación

**Desventajas**:
- ❌ Base de datos en producción ya tiene datos
- ❌ Requiere migraciones complejas (renombrar tablas)
- ❌ Riesgo alto de pérdida de datos
- ❌ Downtime significativo durante migración
- ❌ Código antiguo usa nombres del schema actual (incompatibilidad)
- ❌ ~50+ cambios en código histórico necesarios

**Tiempo estimado**: 3-4 días + riesgo

**Viabilidad**: ⚠️ BAJA (riesgo de producción)

---

### Opción B: La BD Está Correcta, Adaptar Código ✅ SELECCIONADA
**Descripción**: Mantener el schema y los datos actuales, actualizar todo el código TypeScript para usar los nombres correctos.

**Ventajas**:
- ✅ NO requiere migraciones complejas
- ✅ Cero riesgo para datos en producción
- ✅ Cambios localizados en código
- ✅ Puedo usar sed/regex para cambios masivos
- ✅ Cambios atómicos en un commit
- ✅ Fácil rollback si es necesario

**Desventajas**:
- ❌ Más cambios en código (~143 errores)
- ❌ Requiere actualizar tests

**Tiempo estimado**: 1-2 días

**Viabilidad**: ✅ ALTA (seguro, rápido)

---

### Opción C: Híbrido
**Descripción**: Evaluar caso por caso qué mantener en DB vs cambiar en código.

**Ventajas**:
- ✅ Flexibilidad

**Desventajas**:
- ❌ Decisiones ad-hoc = inconsistencia
- ❌ Deuda técnica mayor
- ❌ Difícil de mantener
- ❌ Mayor complejidad

**Viabilidad**: ⚠️ MEDIA (no recomendado)

---

## 🎯 DECISIÓN FINAL: OPCIÓN B

### Razones Principales

1. **Seguridad de Datos**: BD en producción no debe ser modificada sin necesidad
2. **Riesgo Bajo**: Cambios solo en código = fácil de revertir
3. **Tiempo**: La Opción B es más rápida (1-2 días vs 3-4 días)
4. **Consistencia**: Un solo schema de verdad = menos confusión

### Confirmación de Autoridad

| Aspecto | Decisión |
|--------|----------|
| **Schema es la fuente de verdad** | ✅ SÍ |
| **Código debe adaptarse** | ✅ SÍ |
| **DB se mantiene sin cambios** | ✅ SÍ |
| **Migraciones Prisma necesarias** | ⚠️ Opcionales (solo campos faltantes) |

---

## 📝 PLAN DE IMPLEMENTACIÓN

### Fase 1: Identificar Cambios Necesarios ✅ COMPLETADA

**Conclusiones del Schema Audit**:
- 143 errores TypeScript
- 25+ referencias de modelos incorrectos
- 17+ valores enum inválidos
- 18+ campos faltantes o nombrados incorrectamente

### Fase 2: Ejecutar Cambios Sistemáticos

**Paso 2.1**: Reemplazar nombres de modelos (sed scripts)
```bash
# customAgent → agents
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  's/prisma\.customAgent/prisma.agents/g' {} +

# document → (campos a definir)
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  's/prisma\.document\./prisma.documents./g' {} +
```

**Paso 2.2**: Reemplazar nombres de campos
```bash
# CLIENT → USER
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s/UserRole\.CLIENT/UserRole.USER/g; s/'CLIENT'/'USER'/g" {} +

# sessionId → conversationId (manual, requiere contexto)
```

**Paso 2.3**: Crear helpers para null/undefined
```typescript
// src/lib/utils/prisma.ts
export function toOptional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}
```

**Paso 2.4**: Validar build
```bash
npx tsc --noEmit && npm run lint
```

### Fase 3: Agregar Campos Faltantes al Schema

**Campos identificados como necesarios**:

#### Para `agents` table:
```prisma
model agents {
  // ... campos existentes

  // Campos para voice/generation
  instructions    String?       @db.Text    // Para voice chat
  complexity      String?                   // Para clasificación
  tier            String?                   // Para tier validation
  capabilities    Json?                     // Para routing

  // Timestamps (si faltan)
  updatedAt       DateTime                  // Para tracking cambios
}
```

#### Para `voice_sessions` table:
```prisma
model voice_sessions {
  // ... campos existentes

  // Campos para configuración de voz
  agentId        String?
  voice          String?       // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
  temperature    Float?        // 0.0-2.0
  maxTokens      Int?          // Límite de tokens

  // Relación
  agents         agents?       @relation(fields: [agentId], references: [id], onDelete: SetNull)
}
```

#### Para `generated_images` table:
```prisma
model generated_images {
  // ... campos existentes

  // Campos faltantes
  revisedPrompt  String?       // Prompt revisado por OpenAI

  // Relación a usuario
  users          users         @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Fase 4: Crear Modelos Faltantes

#### `documents` table (para RAG):
```prisma
model documents {
  id                String                @id @default(cuid())
  userId            String
  filename          String
  fileType          String                // pdf, txt, md
  fileSize          BigInt
  status            DocumentStatus        @default(PENDING)
  contentType       DocumentContentType   @default(PDF)
  uploadedAt        DateTime              @default(now())
  processingStarted DateTime?
  processingEnded   DateTime?
  totalChunks       Int                   @default(0)
  totalTokens       Int                   @default(0)
  vectorIndex       String?               // Referencia en Pinecone
  metadata          Json?
  errorMessage      String?

  users             users                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  document_chunks   document_chunks[]

  @@index([userId])
  @@index([status])
  @@index([uploadedAt])
}

model document_chunks {
  id                String                @id @default(cuid())
  documentId        String
  chunkIndex        Int                   // 0-based
  content           String                @db.Text
  tokenCount        Int
  embedding         Float[]               // Almacenar vector embedding
  metadata          Json?
  createdAt         DateTime              @default(now())

  documents         documents             @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
  @@index([chunkIndex])
}

enum DocumentStatus {
  PENDING
  PROCESSING
  READY
  FAILED
}

enum DocumentContentType {
  PDF
  TEXT
  MARKDOWN
}
```

### Paso 5: Crear Migration
```bash
npx prisma migrate dev --name add_missing_schema_fields

# O si solo es db push (sin migration):
npx prisma db push
```

### Paso 6: Regenerar Cliente Prisma
```bash
npx prisma generate
```

---

## 🔄 DETALLES DE CAMBIOS

### Cambios de Nombres de Modelos

| Código Actual | Schema Real | Acción |
|---------------|-------------|--------|
| `prisma.customAgent` | `prisma.agents` | Reemplazar |
| `prisma.document` | ❌ NO EXISTE | Crear modelo |
| `prisma.documentChunk` | ❌ NO EXISTE | Crear modelo |
| `prisma.conversation` | `prisma.conversations` | Reemplazar (singular) |
| `prisma.message` | `prisma.messages` | Reemplazar (singular) |
| `prisma.chatMessage` | `prisma.messages` | Reemplazar |

### Cambios de Campos

| Campo Incorrecto | Campo Correcto | Modelos | Acción |
|------------------|----------------|---------|--------|
| `user.tier` | `user.subscriptionTier` | users | Reemplazar |
| `session.conversation` | `session.conversations[]` | chat_sessions | Reemplazar |
| ❌ `url` | `imageUrl` | generated_images | Reemplazar |
| ❌ `revisedPrompt` | Agregar campo | generated_images | Agregar a schema |
| ❌ `agentId` | Agregar campo | voice_sessions | Agregar a schema |
| ❌ `voice` | Agregar campo | voice_sessions | Agregar a schema |
| ❌ `temperature` | Agregar campo | voice_sessions | Agregar a schema |
| ❌ `maxTokens` | Agregar campo | voice_sessions | Agregar a schema |
| ❌ `instructions` | Agregar campo | agents | Agregar a schema |
| ❌ `complexity` | Agregar campo | agents | Agregar a schema |
| ❌ `tier` | Agregar campo | agents | Agregar a schema |

### Cambios de Enums

| Valor Incorrecto | Valor Correcto | Enum | Acción |
|-----------------|----------------|------|--------|
| `CLIENT` | `USER` | UserRole | Reemplazar |

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Pre-Cambios
- [ ] Documentación de cambios completada
- [ ] Scripts de sed preparados
- [ ] Rama de git creada: `fix/architectural-review-phase8`
- [ ] Backup del estado actual

### Cambios de Código
- [ ] Ejecutar sed scripts para nombres de modelos
- [ ] Ejecutar sed scripts para enum values
- [ ] Reemplazar manualmente sessionId → conversationId
- [ ] Crear helpers toOptional()
- [ ] Corregir navegación de relaciones

### Cambios de Schema
- [ ] Agregar campos faltantes a modelos existentes
- [ ] Crear nuevos modelos (documents, document_chunks)
- [ ] Crear nuevos enums (DocumentStatus, DocumentContentType)
- [ ] Crear migration: `npx prisma migrate dev`
- [ ] Ejecutar: `npx prisma generate`

### Validación
- [ ] `npx tsc --noEmit` sin errores
- [ ] `npm run lint` sin errores críticos
- [ ] `npm run build` exitoso
- [ ] Tests pasando: `npm run test:unit`
- [ ] `npm run dev` arranca sin errores
- [ ] Endpoints funcionan: `npm run test:integration`

### Documentación
- [ ] Actualizar CLAUDE.md si es necesario
- [ ] Commit con mensaje descriptivo
- [ ] Crear PR para revisión

---

## 🚀 IMPACTO EN DESARROLLO

### Código Afectado
- **143 errores TypeScript** → 0
- **25+ referencias de modelos** → Actualizadas
- **17+ valores enum** → Correcciones
- **10 archivos críticos** → Reparados

### Estimado de Tiempo
- **Fase 2 (Source of Truth)**: Completada ✅
- **Fase 3 (Actualización Código)**: 4-6 horas
- **Fase 4 (Validación APIs)**: 4-6 horas
- **Fase 5 (CI/CD)**: 3-4 horas
- **Fase 6 (Testing)**: 6-8 horas
- **TOTAL**: 18-27 horas

---

## ⚠️ RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|--------|-----------|
| Relaciones mal navegadas | MEDIA | ALTO | Tests exhaustivos |
| Null/undefined inconsistencia | MEDIA | MEDIO | Helper toOptional() |
| Rollback necesario | BAJA | BAJO | Git branch, tests |
| Datos en DB corrompidos | MUY BAJA | MUY ALTO | Solo cambios de código |

---

## 📌 NOTAS FINALES

Esta decisión es **FINAL** y será la guía para todo el trabajo de Fase 3 adelante.

- **No habrá cambios en la DB** (solo campos opcionales nuevos)
- **Todos los cambios serán en código TypeScript**
- **Un solo commit atómico** al final de Fase 3
- **Validación exhaustiva** antes de merge

---

**Documento autorizado**: 2025-10-29
**Próximo paso**: Iniciar Fase 3 - Actualización Sistemática del Código
**Responsable**: Equipo de Desarrollo

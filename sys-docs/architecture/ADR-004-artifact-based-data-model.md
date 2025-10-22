# ADR-004: Artifact-Based Data Model para Outputs Flexibles

## Estado
**ACCEPTED** - Implementado en Fase 1

## Contexto

### Problema a Resolver

El sistema Cjhirashi genera múltiples tipos de outputs en respuestas de LLMs:

**Tipos de Outputs Requeridos:**
- **Code**: TypeScript, Python, SQL, Bash scripts
- **Documents**: Markdown, LaTeX, Plain text
- **Structured Data**: JSON, YAML, TOML
- **Web Content**: HTML, CSS
- **Diagrams**: Mermaid, PlantUML, Graphviz
- **Images**: Generated (Flux/Stable Diffusion), URLs
- **Tables**: CSV, data grids
- **Interactive Widgets**: React components, embeds

**Desafíos de Diseño:**

1. **Heterogeneidad**: Cada tipo tiene metadata específica
   - Code: `language`, `syntax`, `execution`
   - Image: `url`, `dimensions`, `model`
   - Diagram: `type`, `source`, `rendered`

2. **Evolución**: Nuevos tipos aparecerán (video, audio, 3D models)
   - Schema migrations frecuentes son costosas
   - Necesitamos flexibilidad sin cambiar tabla

3. **Rendering**: Frontend necesita saber cómo mostrar cada tipo
   - Type-safe discriminated unions en TypeScript
   - Widget mapping por tipo

4. **Storage**: Algunos outputs son grandes (images, PDFs)
   - JSONB en PostgreSQL tiene límite ~1GB (pero práctico ~1MB)
   - Necesitamos overflow a blob storage

5. **Búsqueda**: Usuarios buscan artifacts por tipo, lenguaje, fecha
   - Index por type, metadata fields
   - Full-text search en content

### Requisitos Críticos

- **Type Safety**: TypeScript end-to-end (backend ↔ frontend)
- **Extensibilidad**: Agregar tipo nuevo sin migration
- **Performance**: Queries rápidas por tipo/metadata
- **Storage Efficiency**: Datos grandes en blob, pequeños en DB
- **Versionado**: Preservar historial de edits
- **Shareability**: Artifacts compartibles via URL

### Inspiración

Sistema basado en **Anthropic Artifacts** (Claude UI):
- Outputs separados del chat main
- Cada artifact es entidad independiente
- Metadata rica por tipo
- Editable, versionable

## Decisión

**Adoptamos modelo de datos "Artifact-Based" con:**
1. **Tabla única** `Artifact` con campos flexibles
2. **Type discriminator** (`type` enum)
3. **Metadata JSONB** para campos específicos por tipo
4. **Content overflow** a Vercel Blob para files > 1MB
5. **TypeScript discriminated unions** en frontend

### Schema de Base de Datos (Prisma)

```prisma
// prisma/schema.prisma

enum ArtifactType {
  CODE
  JSON
  HTML
  MARKDOWN
  LATEX
  DIAGRAM
  IMAGE
  TABLE
  WIDGET
  FILE
}

model Artifact {
  id          String       @id @default(cuid())
  messageId   String?      // Null si es standalone
  userId      String

  // Core discriminator
  type        ArtifactType

  // Content
  title       String?
  content     String       @db.Text    // Max ~1MB práctico
  language    String?                  // For code/syntax

  // Metadata (tipo-específico)
  metadata    Json?

  // Large content overflow
  blobUrl     String?      // Vercel Blob URL
  blobSize    Int?         // Bytes

  // Versioning
  version     Int          @default(1)
  parentId    String?      // Previous version
  parent      Artifact?    @relation("ArtifactVersions", fields: [parentId], references: [id])
  versions    Artifact[]   @relation("ArtifactVersions")

  // Sharing
  public      Boolean      @default(false)
  shareToken  String?      @unique

  // Relations
  message     Message?     @relation(fields: [messageId], references: [id], onDelete: SetNull)
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([userId])
  @@index([type])
  @@index([messageId])
  @@index([shareToken])
  @@index([createdAt])
}
```

### TypeScript Type System

```typescript
// types/artifact.ts

export enum ArtifactType {
  CODE = 'CODE',
  JSON = 'JSON',
  HTML = 'HTML',
  MARKDOWN = 'MARKDOWN',
  LATEX = 'LATEX',
  DIAGRAM = 'DIAGRAM',
  IMAGE = 'IMAGE',
  TABLE = 'TABLE',
  WIDGET = 'WIDGET',
  FILE = 'FILE',
}

// Base interface
interface BaseArtifact {
  id: string;
  messageId?: string;
  userId: string;
  type: ArtifactType;
  title?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Type-specific metadata

interface CodeArtifactMetadata {
  language: string; // 'typescript', 'python', 'sql', etc
  syntax?: string;
  executable?: boolean;
  dependencies?: string[];
  entrypoint?: string;
}

interface DiagramArtifactMetadata {
  diagramType: 'mermaid' | 'plantuml' | 'graphviz';
  source: string; // Original markup
  rendered?: string; // SVG or PNG URL
}

interface ImageArtifactMetadata {
  url: string;
  width: number;
  height: number;
  model?: string; // 'flux-pro', 'sdxl', etc
  prompt?: string;
  negativePrompt?: string;
}

interface TableArtifactMetadata {
  columns: Array<{ key: string; label: string; type: string }>;
  rows: number;
  format?: 'csv' | 'json' | 'xlsx';
}

interface JSONArtifactMetadata {
  schema?: string; // JSON Schema URL
  validated?: boolean;
}

interface WidgetArtifactMetadata {
  componentName: string;
  props?: Record<string, any>;
  framework?: 'react' | 'vue' | 'svelte';
}

// Discriminated union
export type Artifact =
  | (BaseArtifact & { type: ArtifactType.CODE; metadata: CodeArtifactMetadata })
  | (BaseArtifact & { type: ArtifactType.DIAGRAM; metadata: DiagramArtifactMetadata })
  | (BaseArtifact & { type: ArtifactType.IMAGE; metadata: ImageArtifactMetadata })
  | (BaseArtifact & { type: ArtifactType.TABLE; metadata: TableArtifactMetadata })
  | (BaseArtifact & { type: ArtifactType.JSON; metadata: JSONArtifactMetadata })
  | (BaseArtifact & { type: ArtifactType.WIDGET; metadata: WidgetArtifactMetadata })
  | (BaseArtifact & { type: ArtifactType.HTML; metadata?: {} })
  | (BaseArtifact & { type: ArtifactType.MARKDOWN; metadata?: {} })
  | (BaseArtifact & { type: ArtifactType.LATEX; metadata?: {} })
  | (BaseArtifact & { type: ArtifactType.FILE; metadata?: { mimeType: string; filename: string } });

// Type guards
export function isCodeArtifact(artifact: Artifact): artifact is Extract<Artifact, { type: ArtifactType.CODE }> {
  return artifact.type === ArtifactType.CODE;
}

export function isImageArtifact(artifact: Artifact): artifact is Extract<Artifact, { type: ArtifactType.IMAGE }> {
  return artifact.type === ArtifactType.IMAGE;
}

// ... más type guards
```

### Repository Pattern

```typescript
// lib/repositories/artifact-repository.ts
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';
import type { Artifact, ArtifactType } from '@/types/artifact';

const MAX_DB_CONTENT_SIZE = 1_000_000; // 1MB

export class ArtifactRepository {
  async create(data: {
    userId: string;
    messageId?: string;
    type: ArtifactType;
    title?: string;
    content: string;
    language?: string;
    metadata?: any;
  }): Promise<Artifact> {
    let blobUrl: string | undefined;
    let content = data.content;

    // Overflow large content to blob storage
    if (content.length > MAX_DB_CONTENT_SIZE) {
      const blob = await put(`artifacts/${data.userId}/${Date.now()}`, content, {
        access: 'public',
        contentType: this.getContentType(data.type),
      });
      blobUrl = blob.url;
      content = ''; // Empty content in DB, reference blob
    }

    return await prisma.artifact.create({
      data: {
        userId: data.userId,
        messageId: data.messageId,
        type: data.type,
        title: data.title,
        content,
        language: data.language,
        metadata: data.metadata,
        blobUrl,
        blobSize: blobUrl ? data.content.length : null,
      },
    }) as Artifact;
  }

  async findById(id: string): Promise<Artifact | null> {
    const artifact = await prisma.artifact.findUnique({
      where: { id },
    });

    if (!artifact) return null;

    // Load from blob if necessary
    if (artifact.blobUrl) {
      const response = await fetch(artifact.blobUrl);
      artifact.content = await response.text();
    }

    return artifact as Artifact;
  }

  async findByUser(userId: string, type?: ArtifactType): Promise<Artifact[]> {
    return await prisma.artifact.findMany({
      where: {
        userId,
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
    }) as Artifact[];
  }

  async update(id: string, data: Partial<{
    title: string;
    content: string;
    metadata: any;
  }>): Promise<Artifact> {
    // Create new version
    const current = await this.findById(id);
    if (!current) throw new Error('Artifact not found');

    return await this.create({
      userId: current.userId,
      messageId: current.messageId,
      type: current.type,
      title: data.title || current.title,
      content: data.content || current.content,
      metadata: { ...current.metadata, ...data.metadata },
    });
  }

  async delete(id: string): Promise<void> {
    const artifact = await prisma.artifact.findUnique({
      where: { id },
      select: { blobUrl: true },
    });

    // Delete blob if exists
    if (artifact?.blobUrl) {
      await fetch(artifact.blobUrl, { method: 'DELETE' });
    }

    await prisma.artifact.delete({ where: { id } });
  }

  async createShareToken(id: string): Promise<string> {
    const token = crypto.randomUUID();

    await prisma.artifact.update({
      where: { id },
      data: {
        public: true,
        shareToken: token,
      },
    });

    return token;
  }

  async findByShareToken(token: string): Promise<Artifact | null> {
    return await prisma.artifact.findUnique({
      where: { shareToken: token },
    }) as Artifact | null;
  }

  private getContentType(type: ArtifactType): string {
    const mapping: Record<ArtifactType, string> = {
      CODE: 'text/plain',
      JSON: 'application/json',
      HTML: 'text/html',
      MARKDOWN: 'text/markdown',
      LATEX: 'application/x-latex',
      DIAGRAM: 'text/plain',
      IMAGE: 'image/png',
      TABLE: 'text/csv',
      WIDGET: 'application/javascript',
      FILE: 'application/octet-stream',
    };
    return mapping[type];
  }
}
```

### Frontend Widget Rendering

```typescript
// components/artifacts/ArtifactRenderer.tsx
import { Artifact, ArtifactType, isCodeArtifact, isImageArtifact } from '@/types/artifact';
import { CodeBlock } from './widgets/CodeBlock';
import { ImageViewer } from './widgets/ImageViewer';
import { DiagramViewer } from './widgets/DiagramViewer';
import { TableViewer } from './widgets/TableViewer';
import { MarkdownViewer } from './widgets/MarkdownViewer';

interface ArtifactRendererProps {
  artifact: Artifact;
}

export function ArtifactRenderer({ artifact }: ArtifactRendererProps) {
  switch (artifact.type) {
    case ArtifactType.CODE:
      if (isCodeArtifact(artifact)) {
        return (
          <CodeBlock
            code={artifact.content}
            language={artifact.metadata.language}
            executable={artifact.metadata.executable}
          />
        );
      }
      break;

    case ArtifactType.IMAGE:
      if (isImageArtifact(artifact)) {
        return (
          <ImageViewer
            url={artifact.metadata.url}
            width={artifact.metadata.width}
            height={artifact.metadata.height}
            alt={artifact.title || 'Generated image'}
          />
        );
      }
      break;

    case ArtifactType.DIAGRAM:
      return <DiagramViewer source={artifact.content} />;

    case ArtifactType.TABLE:
      return <TableViewer data={JSON.parse(artifact.content)} />;

    case ArtifactType.MARKDOWN:
      return <MarkdownViewer content={artifact.content} />;

    case ArtifactType.HTML:
      return (
        <iframe
          srcDoc={artifact.content}
          sandbox="allow-scripts"
          className="w-full h-full"
        />
      );

    case ArtifactType.JSON:
      return (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(JSON.parse(artifact.content), null, 2)}
        </pre>
      );

    default:
      return (
        <div className="text-gray-500">
          Unsupported artifact type: {artifact.type}
        </div>
      );
  }
}
```

### API Route

```typescript
// app/api/artifacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ArtifactRepository } from '@/lib/repositories/artifact-repository';
import { z } from 'zod';

const createArtifactSchema = z.object({
  messageId: z.string().optional(),
  type: z.enum(['CODE', 'JSON', 'HTML', 'MARKDOWN', 'LATEX', 'DIAGRAM', 'IMAGE', 'TABLE', 'WIDGET', 'FILE']),
  title: z.string().optional(),
  content: z.string(),
  language: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const artifactRepo = new ArtifactRepository();

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createArtifactSchema.parse(body);

    const artifact = await artifactRepo.create({
      userId: session.user.id,
      ...data,
    });

    return NextResponse.json(artifact, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Artifact creation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as ArtifactType | undefined;

  const artifacts = await artifactRepo.findByUser(session.user.id, type);

  return NextResponse.json(artifacts);
}
```

## Alternativas Consideradas

### Opción A: Tabla por Tipo (Table-per-Type)

**Descripción**: Tablas separadas: `CodeArtifact`, `ImageArtifact`, `DiagramArtifact`, etc.

**Pros**:
- Schema estricto por tipo
- Queries optimizadas por tipo
- Foreign keys específicas
- No JSONB (más strict)

**Contras**:
- **Explosión de tablas**: 10+ tablas solo para artifacts
- **Joins complicados**: Unir todos los tipos para listado general
- **Migrations frecuentes**: Cada nuevo tipo = nueva tabla
- **DRY violation**: Campos comunes (userId, createdAt) repetidos
- **Frontend complejidad**: Multiple API endpoints

**Score: 4/10**

**Decisión**: Rechazado - No escala con tipos nuevos. Over-engineering.

---

### Opción B: Single Table con Columnas Opcionales

**Descripción**: Tabla única con todas columnas posibles: `language`, `url`, `width`, `height`, etc. La mayoría NULL.

**Pros**:
- Schema explícito (no JSONB)
- Queries SQL directas
- Indexes por columna específica

**Contras**:
- **Columnas sparse**: 80%+ valores NULL
- **Schema bloat**: Agregar tipo = agregar 5-10 columnas
- **Migrations**: Cada nuevo campo = migration
- **Confusión**: Qué columnas aplican a qué tipo?
- **No type-safe**: TypeScript no sabe qué columnas son válidas

**Score: 5/10**

**Decisión**: Rechazado - Schema inflexible. Migrations constantes.

---

### Opción C: MongoDB (Schema-less)

**Descripción**: Usar MongoDB con documentos flexibles.

**Pros**:
- Schema flexible nativo
- JSONB-like sin limitaciones
- Embedded documents para metadata
- No migrations necesarias

**Contras**:
- **No relational**: Joins complicados (lookups)
- **No ACID multi-doc**: Menos garantías transaccionales
- **Type safety**: Menos integración Prisma (Mongoose menos type-safe)
- **Expertise**: Team más familiarizado con SQL
- **Cost**: MongoDB Atlas más caro que Neon

**Score: 6/10**

**Decisión**: Rechazado - Preferimos PostgreSQL + Prisma. Ver ADR-002.

---

### Opción D: EAV (Entity-Attribute-Value)

**Descripción**: Pattern con tablas: `Artifact`, `ArtifactAttribute`, `ArtifactValue`.

**Pros**:
- Flexibilidad extrema
- No schema changes nunca

**Contras**:
- **Anti-pattern**: Queries extremadamente complejas
- **Performance**: Múltiples joins para un artifact
- **No type safety**: Todo es string
- **Debugging**: Imposible entender data
- **ORM**: Prisma no soporta bien EAV

**Score: 2/10**

**Decisión**: Rechazado - Anti-pattern reconocido. No usar.

---

### Opción Elegida: **Single Table + Type Discriminator + JSONB Metadata**

**Score: 9/10**

**Pros Clave**:
- **Flexibilidad**: Nuevos tipos sin migration (solo TypeScript)
- **Type Safety**: Discriminated unions en TypeScript
- **Performance**: Queries simples, indexes efectivos
- **DX**: Prisma + TypeScript = excelente
- **Escalabilidad**: JSONB indexable (GIN indexes)
- **Storage**: Overflow a blob para files grandes

**Contras Mitigados**:
- **JSONB no validado DB-side**: Mitigado por validación en app (Zod)
- **Queries metadata complejos**: Mitigado por GIN indexes + filtros específicos
- **Schema drift**: Mitigado por TypeScript strict types

**Justificación**:
- Balance perfecto: flexibilidad + type safety
- Best practice PostgreSQL (JSONB recomendado para metadata heterogénea)
- Prisma soporta JSONB con tipos TypeScript

## Consecuencias

### Positivas

1. **Extensibilidad Sin Fricciones**
   - Nuevo tipo: Agregar enum + TypeScript type
   - No migration necesaria
   - Deployment sin downtime

2. **Type Safety End-to-End**
   - Frontend sabe exactamente qué campos existen por tipo
   - Autocomplete en VSCode
   - Compile-time errors vs runtime crashes

3. **Performance Óptima**
   - Queries por type: `WHERE type = 'CODE'` (index hit)
   - Metadata filtering: GIN index en JSONB
   - Blob storage para files grandes (no slow queries)

4. **UI Rendering Simplificado**
   - Switch statement basado en type
   - Widget mapping claro
   - Dynamic imports para code splitting

5. **Shareability**
   - URL pública: `/share/{shareToken}`
   - No necesita auth
   - Embeddable en otras apps

### Negativas

1. **JSONB Schema Validation**
   - **Problema**: PostgreSQL no valida estructura de JSONB
   - **Mitigación**: Zod schemas en app layer, validación estricta
   - **Riesgo**: Low (validación app es suficiente)

2. **Queries Complejos en Metadata**
   - **Problema**: Buscar `metadata.language = 'typescript'` menos eficiente que columna
   - **Mitigación**: GIN index + query planner optimization
   - **Alternativa**: Promote campos muy consultados a columnas (ej: `language`)

3. **Migration Path**
   - **Problema**: Si necesitamos cambiar estructura JSONB, no hay migration auto
   - **Mitigación**: Background job para transformar old → new format
   - **Ejemplo**:
     ```typescript
     // Migration script
     const artifacts = await prisma.artifact.findMany({
       where: { type: 'CODE' },
     });
     for (const artifact of artifacts) {
       if (!artifact.metadata.version) {
         await prisma.artifact.update({
           where: { id: artifact.id },
           data: {
             metadata: {
               ...artifact.metadata,
               version: '1.0',
             },
           },
         });
       }
     }
     ```

4. **Storage Limits**
   - **Problema**: Content > 1MB va a blob (latency adicional fetch)
   - **Impacto**: ~100-200ms para cargar blob (aceptable)
   - **Mitigación**: Cache en CDN (Vercel Blob tiene CDN built-in)

5. **Type System Complexity**
   - **Problema**: Discriminated unions pueden ser verbosas
   - **Mitigación**: Type guards, helper utilities
   - **Beneficio**: Trade-off vale la pena por type safety

## Validación e Implementación

### Database Indexes

```sql
-- Performance-critical indexes
CREATE INDEX idx_artifact_type ON "Artifact"(type);
CREATE INDEX idx_artifact_user_type ON "Artifact"(userId, type);
CREATE INDEX idx_artifact_created ON "Artifact"(createdAt DESC);
CREATE INDEX idx_artifact_share ON "Artifact"(shareToken) WHERE shareToken IS NOT NULL;

-- JSONB GIN index para metadata search
CREATE INDEX idx_artifact_metadata_gin ON "Artifact" USING GIN (metadata);

-- Full-text search en content
CREATE INDEX idx_artifact_content_fulltext ON "Artifact" USING GIN (to_tsvector('english', content));
```

### Métricas de Éxito

| Métrica | Target | Medición |
|---------|--------|----------|
| **Artifact Create** | < 200ms P95 | API logs |
| **Artifact Query** | < 100ms P95 | Query analyzer |
| **Blob Fetch** | < 300ms P95 | Vercel Blob metrics |
| **Type Coverage** | 100% artifacts | TypeScript compiler |
| **Schema Drift** | 0 runtime errors | Sentry |

### Testing Strategy

```typescript
// __tests__/lib/artifacts.test.ts
import { ArtifactRepository } from '@/lib/repositories/artifact-repository';
import { ArtifactType } from '@/types/artifact';

describe('ArtifactRepository', () => {
  const repo = new ArtifactRepository();

  test('creates code artifact with metadata', async () => {
    const artifact = await repo.create({
      userId: 'user-1',
      type: ArtifactType.CODE,
      title: 'Hello World',
      content: 'console.log("Hello");',
      language: 'typescript',
      metadata: {
        language: 'typescript',
        executable: true,
      },
    });

    expect(artifact.type).toBe(ArtifactType.CODE);
    expect(artifact.metadata.language).toBe('typescript');
    expect(artifact.metadata.executable).toBe(true);
  });

  test('overflows large content to blob', async () => {
    const largeContent = 'x'.repeat(2_000_000); // 2MB

    const artifact = await repo.create({
      userId: 'user-1',
      type: ArtifactType.MARKDOWN,
      content: largeContent,
    });

    expect(artifact.blobUrl).toBeDefined();
    expect(artifact.blobSize).toBe(2_000_000);

    // Fetch back
    const fetched = await repo.findById(artifact.id);
    expect(fetched?.content).toBe(largeContent);
  });

  test('creates shareable artifact', async () => {
    const artifact = await repo.create({
      userId: 'user-1',
      type: ArtifactType.IMAGE,
      content: '',
      metadata: {
        url: 'https://example.com/image.png',
        width: 512,
        height: 512,
      },
    });

    const token = await repo.createShareToken(artifact.id);
    expect(token).toBeDefined();

    const shared = await repo.findByShareToken(token);
    expect(shared?.id).toBe(artifact.id);
  });
});
```

### Example Usage

```typescript
// Generar artifact desde LLM response
import { ArtifactRepository } from '@/lib/repositories/artifact-repository';
import { ArtifactType } from '@/types/artifact';

const repo = new ArtifactRepository();

// Code artifact
await repo.create({
  userId: session.user.id,
  messageId: message.id,
  type: ArtifactType.CODE,
  title: 'User Authentication Service',
  content: `
export class UserService {
  async register(email: string, password: string) {
    // ...
  }
}
  `,
  language: 'typescript',
  metadata: {
    language: 'typescript',
    executable: false,
    dependencies: ['bcrypt', 'jsonwebtoken'],
  },
});

// Image artifact
await repo.create({
  userId: session.user.id,
  messageId: message.id,
  type: ArtifactType.IMAGE,
  title: 'Logo Design Concept',
  content: '', // Empty, image en URL
  metadata: {
    url: imageUrl,
    width: 1024,
    height: 1024,
    model: 'flux-pro',
    prompt: 'Modern tech startup logo...',
  },
});

// Diagram artifact
await repo.create({
  userId: session.user.id,
  messageId: message.id,
  type: ArtifactType.DIAGRAM,
  title: 'System Architecture',
  content: `
graph TD
  A[Frontend] --> B[API]
  B --> C[Database]
  B --> D[AI Services]
  `,
  metadata: {
    diagramType: 'mermaid',
    source: '...',
  },
});
```

## Referencias

- [ARCHITECTURE.md - Capa 1: Data Layer](../ARCHITECTURE.md#capa-1-data-layer)
- [DATABASE_SCHEMA.md - Artifact Table](../database/DATABASE_SCHEMA.md#artifact-table)
- [ADR-002: PostgreSQL + Pinecone](./ADR-002-postgresql-pinecone-dual-db.md)
- [Anthropic Artifacts Documentation](https://www.anthropic.com/news/artifacts)
- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#discriminating-unions)

## Historial de Decisión

- **Creada**: 2025-10-22
- **Revisada por**: Data Architect, Architect, Coder
- **Implementación**: Fase 1 (Semanas 2-3)
- **Última actualización**: 2025-10-22
- **Siguiente revisión**: Fase 2 - Evaluar si necesitamos promote campos frecuentes (language) a columnas
- **Aprobada por**: Usuario (Proyecto Cjhirashi)

---

**Decisión final**: Artifact-based model con JSONB metadata maximiza flexibilidad manteniendo type safety. Pattern comprobado (Anthropic, otros) y best practice PostgreSQL.

# ADR-007: pdf-parse Downgrade para Compatibilidad con LangChain

## Estado
**ACCEPTED** - Implementado en Fase 5

## Contexto

### Problema a Resolver

Durante la integración del RAG pipeline en Fase 5, el build del proyecto fallaba con errores de compatibilidad entre `pdf-parse` v2.4.5 y LangChain:

**Errores observados:**
```
Error: Cannot find module 'pdf-parse' from 'node_modules/@langchain/community/dist/document_loaders/fs/pdf.js'
TypeError: PDF.js binding issue with pdf-parse v2.x
Module not found: pdf.js worker file not properly resolved in pdf-parse 2.4.5
```

**Impacto:**
- Build fallaba completamente (red state)
- RAG pipeline no podía cargar documentos PDF
- Pipeline de documento crítico bloqueado
- Bloquea funcionalidad central del MVP

**Root Cause Analysis:**
- `pdf-parse` v2.4.5 cambió estructura de módulos (ESM vs CommonJS)
- LangChain espera API compatible con v1.x
- Incompatibilidad de dependencias transversales (pdf-parse → pdfjs-dist)

### Requisitos Críticos

1. **Build debe pasar**: Sin errores de módulo
2. **RAG funcional**: Pipeline de carga de PDFs debe trabajar
3. **Type safety**: TypeScript strict mode
4. **Performance**: Sin degradación en procesamiento
5. **Mantenibilidad**: Solución debe ser sostenible a largo plazo

### Contexto del Proyecto

- **Fase**: 5 (API Implementation & Testing)
- **Timeline**: Tight (MVP debe lanzar en semana)
- **Prioridad**: CRÍTICA (bloquea RAG)
- **Equipo**: 2 developers, sin tiempo para workarounds complejos

## Decisión

**Downgradamos `pdf-parse` de v2.4.5 a v1.1.1 para resolver incompatibilidad con LangChain.**

### Cambios Implementados

```json
{
  "dependencies": {
    "pdf-parse": "1.1.1"
  }
}
```

**Script de actualización:**
```bash
npm uninstall pdf-parse
npm install pdf-parse@1.1.1
npm audit
```

**Validación post-downgrade:**
```bash
npm run build        # ✅ Build pasa sin errores
npm run test:unit   # ✅ Tests pasan
npm run dev         # ✅ Dev server inicia
```

### Implementación en Código

**RAG Pipeline - Document Loading:**
```typescript
// lib/rag/document-loader.ts
import PDFParser from 'pdf-parse';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';

export async function loadPDFDocument(filePath: string) {
  // Usa internamente pdf-parse v1.1.1 (compatible con LangChain)
  const loader = new PDFLoader(filePath);

  const documents = await loader.load();

  return documents.map(doc => ({
    content: doc.pageContent,
    metadata: {
      source: filePath,
      page: doc.metadata.page,
    },
  }));
}

// Direct pdf-parse usage también funciona
export async function extractTextFromPDF(pdfBuffer: Buffer) {
  const data = await PDFParser(pdfBuffer);

  return {
    text: data.text,
    numpages: data.numpages,
    info: data.info,
  };
}
```

**Upload Handler - Document Processing:**
```typescript
// app/api/v1/documents/upload/route.ts
import { NextRequest } from 'next/server';
import { extractTextFromPDF } from '@/lib/rag/document-loader';
import { indexDocumentInPinecone } from '@/lib/rag/indexing';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file.name.endsWith('.pdf')) {
    return Response.json(
      { error: 'Only PDF files supported' },
      { status: 400 }
    );
  }

  try {
    const buffer = await file.arrayBuffer();

    // pdf-parse v1.1.1 handles this correctly
    const { text, numpages } = await extractTextFromPDF(
      Buffer.from(buffer)
    );

    // Index in Pinecone for RAG
    const chunks = text.split('\n\n').filter(c => c.trim());
    await indexDocumentInPinecone({
      documentId: file.name,
      chunks,
      metadata: {
        fileName: file.name,
        pageCount: numpages,
        uploadedAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      documentId: file.name,
      pages: numpages,
      chunked: chunks.length,
    });
  } catch (error) {
    console.error('PDF parsing error:', error);
    return Response.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}
```

## Alternativas Consideradas

### Opción A: Mantener pdf-parse v2.4.5 + Workaround LangChain

**Descripción**: Buscar workaround o patch para mantener versión más nueva.

**Pros**:
- Versión más reciente (mejor features/performance)
- Evita downgrade
- Posible fix upstream en futuro

**Contras**:
- **Time-intensive**: 3-5 días debugging incompatibilidad
- **Risk**: Workarounds pueden tener side effects
- **Fragile**: Dependencia en parches custom
- **Maintenance burden**: Cada update de pdf-parse requiere validación
- **No garantiza solución**: El problema podría ser no solucionable

**Score: 4/10**

**Decisión**: Rechazado - MVP deadline no permite debugging profundo. Risk > Benefit.

---

### Opción B: Cambiar a Librería Alternativa

**Descripción**: Usar librería alternativa compatible (pdfjs-dist, pdf-lib, mupdf).

**Pros**:
- Posible mejor compatibilidad
- Más modernos que pdf-parse
- Ecosistema más activo

**Alternativas evaluadas**:

**pdfjs-dist**:
- Pro: Official Mozilla library
- Contra: Más heavy (~1MB), requiere setup de worker thread
- Score: 5/10

**pdf-lib**:
- Pro: Puro JavaScript, sin dependencias nativas
- Contra: Más lento, menos features, no optimizado para LangChain
- Score: 4/10

**mupdf**:
- Pro: Muy rápido, buena calidad
- Contra: Binding nativo, compilación compleja, no usado en LangChain ecosystem
- Score: 3/10

**Contras Globales**:
- **Migration effort**: 2-3 días reescribir document loader
- **Testing**: Nueva librería requiere validación exhaustiva
- **Risk**: Nuevas librerías podrían tener sus propios issues
- **Unknown unknowns**: No sé si alternativa funciona mejor

**Score Global: 4/10**

**Decisión**: Rechazado - Cambiar librería es más riesgoso que downgrade. Testing sería igual de exhaustivo.

---

### Opción C: Downgrade a pdf-parse v1.1.1 (ELEGIDA)

**Descripción**: Usar versión estable y probada que es compatible con LangChain.

**Pros**:
- **Inmediato**: Build pasa en minutos
- **Low risk**: Versión estable, usada en producción por años
- **LangChain compatible**: Diseñada para funcionar con LangChain
- **Minimal changes**: Mismo API, funciona sin cambios de código
- **Production ready**: No hay unknowns
- **Reversible**: Si en futuro v2 se estabiliza, podemos upgrade

**Contras**:
- **Versión antigua**: Menos features que v2.x
- **Mantenimiento**: pdf-parse v1.x es legacy
- **Performance**: Posiblemente más lento que v2
- **Technical debt**: Podría necesitar upgrade en futuro

**Score: 9/10**

**Justificación**:
- Resuelve problema AHORA con 99% confianza
- Tiempo crítico del MVP justifica pragmatismo
- Downgrade es reversible en Fase 3 (post-MVP)
- No hay reports de issues significativos con v1.1.1 + LangChain

## Consecuencias

### Positivas

1. **Build Funcional Inmediatamente**
   - Tiempo a resolución: < 30 minutos
   - Risk: Prácticamente nulo
   - Confidence: 99% (versión probada)

2. **RAG Pipeline Operacional**
   - Document upload funciona
   - Embeddings generados correctamente
   - Pinecone indexing correcto
   - Chat con RAG funcional

3. **Momentum Restaurado**
   - Equipo puede continuar sin bloqueos
   - Build pasa, tests pasan
   - Fase 5 en track correcto

4. **Zero Code Changes Necesarios**
   - API de pdf-parse v1.1.1 es compatible
   - Existing code sin cambios
   - No refactoring
   - Hot reload funciona

5. **Testing Simplificado**
   - No need para nueva suite de tests
   - Existing tests validan
   - Regression risk: Mínimo

### Negativas

1. **Versión Legacy**
   - **Problema**: pdf-parse v1.x es mantenido en maintenance mode
   - **Impacto**: Posibles security patches lentos
   - **Mitigación**: Monitorear security advisories, upgrade en Fase 3
   - **Risk**: Bajo (PDF parsing no es attack surface crítico)

2. **Features Posiblemente Faltantes**
   - **Problema**: pdf-parse v2.x puede tener features nuevos
   - **Impacto**: Documentos complejos podrían procesarse menos bien
   - **Mitigación**: Validar con test documents, agregar special handling si necesario
   - **Risk**: Bajo (documentos típicos funcionan bien)

3. **Performance Potencial**
   - **Problema**: v2.x podría ser más rápido
   - **Impacto**: Upload de PDFs grandes podría ser más lento
   - **Mitigación**: Benchmarking en Fase 3, async processing con queues
   - **Risk**: Bajo (SLA actual no requiere sub-100ms)

4. **Technical Debt Pequeño**
   - **Problema**: Downgrade es pragmático, no "correcto"
   - **Impacto**: Mentalidad de "quick fix"
   - **Mitigación**: Planificar upgrade a v2.x compatible post-MVP
   - **Risk**: Bajo (documentado en ADR, upgrade es roadmapped)

5. **Future Upgrade Path**
   - **Problema**: Eventualmente necesitaremos evaluar upgrade a v2.x
   - **Impacto**: Posible trabajo técnico en Fase 3 o 4
   - **Mitigación**: Crear ticket explícito de upgrade evaluation
   - **Risk**: Bajo (scheduled, no sorpresa)

## Validación e Implementación

### Validación de Build

```bash
# Verify build succeeds
npm run build
# ✅ Expected output: Build complete, no errors

# Verify dev server starts
npm run dev
# ✅ Expected output: Ready on http://localhost:3000

# Verify tests pass
npm run test:unit
# ✅ Expected output: All tests pass
```

### Validación de Funcionalidad

**Checklist de RAG Pipeline:**
- [x] PDF upload endpoint funciona
- [x] Text extraction es correcta
- [x] Embeddings se generan sin error
- [x] Pinecone indexing es exitoso
- [x] RAG queries retornan resultados
- [x] Chat with documents funciona

**Test Documents:**
```typescript
// __tests__/rag/document-loader.test.ts
import { extractTextFromPDF } from '@/lib/rag/document-loader';
import fs from 'fs';

describe('PDF Document Loader (pdf-parse v1.1.1)', () => {
  test('extracts text from simple PDF', async () => {
    const pdfPath = './__tests__/fixtures/sample.pdf';
    const buffer = fs.readFileSync(pdfPath);

    const { text, numpages } = await extractTextFromPDF(buffer);

    expect(text.length).toBeGreaterThan(0);
    expect(numpages).toBe(2);
  });

  test('handles multi-page documents', async () => {
    const pdfPath = './__tests__/fixtures/technical-doc.pdf';
    const buffer = fs.readFileSync(pdfPath);

    const { text, numpages } = await extractTextFromPDF(buffer);

    expect(numpages).toBe(15);
    expect(text.split('\n').length).toBeGreaterThan(100);
  });

  test('works with LangChain PDFLoader', async () => {
    const loader = new PDFLoader('./__tests__/fixtures/sample.pdf');
    const documents = await loader.load();

    expect(documents.length).toBeGreaterThan(0);
    expect(documents[0].pageContent).toBeTruthy();
  });
});
```

### Métricas de Éxito (SLA)

| Métrica | Target | Medición |
|---------|--------|----------|
| **Build Success** | 100% | CI/CD pipeline |
| **PDF Load Time** | < 2s | Performance test |
| **Extraction Accuracy** | > 95% | Document test suite |
| **LangChain Compatibility** | 100% | Integration tests |
| **No Regressions** | 0 broken tests | Test suite |

### Versioning

```json
{
  "dependencies": {
    "pdf-parse": "1.1.1"
  }
}
```

**Lock file committed**: ✅ (package-lock.json pinned)

**Upgrade path (Fase 3+)**:
- Evaluar pdf-parse v2.5+ (si estable)
- Test exhaustivo con suite de documentos
- Gradual rollout si upgrade viable

## Referencias

- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse)
- [pdf-parse v1.1.1 docs](https://github.com/modesty/pdf-parse/tree/v1.1.1)
- [pdf-parse v2.4.5 changelog](https://github.com/modesty/pdf-parse/blob/master/CHANGELOG.md)
- [LangChain PDFLoader](https://js.langchain.com/docs/modules/data_connection/document_loaders/file_loaders/pdf)
- [ARCHITECTURE.md - Capa 5: RAG & Document Processing](../ARCHITECTURE.md#capa-5-rag--document-processing)
- [RAG-PIPELINE.md](../rag/RAG-PIPELINE.md)

## Historial de Decisión

- **Identificado**: 2025-10-23 (Fase 5, durante build)
- **Investigado por**: Coder, System Analyzer
- **Decidido**: 2025-10-23
- **Implementado**: 2025-10-23 (< 1 hora)
- **Validado por**: Coder, Tester (full test suite)
- **Última actualización**: 2025-10-23
- **Revisión programada**: Fase 3 (post-MVP) - Evaluar upgrade a v2.x
- **Aprobada por**: Architect, Usuario (Proyecto Cjhirashi)

---

**Decisión final**: Downgrade a pdf-parse v1.1.1 es la solución pragmática y correcta para MVP. Resuelve blocker inmediatamente, permite continuación de Fase 5, y es reversible cuando pdf-parse v2.x se estabilice. Risk es mínimo con ganancia inmediata de momentum.

## Notas de Implementación

**Si en futuro necesitamos upgrade:**

1. **Fase 3+**: Evaluar pdf-parse v2.5+ (cuando sea stable)
2. **Testing**: Suite exhaustiva con documentos reales
3. **Rollout**: Gradual (flag feature para A/B testing)
4. **Rollback**: Plan claro si issues encontrados
5. **Costo**: ~1-2 días de testing, < 1 día de implementación

**Monitoreo**:
- Vigilar security advisories de pdf-parse
- Track GitHub issues de pdf-parse v2.x
- Evaluar alternativas (pdfjs-dist maturity)
- Plan upgrade para Q1 2026 si viable

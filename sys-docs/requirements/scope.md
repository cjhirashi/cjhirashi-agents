# 🎯 Definición de Alcance MVP - cjhirashi-agents

**Estado:** ✅ APROBADO
**Versión:** 1.0
**Fecha:** 2025-10-21
**Propietario:** Planner / Equipo
**Última Actualización:** 2025-10-21

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [INCLUIDO en MVP (15 Features)](#incluido-en-mvp-15-features)
3. [FASE 2 (Post-MVP)](#fase-2-post-mvp)
4. [EXCLUIDO (Razones)](#excluido-razones)
5. [Dependencias entre Features](#dependencias-entre-features)
6. [Restricciones Técnicas](#restricciones-técnicas)

---

## Descripción General

El alcance del MVP está estrictamente definido para:
1. Entregar valor máximo en 8 semanas
2. Mantener costo CERO (free tiers)
3. Permitir validación en producción
4. Facilitar iteración rápida basada en feedback real

**Principio:** Hacer poco pero bien, en lugar de mucho mediocre.

---

## INCLUIDO en MVP (15 Features)

### FEATURE 1: Hub IA Multiagente ✅

**Descripción:** Plataforma centralizada con 3-5 agentes especializados.

**Componentes:**
- Dashboard con selector de agentes
- Sesiones independientes por agente
- Persistencia de estado
- <100ms latencia cambio agente

**Requisitos Funcionales:** FR-1.1
**User Stories:** US-1.1
**Criterios de Completitud:**
- [ ] 3-5 agentes iniciales implementados
- [ ] Dashboard responsive
- [ ] Cambio de agente sin pérdida de historial
- [ ] Performance targets met

**Dependencias:** Ninguna (foundational)
**Riesgos:** Baja
**Notas:** Arquitectura para expandir a N agentes en futuro

---

### FEATURE 2: Chat Real-Time Multimodal ✅

**Descripción:** Interface de chat con streaming, texto, imagen, audio.

**Componentes:**
- Chat UI con streaming token-por-token
- Soporte de entrada: texto, imagen, audio
- Typing indicators y cancellación
- Markdown rendering

**Requisitos Funcionales:** FR-3.2
**User Stories:** US-4.1, US-4.2, US-4.3, US-4.4
**Criterios de Completitud:**
- [ ] Chat UI implementada
- [ ] Streaming funcional
- [ ] Multimodal input/output
- [ ] Historial persistido
- [ ] Export a PDF/JSON

**Dependencias:** Hub IA (Feature 1)
**Riesgos:** Media (WebSocket complexity)
**Notas:** Usar Vercel AI SDK para streaming

---

### FEATURE 3: RAG (Knowledge Base) ✅

**Descripción:** Upload de documentos + búsqueda semántica con Pinecone.

**Componentes:**
- Upload de archivos (PDF, DOCX, MD, CSV, JSON)
- Chunking y embedding automático
- Búsqueda semántica (vector similarity)
- Indexación en Pinecone

**Requisitos Funcionales:** FR-1.3
**User Stories:** US-3.1, US-3.2, US-3.3
**Criterios de Completitud:**
- [ ] Upload validado y procesado
- [ ] Indexación en Pinecone
- [ ] Búsqueda semántica funciona
- [ ] <2s latencia búsqueda
- [ ] Re-ranking de resultados

**Dependencias:** Chat (Feature 2), Storage (Feature 9)
**Riesgos:** Media (embedding costs)
**Notas:** Usar OpenAI embeddings (text-embedding-3-small)

---

### FEATURE 4: Agent Designer (Visual) ✅

**Descripción:** Crear agentes sin código mediante formulario visual.

**Componentes:**
- Formulario: nombre, descripción, rol, modelo, prompt
- Validación en tiempo real
- Vista previa del agente
- Publicación/borrador

**Requisitos Funcionales:** FR-3.1
**User Stories:** US-2.1, US-2.2, US-2.3
**Criterios de Completitud:**
- [ ] UI responsivo
- [ ] Validación funciona
- [ ] Preview de agente
- [ ] Publicación instantánea
- [ ] <5 minutos crear agente

**Dependencias:** Hub IA (Feature 1)
**Riesgos:** Baja
**Notas:** Usar React form library (react-hook-form)

---

### FEATURE 5: Multi-Usuario + RBAC ✅

**Descripción:** Sistema RBAC con 4 roles y multi-tenant.

**Componentes:**
- 4 roles: SUPER_ADMIN, ADMIN, USER, INVITED
- RBAC middleware
- Multi-tenant architecture
- Aislamiento de datos

**Requisitos Funcionales:** FR-2.1, FR-2.2, FR-2.3
**User Stories:** US-7.1, US-7.2, US-7.3
**Criterios de Completitud:**
- [ ] Roles implementados
- [ ] Permisos aplicados correctamente
- [ ] Datos aislados 100%
- [ ] Tests de isolation pasan
- [ ] <50ms check de permisos

**Dependencias:** Auth (NextAuth existente)
**Riesgos:** Alta (seguridad crítica)
**Notas:** Security audit obligatorio

---

### FEATURE 6: Subscription Tiers ✅

**Descripción:** 4 tiers con límites diferentes.

**Tiers:**
- **FREE:** 1 agente, 50 img/mes, 5 GB, 100 conversations
- **CORE ($15/mes):** Todos agentes, 50 img, 10 GB, ilimitado
- **PRO ($49/mes):** CORE + 500 img, 50 GB, API access
- **DEVELOPER:** Todas features, costos visibles

**Requisitos Funcionales:** FR-2.2
**Criterios de Completitud:**
- [ ] Tiers en BD
- [ ] Límites aplicados
- [ ] Upgrade/downgrade instantáneo
- [ ] Facturación correcta
- [ ] UI muestra tier actual

**Dependencias:** Multi-User (Feature 5)
**Riesgos:** Media (facturación compleja)
**Notas:** Usar Stripe para Phase 2

---

### FEATURE 7: Artifacts & Widgets ✅

**Descripción:** Guardar y visualizar artifacts (código, datos, reportes).

**Componentes:**
- Crear artifact desde chat
- Guardar en BD con versionado
- Widgets para visualizar
- Compartir con link temporal

**Requisitos Funcionales:** FR-1.4
**User Stories:** US-1.4
**Criterios de Completitud:**
- [ ] Artifact creation workflow
- [ ] Storage en Vercel Blob
- [ ] Widgets renderizan correctamente
- [ ] Link compartido funciona
- [ ] Export (JSON, CSV, PDF)

**Dependencias:** Chat (Feature 2), Storage (Feature 9)
**Riesgos:** Baja
**Notas:** Widget sandbox para seguridad

---

### FEATURE 8: Image Generation (DALL-E 3) ✅

**Descripción:** Generar imágenes con DALL-E 3.

**Componentes:**
- Prompt input
- Integración OpenAI API
- Múltiples tamaños
- Storage en Vercel Blob
- Counter de uso por tier

**Requisitos Funcionales:** FR-4.1
**User Stories:** US-6.1
**Criterios de Completitud:**
- [ ] API integrada
- [ ] Generación <30s
- [ ] Images guardadas
- [ ] Usage tracking
- [ ] Límites por tier aplicados

**Dependencias:** Chat (Feature 2), Multi-User (Feature 5)
**Riesgos:** Media (OpenAI pricing)
**Notas:** Incluido en MVP por bajo costo

---

### FEATURE 9: Audio Conversacional (Voice) ✅

**Descripción:** Voice agents con gpt-realtime (conversación bidireccional).

**Componentes:**
- Micrófono input (WebRTC)
- Transcripción (Whisper)
- Voice agent (gpt-realtime)
- Audio response <200ms latencia

**Requisitos Funcionales:** FR-4.2
**User Stories:** US-6.2
**Criterios de Completitud:**
- [ ] WebRTC funcionando
- [ ] Whisper transcription
- [ ] gpt-realtime integrated
- [ ] Latencia <200ms
- [ ] Múltiples idiomas

**Dependencias:** Chat (Feature 2)
**Riesgos:** Alta (latency/infraestructura)
**Notas:** Puede requerir CDN geo-distribuida

---

### FEATURE 10: Storage Servicio (Vercel Blob) ✅

**Descripción:** Almacenamiento de archivos con límites por tier.

**Componentes:**
- Upload con progress
- Organización en folders
- Compartir con link temporal (24h)
- Límites por tier (500MB-50GB)
- Integración con RAG

**Requisitos Funcionales:** FR-6.2
**Criterios de Completitud:**
- [ ] Upload funcional
- [ ] Límites validados
- [ ] Links compartidos expiran
- [ ] Agente accede documentos
- [ ] <10s upload 10MB

**Dependencias:** Multi-User (Feature 5)
**Riesgos:** Baja
**Notas:** Vercel Blob incluido en free tier

---

### FEATURE 11: MCP Gmail Integration ✅

**Descripción:** Agentes leen, buscan y envían emails.

**Componentes:**
- OAuth 2.0 authentication
- Lectura de emails
- Búsqueda
- Envío
- Tokens encriptados

**Requisitos Funcionales:** FR-5.1
**User Stories:** US-5.1
**Criterios de Completitud:**
- [ ] OAuth funcionando
- [ ] Lectura de emails
- [ ] Búsqueda funciona
- [ ] Envío seguro
- [ ] Rate limits aplicados (10 ops/min)

**Dependencias:** Multi-User (Feature 5)
**Riesgos:** Media (OAuth complexity)
**Notas:** MVP: solo lectura/envío seguro

---

### FEATURE 12: MCP Google Calendar Integration ✅

**Descripción:** Agentes leen, crean y actualizan eventos.

**Componentes:**
- OAuth 2.0
- Lectura de eventos
- Creación de eventos
- Actualización
- Timezone support

**Requisitos Funcionales:** FR-5.2
**User Stories:** US-5.2
**Criterios de Completitud:**
- [ ] OAuth funcionando
- [ ] Lectura de eventos
- [ ] Creación con attendees
- [ ] Timezone correcto
- [ ] Rate limits (10 ops/min)

**Dependencias:** Multi-User (Feature 5)
**Riesgos:** Media
**Notas:** Importante validar timezone

---

### FEATURE 13: MCP Notion Integration ✅

**Descripción:** Agentes leen y escriben en Notion.

**Componentes:**
- OAuth 2.0
- Query de bases de datos
- Creación de páginas
- Actualización de páginas
- Búsqueda

**Requisitos Funcionales:** FR-5.3
**User Stories:** US-5.3
**Criterios de Completitud:**
- [ ] OAuth funcionando
- [ ] Query de BD
- [ ] Creación de páginas
- [ ] Actualización de propiedades
- [ ] Rate limits (3 ops/s)

**Dependencias:** Multi-User (Feature 5)
**Riesgos:** Media
**Notas:** Notion API bien documentada

---

### FEATURE 14: Notifications (Firebase) ✅

**Descripción:** Push notifications, in-app banners, email alerts.

**Componentes:**
- Firebase Cloud Messaging
- In-app banner system
- Email triggers (Resend)
- Preferencias de usuario
- Quiet hours

**Requisitos Funcionales:** FR-6.1
**Criterios de Completitud:**
- [ ] Firebase configured
- [ ] Notifications se envían
- [ ] <5s delivery
- [ ] Preferencias funcionan
- [ ] Quiet hours respetadas

**Dependencias:** Multi-User (Feature 5)
**Riesgos:** Baja
**Notas:** Firebase free tier generoso

---

### FEATURE 15: Task Management ✅

**Descripción:** Crear, asignar, trackear tareas con Kanban.

**Componentes:**
- Creación de tareas
- Asignación a usuario/agente
- Kanban view (To Do, In Progress, Done, Blocked)
- Notificaciones de cambios
- Historial

**Requisitos Funcionales:** FR-8.1
**User Stories:** US-9.1
**Criterios de Completitud:**
- [ ] Crear tarea en <1 min
- [ ] Kanban responsive
- [ ] Cambio status instantáneo
- [ ] Notificaciones funcionan
- [ ] Historial guardado

**Dependencias:** Multi-User (Feature 5), Notifications (Feature 14)
**Riesgos:** Baja
**Notas:** Usar react-dnd para drag-and-drop

---

## Adicionales MVP (No Features Nuevas, pero Críticos)

### Dashboards de Usuario & Admin
- Dashboard personal (metrics de consumo)
- Dashboard admin (global stats, users, revenue)
- Requisito FR-7.1, FR-7.2
- Criterios: <3s load, números exactos

### Developer API (Read-Only)
- REST API básica para lectura
- Endpoints: /agents, /chats, /usage
- Rate limiting
- Documentación OpenAPI
- Requisito FR-9.1

### Bug Reporting System
- Formulario simple
- Chatbot diagnóstico
- Escalación automática
- Tracking de status
- Requisito FR-8.2

---

## FASE 2 (Post-MVP)

Estas features se implementarán DESPUÉS del MVP en semanas 9-12+ cuando:
1. MVP esté estable en producción
2. Feedback real de usuarios
3. Validación de costos
4. Roadmap priorizado

### F2-1: Video Generation (Sora 2)
**Razón:** Esperar estabilidad de Sora 2
**Timeline:** Semanas 13-16
**Prioridad:** P2

### F2-2: Audio Generation (ElevenLabs/Play.ht)
**Razón:** Pricing aún no claro
**Timeline:** Semanas 13-16
**Prioridad:** P2

### F2-3: Más Agentes Especializados
**Razón:** Basado en uso real
**Timeline:** Semanas 10+
**Prioridad:** P1

### F2-4: PDF Templates Personalizados
**Razón:** Requiere UI builder complejo
**Timeline:** Semanas 17+
**Prioridad:** P2

### F2-5: Modelado 3D
**Razón:** Mercado aún inmaduro
**Timeline:** Semanas 20+
**Prioridad:** P3

### F2-6: Más MCP Integrations
**Razón:** Validar demand primero
**Timeline:** Semanas 10+
**Prioridad:** P2

Integraciones consideradas:
- Slack (mensajes)
- GitHub (repos, issues)
- Stripe (información pagos)
- Zapier (triggers)
- Airtable (bases de datos)

### F2-7: ML Models Personalizados
**Razón:** Complejo, alto costo
**Timeline:** Semanas 30+
**Prioridad:** P3

### F2-8: Multi-Workspace
**Razón:** Validar demand
**Timeline:** Semanas 20+
**Prioridad:** P2

### F2-9: Teams & Collaboration
**Razón:** Basado en feedback
**Timeline:** Semanas 15+
**Prioridad:** P2

### F2-10: Advanced Analytics
**Razón:** Datos para analizar primero
**Timeline:** Semanas 20+
**Prioridad:** P2

---

## EXCLUIDO (Razones)

### NO INCLUIDO: Modelado 3D
**Razón:**
- Mercado IA 3D aún inmaduro (2025)
- Modelos poco confiables
- Alto costo computacional
- Bajo demand validado

**Decisión:** Excluido (no viable comercialmente)
**Revisión:** Semestre 2 2025

---

### NO INCLUIDO: Video Generation (MVP)
**Razón:**
- Sora 2 aún no estable
- Pricing no finalizado
- Lleva >1 minuto generar

**Decisión:** Esperar Phase 2 (semanas 13-16)
**Criterio:** Cuando Sora 2 tenga:
- [ ] Pricing estable
- [ ] <30s generación
- [ ] API públicamente disponible

---

### NO INCLUIDO: "Optional BD" por Agente
**Razón:**
- Complejidad innecesaria
- Agentes comparten conocimiento base
- Puede agregarse en Phase 2 si demand

**Decisión:** Excluido MVP
**Revisión:** Post-MVP feedback

---

### NO INCLUIDO: Modelos LLM Alternativos (en MVP)
**Razón:**
- Costos varían mucho
- Calidad inconsistente
- Mejor validar con Claude + OpenAI primero

**Stack LLM en MVP:**
- Claude Sonnet 4.5 (Anthropic)
- Gemini 2.5 Flash (Google)
- DeepSeek-R1 (DeepSeek)

**Revisión:** Cuando precios de otros modelos bajen

---

### NO INCLUIDO: MFA (MVP)
**Razón:**
- Arquitectura preparada (NextAuth)
- TOTP puede agregarse rápidamente
- MVP prioriza features de valor

**Decisión:** Excluido MVP, Phase 1.5 (semana 5-6)
**Nota:** RBAC + JWT suficientes para MVP

---

### NO INCLUIDO: Self-Hosting (MVP)
**Razón:**
- Infraestructura compleja
- Soporte multiplataforma
- Costo de desarrollo alto

**Decisión:** Excluido MVP
**Modelo:** SaaS en Vercel solo
**Revisión:** Phase 3+ si demand

---

### NO INCLUIDO: White-Label (MVP)
**Razón:**
- Requiere branding flexible
- Deployments personalizados
- Complejidad operacional

**Decisión:** Excluido MVP
**Revisión:** Phase 3+ como premium feature

---

## Dependencias entre Features

```
┌─────────────────────────────────────────┐
│ Foundational (Semana 1-2)              │
├─────────────────────────────────────────┤
│ • Auth (NextAuth - ya existe)          │
│ • Multi-User + RBAC (Feature 5)        │
│ • Storage Servicio (Feature 10)        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Core Platform (Semana 3-4)             │
├─────────────────────────────────────────┤
│ • Hub IA (Feature 1)                   │
│ • Chat Real-Time (Feature 2)           │
│ • Subscription Tiers (Feature 6)       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Knowledge & Agents (Semana 3-5)        │
├─────────────────────────────────────────┤
│ • RAG (Feature 3) → Chat               │
│ • Agent Designer (Feature 4) → Hub     │
│ • Artifacts (Feature 7) → Chat         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Content Generation (Semana 4-6)        │
├─────────────────────────────────────────┤
│ • Image Gen (Feature 8) → Chat         │
│ • Voice (Feature 9) → Chat             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Integrations (Semana 4-6)              │
├─────────────────────────────────────────┤
│ • MCP Gmail (Feature 11)               │
│ • MCP Calendar (Feature 12)            │
│ • MCP Notion (Feature 13)              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Engagement & Ops (Semana 5-7)          │
├─────────────────────────────────────────┤
│ • Notifications (Feature 14) → Tasks   │
│ • Task Management (Feature 15)         │
│ • Dashboards (Feature 14.x)            │
│ • API & Bug Reporting (Feature 15.x)   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Testing & Polish (Semana 7-8)          │
├─────────────────────────────────────────┤
│ • E2E Testing                          │
│ • Security Audit                       │
│ • Performance Optimization             │
│ • Documentation                        │
└─────────────────────────────────────────┘
```

---

## Restricciones Técnicas

### Presupuesto: $0
- Vercel free tier (hasta Hobby plan $20 si escala)
- PostgreSQL Neon: 0.5 GB free
- Pinecone: 1M vectors free
- Vercel Blob: 100 GB free
- OpenAI: Limited free requests
- Anthropic: Limited free requests

**Impacto:** Limita usuarios MVP a <100 concurrentes

### Timeline: 8 Semanas
- No hay tiempo para refactoring mayor
- Priorizar features sobre perfección
- Deuda técnica aceptable

### Team: 1 Developer + 16 AI Agents
- Charlie (Developer) = 40 hrs/semana
- Agentes especializados = coordinación via system-claude

### Tech Stack: Fijo
```
Frontend: Next.js 15, React 19, TypeScript 5, Tailwind CSS 4
Backend: Next.js API Routes, Prisma ORM
DB: PostgreSQL (Neon), Pinecone (Vector)
Storage: Vercel Blob
Auth: NextAuth v4 + Google OAuth
LLMs: Claude, OpenAI, Gemini, DeepSeek
```

---

## Cambios de Scope

Cualquier cambio de scope requiere:
1. Aprobación explícita del usuario (Charlie)
2. Impacto en timeline (delay de X días)
3. Impacto en presupuesto (si hay costo)
4. Evaluación de riesgos

**Cambios Permitidos (sin aprobación):**
- Bug fixes
- UI/UX improvements
- Performance optimizations
- Documentación mejorada

**Cambios Requeriendo Aprobación:**
- Nuevas features
- Cambio de prioridad
- Tecnología alternativa
- Timeline extension

---

## Historial de Cambios

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0 | 2025-10-21 | Alcance MVP definido | Planner |
| | | 15 features INCLUIDAS | |
| | | 10 features Phase 2 | |
| | | 6 features EXCLUIDAS | |
| | | Dependencias mapeadas | |

---

**Estado:** ✅ APROBADO
**Última Actualización:** 2025-10-21
**Próxima Revisión:** End of Week 1
**Propietario:** Planner / Team

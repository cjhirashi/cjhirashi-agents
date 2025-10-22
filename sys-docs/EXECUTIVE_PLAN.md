# 🎯 PLAN EJECUTIVO - cjhirashi-agents MVP

**Estado:** ✅ APROBADO POR USUARIO
**Fecha:** 2025-10-21
**Versión:** 1.0

---

## 📋 Tabla de Contenidos

1. [Visión & Objetivos](#visión--objetivos)
2. [Decisiones Finales](#decisiones-finales)
3. [Requisitos Aprobados](#requisitos-aprobados)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Presupuesto & Costos](#presupuesto--costos)
6. [Timeline MVP](#timeline-mvp)
7. [Próximos Pasos](#próximos-pasos)

---

## 🎯 Visión & Objetivos

### Visión
Una plataforma centralizada de agentes IA especializados que empodera al usuario (Charlie) con herramientas poderosas de IA, escalable a negocio redituable.

### Objetivos Primarios (En orden)

1. **Herramienta Poderosa para Consumo Personal**
   - Hub multiagente IA con capacidades diversas
   - Acceso a datos personales del usuario via RAG
   - Experimenta rápido con nuevos agentes
   - Developer Tier con costos visibles

2. **Negocio Redituable & Sostenible**
   - Modelo de ingresos escalable
   - Márgenes saludables (60-75%)
   - MVP a costo CERO (free tiers)
   - Crecimiento a 10k usuarios viable

---

## ✅ Decisiones Finales (APROBADAS)

### INCLUIDO EN MVP ✅

| # | Feature | Justificación | Phase |
|---|---------|--------------|-------|
| 1 | Hub IA multiagente | Core del producto | MVP |
| 2 | RAG + Knowledge base | Poder personal | MVP |
| 3 | Multi-usuario + RBAC | Escalabilidad | MVP |
| 4 | MCP Integrations | Ecosistema abierto | MVP |
| 5 | **Imagen generation** | DALL-E bajo costo | MVP |
| 6 | **Audio conversacional** | Voice agents OpenAI | MVP |
| 7 | APIs para terceros | Revenue alterno | MVP |
| 8 | Notificaciones | Engagement | MVP |
| 9 | Storage servicio | Ya existe | MVP |
| 10 | **Agent Designer** | Innovación rápida | MVP |
| 11 | Chat real-time | Comunicación | MVP |
| 12 | **Sector tareas** | Organización | MVP |
| 13 | Reporte fallas | Feedback loop | MVP |
| 14 | **Developer Tier** | Costos visibles | MVP |
| 15 | **Artefactos + Widgets** | Datos visuales | MVP |

### PHASE 2 (POST-MVP) ⏳

| # | Feature | Razón | Timeline |
|---|---------|-------|----------|
| 1 | **Video generation** | Esperar Sora 2 estable | Mes 3-4 |
| 2 | **Audio generation** | Esperar pricing claro | Mes 3-4 |
| 3 | PDF templates custom | UI builder para templates | Mes 4-5 |
| 4 | Más agentes especializados | Basado en uso real | Mes 2+ |
| 5 | Modelado 3D | Futuro (análisis posterior) | Mes 6+ |

### NO INCLUIDO ❌

| # | Feature | Razón |
|---|---------|-------|
| 1 | Modelado 3D en MVP | No es viable comercialmente (2025) |
| 2 | "Optional BD" agentes | Complejidad innecesaria |
| 3 | Modelos LLM alternativos | Evaluar cuando precios bajen |

---

## 📋 Requisitos Aprobados

### Funcionalidades CORE

#### 1. Hub Centralizado de Herramientas IA
```
✅ Multiagente (3-5 agentes en MVP)
✅ Multimodal (texto, imagen, audio)
✅ Generación + análisis de contenido
✅ Persistencia de datos (PostgreSQL)
✅ RAG con Pinecone para búsqueda semántica
✅ Artefactos guardados en BD
✅ Widgets para visualización
```

#### 2. Agente Asistente Personal
```
✅ Acceso a base de conocimiento centralizada
✅ Usa Artifacts (no queryea directamente todas las tablas)
✅ Context profiling (perfil del usuario)
✅ Optimizado para costo (usa Gemini para long-context)
```

#### 3. Gestión Multi-Usuario
```
✅ SuperUsuario (control total)
✅ Admins (gestión de usuarios + permisos)
✅ Usuarios Suscripción (CORE, PRO tiers)
✅ Usuarios Invitación (acceso limitado, pay-as-you-go)
✅ RBAC: Control acceso a agentes por usuario
```

#### 4. Métricas de Uso
```
✅ Dashboard por usuario (su propio consumo)
✅ Dashboard admin (consumo global + financiero)
✅ Token counting automático
✅ Alertas de límites
✅ Exportación de reports
```

#### 5. Sector de Tareas
```
✅ Gestión de tareas del proyecto
✅ Asignación a usuarios / agentes
✅ Tracking de progreso
✅ Integración con notificaciones
```

#### 6. Generación de Contenido

**IMÁGENES** ✅
```
Modelo: DALL-E 3
Incluido en: CORE plan (50 imágenes/mes), PRO (500/mes)
Developer Tier: Todas las que quieras (costos visibles)
```

**AUDIO CONVERSACIONAL** ✅
```
Modelo: OpenAI gpt-realtime
Capacidad: Voice agents, conversación bidireccional
Latencia: <200ms
Developer Tier: Ilimitado
```

**VIDEO GENERATION** ⏳
```
Modelo: Sora 2 (cuando esté estable)
Plan: Phase 2, solo SuperUsuario inicialmente
```

**AUDIO GENERATION** ⏳
```
Modelo: Play.ht / ElevenLabs (cuando pricing sea claro)
Plan: Phase 2, solo SuperUsuario
```

#### 7. MCP Integrations
```
TIER 1 (MVP):
✅ Gmail (lectura, búsqueda, envío)
✅ Google Calendar (lectura, crear eventos)
✅ Notion (query DB, crear pages)

TIER 2 (Phase 2):
⏳ Slack (mensajes)
⏳ GitHub (repos, issues)
⏳ Stripe (información pagos)
```

#### 8. Storage & Archivos
```
✅ Vercel Blob para almacenamiento
✅ Límites por tier (500 MB free, 5 GB core, 50 GB pro)
✅ Links temporales para compartir
✅ Compartición via email
✅ Integración con RAG (agentes pueden leer)
```

#### 9. APIs para Terceros
```
✅ Read-only (datos del usuario)
✅ Autenticación via API key
✅ Rate limiting
✅ Webhook support
```

#### 10. Reporte de Fallas
```
✅ Formulario simple de reporte
✅ Chatbot para diagnóstico inicial
✅ Escalación a admin automática (bugs críticos)
✅ Tracking de issues
```

---

## 🏗️ Stack Tecnológico FINAL

### Frontend (Ya tienes - Mantener)
```
✅ Next.js 15 + React 19 + TypeScript 5
✅ Tailwind CSS 4 + shadcn/ui (componentes)
✅ Zustand v5 (state management)
✅ Vercel deployment + Edge Functions
```

### Backend (Ya tienes - Mantener)
```
✅ Next.js API Routes
✅ Prisma v6.17.1 ORM
✅ NextAuth v4.24.11 + Google OAuth
```

### NEW - LLM & IA (Multi-modelo con Routing)

#### Modelos Primarios

**🏆 Claude Sonnet 4.5** (Anthropic)
```
Uso: Chat general, análisis, decisiones
Precio: $3 / $15 per 1M tokens
Context: 200K tokens
Preferencia: User tier "Balanced" (default)
```

**🥈 Gemini 2.5 Flash** (Google)
```
Uso: Long-context, backup, queries eficientes
Precio: $0.0375 / $0.15 per 1M tokens
Context: 1M tokens (10x Claude)
Preferencia: User tier "Fast" (velocidad crítica)
```

**🥉 DeepSeek-R1** (DeepSeek)
```
Uso: Reasoning pesado, optimización costo
Precio: $0.55 / $2.19 per 1M tokens
Context: 128K tokens
Preferencia: User tier "Power" (reasoning)
```

**🎙️ OpenAI gpt-realtime** (OpenAI)
```
Uso: Voice agents, conversación bidireccional
Precio: $32 / $64 per 1M audio tokens
Latencia: <200ms
Feature: Audio streaming nativo
```

**🎨 DALL-E 3** (OpenAI)
```
Uso: Image generation
Precio: $0.04 - $0.17 per image (según size)
Quality: Ultra high
Integration: API separada
```

#### Routing Automático

```typescript
// Sistema inteligente selecciona modelo según:
- User tier (Fast, Balanced, Power)
- Task complexity (simple, medium, complex)
- Context length (small <20K, medium 20-200K, large >200K)
- Cost sensitivity

Ejemplo:
- User = "Balanced", task = "chat", context = 50K
  → Claude Sonnet 4.5 ✅

- User = "Fast", task = "analysis", context = 800K
  → Gemini 2.5 Flash ✅

- User = "Power", task = "reasoning", context = 100K
  → DeepSeek-R1 ✅
```

### Databases

**PostgreSQL (Neon)** ✅
```
Propósito: Datos relacionales (users, agents, conversations, etc)
Free tier: 0.5 GB
Tier: Neon Starter $14/mes cuando escale
Connection: Vercel Postgres (integración directa)
ORM: Prisma v6.17.1 (ya tienes)
```

**Vector DB (Pinecone)** ✅
```
Propósito: RAG, semantic search, embeddings
Free tier: 1M vectors
Tier: Pinecone Starter $10/mes cuando escale
Use cases:
  - Indexar conversations (búsqueda histórico)
  - Embeddings de Artifacts
  - Knowledge base del usuario
```

**Storage (Vercel Blob)** ✅
```
Propósito: Archivos, media, assets
Free tier: 100 GB
Tier: $5 per 100 GB additional
Use cases:
  - Documentos usuario
  - Generated images
  - Video files (future)
```

**Cache (Vercel KV)** ⏳
```
Propósito: Cache de conversaciones activas, session state
Optional: Usar cuando escalemos
Free tier: Small
```

### Auth & Security (Ya tienes)

```
✅ NextAuth v4.24.11
✅ Google OAuth 2.0
✅ Email/Password auth
✅ JWT tokens (30 días expiration)
✅ RBAC: SUPER_ADMIN, ADMIN, USER, INVITED
✅ MFA (preparado, no en MVP)
```

### Comunicación

**Firebase Cloud Messaging**
```
Propósito: Push notifications
Cost: FREE tier generoso
Use: Alerts, reminders, real-time updates
```

**Resend**
```
Propósito: Email transaccional
Free tier: 100 emails
Tier: $20 per 10k emails
Use: Invitaciones, confirmaciones, reportes
```

**WebSocket / SSE**
```
Propósito: Chat real-time superuser ↔ usuarios
Tech: Socket.io en Vercel o SSE nativo
Latency: <100ms
```

### MCP (Model Context Protocol)

```
Propósito: Integración de herramientas externas
Storage: Encrypted tokens en BD (MCPIntegration table)
Auth: OAuth for each service
Tools en MVP:
  ✅ Gmail (read, search, send)
  ✅ Google Calendar (read, create, update)
  ✅ Notion (query, create pages)
```

---

## 💰 Presupuesto & Costos

### MVP Phase (Solo tú - Weeks 1-8)

```
Vercel (Next.js):        $0   (free tier)
Neon (PostgreSQL):       $0   (0.5 GB free)
Pinecone (Vectors):      $0   (1M free)
Claude Sonnet 4.5:       $0-5 (limited free requests)
Gemini 2.5 Flash:        $0   (1500 req/día gratis)
Vercel Blob:             $0   (100 GB free)
Firebase:                $0   (free tier)
Resend:                  $0   (100 emails free)
OpenAI gpt-realtime:     $0-10 (experimental, limitado)
DALL-E:                  $0   (experimental)

TOTAL MVP: $0-15/mes ✅ GRATIS EFECTIVAMENTE
```

### Beta Phase (10 usuarios - Weeks 9-12)

```
Vercel:                  $20
Neon Starter:            $14
Pinecone:                $0   (aún bajo 1M)
Claude Sonnet 4.5:       $50
Gemini:                  $0
Vercel Blob:             $0
Firebase:                $5
Resend:                  $10
Misc:                    $10

TOTAL BETA: ~$110/mes

Ingresos (si 10 CORE @ $15): $150/mes
PROFIT: $40/mes ✅ VIABLE
```

### Growth Phase (100 usuarios - Months 3-4)

```
Vercel:                  $50
Neon Pro Starter:        $69
Pinecone Standard:       $15
Claude + Gemini mix:     $300
OpenAI (voice + image):  $100
Vercel Blob:             $10
Firebase:                $20
Resend:                  $50
Monitoring + misc:       $50

TOTAL GROWTH: ~$664/mes

Ingresos (30 CORE @ $15 + 70 invitados pay-use): $1,000-2,000/mes
PROFIT: $1,000+/mes ✅ SALUDABLE
```

### Developer Tier Pricing (Personal)

Como usuario, tienes "Developer Tier":
- Acceso a ALL features
- Costos VISIBLES (dashboard mostrando gasto real)
- No pagas (porque lo cubre el negocio)
- PERO ves exactamente qué gastas en cada agente

**Beneficio:** Validación de costos reales + feature showcase.

---

## 📅 Timeline MVP - 8 Semanas

### 🟡 SEMANA 1-2: FOUNDATION & ARCHITECTURE

**Tareas:**
- [ ] Crear documentación completa (phases 1-4)
- [ ] Architecture Design completo
- [ ] Database Schema (Pinecone + PostgreSQL)
- [ ] Security Plan baseline
- [ ] UI/UX Design System

**Entregables:**
- `ARCHITECTURE.md` completo
- `DATABASE.md` con ERD
- `SECURITY_PLAN.md`
- Figma design tokens

**Owner:** Architect, Data Architect, UX Designer, Security Specialist

---

### 🟡 SEMANA 3-4: CORE BACKEND

**Tareas:**
- [ ] Setup Vercel AI SDK
- [ ] Implement model routing logic
- [ ] FirstAgent: "Agent Designer"
- [ ] Chat endpoint funcional
- [ ] Pinecone RAG integration
- [ ] Notificaciones básicas

**Entregables:**
- `/api/chat` endpoint
- Agent Designer spec docs
- `AI_INTEGRATION.md`
- Routing logic + tests

**Owner:** Backend Coder, AI Specialist

---

### 🟢 SEMANA 5-6: FRONTEND & MCP

**Tareas:**
- [ ] Dashboard UI completo
- [ ] Chat interface
- [ ] MCP Gmail integration
- [ ] MCP Notion integration
- [ ] Artifacts + Widgets system
- [ ] Storage file UI
- [ ] Admin panel skeleton

**Entregables:**
- Dashboard fully functional
- MCP integrations working
- `MCP_INTEGRATION.md`

**Owner:** Frontend Coder, UX Designer, AI Specialist

---

### 🟢 SEMANA 7-8: VOICE, POLISH & DEPLOY

**Tareas:**
- [ ] OpenAI gpt-realtime integration (voice)
- [ ] DALL-E image generation
- [ ] Sector de tareas
- [ ] Reporte de fallas system
- [ ] Testing & QA
- [ ] Documentation
- [ ] MVP v1.0 Deploy

**Entregables:**
- Voice agents working
- Image generation working
- MVP v1.0 on production
- Complete documentation
- Release notes

**Owner:** Full team (coordinated)

---

## 🎯 Próximos Pasos

### INMEDIATO (Esta semana)

1. ✅ **Este documento aprobado** (HECHO)
2. ⏳ **Crear documentación Fase 1 (Requirements)**
   - Archivo: `requirements/requirements.md`
   - Owner: Delegado a planner
3. ⏳ **Crear documentación Fase 2 (Architecture)**
   - Archivo: `architecture/ARCHITECTURE.md`
   - Owner: Delegado a architect

### WEEK 1

1. ⏳ Definir user stories completas
2. ⏳ Architecture design review
3. ⏳ Database schema review
4. ⏳ Begin coding Phase 1

### WEEK 2-3

1. ⏳ Agent Designer functionality
2. ⏳ Chat backend
3. ⏳ RAG setup

### WEEK 4+

1. ⏳ Frontend development
2. ⏳ MCP integrations
3. ⏳ Testing & deployment

---

## 📊 Resumen Ejecutivo

| Aspecto | Valor |
|---------|-------|
| **MVP Timeline** | 8 semanas |
| **MVP Cost** | $0 (free tiers) |
| **Scale to 100 users** | ~$664/mes cost |
| **Expected revenue @ 100 users** | $1-2k/mes |
| **Primary objectives** | 1) Personal power tool 2) Redituable business |
| **Core differentiator** | Multi-agente + MCP + RAG + voice |
| **First agent** | Agent Designer (innovación rápida) |
| **Voice capability** | OpenAI gpt-realtime (conversational) |
| **Image generation** | DALL-E 3 (included) |
| **Video generation** | Phase 2 (waiting for Sora 2 stability) |
| **License** | Apache 2.0 + NDA for clients |
| **Target users at MVP** | YOU (validación personal) |

---

## ✅ Aprobaciones

```
[✅] Usuario (Charlie): Plan aprobado
[✅] Arquitecto: Recomendaciones incluidas
[✅] IA Specialist: Multi-modelo + routing aprobado
[✅] Budget: $0 MVP viable
[✅] Timeline: 8 semanas realista
```

---

## 📞 Contacto & Referencias

- **Plan completo:** Este documento
- **Arquitectura:** Ver `architecture/ARCHITECTURE.md` (cuando esté listo)
- **Costos:** Ver `costs/COST_ANALYSIS.md` (cuando esté listo)
- **Roadmap detallado:** Ver `requirements/scope.md` (cuando esté listo)

---

**Estado:** ✅ APROBADO
**Última actualización:** 2025-10-21
**Próxima revisión:** End of Week 2 (post-architecture review)

🚀 **¡ADELANTE CON MVP!**

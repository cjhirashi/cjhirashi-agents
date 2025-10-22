# 📖 cjhirashi-agents - Documentación Completa

Bienvenido a la documentación del desarrollo de **cjhirashi-agents**, plataforma multi-agente IA para gestión integral de herramientas de inteligencia artificial.

**Estructura de documentación:** Organizadas por fases SDLC siguiendo la orquestación en `.claude/`

---

## 📁 Estructura de Carpetas

```
sys-docs/
├── README.md                           ← TÚ ESTÁS AQUÍ
│
├── requirements/                       # Fase 1: Requirements & Scope
│   ├── requirements.md                # Documento de requisitos completo
│   ├── user-stories.md               # User stories con acceptance criteria
│   ├── scope.md                      # Alcance del proyecto y MVP
│   ├── risks.md                      # Registro de riesgos
│   └── stakeholders.md               # Mapa de stakeholders
│
├── technical/                         # Fase 1: Stack & Stack
│   └── stack-recommendation.md        # Stack tecnológico validado
│
├── architecture/                      # Fase 2: Architecture Design
│   ├── ARCHITECTURE.md               # Diseño arquitectónico completo
│   ├── STACK.md                      # Stack seleccionado con justificación
│   ├── diagrams/
│   │   ├── system-architecture.md    # Diagrama arquitectura general
│   │   ├── layers.md                 # Diagrama capas
│   │   └── components.md             # Diagrama componentes
│   └── decisions/
│       ├── ADR-001.md
│       └── ...
│
├── database/                          # Fase 3: Database Design
│   ├── DATABASE.md                   # Documentación modelo datos
│   ├── ERD.md                        # Entity-Relationship Diagram
│   ├── MIGRATIONS.md                 # Plan de migraciones
│   ├── INDEXING.md                   # Estrategia de índices
│   └── schema.prisma                 # Schema de Prisma
│
├── security/                          # Fase 4: Security & Compliance
│   ├── SECURITY_PLAN.md              # Plan de seguridad
│   ├── THREAT_MODEL.md               # Análisis de amenazas
│   ├── AUTH_DESIGN.md                # Diseño autenticación/autorización
│   ├── SECURITY_VALIDATION.md        # Validación seguridad (Fase 12)
│   ├── OWASP_REVIEW.md               # Revisión OWASP Top 10
│   └── HEADERS.md                    # Configuración headers seguridad
│
├── compliance/                        # Compliance & GDPR
│   └── COMPLIANCE.md                 # Checklist GDPR, CCPA, etc
│
├── design/                            # Fase 5: UI/UX & Design System
│   ├── DESIGN_SYSTEM.md              # Sistema de diseño completo
│   ├── COMPONENTS.md                 # Librería de componentes
│   ├── DESIGN_TOKENS.md              # Design tokens
│   ├── ACCESSIBILITY.md              # Guía accesibilidad (WCAG AA)
│   ├── wireframes/
│   │   ├── dashboard.md
│   │   ├── auth-flow.md
│   │   └── ...
│   ├── mockups/
│   │   └── FIGMA_LINKS.md
│   └── diagrams/
│       └── component-structure.md
│
├── code/                              # Fases 6-13: Implementation
│   ├── IMPLEMENTATION.md             # Guía general implementación
│   ├── FRONTEND_GUIDE.md             # Guía implementación Frontend
│   ├── BACKEND_GUIDE.md              # Guía implementación Backend
│   ├── CODE_STANDARDS.md             # Estándares de código
│   └── patterns/
│       ├── api-design.md
│       ├── component-patterns.md
│       └── state-management.md
│
├── testing/                           # Fase 12: Testing & QA
│   ├── TEST_PLAN.md                  # Plan de testing
│   ├── COVERAGE.md                   # Reporte de cobertura
│   ├── QA_GUIDELINES.md              # Guías de calidad
│   ├── CODE_REVIEW.md                # Reporte revisión código
│   └── test-results/
│       └── latest-run.md
│
├── ai/                                # Fase 9: IA/LLM Integration
│   ├── MODEL_SELECTION.md            # Comparativa y selección modelos
│   ├── INTEGRATION.md                # Documentación técnica integración
│   ├── AI_COSTS.md                   # Análisis costos IA
│   └── prompts/
│       ├── SYSTEM_PROMPTS.md
│       └── PROMPT_GUIDE.md
│
├── api/                               # Documentación de API
│   ├── API_REFERENCE.md              # Referencia completa endpoints
│   ├── examples/
│   │   ├── auth-examples.md
│   │   ├── crud-examples.md
│   │   └── ...
│   └── schemas/
│       ├── user.json
│       └── ...
│
├── operations/                        # Fase 13: Deployment & Operations
│   ├── DEPLOYMENT.md                 # Guía de deployment
│   ├── RUNBOOKS.md                   # Runbooks operativos
│   ├── TROUBLESHOOTING.md            # Guía troubleshooting
│   ├── MONITORING.md                 # Configuración monitoreo
│   ├── scaling/
│   │   └── SCALING_GUIDE.md
│   └── incident-response/
│       └── procedures.md
│
├── costs/                             # Análisis de costos operativos
│   ├── COST_ANALYSIS.md              # Análisis completo costos
│   ├── AI_COSTS.md                   # Costos específicos IA
│   ├── INFRASTRUCTURE_COSTS.md       # Costos infraestructura
│   └── budget-tracking.md            # Tracking presupuesto
│
├── guides/                            # Guías usuario y desarrollador
│   ├── USER_GUIDE.md                 # Guía usuario del sistema
│   ├── DEVELOPER_GUIDE.md            # Guía para desarrolladores
│   ├── ONBOARDING.md                 # Setup local y onboarding
│   ├── CONTRIBUTING.md               # Guía de contribución
│   └── FAQ.md                        # Preguntas frecuentes
│
├── SYSTEM.md                          # Descripción general del proyecto
├── CHANGELOG.md                       # Histórico cambios y versiones
├── ARCHITECTURE_OVERVIEW.md           # Vista general arquitectura (30 min)
└── VERSIONS.md                        # Control de versiones
```

---

## 📖 Cómo Navegar Esta Documentación

### Por Fase SDLC

**Fase 1: Requirements & Scope**
- `requirements/` - Definición completa de requisitos
- `technical/stack-recommendation.md` - Tecnologías seleccionadas

**Fase 2: Architecture Design**
- `architecture/ARCHITECTURE.md` - Diseño arquitectónico
- `architecture/diagrams/` - Diagramas visuales
- `architecture/decisions/` - ADRs (Architecture Decision Records)

**Fase 3: Database Design**
- `database/DATABASE.md` - Modelo de datos
- `database/ERD.md` - Diagrama entidad-relación
- `database/MIGRATIONS.md` - Plan de migraciones

**Fase 4: Security & Compliance**
- `security/SECURITY_PLAN.md` - Plan integral seguridad
- `security/AUTH_DESIGN.md` - Diseño auth/authz
- `compliance/COMPLIANCE.md` - Checklist GDPR/CCPA

**Fase 5: UI/UX Design System**
- `design/DESIGN_SYSTEM.md` - Sistema de diseño
- `design/COMPONENTS.md` - Librería componentes
- `design/wireframes/` - Wireframes por página

**Fases 6-8: Implementation**
- `code/FRONTEND_GUIDE.md` - Implementación frontend
- `code/BACKEND_GUIDE.md` - Implementación backend
- `code/CODE_STANDARDS.md` - Estándares a seguir

**Fase 9: IA/LLM Integration**
- `ai/MODEL_SELECTION.md` - Selección de modelos
- `ai/INTEGRATION.md` - Integración técnica
- `ai/prompts/` - Prompts del sistema

**Fase 12: Testing & QA**
- `testing/TEST_PLAN.md` - Plan de testing
- `testing/CODE_REVIEW.md` - Reportes revisión

**Fase 13: Deployment & Operations**
- `operations/DEPLOYMENT.md` - Guía deployment
- `operations/MONITORING.md` - Configuración monitoreo
- `operations/RUNBOOKS.md` - Procedimientos operacionales

### Por Tema

**Arquitectura:** `SYSTEM.md` + `ARCHITECTURE_OVERVIEW.md` + `architecture/`
**Costos:** `costs/COST_ANALYSIS.md` + `costs/AI_COSTS.md`
**API:** `api/API_REFERENCE.md` + `api/examples/`
**Seguridad:** `security/` + `compliance/`
**Operaciones:** `operations/` + `guides/`

---

## 📊 Status Proyecto

| Elemento | Estado | Actualización |
|----------|--------|----------------|
| Planificación | ✅ COMPLETA | 2025-10-21 |
| Fase 1: Requirements | ⏳ EN PROGRESO | - |
| Fase 2: Architecture | ⏳ PENDIENTE | - |
| Fase 3: Database | ⏳ PENDIENTE | - |
| Fase 4: Security | ⏳ PENDIENTE | - |
| Fases 5+: Implementation | ⏳ PENDIENTE | - |

---

## 📚 Documentos Referencias

### Inicio Recomendado
1. Este archivo (`README.md`) - Índice y navegación
2. `SYSTEM.md` - Descripción general del proyecto
3. `ARCHITECTURE_OVERVIEW.md` - Vista de 30 minutos
4. `VERSIONS.md` - Historial de versiones

### Por Necesidad
- **Estoy desarrollando:** Ve a `code/` según si es frontend/backend
- **Necesito entender arquitectura:** Ve a `architecture/`
- **Necesito hacer deploy:** Ve a `operations/DEPLOYMENT.md`
- **Necesito presupuesto:** Ve a `costs/COST_ANALYSIS.md`
- **Tengo preguntas:** Ve a `guides/FAQ.md`

---

## 🔄 Flujo de Documentación

Cada FASE completa su documentación:

1. **Fase 1 (Requirements)** → genera `requirements/`, `technical/`
2. **Fase 2 (Architecture)** → genera `architecture/`
3. **Fase 3 (Database)** → genera `database/`
4. **Fase 4 (Security)** → genera `security/`, `compliance/`
5. **Fase 5 (Design)** → genera `design/`
6. **Fases 6-8 (Code)** → genera `code/`
7. **Fase 9 (IA)** → genera `ai/`
8. **Fase 12 (Testing)** → genera `testing/`
9. **Fase 13 (Ops)** → genera `operations/`

Cada nueva fase **ACTUALIZA este README** con links a sus documentos.

---

## ✅ Checklist Documentación

Ir marcando a medida que se completa:

### Fase 1: Requirements & Scope
- [ ] `requirements/requirements.md`
- [ ] `requirements/user-stories.md`
- [ ] `requirements/scope.md`
- [ ] `requirements/risks.md`
- [ ] `requirements/stakeholders.md`
- [ ] `technical/stack-recommendation.md`

### Fase 2: Architecture Design
- [ ] `architecture/ARCHITECTURE.md`
- [ ] `architecture/STACK.md`
- [ ] `architecture/diagrams/system-architecture.md`
- [ ] `architecture/diagrams/layers.md`
- [ ] `architecture/diagrams/components.md`
- [ ] `architecture/decisions/ADR-001.md`
- [ ] `architecture/decisions/ADR-002.md`
- [ ] ...

### Fase 3: Database Design
- [ ] `database/DATABASE.md`
- [ ] `database/ERD.md`
- [ ] `database/MIGRATIONS.md`
- [ ] `database/INDEXING.md`
- [ ] `database/schema.prisma`

### Fase 4: Security & Compliance
- [ ] `security/SECURITY_PLAN.md`
- [ ] `security/THREAT_MODEL.md`
- [ ] `security/AUTH_DESIGN.md`
- [ ] `security/OWASP_REVIEW.md`
- [ ] `security/HEADERS.md`
- [ ] `compliance/COMPLIANCE.md`

### Fase 5: UI/UX Design System
- [ ] `design/DESIGN_SYSTEM.md`
- [ ] `design/COMPONENTS.md`
- [ ] `design/DESIGN_TOKENS.md`
- [ ] `design/ACCESSIBILITY.md`
- [ ] `design/wireframes/`
- [ ] `design/mockups/FIGMA_LINKS.md`
- [ ] `design/diagrams/component-structure.md`

### Fases 6-8: Implementation
- [ ] `code/IMPLEMENTATION.md`
- [ ] `code/FRONTEND_GUIDE.md`
- [ ] `code/BACKEND_GUIDE.md`
- [ ] `code/CODE_STANDARDS.md`
- [ ] `code/patterns/`

### Fase 9: IA/LLM Integration
- [ ] `ai/MODEL_SELECTION.md`
- [ ] `ai/INTEGRATION.md`
- [ ] `ai/AI_COSTS.md`
- [ ] `ai/prompts/SYSTEM_PROMPTS.md`
- [ ] `ai/prompts/PROMPT_GUIDE.md`

### Fase 12: Testing & QA
- [ ] `testing/TEST_PLAN.md`
- [ ] `testing/COVERAGE.md`
- [ ] `testing/QA_GUIDELINES.md`
- [ ] `testing/CODE_REVIEW.md`

### Fase 13: Deployment & Operations
- [ ] `operations/DEPLOYMENT.md`
- [ ] `operations/RUNBOOKS.md`
- [ ] `operations/TROUBLESHOOTING.md`
- [ ] `operations/MONITORING.md`
- [ ] `operations/scaling/SCALING_GUIDE.md`
- [ ] `operations/incident-response/procedures.md`

### Transversales
- [ ] `SYSTEM.md`
- [ ] `CHANGELOG.md`
- [ ] `ARCHITECTURE_OVERVIEW.md`
- [ ] `VERSIONS.md`
- [ ] `costs/COST_ANALYSIS.md`
- [ ] `costs/AI_COSTS.md`
- [ ] `costs/INFRASTRUCTURE_COSTS.md`
- [ ] `api/API_REFERENCE.md`
- [ ] `api/examples/`
- [ ] `guides/USER_GUIDE.md`
- [ ] `guides/DEVELOPER_GUIDE.md`
- [ ] `guides/ONBOARDING.md`
- [ ] `guides/CONTRIBUTING.md`
- [ ] `guides/FAQ.md`

---

## 📝 Notas Importantes

### Diferencia: `.claude/sys-docs/` vs `sys-docs/`

- **`.claude/sys-docs/`** = Documentación de la ORQUESTACIÓN de agentes (cómo trabajan los agentes especializados)
- **`sys-docs/`** = Documentación del PROYECTO (este directorio) - arquitectura, features, deployment

### Versionado

- `CHANGELOG.md` - Historial de todos los cambios
- `VERSIONS.md` - Control de versiones del proyecto
- Git tags para versiones estables

### Actualizaciones

Este README se actualiza **al completar cada fase**.

---

## 🔗 Enlaces Rápidos

- **Índice de fases:** Arriba ↑
- **Checklist de documentación:** Arriba ↑
- **Sistema completo:** `SYSTEM.md`
- **Arquitectura 30min:** `ARCHITECTURE_OVERVIEW.md`
- **Última versión:** `VERSIONS.md`
- **Cambios recientes:** `CHANGELOG.md`

---

**Estado:** 🟡 EN PLANIFICACIÓN
**Última actualización:** 2025-10-21
**Siguiente revisión:** End of Phase 1

| Elemento | Estado | Última Actualización |
|----------|--------|----------------------|
| Plan Ejecutivo | ✅ APROBADO | 2025-10-21 |
| Arquitectura | ⏳ EN DISEÑO | - |
| MVP Scope | ✅ DEFINIDO | 2025-10-21 |
| Presupuesto | ✅ ANALIZADO | 2025-10-21 |

---

## 🎯 Decisiones Finales Tomadas

### ✅ INCLUIDO EN MVP

1. ✅ Hub IA multiagente con RAG
2. ✅ Multi-usuario con RBAC
3. ✅ MCP integrations (Gmail, Notion, Slack, etc)
4. ✅ Generación de **imágenes** (DALL-E)
5. ✅ **Audio conversacional** con voice agents (OpenAI gpt-realtime)
6. ✅ Planes de suscripción (análisis + implementación futura)
7. ✅ APIs para terceros
8. ✅ Notificaciones y recordatorios
9. ✅ Storage como servicio (ya existe)
10. ✅ Agente Diseñador de Agentes (PRIMER AGENTE)
11. ✅ Chat interno tiempo-real
12. ✅ Sector de tareas del proyecto
13. ✅ Sistema de reporte de fallas (simple)
14. ✅ Developer Tier (para uso personal con costos visibles)
15. ✅ Artefactos guardados en BD + widgets de visualización

### ⏳ PHASE 2 (Después MVP)

1. ⏳ Generación de **video** (cuando Sora 2 sea estable)
2. ⏳ Generación de **audio** (cuando precios sean claros)
3. ⏳ Modelado 3D (futuro, cuando sea viable)
4. ⏳ PDF templates personalizables (UI builder custom)

### ❌ NO INCLUIDO

1. ❌ Modelado 3D en MVP
2. ❌ "Optional BD" por agente (siempre guarda, user controla)

---

## 💰 Presupuesto MVP

### Costo Total
- **MVP (solo tú):** $0/mes (everything free tier)
- **Beta (10 usuarios):** ~$150/mes
- **Growth (100 usuarios):** ~$900/mes

### Desglose Principal

| Servicio | Free Tier | Cost @ Scale |
|----------|-----------|--------------|
| Vercel (Next.js) | ✅ | $20-150 |
| Neon (PostgreSQL) | 0.5 GB | $14-500 |
| Pinecone (Vectors) | 1M | $10+ |
| Claude Sonnet 4.5 | Limitado | $3-15/$1M |
| Gemini 2.5 Flash | 1500 req/día | $0.0375/$0.15 |
| Vercel Blob | 100 GB | $5/100GB |
| Firebase | ✅ | $0-100 |
| Resend (Email) | 100 emails | $20/10k |

---

## 📅 Timeline MVP

```
SEMANA 1-2: FOUNDATION & DESIGN
├─ Requirements completo
├─ Architecture Design
├─ Database Schema
├─ UI/UX Design System
└─ Security baseline

SEMANA 3-4: CORE BACKEND
├─ Setup Vercel AI SDK + routing
├─ Primer agente: Agent Designer
├─ Chat funcional (Sonnet 4.5 + Gemini fallback)
├─ Pinecone RAG integration
└─ Notificaciones básicas

SEMANA 5-6: FRONTEND + MCP
├─ Dashboard UI completo
├─ MCP integrations (Gmail, Notion)
├─ Artifacts + widgets
├─ Storage + file sharing
└─ Admin panel básico

SEMANA 7-8: VOICE + POLISH
├─ Voice agents (OpenAI gpt-realtime)
├─ Imagen generation (DALL-E)
├─ Testing & QA
├─ Documentation
└─ MVP v1.0 Deploy

TOTAL: 8 SEMANAS = MVP PRODUCTIVO
```

---

## 🏗️ Stack Tecnológico FINAL

### Frontend (Ya tienes)
✅ Next.js 15 + React 19 + TypeScript
✅ Tailwind CSS 4 + shadcn/ui
✅ Zustand (state management)

### Backend
✅ Next.js API Routes
✅ **Vercel AI SDK** (abstracción multi-modelo)

### Databases
✅ Neon PostgreSQL (datos relacionales)
✅ **Pinecone** (vectores + RAG)
✅ Vercel Blob (archivos + media)
✅ Vercel KV (cache, si necesario)

### IA & Modelos (Multi-modelo)
🏆 **Claude Sonnet 4.5** (Anthropic) - PRIMARY
🥈 **Gemini 2.5 Flash** (Google) - BACKUP
🥉 **DeepSeek-R1** (DeepSeek) - REASONING
🎙️ **OpenAI gpt-realtime** - VOICE AGENTS
🎨 **DALL-E 3** - IMAGE GENERATION

### Auth & Security (Ya tienes)
✅ NextAuth v4.24.11
✅ Google OAuth + Email/Password
✅ JWT tokens

### Comunicación
✅ Firebase Cloud Messaging (notificaciones)
✅ Resend (email transaccional)
✅ Socket.io / SSE (chat real-time)

### MCP Integrations
✅ Gmail, Google Calendar
✅ Notion, Slack
✅ (Más en Phase 2)

---

## 🎯 Decisiones Arquitectónicas Clave

### 1. Multi-Modelo LLM con Routing Automático

En lugar de usar solo 1 modelo:
- **Claude Sonnet 4.5** para chat general
- **Gemini 2.5 Flash** para long-context (backup)
- **DeepSeek-R1** para reasoning pesado
- Sistema automático selecciona según complejidad + user tier

**Beneficio:** Costo optimizado + mejor rendimiento

### 2. RAG con Artifacts Centralizados

En lugar de "Asistente accede a todo":
- Cada agente genera **Artifacts** (datos estructurados)
- Artifacts van a tabla centralizada
- RAG indexa Artifacts en Pinecone
- Asistente accede contexto resumido

**Beneficio:** Escalable, sostenible, rápido

### 3. Voice Agents con OpenAI gpt-realtime

En lugar de TTS + ASR separados:
- OpenAI **gpt-realtime** para conversación por voz
- Streaming audio bidireccional
- Latencia mínima (<200ms)

**Beneficio:** UX conversacional natural

### 4. Artefactos con Widgets

Los agentes no solo generan texto:
- Generan **Artifacts** (JSON estructurado)
- Se guardan en BD
- Se visualizan en **Widgets** reutilizables
- Ej: Agente de proyectos → Widget de Kanban

**Beneficio:** Datos trabajando para el usuario

### 5. Developer Tier Personal

Tú como usuario tienes:
- Acceso a TODOS los features
- Costos visibles (sabes qué gastas)
- Dashboard de consumo real
- Esto se ofrece como ENTERPRISE a otros

**Beneficio:** Validación real de costos + feature showcase

---

## 📊 Matriz de Decisiones Finales

| Requisito | Decisión | Razón |
|-----------|----------|-------|
| Audio para agentes | ✅ INCLUIR | Conversacional + económico |
| Video generation | ⏳ PHASE 2 | Esperar a que Sora 2 estable |
| Modelado 3D | ❌ NO MVP | Aún no viable comercialmente |
| PDF templates | 📌 PRESETS | Plantillas predefinidas, UI builder Phase 2 |
| BD agentes | 🔄 ARTEFACTOS | Siempre guarda, user controla con Artifacts |
| Soporte técnico | 📌 SIMPLE | Chatbot + formulario reporte fallas |
| Licencia | 📜 PERMISIVA | Apache 2.0 + NDA para clientes |
| Planes pricing | ⏳ ANÁLISIS | Definir en detail cuando implementemos billing |

---

## 📚 Documentos por Fase

### Fase 1: Requirements & Scope
- `requirements/requirements.md` - Requisitos completos
- `requirements/user-stories.md` - User stories con AC
- `requirements/scope.md` - Alcance MVP
- `requirements/stakeholders.md` - Mapa de stakeholders

### Fase 2: Architecture Design
- `architecture/ARCHITECTURE.md` - Diseño completo
- `architecture/diagrams/system-architecture.md` - Diagrama general
- `architecture/diagrams/components.md` - Componentes
- `architecture/decisions/ADR-001.md` - Decisiones arquitectónicas

### Fase 3: Database Design
- `database/DATABASE.md` - Modelo de datos
- `database/ERD.md` - Entity-Relationship Diagram
- `database/MIGRATIONS.md` - Plan de migraciones

### Fase 4: Security & Compliance
- `security/SECURITY_PLAN.md` - Plan de seguridad
- `security/AUTH_DESIGN.md` - Auth/AuthZ design
- `security/THREAT_MODEL.md` - Análisis de amenazas

### Fase 5: UI/UX Design System
- `design/DESIGN_SYSTEM.md` - Sistema de diseño
- `design/COMPONENTS.md` - Librería de componentes
- `design/ACCESSIBILITY.md` - WCAG AA compliance

### Fases 6-8: Implementation
- `code/IMPLEMENTATION.md` - Guía general
- `code/FRONTEND_GUIDE.md` - Frontend specifics
- `code/BACKEND_GUIDE.md` - Backend specifics
- `code/CODE_STANDARDS.md` - Estándares

### Fase 9: IA/LLM Integration
- `ai/MODEL_SELECTION.md` - Selección de modelos
- `ai/INTEGRATION.md` - Integración técnica
- `ai/AI_COSTS.md` - Análisis de costos

### Fase 12: Testing & QA
- `testing/TEST_PLAN.md` - Plan de testing
- `testing/QA_GUIDELINES.md` - Guías de calidad

### Fase 13: Deployment & Operations
- `operations/DEPLOYMENT.md` - Guía de deployment
- `operations/MONITORING.md` - Monitoreo
- `operations/RUNBOOKS.md` - Runbooks

### Análisis Complementarios
- `costs/COST_ANALYSIS.md` - Análisis financiero completo
- `api/API_REFERENCE.md` - Documentación de API
- `guides/DEVELOPER_GUIDE.md` - Guía para devs

---

## 🔄 Flujo de Trabajo Documentación

1. **Cada fase genera documentación específica**
   - Arquitecto crea `architecture/`
   - Data architect crea `database/`
   - etc.

2. **Integración en este README**
   - Este archivo es índice maestro
   - Links a documentos específicos
   - Actualizar CHANGELOG con cada cambio

3. **Versionado**
   - `VERSIONS.md` para versiones del proyecto
   - `CHANGELOG.md` para histórico de cambios

---

## 📞 Referencias Rápidas

- **Stack Tecnológico:** Ver `technical/stack-recommendation.md`
- **Costos Detallados:** Ver `costs/COST_ANALYSIS.md`
- **Plan Ejecutivo:** Ver `EXECUTIVE_PLAN.md` ⭐
- **Arquitectura:** Ver `architecture/ARCHITECTURE.md`
- **API Completa:** Ver `api/API_REFERENCE.md`
- **Deployment:** Ver `operations/DEPLOYMENT.md`

---

## ✅ Checklist de Documentación

Mientras desarrollamos, marcar como completado:

- [ ] Fase 1: Requirements completos
- [ ] Fase 2: Architecture Design
- [ ] Fase 3: Database Design
- [ ] Fase 4: Security Plan
- [ ] Fase 5: Design System
- [ ] Fases 6-8: Implementation Guides
- [ ] Fase 9: AI Integration docs
- [ ] Fase 12: Testing reports
- [ ] Fase 13: Deployment guide
- [ ] API documentación completa
- [ ] Guías de usuario

---

## 📌 Notas Importantes

### Sobre `.claude/` vs `sys-docs/`

- **`.claude/sys-docs/`** → Documentación de la ORQUESTACIÓN de agentes (cómo trabajan juntos)
- **`sys-docs/`** → Documentación del PROYECTO (arquitectura, features, deployment)

Este archivo está en `sys-docs/` porque documenta el PROYECTO.

### Actualizaciones

Este README se actualiza con cada fase completada. Ver `CHANGELOG.md` para histórico.

---

## 🚀 ¿Qué Sigue?

Próximos pasos:
1. ✅ Este README creado
2. ⏳ Crear `EXECUTIVE_PLAN.md` (plan definitivo)
3. ⏳ Iniciar Fase 1: Requirements completos
4. ⏳ Fase 2: Architecture Design
5. ⏳ Y seguir con cada fase...

---

**Última actualización:** 2025-10-21
**Versión:** 0.1 (MVP Planning)
**Estado:** 🟡 EN PLANIFICACIÓN

🎯 **¡Comenzamos!**

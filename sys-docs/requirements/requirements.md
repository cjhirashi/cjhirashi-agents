# 📋 Especificación de Requisitos - cjhirashi-agents MVP

**Estado:** ✅ APROBADO
**Versión:** 1.0
**Fecha:** 2025-10-21
**Propietario:** Planner / Equipo
**Última Actualización:** 2025-10-21
**Próxima Revisión:** End of Week 2

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Requisitos Funcionales (FR)](#requisitos-funcionales)
   - [FR-1 a FR-9 por Categoría](#categorías-de-requisitos)
3. [Requisitos No Funcionales (RNF)](#requisitos-no-funcionales)
4. [Criterios de Aceptación](#criterios-de-aceptación)
5. [Restricciones & Dependencias](#restricciones--dependencias)
6. [Referencias Cruzadas](#referencias-cruzadas)

---

## Descripción General

Este documento especifica los **45+ requisitos funcionales** y **6 categorías no-funcionales** para el MVP de **cjhirashi-agents**, una plataforma centralizada de agentes IA multiagentes, multimodal, con capacidades RAG, integración MCP y soporte para múltiples modelos LLM.

### Propósito del Producto
- Proporcionar un **hub unificado** de herramientas IA especializadas
- Permitir al usuario acceso a **datos personales vía RAG**
- Facilitar **experimentación rápida** con nuevos agentes
- Ofrecer un **modelo de negocio sostenible** (Developer Tier con costos visibles)

### Objetivos de Éxito (MVP)
- Herramienta personal poderosa: Multiagente con 3-5 agentes iniciales
- Negocio viable: Márgenes 60-75%, escalable a 10k usuarios
- MVP cost CERO: Utilizar free tiers de todos los servicios
- Innovación rápida: Agent Designer permite crear agentes sin código

---

## Categorías de Requisitos

### FR-1: Hub Centralizado IA (4 Requisitos)

#### FR-1.1 - Plataforma Multiagente
**Prioridad:** P0 | **Complejidad:** L

Gestión centralizada de múltiples agentes IA especializados.

**Requisitos:**
- 3-5 agentes activos en MVP (expandible)
- Selector visual en dashboard
- Persistencia de estado por conversación
- <100ms latencia en cambio de agente
- Soporte para agregar agentes sin redeploy

**Criterios de Aceptación:**
- [ ] Usuario puede seleccionar agente desde dropdown
- [ ] Sistema mantiene sesiones independientes
- [ ] Cambio entre agentes preserva historial
- [ ] Cada agente tiene descripción y capacidades claras
- [ ] Máximo 100ms latencia en cambio

---

#### FR-1.2 - Capacidades Multimodal
**Prioridad:** P0 | **Complejidad:** L

Soporte para texto, imagen, audio en conversaciones.

**Requisitos:**
- Input: texto, imágenes, audio
- Output: texto, imágenes, audio conversacional
- Conversión automática entre formatos
- Streaming de respuestas largas
- Cache de respuestas similares

**Criterios de Aceptación:**
- [ ] Usuario puede enviar imagen y recibir análisis
- [ ] Sistema genera imágenes bajo demanda (DALL-E)
- [ ] Voice agent responde en <500ms
- [ ] Streaming visible en UI
- [ ] Sin pérdida de calidad en conversión

---

#### FR-1.3 - RAG (Retrieval Augmented Generation)
**Prioridad:** P0 | **Complejidad:** L

Búsqueda semántica en base de conocimiento del usuario.

**Requisitos:**
- Indexación de conversaciones en Pinecone
- Búsqueda semántica de documentos
- Integración automática en contexto
- Filtrado por fecha y metadatos
- Re-ranking por relevancia

**Criterios de Aceptación:**
- [ ] Agente puede citar fuentes de información
- [ ] Búsqueda devuelve resultados relevantes (>80%)
- [ ] Indexación de artifacts en <5s
- [ ] Usuario ve qué información fue usada
- [ ] Query tiempo máximo: 2s

---

#### FR-1.4 - Artifacts & Widgets
**Prioridad:** P0 | **Complejidad:** M

Crear, almacenar y visualizar artefactos con componentes visuales.

**Requisitos:**
- Crear artifacts desde conversación (código, JSON, HTML, etc.)
- Guardar artifacts con versionado
- Widgets para visualizar datos
- Compartir via URL temporal (24h)
- Edición en-line y exportación

**Criterios de Aceptación:**
- [ ] Usuario crea artifact en <1 minuto
- [ ] Widgets se renderizan correctamente
- [ ] Links compartidos expiran en 24h
- [ ] Exportar a JSON, CSV, PDF
- [ ] <500ms creación artifact

---

### FR-2: Gestión Multi-Usuario (3 Requisitos)

#### FR-2.1 - Sistema RBAC
**Prioridad:** P0 | **Complejidad:** M

Control de acceso basado en 4 roles.

**Requisitos:**
- **SUPER_ADMIN:** Control total del sistema
- **ADMIN:** Gestión de usuarios y permisos
- **USER:** Acceso según tier
- **INVITED:** Acceso limitado (pay-as-you-go)

**Estructura de Permisos:**
```
SUPER_ADMIN → Ver/editar usuarios, control facturación
ADMIN → Crear/eliminar usuarios, dashboard global
USER → Acceso a agentes según tier
INVITED → Read-only, sin features premium
```

**Criterios de Aceptación:**
- [ ] Sistema verifica rol antes de operaciones sensibles
- [ ] Transiciones registradas en audit log
- [ ] Usuario no puede escalar permisos
- [ ] <50ms check de permisos
- [ ] API rechaza operaciones no autorizadas (403)

---

#### FR-2.2 - Tiers de Suscripción
**Prioridad:** P0 | **Complejidad:** M

Múltiples tiers con límites y features.

**Tiers:**
- **FREE:** 1 agente, 50 img/mes, 5 GB storage, 100 conversaciones/mes
- **CORE ($15/mes):** Todos agentes, 50 img/mes, 10 GB, ilimitado
- **PRO ($49/mes):** Todo CORE + 500 img/mes, 50 GB, API access
- **DEVELOPER (Personal):** Todas features, costos visibles, ilimitado

**Criterios de Aceptación:**
- [ ] Sistema valida tier del usuario
- [ ] Límites se aplican correctamente
- [ ] Upgrade/downgrade es instantáneo
- [ ] Facturación calcula correctamente
- [ ] Free tier tiene suficiente valor

---

#### FR-2.3 - Multi-Tenant Architecture
**Prioridad:** P0 | **Complejidad:** L

Múltiples usuarios con datos completamente aislados.

**Requisitos:**
- Cada usuario tiene workspace aislado
- Datos no visibles entre usuarios
- Storage separado por usuario
- Vector DB particionado por user_id
- Conexiones PostgreSQL limitadas

**Criterios de Aceptación:**
- [ ] Usuario A NO puede ver datos de Usuario B
- [ ] Queries incluyen siempre user_id filter
- [ ] Eliminación de usuario no afecta otros
- [ ] Tests de isolation pasan 100%
- [ ] <5% overhead latencia

---

### FR-3: Chat & Agent Design (2 Requisitos)

#### FR-3.1 - Agent Designer (Editor Visual)
**Prioridad:** P0 | **Complejidad:** M

Sistema para crear agentes mediante interfaz visual sin código.

**Requisitos:**
- Formulario visual: nombre, descripción, rol, modelo
- Validación en tiempo real del prompt
- Vista previa antes de publicar
- Guardar como borrador o publicar
- Edición y versionado de agentes

**Criterios de Aceptación:**
- [ ] Usuario crea agente en <5 minutos
- [ ] Validación detecta prompts inválidos
- [ ] Agente aparece en lista en <1s
- [ ] Cambios no afectan agentes en uso
- [ ] Versiones anteriores son recuperables

---

#### FR-3.2 - Chat Real-Time
**Prioridad:** P0 | **Complejidad:** M

Interfaz de chat bidireccional en tiempo real.

**Requisitos:**
- Input: texto, imágenes, audio
- Output: texto streaming, imágenes, audio
- Typing indicators
- Cancelar respuesta en progreso
- Guardar todas conversaciones
- Historial searchable
- Exportar a PDF/JSON
- React a mensajes (emoji, útil/no útil)

**Criterios de Aceptación:**
- [ ] Mensajes se envían en <100ms
- [ ] Streaming visible en UI
- [ ] Cancelar detiene en <500ms
- [ ] Historial searchable
- [ ] Exportar genera documento válido

---

### FR-4: Generación de Contenido (2 Requisitos)

#### FR-4.1 - Image Generation (DALL-E 3)
**Prioridad:** P0 | **Complejidad:** M

Generar imágenes de alta calidad.

**Requisitos:**
- Acceso a DALL-E 3
- Múltiples tamaños (1024x1024, 1024x1792, 1792x1024)
- Calidad: ultra o standard
- Guardar en Vercel Blob
- Historial de imágenes
- Contador de uso por tier

**Límites por Tier:**
- FREE: 50/mes
- CORE: 50/mes
- PRO: 500/mes
- DEVELOPER: Ilimitado (costos visibles)

**Criterios de Aceptación:**
- [ ] Generación completa en <30s
- [ ] Imágenes guardadas con metadata
- [ ] Contador exacto
- [ ] Exceso rechaza con mensaje claro
- [ ] Costo visible por imagen

---

#### FR-4.2 - Audio Conversacional (gpt-realtime)
**Prioridad:** P0 | **Complejidad:** M

Voice agents con conversación bidireccional.

**Requisitos:**
- Entrada: audio stream (micrófono)
- Salida: audio stream (respuesta)
- Latencia: <200ms (preferencia: <100ms)
- Múltiples idiomas
- Control de volumen y velocidad
- Transcripción visible en UI
- Grabación para audit
- Costo tracking

**Criterios de Aceptación:**
- [ ] Usuario inicia conversación de voz
- [ ] Latencia medida <200ms promedio
- [ ] Transcripción en tiempo real
- [ ] Audio guardado correctamente
- [ ] Sesión puede reanudarse si desconecta

---

### FR-5: MCP Integrations (3 Requisitos)

#### FR-5.1 - Gmail Integration
**Prioridad:** P1 | **Complejidad:** M

Lectura, búsqueda y envío de emails.

**Requisitos:**
- OAuth 2.0 seguro
- Leer últimos 100 emails
- Buscar por remitente, asunto, fecha
- Enviar emails
- Crear borradores
- Tokens encriptados en BD

**Rate Limiting:** 10 operaciones/minuto

**Criterios de Aceptación:**
- [ ] User conecta Gmail sin dejar claves en texto
- [ ] Agente lee emails históricos
- [ ] Búsqueda devuelve correctos
- [ ] Envío exitoso
- [ ] Desconexión revoca acceso inmediatamente

---

#### FR-5.2 - Google Calendar Integration
**Prioridad:** P1 | **Complejidad:** M

Lectura, búsqueda y creación de eventos.

**Requisitos:**
- OAuth 2.0 seguro
- Leer calendarios y eventos
- Crear eventos
- Actualizar eventos
- Buscar por fecha y término
- Timezone support automático
- Notificaciones de eventos próximos

**Rate Limiting:** 10 operaciones/minuto

**Criterios de Aceptación:**
- [ ] Usuario conecta múltiples calendarios
- [ ] Agente crea evento con attendees
- [ ] Búsqueda funciona
- [ ] Timezone correcto
- [ ] Actualizaciones se reflejan

---

#### FR-5.3 - Notion Integration
**Prioridad:** P1 | **Complejidad:** M

Query de BD de Notion y creación de páginas.

**Requisitos:**
- OAuth 2.0 seguro
- Listar bases de datos
- Query con filtros
- Crear páginas
- Actualizar propiedades
- Buscar por nombre/contenido

**Rate Limiting:** 3 operaciones/segundo

**Criterios de Aceptación:**
- [ ] Usuario conecta Notion workspace
- [ ] Agente query a BD específica
- [ ] Filtros complejos funcionan
- [ ] Nueva página en Notion
- [ ] Metadata sincronizada

---

### FR-6: Notificaciones & Storage (2 Requisitos)

#### FR-6.1 - Sistema de Notificaciones
**Prioridad:** P1 | **Complejidad:** M

Notificaciones usando Firebase Cloud Messaging.

**Tipos:**
- Respuesta de agente completada
- Alerta de límite alcanzado
- Error en operación
- Tareas asignadas
- Recordatorios

**Delivery Channels:**
- Push notifications
- In-app banner
- Email (críticas)

**Preferencias:**
- Qué recibir
- Horarios de silencio
- Destino

**Criterios de Aceptación:**
- [ ] Notificación en <5s después de evento
- [ ] Usuario puede deshabilitar tipos
- [ ] Quiet hours respetadas
- [ ] Historial searchable
- [ ] Delivery exitoso confirmado

---

#### FR-6.2 - Storage Servicio (Vercel Blob)
**Prioridad:** P1 | **Complejidad:** M

Almacenamiento de archivos y media.

**Límites por Tier:**
- FREE: 500 MB
- CORE: 5 GB
- PRO: 50 GB

**Operaciones:**
- Upload con progress
- Download
- Delete
- Compartir con link temporal (24h)
- Compartir via email
- Integración con RAG

**Criterios de Aceptación:**
- [ ] Upload exitoso
- [ ] Límite validado
- [ ] Link compartido expira
- [ ] Agente accede documento
- [ ] Documento indexado en RAG

---

### FR-7: Métricas & Dashboard (2 Requisitos)

#### FR-7.1 - Dashboard de Usuario
**Prioridad:** P1 | **Complejidad:** M

Dashboard personal con consumo y costos.

**Métricas:**
- Total conversaciones este mes
- Tokens consumidos
- Costo estimado
- Imágenes generadas
- Storage usado
- MCP integrations

**Gráficos:**
- Consumo por día (30 días)
- Consumo por agente
- Consumo por feature

**Alertas:**
- Acercándose al límite tier
- Feature no disponible

**Criterios de Aceptación:**
- [ ] Números exactos
- [ ] Gráficos en <2s
- [ ] Alertas correctas y oportunas
- [ ] Exportación válida
- [ ] Predicción razonable

---

#### FR-7.2 - Dashboard Admin (Global)
**Prioridad:** P1 | **Complejidad:** L

Dashboard con visibilidad global y financiero.

**Métricas Globales:**
- Total usuarios por tier
- Costo total operaciones
- Ingresos (si hay usuarios pago)
- Margen de ganancia
- Usuarios activos 24h

**Por Usuario:**
- Actividad (última acción)
- Tier actual
- Consumo mes
- Deuda (si aplica)

**Alertas:**
- Errores frecuentes
- Operaciones fallidas
- Comportamiento sospechoso
- Límites approaching

**Auditoría:**
- Log de cambios
- Operaciones admin
- Cambios de rol

**Criterios de Aceptación:**
- [ ] Solo ADMIN/SUPER_ADMIN acceso
- [ ] Números exactos
- [ ] Alertas se disparan
- [ ] Logs completos
- [ ] <3s incluso 1000+ usuarios

---

### FR-8: Sector Tareas & Reportes (2 Requisitos)

#### FR-8.1 - Task Sector (Gestión de Tareas)
**Prioridad:** P1 | **Complejidad:** M

Gestionar tareas, asignarlas y tracking de progreso.

**Estructura:**
- Título y descripción
- Prioridad (P0, P1, P2, P3)
- Status (To Do, In Progress, Done, Blocked)
- Asignación a usuario o agente
- Fecha de vencimiento
- Etiquetas personalizadas

**Operaciones:**
- Crear tarea
- Asignar
- Cambiar status
- Agregar comentarios
- Adjuntar archivos

**Vistas:**
- Tablero Kanban
- Lista con filtros
- Timeline (Gantt-like)
- Mi work

**Automatización:**
- Crear desde agente
- Notificar cuando asignada
- Recordar antes vencimiento

**Criterios de Aceptación:**
- [ ] Crear en <1 minuto
- [ ] Kanban responsive
- [ ] Cambio status instantáneo
- [ ] Notificaciones correctas
- [ ] Filtros funcionan

---

#### FR-8.2 - Bug Report System
**Prioridad:** P1 | **Complejidad:** M

Reportar errores con diagnóstico automático.

**Formulario:**
- Descripción del problema
- Pasos para reproducir
- Screenshot opcional
- Información del sistema
- Prioridad percibida

**Chatbot Diagnóstico:**
- Hacer preguntas
- Sugerir soluciones
- Recopilar logs

**Escalación Automática:**
- Critical → SUPER_ADMIN inmediatamente
- High → ADMIN en <1 hora
- Medium → revisión manual

**Tracking:**
- Usuario ve status
- Actualización cuando resuelve
- Link a issue tracker

**Criterios de Aceptación:**
- [ ] Reporte enviado
- [ ] Chatbot funciona
- [ ] Escalación inmediata para críticos
- [ ] Usuario recibe actualizaciones
- [ ] 90% bugs identificables

---

### FR-9: APIs para Terceros (1 Requisito)

#### FR-9.1 - Developer API
**Prioridad:** P1 | **Complejidad:** L

API RESTful para que terceras accedan a datos (read-only inicialmente).

**Autenticación:**
- API key por usuario
- Rotación de keys
- Revocación inmediata

**Endpoints Principales:**
- GET /api/v1/conversations
- GET /api/v1/artifacts
- GET /api/v1/usage
- GET /api/v1/agents
- POST /api/v1/chat (Future)

**Rate Limiting:**
- 100 req/min default
- PRO: 1000 req/min
- Throttling 429

**Documentación:**
- OpenAPI/Swagger spec
- Ejemplos multilenguaje
- Error handling guide

**Webhooks:**
- Evento: artifact creado
- Evento: conversación completada
- Delivery con retry

**Criterios de Aceptación:**
- [ ] Autenticación correcta
- [ ] Rate limits aplicados
- [ ] Documentación completa
- [ ] Ejemplos funcionan
- [ ] Webhooks exitosos

---

## Requisitos No Funcionales

### RNF-1: Rendimiento

| Métrica | Objetivo | Prioridad |
|---------|----------|-----------|
| Latencia chat | <2s promedio | P0 |
| Dashboard load | <3s | P0 |
| API response | <200ms p95 | P0 |
| Voice latency | <200ms | P1 |
| Streaming delay | <500ms | P1 |
| Upload file | <10s para 10MB | P1 |
| Indexación | <5s por documento | P1 |
| Búsqueda | <2s | P1 |

---

### RNF-2: Escalabilidad

| Métrica | Objetivo | Prioridad |
|---------|----------|-----------|
| Usuarios concurrentes | 1000+ | P0 |
| Conversaciones/día | 100k+ | P0 |
| Storage total | 10TB+ | P1 |
| Requests/segundo | 10k+ | P0 |
| Vector DB | 10M+ embeddings | P1 |
| Conexiones DB | 20-100+ pooled | P1 |

---

### RNF-3: Confiabilidad

| Métrica | Objetivo | Prioridad |
|---------|----------|-----------|
| Uptime | 99.5% | P0 |
| MTTR | <30 minutos | P0 |
| Pérdida de datos | 0% (backup diario) | P0 |
| Error rate | <0.1% | P1 |
| Retry success | >95% | P1 |
| Backup frecuencia | Diario | P0 |

---

### RNF-4: Seguridad

| Requisito | Detalle | Prioridad |
|-----------|---------|-----------|
| Autenticación | OAuth 2.0 + JWT | P0 |
| Encriptación tránsito | TLS 1.3 | P0 |
| Encriptación reposo | AES-256 para tokens | P0 |
| RBAC | 4 roles con permisos | P0 |
| Audit logging | Operaciones sensibles | P0 |
| Rate limiting | Anti-abuse | P1 |
| XSS protection | Content Security Policy | P0 |
| CSRF protection | Tokens CSRF | P0 |
| MFA | TOTP support | P1 |
| API key hashing | SHA-256 | P0 |

---

### RNF-5: Mantenibilidad

| Requisito | Detalle | Prioridad |
|-----------|---------|-----------|
| Documentación | API docs + runbooks | P0 |
| Code quality | 80%+ test coverage | P1 |
| Logging | Structured logs JSON | P0 |
| Monitoring | Metrics + alerts | P0 |
| Error tracking | Sentry integration | P1 |
| Backups BD | Diario, 30 días | P0 |

---

### RNF-6: Compatibilidad

| Requisito | Detalle | Prioridad |
|-----------|---------|-----------|
| Navegadores | Chrome, Firefox, Safari, Edge (últimas 2 versiones) | P0 |
| Dispositivos | Desktop, Tablet, Mobile | P0 |
| APIs terceras | Gmail, Calendar, Notion, OpenAI, Anthropic | P0 |
| Sistema operativo | Windows, macOS, Linux | P1 |

---

## Criterios de Aceptación Globales

### Por Feature (Todos deben cumplir)

- [ ] Especificación de requisitos aprobada
- [ ] Implementación 100% completa
- [ ] Tests pasan (>80% cobertura)
- [ ] Code review aprobado
- [ ] Documentación actualizada
- [ ] Integración exitosa
- [ ] Performance meets targets
- [ ] Security audit passed
- [ ] Usuario final aprobó
- [ ] Producción-ready

### Por Sprint

- [ ] Todas las tareas completadas
- [ ] No bugs críticos (P0)
- [ ] Documentación actualizada
- [ ] Tests sin errores
- [ ] Performance dentro objetivos
- [ ] Rollback plan documentado

### Pre-MVP (Antes v1.0 release)

- [ ] 15 features implementadas
- [ ] 3-5 agentes funcionales
- [ ] Multi-usuario con RBAC
- [ ] MCP integraciones (Gmail, Calendar, Notion)
- [ ] RAG indexando
- [ ] Imagen y audio generation
- [ ] Dashboard admin completo
- [ ] APIs documentadas y testeadas
- [ ] Security audit passed
- [ ] Documentación completa
- [ ] 0 bugs críticos
- [ ] Costo MVP < $15/mes

---

## Restricciones & Dependencias

### Restricciones Técnicas

1. **Free tier limits:**
   - Neon PostgreSQL: 0.5 GB inicial
   - Pinecone: 1M vectors
   - Vercel Blob: 100 GB
   - Impacto: Limita usuarios fase MVP

2. **Límites de rate de APIs externas:**
   - OpenAI (DALL-E, gpt-realtime)
   - Gmail: 5k requests/día
   - Google Calendar: 500 requests/100s
   - Mitigation: Queue y caching

3. **Latencia de voz (<200ms):**
   - Infraestructura cercana necesaria
   - Puede requerir CDN geo-distribuida

### Dependencias Externas

| Servicio | Función | Criticidad | Risk |
|----------|---------|-----------|------|
| Vercel | Hosting + Edge Functions | P0 | Bajo |
| PostgreSQL (Neon) | Data storage | P0 | Bajo |
| Pinecone | Vector DB | P0 | Medio |
| OpenAI | DALL-E, gpt-realtime | P0 | Medio (precios) |
| Anthropic Claude | Chat LLM | P0 | Bajo |
| Google | OAuth, APIs | P0 | Bajo |
| Firebase | Notificaciones | P1 | Bajo |
| Vercel Blob | Storage archivos | P1 | Bajo |

---

## Referencias Cruzadas

### Documentos Relacionados

- [EXECUTIVE_PLAN.md](../EXECUTIVE_PLAN.md) - Plan ejecutivo del proyecto
- [user-stories.md](./user-stories.md) - Historias de usuario detalladas
- [scope.md](./scope.md) - Definición de alcance MVP
- [risks.md](./risks.md) - Registro de riesgos identificados
- [stakeholders.md](./stakeholders.md) - Mapa de stakeholders

### Mapeo a Features MVP

| FR | Feature | Prioridad | Status |
|----|---------|-----------|--------|
| FR-1.1, 1.2, 1.3, 1.4 | Hub IA multiagente | P0 | Requisitos |
| FR-2.1, 2.2, 2.3 | Multi-usuario + RBAC | P0 | Requisitos |
| FR-3.1, 3.2 | Chat & Agent Design | P0 | Requisitos |
| FR-4.1 | Image Generation | P0 | Requisitos |
| FR-4.2 | Audio conversacional | P0 | Requisitos |
| FR-5.1, 5.2, 5.3 | MCP Integrations | P1 | Requisitos |
| FR-6.1, 6.2 | Notificaciones & Storage | P1 | Requisitos |
| FR-7.1, 7.2 | Métricas & Dashboard | P1 | Requisitos |
| FR-8.1, 8.2 | Sector Tareas & Reportes | P1 | Requisitos |
| FR-9.1 | APIs para Terceros | P1 | Requisitos |

---

## Historial de Cambios

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0 | 2025-10-21 | Documento inicial, FR-1 a FR-9 especificadas | Planner |
| | | 45+ requisitos funcionales | |
| | | 6 categorías no-funcionales | |
| | | Criterios de aceptación definidos | |

---

**Estado:** ✅ APROBADO
**Última Actualización:** 2025-10-21
**Próxima Revisión:** End of Week 2 (post-architecture review)
**Propietario:** Planner / Team

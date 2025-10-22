# 👥 Historias de Usuario - cjhirashi-agents MVP

**Estado:** ✅ APROBADO
**Versión:** 1.0
**Fecha:** 2025-10-21
**Propietario:** Planner / Equipo
**Total Historias:** 32+
**Última Actualización:** 2025-10-21

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Definición de Roles](#definición-de-roles)
3. [Historias por Categoría](#historias-por-categoría)
4. [Matriz de Prioridad](#matriz-de-prioridad)
5. [Mapeo a Requisitos](#mapeo-a-requisitos)

---

## Introducción

Las historias de usuario describen desde la perspectiva del usuario final qué funcionalidades son necesarias y por qué. Cada historia sigue el formato:

```
Como [rol], quiero [feature], para que [beneficio/objetivo]

Criterios de Aceptación:
- [ ] Criterio 1
- [ ] Criterio 2
```

**Prioridad:**
- P0: Crítica (MVP debe incluir)
- P1: Alta (MVP muy deseado)
- P2: Media (Phase 2)
- P3: Baja (Futuro)

**Complejidad:**
- S: Small (1-2 días)
- M: Medium (3-5 días)
- L: Large (1-2 semanas)

---

## Definición de Roles

### Charlie (Developer/Product Owner)
- Rol principal, usuario del MVP
- Experimenta con agentes IA
- Acceso a Developer Tier (todas features, costos visibles)
- Usa Agent Designer para crear agentes personalizados

### SuperAdmin
- Control total del sistema
- Gestión de usuarios y facturación
- Acceso a todos los datos (con restricciones GDPR)

### Admin
- Gestión de usuarios del workspace
- Dashboard global de uso
- Responder reportes de bugs

### Usuario Regular
- Acceso a agentes según tier (CORE/PRO)
- Puede crear/editar artifacts
- Usar MCP integrations

### Usuario Invitado
- Acceso limitado (pay-as-you-go)
- Read-only a ciertos agentes
- No features premium

---

## Historias por Categoría

### CATEGORÍA 1: Hub Centralizado IA

#### US-1.1: Acceder al Hub de Agentes
**Prioridad:** P0 | **Complejidad:** S | **Rol:** Charlie

Como Charlie, quiero ver un dashboard con todos los agentes disponibles, para que pueda seleccionar cuál usar rápidamente.

**Criterios de Aceptación:**
- [ ] Dashboard muestra 3-5 agentes activos
- [ ] Cada agente tiene icon, nombre, descripción
- [ ] Puedo seleccionar agente en <500ms
- [ ] Selección no pierde historial anterior
- [ ] Interfaz responsive en mobile/tablet/desktop

**Tareas:**
- Diseñar UI dashboard
- Implementar selector de agentes
- Endpoint para listar agentes activos

---

#### US-1.2: Iniciar Conversación con Agente
**Prioridad:** P0 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero chatear con agente seleccionado usando texto o imagen, para que pueda obtener respuestas rápidamente.

**Criterios de Aceptación:**
- [ ] Puedo escribir mensaje y enviar en <100ms
- [ ] Recibo respuesta streaming token por token
- [ ] Puedo enviar imagen y agente analiza
- [ ] Puedo detener generación
- [ ] Historial se guarda automáticamente
- [ ] Puedo copiar/borrar mensajes

**Tareas:**
- Chat UI con streaming
- Soporte multimodal (imagen)
- Persistencia de historial

---

#### US-1.3: Usar Agentes con RAG
**Prioridad:** P0 | **Complejidad:** L | **Rol:** Charlie

Como Charlie, quiero que agentes accedan a mis documentos personales vía RAG, para que tengan contexto de mi información.

**Criterios de Aceptación:**
- [ ] Puedo subir documentos (PDF, DOCX, MD)
- [ ] Documentos se indexan en vector DB
- [ ] Agente cita fuentes cuando usa documentos
- [ ] Búsqueda devuelve resultados relevantes
- [ ] Latencia <2s en búsqueda

**Tareas:**
- Upload y parsing de documentos
- Indexación en Pinecone
- Integration con agent context

---

#### US-1.4: Generar y Guardar Artifacts
**Prioridad:** P0 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero guardar artifacts (código, datos, reportes) que genera el agente, para que pueda reutilizar después.

**Criterios de Aceptación:**
- [ ] Agente sugiere crear artifact
- [ ] Artifact se guarda con metadata
- [ ] Puedo ver historial de artifacts
- [ ] Puedo exportar (JSON, CSV, PDF)
- [ ] Puedo compartir con link temporal (24h)

**Tareas:**
- Artifact creation workflow
- Storage en Vercel Blob
- Export functionality

---

### CATEGORÍA 2: Agent Designer (Innovación)

#### US-2.1: Crear Agente Personalizado
**Prioridad:** P0 | **Complejidad:** L | **Rol:** Charlie

Como Charlie, quiero crear agente personalizado sin código mediante formulario visual, para que pueda experimentar rápidamente.

**Criterios de Aceptación:**
- [ ] Formulario: nombre, descripción, rol, modelo
- [ ] Validación en tiempo real
- [ ] Preview del agente antes de publicar
- [ ] Guardar como borrador o publicar
- [ ] Toma <5 minutos crear

**Tareas:**
- Agent Designer UI
- Validación de prompt
- Publicación de agentes

---

#### US-2.2: Configurar Capabilities del Agente
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero configurar qué tools/capabilities tiene el agente, para que acceda solo a lo necesario.

**Criterios de Aceptación:**
- [ ] Selector visual de tools (RAG, MCP, Image Gen, etc.)
- [ ] Preview de capabilities disponibles
- [ ] Guardar configuración
- [ ] Activar/desactivar tools

**Tareas:**
- Tools selector UI
- Capability configuration endpoint
- Validation logic

---

#### US-2.3: Testear Agente Antes Publicar
**Prioridad:** P1 | **Complejidad:** S | **Rol:** Charlie

Como Charlie, quiero probar agente con datos reales antes de publicar, para validar que funciona.

**Criterios de Aceptación:**
- [ ] Test mode con ejemplos
- [ ] Ver respuestas del agente
- [ ] Modificar parámetros rápidamente
- [ ] Guardar mejores configuraciones

**Tareas:**
- Test mode interface
- Parameter adjustment
- Results preview

---

### CATEGORÍA 3: RAG & Documentos

#### US-3.1: Subir Base de Conocimiento
**Prioridad:** P0 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero subir documentos para crear base de conocimiento, para que agentes tengan contexto.

**Criterios de Aceptación:**
- [ ] Soporte: PDF, DOCX, MD, CSV, JSON
- [ ] Drag-and-drop upload
- [ ] Máximo 10 archivos simultáneos
- [ ] Progress bar visible
- [ ] Validación de formato
- [ ] Error claro si archivo inválido

**Tareas:**
- File upload UI
- Document validation
- Storage en Vercel Blob

---

#### US-3.2: Indexar Documentos en Vector DB
**Prioridad:** P0 | **Complejidad:** L | **Rol:** Sistema

Como Sistema, quiero indexar documentos en vector DB, para que búsqueda semántica funcione.

**Criterios de Aceptación:**
- [ ] Chunking en boundaries semánticos
- [ ] Embeddings generados vía OpenAI
- [ ] Metadata (source, page, timestamp)
- [ ] Indexación <5s por documento
- [ ] Re-indexación si documento actualizado

**Tareas:**
- Text chunking logic
- Embedding generation
- Pinecone integration

---

#### US-3.3: Buscar en Base de Conocimiento
**Prioridad:** P0 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero buscar mis documentos usando lenguaje natural, para encontrar información rápido.

**Criterios de Aceptación:**
- [ ] Búsqueda semántica (cosine similarity)
- [ ] Top-5 resultados por default
- [ ] Scores de relevancia visibles
- [ ] Filtrar por documento/fecha/metadata
- [ ] Latencia <500ms

**Tareas:**
- Search UI
- Pinecone query endpoint
- Results ranking

---

#### US-3.4: Gestionar Colecciones de Documentos
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero organizar documentos en colecciones, para mantener orden.

**Criterios de Aceptación:**
- [ ] Crear múltiples colecciones
- [ ] Mover documentos entre colecciones
- [ ] Ver estadísticas (tamaño, # documentos)
- [ ] Eliminar colección
- [ ] Asignar colección a agentes

**Tareas:**
- Collections management UI
- Database schema updates
- API endpoints

---

### CATEGORÍA 4: Chat Real-Time

#### US-4.1: Chatear en Tiempo Real
**Prioridad:** P0 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero conversar con agente en tiempo real con respuestas streaming, para obtener feedback inmediato.

**Criterios de Aceptación:**
- [ ] Streaming token-por-token visible
- [ ] Typing indicators
- [ ] Puedo cancelar generación
- [ ] Markdown rendering (código, listas, etc.)
- [ ] Copy button en cada mensaje

**Tareas:**
- Streaming UI
- WebSocket/SSE setup
- Message cancellation logic

---

#### US-4.2: Proporcionar Feedback
**Prioridad:** P1 | **Complejidad:** S | **Rol:** Charlie

Como Charlie, quiero reaccionar a mensajes (thumbs up/down), para ayudar mejorar el modelo.

**Criterios de Aceptación:**
- [ ] Thumbs up/down en cada mensaje
- [ ] Feedback se guarda
- [ ] Analytics de feedback visible

**Tareas:**
- Reaction buttons UI
- Feedback storage
- Analytics endpoint

---

#### US-4.3: Exportar Conversación
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero exportar conversación a PDF o JSON, para compartir o archivar.

**Criterios de Aceptación:**
- [ ] Formato PDF profesional
- [ ] Formato JSON estructurado
- [ ] Incluye metadata (fecha, agente, tokens)
- [ ] Descarga automática

**Tareas:**
- PDF generation
- JSON export
- Export button UI

---

#### US-4.4: Buscar Historial de Chats
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero buscar mis conversaciones anteriores, para encontrar información rápido.

**Criterios de Aceptación:**
- [ ] Buscar por keyword, agente, fecha
- [ ] Resultados con preview
- [ ] Filtros aplicables
- [ ] Latencia <1s
- [ ] Mostrar lista de recientes primero

**Tareas:**
- Search UI
- Full-text search endpoint
- Filtering logic

---

### CATEGORÍA 5: MCP Integrations

#### US-5.1: Conectar Gmail
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero conectar Gmail a través de OAuth, para que agente acceda a mis emails.

**Criterios de Aceptación:**
- [ ] OAuth flow seguro
- [ ] Acceso granular (lectura, búsqueda, envío)
- [ ] Token guardado encriptado
- [ ] Puedo desconectar en cualquier momento
- [ ] Confirmación antes de enviar emails

**Tareas:**
- OAuth implementation
- Token encryption
- Gmail MCP server integration

---

#### US-5.2: Conectar Google Calendar
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero conectar Calendar, para que agente gestione mi calendario.

**Criterios de Aceptación:**
- [ ] OAuth flow seguro
- [ ] Leer, crear, actualizar eventos
- [ ] Respeta timezone del usuario
- [ ] Notificaciones integradas
- [ ] Puedo desconectar

**Tareas:**
- Calendar OAuth
- Calendar MCP integration
- Timezone handling

---

#### US-5.3: Conectar Notion
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero conectar Notion, para que agente acceda a mis bases de datos.

**Criterios de Aceptación:**
- [ ] OAuth flow seguro
- [ ] Listar y queryar BD
- [ ] Crear/actualizar páginas
- [ ] Limitar acceso a BD específicas
- [ ] Mostrar en audit log

**Tareas:**
- Notion OAuth
- Database query implementation
- Page creation/update

---

### CATEGORÍA 6: Generación de Contenido

#### US-6.1: Generar Imágenes (DALL-E)
**Prioridad:** P0 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero generar imágenes de alta calidad con DALL-E, para visualizar ideas.

**Criterios de Aceptación:**
- [ ] Input: prompt de texto (<1000 chars)
- [ ] Output: imagen 1024x1024, 1024x1792, o 1792x1024
- [ ] Generación <30s
- [ ] Guardar historial de imágenes
- [ ] Ver costo por imagen
- [ ] Contador de uso (50/mes CORE, etc.)

**Tareas:**
- DALL-E API integration
- Image storage
- Usage tracking

---

#### US-6.2: Conversar por Voz
**Prioridad:** P0 | **Complejidad:** L | **Rol:** Charlie

Como Charlie, quiero conversar con agente usando voz, para interacción más natural.

**Criterios de Aceptación:**
- [ ] Micrófono input
- [ ] Transcripción visible
- [ ] Respuesta en audio (<200ms latencia)
- [ ] Múltiples idiomas
- [ ] Control de volumen/velocidad
- [ ] Sesión recordable

**Tareas:**
- WebRTC audio capture
- Whisper transcription
- Audio synthesis (TTS)
- gpt-realtime integration

---

### CATEGORÍA 7: Multi-Usuario & Seguridad

#### US-7.1: Sistema RBAC Funcional
**Prioridad:** P0 | **Complejidad:** L | **Rol:** SuperAdmin

Como SuperAdmin, quiero gestionar roles (SUPER_ADMIN, ADMIN, USER, INVITED), para controlar acceso.

**Criterios de Aceptación:**
- [ ] Asignar roles a usuarios
- [ ] Permisos aplicados correctamente
- [ ] Cambios instantáneos
- [ ] Audit log de cambios
- [ ] No puede escalar permisos propio

**Tareas:**
- RBAC middleware
- Role assignment UI
- Permission verification

---

#### US-7.2: Subscription Tiers Funcional
**Prioridad:** P0 | **Complejidad:** L | **Rol:** Admin

Como Admin, quiero gestionar subscription tiers de usuarios, para controlar features.

**Criterios de Aceptación:**
- [ ] Upgrade/downgrade instantáneo
- [ ] Límites aplicados (imágenes, storage, etc.)
- [ ] Facturación correcta
- [ ] Notificación cuando limite alcanzado
- [ ] UI muestra tier actual

**Tareas:**
- Tier management system
- Limits enforcement
- Billing integration

---

#### US-7.3: Multi-Tenant Isolation
**Prioridad:** P0 | **Complejidad:** L | **Rol:** Sistema

Como Sistema, quiero aislar datos de múltiples usuarios, para garantizar privacidad.

**Criterios de Aceptación:**
- [ ] Usuario A NO ve datos Usuario B
- [ ] Queries incluyen user_id filter siempre
- [ ] Storage separado
- [ ] Vector DB particionado
- [ ] Tests demuestran aislamiento 100%

**Tareas:**
- Schema migrations
- Query filtering
- Isolation testing

---

### CATEGORÍA 8: Métricas & Dashboards

#### US-8.1: Dashboard de Consumo Personal
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero ver mis métricas de consumo (tokens, imágenes, costo), para entender gastos.

**Criterios de Aceptación:**
- [ ] Muestra token count total mes
- [ ] Gráfico consumo por día (30 días)
- [ ] Costo estimado y real
- [ ] Imágenes generadas este mes
- [ ] Storage usado vs límite
- [ ] Predicción para próximo mes

**Tareas:**
- Dashboard UI
- Metrics aggregation
- Cost calculation

---

#### US-8.2: Dashboard Admin Global
**Prioridad:** P1 | **Complejidad:** L | **Rol:** Admin

Como Admin, quiero ver estadísticas globales del sistema, para monitorear salud.

**Criterios de Aceptación:**
- [ ] Total usuarios por tier
- [ ] Costo total operaciones
- [ ] Ingresos (si hay usuarios pago)
- [ ] Margen de ganancia
- [ ] Usuarios activos (24h)
- [ ] Alertas de problemas

**Tareas:**
- Global metrics aggregation
- Dashboard UI
- Alert system

---

### CATEGORÍA 9: Tasks & Reporting

#### US-9.1: Gestionar Tareas
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero crear tareas y asignarlas a agentes, para organizar trabajo.

**Criterios de Aceptación:**
- [ ] Crear tarea con título, descripción, prioridad
- [ ] Asignar a usuario o agente
- [ ] Marcar como To Do, In Progress, Done, Blocked
- [ ] Kanban view (drag-and-drop)
- [ ] Notificación cuando completa
- [ ] Historial de cambios

**Tareas:**
- Task creation UI
- Kanban component
- Notification trigger

---

#### US-9.2: Reportar Bugs
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Charlie

Como Charlie, quiero reportar bugs con diagnóstico automático, para facilitar fix.

**Criterios de Aceptación:**
- [ ] Formulario simple: descripción, pasos, screenshot
- [ ] Chatbot diagnóstico (preguntas automáticas)
- [ ] Escalación automática si crítico
- [ ] Tracking de status
- [ ] Notificación cuando resuelto

**Tareas:**
- Bug report form
- Diagnostic chatbot
- Escalation logic

---

### CATEGORÍA 10: Developer API

#### US-10.1: Acceder a API REST
**Prioridad:** P1 | **Complejidad:** L | **Rol:** Developer

Como Developer, quiero acceder a plataforma vía API REST, para integrar en mis aplicaciones.

**Criterios de Aceptación:**
- [ ] Endpoints para agents, chats, tasks, files
- [ ] Autenticación via API key
- [ ] Rate limiting (100-1000 req/min según tier)
- [ ] Documentación OpenAPI 3.0
- [ ] Ejemplos de código funcionando

**Tareas:**
- API implementation
- OpenAPI spec
- Documentation

---

#### US-10.2: Usar Webhooks
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Developer

Como Developer, quiero recibir webhooks de eventos, para reaccionar en tiempo real.

**Criterios de Aceptación:**
- [ ] Eventos: agent.executed, task.completed, chat.message_received
- [ ] Registro de webhook endpoint
- [ ] Signature para verificación (HMAC)
- [ ] Retry automático si falla
- [ ] Log de deliveries

**Tareas:**
- Webhook system
- Event broadcasting
- Delivery logging

---

#### US-10.3: Administrar API Keys
**Prioridad:** P1 | **Complejidad:** M | **Rol:** Developer

Como Developer, quiero generar y rotar API keys, para seguridad.

**Criterios de Aceptación:**
- [ ] Generar key (mostrada una sola vez)
- [ ] Nombrar keys para identificación
- [ ] Expiration date opcional
- [ ] Ver usage statistics
- [ ] Revocar inmediatamente
- [ ] Máximo 5 keys (Regular), 50 (Developer)

**Tareas:**
- API key generation
- Key management UI
- Usage tracking

---

---

## Matriz de Prioridad

| Prioridad | Historias | Total | Status |
|-----------|-----------|-------|--------|
| P0 | US-1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 3.2, 4.1, 6.1, 6.2, 7.1, 7.2, 7.3 | 13 | MVP |
| P1 | US-2.2, 2.3, 3.3, 3.4, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 8.1, 8.2, 9.1, 9.2, 10.1, 10.2, 10.3 | 17 | MVP Deseado |
| P2 | (Futuro: más agentes especializados, video gen, 3D) | TBD | Phase 2 |
| P3 | (Futuro: ML models personalizados) | TBD | Futuro |

---

## Mapeo a Requisitos

### US → FR Mapping

| User Story | Requisito FR | Feature |
|-----------|--------------|---------|
| US-1.1, 1.2 | FR-1.1, FR-3.2 | Hub + Chat |
| US-1.3 | FR-1.3 | RAG |
| US-1.4 | FR-1.4 | Artifacts |
| US-2.1, 2.2, 2.3 | FR-3.1 | Agent Designer |
| US-3.1, 3.2, 3.3, 3.4 | FR-1.3 | RAG |
| US-4.1, 4.2, 4.3, 4.4 | FR-3.2 | Chat |
| US-6.1 | FR-4.1 | Image Gen |
| US-6.2 | FR-4.2 | Voice |
| US-5.1, 5.2, 5.3 | FR-5.1, 5.2, 5.3 | MCP |
| US-7.1, 7.2, 7.3 | FR-2.1, 2.2, 2.3 | Multi-User |
| US-8.1, 8.2 | FR-7.1, 7.2 | Dashboards |
| US-9.1, 9.2 | FR-8.1, 8.2 | Tasks |
| US-10.1, 10.2, 10.3 | FR-9.1 | APIs |

---

## Historial de Cambios

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0 | 2025-10-21 | 32+ historias de usuario | Planner |
| | | Mapeadas a requisitos FR | |
| | | P0/P1 especificadas | |

---

**Estado:** ✅ APROBADO
**Última Actualización:** 2025-10-21
**Próxima Revisión:** End of Week 1
**Propietario:** Planner / Team

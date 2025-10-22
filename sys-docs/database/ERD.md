# Entity-Relationship Diagram (ERD) - PostgreSQL Schema
## cjhirashi-agents MVP

**Version:** 1.0
**Date:** 2025-10-22
**Status:** PRODUCTION READY
**Database:** PostgreSQL 14+ (Neon Serverless)
**Total Tablas:** 54
**Tablas en Diagrama Principal:** 38
**Tablas en MVP Core:** 15

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Diagrama Principal (38 tablas)](#diagrama-principal-38-tablas)
3. [Diagrama MVP Core (15 tablas)](#diagrama-mvp-core-15-tablas)
4. [Leyenda de Colores y Elementos](#leyenda-de-colores-y-elementos)
5. [Descripción de Dominios](#descripción-de-dominios)
6. [Relaciones Detalladas](#relaciones-detalladas)
7. [Notas de Diseño](#notas-de-diseño)

---

## Resumen Ejecutivo

### Estadísticas del Schema

| Métrica | Valor |
|---------|-------|
| **Total Tablas** | 54 |
| **Tablas en Diagrama Principal** | 38 |
| **Tablas en MVP Core** | 15 |
| **Dominios** | 11 |
| **Relaciones (Foreign Keys)** | 80+ |
| **Índices Estratégicos** | 150+ |
| **JSONB Fields** | 25+ |
| **Triggers** | 3 |

### Dominios Incluidos

```
1. AUTENTICACIÓN & USUARIOS (7 tablas)
   ├── Gestión de usuarios y roles
   ├── Autenticación OAuth
   ├── Sesiones y verificación
   └── Auditoría de acciones sensibles

2. SISTEMA DE AGENTES (6 tablas)
   ├── Definición de agentes IA
   ├── Control de acceso por usuario
   ├── Permisos granulares
   └── Uso y métricas

3. CHATS & CONVERSACIONES (4 tablas)
   ├── Sesiones de chat
   ├── Conversaciones con agentes
   ├── Mensajes individuales
   └── Contexto y metadata

4. ARTIFACTS & CONTENIDO (2 tablas)
   ├── Outputs estructurados (código, diagramas, imágenes)
   ├── Versionamiento
   └── Compartición pública

5. RAG & EMBEDDINGS (2 tablas)
   ├── Metadata de documentos indexados
   ├── Configuración de recuperación
   └── Vector IDs en Pinecone

6. MCPs & INTEGRACIONES (2 tablas)
   ├── Gmail, Calendar, Notion, Slack, GitHub
   ├── OAuth tokens (encriptados)
   └── Logs de sincronización

7. STORAGE & FILES (5 tablas)
   ├── Jerarquía de carpetas
   ├── Archivos con metadata
   ├── Cuotas y límites
   ├── Logs de acceso (auditoría)
   └── Sistema de compartición

8. SISTEMA DE SALUD (6 tablas)
   ├── Perfiles médicos (HIPAA-sensitive)
   ├── Condiciones crónicas
   ├── Medicamentos y adherencia
   ├── Alergias
   ├── Citas médicas
   └── Mediciones (peso, presión, glucosa, etc)

9. SISTEMA FINANCIERO (8 tablas)
   ├── Perfiles financieros
   ├── Cuentas bancarias
   ├── Transacciones
   ├── Presupuestos
   ├── Deudas y pagos
   ├── Inversiones
   └── Pagos recurrentes

10. MÉTRICAS & AUDITORÍA (4 tablas)
    ├── Logs de uso detallado
    ├── Uso agregado mensual
    ├── Alertas de límites
    └── Logs de auditoría

11. SOPORTE & TICKETS (2 tablas)
    ├── Tickets con análisis IA
    ├── Chat con soporte
    └── Escalación automática

### Filosofía de Diseño

- **Multi-tenant:** Particionamiento por `user_id`
- **Soft Deletes:** Recuperación de datos críticos
- **Auditoría Completa:** Triggers automáticos en acciones sensibles
- **JSONB Flexibility:** Configuraciones sin migrations constantes
- **Type Safety:** 100% compatible con Prisma TypeScript
- **Performance:** Índices estratégicos en queries frecuentes

---

## Diagrama Principal (38 tablas)

Diagrama completo mostrando todos los dominios del MVP con sus relaciones principales.

```mermaid
erDiagram
    %% AUTENTICACIÓN & USUARIOS (Azul #3b82f6)
    USERS {
        uuid id PK
        string email UK
        string name
        string role
        string subscription_tier
        int total_messages
        bigint total_tokens_used
        timestamp created_at
        timestamp updated_at
    }

    ACCOUNTS {
        uuid id PK
        uuid user_id FK
        string provider
        string provider_account_id
        text access_token
        text refresh_token
        timestamp created_at
    }

    AUTH_SESSIONS {
        uuid id PK
        uuid user_id FK
        string session_token UK
        timestamp expires
        inet ip_address
        timestamp created_at
    }

    VERIFICATION_TOKENS {
        string identifier PK
        string token PK UK
        timestamp expires
    }

    INVITATIONS {
        uuid id PK
        string email
        string token UK
        uuid invited_by FK
        string status
        timestamp expires_at
        timestamp created_at
    }

    USER_SETTINGS {
        uuid id PK
        uuid user_id FK UK
        string default_model
        decimal temperature
        int max_tokens
        boolean rag_enabled
        timestamp created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid admin_id FK
        string action
        uuid target_id
        string target_type
        jsonb details
        timestamp timestamp
    }

    %% AGENTES (Rosa #ec4899)
    AGENTS {
        uuid id PK
        uuid created_by FK
        string name
        string slug UK
        string category
        string model
        boolean is_public
        boolean is_active
        int total_uses
        timestamp created_at
    }

    USER_AGENT_PERMISSIONS {
        uuid id PK
        uuid user_id FK
        uuid agent_id FK
        uuid granted_by FK
        timestamp granted_at
    }

    %% CHATS & CONVERSACIONES (Verde #10b981)
    CHAT_SESSIONS {
        uuid id PK
        uuid user_id FK
        timestamp started_at
        timestamp last_activity
        jsonb metadata
    }

    CONVERSATIONS {
        uuid id PK
        uuid chat_session_id FK
        uuid agent_id FK
        string title
        int message_count
        int token_count
        timestamp created_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        string role
        text content
        int tokens_input
        int tokens_output
        jsonb metadata
        timestamp timestamp
    }

    %% ARTIFACTS (Naranja #f97316)
    ARTIFACTS {
        uuid id PK
        uuid agent_id FK
        uuid user_id FK
        uuid conversation_id FK
        string name
        string type
        text content
        int version
        uuid parent_id FK
        boolean is_public
        string share_token UK
        timestamp created_at
    }

    %% RAG & EMBEDDINGS (Púrpura #8b5cf6)
    RAG_DOCUMENTS {
        uuid id PK
        uuid user_id FK
        string title
        string source
        string source_url
        boolean indexed
        text[] vector_ids
        int chunk_count
        text[] tags
        timestamp created_at
    }

    RAG_SETTINGS {
        uuid id PK
        uuid user_id FK UK
        int top_k
        decimal threshold
        text[] collections
        timestamp created_at
    }

    %% MCPs & INTEGRACIONES (Rojo #ef4444)
    MCP_INTEGRATIONS {
        uuid id PK
        uuid user_id FK
        string provider UK
        text access_token_encrypted
        text refresh_token_encrypted
        string scopes
        timestamp expires_at
        boolean is_active
        timestamp last_sync
        timestamp created_at
    }

    MCP_SYNC_LOGS {
        uuid id PK
        uuid integration_id FK
        timestamp last_sync
        int items_synced
        string status
        text error_message
        timestamp created_at
    }

    %% STORAGE & FILES (Cyan #06b6d4)
    STORAGE_FOLDERS {
        uuid id PK
        uuid user_id FK
        string name
        uuid parent_id FK
        string path UK
        string color
        timestamp created_at
    }

    STORAGE_FILES {
        uuid id PK
        uuid user_id FK
        uuid folder_id FK
        string filename
        string original_name
        string storage_path
        string mime_type
        bigint size
        string checksum UK
        string access_level
        string usage_context
        boolean is_processed
        timestamp created_at
        timestamp deleted_at
        timestamp expires_at
    }

    STORAGE_QUOTAS {
        uuid id PK
        uuid user_id FK UK
        bigint max_storage
        bigint max_file_size
        int max_files
        bigint used_storage
        int file_count
        jsonb usage_breakdown
        timestamp created_at
    }

    FILE_ACCESS_LOGS {
        uuid id PK
        uuid file_id FK
        uuid user_id FK
        string action
        inet ip_address
        timestamp timestamp
    }

    FILE_SHARES {
        uuid id PK
        uuid file_id FK
        uuid shared_by FK
        string share_token UK
        string share_type
        string password
        int max_downloads
        int download_count
        boolean allow_download
        boolean allow_view
        timestamp expires_at
        timestamp created_at
    }

    %% SALUD (Color Salud #f472b6)
    HEALTH_PROFILES {
        uuid id PK
        uuid user_id FK UK
        string blood_type
        decimal height
        decimal weight
        string sex
        jsonb emergency_contacts
        jsonb insurance_info
        text encrypted_data
        timestamp created_at
    }

    MEDICAL_CONDITIONS {
        uuid id PK
        uuid health_profile_id FK
        string name
        string type
        string severity
        date diagnosed_date
        string status
        jsonb treatment
        timestamp created_at
    }

    MEDICATIONS {
        uuid id PK
        uuid health_profile_id FK
        string name
        string generic_name
        string dosage
        string frequency
        date start_date
        date end_date
        boolean reminder_enabled
        jsonb reminder_times
        boolean is_active
        timestamp created_at
    }

    MEDICATION_LOGS {
        uuid id PK
        uuid medication_id FK
        timestamp scheduled_time
        timestamp taken_time
        string status
        timestamp created_at
    }

    ALLERGIES {
        uuid id PK
        uuid health_profile_id FK
        string allergen
        string type
        string severity
        date diagnosed_date
        timestamp created_at
    }

    MEDICAL_APPOINTMENTS {
        uuid id PK
        uuid health_profile_id FK
        string type
        string specialty
        timestamp scheduled_date
        int duration
        string status
        text reason
        text results
        timestamp created_at
    }

    HEALTH_MEASUREMENTS {
        uuid id PK
        uuid health_profile_id FK
        string type
        jsonb value
        timestamp measured_at
        timestamp created_at
    }

    %% FINANZAS (Color Finanzas #fbbf24)
    FINANCIAL_PROFILES {
        uuid id PK
        uuid user_id FK UK
        string currency
        jsonb financial_goals
        jsonb ai_analysis
        timestamp created_at
    }

    FINANCIAL_ACCOUNTS {
        uuid id PK
        uuid financial_profile_id FK
        string name
        string type
        decimal balance
        string currency
        boolean is_active
        decimal credit_limit
        timestamp created_at
    }

    TRANSACTIONS {
        uuid id PK
        uuid financial_profile_id FK
        uuid account_id FK
        date date
        string description
        decimal amount
        string type
        string category
        string subcategory
        jsonb tags
        uuid from_account_id FK
        uuid to_account_id FK
        boolean is_recurring
        timestamp created_at
    }

    BUDGETS {
        uuid id PK
        uuid financial_profile_id FK
        string name
        string category
        decimal amount
        string period
        date start_date
        date end_date
        int alert_threshold
        boolean is_active
        timestamp created_at
    }

    DEBTS {
        uuid id PK
        uuid financial_profile_id FK
        string name
        string type
        decimal principal
        decimal balance
        decimal interest_rate
        decimal monthly_payment
        date start_date
        date maturity_date
        string status
        int priority
        timestamp created_at
    }

    DEBT_PAYMENTS {
        uuid id PK
        uuid debt_id FK
        date date
        decimal amount
        decimal principal_paid
        decimal interest_paid
        timestamp created_at
    }

    INVESTMENTS {
        uuid id PK
        uuid financial_profile_id FK
        string name
        string type
        string symbol
        decimal quantity
        decimal purchase_price
        decimal current_price
        date purchase_date
        decimal returns
        decimal returns_percentage
        timestamp created_at
    }

    RECURRING_PAYMENTS {
        uuid id PK
        uuid financial_profile_id FK
        string name
        decimal amount
        string frequency
        string category
        date next_due_date
        boolean auto_debit
        uuid account_id FK
        date start_date
        date end_date
        boolean is_active
        timestamp created_at
    }

    %% MÉTRICAS & USO (Gris #6b7280)
    USAGE_LOGS {
        uuid id PK
        uuid user_id FK
        uuid agent_id FK
        uuid conversation_id FK
        int tokens_input
        int tokens_output
        int total_tokens
        string model
        decimal cost_input
        decimal cost_output
        decimal total_cost
        int duration
        boolean success
        timestamp timestamp
    }

    MONTHLY_USAGE {
        uuid id PK
        uuid user_id FK
        int year
        int month
        int total_messages
        bigint total_tokens
        decimal total_cost
        jsonb agent_usage
        int limit_messages
        bigint limit_tokens
        boolean exceeded_limit
        timestamp created_at
    }

    USAGE_ALERTS {
        uuid id PK
        uuid user_id FK
        string type
        int threshold
        boolean triggered
        timestamp created_at
    }

    %% SOPORTE (Color Soporte #fbbf24)
    SUPPORT_TICKETS {
        uuid id PK
        string ticket_number UK
        uuid user_id FK
        uuid assigned_to_id FK
        string title
        string description
        string category
        string priority
        string status
        text ai_suggestion
        boolean ai_resolved
        timestamp resolved_at
        timestamp created_at
    }

    SUPPORT_MESSAGES {
        uuid id PK
        uuid ticket_id FK
        text content
        boolean is_staff
        boolean is_ai
        uuid author_id FK
        jsonb attachments
        timestamp created_at
    }

    %% RELACIONES: AUTENTICACIÓN
    USERS ||--o{ ACCOUNTS : "1:N"
    USERS ||--o{ AUTH_SESSIONS : "1:N"
    USERS ||--o{ INVITATIONS : "1:N (invited_by)"
    USERS ||--|| USER_SETTINGS : "1:1"
    USERS ||--o{ AUDIT_LOGS : "1:N (admin_id)"

    %% RELACIONES: AGENTES
    USERS ||--o{ AGENTS : "1:N (created_by)"
    AGENTS ||--o{ USER_AGENT_PERMISSIONS : "1:N"
    USERS ||--o{ USER_AGENT_PERMISSIONS : "1:N"

    %% RELACIONES: CHATS
    USERS ||--o{ CHAT_SESSIONS : "1:N"
    CHAT_SESSIONS ||--o{ CONVERSATIONS : "1:N"
    AGENTS ||--o{ CONVERSATIONS : "1:N"
    CONVERSATIONS ||--o{ MESSAGES : "1:N"

    %% RELACIONES: ARTIFACTS
    AGENTS ||--o{ ARTIFACTS : "1:N"
    CONVERSATIONS ||--o{ ARTIFACTS : "1:N (optional)"
    ARTIFACTS ||--o{ ARTIFACTS : "self-join (parent)"

    %% RELACIONES: RAG
    USERS ||--o{ RAG_DOCUMENTS : "1:N"
    USERS ||--|| RAG_SETTINGS : "1:1"

    %% RELACIONES: MCPs
    USERS ||--o{ MCP_INTEGRATIONS : "1:N"
    MCP_INTEGRATIONS ||--o{ MCP_SYNC_LOGS : "1:N"

    %% RELACIONES: STORAGE
    USERS ||--o{ STORAGE_FOLDERS : "1:N"
    USERS ||--o{ STORAGE_FILES : "1:N"
    USERS ||--|| STORAGE_QUOTAS : "1:1"
    STORAGE_FOLDERS ||--o{ STORAGE_FILES : "1:N"
    STORAGE_FOLDERS ||--o{ STORAGE_FOLDERS : "self-join (parent)"
    STORAGE_FILES ||--o{ FILE_ACCESS_LOGS : "1:N"
    STORAGE_FILES ||--o{ FILE_SHARES : "1:N"

    %% RELACIONES: SALUD
    USERS ||--|| HEALTH_PROFILES : "1:1"
    HEALTH_PROFILES ||--o{ MEDICAL_CONDITIONS : "1:N"
    HEALTH_PROFILES ||--o{ MEDICATIONS : "1:N"
    HEALTH_PROFILES ||--o{ ALLERGIES : "1:N"
    HEALTH_PROFILES ||--o{ MEDICAL_APPOINTMENTS : "1:N"
    HEALTH_PROFILES ||--o{ HEALTH_MEASUREMENTS : "1:N"
    MEDICATIONS ||--o{ MEDICATION_LOGS : "1:N"

    %% RELACIONES: FINANZAS
    USERS ||--|| FINANCIAL_PROFILES : "1:1"
    FINANCIAL_PROFILES ||--o{ FINANCIAL_ACCOUNTS : "1:N"
    FINANCIAL_PROFILES ||--o{ TRANSACTIONS : "1:N"
    FINANCIAL_PROFILES ||--o{ BUDGETS : "1:N"
    FINANCIAL_PROFILES ||--o{ DEBTS : "1:N"
    FINANCIAL_PROFILES ||--o{ INVESTMENTS : "1:N"
    FINANCIAL_PROFILES ||--o{ RECURRING_PAYMENTS : "1:N"
    FINANCIAL_ACCOUNTS ||--o{ TRANSACTIONS : "1:N"
    DEBTS ||--o{ DEBT_PAYMENTS : "1:N"
    FINANCIAL_ACCOUNTS ||--o{ RECURRING_PAYMENTS : "1:N (optional)"

    %% RELACIONES: MÉTRICAS
    USERS ||--o{ USAGE_LOGS : "1:N"
    USERS ||--o{ MONTHLY_USAGE : "1:N"
    USERS ||--o{ USAGE_ALERTS : "1:N"
    AGENTS ||--o{ USAGE_LOGS : "1:N"
    CONVERSATIONS ||--o{ USAGE_LOGS : "1:N (optional)"

    %% RELACIONES: SOPORTE
    USERS ||--o{ SUPPORT_TICKETS : "1:N (user_id)"
    SUPPORT_TICKETS ||--o{ SUPPORT_MESSAGES : "1:N"
```

---

## Diagrama MVP Core (15 tablas)

Diagrama simplificado para onboarding rápido. Incluye solo las tablas críticas para MVP.

```mermaid
erDiagram
    %% AUTENTICACIÓN (Azul)
    USERS {
        uuid id PK
        string email UK
        string name
        string role
        string subscription_tier
        timestamp created_at
        timestamp updated_at
    }

    ACCOUNTS {
        uuid id PK
        uuid user_id FK
        string provider
        string provider_account_id
        text access_token
        timestamp created_at
    }

    AUTH_SESSIONS {
        uuid id PK
        uuid user_id FK
        string session_token UK
        timestamp expires
        timestamp created_at
    }

    USER_SETTINGS {
        uuid id PK
        uuid user_id FK UK
        string default_model
        decimal temperature
        boolean rag_enabled
        timestamp created_at
    }

    %% AGENTES (Rosa)
    AGENTS {
        uuid id PK
        uuid created_by FK
        string name
        string slug UK
        string category
        string model
        boolean is_public
        timestamp created_at
    }

    USER_AGENT_PERMISSIONS {
        uuid id PK
        uuid user_id FK
        uuid agent_id FK
        timestamp granted_at
    }

    %% CHATS (Verde)
    CHAT_SESSIONS {
        uuid id PK
        uuid user_id FK
        timestamp started_at
        timestamp last_activity
    }

    CONVERSATIONS {
        uuid id PK
        uuid chat_session_id FK
        uuid agent_id FK
        string title
        int message_count
        timestamp created_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        string role
        text content
        int tokens_input
        int tokens_output
        timestamp timestamp
    }

    %% ARTIFACTS (Naranja)
    ARTIFACTS {
        uuid id PK
        uuid agent_id FK
        uuid user_id FK
        uuid conversation_id FK
        string name
        string type
        text content
        timestamp created_at
    }

    %% RAG (Púrpura)
    RAG_DOCUMENTS {
        uuid id PK
        uuid user_id FK
        string title
        string source
        boolean indexed
        timestamp created_at
    }

    %% MÉTRICAS (Gris)
    USAGE_LOGS {
        uuid id PK
        uuid user_id FK
        uuid agent_id FK
        int total_tokens
        string model
        decimal total_cost
        timestamp timestamp
    }

    MONTHLY_USAGE {
        uuid id PK
        uuid user_id FK
        int year
        int month
        int total_messages
        bigint total_tokens
        decimal total_cost
        timestamp created_at
    }

    %% AUDITORÍA (Gris)
    AUDIT_LOGS {
        uuid id PK
        uuid admin_id FK
        string action
        jsonb details
        timestamp timestamp
    }

    %% RELACIONES
    USERS ||--o{ ACCOUNTS : "1:N OAuth"
    USERS ||--o{ AUTH_SESSIONS : "1:N"
    USERS ||--|| USER_SETTINGS : "1:1"

    USERS ||--o{ AGENTS : "1:N create"
    AGENTS ||--o{ USER_AGENT_PERMISSIONS : "1:N"
    USERS ||--o{ USER_AGENT_PERMISSIONS : "1:N"

    USERS ||--o{ CHAT_SESSIONS : "1:N"
    CHAT_SESSIONS ||--o{ CONVERSATIONS : "1:N"
    AGENTS ||--o{ CONVERSATIONS : "1:N"
    CONVERSATIONS ||--o{ MESSAGES : "1:N"

    AGENTS ||--o{ ARTIFACTS : "1:N"
    CONVERSATIONS ||--o{ ARTIFACTS : "1:N"
    USERS ||--o{ ARTIFACTS : "1:N"

    USERS ||--o{ RAG_DOCUMENTS : "1:N"

    USERS ||--o{ USAGE_LOGS : "1:N"
    AGENTS ||--o{ USAGE_LOGS : "1:N"

    USERS ||--o{ MONTHLY_USAGE : "1:N"
    USERS ||--o{ AUDIT_LOGS : "1:N"
```

---

## Leyenda de Colores y Elementos

### Colores por Dominio

| Dominio | Color HEX | Descripción |
|---------|-----------|-------------|
| **Autenticación** | `#3b82f6` (Azul) | Usuarios, sesiones, autenticación |
| **Agentes** | `#ec4899` (Rosa) | Sistemas de agentes IA |
| **Chats** | `#10b981` (Verde) | Conversaciones y mensajes |
| **Artifacts** | `#f97316` (Naranja) | Contenido generado (código, imágenes, diagramas) |
| **RAG** | `#8b5cf6` (Púrpura) | Indexación y búsqueda semántica |
| **Integraciones** | `#ef4444` (Rojo) | MCPs, Gmail, Calendar, Notion |
| **Storage** | `#06b6d4` (Cyan) | Archivos y almacenamiento |
| **Salud** | `#f472b6` (Rosa claro) | Datos médicos (HIPAA-sensitive) |
| **Finanzas** | `#fbbf24` (Amarillo) | Cuentas, transacciones, presupuestos |
| **Métricas** | `#6b7280` (Gris) | Uso, logs, auditoría |
| **Soporte** | `#f59e0b` (Naranja claro) | Tickets y soporte al cliente |

### Cardinalidades Mostradas

| Símbolo | Significado | Ejemplo |
|---------|-------------|---------|
| `\|\|--o{` | **One-to-Many** | 1 Usuario → N Sesiones |
| `\|\|--\|\|` | **One-to-One** | 1 Usuario → 1 Perfil |
| `}o--o{` | **Many-to-Many** | N Usuarios ↔ N Agentes |
| `\|\|--o{` | **One-to-Many Optional** | 1 Conversación → 0+ Artifacts |

### Tipos de Relaciones

**Relaciones Críticas (Líneas Gruesas)**
- Usuario → Sesiones (core auth)
- Chat Session → Conversations (core feature)
- Agent → Usage Logs (core metrics)

**Relaciones Secundarias (Líneas Delgadas)**
- Artifact → Parent Artifact (versionamiento)
- File → File Access Logs (auditoría)
- Support Ticket → Support Messages (soporte)

### Convenciones de Nombres

**Tablas:**
- PK: `id` (UUID PRIMARY KEY)
- FK: `[entidad]_id` o `[relación]_id`
- UK: Unique constraints marcados

**Campos de Timestamp:**
- `created_at`: Creación del registro
- `updated_at`: Última actualización
- `deleted_at`: Soft delete (si aplica)

---

## Descripción de Dominios

### 1. AUTENTICACIÓN & USUARIOS (7 tablas) - Azul #3b82f6

**Tablas:** users, accounts, auth_sessions, verification_tokens, invitations, user_settings, audit_logs

**Propósito:** Gestión de usuarios, autenticación OAuth, sesiones seguras y auditoría.

**Relaciones Clave:**
- `users` (centro) → `accounts` (proveedores OAuth: Google, GitHub)
- `users` → `auth_sessions` (sesiones activas)
- `users` → `invitations` (sistema de invitaciones)
- `users` → `user_settings` (preferencias por usuario, 1:1)
- `users` → `audit_logs` (log de acciones sensibles)

**Características:**
- UUID para evitar enumeration attacks
- Role-based access control (RBAC)
- Soft deletes mediante `deleted_at`
- Audit trail completo de cambios críticos

---

### 2. SISTEMA DE AGENTES (6 tablas) - Rosa #ec4899

**Tablas:** agents, user_agent_permissions, (conversations, messages, artifacts - compartidas con chats)

**Propósito:** Definición, gestión y control de acceso de agentes IA especializados.

**Relaciones Clave:**
- `users` → `agents` (creación por usuario)
- `agents` → `user_agent_permissions` (control de acceso granular)
- `agents` → `conversations` (cada conversación es con un agente)
- `agents` → `artifacts` (outputs generados por agente)
- `agents` → `usage_logs` (métricas de uso por agente)

**Características:**
- Agentes públicos vs privados
- Permisos granulares por usuario
- Tracking de uso y popularidad
- System prompts y configuración flexible

---

### 3. CHATS & CONVERSACIONES (4 tablas) - Verde #10b981

**Tablas:** chat_sessions, conversations, messages, (artifacts)

**Propósito:** Interacciones en tiempo real entre usuarios y agentes.

**Relaciones Clave:**
- `users` → `chat_sessions` (sesión de trabajo)
- `chat_sessions` → `conversations` (conversación específica con agente)
- `conversations` → `messages` (intercambio individual)
- `messages` → `artifacts` (outputs del agente)

**Características:**
- Sesiones agrupa múltiples conversaciones
- Títulos auto-generados por IA
- Contadores pre-calculados (message_count, token_count)
- Metadata flexible para contexto

---

### 4. ARTIFACTS & CONTENIDO (2 tablas) - Naranja #f97316

**Tablas:** artifacts

**Propósito:** Almacenar outputs estructurados (código, imágenes, diagramas, etc).

**Relaciones Clave:**
- `agents` → `artifacts` (agente que generó)
- `conversations` → `artifacts` (contexto donde se creó)
- `artifacts` → `artifacts` (versionamiento mediante parent_id)
- `users` → `artifacts` (propietario)

**Características:**
- Tipos: CODE, JSON, HTML, MARKDOWN, DIAGRAM, IMAGE, TABLE
- Versionamiento integrado
- Compartición pública con tokens
- Metadata tipo-específico (JSONB)
- Overflow a Vercel Blob para contenido > 1MB

---

### 5. RAG & EMBEDDINGS (2 tablas) - Púrpura #8b5cf6

**Tablas:** rag_documents, rag_settings

**Propósito:** Indexación de documentos y configuración de búsqueda semántica.

**Relaciones Clave:**
- `users` → `rag_documents` (documentos del usuario)
- `users` → `rag_settings` (configuración de RAG, 1:1)
- RAG metadata en PostgreSQL, embeddings en Pinecone

**Características:**
- Metadata en PG, vectors en Pinecone (ADR-002)
- Soporta múltiples fuentes (FILE, PASTE, URL, MCP, SYSTEM)
- Chunking y indexación automáticos
- Búsqueda con threshold configurable

---

### 6. MCPs & INTEGRACIONES (2 tablas) - Rojo #ef4444

**Tablas:** mcp_integrations, mcp_sync_logs

**Propósito:** Conexiones con servicios externos (Gmail, Calendar, Notion, Slack, GitHub).

**Relaciones Clave:**
- `users` → `mcp_integrations` (una por proveedor)
- `mcp_integrations` → `mcp_sync_logs` (historial de sincronización)

**Características:**
- OAuth tokens encriptados (AES-256)
- Control de expiración y refresh automático
- Logs de sincronización para debugging
- Alertas si múltiples fallos consecutivos

---

### 7. STORAGE & FILES (5 tablas) - Cyan #06b6d4

**Tablas:** storage_folders, storage_files, storage_quotas, file_access_logs, file_shares

**Propósito:** Almacenamiento jerárquico de archivos con control de acceso.

**Relaciones Clave:**
- `users` → `storage_files` (propietario)
- `storage_folders` → `storage_files` (jerarquía)
- `storage_folders` → `storage_folders` (carpetas anidadas)
- `users` → `storage_quotas` (límites, 1:1)
- `storage_files` → `file_access_logs` (auditoría)
- `storage_files` → `file_shares` (compartición)

**Características:**
- Jerarquía de carpetas con path completo
- Soft deletes con `deleted_at`
- Cuotas por tipo de contenido (THEME, AVATAR, HEALTH, FINANCE, etc)
- Compartición con tokens y expiración
- Virus scanning integrado

---

### 8. SISTEMA DE SALUD (6 tablas) - Rosa Claro #f472b6

**Tablas:** health_profiles, medical_conditions, medications, medication_logs, allergies, medical_appointments, health_measurements

**Propósito:** Gestión de datos médicos (HIPAA-sensitive).

**Relaciones Clave:**
- `users` → `health_profiles` (perfil médico, 1:1)
- `health_profiles` → `medical_conditions` (condiciones crónicas)
- `health_profiles` → `medications` (medicamentos activos)
- `medications` → `medication_logs` (registro de adherencia)
- `health_profiles` → `allergies` (alergias y reacciones)
- `health_profiles` → `medical_appointments` (citas médicas)
- `health_profiles` → `health_measurements` (peso, presión, glucosa, etc)

**Características:**
- Encriptación de datos sensibles
- Restricción de acceso solo a propietario
- Tracking de adherencia a medicamentos
- Mediciones con estructura flexible (JSONB)
- Alertas de citas médicas

---

### 9. SISTEMA FINANCIERO (8 tablas) - Amarillo #fbbf24

**Tablas:** financial_profiles, financial_accounts, transactions, budgets, debts, debt_payments, investments, recurring_payments

**Propósito:** Gestión integral de finanzas personales.

**Relaciones Clave:**
- `users` → `financial_profiles` (perfil financiero, 1:1)
- `financial_profiles` → `financial_accounts` (cuentas bancarias)
- `financial_profiles` → `transactions` (movimientos)
- `financial_accounts` → `transactions` (cuenta de origen/destino)
- `financial_profiles` → `budgets` (presupuestos por categoría)
- `financial_profiles` → `debts` (deudas y préstamos)
- `debts` → `debt_payments` (historial de pagos)
- `financial_profiles` → `investments` (cartera de inversiones)
- `financial_profiles` → `recurring_payments` (suscripciones)

**Características:**
- Soporte multi-moneda
- Categorización de transacciones
- Presupuestos con alertas
- Proyección de deuda (interest, principal)
- Tracking de retorno en inversiones

---

### 10. MÉTRICAS & AUDITORÍA (4 tablas) - Gris #6b7280

**Tablas:** usage_logs, monthly_usage, usage_alerts, audit_logs

**Propósito:** Tracking de uso, costos y auditoría de cambios.

**Relaciones Clave:**
- `users` → `usage_logs` (log detallado por mensaje)
- `agents` → `usage_logs` (qué agente se usó)
- `users` → `monthly_usage` (agregado por mes)
- `users` → `usage_alerts` (alertas de límite)
- `users` → `audit_logs` (acciones sensibles)

**Características:**
- Cálculo automático de costos por LLM
- Pre-cálculo de contadores para performance
- Alertas a 80%, 90%, 100% de límite
- Retention: 1 año de logs detallados
- Triggers automáticos en cambios sensibles

---

### 11. SOPORTE & TICKETS (2 tablas) - Naranja Claro #f59e0b

**Tablas:** support_tickets, support_messages

**Propósito:** Sistema de soporte con análisis IA.

**Relaciones Clave:**
- `users` → `support_tickets` (tickets creados por usuario)
- `support_tickets` → `support_messages` (chat de soporte)

**Características:**
- Análisis automático por IA (GPT-4)
- Escalación automática por prioridad
- Asignación a personal de soporte
- Sugerencias de resolución IA
- Attachments y metadata flexible

---

## Relaciones Detalladas

### Relaciones 1:1 (One-to-One)

| De | Hacia | Descripción | ON DELETE |
|----|-------|-------------|-----------|
| users | user_settings | Preferencias por usuario | CASCADE |
| users | health_profiles | Perfil médico | CASCADE |
| users | financial_profiles | Perfil financiero | CASCADE |
| users | storage_quotas | Cuotas de almacenamiento | CASCADE |
| users | rag_settings | Config de RAG | CASCADE |

**Característica:** Una fila en cada tabla relacionada, máximo. Importante para datos únicos por usuario.

---

### Relaciones 1:N (One-to-Many)

| De | Hacia | Descripción | Cardinalidad | ON DELETE |
|----|-------|-------------|--------------|-----------|
| users | accounts | OAuth providers | 1:N | CASCADE |
| users | auth_sessions | Sesiones activas | 1:N | CASCADE |
| users | agents | Agentes creados | 1:N | CASCADE |
| users | chat_sessions | Sesiones de chat | 1:N | CASCADE |
| users | artifacts | Artifacts creados | 1:N | CASCADE |
| users | rag_documents | Documentos indexados | 1:N | CASCADE |
| users | mcp_integrations | Integraciones | 1:N | CASCADE |
| users | storage_files | Archivos | 1:N | CASCADE |
| users | storage_folders | Carpetas | 1:N | CASCADE |
| agents | conversations | Conversaciones | 1:N | CASCADE |
| agents | usage_logs | Logs de uso | 1:N | CASCADE |
| agents | artifacts | Outputs generados | 1:N | CASCADE |
| chat_sessions | conversations | Conversaciones en sesión | 1:N | CASCADE |
| conversations | messages | Mensajes | 1:N | CASCADE |
| conversations | artifacts | Artifacts creados | 1:N | SET NULL |
| artifacts | artifacts | Versionamiento | 1:N (parent) | SET NULL |
| mcp_integrations | mcp_sync_logs | Logs de sync | 1:N | CASCADE |
| storage_folders | storage_files | Archivos | 1:N | SET NULL |
| storage_folders | storage_folders | Anidamiento | 1:N (parent) | CASCADE |
| storage_files | file_access_logs | Auditoría acceso | 1:N | CASCADE |
| storage_files | file_shares | Comparticiones | 1:N | CASCADE |
| health_profiles | medical_conditions | Condiciones médicas | 1:N | CASCADE |
| health_profiles | medications | Medicamentos | 1:N | CASCADE |
| health_profiles | allergies | Alergias | 1:N | CASCADE |
| health_profiles | medical_appointments | Citas médicas | 1:N | CASCADE |
| health_profiles | health_measurements | Mediciones | 1:N | CASCADE |
| medications | medication_logs | Adherencia | 1:N | CASCADE |
| financial_profiles | financial_accounts | Cuentas | 1:N | CASCADE |
| financial_profiles | transactions | Transacciones | 1:N | CASCADE |
| financial_profiles | budgets | Presupuestos | 1:N | CASCADE |
| financial_profiles | debts | Deudas | 1:N | CASCADE |
| financial_profiles | investments | Inversiones | 1:N | CASCADE |
| financial_profiles | recurring_payments | Pagos recurrentes | 1:N | CASCADE |
| financial_accounts | transactions | Transacciones (cuenta) | 1:N | SET NULL |
| debts | debt_payments | Pagos de deuda | 1:N | CASCADE |

**Característica:** La mayoría usa CASCADE para limpiar datos relacionados cuando se elimina el padre.

---

### Relaciones N:N (Many-to-Many)

| De | Hacia | Tabla Unión | Descripción |
|----|-------|------------|-------------|
| users | agents | user_agent_permissions | Permisos de acceso a agentes |

**Característica:** Tabla de unión permite: usuario puede acceder a múltiples agentes, agente puede ser accedido por múltiples usuarios.

---

### Relaciones Self-Join (Autorreferencia)

| Tabla | Campo | Descripción |
|-------|-------|-------------|
| artifacts | parent_id | Versionamiento de artifacts |
| storage_folders | parent_id | Jerarquía de carpetas |

**Característica:** Permiten estructuras jerárquicas sin crear tablas adicionales.

---

### Relaciones con CASCADE DELETE

**Automáticamente eliminan datos relacionados cuando se elimina el padre:**

- Usuario DELETE → Elimina accounts, sessions, chats, artifacts, todos sus datos
- Agente DELETE → Elimina conversations, usage_logs
- Chat Session DELETE → Elimina conversations
- Conversation DELETE → Elimina messages
- Health Profile DELETE → Elimina medical_conditions, medications, etc

**Implicaciones:**
- NUNCA se pueden tener orfandades
- Auditoría debe registrar ANTES de eliminar
- Soft deletes recomendados en datos sensibles

---

### Relaciones con SET NULL

**Mantienen referencia pero establecen NULL si padre se elimina:**

- Artifact parent_id → NULL (versionamiento se pierde)
- Conversation artifacts → NULL (si conversación se elimina)
- Storage file folder_id → NULL (archivo sin carpeta)
- Financial account transactions → NULL (si cuenta se elimina)

**Implicaciones:**
- Los datos NO se pierden, solo se desvinculan
- Útil para relaciones opcionales

---

## Notas de Diseño

### 1. Arquitectura Multi-Tenant

**Particionamiento por `user_id`:**
- TODAS las tablas tienen `user_id` (directo o via FK chain)
- Row-Level Security (RLS) valida permisos en BD
- Queries siempre filtran por user_id
- Performance mejorado con índices en user_id

```sql
CREATE INDEX idx_conversations_user_id
  ON conversations(user_id);
CREATE INDEX idx_artifacts_user_id
  ON artifacts(user_id);
```

---

### 2. Soft Deletes

**Tablas críticas con `deleted_at`:**
- `storage_files` (recuperación de archivos)
- `users` (soft delete recomendado para GDPR)
- Otros: adicionar si data muy sensible

**Implementación:**
```sql
-- Queries siempre agregan WHERE deleted_at IS NULL
SELECT * FROM storage_files
WHERE user_id = $1 AND deleted_at IS NULL;

-- Índices en deleted_at para performance
CREATE INDEX idx_storage_files_deleted_at
  ON storage_files(deleted_at)
  WHERE deleted_at IS NULL;
```

---

### 3. JSONB para Flexibilidad

**Campos JSONB sin migrations:**

| Campo | Tabla | Ejemplo |
|-------|-------|---------|
| `metadata` | messages | `{"model": "gpt-4", "latency_ms": 1250}` |
| `config` | agents | `{"temperature": 0.7, "max_tokens": 2048}` |
| `metadata` | artifacts | `{"language": "typescript", "syntax": "class"}` |
| `agent_usage` | monthly_usage | `{"agent-uuid": {"messages": 150, "tokens": 45000}}` |
| `financial_goals` | financial_profiles | `{"savings": 5000, "investment": 10000}` |
| `value` | health_measurements | `{"kg": 75.5}` o `{"systolic": 120, "diastolic": 80}` |

**Índices GIN para búsqueda JSONB:**
```sql
CREATE INDEX idx_artifacts_metadata_gin
  ON artifacts USING GIN (metadata);
```

---

### 4. Pre-Cálculo de Contadores

**Performance optimization - no recalcular cada vez:**

| Campo | Tabla | Actualizado Por |
|-------|-------|-----------------|
| `total_messages` | users | trigger `update_usage_counters` |
| `total_tokens_used` | users | trigger `update_usage_counters` |
| `message_count` | conversations | trigger en INSERT messages |
| `token_count` | conversations | trigger en INSERT messages |
| `total_uses` | agents | trigger en INSERT usage_logs |
| `file_count` | storage_quotas | trigger en INSERT storage_files |
| `used_storage` | storage_quotas | trigger en INSERT storage_files |

**Trigger Ejemplo:**
```sql
CREATE TRIGGER update_usage_counters_trigger
AFTER INSERT ON usage_logs
FOR EACH ROW
EXECUTE FUNCTION update_usage_counters();
```

---

### 5. Encriptación de Datos Sensibles

**Campos que DEBEN encriptarse (AES-256) en application layer:**

| Campo | Tabla | Razón |
|-------|-------|-------|
| `access_token` | accounts | OAuth credentials |
| `refresh_token` | accounts | OAuth credentials |
| `access_token_encrypted` | mcp_integrations | OAuth credentials |
| `refresh_token_encrypted` | mcp_integrations | OAuth credentials |
| `password` | file_shares | Share protection |
| `account_number` | debts | Financial data |
| `encrypted_data` | health_profiles | HIPAA compliance |
| `emergency_contacts` | health_profiles | Medical data |
| `insurance_info` | health_profiles | Medical data |

**NUNCA guardar en plaintext.**

---

### 6. Índices Estratégicos

**Índices en queries frecuentes:**

```sql
-- Auth queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);

-- Chat queries
CREATE INDEX idx_conversations_user_agent
  ON conversations(chat_session_id, agent_id);
CREATE INDEX idx_messages_conversation_id
  ON messages(conversation_id);

-- Financiero queries
CREATE INDEX idx_transactions_profile_date
  ON transactions(financial_profile_id, date DESC);

-- Storage queries
CREATE INDEX idx_storage_files_user_context
  ON storage_files(user_id, usage_context, deleted_at)
  WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_messages_content_fulltext
  ON messages USING GIN (to_tsvector('english', content));
```

---

### 7. Estrategia de Escalabilidad

**Para 10K+ usuarios:**
- Partitioning de tablas grandes (messages, usage_logs)
- Read replicas con Neon Scale tier
- Caching Redis para queries frecuentes

**Para 100K+ usuarios:**
- Sharding horizontal por región
- CQRS pattern para analytics
- Cold storage para data histórica

---

### 8. Diferencias MVP vs Fase 2

**MVP Core (15 tablas - Fase 1):**
- users, accounts, auth_sessions, user_settings
- agents, user_agent_permissions
- chat_sessions, conversations, messages
- artifacts
- rag_documents
- usage_logs, monthly_usage
- audit_logs
- invitations

**Agregadas en Fase 2:**
- rag_settings, mcp_integrations, mcp_sync_logs
- storage_folders, storage_files, storage_quotas, file_access_logs, file_shares
- support_tickets, support_messages

**Post-MVP (Fase 3):**
- health_profiles, medical_conditions, medications, medication_logs, allergies, medical_appointments, health_measurements
- financial_profiles, financial_accounts, transactions, budgets, debts, debt_payments, investments, recurring_payments
- usage_alerts, verification_tokens

---

### 9. Convenciones de Nombrado

**Primary Keys:** `id` (UUID, DEFAULT gen_random_uuid())

**Foreign Keys:**
- Relación directa: `[tabla_singular]_id` (ej: user_id)
- Autorreferencia: `parent_id`
- Relación especial: `created_by`, `assigned_to_id`, `granted_by`

**Timestamps:**
- `created_at` - Creación
- `updated_at` - Última actualización
- `deleted_at` - Soft delete
- `expires_at` - Expiración (para tokens, invites, etc)
- `last_sync` / `last_activity` - Última actividad

**Booleans:**
- `is_active` - Activo/Inactivo
- `is_public` - Público/Privado
- `is_processed` - Ya procesado
- Prefix con `is_` o `has_`

---

### 10. Validaciones en BD

**CHECK constraints importantes:**

```sql
-- Users
CONSTRAINT check_email_valid
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')

CONSTRAINT check_role
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER', ...))

-- Artifacts
CONSTRAINT check_artifact_type
  CHECK (type IN ('CODE', 'JSON', 'HTML', 'MARKDOWN', ...))

-- Finanzas
CONSTRAINT check_transaction_type
  CHECK (type IN ('income', 'expense', 'transfer'))

-- Health
CONSTRAINT check_medication_status
  CHECK (status IN ('tomado', 'omitido', 'retrasado'))
```

---

### 11. Ejemplo de Query N+1 a Evitar

**INCORRECTO (N+1):**
```typescript
const users = await prisma.user.findMany();
for (const user of users) {
  user.agents = await prisma.agent.findMany({
    where: { createdBy: user.id }
  });
}
// N queries (1 usuarios + N agentes)
```

**CORRECTO (Eager Loading):**
```typescript
const users = await prisma.user.findMany({
  include: {
    createdAgents: true,
    chatSessions: {
      take: 10,
      orderBy: { lastActivity: 'desc' }
    }
  }
});
// 1 query con JOIN
```

---

### 12. Versionamiento Artifacts

**Cómo implementar versionamiento sin tabla separate:**

```sql
-- Crear artifact v1
INSERT INTO artifacts (id, name, type, content, version)
VALUES ('uuid-v1', 'my-code', 'CODE', '...', 1)

-- Crear v2 (parent_id apunta a v1)
INSERT INTO artifacts (id, name, type, content, version, parent_id)
VALUES ('uuid-v2', 'my-code', 'CODE', '...', 2, 'uuid-v1')

-- Obtener todas las versiones
SELECT id, version, content, created_at
FROM artifacts
WHERE id = 'uuid-v1' OR parent_id = 'uuid-v1'
ORDER BY version ASC
```

---

## Tablas Excluidas de Diagrama

Tablas que existen en schema pero NO incluidas en diagrama (clutter visual):

| Tabla | Razón de Exclusión |
|-------|-------------------|
| `verification_tokens` | Solo referencia temporal |
| `usage_alerts` | Derivada de monthly_usage |

**Pero están presentes en el schema completo (DATABASE.md)**

---

## Cómo Leer este Diagrama

### Paso 1: Identificar el Dominio
- Busca el color del dominio que te interesa
- Ejemplo: Para entender chats → busca verde #10b981

### Paso 2: Seguir las Relaciones
- Las flechas indican dirección de relación
- `||--o{` = 1 usuario → muchas sesiones
- `||--||` = 1:1 (usuarios y settings)

### Paso 3: Entender el Flujo
**Ejemplo - Chat completo:**
```
USERS (azul)
  ↓ (1:N)
CHAT_SESSIONS (verde)
  ↓ (1:N)
CONVERSATIONS (verde)
  ↓ (1:N)
MESSAGES (verde)
  ↓ (1:N)
ARTIFACTS (naranja)
```

### Paso 4: Ver Datos Sensibles
- Busca campos con encriptación requerida
- Ejemplo: HEALTH_PROFILES, MCP_INTEGRATIONS
- Son críticos para seguridad/compliance

---

## Síntesis: Cómo Implementar

### Orden Recomendado para Migrations

1. **Autenticación (Fase 1):** users, accounts, auth_sessions
2. **Configuración usuario:** user_settings, verification_tokens, invitations
3. **Agentes (Fase 1):** agents, user_agent_permissions
4. **Chats (Fase 1):** chat_sessions, conversations, messages, artifacts
5. **RAG & Métricas (Fase 1):** rag_documents, usage_logs, monthly_usage, audit_logs
6. **MCPs & Storage (Fase 2):** mcp_integrations, storage_*
7. **Salud & Finanzas (Fase 3):** health_profiles, financial_profiles
8. **Soporte (Fase 2):** support_tickets, support_messages

---

## Referencias

- **Definición de Schema:** `/sys-docs/database/DATABASE.md`
- **Arquitectura:** `/sys-docs/architecture/01-system-architecture.md`
- **ADR-002:** Dual Database (PostgreSQL + Pinecone)
- **ADR-004:** Artifact-Based Data Model

---

**Document Owner:** Data Architect
**Created:** 2025-10-22
**Status:** PRODUCTION READY
**Last Updated:** 2025-10-22

Este diagrama debe ser revisado y actualizado cuando:
- Se agreguen nuevas tablas a schema
- Cambien cardinalidades importantes
- Se modifique strategy de soft deletes
- Cambios arquitectónicos significativos (>3 meses)

# PostgreSQL Database Schema - cjhirashi-agents MVP

**Version:** 1.0
**Date:** 2025-10-22
**Status:** PRODUCTION READY
**Database:** PostgreSQL 14+ (Neon Serverless)
**ORM:** Prisma 6.17.1

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Entity Relationship Overview](#entity-relationship-overview)
3. [Tablas por Dominio](#tablas-por-dominio)
   - [1. Autenticación & Usuarios (7 tablas)](#1-autenticación--usuarios)
   - [2. Sistema de Agentes (6 tablas)](#2-sistema-de-agentes)
   - [3. Chats & Conversaciones (4 tablas)](#3-chats--conversaciones)
   - [4. Artifacts & Contenido (2 tablas)](#4-artifacts--contenido)
   - [5. RAG & Embeddings (2 tablas)](#5-rag--embeddings)
   - [6. MCPs & Integraciones (2 tablas)](#6-mcps--integraciones)
   - [7. Storage & Files (5 tablas)](#7-storage--files)
   - [8. Sistema de Salud (6 tablas)](#8-sistema-de-salud)
   - [9. Sistema Financiero (8 tablas)](#9-sistema-financiero)
   - [10. Métricas & Auditoría (4 tablas)](#10-métricas--auditoría)
   - [11. Soporte & Tickets (2 tablas)](#11-soporte--tickets)
4. [Índices Estratégicos](#índices-estratégicos)
5. [Triggers & Constraints](#triggers--constraints)
6. [Migration Path](#migration-path)
7. [Performance Tuning](#performance-tuning)
8. [Backup & Recovery](#backup--recovery)
9. [Notas de Implementación](#notas-de-implementación)

---

## Resumen Ejecutivo

### Estadísticas del Schema

- **Total Tablas:** 54
- **Total Índices:** 150+ (incluyendo PKs y FKs)
- **ENUMs:** 15
- **Relaciones:** 80+ foreign keys
- **JSONB Fields:** 25+ (para flexibilidad)
- **Triggers:** 3 (audit log, timestamps, soft deletes)

### Características Principales

- **Multi-tenant:** Todos los datos particionados por `userId`
- **Soft Deletes:** Tablas críticas tienen `deletedAt` para recovery
- **Auditoría Completa:** Tabla `audit_logs` con triggers automáticos
- **JSONB Flexibility:** Metadata y configuraciones en JSONB
- **Type Safety:** 100% compatible con Prisma TypeScript types
- **Performance:** Índices estratégicos en queries frecuentes
- **Escalabilidad:** Diseñado para 10K+ usuarios, 1M+ mensajes

### Filosofía de Diseño

1. **Normalización First:** Evitar duplicación de datos
2. **JSONB for Flexibility:** Config y metadata en JSONB (sin migrations constantes)
3. **Strategic Denormalization:** Contadores pre-calculados para dashboards
4. **Cascade Deletes:** User delete limpia TODO su data automáticamente
5. **Timestamps Everywhere:** created_at, updated_at en todas las tablas
6. **UUID over Auto-increment:** Mejor para sistemas distribuidos

---

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CJHIRASHI-AGENTS DATABASE                       │
│                     PostgreSQL Schema Overview                      │
└─────────────────────────────────────────────────────────────────────┘

AUTHENTICATION & USERS
  User (central entity)
    ├── 1:N → Account (OAuth providers)
    ├── 1:N → Session (auth sessions)
    ├── 1:1 → UserSettings (preferences)
    ├── 1:1 → HealthProfile (medical data)
    ├── 1:1 → FinancialProfile (financial data)
    ├── 1:N → Invitation (sent/received)
    └── 1:1 → StorageQuota (storage limits)

AGENTS & CONVERSATIONS
  Agent
    ├── 1:N → Conversation
    ├── 1:N → UserAgentPermission (access control)
    └── 1:N → UsageLog (metrics)

  ChatSession
    └── 1:N → Conversation
        └── 1:N → Message
            └── 1:N → Artifact

RAG & DOCUMENTS
  Document (PostgreSQL metadata)
    └── Embeddings stored in Pinecone (vectorIds reference)

MCP INTEGRATIONS
  MCPIntegration (Gmail, Calendar, Notion)
    └── 1:N → MCPSyncLog

STORAGE
  StorageFolder (hierarchical)
    └── 1:N → StorageFile
        ├── 1:N → FileAccessLog
        └── 1:N → FileShare

HEALTH SYSTEM
  HealthProfile
    ├── 1:N → MedicalCondition
    ├── 1:N → Medication → 1:N → MedicationLog
    ├── 1:N → Allergy
    ├── 1:N → MedicalAppointment
    └── 1:N → HealthMeasurement

FINANCIAL SYSTEM
  FinancialProfile
    ├── 1:N → FinancialAccount → 1:N → Transaction
    ├── 1:N → Budget
    ├── 1:N → Debt → 1:N → DebtPayment
    ├── 1:N → Investment
    └── 1:N → RecurringPayment

METRICS & AUDIT
  UsageLog (per message/agent usage)
  MonthlyUsage (aggregated per user)
  UsageAlert (warnings)
  AuditLog (admin actions)

SUPPORT
  SupportTicket
    └── 1:N → SupportMessage
```

---

## Tablas por Dominio

## 1. Autenticación & Usuarios

### Tabla: `users`

**Descripción:** Registro central de todos los usuarios del sistema

**Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified TIMESTAMP,

  -- Información básica
  name VARCHAR(255),
  display_name VARCHAR(255),
  avatar VARCHAR(500),
  date_of_birth DATE,
  timezone VARCHAR(100) DEFAULT 'America/Mexico_City',
  language VARCHAR(10) DEFAULT 'es',
  bio TEXT,

  -- Sistema de roles y permisos
  role VARCHAR(50) DEFAULT 'USER' CHECK (role IN (
    'SUPER_ADMIN', 'ADMIN', 'INVITED_AGENT', 'INVITED_STORAGE',
    'SUBSCRIBER', 'MANAGER', 'DEVELOPER', 'USER', 'GUEST'
  )),
  permissions JSONB,
  is_active BOOLEAN DEFAULT TRUE,

  -- Perfil de personalidad generado por IA
  personality_profile JSONB,
  ai_profile_last_update TIMESTAMP,

  -- Sistema de suscripciones
  subscription_tier VARCHAR(50) DEFAULT 'FREE' CHECK (subscription_tier IN (
    'FREE', 'BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM', 'UNLIMITED'
  )),
  subscription_id VARCHAR(255),
  subscription_start TIMESTAMP,
  subscription_end TIMESTAMP,
  custom_limits JSONB,

  -- Métricas de uso (pre-calculadas para performance)
  total_messages INT DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  monthly_messages INT DEFAULT 0,
  monthly_tokens BIGINT DEFAULT 0,
  last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_interaction TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT check_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_last_interaction ON users(last_interaction DESC);
```

**Relaciones:**
- 1:N con `accounts` (OAuth providers)
- 1:N con `sessions` (auth sessions)
- 1:N con `chat_sessions`
- 1:N con `agents`
- 1:N con `artifacts`
- 1:1 con `health_profiles`
- 1:1 con `financial_profiles`
- 1:1 con `storage_quotas`

**Notas:**
- UUID para evitar enumeration attacks
- `permissions` JSONB para permisos granulares custom
- `personality_profile` generado por IA para personalización
- Contadores pre-calculados evitan queries complejos en dashboard

---

### Tabla: `accounts`

**Descripción:** Proveedores de autenticación OAuth (Google, GitHub, etc)

**Schema:**
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,

  -- OAuth tokens (encriptados)
  refresh_token TEXT,
  access_token TEXT,
  expires_at INT,
  token_type VARCHAR(50),
  scope TEXT,
  id_token TEXT,
  session_state VARCHAR(255),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider, provider_account_id);
```

**Notas:**
- Tokens deben encriptarse en application layer (AES-256)
- `expires_at` es Unix timestamp
- Cascade delete: eliminar user elimina sus accounts

---

### Tabla: `sessions`

**Descripción:** Sesiones de autenticación activas (JWT/session tokens)

**Schema:**
```sql
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(500) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Metadata opcional
  ip_address INET,
  user_agent TEXT,
  device_info JSONB
);

CREATE INDEX idx_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_sessions_token ON auth_sessions(session_token);
CREATE INDEX idx_sessions_expires ON auth_sessions(expires) WHERE expires > CURRENT_TIMESTAMP;
```

**Notas:**
- `session_token` debe ser hash en BD (SHA-256)
- Auto-limpieza de sesiones expiradas via cronjob
- `device_info` para tracking multi-dispositivo

---

### Tabla: `verification_tokens`

**Descripción:** Tokens temporales para email verification, password reset

**Schema:**
```sql
CREATE TABLE verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires TIMESTAMP NOT NULL,

  PRIMARY KEY (identifier, token)
);

CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_expires ON verification_tokens(expires);
```

**Notas:**
- Limpieza automática de tokens expirados
- `identifier` es email o user_id
- Tokens deben ser crypto-random (32+ bytes)

---

### Tabla: `invitations`

**Descripción:** Sistema de invitaciones para nuevos usuarios

**Schema:**
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'SUPER_ADMIN', 'ADMIN', 'INVITED_AGENT', 'INVITED_STORAGE',
    'SUBSCRIBER', 'MANAGER', 'DEVELOPER', 'USER', 'GUEST'
  )),
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'
  )),
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_invited_by ON invitations(invited_by);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status) WHERE status = 'PENDING';
```

**Notas:**
- Token debe expirar en 7 días (configurable)
- Auto-cancelación de invitaciones duplicadas
- Tracking de quién invitó para auditoría

---

### Tabla: `user_settings`

**Descripción:** Preferencias y configuraciones por usuario

**Schema:**
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- LLM Preferences
  default_model VARCHAR(100) DEFAULT 'gemini-2.0-flash',
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature BETWEEN 0 AND 2),
  max_tokens INT DEFAULT 4096 CHECK (max_tokens > 0),

  -- UI Preferences
  theme VARCHAR(50) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language VARCHAR(10) DEFAULT 'es',
  code_theme VARCHAR(50) DEFAULT 'vs-dark',

  -- RAG Settings
  rag_enabled BOOLEAN DEFAULT TRUE,
  rag_top_k INT DEFAULT 5 CHECK (rag_top_k BETWEEN 1 AND 20),
  rag_min_score DECIMAL(3,2) DEFAULT 0.7 CHECK (rag_min_score BETWEEN 0 AND 1),

  -- Notifications
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  notification_preferences JSONB,

  -- Advanced
  advanced_settings JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

**Notas:**
- Una fila por usuario (1:1 relationship)
- `notification_preferences` permite granularidad (email, push, slack, etc)
- Defaults sensibles para onboarding rápido

---

### Tabla: `audit_logs`

**Descripción:** Log de acciones sensibles (cambios de rol, eliminaciones, etc)

**Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_id UUID,
  target_type VARCHAR(50),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
```

**Notas:**
- Nunca eliminar audit logs (retention: 2 años)
- `action` ejemplos: INVITE_USER, DELETE_USER, CHANGE_ROLE, MODIFY_QUOTA
- `details` contiene estado anterior/posterior para rollback
- IP y user agent para forensics

---

## 2. Sistema de Agentes

### Tabla: `agents`

**Descripción:** Agentes IA especializados creados por usuarios

**Schema:**
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identificación
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,

  -- Configuración técnica
  model VARCHAR(100) NOT NULL,
  config JSONB,
  endpoint_url VARCHAR(500) NOT NULL,
  system_prompt TEXT,

  -- Visibilidad y permisos
  is_public BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Documentación
  documentation_url VARCHAR(500),
  tutorial_url VARCHAR(500),
  capabilities JSONB,

  -- Estadísticas (pre-calculadas)
  total_uses INT DEFAULT 0,
  total_messages INT DEFAULT 0,
  average_rating DECIMAL(3,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT check_slug_format CHECK (slug ~* '^[a-z0-9\-]+$')
);

CREATE INDEX idx_agents_created_by ON agents(created_by);
CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_category ON agents(category);
CREATE INDEX idx_agents_is_public ON agents(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_agents_is_active ON agents(is_active) WHERE is_active = TRUE;
```

**Relaciones:**
- 1:N con `conversations`
- 1:N con `user_agent_permissions`
- 1:N con `artifacts`

**Notas:**
- `slug` debe ser URL-safe (lowercase, hyphens)
- `config` JSONB permite configuración flexible por modelo
- `capabilities` lista de capacidades (ej: ["code_execution", "web_search", "image_generation"])

---

### Tabla: `user_agent_permissions`

**Descripción:** Control de acceso granular de usuarios a agentes

**Schema:**
```sql
CREATE TABLE user_agent_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, agent_id)
);

CREATE INDEX idx_user_agent_permissions_user_id ON user_agent_permissions(user_id);
CREATE INDEX idx_user_agent_permissions_agent_id ON user_agent_permissions(agent_id);
```

**Notas:**
- Usuarios con agente público automáticamente tienen permiso
- Agentes privados requieren grant explícito
- Admin puede revocar permisos

---

## 3. Chats & Conversaciones

### Tabla: `chat_sessions`

**Descripción:** Sesiones de chat (pueden contener múltiples conversaciones con diferentes agentes)

**Schema:**
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_last_activity ON chat_sessions(last_activity DESC);
```

**Notas:**
- Una sesión agrupa conversaciones de una "jornada" de trabajo
- `last_activity` actualizado con cada mensaje
- `metadata` puede incluir contexto de sesión (proyecto, objetivo, etc)

---

### Tabla: `conversations`

**Descripción:** Conversaciones específicas con un agente dentro de una sesión

**Schema:**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  title VARCHAR(500) NOT NULL,
  summary TEXT,

  -- Metadata
  message_count INT DEFAULT 0,
  token_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_session_id ON conversations(chat_session_id);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
```

**Notas:**
- `title` auto-generado por IA basado en primeros mensajes
- `summary` generado al finalizar conversación (si > 10 mensajes)
- Contadores pre-calculados para performance

---

### Tabla: `messages`

**Descripción:** Mensajes individuales en una conversación

**Schema:**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Métricas
  tokens_input INT,
  tokens_output INT,

  -- Metadata
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_role ON messages(role);
```

**Notas:**
- `metadata` puede incluir: model_used, latency_ms, cost, etc
- Content puede ser muy largo (usar TEXT, no VARCHAR)
- Búsqueda full-text via GIN index (agregar si necesario)

---

## 4. Artifacts & Contenido

### Tabla: `artifacts`

**Descripción:** Outputs estructurados generados por agentes (código, imágenes, diagramas, etc)

**Schema:**
```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Core fields
  name VARCHAR(500) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'CODE', 'JSON', 'HTML', 'MARKDOWN', 'LATEX',
    'DIAGRAM', 'IMAGE', 'TABLE', 'WIDGET', 'FILE'
  )),
  content TEXT NOT NULL,

  -- Versionamiento
  version INT DEFAULT 1,
  parent_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,

  -- Metadata (tipo-específico)
  metadata JSONB,
  tags JSONB,

  -- Large content overflow (Vercel Blob)
  blob_url VARCHAR(500),
  blob_size BIGINT,

  -- Compartir
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(500) UNIQUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_artifacts_agent_id ON artifacts(agent_id);
CREATE INDEX idx_artifacts_user_id ON artifacts(user_id);
CREATE INDEX idx_artifacts_conversation_id ON artifacts(conversation_id);
CREATE INDEX idx_artifacts_type ON artifacts(type);
CREATE INDEX idx_artifacts_parent_id ON artifacts(parent_id);
CREATE INDEX idx_artifacts_share_token ON artifacts(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_artifacts_created_at ON artifacts(created_at DESC);

-- GIN index para búsqueda en metadata/tags
CREATE INDEX idx_artifacts_metadata_gin ON artifacts USING GIN (metadata);
CREATE INDEX idx_artifacts_tags_gin ON artifacts USING GIN (tags);
```

**Notas:**
- Ver ADR-004 para detalles de metadata por tipo
- Content > 1MB va a Vercel Blob (blob_url)
- Versionamiento mediante self-reference (parent_id)
- `share_token` genera URL pública temporal

**Ejemplos de metadata por tipo:**
```jsonb
-- CODE
{
  "language": "typescript",
  "syntax": "class",
  "executable": false,
  "dependencies": ["react", "next"]
}

-- IMAGE
{
  "url": "https://blob.vercel.com/...",
  "width": 1024,
  "height": 1024,
  "model": "dall-e-3",
  "prompt": "..."
}

-- DIAGRAM
{
  "diagramType": "mermaid",
  "source": "graph TD...",
  "rendered": "https://..."
}
```

---

## 5. RAG & Embeddings

### Tabla: `rag_documents`

**Descripción:** Metadata de documentos indexados (embeddings en Pinecone)

**Schema:**
```sql
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Document info
  title VARCHAR(500) NOT NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('FILE', 'PASTE', 'URL', 'MCP', 'SYSTEM')),
  source_url VARCHAR(500),
  mime_type VARCHAR(100),

  -- Indexing status
  indexed BOOLEAN DEFAULT FALSE,
  vector_ids TEXT[], -- Array de Pinecone vector IDs
  chunk_count INT DEFAULT 0,

  -- Metadata
  tags TEXT[],
  metadata JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rag_documents_user_id ON rag_documents(user_id);
CREATE INDEX idx_rag_documents_indexed ON rag_documents(indexed);
CREATE INDEX idx_rag_documents_source ON rag_documents(source);
CREATE INDEX idx_rag_documents_created_at ON rag_documents(created_at DESC);

-- GIN index para búsqueda en tags
CREATE INDEX idx_rag_documents_tags_gin ON rag_documents USING GIN (tags);
```

**Notas:**
- Embeddings almacenados en Pinecone (no en PostgreSQL)
- `vector_ids` lista de IDs en Pinecone para sync
- Chunking en application layer (512 tokens/chunk, overlap 50)
- Ver ADR-002 para detalles de arquitectura dual DB

---

### Tabla: `rag_settings`

**Descripción:** Configuración de RAG por usuario

**Schema:**
```sql
CREATE TABLE rag_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  top_k INT DEFAULT 5 CHECK (top_k BETWEEN 1 AND 20),
  threshold DECIMAL(3,2) DEFAULT 0.7 CHECK (threshold BETWEEN 0 AND 1),
  collections TEXT[], -- Filtrar por colecciones específicas
  advanced_settings JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rag_settings_user_id ON rag_settings(user_id);
```

**Notas:**
- `top_k`: cuántos chunks recuperar
- `threshold`: score mínimo de similitud
- `collections`: filtrar por etiquetas/categorías

---

## 6. MCPs & Integraciones

### Tabla: `mcp_integrations`

**Descripción:** Integraciones con servicios externos (Gmail, Calendar, Notion)

**Schema:**
```sql
CREATE TABLE mcp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  provider VARCHAR(50) NOT NULL CHECK (provider IN ('GMAIL', 'CALENDAR', 'NOTION', 'SLACK', 'GITHUB')),

  -- OAuth tokens (ENCRYPTED en application layer)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  scopes TEXT NOT NULL,
  expires_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sync TIMESTAMP,

  -- Metadata
  provider_user_id VARCHAR(255),
  metadata JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, provider)
);

CREATE INDEX idx_mcp_integrations_user_id ON mcp_integrations(user_id);
CREATE INDEX idx_mcp_integrations_provider ON mcp_integrations(provider);
CREATE INDEX idx_mcp_integrations_active ON mcp_integrations(is_active) WHERE is_active = TRUE;
```

**Notas:**
- Tokens DEBEN encriptarse (AES-256) antes de guardar
- `expires_at` para refresh automático
- Único por (user_id, provider) - solo 1 integración por servicio

---

### Tabla: `mcp_sync_logs`

**Descripción:** Log de sincronizaciones con servicios MCP

**Schema:**
```sql
CREATE TABLE mcp_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES mcp_integrations(id) ON DELETE CASCADE,

  last_sync TIMESTAMP NOT NULL,
  items_synced INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
  error_message TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mcp_sync_logs_integration_id ON mcp_sync_logs(integration_id);
CREATE INDEX idx_mcp_sync_logs_created_at ON mcp_sync_logs(created_at DESC);
CREATE INDEX idx_mcp_sync_logs_status ON mcp_sync_logs(status) WHERE status = 'FAILED';
```

**Notas:**
- Debugging de problemas de sync
- Alertar si múltiples fallos consecutivos
- Retention: 30 días

---

## 7. Storage & Files

### Tabla: `storage_files`

**Descripción:** Archivos almacenados en Vercel Blob

**Schema:**
```sql
CREATE TABLE storage_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- File info
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  storage_path VARCHAR(1000) NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'VERCEL_BLOB' CHECK (storage_provider IN ('VERCEL_BLOB', 'LOCAL', 'AWS_S3', 'CLOUDFLARE_R2')),
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  checksum VARCHAR(64) NOT NULL, -- SHA-256

  -- Owner y contexto
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES storage_folders(id) ON DELETE SET NULL,

  -- Control de acceso
  access_level VARCHAR(50) DEFAULT 'PRIVATE' CHECK (access_level IN ('PRIVATE', 'INTERNAL', 'PUBLIC', 'SHARED')),
  usage_context VARCHAR(50) DEFAULT 'OTHER' CHECK (usage_context IN (
    'THEME', 'AVATAR', 'TICKET', 'ARTIFACT', 'HEALTH', 'FINANCE', 'BACKUP', 'TEMP', 'OTHER'
  )),

  -- Seguridad
  encrypted BOOLEAN DEFAULT FALSE,
  encryption_key_id VARCHAR(255),

  -- Procesamiento
  is_processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50),
  thumbnail_path VARCHAR(1000),
  metadata JSONB,

  -- Virus scanning
  virus_scan_status VARCHAR(50),
  virus_scan_date TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP, -- Soft delete
  expires_at TIMESTAMP -- Para archivos temporales
);

CREATE INDEX idx_storage_files_user_id ON storage_files(user_id);
CREATE INDEX idx_storage_files_folder_id ON storage_files(folder_id);
CREATE INDEX idx_storage_files_usage_context ON storage_files(usage_context);
CREATE INDEX idx_storage_files_storage_provider ON storage_files(storage_provider);
CREATE INDEX idx_storage_files_created_at ON storage_files(created_at DESC);
CREATE INDEX idx_storage_files_expires_at ON storage_files(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_storage_files_deleted_at ON storage_files(deleted_at) WHERE deleted_at IS NULL;
```

**Notas:**
- `checksum` para deduplicación y validación de integridad
- `usage_context` para cuotas por tipo (ej: HEALTH tiene límites especiales)
- Soft delete para recovery
- Virus scanning async (ClamAV o VirusTotal API)

---

### Tabla: `storage_folders`

**Descripción:** Organización jerárquica de archivos

**Schema:**
```sql
CREATE TABLE storage_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES storage_folders(id) ON DELETE CASCADE,
  path VARCHAR(2000) NOT NULL, -- Full path: "/docs/health"

  -- Metadata
  description TEXT,
  color VARCHAR(50),
  icon VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, path)
);

CREATE INDEX idx_storage_folders_user_id ON storage_folders(user_id);
CREATE INDEX idx_storage_folders_parent_id ON storage_folders(parent_id);
CREATE INDEX idx_storage_folders_path ON storage_folders(path);
```

**Notas:**
- Path debe actualizarse en cascade si se mueve folder padre
- Color e icon para UI (personalización)

---

### Tabla: `storage_quotas`

**Descripción:** Cuotas de almacenamiento por usuario

**Schema:**
```sql
CREATE TABLE storage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Límites
  max_storage BIGINT NOT NULL, -- Bytes
  max_file_size BIGINT NOT NULL,
  max_files INT NOT NULL,

  -- Uso actual (pre-calculado)
  used_storage BIGINT DEFAULT 0,
  file_count INT DEFAULT 0,

  -- Desglose por contexto
  usage_breakdown JSONB,

  -- Tier de suscripción
  subscription_tier VARCHAR(50) DEFAULT 'FREE',

  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_storage_quotas_user_id ON storage_quotas(user_id);
```

**Ejemplo de `usage_breakdown`:**
```jsonb
{
  "THEME": 1048576,      // 1 MB
  "AVATAR": 512000,      // 500 KB
  "HEALTH": 104857600,   // 100 MB
  "FINANCE": 52428800,   // 50 MB
  "OTHER": 209715200     // 200 MB
}
```

---

### Tabla: `file_access_logs`

**Descripción:** Auditoría de acceso a archivos

**Schema:**
```sql
CREATE TABLE file_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES storage_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  action VARCHAR(50) NOT NULL CHECK (action IN ('UPLOAD', 'DOWNLOAD', 'VIEW', 'DELETE', 'SHARE', 'UPDATE')),
  ip_address INET,
  user_agent TEXT,

  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_access_logs_file_id ON file_access_logs(file_id);
CREATE INDEX idx_file_access_logs_user_id ON file_access_logs(user_id);
CREATE INDEX idx_file_access_logs_timestamp ON file_access_logs(timestamp DESC);
CREATE INDEX idx_file_access_logs_action ON file_access_logs(action);
```

**Notas:**
- Crítico para compliance (GDPR, HIPAA si maneja datos médicos)
- Retention: 1 año

---

### Tabla: `file_shares`

**Descripción:** Sistema de compartición de archivos

**Schema:**
```sql
CREATE TABLE file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES storage_files(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,

  -- Tipo de compartición
  share_type VARCHAR(50) DEFAULT 'LINK' CHECK (share_type IN ('LINK', 'EMAIL', 'USER')),
  share_token VARCHAR(500) UNIQUE NOT NULL,

  -- Control de acceso
  password VARCHAR(255), -- Hashed
  max_downloads INT,
  download_count INT DEFAULT 0,

  -- Permisos
  allow_download BOOLEAN DEFAULT TRUE,
  allow_view BOOLEAN DEFAULT TRUE,

  -- Expiración
  expires_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP,
  revoked_at TIMESTAMP
);

CREATE INDEX idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX idx_file_shares_share_token ON file_shares(share_token);
CREATE INDEX idx_file_shares_expires_at ON file_shares(expires_at) WHERE expires_at IS NOT NULL;
```

**Notas:**
- `share_token` debe ser crypto-random (32+ bytes)
- Password opcional para shares sensibles
- Auto-revocación cuando expires_at

---

## 8. Sistema de Salud

### Tabla: `health_profiles`

**Descripción:** Perfil médico del usuario (HIPAA-sensitive)

**Schema:**
```sql
CREATE TABLE health_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Información básica
  blood_type VARCHAR(10),
  height DECIMAL(5,2), -- cm
  weight DECIMAL(5,2), -- kg
  sex VARCHAR(20),

  -- Contactos de emergencia (ENCRYPTED)
  emergency_contacts JSONB,

  -- Información de seguros (ENCRYPTED)
  insurance_info JSONB,

  -- Datos altamente sensibles (ENCRYPTED)
  encrypted_data TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_profiles_user_id ON health_profiles(user_id);
```

**Notas:**
- Campos sensibles DEBEN encriptarse (AES-256)
- Restricción de acceso estricta (solo usuario propietario)
- Backup separado con encriptación adicional

---

### Tabla: `medical_conditions`

**Descripción:** Condiciones médicas del usuario

**Schema:**
```sql
CREATE TABLE medical_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_profile_id UUID NOT NULL REFERENCES health_profiles(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- "crónica", "aguda", "genética"
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('leve', 'moderada', 'severa')),
  diagnosed_date DATE,
  diagnosed_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'activa' CHECK (status IN ('activa', 'remisión', 'curada')),

  notes TEXT,
  treatment JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medical_conditions_health_profile_id ON medical_conditions(health_profile_id);
CREATE INDEX idx_medical_conditions_status ON medical_conditions(status);
```

---

### Tabla: `medications`

**Descripción:** Medicamentos actuales del usuario

**Schema:**
```sql
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_profile_id UUID NOT NULL REFERENCES health_profiles(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  route VARCHAR(50) NOT NULL, -- "oral", "intravenosa", "tópica"

  prescribed_by VARCHAR(255),
  prescribed_date DATE,
  start_date DATE NOT NULL,
  end_date DATE,

  purpose TEXT,
  side_effects TEXT,
  interactions JSONB,

  -- Sistema de recordatorios
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_times JSONB, -- ["08:00", "20:00"]

  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medications_health_profile_id ON medications(health_profile_id);
CREATE INDEX idx_medications_is_active ON medications(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_medications_reminder_enabled ON medications(reminder_enabled) WHERE reminder_enabled = TRUE;
```

---

### Tabla: `medication_logs`

**Descripción:** Registro de adherencia a medicamentos

**Schema:**
```sql
CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,

  scheduled_time TIMESTAMP NOT NULL,
  taken_time TIMESTAMP,
  status VARCHAR(50) NOT NULL CHECK (status IN ('tomado', 'omitido', 'retrasado')),
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_scheduled_time ON medication_logs(scheduled_time DESC);
CREATE INDEX idx_medication_logs_status ON medication_logs(status);
```

---

### Tabla: `allergies`

**Descripción:** Alergias del usuario

**Schema:**
```sql
CREATE TABLE allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_profile_id UUID NOT NULL REFERENCES health_profiles(id) ON DELETE CASCADE,

  allergen VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('medicamento', 'alimento', 'ambiental', 'otro')),
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('leve', 'moderada', 'severa', 'anafiláctica')),
  reaction TEXT,
  diagnosed_date DATE,

  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_allergies_health_profile_id ON allergies(health_profile_id);
CREATE INDEX idx_allergies_severity ON allergies(severity);
```

---

### Tabla: `medical_appointments`

**Descripción:** Citas médicas

**Schema:**
```sql
CREATE TABLE medical_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_profile_id UUID NOT NULL REFERENCES health_profiles(id) ON DELETE CASCADE,

  type VARCHAR(100) NOT NULL,
  specialty VARCHAR(100),
  doctor_name VARCHAR(255),
  facility VARCHAR(255),

  scheduled_date TIMESTAMP NOT NULL,
  duration INT, -- minutos

  status VARCHAR(50) DEFAULT 'programada' CHECK (status IN ('programada', 'completada', 'cancelada', 'perdida')),
  reason TEXT,
  notes TEXT,
  results TEXT,

  -- Recordatorios
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_time TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medical_appointments_health_profile_id ON medical_appointments(health_profile_id);
CREATE INDEX idx_medical_appointments_scheduled_date ON medical_appointments(scheduled_date DESC);
CREATE INDEX idx_medical_appointments_status ON medical_appointments(status);
```

---

### Tabla: `health_measurements`

**Descripción:** Mediciones de salud (peso, presión, glucosa, etc)

**Schema:**
```sql
CREATE TABLE health_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_profile_id UUID NOT NULL REFERENCES health_profiles(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL, -- "weight", "blood_pressure", "glucose", "heart_rate"
  value JSONB NOT NULL, -- Estructura flexible por tipo
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_measurements_health_profile_id ON health_measurements(health_profile_id);
CREATE INDEX idx_health_measurements_type_measured_at ON health_measurements(type, measured_at DESC);
```

**Ejemplos de `value`:**
```jsonb
-- Peso
{ "kg": 75.5 }

-- Presión arterial
{ "systolic": 120, "diastolic": 80 }

-- Glucosa
{ "mg_dl": 95, "fasting": true }

-- Frecuencia cardíaca
{ "bpm": 72 }
```

---

## 9. Sistema Financiero

### Tabla: `financial_profiles`

**Descripción:** Perfil financiero del usuario

**Schema:**
```sql
CREATE TABLE financial_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  currency VARCHAR(10) DEFAULT 'MXN',
  fiscal_year VARCHAR(50) DEFAULT 'calendar',

  -- Metas financieras
  financial_goals JSONB,

  -- Análisis generado por IA
  ai_analysis JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_profiles_user_id ON financial_profiles(user_id);
```

---

### Tabla: `financial_accounts`

**Descripción:** Cuentas bancarias y tarjetas

**Schema:**
```sql
CREATE TABLE financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_profile_id UUID NOT NULL REFERENCES financial_profiles(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'investment', 'cash')),
  institution VARCHAR(255),

  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'MXN',

  last_sync_date TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,

  -- Para tarjetas de crédito
  credit_limit DECIMAL(15,2),
  available_credit DECIMAL(15,2),
  closing_date INT, -- Día del mes
  payment_due_date INT, -- Día del mes

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_accounts_profile_id ON financial_accounts(financial_profile_id);
CREATE INDEX idx_financial_accounts_type ON financial_accounts(type);
CREATE INDEX idx_financial_accounts_is_active ON financial_accounts(is_active) WHERE is_active = TRUE;
```

---

### Tabla: `transactions`

**Descripción:** Transacciones financieras

**Schema:**
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_profile_id UUID NOT NULL REFERENCES financial_profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,

  date DATE NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),

  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  tags JSONB,

  -- Para transferencias
  from_account_id UUID REFERENCES financial_accounts(id),
  to_account_id UUID REFERENCES financial_accounts(id),

  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_payment_id UUID,

  notes TEXT,
  receipt VARCHAR(500), -- URL del recibo

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_profile_id_date ON transactions(financial_profile_id, date DESC);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_date ON transactions(category, date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
```

---

### Tabla: `budgets`

**Descripción:** Presupuestos por categoría

**Schema:**
```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_profile_id UUID NOT NULL REFERENCES financial_profiles(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  period VARCHAR(50) DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),

  start_date DATE NOT NULL,
  end_date DATE,

  alert_threshold INT DEFAULT 80, -- Porcentaje
  alert_sent BOOLEAN DEFAULT FALSE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budgets_profile_id ON budgets(financial_profile_id);
CREATE INDEX idx_budgets_category ON budgets(category);
CREATE INDEX idx_budgets_is_active ON budgets(is_active) WHERE is_active = TRUE;
```

---

### Tabla: `debts`

**Descripción:** Deudas y préstamos

**Schema:**
```sql
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_profile_id UUID NOT NULL REFERENCES financial_profiles(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('credit_card', 'personal_loan', 'mortgage', 'auto_loan', 'student_loan', 'other')),

  principal DECIMAL(15,2) NOT NULL,
  balance DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,

  monthly_payment DECIMAL(15,2) NOT NULL,
  minimum_payment DECIMAL(15,2),

  start_date DATE NOT NULL,
  maturity_date DATE,
  payment_due_day INT NOT NULL,

  creditor VARCHAR(255) NOT NULL,
  account_number VARCHAR(100),

  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
  payoff_strategy VARCHAR(50),
  priority INT DEFAULT 1,

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_debts_profile_id ON debts(financial_profile_id);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_debts_priority ON debts(priority);
```

---

### Tabla: `debt_payments`

**Descripción:** Historial de pagos de deudas

**Schema:**
```sql
CREATE TABLE debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  principal_paid DECIMAL(15,2) NOT NULL,
  interest_paid DECIMAL(15,2) NOT NULL,

  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_debt_payments_debt_id_date ON debt_payments(debt_id, date DESC);
```

---

### Tabla: `investments`

**Descripción:** Inversiones del usuario

**Schema:**
```sql
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_profile_id UUID NOT NULL REFERENCES financial_profiles(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('stock', 'bond', 'etf', 'mutual_fund', 'crypto', 'real_estate', 'other')),
  symbol VARCHAR(50),

  quantity DECIMAL(20,8),
  purchase_price DECIMAL(15,2) NOT NULL,
  current_price DECIMAL(15,2),
  current_value DECIMAL(15,2),

  purchase_date DATE NOT NULL,
  platform VARCHAR(255),

  returns DECIMAL(15,2),
  returns_percentage DECIMAL(5,2),

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_investments_profile_id ON investments(financial_profile_id);
CREATE INDEX idx_investments_type ON investments(type);
```

---

### Tabla: `recurring_payments`

**Descripción:** Pagos recurrentes (suscripciones, servicios)

**Schema:**
```sql
CREATE TABLE recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_profile_id UUID NOT NULL REFERENCES financial_profiles(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  category VARCHAR(100) NOT NULL,

  next_due_date DATE NOT NULL,
  day_of_month INT,
  day_of_week INT,

  auto_debit BOOLEAN DEFAULT FALSE,
  account_id UUID REFERENCES financial_accounts(id),

  start_date DATE NOT NULL,
  end_date DATE,

  is_active BOOLEAN DEFAULT TRUE,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_days_before INT DEFAULT 3,

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recurring_payments_profile_id ON recurring_payments(financial_profile_id);
CREATE INDEX idx_recurring_payments_next_due_date ON recurring_payments(next_due_date);
CREATE INDEX idx_recurring_payments_is_active ON recurring_payments(is_active) WHERE is_active = TRUE;
```

---

## 10. Métricas & Auditoría

### Tabla: `usage_logs`

**Descripción:** Log detallado de uso de agentes (por mensaje)

**Schema:**
```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID,

  -- Métricas de uso
  tokens_input INT NOT NULL,
  tokens_output INT NOT NULL,
  total_tokens INT NOT NULL,
  model VARCHAR(100) NOT NULL,

  -- Costos (calculados según pricing)
  cost_input DECIMAL(10,6) NOT NULL,
  cost_output DECIMAL(10,6) NOT NULL,
  total_cost DECIMAL(10,6) NOT NULL,

  -- Metadata
  duration INT, -- milisegundos
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,

  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_logs_user_id_timestamp ON usage_logs(user_id, timestamp DESC);
CREATE INDEX idx_usage_logs_agent_id_timestamp ON usage_logs(agent_id, timestamp DESC);
CREATE INDEX idx_usage_logs_conversation_id ON usage_logs(conversation_id);
```

**Notas:**
- Crítico para billing y analytics
- Costos calculados en application layer según pricing del LLM
- Retention: 1 año (archivar después)

---

### Tabla: `monthly_usage`

**Descripción:** Uso agregado por usuario por mes

**Schema:**
```sql
CREATE TABLE monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- Totales
  total_messages INT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Por agente
  agent_usage JSONB,

  -- Límites del mes
  limit_messages INT,
  limit_tokens BIGINT,

  -- Estado
  exceeded_limit BOOLEAN DEFAULT FALSE,
  warnings_sent INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, year, month)
);

CREATE INDEX idx_monthly_usage_user_id ON monthly_usage(user_id);
CREATE INDEX idx_monthly_usage_year_month ON monthly_usage(year DESC, month DESC);
```

**Ejemplo de `agent_usage`:**
```jsonb
{
  "agent-1-uuid": {
    "messages": 150,
    "tokens": 45000,
    "cost": 0.75
  },
  "agent-2-uuid": {
    "messages": 80,
    "tokens": 20000,
    "cost": 0.30
  }
}
```

---

### Tabla: `usage_alerts`

**Descripción:** Alertas de límites de uso

**Schema:**
```sql
CREATE TABLE usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('APPROACHING_LIMIT', 'LIMIT_WARNING', 'LIMIT_EXCEEDED', 'UNUSUAL_ACTIVITY')),
  threshold INT NOT NULL, -- Porcentaje
  triggered BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_alerts_user_id ON usage_alerts(user_id);
CREATE INDEX idx_usage_alerts_type ON usage_alerts(type);
CREATE INDEX idx_usage_alerts_triggered ON usage_alerts(triggered) WHERE triggered = TRUE;
```

**Notas:**
- Alertas a 80%, 90%, 100% de límite
- `resolved_at` cuando usuario upgrade plan o límite se reinicia

---

## 11. Soporte & Tickets

### Tabla: `support_tickets`

**Descripción:** Tickets de soporte con IA y escalación

**Schema:**
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) UNIQUE NOT NULL, -- Format: TICK-XXXXXX
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('BUG', 'FEATURE', 'QUESTION', 'ACCOUNT', 'BILLING', 'PERFORMANCE', 'OTHER')),
  priority VARCHAR(50) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED', 'CANCELLED')),

  -- Relaciones
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- IA
  ai_suggestion TEXT,
  ai_resolved BOOLEAN DEFAULT FALSE,

  -- Metadata
  metadata JSONB, -- Browser, OS, error stack, etc
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_assigned_to_id ON support_tickets(assigned_to_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_ticket_number ON support_tickets(ticket_number);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
```

**Notas:**
- `ticket_number` auto-generado: TICK-000001, TICK-000002
- IA (GPT-4) analiza ticket y sugiere soluciones
- Escalación automática según prioridad

---

### Tabla: `support_messages`

**Descripción:** Chat entre usuario y soporte dentro del ticket

**Schema:**
```sql
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT FALSE, -- true = admin/staff, false = usuario
  is_ai BOOLEAN DEFAULT FALSE, -- true = respuesta de IA
  author_id UUID, -- null si es IA

  attachments JSONB, -- URLs de archivos adjuntos
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at DESC);
```

**Notas:**
- Chat-like interface en UI
- IA responde automáticamente si tiene solución
- Staff puede intervenir en cualquier momento

---

## Índices Estratégicos

### Índices Compuestos Críticos

```sql
-- Queries frecuentes de dashboard
CREATE INDEX idx_users_tier_active ON users(subscription_tier, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_usage_logs_user_date ON usage_logs(user_id, timestamp DESC);
CREATE INDEX idx_conversations_user_agent ON conversations(chat_session_id, agent_id);

-- Búsqueda full-text
CREATE INDEX idx_messages_content_fulltext ON messages USING GIN (to_tsvector('english', content));
CREATE INDEX idx_artifacts_content_fulltext ON artifacts USING GIN (to_tsvector('english', content));

-- JSONB search
CREATE INDEX idx_artifacts_metadata_gin ON artifacts USING GIN (metadata);
CREATE INDEX idx_users_permissions_gin ON users USING GIN (permissions);

-- Performance de queries complejas
CREATE INDEX idx_storage_files_user_context ON storage_files(user_id, usage_context, deleted_at) WHERE deleted_at IS NULL;
```

---

## Triggers & Constraints

### Trigger: Auto-actualización de `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repetir para todas las tablas...
```

---

### Trigger: Audit Log Automático

```sql
CREATE OR REPLACE FUNCTION audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF (NEW.role IS DISTINCT FROM OLD.role OR
            NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier) THEN
            INSERT INTO audit_logs (admin_id, action, target_id, target_type, details)
            VALUES (
                COALESCE(current_setting('app.current_user_id', TRUE)::UUID, NEW.id),
                TG_OP || '_' || TG_TABLE_NAME,
                NEW.id,
                TG_TABLE_NAME,
                jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_user_changes AFTER UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();
```

---

### Trigger: Actualizar contadores pre-calculados

```sql
CREATE OR REPLACE FUNCTION update_usage_counters()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar monthly_usage
    INSERT INTO monthly_usage (user_id, year, month, total_messages, total_tokens, total_cost)
    VALUES (
        NEW.user_id,
        EXTRACT(YEAR FROM NEW.timestamp),
        EXTRACT(MONTH FROM NEW.timestamp),
        1,
        NEW.total_tokens,
        NEW.total_cost
    )
    ON CONFLICT (user_id, year, month)
    DO UPDATE SET
        total_messages = monthly_usage.total_messages + 1,
        total_tokens = monthly_usage.total_tokens + EXCLUDED.total_tokens,
        total_cost = monthly_usage.total_cost + EXCLUDED.total_cost,
        updated_at = CURRENT_TIMESTAMP;

    -- Actualizar users counters
    UPDATE users SET
        total_messages = total_messages + 1,
        total_tokens_used = total_tokens_used + NEW.total_tokens,
        monthly_messages = monthly_messages + 1,
        monthly_tokens = monthly_tokens + NEW.total_tokens,
        last_interaction = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usage_counters_trigger AFTER INSERT ON usage_logs
    FOR EACH ROW EXECUTE FUNCTION update_usage_counters();
```

---

## Migration Path

### Fase 1: Core MVP (Semana 1-2)

**Prioridad:** P0 (crítico)

```sql
-- Tables obligatorias para MVP
users
accounts
auth_sessions
verification_tokens
user_settings
agents
user_agent_permissions
chat_sessions
conversations
messages
artifacts
usage_logs
monthly_usage
audit_logs
```

**Comando:**
```bash
npx prisma migrate dev --name init_core_mvp
```

---

### Fase 2: Features Avanzadas (Semana 3-4)

**Prioridad:** P1 (importante)

```sql
-- RAG & Embeddings
rag_documents
rag_settings

-- MCP Integrations
mcp_integrations
mcp_sync_logs

-- Storage
storage_files
storage_folders
storage_quotas
file_access_logs
file_shares

-- Soporte
support_tickets
support_messages
```

**Comando:**
```bash
npx prisma migrate dev --name add_rag_mcp_storage
```

---

### Fase 3: Health & Finance (Post-MVP)

**Prioridad:** P2 (nice to have)

```sql
-- Health system
health_profiles
medical_conditions
medications
medication_logs
allergies
medical_appointments
health_measurements

-- Financial system
financial_profiles
financial_accounts
transactions
budgets
debts
debt_payments
investments
recurring_payments
```

**Comando:**
```bash
npx prisma migrate dev --name add_health_finance_systems
```

---

## Performance Tuning

### Connection Pooling (Neon)

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Connection pool config en DATABASE_URL
// postgresql://user:pass@host/db?pgbouncer=true&connection_limit=10
```

---

### Query Optimization

**Evitar N+1 Problems:**
```typescript
// ❌ MALO: N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  user.agents = await prisma.agent.findMany({
    where: { createdBy: user.id }
  });
}

// ✅ BUENO: Single query con include
const users = await prisma.user.findMany({
  include: {
    createdAgents: true,
    chatSessions: {
      take: 10,
      orderBy: { lastActivity: 'desc' }
    }
  }
});
```

**Paginación Cursor-based:**
```typescript
// ✅ Escalable
const messages = await prisma.message.findMany({
  take: 50,
  skip: 1,
  cursor: { id: lastMessageId },
  orderBy: { timestamp: 'desc' },
  where: { conversationId }
});
```

---

### Caching Strategy

```typescript
// Redis cache para queries frecuentes
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getUserWithCache(userId: string) {
  const cacheKey = `user:${userId}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      settings: true,
      storageQuota: true
    }
  });

  await redis.setex(cacheKey, 300, JSON.stringify(user)); // 5 min TTL
  return user;
}
```

---

## Backup & Recovery

### Backup Strategy (Neon)

**Automated Backups:**
- Daily backups: 7 días retention (Neon Free/Launch)
- Point-in-time recovery: 7 días (Neon Launch+)
- Manual snapshots antes de migrations críticas

**Backup Script:**
```bash
#!/bin/bash
# backup-db.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DATABASE_URL=$DATABASE_URL

pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Retention: eliminar backups > 30 días
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completado: backup_$TIMESTAMP.sql.gz"
```

---

### Disaster Recovery

**RPO (Recovery Point Objective):** < 1 hora
**RTO (Recovery Time Objective):** < 4 horas

**Recovery Steps:**
1. Restaurar snapshot más reciente de Neon
2. Aplicar WAL logs si point-in-time recovery
3. Re-indexar Pinecone desde PostgreSQL (si necesario)
4. Validar integridad de datos
5. Smoke tests críticos

**Test Recovery:** Quarterly (cada 3 meses)

---

## Notas de Implementación

### Consideraciones de Seguridad

1. **Encriptación de Datos Sensibles:**
   - OAuth tokens: AES-256 antes de guardar
   - Health data: Campos específicos encriptados
   - Financial data: Números de cuenta parcialmente enmascarados

2. **Row-Level Security (RLS):**
```sql
-- Habilitar RLS en tablas multi-tenant
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_user_policy ON conversations
    FOR ALL
    USING (
        chat_session_id IN (
            SELECT id FROM chat_sessions WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );
```

3. **SQL Injection Prevention:**
   - Prisma auto-escapa queries (ORM built-in)
   - Nunca usar raw SQL sin parameterized queries

---

### Migrations Best Practices

1. **Backward Compatible:**
   - Agregar columnas como nullable primero
   - Populated data en migration separada
   - Hacer required después

2. **Zero-Downtime Deployments:**
   - Nunca eliminar columnas en uso (deprecate first)
   - Agregar nuevos índices en background (CONCURRENTLY)

3. **Testing Migrations:**
```bash
# Crear migration
npx prisma migrate dev --name add_new_feature

# Test en staging
DATABASE_URL=$STAGING_DATABASE_URL npx prisma migrate deploy

# Validar data
npm run test:migration

# Deploy a producción
DATABASE_URL=$PROD_DATABASE_URL npx prisma migrate deploy
```

---

### Monitoring & Observability

**Métricas Clave:**
- Query latency P50, P95, P99
- Connection pool utilization
- Slow query log (> 100ms)
- Cache hit rate
- Index usage statistics
- Table sizes y growth rate

**Alertas:**
- Connection pool > 90%
- Slow queries > 1s
- Failed migrations
- Backup failures
- Disk space < 20%

**Tools:**
- Neon Dashboard (built-in metrics)
- Prisma Studio (development)
- DataDog / New Relic (production)
- PgAdmin para admin tasks

---

### Schema Versioning

**Current Version:** 1.0 (MVP)

**Changelog:**
- v1.0 (2025-10-22): Schema inicial completo
- v1.1 (TBD): Agregar health measurements types
- v1.2 (TBD): Agregar financial categories customizables
- v2.0 (TBD): Multi-workspace support

---

### Escalabilidad Futura

**10K+ Users:**
- Read replicas (Neon Scale tier)
- Partitioning por user_id en tablas grandes (messages, usage_logs)
- Archival de data antigua (> 1 año) a cold storage

**100K+ Users:**
- Sharding horizontal por región
- Migrar a PostgreSQL managed (AWS RDS/Aurora)
- Considerar CQRS pattern para analytics

---

## Referencias

- [Prisma Schema Documentation](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [PostgreSQL 14 Documentation](https://www.postgresql.org/docs/14/)
- [Neon Serverless Postgres](https://neon.tech/docs)
- [ADR-002: PostgreSQL + Pinecone](../architecture/ADR-002-postgresql-pinecone-dual-db.md)
- [ADR-004: Artifact-Based Data Model](../architecture/ADR-004-artifact-based-data-model.md)

---

**Document Owner:** Data Architect
**Last Updated:** 2025-10-22
**Next Review:** Fase 2 Sprint Planning
**Status:** PRODUCTION READY

---

**ESTE SCHEMA ESTÁ LISTO PARA IMPLEMENTACIÓN INMEDIATA EN PRISMA 6.17.1**

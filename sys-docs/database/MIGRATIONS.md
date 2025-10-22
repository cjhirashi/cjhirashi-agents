# Prisma Migrations Strategy - cjhirashi-agents MVP

**Version:** 1.0
**Date:** 2025-10-22
**Status:** PRODUCTION READY
**Database:** PostgreSQL 14+ (Neon Serverless)
**ORM:** Prisma 6.17.1

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Workflow de Migrations](#workflow-de-migrations)
3. [Prisma Schema Inicial](#prisma-schema-inicial)
4. [Migration Phases](#migration-phases)
5. [Seeding Strategy](#seeding-strategy)
6. [Production Migration Checklist](#production-migration-checklist)
7. [Rollback Procedures](#rollback-procedures)
8. [Development Workflow](#development-workflow)
9. [Environment Management](#environment-management)
10. [Continuous Integration](#continuous-integration)
11. [Monitoring Post-Migration](#monitoring-post-migration)
12. [SQL Snippets](#sql-snippets)
13. [Troubleshooting](#troubleshooting)

---

## Resumen Ejecutivo

### Objetivo

Este documento define la estrategia completa de migrations para cjhirashi-agents MVP usando Prisma 6.17.1 y PostgreSQL (Neon). Incluye workflow de development y production, seeding, rollback procedures, y best practices.

### Fases de Migración

| Fase | Descripción | Tablas | Timeline | Status |
|------|-------------|---------|----------|--------|
| **Fase 1** | Core MVP | 15 tablas | Week 1-2 | ✅ READY |
| **Fase 2** | Advanced Features | 10 tablas | Week 3-4 | 📋 PLANNED |
| **Fase 3** | Health & Finance | 22 tablas | Post-MVP | 🔜 FUTURE |
| **Fase 4** | RAG & MCP | 7 tablas | Post-MVP | 🔜 FUTURE |

### Estadísticas del Schema

- **Total Tablas (Full System):** 54
- **Tablas MVP (Fase 1):** 15
- **ENUMs:** 15
- **Relaciones (FKs):** 80+
- **Índices:** 150+
- **Triggers:** 3

### Tecnologías

- **ORM:** Prisma 6.17.1
- **Database:** PostgreSQL 14+ (Neon Serverless)
- **Connection Pooling:** PgBouncer (Neon built-in)
- **Migration Tool:** `prisma migrate`
- **Deployment:** Vercel + Neon

---

## Workflow de Migrations

### Development Workflow

```mermaid
graph TD
    A[Modify schema.prisma] --> B[prisma migrate dev]
    B --> C{Migration created?}
    C -->|Yes| D[Migration applied to dev DB]
    D --> E[Prisma Client regenerated]
    E --> F[Test locally]
    F --> G{Tests pass?}
    G -->|Yes| H[Commit migration files]
    G -->|No| I[Fix schema]
    I --> A
    C -->|No| J[Review conflicts]
    J --> A
```

**Comandos Development:**

```bash
# 1. Crear nueva migration (interactive)
npx prisma migrate dev --name add_new_feature

# 2. Aplicar migrations pendientes
npx prisma migrate dev

# 3. Generar Prisma Client
npx prisma generate

# 4. Reset DB (development only - WARNING: deletes data)
npx prisma migrate reset

# 5. Ver status de migrations
npx prisma migrate status
```

---

### Production Workflow

```mermaid
graph TD
    A[Merge to main] --> B[CI/CD Pipeline]
    B --> C[Run Tests]
    C --> D{Tests pass?}
    D -->|Yes| E[Deploy to Staging]
    D -->|No| F[Fix & Retry]
    E --> G[prisma migrate deploy staging]
    G --> H[Smoke Tests]
    H --> I{Staging OK?}
    I -->|Yes| J[Deploy to Production]
    I -->|No| K[Rollback Staging]
    J --> L[prisma migrate deploy production]
    L --> M[Monitor Metrics]
    M --> N{Production OK?}
    N -->|Yes| O[Success]
    N -->|No| P[ROLLBACK PRODUCTION]
```

**Comandos Production:**

```bash
# 1. Deploy migrations (NO interactive - safe for production)
DATABASE_URL=$PRODUCTION_DATABASE_URL npx prisma migrate deploy

# 2. Verificar status sin aplicar
DATABASE_URL=$PRODUCTION_DATABASE_URL npx prisma migrate status

# 3. Generate Prisma Client (production build)
npx prisma generate
```

**IMPORTANTE:**
- **NUNCA** usar `prisma migrate dev` en production (es interactive y puede crear migrations)
- **SIEMPRE** usar `prisma migrate deploy` en staging/production
- `migrate deploy` solo aplica migrations ya creadas y commiteadas

---

### Shadow Database (Testing)

Prisma usa una **shadow database** temporal durante `migrate dev` para:
1. Detectar schema drift
2. Validar migrations antes de aplicar
3. Garantizar idempotencia

**Configuración en Neon:**

```env
# .env.development
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.neon.tech/main"
SHADOW_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.neon.tech/shadow"
```

**Nota:** Neon Free tier NO soporta shadow DB. Usar solo en paid plans o desactivar:

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // shadowDatabaseUrl = env("SHADOW_DATABASE_URL") // Comentar si Neon Free
}
```

---

### Version Control Strategy

**Git workflow:**

```bash
prisma/
├── schema.prisma              # Source of truth
└── migrations/
    ├── 20250122_init_mvp/
    │   └── migration.sql      # ✅ COMMIT THESE
    ├── 20250125_add_rag/
    │   └── migration.sql
    └── migration_lock.toml    # ✅ COMMIT THIS
```

**Reglas:**
1. **SIEMPRE commit** archivos en `prisma/migrations/`
2. **SIEMPRE commit** `migration_lock.toml`
3. **NUNCA commit** `.env` files
4. **NUNCA commit** `node_modules/@prisma/client/`

**Pre-commit Hook (Opcional):**

```bash
# .husky/pre-commit
#!/bin/sh
npx prisma format
npx prisma validate
```

---

## Prisma Schema Inicial

El schema completo está en `prisma/schema.prisma` (actualmente implementado). Aquí los highlights para migrations:

### Generator y Datasource

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Schema Phases Overview

**Fase 1 (MVP Core):**
- ✅ Users & Auth (7 tablas)
- ✅ Agents & Conversations (5 tablas)
- ✅ Artifacts (1 tabla)
- ✅ Usage & Audit (3 tablas)

**Fase 2 (Advanced):**
- ⏳ Support System (2 tablas)
- ⏳ Storage System (5 tablas)

**Fase 3 (Post-MVP):**
- 🔜 Health System (6 tablas)
- 🔜 Finance System (8 tablas)

**Fase 4 (Integrations):**
- 🔜 RAG System (2 tablas)
- 🔜 MCP Integrations (2 tablas)

---

## Migration Phases

### Fase 1: Core MVP (Week 1-2)

**Objetivo:** Sistema funcional mínimo para chat con agentes IA.

**Tablas incluidas (15):**

```sql
-- Autenticación (4 tablas)
users
accounts
auth_sessions
verification_tokens

-- Sistema de Usuarios (1 tabla)
invitations

-- Agentes (4 tablas)
agents
chat_sessions
conversations
messages

-- Permisos (1 tabla)
user_agent_permissions

-- Artifacts (1 tabla)
artifacts

-- Métricas (3 tablas)
usage_logs
monthly_usage
usage_alerts

-- Auditoría (1 tabla)
audit_logs
```

**Migration Command:**

```bash
# Crear migration inicial
npx prisma migrate dev --name init_mvp_core

# Archivo generado: prisma/migrations/YYYYMMDD_init_mvp_core/migration.sql
```

**Migration SQL Preview (Auto-generado por Prisma):**

```sql
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM (
  'SUPER_ADMIN', 'ADMIN', 'INVITED_AGENT', 'INVITED_STORAGE',
  'SUBSCRIBER', 'MANAGER', 'DEVELOPER', 'USER', 'GUEST'
);

CREATE TYPE "SubscriptionTier" AS ENUM (
  'FREE', 'BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM', 'UNLIMITED'
);

CREATE TYPE "InvitationStatus" AS ENUM (
  'PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'
);

CREATE TYPE "AlertType" AS ENUM (
  'APPROACHING_LIMIT', 'LIMIT_WARNING', 'LIMIT_EXCEEDED', 'UNUSUAL_ACTIVITY'
);

-- CreateTable: users
CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "name" VARCHAR(255),
  "displayName" VARCHAR(255),
  "avatar" VARCHAR(500),
  "dateOfBirth" DATE,
  "timezone" VARCHAR(100) NOT NULL DEFAULT 'America/Mexico_City',
  "language" VARCHAR(10) NOT NULL DEFAULT 'es',
  "bio" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "permissions" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "personalityProfile" JSONB,
  "aiProfileLastUpdate" TIMESTAMP(3),
  "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "subscriptionId" VARCHAR(255),
  "subscriptionStart" TIMESTAMP(3),
  "subscriptionEnd" TIMESTAMP(3),
  "customLimits" JSONB,
  "totalMessages" INTEGER NOT NULL DEFAULT 0,
  "totalTokensUsed" BIGINT NOT NULL DEFAULT 0,
  "monthlyMessages" INTEGER NOT NULL DEFAULT 0,
  "monthlyTokens" BIGINT NOT NULL DEFAULT 0,
  "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastInteraction" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: accounts
CREATE TABLE "accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "provider" VARCHAR(100) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" VARCHAR(50),
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: auth_sessions
CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sessionToken" VARCHAR(500) NOT NULL,
  "userId" UUID NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: verification_tokens
CREATE TABLE "verification_tokens" (
  "identifier" VARCHAR(255) NOT NULL,
  "token" VARCHAR(500) NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable: invitations
CREATE TABLE "invitations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "token" VARCHAR(500) NOT NULL,
  "role" "UserRole" NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invitedBy" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agents
CREATE TABLE "agents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "createdBy" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(100) NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "config" JSONB,
  "endpointUrl" VARCHAR(500) NOT NULL,
  "systemPrompt" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "documentationUrl" VARCHAR(500),
  "tutorialUrl" VARCHAR(500),
  "capabilities" JSONB,
  "totalUses" INTEGER NOT NULL DEFAULT 0,
  "totalMessages" INTEGER NOT NULL DEFAULT 0,
  "averageRating" DECIMAL(3, 2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: chat_sessions
CREATE TABLE "chat_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivity" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: conversations
CREATE TABLE "conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "chatSessionId" UUID NOT NULL,
  "agentId" UUID NOT NULL,
  "title" VARCHAR(500) NOT NULL,
  "summary" TEXT,
  "messageCount" INTEGER NOT NULL DEFAULT 0,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: messages
CREATE TABLE "messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversationId" UUID NOT NULL,
  "role" VARCHAR(50) NOT NULL,
  "content" TEXT NOT NULL,
  "tokensInput" INTEGER,
  "tokensOutput" INTEGER,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_agent_permissions
CREATE TABLE "user_agent_permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "agentId" UUID NOT NULL,
  "grantedBy" VARCHAR(255),
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_agent_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: artifacts
CREATE TABLE "artifacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agentId" UUID NOT NULL,
  "userId" VARCHAR(255) NOT NULL,
  "conversationId" UUID,
  "name" VARCHAR(500) NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "content" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "parentId" UUID,
  "metadata" JSONB,
  "tags" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: usage_logs
CREATE TABLE "usage_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "agentId" UUID NOT NULL,
  "conversationId" UUID,
  "messageId" VARCHAR(255),
  "tokensInput" INTEGER NOT NULL,
  "tokensOutput" INTEGER NOT NULL,
  "totalTokens" INTEGER NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "costInput" DECIMAL(10, 6) NOT NULL,
  "costOutput" DECIMAL(10, 6) NOT NULL,
  "totalCost" DECIMAL(10, 6) NOT NULL,
  "duration" INTEGER,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: monthly_usage
CREATE TABLE "monthly_usage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL CHECK ("month" BETWEEN 1 AND 12),
  "totalMessages" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" BIGINT NOT NULL DEFAULT 0,
  "totalCost" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "agentUsage" JSONB NOT NULL,
  "limitMessages" INTEGER,
  "limitTokens" BIGINT,
  "exceededLimit" BOOLEAN NOT NULL DEFAULT false,
  "warningsSent" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "monthly_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: usage_alerts
CREATE TABLE "usage_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "type" "AlertType" NOT NULL,
  "threshold" INTEGER NOT NULL,
  "triggered" BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_logs
CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adminId" UUID NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "targetId" UUID,
  "details" JSONB,
  "ipAddress" INET,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_subscription_tier_idx" ON "users"("subscriptionTier");
CREATE INDEX "users_last_interaction_idx" ON "users"("lastInteraction" DESC);

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

CREATE UNIQUE INDEX "auth_sessions_sessionToken_key" ON "auth_sessions"("sessionToken");
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");
CREATE INDEX "invitations_email_idx" ON "invitations"("email");
CREATE INDEX "invitations_invitedBy_idx" ON "invitations"("invitedBy");

CREATE UNIQUE INDEX "agents_slug_key" ON "agents"("slug");
CREATE INDEX "agents_createdBy_idx" ON "agents"("createdBy");
CREATE INDEX "agents_category_idx" ON "agents"("category");

CREATE INDEX "chat_sessions_userId_idx" ON "chat_sessions"("userId");

CREATE INDEX "conversations_agentId_idx" ON "conversations"("agentId");
CREATE INDEX "conversations_chatSessionId_idx" ON "conversations"("chatSessionId");

CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

CREATE UNIQUE INDEX "user_agent_permissions_userId_agentId_key" ON "user_agent_permissions"("userId", "agentId");
CREATE INDEX "user_agent_permissions_userId_idx" ON "user_agent_permissions"("userId");
CREATE INDEX "user_agent_permissions_agentId_idx" ON "user_agent_permissions"("agentId");

CREATE INDEX "artifacts_agentId_idx" ON "artifacts"("agentId");
CREATE INDEX "artifacts_userId_idx" ON "artifacts"("userId");
CREATE INDEX "artifacts_parentId_idx" ON "artifacts"("parentId");

CREATE INDEX "usage_logs_userId_timestamp_idx" ON "usage_logs"("userId", "timestamp" DESC);
CREATE INDEX "usage_logs_agentId_timestamp_idx" ON "usage_logs"("agentId", "timestamp" DESC);

CREATE UNIQUE INDEX "monthly_usage_userId_year_month_key" ON "monthly_usage"("userId", "year", "month");
CREATE INDEX "monthly_usage_userId_idx" ON "monthly_usage"("userId");

CREATE INDEX "usage_alerts_userId_idx" ON "usage_alerts"("userId");

CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedBy_fkey"
  FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agents" ADD CONSTRAINT "agents_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_chatSessionId_fkey"
  FOREIGN KEY ("chatSessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_agent_permissions" ADD CONSTRAINT "user_agent_permissions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_agent_permissions" ADD CONSTRAINT "user_agent_permissions_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "artifacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_usage" ADD CONSTRAINT "monthly_usage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "usage_alerts" ADD CONSTRAINT "usage_alerts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Post-Migration Validation:**

```bash
# Verificar tablas creadas
npx prisma db execute --stdin <<SQL
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
SQL

# Verificar foreign keys
npx prisma db execute --stdin <<SQL
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f'
ORDER BY table_name;
SQL
```

---

### Fase 2: Support & Storage (Week 3-4)

**Objetivo:** Sistema de soporte con IA y almacenamiento de archivos.

**Tablas incluidas (7):**

```sql
-- Soporte (2 tablas)
support_tickets
support_messages

-- Storage (5 tablas)
storage_files
storage_folders
storage_quotas
file_access_logs
file_shares
```

**Migration Command:**

```bash
npx prisma migrate dev --name add_support_storage_systems
```

**Key Changes:**

```sql
-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM (
  'BUG', 'FEATURE', 'QUESTION', 'ACCOUNT', 'BILLING', 'PERFORMANCE', 'OTHER'
);

CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TYPE "TicketStatus" AS ENUM (
  'OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED', 'CANCELLED'
);

CREATE TYPE "StorageProvider" AS ENUM (
  'VERCEL_BLOB', 'LOCAL', 'AWS_S3', 'CLOUDFLARE_R2'
);

CREATE TYPE "FileAccessLevel" AS ENUM (
  'PRIVATE', 'INTERNAL', 'PUBLIC', 'SHARED'
);

CREATE TYPE "FileUsageContext" AS ENUM (
  'THEME', 'AVATAR', 'TICKET', 'ARTIFACT', 'HEALTH', 'FINANCE', 'BACKUP', 'TEMP', 'OTHER'
);

CREATE TYPE "FileAction" AS ENUM (
  'UPLOAD', 'DOWNLOAD', 'VIEW', 'DELETE', 'SHARE', 'UPDATE'
);

CREATE TYPE "ShareType" AS ENUM ('LINK', 'EMAIL', 'USER');

-- CreateTable: support_tickets
-- CreateTable: support_messages
-- CreateTable: storage_files
-- CreateTable: storage_folders
-- CreateTable: storage_quotas
-- CreateTable: file_access_logs
-- CreateTable: file_shares
```

---

### Fase 3: Health & Finance Systems (Post-MVP)

**Objetivo:** Sistemas de salud y finanzas personales.

**Tablas incluidas (14):**

```sql
-- Health System (6 tablas)
health_profiles
medical_conditions
medications
medication_logs
allergies
medical_appointments
health_measurements

-- Finance System (8 tablas)
financial_profiles
financial_accounts
transactions
budgets
debts
debt_payments
investments
recurring_payments
```

**Migration Command:**

```bash
npx prisma migrate dev --name add_health_finance_systems
```

**Importante:**
- Datos médicos son **HIPAA-sensitive** → encriptación AES-256
- Datos financieros requieren **PCI compliance** si se integra con bancos
- Considerar Row-Level Security (RLS) para ambos

---

### Fase 4: RAG & MCP Integrations (Post-MVP)

**Objetivo:** RAG con Pinecone y integraciones MCP (Gmail, Notion, etc).

**Tablas incluidas (4):**

```sql
-- RAG System (2 tablas)
rag_documents
rag_settings

-- MCP Integrations (2 tablas)
mcp_integrations
mcp_sync_logs
```

**Migration Command:**

```bash
npx prisma migrate dev --name add_rag_mcp_integrations
```

**Notas:**
- Embeddings almacenados en **Pinecone** (no en PostgreSQL)
- `rag_documents.vector_ids` son referencias a Pinecone
- OAuth tokens en `mcp_integrations` DEBEN encriptarse

---

## Seeding Strategy

### Seed Data Overview

El archivo `prisma/seed.ts` crea data inicial para desarrollo y testing.

**Crear archivo de seed:**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. SUPER ADMIN (cjhirashi@gmail.com)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'cjhirashi@gmail.com' },
    update: {},
    create: {
      email: 'cjhirashi@gmail.com',
      emailVerified: new Date(),
      name: 'Carlos Hirashi',
      displayName: 'Charlie',
      role: 'SUPER_ADMIN',
      subscriptionTier: 'UNLIMITED',
      isActive: true,
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // 2. ADMIN USER
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cjhirashi.com' },
    update: {},
    create: {
      email: 'admin@cjhirashi.com',
      emailVerified: new Date(),
      name: 'Admin User',
      role: 'ADMIN',
      subscriptionTier: 'PRO',
      isActive: true,
    },
  });
  console.log('✅ Admin created:', admin.email);

  // 3. REGULAR USERS
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'user1@example.com' },
      update: {},
      create: {
        email: 'user1@example.com',
        emailVerified: new Date(),
        name: 'User One',
        role: 'USER',
        subscriptionTier: 'FREE',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'user2@example.com' },
      update: {},
      create: {
        email: 'user2@example.com',
        emailVerified: new Date(),
        name: 'User Two',
        role: 'SUBSCRIBER',
        subscriptionTier: 'PRO',
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Users created:', users.length);

  // 4. SAMPLE AGENTS
  const agents = await Promise.all([
    prisma.agent.upsert({
      where: { slug: 'coding-assistant' },
      update: {},
      create: {
        createdBy: superAdmin.id,
        name: 'Coding Assistant',
        slug: 'coding-assistant',
        description: 'Expert in TypeScript, React, and Next.js',
        category: 'productivity',
        model: 'gemini-2.0-flash',
        endpointUrl: '/api/agents/coding-assistant',
        systemPrompt: 'You are an expert coding assistant...',
        isPublic: true,
        isActive: true,
        capabilities: JSON.stringify(['code_generation', 'debugging', 'refactoring']),
      },
    }),
    prisma.agent.upsert({
      where: { slug: 'health-advisor' },
      update: {},
      create: {
        createdBy: superAdmin.id,
        name: 'Health Advisor',
        slug: 'health-advisor',
        description: 'Personal health and wellness assistant',
        category: 'health',
        model: 'gemini-2.0-flash',
        endpointUrl: '/api/agents/health-advisor',
        systemPrompt: 'You are a health and wellness advisor...',
        isPublic: false,
        isActive: true,
        capabilities: JSON.stringify(['health_tracking', 'medication_reminders']),
      },
    }),
    prisma.agent.upsert({
      where: { slug: 'finance-planner' },
      update: {},
      create: {
        createdBy: superAdmin.id,
        name: 'Finance Planner',
        slug: 'finance-planner',
        description: 'Personal finance management assistant',
        category: 'finance',
        model: 'gemini-2.0-flash',
        endpointUrl: '/api/agents/finance-planner',
        systemPrompt: 'You are a personal finance advisor...',
        isPublic: false,
        isActive: true,
        capabilities: JSON.stringify(['budgeting', 'investment_tracking', 'expense_analysis']),
      },
    }),
  ]);
  console.log('✅ Agents created:', agents.length);

  // 5. SAMPLE CHAT SESSION
  const chatSession = await prisma.chatSession.create({
    data: {
      userId: users[0].id,
      metadata: { source: 'seed' },
    },
  });

  // 6. SAMPLE CONVERSATION
  const conversation = await prisma.conversation.create({
    data: {
      chatSessionId: chatSession.id,
      agentId: agents[0].id,
      title: 'Help with React hooks',
      messageCount: 2,
      tokenCount: 150,
    },
  });

  // 7. SAMPLE MESSAGES
  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: 'user',
        content: 'How do I use useEffect correctly?',
        tokensInput: 8,
      },
      {
        conversationId: conversation.id,
        role: 'assistant',
        content: 'useEffect is used for side effects in React components...',
        tokensOutput: 50,
      },
    ],
  });
  console.log('✅ Sample messages created');

  // 8. SAMPLE ARTIFACT
  await prisma.artifact.create({
    data: {
      agentId: agents[0].id,
      userId: users[0].id,
      conversationId: conversation.id,
      name: 'useEffect Example',
      type: 'code',
      content: `import { useEffect, useState } from 'react';

export function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return <button onClick={() => setCount(count + 1)}>Increment</button>;
}`,
      metadata: JSON.stringify({ language: 'typescript' }),
    },
  });
  console.log('✅ Sample artifact created');

  // 9. STORAGE QUOTAS
  await Promise.all([
    prisma.storageQuota.create({
      data: {
        userId: superAdmin.id,
        maxStorage: 10 * 1024 * 1024 * 1024, // 10 GB
        maxFileSize: 100 * 1024 * 1024, // 100 MB
        maxFiles: 10000,
        subscriptionTier: 'UNLIMITED',
      },
    }),
    prisma.storageQuota.create({
      data: {
        userId: users[0].id,
        maxStorage: 1 * 1024 * 1024 * 1024, // 1 GB (Free tier)
        maxFileSize: 10 * 1024 * 1024, // 10 MB
        maxFiles: 100,
        subscriptionTier: 'FREE',
      },
    }),
  ]);
  console.log('✅ Storage quotas created');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Configurar en package.json:**

```json
{
  "scripts": {
    "seed": "tsx prisma/seed.ts"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Ejecutar seed:**

```bash
# Opción 1: Via npm script
npm run seed

# Opción 2: Via Prisma (auto-ejecuta después de migrate reset)
npx prisma db seed

# Opción 3: Reset DB + Seed (CUIDADO: borra TODO)
npx prisma migrate reset
```

**Seed Environments:**

```bash
# Development
DATABASE_URL=$DEV_DATABASE_URL npm run seed

# Staging (seed de prueba)
DATABASE_URL=$STAGING_DATABASE_URL npm run seed

# Production: NUNCA ejecutar seed automático
# Solo crear super admin manualmente
```

---

## Production Migration Checklist

### Pre-Migration

```markdown
- [ ] **Code Review:** Migration SQL revisado por 2+ devs
- [ ] **Staging Test:** Migration aplicada en staging exitosamente
- [ ] **Smoke Tests:** Tests críticos pasan en staging
- [ ] **Backup:** Snapshot de producción creado (Neon Dashboard)
- [ ] **Rollback Plan:** Script de rollback preparado y testeado
- [ ] **Downtime Window:** Usuario notificado (si aplica)
- [ ] **Team Alert:** Equipo disponible durante deployment
- [ ] **Monitoring Setup:** Dashboards y alerts configurados
```

### During Migration

```bash
# 1. Verificar status actual
DATABASE_URL=$PROD_URL npx prisma migrate status

# 2. Aplicar migrations
DATABASE_URL=$PROD_URL npx prisma migrate deploy

# 3. Verificar aplicación exitosa
DATABASE_URL=$PROD_URL npx prisma migrate status

# 4. Regenerar Prisma Client (si es nueva versión)
npx prisma generate

# 5. Deploy application
vercel --prod
```

### Post-Migration

```markdown
- [ ] **Health Check:** Endpoint `/api/health` responde OK
- [ ] **Database Queries:** Queries críticas ejecutan correctamente
- [ ] **Foreign Keys:** Todas las FKs intactas
- [ ] **Indexes:** Índices creados correctamente
- [ ] **Performance:** Query latency P95 < 100ms
- [ ] **Error Rate:** Error rate < 0.1%
- [ ] **User Traffic:** 10+ usuarios probando en producción
- [ ] **Rollback Test:** Plan de rollback validado (no ejecutado)
- [ ] **Documentation:** Migration documentada en CHANGELOG.md
- [ ] **Team Notification:** Deployment exitoso comunicado
```

---

## Rollback Procedures

### Escenario 1: Migration falló (no aplicada)

```bash
# Prisma auto-rollback si falla en medio
# Verificar estado
npx prisma migrate status

# Si hay migrations parciales, limpiar manualmente
# Contactar DBA para revisar estado de BD
```

### Escenario 2: Migration aplicada pero app crashea

**Opción A: Rollback Code (Preferido si schema es backward compatible)**

```bash
# Revertir deployment de Vercel a versión anterior
vercel rollback

# O redeploy de commit anterior
git revert HEAD
git push origin main
```

**Opción B: Rollback Database (Último recurso)**

**Neon Restore from Snapshot:**

1. Ir a Neon Dashboard → Backups
2. Seleccionar snapshot pre-migration
3. Restaurar a nueva branch
4. Hacer switch de DATABASE_URL

**Manual Rollback SQL:**

```bash
# SOLO si tienes script de rollback preparado
psql $DATABASE_URL < rollback_migration_YYYYMMDD.sql
```

**Ejemplo de rollback script:**

```sql
-- rollback_add_new_table.sql
BEGIN;

-- Revertir cambios en orden inverso
DROP TABLE IF EXISTS new_table CASCADE;

-- Restaurar state anterior (si hay columnas modificadas)
-- ALTER TABLE existing_table DROP COLUMN new_column;

-- Validar que no hay data perdida
SELECT COUNT(*) FROM critical_table;

COMMIT;
```

### Escenario 3: Data corruption detectada post-migration

```bash
# 1. INMEDIATO: Bloquear escrituras (maintenance mode)
# En Vercel: Environment Variables → MAINTENANCE_MODE=true → Redeploy

# 2. Analizar data corrupta
psql $DATABASE_URL
SELECT * FROM affected_table WHERE created_at > '2025-01-22 10:00:00';

# 3. Restaurar snapshot si es crítico
# (Via Neon Dashboard)

# 4. Aplicar fix migration
npx prisma migrate dev --name fix_data_corruption

# 5. Validar fix en staging PRIMERO
# 6. Aplicar en producción
# 7. Desactivar maintenance mode
```

---

## Development Workflow

### Para Developers Nuevos

**Setup inicial:**

```bash
# 1. Clonar repo
git clone https://github.com/tu-org/cjhirashi-agents.git
cd cjhirashi-agents

# 2. Instalar dependencias
npm install

# 3. Configurar .env.local
cp .env.example .env.local
# Editar DATABASE_URL con tu Neon connection string

# 4. Aplicar migrations
npx prisma migrate dev

# 5. Seed data (opcional)
npm run seed

# 6. Abrir Prisma Studio (GUI)
npx prisma studio
```

**Prisma Studio:** UI para explorar y editar data

- URL: http://localhost:5555
- Features: Browse tables, edit rows, run queries

---

### Modificar Schema Existente

**Ejemplo: Agregar campo `bio` a tabla `users`**

```typescript
// 1. Modificar prisma/schema.prisma
model User {
  // ... campos existentes
  bio String? @db.Text // ✅ Agregar nullable primero
}
```

```bash
# 2. Crear migration
npx prisma migrate dev --name add_user_bio

# Prisma genera:
# - prisma/migrations/YYYYMMDD_add_user_bio/migration.sql
# - Actualiza Prisma Client types

# 3. Revisar SQL generado
cat prisma/migrations/YYYYMMDD_add_user_bio/migration.sql

# Contenido:
# ALTER TABLE "users" ADD COLUMN "bio" TEXT;

# 4. Probar localmente
npm run dev
# Hacer request que use el nuevo campo

# 5. Commit
git add prisma/
git commit -m "feat: add bio field to User model"
git push
```

---

### Backward Compatible Migrations

**Regla de oro:** Las migrations deben ser **backward compatible** para zero-downtime deployments.

**DO:**

```typescript
// ✅ BUENO: Agregar columna nullable
model User {
  newField String? // Opcional
}

// ✅ BUENO: Agregar columna con default
model User {
  newField String @default("default_value")
}

// ✅ BUENO: Agregar tabla nueva
model NewTable {
  id String @id
}
```

**DON'T:**

```typescript
// ❌ MALO: Agregar columna required sin default
model User {
  newField String // Rompe si hay rows existentes
}

// ❌ MALO: Eliminar columna en uso
model User {
  // oldField String // Comentar NO es suficiente
}

// ❌ MALO: Renombrar columna (Prisma lo ve como drop + add)
model User {
  newName String // Era oldName antes
}
```

**Patrón para cambios breaking:**

**Fase 1:** Agregar nueva columna (nullable)
```typescript
model User {
  oldField String
  newField String? // ✅ Agregar
}
```

**Fase 2:** Migrar data (background job)
```typescript
// Script de migración
await prisma.user.updateMany({
  where: { newField: null },
  data: { newField: oldField }
});
```

**Fase 3:** Hacer required
```typescript
model User {
  oldField String
  newField String // ✅ Ahora required
}
```

**Fase 4:** Deprecar old field
```typescript
model User {
  oldField String? @deprecated // Marcar
  newField String
}
```

**Fase 5:** Eliminar old field (después de N releases)
```typescript
model User {
  // oldField eliminado ✅
  newField String
}
```

---

### Testing Migrations Locally

**Crear test database:**

```bash
# Opción 1: Neon branch
# En Neon Dashboard: Create Branch → test-migration

# Opción 2: Docker PostgreSQL local
docker run -d \
  --name postgres-test \
  -e POSTGRES_PASSWORD=test123 \
  -e POSTGRES_DB=cjhirashi_test \
  -p 5433:5432 \
  postgres:14
```

**Test workflow:**

```bash
# 1. Apuntar a test DB
export DATABASE_URL="postgresql://postgres:test123@localhost:5433/cjhirashi_test"

# 2. Aplicar migrations
npx prisma migrate deploy

# 3. Seed test data
npm run seed

# 4. Ejecutar tests
npm test

# 5. Validar schema
npx prisma validate

# 6. Verificar generated SQL
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > preview.sql

cat preview.sql
```

---

## Environment Management

### Environment Variables

**Development (.env.local):**

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/cjhirashi_dev"
SHADOW_DATABASE_URL="postgresql://user:pass@localhost:5432/cjhirashi_shadow"
```

**Staging (.env.staging - NO commitear):**

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.neon.tech/staging"
```

**Production (Vercel Secrets):**

```bash
# Configurar en Vercel Dashboard → Settings → Environment Variables
# O via CLI:
vercel env add DATABASE_URL production
# Pegar: postgresql://user:pass@ep-xxx.us-east-1.neon.tech/main
```

---

### Connection Pooling (Neon)

**Configuración recomendada:**

```env
# Direct connection (para migrations)
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.neon.tech/main"

# Pooled connection (para app)
DATABASE_URL_POOLED="postgresql://user:pass@ep-xxx.us-east-1.neon.tech/main?pgbouncer=true&connection_limit=10"
```

**En código (lib/prisma.ts):**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connection management
export async function disconnect() {
  await prisma.$disconnect();
}

// Health check
export async function healthCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', error };
  }
}
```

---

### Multiple Environments

**Neon Branches (Recomendado):**

```
main (production)
├── staging (auto-sync from main)
├── dev-charlie (development)
└── test-migration (ephemeral)
```

**Beneficios:**
- Mismo schema en todos los environments
- Branch de staging sincroniza de main automáticamente
- Testing de migrations en branches isoladas

**Crear branch:**

```bash
# Via Neon CLI
neon branches create --name test-migration --parent main

# Obtener connection string
neon connection-string test-migration
```

---

## Continuous Integration

### GitHub Actions Workflow

**Crear `.github/workflows/database.yml`:**

```yaml
name: Database CI

on:
  pull_request:
    paths:
      - 'prisma/**'
      - '.github/workflows/database.yml'

jobs:
  validate-migrations:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Validate Prisma schema
        run: npx prisma validate

      - name: Check schema formatting
        run: |
          npx prisma format
          git diff --exit-code prisma/schema.prisma || (echo "Schema not formatted. Run 'npx prisma format'" && exit 1)

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Setup test database
        run: |
          docker run -d \
            --name postgres \
            -e POSTGRES_PASSWORD=test123 \
            -e POSTGRES_DB=test \
            -p 5432:5432 \
            postgres:14

          # Wait for postgres
          sleep 5

      - name: Apply migrations
        env:
          DATABASE_URL: postgresql://postgres:test123@localhost:5432/test
        run: npx prisma migrate deploy

      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:test123@localhost:5432/test
        run: npm test

      - name: Cleanup
        if: always()
        run: docker stop postgres
```

---

### Pre-commit Hooks (Husky)

**Instalar:**

```bash
npm install --save-dev husky
npx husky install
npm pkg set scripts.prepare="husky install"
```

**Crear `.husky/pre-commit`:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Validating Prisma schema..."
npx prisma validate

echo "🎨 Formatting Prisma schema..."
npx prisma format

echo "✅ Pre-commit checks passed!"
```

**Permisos:**

```bash
chmod +x .husky/pre-commit
```

---

## Monitoring Post-Migration

### Metrics to Watch

**Database Metrics:**

```typescript
// lib/monitoring.ts
import { prisma } from './prisma';

export async function getDatabaseMetrics() {
  // Connection pool stats
  const poolStats = await prisma.$metrics.json();

  // Query performance
  const slowQueries = await prisma.$queryRaw`
    SELECT query, calls, total_time, mean_time
    FROM pg_stat_statements
    WHERE mean_time > 100 -- queries > 100ms
    ORDER BY mean_time DESC
    LIMIT 10;
  `;

  // Table sizes
  const tableSizes = await prisma.$queryRaw`
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  `;

  // Index usage
  const indexUsage = await prisma.$queryRaw`
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan AS index_scans,
      idx_tup_read AS tuples_read,
      idx_tup_fetch AS tuples_fetched
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0 -- Unused indexes
    ORDER BY schemaname, tablename;
  `;

  return {
    poolStats,
    slowQueries,
    tableSizes,
    indexUsage,
  };
}
```

**API Health Endpoint:**

```typescript
// app/api/health/route.ts
import { healthCheck } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const dbHealth = await healthCheck();

  if (dbHealth.status === 'error') {
    return NextResponse.json(
      { status: 'unhealthy', database: dbHealth },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: 'healthy',
    database: dbHealth,
    timestamp: new Date().toISOString(),
  });
}
```

---

### Alerts Setup

**Neon Dashboard Alerts:**

1. Go to Neon Dashboard → Monitoring
2. Configure alerts for:
   - Connection pool > 90%
   - Query latency P95 > 200ms
   - Error rate > 1%
   - Storage > 80%

**Vercel Monitoring:**

```typescript
// middleware.ts (Vercel Analytics)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const start = Date.now();

  const response = NextResponse.next();

  // Track request duration
  response.headers.set('X-Response-Time', `${Date.now() - start}ms`);

  return response;
}
```

---

### Post-Migration Validation Script

**Crear `scripts/validate-migration.ts`:**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validate() {
  console.log('🔍 Validating migration...\n');

  // 1. Check all tables exist
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `;
  console.log('✅ Tables:', tables.length);

  // 2. Check foreign keys
  const fks = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
    SELECT conname AS constraint_name
    FROM pg_constraint
    WHERE contype = 'f';
  `;
  console.log('✅ Foreign Keys:', fks.length);

  // 3. Check indexes
  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
  `;
  console.log('✅ Indexes:', indexes.length);

  // 4. Test critical queries
  const userCount = await prisma.user.count();
  console.log('✅ Users:', userCount);

  const agentCount = await prisma.agent.count();
  console.log('✅ Agents:', agentCount);

  // 5. Check data integrity
  const orphanedConversations = await prisma.conversation.count({
    where: {
      chatSession: null,
    },
  });

  if (orphanedConversations > 0) {
    console.error('❌ Found orphaned conversations:', orphanedConversations);
    process.exit(1);
  }

  console.log('\n🎉 Migration validation passed!');
}

validate()
  .catch((e) => {
    console.error('❌ Validation failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

**Ejecutar:**

```bash
DATABASE_URL=$PROD_URL tsx scripts/validate-migration.ts
```

---

## SQL Snippets

### Useful PostgreSQL Commands

**Ver todas las tablas:**

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Ver foreign keys:**

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

**Ver índices de una tabla:**

```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;
```

**Ver tamaño de tablas:**

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Ver queries lentas (requiere pg_stat_statements):**

```sql
-- Habilitar extensión (una sola vez)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Ver queries lentas
SELECT
  query,
  calls,
  total_time / 1000 AS total_seconds,
  mean_time AS avg_ms,
  max_time AS max_ms
FROM pg_stat_statements
WHERE mean_time > 100 -- queries > 100ms
ORDER BY mean_time DESC
LIMIT 20;
```

**Ver índices no usados:**

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_toast_%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Vacuum y Analyze:**

```sql
-- Vacuum full (recuperar espacio)
VACUUM FULL ANALYZE users;

-- Analyze all tables (actualizar estadísticas del query planner)
ANALYZE;

-- Ver última vez que se hizo vacuum
SELECT
  schemaname,
  relname,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY last_autovacuum DESC;
```

**Performance Tips:**

```sql
-- Ver plan de ejecución de query
EXPLAIN ANALYZE
SELECT * FROM users
WHERE email = 'test@example.com';

-- Ver locks activos
SELECT
  pid,
  usename,
  pg_blocking_pids(pid) AS blocked_by,
  query AS blocked_query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;

-- Matar conexión bloqueada
SELECT pg_terminate_backend(pid);
```

---

## Troubleshooting

### Common Errors

#### Error: "Migration already applied"

```bash
# Prisma detecta que la migration ya existe en DB pero no en migration history

# Solución: Marcar como aplicada sin ejecutar
npx prisma migrate resolve --applied "YYYYMMDD_migration_name"
```

#### Error: "Migration failed - relation already exists"

```bash
# Causa: Migration fue aplicada parcialmente

# Solución 1: Rollback manual
psql $DATABASE_URL
DROP TABLE problem_table CASCADE;
\q

# Solución 2: Mark as rolled back y reaplicar
npx prisma migrate resolve --rolled-back "YYYYMMDD_migration_name"
npx prisma migrate deploy
```

#### Error: "Shadow database not accessible"

```bash
# Causa: Neon Free tier no soporta shadow database

# Solución: Comentar shadowDatabaseUrl en schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // shadowDatabaseUrl = env("SHADOW_DATABASE_URL") // Comentar
}
```

#### Error: "Unique constraint failed"

```bash
# Causa: Migration requiere datos únicos pero hay duplicados

# Solución: Limpiar duplicados antes de migration
-- Ejemplo: duplicar emails
DELETE FROM users a USING users b
WHERE a.id > b.id AND a.email = b.email;

# Luego reaplicar migration
npx prisma migrate dev
```

#### Error: "Foreign key constraint violation"

```bash
# Causa: Datos existentes violan nueva FK

# Solución: Limpiar data inconsistente
DELETE FROM conversations WHERE chat_session_id NOT IN (
  SELECT id FROM chat_sessions
);

# O agregar FK como DEFERRABLE
ALTER TABLE conversations
  ALTER CONSTRAINT conversations_chat_session_id_fkey
  DEFERRABLE INITIALLY DEFERRED;
```

---

### Migration Conflicts (Git Merge)

**Escenario:** Dos desarrolladores crean migrations en paralelo.

```bash
# Ejemplo:
# Dev A: prisma/migrations/20250122_add_field_a/migration.sql
# Dev B: prisma/migrations/20250122_add_field_b/migration.sql

# Problema: Git merge crea conflictos en schema.prisma
```

**Resolución:**

```bash
# 1. Resolver conflictos en schema.prisma manualmente
# Combinar ambos cambios

# 2. Recrear migration combinada
# OPCIÓN A: Resetear DB local
npx prisma migrate reset

# OPCIÓN B: Crear nueva migration con ambos cambios
npx prisma migrate dev --name merge_add_fields_a_and_b

# 3. Commit resultado
git add prisma/
git commit -m "fix: merge migrations from parallel branches"
```

---

### Schema Drift Detection

**Problema:** Schema en DB no coincide con `schema.prisma`

```bash
# Detectar drift
npx prisma migrate status

# Output esperado:
# ✅ Database schema is up to date!

# Si hay drift:
# ⚠️  Following migration have not yet been applied:
# migrations/YYYYMMDD_migration_name
```

**Resolver drift:**

```bash
# Opción 1: Aplicar migrations pendientes
npx prisma migrate deploy

# Opción 2: Generar diff para ver qué cambió
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource env:DATABASE_URL \
  --script

# Opción 3: Reset (SOLO development)
npx prisma migrate reset
```

---

### Connection Issues

**Error: "Connection timeout"**

```typescript
// Aumentar timeout en PrismaClient
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'],
  errorFormat: 'pretty',
  // Timeout customizado
  __internal: {
    engine: {
      connection_limit: 10,
      pool_timeout: 5000, // 5 segundos
    },
  },
});
```

**Error: "Too many connections"**

```bash
# Ver conexiones activas
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Matar conexiones idle
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes';
"
```

**Usar connection pooling:**

```env
# En lugar de:
DATABASE_URL="postgresql://user:pass@host/db"

# Usar:
DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true&connection_limit=10"
```

---

### Performance Issues Post-Migration

**Problem:** Queries lentas después de migration.

**Debug steps:**

```sql
-- 1. Verificar que indexes existen
SELECT indexname FROM pg_indexes WHERE tablename = 'users';

-- 2. Verificar estadísticas actualizadas
SELECT last_analyze FROM pg_stat_user_tables WHERE relname = 'users';

-- 3. Si last_analyze es NULL o antiguo, ejecutar
ANALYZE users;

-- 4. Verificar plan de ejecución
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- 5. Si no usa index, verificar columna indexada
SHOW search_path; -- Debe ser 'public'
```

**Crear índices manualmente si Prisma no los genera:**

```sql
-- Index compuesto
CREATE INDEX idx_users_role_active ON users(role, is_active) WHERE is_active = TRUE;

-- Full-text search index
CREATE INDEX idx_messages_content_fts ON messages USING GIN (to_tsvector('english', content));

-- JSONB index
CREATE INDEX idx_users_permissions_gin ON users USING GIN (permissions);
```

---

## Referencias

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/14/ddl-alter.html)
- [Neon Branching Guide](https://neon.tech/docs/guides/branching)
- [Zero-Downtime Deployments](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)

---

## Apéndices

### Apéndice A: Estimación de Downtime

| Tipo de Migration | Downtime Estimado | Mitigación |
|-------------------|-------------------|------------|
| Agregar columna nullable | 0 segundos | Zero-downtime |
| Agregar columna con default | < 1 segundo | Zero-downtime |
| Agregar índice | 0 segundos | `CONCURRENTLY` |
| Agregar tabla | 0 segundos | Zero-downtime |
| Modificar columna | 5-30 segundos | Usar ALTER + backfill |
| Eliminar columna | 5-30 segundos | Deploy code first |
| Renombrar tabla | 30-60 segundos | Use views |

**Estrategia de zero-downtime:**

1. Cambios aditivos solo (agregar, no eliminar)
2. Usar `CONCURRENTLY` para indexes grandes
3. Deploy code antes de eliminar campos deprecated
4. Usar feature flags para rollout gradual

---

### Apéndice B: Checklist de Security

```markdown
- [ ] OAuth tokens encriptados (AES-256)
- [ ] Datos médicos encriptados (HIPAA)
- [ ] Datos financieros enmascarados
- [ ] Row-Level Security (RLS) habilitado
- [ ] Audit logs para acciones sensibles
- [ ] Connection strings en secrets (no en código)
- [ ] Backups encriptados
- [ ] SSL/TLS forzado en connections
- [ ] Rate limiting en API endpoints
- [ ] Validación de inputs (Zod schemas)
```

---

### Apéndice C: Migration Naming Convention

**Formato:** `YYYYMMDD_HHMM_action_description`

**Ejemplos:**

```
20250122_1030_init_mvp_core
20250125_1400_add_user_bio_field
20250127_0900_create_support_tables
20250128_1600_add_index_messages_content
20250130_1100_migrate_old_users_data
20250201_1000_remove_deprecated_fields
```

**Prefijos:**
- `init` - Migración inicial
- `add` - Agregar tabla/columna
- `create` - Crear nueva feature
- `update` - Modificar existente
- `remove` - Eliminar (deprecation)
- `fix` - Corrección de bug
- `migrate` - Data migration
- `optimize` - Performance improvement

---

**Document Owner:** Data Architect + Coder
**Last Updated:** 2025-10-22
**Next Review:** Post Fase 1 Migration
**Status:** PRODUCTION READY

---

**ESTE DOCUMENTO ESTÁ LISTO PARA EJECUTAR MIGRATIONS EN PRODUCCIÓN**

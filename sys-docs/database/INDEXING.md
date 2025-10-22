# PostgreSQL Indexing & Performance Optimization

**Version:** 1.0
**Date:** 2025-10-22
**Status:** PRODUCTION READY
**Database:** PostgreSQL 14+ (Neon Serverless)
**ORM:** Prisma 6.17.1
**Target SLA:** p99 < 100ms query latency

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Indexing Strategy](#indexing-strategy)
   - [Index Types Overview](#index-types-overview)
   - [Core MVP Tables (15 tables)](#core-mvp-tables-15-tables)
   - [Advanced Features Tables](#advanced-features-tables)
   - [Health & Finance Tables](#health--finance-tables)
3. [Query Optimization Patterns](#query-optimization-patterns)
   - [N+1 Prevention](#n1-prevention)
   - [Lazy vs Eager Loading](#lazy-vs-eager-loading)
   - [Batch Operations](#batch-operations)
   - [Denormalization Strategy](#denormalization-strategy)
4. [Query Performance Analysis](#query-performance-analysis)
   - [Using EXPLAIN ANALYZE](#using-explain-analyze)
   - [Common Query Patterns](#common-query-patterns)
5. [Caching Strategy](#caching-strategy)
   - [Query Caching with Redis](#query-caching-with-redis)
   - [Prisma Middleware](#prisma-middleware)
6. [Connection Pooling](#connection-pooling)
   - [PgBouncer Configuration](#pgbouncer-configuration)
   - [Pool Size Optimization](#pool-size-optimization)
7. [Partitioning & Sharding](#partitioning--sharding)
   - [Horizontal Partitioning](#horizontal-partitioning)
   - [Vertical Partitioning](#vertical-partitioning)
8. [Vacuum & Maintenance](#vacuum--maintenance)
9. [Monitoring & Observability](#monitoring--observability)
10. [SLOs & Performance Targets](#slos--performance-targets)
11. [Load Testing](#load-testing)
12. [Anti-Patterns](#anti-patterns)
13. [Troubleshooting](#troubleshooting)

---

## Executive Summary

### Scope

This document defines the comprehensive indexing and performance optimization strategy for the cjhirashi-agents PostgreSQL database, designed to handle:

- **Users:** 100-1,000 concurrent users
- **Queries:** Millions per month
- **Data Volume:** 10M+ messages, 1M+ conversations
- **SLA Target:** p99 query latency < 100ms

### Key Decisions

1. **B-Tree Indexes:** Primary strategy for equality and range queries
2. **GIN Indexes:** For JSONB fields and full-text search
3. **Partial Indexes:** For soft-delete filtering and boolean flags
4. **Composite Indexes:** For multi-column frequent queries
5. **Denormalization:** Pre-calculated counters for dashboard queries
6. **Caching:** Redis for hot queries (5-60 min TTL)
7. **Connection Pooling:** PgBouncer with 10-20 connections per app instance

### Index Budget

| Category | Index Count | Storage Overhead |
|----------|-------------|------------------|
| Primary Keys | 54 | ~20 MB |
| Foreign Keys | 80+ | ~50 MB |
| Unique Constraints | 20 | ~10 MB |
| Query Optimization | 60+ | ~100 MB |
| Full-Text Search | 5 | ~200 MB |
| JSONB (GIN) | 10 | ~150 MB |
| **TOTAL** | **230+** | **~530 MB** |

**Trade-off:** ~530 MB storage overhead for 10-100x query speedup.

---

## Indexing Strategy

### Index Types Overview

#### 1. B-Tree Indexes (Default)

**Best for:**
- Equality comparisons (`WHERE user_id = ?`)
- Range queries (`WHERE created_at > ?`)
- Sorting (`ORDER BY created_at DESC`)
- LIKE patterns with prefix (`WHERE email LIKE 'user%'`)

**Syntax:**
```sql
CREATE INDEX idx_users_email ON users(email);
```

#### 2. GIN (Generalized Inverted Index)

**Best for:**
- JSONB fields (`WHERE metadata @> '{"key": "value"}'`)
- Full-text search (`WHERE to_tsvector(content) @@ to_tsquery('search')`)
- Array columns (`WHERE tags && ARRAY['tag1']`)

**Syntax:**
```sql
CREATE INDEX idx_artifacts_metadata_gin ON artifacts USING GIN (metadata);
```

#### 3. GIST (Generalized Search Tree)

**Best for:**
- Geometric data types
- Full-text search (alternative to GIN)
- Range types

**Syntax:**
```sql
CREATE INDEX idx_messages_content_gist ON messages USING GIST (to_tsvector('english', content));
```

#### 4. Partial Indexes

**Best for:**
- Filtering on common conditions
- Soft-delete patterns (`WHERE deleted_at IS NULL`)
- Boolean flags (`WHERE is_active = TRUE`)

**Syntax:**
```sql
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
```

#### 5. Composite Indexes

**Best for:**
- Multi-column filters
- Covering indexes (include all query columns)
- ORDER BY optimization

**Syntax:**
```sql
CREATE INDEX idx_conversations_session_agent ON conversations(chat_session_id, agent_id);
```

**Column Order Matters:**
- Most selective column first
- Supports prefix queries (left-to-right)
- Example: `(user_id, created_at)` supports:
  - `WHERE user_id = ?`
  - `WHERE user_id = ? AND created_at > ?`
  - But NOT: `WHERE created_at > ?` (alone)

---

## Core MVP Tables (15 tables)

### 1. Table: `users`

**Query Patterns:**
- Lookup by email (login): `WHERE email = ?`
- Filter by role (admin dashboard): `WHERE role = ?`
- Active users (analytics): `WHERE is_active = TRUE`
- Recent activity: `ORDER BY last_interaction DESC`

**Indexes:**

```sql
-- Primary key (auto-created by Prisma)
CREATE UNIQUE INDEX users_pkey ON users(id);

-- Unique email (auth)
CREATE UNIQUE INDEX users_email_key ON users(email);

-- Role filtering (admin dashboard)
CREATE INDEX idx_users_role ON users(role);

-- Subscription tier filtering
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);

-- Active users only (partial index)
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;

-- Recent activity sorting
CREATE INDEX idx_users_last_interaction ON users(last_interaction DESC NULLS LAST);

-- Composite: active users by tier (dashboard)
CREATE INDEX idx_users_tier_active ON users(subscription_tier, is_active)
  WHERE is_active = TRUE;

-- JSONB: permissions search (if needed)
CREATE INDEX idx_users_permissions_gin ON users USING GIN (permissions);
```

**Index Usage Analysis:**
```sql
-- Query: Login by email
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';
-- Expected: Index Scan using users_email_key (cost=0.29..8.30 rows=1)

-- Query: Active users by tier
EXPLAIN ANALYZE
SELECT * FROM users
WHERE subscription_tier = 'PRO' AND is_active = TRUE;
-- Expected: Index Scan using idx_users_tier_active (cost=0.29..12.50 rows=50)
```

**Maintenance:**
- `users_email_key`: Very selective (unique), low cost
- `idx_users_tier_active`: Partial index, updates only on tier/status changes
- Vacuum strategy: Weekly (low write frequency)

---

### 2. Table: `accounts` (OAuth)

**Query Patterns:**
- Lookup by user: `WHERE user_id = ?`
- OAuth callback: `WHERE provider = ? AND provider_account_id = ?`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX accounts_pkey ON accounts(id);

-- Foreign key to users (cascade deletes)
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Unique provider account (OAuth callback)
CREATE UNIQUE INDEX accounts_provider_provider_account_id_key
  ON accounts(provider, provider_account_id);
```

**Optimization Notes:**
- `accounts_provider_provider_account_id_key`: Composite unique, covers OAuth lookup
- Write-heavy table (token refreshes), optimize for fast INSERT/UPDATE
- Consider partitioning by `provider` if multi-provider support grows

---

### 3. Table: `auth_sessions`

**Query Patterns:**
- Validate session: `WHERE session_token = ?`
- User's active sessions: `WHERE user_id = ?`
- Clean expired: `WHERE expires < NOW()`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX auth_sessions_pkey ON auth_sessions(id);

-- Unique session token (auth validation)
CREATE UNIQUE INDEX auth_sessions_session_token_key ON auth_sessions(session_token);

-- Foreign key to users
CREATE INDEX idx_sessions_user_id ON auth_sessions(user_id);

-- Expiration cleanup (partial index)
CREATE INDEX idx_sessions_expires ON auth_sessions(expires)
  WHERE expires > CURRENT_TIMESTAMP;
```

**Maintenance:**
- Daily VACUUM to reclaim space from expired sessions
- Auto-delete expired sessions via cronjob:
```sql
DELETE FROM auth_sessions WHERE expires < NOW();
```

---

### 4. Table: `invitations`

**Query Patterns:**
- Validate token: `WHERE token = ?`
- Pending invitations: `WHERE status = 'PENDING'`
- User's sent invitations: `WHERE invited_by = ?`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX invitations_pkey ON invitations(id);

-- Unique token (invitation validation)
CREATE UNIQUE INDEX invitations_token_key ON invitations(token);

-- Email lookup (check existing invitation)
CREATE INDEX idx_invitations_email ON invitations(email);

-- Foreign key to users (inviter)
CREATE INDEX idx_invitations_invited_by ON invitations(invited_by);

-- Pending invitations only (partial index)
CREATE INDEX idx_invitations_status ON invitations(status)
  WHERE status = 'PENDING';
```

**Cleanup Strategy:**
```sql
-- Weekly cleanup of expired invitations
DELETE FROM invitations
WHERE status = 'PENDING' AND expires_at < NOW();
```

---

### 5. Table: `agents`

**Query Patterns:**
- Lookup by slug: `WHERE slug = ?`
- User's agents: `WHERE created_by = ?`
- Public agents: `WHERE is_public = TRUE AND is_active = TRUE`
- Browse by category: `WHERE category = ?`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX agents_pkey ON agents(id);

-- Unique slug (URL routing)
CREATE UNIQUE INDEX agents_slug_key ON agents(slug);

-- Foreign key to users (creator)
CREATE INDEX idx_agents_created_by ON agents(created_by);

-- Category browsing
CREATE INDEX idx_agents_category ON agents(category);

-- Public agents (partial index)
CREATE INDEX idx_agents_is_public ON agents(is_public)
  WHERE is_public = TRUE;

-- Active agents (partial index)
CREATE INDEX idx_agents_is_active ON agents(is_active)
  WHERE is_active = TRUE;

-- Composite: public + active + category (marketplace)
CREATE INDEX idx_agents_public_active_category
  ON agents(category, is_public, is_active)
  WHERE is_public = TRUE AND is_active = TRUE;

-- JSONB: capabilities search
CREATE INDEX idx_agents_capabilities_gin ON agents USING GIN (capabilities);
```

**Performance Notes:**
- `agents_slug_key`: Critical for routing, very fast lookup
- `idx_agents_public_active_category`: Covers agent marketplace queries
- Consider caching agent list (TTL: 1h) if marketplace is read-heavy

---

### 6. Table: `user_agent_permissions`

**Query Patterns:**
- Check permission: `WHERE user_id = ? AND agent_id = ?`
- User's accessible agents: `WHERE user_id = ?`
- Agent's authorized users: `WHERE agent_id = ?`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX user_agent_permissions_pkey ON user_agent_permissions(id);

-- Unique constraint (no duplicate permissions)
CREATE UNIQUE INDEX user_agent_permissions_user_id_agent_id_key
  ON user_agent_permissions(user_id, agent_id);

-- Foreign key to users
CREATE INDEX idx_user_agent_permissions_user_id ON user_agent_permissions(user_id);

-- Foreign key to agents
CREATE INDEX idx_user_agent_permissions_agent_id ON user_agent_permissions(agent_id);
```

**Optimization:**
- Unique composite index covers permission checks
- Small table (<10K rows), fast scans
- Cache user permissions in Redis (TTL: 5 min)

---

### 7. Table: `chat_sessions`

**Query Patterns:**
- User's sessions: `WHERE user_id = ?`
- Recent sessions: `ORDER BY last_activity DESC`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX chat_sessions_pkey ON chat_sessions(id);

-- Foreign key to users
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);

-- Recent activity sorting
CREATE INDEX idx_chat_sessions_last_activity ON chat_sessions(last_activity DESC);

-- Composite: user's recent sessions
CREATE INDEX idx_chat_sessions_user_activity
  ON chat_sessions(user_id, last_activity DESC);
```

---

### 8. Table: `conversations`

**Query Patterns:**
- Session's conversations: `WHERE chat_session_id = ?`
- Agent's conversations: `WHERE agent_id = ?`
- Recent conversations: `ORDER BY created_at DESC`
- Specific agent in session: `WHERE chat_session_id = ? AND agent_id = ?`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX conversations_pkey ON conversations(id);

-- Foreign key to chat_sessions
CREATE INDEX idx_conversations_session_id ON conversations(chat_session_id);

-- Foreign key to agents
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);

-- Created date sorting
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Composite: session + agent (conversation lookup)
CREATE INDEX idx_conversations_session_agent
  ON conversations(chat_session_id, agent_id);

-- Composite: agent's recent conversations
CREATE INDEX idx_conversations_agent_created
  ON conversations(agent_id, created_at DESC);
```

**Query Example:**
```typescript
// Prisma: Get user's conversations with pagination
const conversations = await prisma.conversation.findMany({
  where: {
    chatSession: {
      userId: userId
    }
  },
  include: {
    agent: {
      select: { name: true, slug: true }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: (page - 1) * 20
});
```

**EXPLAIN ANALYZE:**
```sql
EXPLAIN ANALYZE
SELECT c.*, a.name, a.slug
FROM conversations c
INNER JOIN agents a ON c.agent_id = a.id
WHERE c.chat_session_id IN (
  SELECT id FROM chat_sessions WHERE user_id = 'user-uuid'
)
ORDER BY c.created_at DESC
LIMIT 20;

-- Expected plan:
-- 1. Index Scan on chat_sessions (user_id)
-- 2. Index Scan on conversations (session_id)
-- 3. Index Scan on agents (id)
-- 4. Sort by created_at (using index)
```

---

### 9. Table: `messages`

**Query Patterns:**
- Conversation's messages: `WHERE conversation_id = ?`
- Recent messages: `ORDER BY timestamp DESC`
- Filter by role: `WHERE conversation_id = ? AND role = 'user'`
- Full-text search: `WHERE to_tsvector(content) @@ to_tsquery(?)`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX messages_pkey ON messages(id);

-- Foreign key to conversations (most frequent query)
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Timestamp sorting
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);

-- Role filtering
CREATE INDEX idx_messages_role ON messages(role);

-- Composite: conversation's recent messages (covering index)
CREATE INDEX idx_messages_conversation_timestamp
  ON messages(conversation_id, timestamp DESC);

-- Composite: conversation + role (filter assistant messages)
CREATE INDEX idx_messages_conversation_role
  ON messages(conversation_id, role);

-- Full-text search (GIN index)
CREATE INDEX idx_messages_content_fulltext
  ON messages USING GIN (to_tsvector('english', content));

-- JSONB: metadata search
CREATE INDEX idx_messages_metadata_gin ON messages USING GIN (metadata);
```

**Performance Critical:**
- `idx_messages_conversation_timestamp`: **MOST IMPORTANT** - covers chat history loading
- `idx_messages_content_fulltext`: Expensive to maintain, only create if search is critical
- Partial index for recent messages (if needed):
```sql
CREATE INDEX idx_messages_recent ON messages(timestamp DESC)
  WHERE timestamp > NOW() - INTERVAL '30 days';
```

**Full-Text Search Example:**
```sql
-- Search messages containing "error" or "bug"
SELECT * FROM messages
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'error | bug')
ORDER BY timestamp DESC
LIMIT 50;
```

**Optimization:**
- Consider partitioning by `conversation_id` if table > 10M rows
- Archive messages older than 1 year to cold storage

---

### 10. Table: `artifacts`

**Query Patterns:**
- Agent's artifacts: `WHERE agent_id = ?`
- User's artifacts: `WHERE user_id = ?`
- Conversation's artifacts: `WHERE conversation_id = ?`
- Filter by type: `WHERE type = 'CODE'`
- Version history: `WHERE parent_id = ?`
- Public artifacts: `WHERE is_public = TRUE AND share_token = ?`
- Search in metadata: `WHERE metadata @> '{"language": "typescript"}'`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX artifacts_pkey ON artifacts(id);

-- Foreign key to agents
CREATE INDEX idx_artifacts_agent_id ON artifacts(agent_id);

-- User's artifacts (important for dashboard)
CREATE INDEX idx_artifacts_user_id ON artifacts(user_id);

-- Foreign key to conversations
CREATE INDEX idx_artifacts_conversation_id ON artifacts(conversation_id);

-- Type filtering
CREATE INDEX idx_artifacts_type ON artifacts(type);

-- Version history
CREATE INDEX idx_artifacts_parent_id ON artifacts(parent_id);

-- Created date sorting
CREATE INDEX idx_artifacts_created_at ON artifacts(created_at DESC);

-- Share token lookup (partial index)
CREATE UNIQUE INDEX artifacts_share_token_key ON artifacts(share_token)
  WHERE share_token IS NOT NULL;

-- Public artifacts (partial index)
CREATE INDEX idx_artifacts_is_public ON artifacts(is_public)
  WHERE is_public = TRUE;

-- Composite: user's recent artifacts by type
CREATE INDEX idx_artifacts_user_type_created
  ON artifacts(user_id, type, created_at DESC);

-- GIN: metadata search
CREATE INDEX idx_artifacts_metadata_gin ON artifacts USING GIN (metadata);

-- GIN: tags search
CREATE INDEX idx_artifacts_tags_gin ON artifacts USING GIN (tags);

-- Full-text search in content
CREATE INDEX idx_artifacts_content_fulltext
  ON artifacts USING GIN (to_tsvector('english', content));
```

**Performance Notes:**
- `idx_artifacts_metadata_gin`: 100+ MB overhead, but enables flexible queries
- `idx_artifacts_content_fulltext`: Heavy for large artifacts, consider Elasticsearch for advanced search
- Cache artifact list per user (TTL: 5 min)

**Metadata Search Example:**
```sql
-- Find all TypeScript code artifacts
SELECT * FROM artifacts
WHERE metadata @> '{"language": "typescript"}'
  AND type = 'CODE'
ORDER BY created_at DESC;
```

---

### 11. Table: `usage_logs`

**Query Patterns:**
- User's usage: `WHERE user_id = ?`
- Agent's usage: `WHERE agent_id = ?`
- Time-range analysis: `WHERE timestamp BETWEEN ? AND ?`
- Conversation's logs: `WHERE conversation_id = ?`
- Billing aggregation: `GROUP BY user_id, DATE_TRUNC('month', timestamp)`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX usage_logs_pkey ON usage_logs(id);

-- Composite: user's usage by time (most frequent)
CREATE INDEX idx_usage_logs_user_timestamp
  ON usage_logs(user_id, timestamp DESC);

-- Composite: agent's usage by time
CREATE INDEX idx_usage_logs_agent_timestamp
  ON usage_logs(agent_id, timestamp DESC);

-- Conversation's logs
CREATE INDEX idx_usage_logs_conversation_id ON usage_logs(conversation_id);

-- Timestamp for time-range queries
CREATE INDEX idx_usage_logs_timestamp ON usage_logs(timestamp DESC);

-- Composite: user + success (error tracking)
CREATE INDEX idx_usage_logs_user_success
  ON usage_logs(user_id, success, timestamp DESC)
  WHERE success = FALSE;
```

**Partitioning Strategy (Future):**
```sql
-- Partition by month for scalability (when > 10M rows)
CREATE TABLE usage_logs_2025_01 PARTITION OF usage_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE usage_logs_2025_02 PARTITION OF usage_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

**Archival:**
- Move logs older than 1 year to cold storage (S3/Glacier)
- Aggregate into `monthly_usage` table
- Reduces table size 90%+

---

### 12. Table: `monthly_usage`

**Query Patterns:**
- User's monthly stats: `WHERE user_id = ? AND year = ? AND month = ?`
- Billing report: `WHERE year = ? AND month = ?`
- Year-over-year: `WHERE user_id = ? AND year IN (?, ?)`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX monthly_usage_pkey ON monthly_usage(id);

-- Unique constraint (one row per user per month)
CREATE UNIQUE INDEX monthly_usage_user_id_year_month_key
  ON monthly_usage(user_id, year, month);

-- Foreign key to users
CREATE INDEX idx_monthly_usage_user_id ON monthly_usage(user_id);

-- Time-based queries
CREATE INDEX idx_monthly_usage_year_month ON monthly_usage(year DESC, month DESC);

-- Exceeded limit alerts (partial index)
CREATE INDEX idx_monthly_usage_exceeded
  ON monthly_usage(user_id, exceeded_limit)
  WHERE exceeded_limit = TRUE;
```

**Maintenance:**
- Small table (<10K rows), fast scans
- No archival needed (summary data)

---

### 13. Table: `audit_logs`

**Query Patterns:**
- Admin's actions: `WHERE admin_id = ?`
- Time-range audit: `WHERE timestamp BETWEEN ? AND ?`
- Action type: `WHERE action = 'DELETE_USER'`
- Target audit trail: `WHERE target_type = ? AND target_id = ?`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX audit_logs_pkey ON audit_logs(id);

-- Foreign key to users (admin)
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);

-- Timestamp for audit trail
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Action type filtering
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Composite: target audit trail
CREATE INDEX idx_audit_logs_target
  ON audit_logs(target_type, target_id, timestamp DESC);

-- Composite: admin's actions by time
CREATE INDEX idx_audit_logs_admin_timestamp
  ON audit_logs(admin_id, timestamp DESC);
```

**Retention:**
- Keep 2 years minimum (compliance)
- No deletion policy
- Partition by year if > 1M rows

---

### 14. Table: `storage_files`

**Query Patterns:**
- User's files: `WHERE user_id = ?`
- Folder's files: `WHERE folder_id = ?`
- Filter by context: `WHERE usage_context = 'HEALTH'`
- Active files: `WHERE deleted_at IS NULL`
- Expired files cleanup: `WHERE expires_at < NOW()`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX storage_files_pkey ON storage_files(id);

-- User's files (most frequent)
CREATE INDEX idx_storage_files_user_id ON storage_files(user_id);

-- Foreign key to folders
CREATE INDEX idx_storage_files_folder_id ON storage_files(folder_id);

-- Usage context filtering
CREATE INDEX idx_storage_files_usage_context ON storage_files(usage_context);

-- Storage provider (multi-provider support)
CREATE INDEX idx_storage_files_storage_provider ON storage_files(storage_provider);

-- Created date sorting
CREATE INDEX idx_storage_files_created_at ON storage_files(created_at DESC);

-- Active files (partial index - soft delete)
CREATE INDEX idx_storage_files_deleted_at ON storage_files(deleted_at)
  WHERE deleted_at IS NULL;

-- Expired files cleanup (partial index)
CREATE INDEX idx_storage_files_expires_at ON storage_files(expires_at)
  WHERE expires_at IS NOT NULL;

-- Composite: user's active files by context
CREATE INDEX idx_storage_files_user_context
  ON storage_files(user_id, usage_context, deleted_at)
  WHERE deleted_at IS NULL;

-- Composite: folder's active files
CREATE INDEX idx_storage_files_folder_deleted
  ON storage_files(folder_id, deleted_at)
  WHERE deleted_at IS NULL;

-- GIN: metadata search
CREATE INDEX idx_storage_files_metadata_gin ON storage_files USING GIN (metadata);
```

**Performance Critical:**
- `idx_storage_files_deleted_at`: Essential for soft-delete pattern
- `idx_storage_files_user_context`: Covers quota enforcement queries
- Consider partitioning by `user_id` if > 1M files

---

### 15. Table: `support_tickets`

**Query Patterns:**
- Ticket lookup: `WHERE ticket_number = ?`
- User's tickets: `WHERE user_id = ?`
- Assigned tickets: `WHERE assigned_to_id = ?`
- Filter by status: `WHERE status = 'OPEN'`
- Priority sorting: `ORDER BY priority DESC, created_at ASC`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX support_tickets_pkey ON support_tickets(id);

-- Unique ticket number
CREATE UNIQUE INDEX support_tickets_ticket_number_key ON support_tickets(ticket_number);

-- Foreign key to users (ticket creator)
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);

-- Foreign key to users (assignee)
CREATE INDEX idx_support_tickets_assigned_to_id ON support_tickets(assigned_to_id);

-- Status filtering (most frequent)
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- Priority sorting
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);

-- Composite: open tickets by priority (support dashboard)
CREATE INDEX idx_support_tickets_status_priority
  ON support_tickets(status, priority DESC, created_at ASC)
  WHERE status IN ('OPEN', 'IN_PROGRESS');

-- Composite: assigned open tickets
CREATE INDEX idx_support_tickets_assigned_status
  ON support_tickets(assigned_to_id, status)
  WHERE status IN ('OPEN', 'IN_PROGRESS');
```

---

## Advanced Features Tables

### 16. Table: `rag_documents`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX rag_documents_pkey ON rag_documents(id);

-- Foreign key to users
CREATE INDEX idx_rag_documents_user_id ON rag_documents(user_id);

-- Indexed status (processing pipeline)
CREATE INDEX idx_rag_documents_indexed ON rag_documents(indexed);

-- Source filtering
CREATE INDEX idx_rag_documents_source ON rag_documents(source);

-- Created date sorting
CREATE INDEX idx_rag_documents_created_at ON rag_documents(created_at DESC);

-- Composite: user's indexed documents
CREATE INDEX idx_rag_documents_user_indexed
  ON rag_documents(user_id, indexed, created_at DESC);

-- GIN: tags search
CREATE INDEX idx_rag_documents_tags_gin ON rag_documents USING GIN (tags);
```

---

### 17. Table: `mcp_integrations`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX mcp_integrations_pkey ON mcp_integrations(id);

-- Unique constraint (one integration per provider per user)
CREATE UNIQUE INDEX mcp_integrations_user_id_provider_key
  ON mcp_integrations(user_id, provider);

-- Foreign key to users
CREATE INDEX idx_mcp_integrations_user_id ON mcp_integrations(user_id);

-- Provider filtering
CREATE INDEX idx_mcp_integrations_provider ON mcp_integrations(provider);

-- Active integrations (partial index)
CREATE INDEX idx_mcp_integrations_active ON mcp_integrations(is_active)
  WHERE is_active = TRUE;

-- Composite: user's active integrations
CREATE INDEX idx_mcp_integrations_user_active
  ON mcp_integrations(user_id, is_active)
  WHERE is_active = TRUE;
```

---

### 18. Table: `storage_folders`

**Indexes:**

```sql
-- Primary key
CREATE UNIQUE INDEX storage_folders_pkey ON storage_folders(id);

-- Unique constraint (one path per user)
CREATE UNIQUE INDEX storage_folders_user_id_path_key
  ON storage_folders(user_id, path);

-- User's folders
CREATE INDEX idx_storage_folders_user_id ON storage_folders(user_id);

-- Parent folder (hierarchy)
CREATE INDEX idx_storage_folders_parent_id ON storage_folders(parent_id);

-- Path lookup (for breadcrumbs)
CREATE INDEX idx_storage_folders_path ON storage_folders(path);
```

---

## Health & Finance Tables

### Health Tables Indexes

```sql
-- health_profiles
CREATE UNIQUE INDEX health_profiles_pkey ON health_profiles(id);
CREATE UNIQUE INDEX health_profiles_user_id_key ON health_profiles(user_id);

-- medical_conditions
CREATE UNIQUE INDEX medical_conditions_pkey ON medical_conditions(id);
CREATE INDEX idx_medical_conditions_health_profile_id ON medical_conditions(health_profile_id);
CREATE INDEX idx_medical_conditions_status ON medical_conditions(status);

-- medications
CREATE UNIQUE INDEX medications_pkey ON medications(id);
CREATE INDEX idx_medications_health_profile_id ON medications(health_profile_id);
CREATE INDEX idx_medications_is_active ON medications(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_medications_reminder_enabled ON medications(reminder_enabled) WHERE reminder_enabled = TRUE;

-- medication_logs
CREATE UNIQUE INDEX medication_logs_pkey ON medication_logs(id);
CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_scheduled_time ON medication_logs(scheduled_time DESC);
CREATE INDEX idx_medication_logs_status ON medication_logs(status);

-- allergies
CREATE UNIQUE INDEX allergies_pkey ON allergies(id);
CREATE INDEX idx_allergies_health_profile_id ON allergies(health_profile_id);
CREATE INDEX idx_allergies_severity ON allergies(severity);

-- medical_appointments
CREATE UNIQUE INDEX medical_appointments_pkey ON medical_appointments(id);
CREATE INDEX idx_medical_appointments_health_profile_id ON medical_appointments(health_profile_id);
CREATE INDEX idx_medical_appointments_scheduled_date ON medical_appointments(scheduled_date DESC);
CREATE INDEX idx_medical_appointments_status ON medical_appointments(status);

-- health_measurements
CREATE UNIQUE INDEX health_measurements_pkey ON health_measurements(id);
CREATE INDEX idx_health_measurements_health_profile_id ON health_measurements(health_profile_id);
CREATE INDEX idx_health_measurements_type_measured_at ON health_measurements(type, measured_at DESC);
```

---

### Finance Tables Indexes

```sql
-- financial_profiles
CREATE UNIQUE INDEX financial_profiles_pkey ON financial_profiles(id);
CREATE UNIQUE INDEX financial_profiles_user_id_key ON financial_profiles(user_id);

-- financial_accounts
CREATE UNIQUE INDEX financial_accounts_pkey ON financial_accounts(id);
CREATE INDEX idx_financial_accounts_profile_id ON financial_accounts(financial_profile_id);
CREATE INDEX idx_financial_accounts_type ON financial_accounts(type);
CREATE INDEX idx_financial_accounts_is_active ON financial_accounts(is_active) WHERE is_active = TRUE;

-- transactions
CREATE UNIQUE INDEX transactions_pkey ON transactions(id);
CREATE INDEX idx_transactions_profile_id_date ON transactions(financial_profile_id, date DESC);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_date ON transactions(category, date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);

-- budgets
CREATE UNIQUE INDEX budgets_pkey ON budgets(id);
CREATE INDEX idx_budgets_profile_id ON budgets(financial_profile_id);
CREATE INDEX idx_budgets_category ON budgets(category);
CREATE INDEX idx_budgets_is_active ON budgets(is_active) WHERE is_active = TRUE;

-- debts
CREATE UNIQUE INDEX debts_pkey ON debts(id);
CREATE INDEX idx_debts_profile_id ON debts(financial_profile_id);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_debts_priority ON debts(priority);

-- debt_payments
CREATE UNIQUE INDEX debt_payments_pkey ON debt_payments(id);
CREATE INDEX idx_debt_payments_debt_id_date ON debt_payments(debt_id, date DESC);

-- investments
CREATE UNIQUE INDEX investments_pkey ON investments(id);
CREATE INDEX idx_investments_profile_id ON investments(financial_profile_id);
CREATE INDEX idx_investments_type ON investments(type);

-- recurring_payments
CREATE UNIQUE INDEX recurring_payments_pkey ON recurring_payments(id);
CREATE INDEX idx_recurring_payments_profile_id ON recurring_payments(financial_profile_id);
CREATE INDEX idx_recurring_payments_next_due_date ON recurring_payments(next_due_date);
CREATE INDEX idx_recurring_payments_is_active ON recurring_payments(is_active) WHERE is_active = TRUE;
```

---

## Query Optimization Patterns

### N+1 Prevention

**Problem:** Executing N queries in a loop for N records.

**Anti-Pattern:**
```typescript
// ❌ BAD: N+1 queries (1 + N)
const users = await prisma.user.findMany(); // 1 query

for (const user of users) {
  // N queries (one per user)
  user.agents = await prisma.agent.findMany({
    where: { createdBy: user.id }
  });
}
```

**Solution 1: Include (JOIN)**
```typescript
// ✅ GOOD: Single query with JOIN
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

**SQL Generated:**
```sql
SELECT u.*, a.*
FROM users u
LEFT JOIN agents a ON u.id = a.created_by
ORDER BY u.id;
```

**Solution 2: Select (Projection)**
```typescript
// ✅ GOOD: Only fetch needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    createdAgents: {
      select: {
        id: true,
        name: true,
        slug: true
      }
    }
  }
});
```

**Solution 3: DataLoader Pattern**
```typescript
import DataLoader from 'dataloader';

const agentLoader = new DataLoader(async (userIds: string[]) => {
  const agents = await prisma.agent.findMany({
    where: { createdBy: { in: userIds } }
  });

  // Group by userId
  const grouped = userIds.map(userId =>
    agents.filter(a => a.createdBy === userId)
  );

  return grouped;
});

// Usage
const users = await prisma.user.findMany();
for (const user of users) {
  user.agents = await agentLoader.load(user.id); // Batched query
}
```

---

### Lazy vs Eager Loading

**Lazy Loading:** Load related data on-demand (N+1 risk)
**Eager Loading:** Load related data upfront (single query)

**Decision Matrix:**

| Scenario | Strategy | Reason |
|----------|----------|--------|
| Always need relations | Eager | Avoids N+1, single query |
| Rarely need relations | Lazy | Saves bandwidth |
| Large related dataset | Lazy | Avoids memory overflow |
| Dashboard (summary) | Eager | All data needed |
| Detail page (specific) | Lazy | Conditional loading |

**Example:**
```typescript
// Dashboard: Eager loading
const conversations = await prisma.conversation.findMany({
  include: {
    agent: { select: { name: true, slug: true } },
    _count: { select: { messages: true } }
  }
});

// Chat view: Lazy loading (messages paginated)
const conversation = await prisma.conversation.findUnique({
  where: { id: conversationId },
  include: { agent: true }
});

// Load messages separately (paginated)
const messages = await prisma.message.findMany({
  where: { conversationId },
  orderBy: { timestamp: 'desc' },
  take: 50,
  skip: page * 50
});
```

---

### Batch Operations

**Problem:** Multiple INSERT/UPDATE statements in loop.

**Anti-Pattern:**
```typescript
// ❌ BAD: N separate INSERT statements
for (const message of messages) {
  await prisma.message.create({
    data: message
  });
}
```

**Solution 1: createMany**
```typescript
// ✅ GOOD: Single bulk INSERT
await prisma.message.createMany({
  data: messages
});
```

**SQL Generated:**
```sql
INSERT INTO messages (id, conversation_id, role, content, timestamp)
VALUES
  ('uuid1', 'conv1', 'user', 'Hello', NOW()),
  ('uuid2', 'conv1', 'assistant', 'Hi', NOW()),
  ('uuid3', 'conv1', 'user', 'How are you?', NOW());
```

**Solution 2: Transaction**
```typescript
// ✅ GOOD: Atomic transaction
await prisma.$transaction(
  messages.map(message =>
    prisma.message.create({ data: message })
  )
);
```

**Solution 3: Raw SQL (Extreme Performance)**
```typescript
// ✅ GOOD: Raw SQL for massive inserts (10K+ rows)
const values = messages.map(m =>
  `('${m.id}', '${m.conversationId}', '${m.role}', '${m.content}', NOW())`
).join(',');

await prisma.$executeRawUnsafe(`
  INSERT INTO messages (id, conversation_id, role, content, timestamp)
  VALUES ${values}
`);
```

**Performance Comparison:**
- Individual INSERTs: ~10 rows/sec
- createMany: ~1,000 rows/sec (100x faster)
- Raw SQL: ~10,000 rows/sec (1,000x faster)

---

### Denormalization Strategy

**Problem:** Complex aggregations are slow.

**Example:** User dashboard needs:
- Total messages sent
- Total tokens used
- Monthly usage

**Anti-Pattern:**
```typescript
// ❌ BAD: Aggregate on every request
const stats = await prisma.message.aggregate({
  where: {
    conversation: {
      chatSession: { userId: userId }
    }
  },
  _count: { id: true },
  _sum: { tokensInput: true, tokensOutput: true }
});
```

**Solution: Pre-calculated Counters**

**Schema Change:**
```prisma
model User {
  id                String  @id @default(uuid())
  email             String  @unique

  // Pre-calculated counters (denormalized)
  totalMessages     Int     @default(0)
  totalTokensUsed   BigInt  @default(0)
  monthlyMessages   Int     @default(0)
  monthlyTokens     BigInt  @default(0)
  lastResetAt       DateTime @default(now())
  lastInteraction   DateTime?
}
```

**Update Trigger:**
```sql
CREATE OR REPLACE FUNCTION update_usage_counters()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE TRIGGER update_usage_counters_trigger
  AFTER INSERT ON usage_logs
  FOR EACH ROW EXECUTE FUNCTION update_usage_counters();
```

**Usage:**
```typescript
// ✅ GOOD: Single query, instant response
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    totalMessages: true,
    totalTokensUsed: true,
    monthlyMessages: true,
    monthlyTokens: true
  }
});
```

**Trade-offs:**
- **Pros:** 1000x faster reads, simplified queries
- **Cons:** Slight overhead on writes, data consistency risk

**When to Denormalize:**
- Read-heavy workloads (90%+ reads)
- Dashboard/analytics queries
- Aggregations over large datasets
- SLA-critical queries

**When NOT to Denormalize:**
- Write-heavy workloads
- Real-time accuracy critical
- Complex business logic
- Audit trails

---

## Query Performance Analysis

### Using EXPLAIN ANALYZE

**Basic Syntax:**
```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';
```

**Output Components:**

1. **Query Plan:** How PostgreSQL executes the query
2. **Cost Estimation:** `cost=0.29..8.30` (startup..total)
3. **Actual Time:** `actual time=0.045..0.046 ms`
4. **Rows:** `rows=1`
5. **Loops:** `loops=1`

**Reading EXPLAIN Output:**

```sql
EXPLAIN ANALYZE
SELECT c.*, a.name
FROM conversations c
INNER JOIN agents a ON c.agent_id = a.id
WHERE c.chat_session_id = 'session-uuid'
ORDER BY c.created_at DESC
LIMIT 20;

-- Output:
Limit  (cost=0.71..27.50 rows=20 width=1234) (actual time=0.023..0.156 rows=20 loops=1)
  ->  Nested Loop  (cost=0.71..134.00 rows=100 width=1234) (actual time=0.022..0.150 rows=20 loops=1)
        ->  Index Scan using idx_conversations_session_id on conversations c  (cost=0.29..65.00 rows=100 width=1200) (actual time=0.015..0.080 rows=20 loops=1)
              Index Cond: (chat_session_id = 'session-uuid')
              Filter: (created_at IS NOT NULL)
        ->  Index Scan using agents_pkey on agents a  (cost=0.42..0.69 rows=1 width=34) (actual time=0.002..0.002 rows=1 loops=20)
              Index Cond: (id = c.agent_id)
Planning Time: 0.234 ms
Execution Time: 0.189 ms
```

**What to Look For:**

✅ **Good Signs:**
- `Index Scan` or `Index Only Scan`
- Low `cost` values (< 100)
- Low `actual time` (< 10 ms)
- `rows` match estimate

❌ **Bad Signs:**
- `Seq Scan` (sequential scan - no index used)
- High `cost` values (> 1000)
- High `actual time` (> 100 ms)
- `rows` estimate way off

**Common Scan Types:**

| Scan Type | Description | Performance |
|-----------|-------------|-------------|
| Index Scan | Uses index | Fast |
| Index Only Scan | Uses index, no table access | Fastest |
| Bitmap Index Scan | Combines multiple indexes | Good |
| Seq Scan | Full table scan | Slow |
| Nested Loop | JOIN strategy | Good for small datasets |
| Hash Join | JOIN strategy | Good for large datasets |
| Merge Join | JOIN strategy | Good for sorted data |

---

### Common Query Patterns

#### 1. User Conversation History (with Pagination)

```sql
-- Query: Get user's recent conversations
EXPLAIN ANALYZE
SELECT c.id, c.title, c.created_at, c.message_count,
       a.name as agent_name, a.slug as agent_slug
FROM conversations c
INNER JOIN chat_sessions cs ON c.chat_session_id = cs.id
INNER JOIN agents a ON c.agent_id = a.id
WHERE cs.user_id = 'user-uuid'
  AND c.created_at > NOW() - INTERVAL '30 days'
ORDER BY c.created_at DESC
LIMIT 20 OFFSET 0;
```

**Expected Plan:**
```
Limit  (cost=0.71..45.23 rows=20)
  ->  Nested Loop  (cost=0.71..450.00 rows=200)
        ->  Nested Loop  (cost=0.43..250.00 rows=200)
              ->  Index Scan using idx_chat_sessions_user_id on chat_sessions cs
              ->  Index Scan using idx_conversations_session_id on conversations c
        ->  Index Scan using agents_pkey on agents a
```

**Optimization:**
- Uses 3 indexes: `idx_chat_sessions_user_id`, `idx_conversations_session_id`, `agents_pkey`
- Nested Loop efficient for small result sets
- LIMIT prevents full table scan

**Prisma Query:**
```typescript
const conversations = await prisma.conversation.findMany({
  where: {
    chatSession: {
      userId: userId
    },
    createdAt: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  },
  include: {
    agent: {
      select: { name: true, slug: true }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: page * 20
});
```

---

#### 2. Message History with Artifacts

```sql
-- Query: Load conversation with messages and artifacts
EXPLAIN ANALYZE
SELECT m.id, m.role, m.content, m.timestamp,
       a.id as artifact_id, a.name as artifact_name, a.type as artifact_type
FROM messages m
LEFT JOIN artifacts a ON m.conversation_id = a.conversation_id
  AND m.timestamp <= a.created_at
WHERE m.conversation_id = 'conv-uuid'
ORDER BY m.timestamp DESC
LIMIT 50;
```

**Expected Plan:**
```
Limit  (cost=25.71..125.50 rows=50)
  ->  Hash Left Join  (cost=25.71..500.00 rows=500)
        Hash Cond: (m.conversation_id = a.conversation_id)
        Filter: (m.timestamp <= a.created_at)
        ->  Index Scan using idx_messages_conversation_timestamp on messages m
        ->  Hash
              ->  Index Scan using idx_artifacts_conversation_id on artifacts a
```

**Optimization:**
- `idx_messages_conversation_timestamp`: Composite index covers ORDER BY
- Hash Join efficient for small artifact dataset
- LIMIT prevents loading entire conversation

**Prisma Query:**
```typescript
const messages = await prisma.message.findMany({
  where: { conversationId },
  orderBy: { timestamp: 'desc' },
  take: 50,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined
});

const artifacts = await prisma.artifact.findMany({
  where: { conversationId },
  orderBy: { createdAt: 'asc' }
});
```

---

#### 3. RAG Search with Context

```sql
-- Query: Search documents and return chunks
-- Note: Vector search happens in Pinecone, this retrieves metadata
EXPLAIN ANALYZE
SELECT rd.id, rd.title, rd.source, rd.chunk_count,
       rd.metadata->>'author' as author,
       rd.metadata->>'created_date' as doc_date
FROM rag_documents rd
WHERE rd.user_id = 'user-uuid'
  AND rd.indexed = TRUE
  AND rd.tags && ARRAY['machine-learning', 'neural-networks']
ORDER BY rd.created_at DESC
LIMIT 10;
```

**Expected Plan:**
```
Limit  (cost=45.29..100.50 rows=10)
  ->  Index Scan using idx_rag_documents_user_indexed on rag_documents rd
        Index Cond: ((user_id = 'user-uuid') AND (indexed = true))
        Filter: (tags && '{machine-learning,neural-networks}'::text[])
```

**Optimization:**
- `idx_rag_documents_user_indexed`: Composite index covers WHERE clause
- `idx_rag_documents_tags_gin`: GIN index for array overlap (`&&`)
- JSONB operators extract metadata efficiently

---

#### 4. User Activity Dashboard

```sql
-- Query: User stats for dashboard
EXPLAIN ANALYZE
SELECT
  u.id,
  u.email,
  u.total_messages,
  u.monthly_messages,
  u.subscription_tier,
  COUNT(DISTINCT cs.id) as active_sessions,
  COUNT(DISTINCT c.id) as total_conversations,
  SUM(c.message_count) as total_messages_calc
FROM users u
LEFT JOIN chat_sessions cs ON u.id = cs.user_id
  AND cs.last_activity > NOW() - INTERVAL '7 days'
LEFT JOIN conversations c ON cs.id = c.chat_session_id
WHERE u.id = 'user-uuid'
GROUP BY u.id;
```

**Expected Plan:**
```
GroupAggregate  (cost=85.29..250.50 rows=1)
  Group Key: u.id
  ->  Nested Loop Left Join  (cost=0.71..200.00 rows=100)
        ->  Nested Loop Left Join  (cost=0.43..100.00 rows=50)
              ->  Index Scan using users_pkey on users u
              ->  Index Scan using idx_chat_sessions_user_id on chat_sessions cs
        ->  Index Scan using idx_conversations_session_id on conversations c
```

**Optimization:**
- Pre-calculated counters (`total_messages`, `monthly_messages`) avoid aggregation
- Active sessions filter via `last_activity` index
- Consider caching dashboard data (TTL: 5 min)

**Prisma Query:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    totalMessages: true,
    monthlyMessages: true,
    subscriptionTier: true,
    chatSessions: {
      where: {
        lastActivity: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        id: true,
        _count: { select: { conversations: true } }
      }
    }
  }
});
```

---

#### 5. Monthly Billing Report

```sql
-- Query: Generate billing report for all users
EXPLAIN ANALYZE
SELECT
  u.id,
  u.email,
  u.subscription_tier,
  mu.total_messages,
  mu.total_tokens,
  mu.total_cost,
  mu.exceeded_limit
FROM monthly_usage mu
INNER JOIN users u ON mu.user_id = u.id
WHERE mu.year = 2025
  AND mu.month = 10
  AND u.subscription_tier IN ('PRO', 'ENTERPRISE')
ORDER BY mu.total_cost DESC
LIMIT 100;
```

**Expected Plan:**
```
Limit  (cost=125.50..300.00 rows=100)
  ->  Sort  (cost=125.50..150.00 rows=1000)
        Sort Key: mu.total_cost DESC
        ->  Nested Loop  (cost=0.71..100.00 rows=1000)
              ->  Index Scan using idx_monthly_usage_year_month on monthly_usage mu
              ->  Index Scan using users_pkey on users u
                    Filter: (subscription_tier = ANY ('{PRO,ENTERPRISE}'))
```

**Optimization:**
- `idx_monthly_usage_year_month`: Fast time-range filter
- Sort on `total_cost` might need index if report is frequent:
```sql
CREATE INDEX idx_monthly_usage_cost ON monthly_usage(year, month, total_cost DESC);
```

---

## Caching Strategy

### Query Caching with Redis

**Setup:**
```typescript
// lib/redis.ts
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Cache key generator
export function cacheKey(prefix: string, ...args: (string | number)[]): string {
  return `${prefix}:${args.join(':')}`;
}
```

**Cache Decorator:**
```typescript
// lib/cache.ts
import { redis, cacheKey } from './redis';

export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  // Execute query
  const result = await fn();

  // Store in cache
  await redis.setex(key, ttl, JSON.stringify(result));

  return result;
}
```

**Usage Examples:**

#### 1. User Profile Cache
```typescript
// TTL: 5 minutes (user data changes infrequently)
async function getUserProfile(userId: string) {
  return withCache(
    cacheKey('user:profile', userId),
    300, // 5 minutes
    async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          avatar: true,
          subscriptionTier: true
        }
      });
    }
  );
}
```

#### 2. Agent List Cache
```typescript
// TTL: 1 hour (agents rarely change)
async function getPublicAgents() {
  return withCache(
    cacheKey('agents:public'),
    3600, // 1 hour
    async () => {
      return prisma.agent.findMany({
        where: {
          isPublic: true,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          capabilities: true
        },
        orderBy: { totalUses: 'desc' }
      });
    }
  );
}
```

#### 3. User Permissions Cache
```typescript
// TTL: 5 minutes (permissions change rarely)
async function getUserAgentPermissions(userId: string) {
  return withCache(
    cacheKey('user:permissions', userId),
    300,
    async () => {
      return prisma.userAgentPermission.findMany({
        where: { userId },
        select: { agentId: true }
      }).then(perms => perms.map(p => p.agentId));
    }
  );
}
```

#### 4. Conversation List Cache
```typescript
// TTL: 1 minute (conversations update frequently)
async function getUserConversations(userId: string, page: number = 0) {
  return withCache(
    cacheKey('user:conversations', userId, page),
    60, // 1 minute
    async () => {
      return prisma.conversation.findMany({
        where: {
          chatSession: { userId }
        },
        include: {
          agent: { select: { name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: page * 20
      });
    }
  );
}
```

#### 5. Usage Stats Cache
```typescript
// TTL: 24 hours (daily stats)
async function getMonthlyUsageStats(userId: string, year: number, month: number) {
  return withCache(
    cacheKey('usage:monthly', userId, year, month),
    86400, // 24 hours
    async () => {
      return prisma.monthlyUsage.findUnique({
        where: {
          userId_year_month: { userId, year, month }
        }
      });
    }
  );
}
```

---

### Cache Invalidation Strategy

**Invalidation Patterns:**

#### 1. Write-Through (Immediate)
```typescript
// Update user profile
async function updateUserProfile(userId: string, data: UpdateUserInput) {
  // 1. Update database
  const user = await prisma.user.update({
    where: { id: userId },
    data
  });

  // 2. Invalidate cache
  await redis.del(cacheKey('user:profile', userId));

  // 3. Optional: Warm cache
  await redis.setex(
    cacheKey('user:profile', userId),
    300,
    JSON.stringify(user)
  );

  return user;
}
```

#### 2. Write-Behind (Delayed)
```typescript
// Update conversation (non-critical)
async function addMessage(conversationId: string, message: CreateMessageInput) {
  // 1. Update database
  const msg = await prisma.message.create({
    data: {
      conversationId,
      ...message
    }
  });

  // 2. Schedule cache invalidation (async)
  setImmediate(async () => {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { chatSession: { select: { userId: true } } }
    });

    if (conversation) {
      await redis.del(cacheKey('user:conversations', conversation.chatSession.userId, '*'));
    }
  });

  return msg;
}
```

#### 3. TTL-Based (Lazy)
```typescript
// No explicit invalidation, cache expires naturally
// Good for: Dashboard stats, reports, public data
```

---

### Prisma Middleware

**Transparent Caching:**
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { redis, cacheKey } from './redis';

const prisma = new PrismaClient();

// Cache middleware (experimental)
prisma.$use(async (params, next) => {
  // Only cache read operations
  if (params.action !== 'findUnique' && params.action !== 'findMany') {
    return next(params);
  }

  // Only cache specific models
  const cacheableModels = ['User', 'Agent', 'Conversation'];
  if (!cacheableModels.includes(params.model || '')) {
    return next(params);
  }

  // Generate cache key
  const key = cacheKey(
    'prisma',
    params.model || 'unknown',
    params.action,
    JSON.stringify(params.args)
  );

  // Try cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Execute query
  const result = await next(params);

  // Store in cache (TTL: 5 min)
  await redis.setex(key, 300, JSON.stringify(result));

  return result;
});

export { prisma };
```

**Warning:** Middleware adds latency to every query. Use selectively.

---

### Cache TTL Recommendations

| Data Type | TTL | Reason |
|-----------|-----|--------|
| User profile | 5 min | Changes infrequently |
| User permissions | 5 min | Security-sensitive |
| Public agents list | 1 hour | Rarely changes |
| Conversation list | 1 min | Updates frequently |
| Message history | 30 sec | Real-time chat |
| Dashboard stats | 5 min | Acceptable staleness |
| Monthly usage | 24 hours | Daily aggregation |
| Agent config | 10 min | Configuration changes |
| RAG documents | 1 hour | Search index updates |

---

## Connection Pooling

### PgBouncer Configuration

**Neon Serverless (Built-in PgBouncer):**

Neon includes PgBouncer by default. No manual setup needed.

**Connection String:**
```
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/db?pgbouncer=true&connection_limit=10"
```

**Parameters:**
- `pgbouncer=true`: Enable pooling
- `connection_limit=10`: Max connections per Prisma Client

---

### Pool Size Optimization

**Sizing Formula:**
```
Optimal Pool Size = ((CPU Cores * 2) + Effective Spindles)
```

**For Neon:**
- Shared compute: 10-20 connections
- Dedicated compute: 50-100 connections
- High traffic: 100-200 connections

**Prisma Configuration:**
```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Connection pool is managed by DATABASE_URL parameters
// Default: connection_limit=10
```

**Monitoring:**
```sql
-- Check active connections
SELECT
  datname,
  numbackends as connections,
  xact_commit,
  xact_rollback,
  blks_read,
  blks_hit,
  tup_returned,
  tup_fetched,
  tup_inserted,
  tup_updated,
  tup_deleted
FROM pg_stat_database
WHERE datname = 'cjhirashi_agents';

-- Check connection pool stats (PgBouncer)
SHOW POOLS;
SHOW STATS;
```

**Optimization Tips:**
1. **Keep connections short-lived:** Close after query
2. **Use connection pooling:** Essential for serverless
3. **Monitor pool exhaustion:** Alert if > 90% utilization
4. **Scale horizontally:** Multiple app instances share pool
5. **Tune statement timeout:**
```sql
SET statement_timeout = '30s';
```

---

## Partitioning & Sharding

### Horizontal Partitioning

**When to Partition:**
- Table > 10 million rows
- Queries frequently filter by partition key
- Time-series data (logs, events)
- Archive old data easily

**Partition Strategies:**

#### 1. Range Partitioning (by date)

**Example: `usage_logs` by month**
```sql
-- Create parent table (partitioned)
CREATE TABLE usage_logs_partitioned (
  id UUID,
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  tokens_input INT,
  tokens_output INT,
  total_cost DECIMAL(10,6)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE usage_logs_2025_01 PARTITION OF usage_logs_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE usage_logs_2025_02 PARTITION OF usage_logs_partitioned
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE usage_logs_2025_03 PARTITION OF usage_logs_partitioned
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Auto-create future partitions via cronjob
```

**Benefits:**
- Query pruning: Only scans relevant partitions
- Easy archival: Drop old partitions
- Maintenance: VACUUM per partition

**Query Example:**
```sql
-- Only scans usage_logs_2025_01 partition
SELECT * FROM usage_logs_partitioned
WHERE timestamp >= '2025-01-15' AND timestamp < '2025-01-20';
```

---

#### 2. List Partitioning (by category)

**Example: `storage_files` by usage_context**
```sql
-- Create parent table
CREATE TABLE storage_files_partitioned (
  id UUID,
  user_id UUID NOT NULL,
  usage_context VARCHAR(50) NOT NULL,
  size BIGINT,
  created_at TIMESTAMP
) PARTITION BY LIST (usage_context);

-- Create context-specific partitions
CREATE TABLE storage_files_health PARTITION OF storage_files_partitioned
  FOR VALUES IN ('HEALTH');

CREATE TABLE storage_files_finance PARTITION OF storage_files_partitioned
  FOR VALUES IN ('FINANCE');

CREATE TABLE storage_files_general PARTITION OF storage_files_partitioned
  FOR VALUES IN ('AVATAR', 'TICKET', 'ARTIFACT', 'OTHER');
```

**Benefits:**
- Isolate sensitive data (HIPAA compliance)
- Different retention policies per context
- Targeted backups

---

#### 3. Hash Partitioning (by user_id)

**Example: `messages` by user (via chat_session)**
```sql
-- Create parent table
CREATE TABLE messages_partitioned (
  id UUID,
  conversation_id UUID NOT NULL,
  role VARCHAR(50),
  content TEXT,
  timestamp TIMESTAMP
) PARTITION BY HASH (conversation_id);

-- Create 4 hash partitions (distribute load)
CREATE TABLE messages_part_0 PARTITION OF messages_partitioned
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE messages_part_1 PARTITION OF messages_partitioned
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);

CREATE TABLE messages_part_2 PARTITION OF messages_partitioned
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);

CREATE TABLE messages_part_3 PARTITION OF messages_partitioned
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

**Benefits:**
- Even distribution of data
- Parallel query execution
- Horizontal scalability

---

### Vertical Partitioning

**Strategy:** Split large columns into separate tables.

**Example: Separate large JSONB fields**

**Before:**
```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY,
  name VARCHAR(500),
  content TEXT, -- Large field (1MB+)
  metadata JSONB, -- Large field (100KB+)
  created_at TIMESTAMP
);
```

**After:**
```sql
-- Core table (frequently accessed)
CREATE TABLE artifacts (
  id UUID PRIMARY KEY,
  name VARCHAR(500),
  type VARCHAR(50),
  created_at TIMESTAMP
);

-- Large content (lazy loaded)
CREATE TABLE artifact_content (
  artifact_id UUID PRIMARY KEY REFERENCES artifacts(id),
  content TEXT,
  blob_url VARCHAR(500)
);

-- Metadata (lazy loaded)
CREATE TABLE artifact_metadata (
  artifact_id UUID PRIMARY KEY REFERENCES artifacts(id),
  metadata JSONB,
  tags JSONB
);
```

**Benefits:**
- Smaller main table (faster scans)
- Load large fields on-demand
- Better caching (small rows)

**Trade-offs:**
- More JOINs required
- Increased complexity

---

## Vacuum & Maintenance

### VACUUM Strategy

**Purpose:** Reclaim space from deleted/updated rows, update statistics.

**Types:**

1. **VACUUM:** Reclaim space, mark as reusable
2. **VACUUM FULL:** Rewrite table, reclaim disk space (locks table)
3. **VACUUM ANALYZE:** Vacuum + update statistics

**Auto-Vacuum Configuration:**
```sql
-- Check autovacuum settings
SHOW autovacuum;
SHOW autovacuum_naptime;
SHOW autovacuum_vacuum_scale_factor;
SHOW autovacuum_analyze_scale_factor;

-- Recommended settings (per table)
ALTER TABLE messages SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 10
);
```

**Manual VACUUM Schedule:**
```sql
-- Weekly vacuum (off-peak hours)
VACUUM ANALYZE messages;
VACUUM ANALYZE conversations;
VACUUM ANALYZE usage_logs;

-- Monthly vacuum full (if needed)
VACUUM FULL auth_sessions; -- Small table, safe to lock
```

**Monitoring:**
```sql
-- Check table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_dead_tup,
  n_live_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_dead_tup DESC
LIMIT 20;
```

**When to VACUUM FULL:**
- Dead tuple ratio > 20%
- Table size bloated > 2x actual data
- After bulk deletes (>50% of table)

---

### ANALYZE for Statistics

**Purpose:** Update query planner statistics.

**Frequency:**
- Auto: After 10% of rows change
- Manual: After bulk operations, schema changes

**Example:**
```sql
ANALYZE users;
ANALYZE conversations;
ANALYZE messages;

-- Or all tables
ANALYZE;
```

---

### Transaction Isolation Levels

**Levels:**
1. **READ UNCOMMITTED** (not supported in PostgreSQL)
2. **READ COMMITTED** (default)
3. **REPEATABLE READ**
4. **SERIALIZABLE**

**Default (READ COMMITTED):**
- Good for most use cases
- Sees committed data from other transactions

**Use REPEATABLE READ:**
- Consistent read within transaction
- Avoids phantom reads

**Use SERIALIZABLE:**
- Strictest isolation (prevents all anomalies)
- Performance impact (retries on conflict)

**Prisma Transaction:**
```typescript
// Default: READ COMMITTED
await prisma.$transaction([
  prisma.user.update({ where: { id }, data: { monthlyMessages: { increment: 1 } } }),
  prisma.usageLog.create({ data: logData })
]);

// REPEATABLE READ
await prisma.$executeRaw`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`;
await prisma.$transaction([
  prisma.user.findUnique({ where: { id } }),
  prisma.user.update({ where: { id }, data: { totalMessages: { increment: 1 } } })
]);
```

---

## Monitoring & Observability

### Metrics to Track

#### 1. Query Performance

**Key Metrics:**
- Query duration (p50, p95, p99)
- Slow query count (> 100ms)
- Query errors (rate)
- Query throughput (qps)

**Neon Dashboard:**
- Built-in query insights
- Slow query log
- Connection stats

**Custom Monitoring:**
```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries
SELECT
  query,
  calls,
  ROUND(total_exec_time::numeric / 1000, 2) as total_time_sec,
  ROUND(mean_exec_time::numeric, 2) as mean_time_ms,
  ROUND((100 * total_exec_time / SUM(total_exec_time) OVER ())::numeric, 2) as pct_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 10;
```

---

#### 2. Index Utilization

**Unused Indexes:**
```sql
-- Find indexes never used
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Index Hit Rate:**
```sql
-- Should be > 99%
SELECT
  sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0) * 100 as index_hit_rate
FROM pg_statio_user_indexes;
```

---

#### 3. Cache Hit Rate

**Buffer Cache:**
```sql
-- Should be > 95%
SELECT
  sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 as cache_hit_rate
FROM pg_statio_user_tables;
```

---

#### 4. Connection Pool

**Active Connections:**
```sql
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = current_database();
```

**Connection Limits:**
```sql
SHOW max_connections;

-- Alert if > 90% utilization
SELECT
  (SELECT count(*) FROM pg_stat_activity) * 100.0 /
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as pct_used;
```

---

#### 5. Table and Index Sizes

```sql
-- Top 10 largest tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

---

### Alerting Rules

**Critical Alerts:**
1. Query latency p99 > 500ms
2. Connection pool > 90%
3. Slow query count > 100/min
4. Cache hit rate < 95%
5. Disk space < 20%
6. Replication lag > 10s (if replicas)

**Warning Alerts:**
1. Query latency p99 > 200ms
2. Connection pool > 70%
3. Dead tuple ratio > 20%
4. Vacuum age > 1 week
5. Index bloat > 50%

**Tools:**
- Neon Dashboard (built-in)
- DataDog / New Relic
- Custom: pg_stat_statements + Grafana
- Vercel Functions logs

---

## SLOs & Performance Targets

### Service Level Objectives

| Query Type | p50 | p95 | p99 | Max |
|------------|-----|-----|-----|-----|
| **Read Queries** |
| User lookup (by ID) | 2ms | 5ms | 10ms | 50ms |
| User lookup (by email) | 3ms | 8ms | 15ms | 50ms |
| Agent lookup (by slug) | 2ms | 5ms | 10ms | 50ms |
| Conversation list (20 items) | 10ms | 30ms | 50ms | 200ms |
| Message history (50 items) | 15ms | 40ms | 80ms | 300ms |
| Artifact list | 10ms | 30ms | 60ms | 200ms |
| **Write Queries** |
| Insert message | 5ms | 15ms | 30ms | 100ms |
| Insert usage log | 3ms | 10ms | 20ms | 100ms |
| Update user counters | 5ms | 15ms | 30ms | 100ms |
| Create artifact | 10ms | 30ms | 60ms | 200ms |
| **Complex Queries** |
| Dashboard stats | 50ms | 150ms | 300ms | 1000ms |
| Monthly billing report | 100ms | 300ms | 500ms | 2000ms |
| Full-text search | 50ms | 200ms | 400ms | 2000ms |
| RAG metadata query | 30ms | 100ms | 200ms | 1000ms |

---

### Performance Budgets

**Infrastructure:**
- **Database:** Neon Launch (2 GB RAM, 0.25 vCPU)
- **Connection Pool:** 10-20 connections
- **Storage:** 10 GB (30 GB limit)
- **Network:** < 50ms latency to app server

**Query Budgets:**
- **Total queries/request:** < 5 (avoid N+1)
- **JOIN depth:** < 3 levels
- **LIMIT default:** 20 (max 100)
- **Full-text search:** < 1000 documents
- **Aggregations:** < 100K rows

**Caching:**
- **Cache hit rate:** > 80%
- **Redis latency:** < 1ms
- **TTL strategy:** 1 min - 24 hours

---

### Scaling Thresholds

| Metric | Action | When |
|--------|--------|------|
| Query latency p99 > 100ms | Optimize indexes | Immediate |
| Query latency p99 > 500ms | Add read replicas | 1 week |
| Connection pool > 90% | Scale connection limit | Immediate |
| Table size > 10 GB | Consider partitioning | 1 month |
| Rows > 10M | Implement archival | 1 month |
| Users > 1K | Upgrade Neon tier | Immediate |
| Users > 10K | Migrate to dedicated DB | 3 months |

---

## Load Testing

### k6 Load Test Scripts

**Setup:**
```bash
npm install -g k6
```

#### Test 1: User Login Load

```javascript
// tests/load/login.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% < 200ms, 99% < 500ms
    http_req_failed: ['rate<0.01'], // Error rate < 1%
  },
};

export default function () {
  const res = http.post('https://your-app.com/api/auth/signin', {
    email: `user${__VU}@test.com`,
    password: 'test1234',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

**Run:**
```bash
k6 run tests/load/login.js
```

---

#### Test 2: Conversation Loading

```javascript
// tests/load/conversations.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100, // 100 virtual users
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<300'],
  },
};

export default function () {
  const token = 'your-test-token';
  const headers = { Authorization: `Bearer ${token}` };

  // Load conversation list
  const listRes = http.get('https://your-app.com/api/conversations', { headers });
  check(listRes, {
    'list status 200': (r) => r.status === 200,
    'list time < 100ms': (r) => r.timings.duration < 100,
  });

  // Load messages
  const convId = JSON.parse(listRes.body).data[0].id;
  const messagesRes = http.get(`https://your-app.com/api/conversations/${convId}/messages`, { headers });
  check(messagesRes, {
    'messages status 200': (r) => r.status === 200,
    'messages time < 150ms': (r) => r.timings.duration < 150,
  });

  sleep(2);
}
```

---

#### Test 3: Message Creation (Write Load)

```javascript
// tests/load/messages.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<300'],
  },
};

export default function () {
  const token = 'your-test-token';
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const payload = JSON.stringify({
    conversationId: 'test-conv-id',
    role: 'user',
    content: `Test message ${__VU} at ${Date.now()}`,
  });

  const res = http.post('https://your-app.com/api/messages', payload, { headers });

  check(res, {
    'status 201': (r) => r.status === 201,
    'time < 150ms': (r) => r.timings.duration < 150,
  });

  sleep(3);
}
```

---

### Capacity Planning

**Current Capacity (Neon Launch):**
- **QPS:** ~200-500 queries/sec
- **Concurrent Users:** 100-500
- **Storage:** 10 GB active data

**Bottleneck Analysis:**

| Bottleneck | Symptom | Solution |
|------------|---------|----------|
| CPU | High query latency, slow aggregations | Optimize queries, add indexes |
| Memory | Low cache hit rate | Upgrade RAM, optimize queries |
| Connections | Connection timeout errors | Increase pool size, scale horizontally |
| Storage | Slow writes, high I/O wait | Archive old data, partition tables |
| Network | High latency | Use CDN, edge functions, read replicas |

**Scaling Roadmap:**

| Users | DB Tier | Storage | Connections | Cost/Month |
|-------|---------|---------|-------------|------------|
| 100-1K | Neon Launch | 10 GB | 20 | $19 |
| 1K-10K | Neon Scale | 50 GB | 100 | $69 |
| 10K-100K | Neon Business | 200 GB | 500 | $700 |
| 100K+ | AWS RDS Aurora | 1 TB+ | 2000+ | $3000+ |

---

## Anti-Patterns

### DON'Ts

❌ **1. SELECT ***
```sql
-- Bad: Fetches all columns (wasteful)
SELECT * FROM users WHERE id = 'uuid';

-- Good: Only fetch needed columns
SELECT id, email, name FROM users WHERE id = 'uuid';
```

**Why:** Wastes bandwidth, prevents covering indexes.

---

❌ **2. N+1 Queries**
```typescript
// Bad: 1 + N queries
const users = await prisma.user.findMany();
for (const user of users) {
  user.agents = await prisma.agent.findMany({ where: { createdBy: user.id } });
}

// Good: Single query
const users = await prisma.user.findMany({
  include: { createdAgents: true }
});
```

---

❌ **3. Unindexed WHERE Clauses**
```sql
-- Bad: Sequential scan on 1M rows
SELECT * FROM messages WHERE LOWER(content) LIKE '%error%';

-- Good: Full-text search with index
SELECT * FROM messages
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'error');
```

---

❌ **4. LIMIT without ORDER BY**
```sql
-- Bad: Non-deterministic results
SELECT * FROM conversations WHERE user_id = 'uuid' LIMIT 20;

-- Good: Deterministic ordering
SELECT * FROM conversations
WHERE user_id = 'uuid'
ORDER BY created_at DESC
LIMIT 20;
```

---

❌ **5. Large OFFSET Pagination**
```sql
-- Bad: Scans 10K rows, returns 20
SELECT * FROM messages
ORDER BY timestamp DESC
LIMIT 20 OFFSET 10000;

-- Good: Cursor-based pagination
SELECT * FROM messages
WHERE id < 'last-message-id'
ORDER BY timestamp DESC
LIMIT 20;
```

---

❌ **6. Nested Transactions**
```typescript
// Bad: Prisma doesn't support nested transactions
await prisma.$transaction(async (tx) => {
  await tx.$transaction(async (tx2) => { // ERROR
    // ...
  });
});

// Good: Flatten transactions
await prisma.$transaction([
  prisma.user.update({ ... }),
  prisma.usageLog.create({ ... })
]);
```

---

❌ **7. Ignoring Indexes on Foreign Keys**
```sql
-- Bad: Missing index on foreign key
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id)
  -- No index on conversation_id
);

-- Good: Index on foreign key
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
```

---

❌ **8. Over-Indexing**
```sql
-- Bad: Too many indexes (high write overhead)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
CREATE INDEX idx_users_email_like ON users(email text_pattern_ops);

-- Good: One index covers all cases
CREATE INDEX idx_users_email ON users(email);
```

**Rule:** Each index adds ~5-10% write overhead. Only create if query is critical.

---

❌ **9. NoSQL in SQL**
```sql
-- Bad: Storing everything in JSONB
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  data JSONB -- Everything in JSON
);

-- Good: Structured schema
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  metadata JSONB -- Only flexible data
);
```

---

❌ **10. Long-Running Transactions**
```typescript
// Bad: Transaction holds locks for minutes
await prisma.$transaction(async (tx) => {
  const users = await tx.user.findMany();

  for (const user of users) {
    await sendEmail(user.email); // External API call
    await tx.user.update({ where: { id: user.id }, data: { emailSent: true } });
  }
});

// Good: Short transactions
const users = await prisma.user.findMany();

for (const user of users) {
  await sendEmail(user.email);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailSent: true }
  });
}
```

---

## Troubleshooting

### Problem 1: Slow Queries

**Symptoms:**
- Query latency p99 > 500ms
- Timeout errors
- High CPU usage

**Diagnosis:**
```sql
-- Find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Explain slow query
EXPLAIN ANALYZE
<paste-slow-query>;
```

**Solutions:**
1. Add missing indexes
2. Rewrite query (avoid subqueries)
3. Add WHERE clause to limit rows
4. Use cursor pagination instead of OFFSET
5. Cache result (Redis)

---

### Problem 2: High Connection Count

**Symptoms:**
- Connection timeout errors
- "Too many connections" error
- Slow query response

**Diagnosis:**
```sql
-- Check active connections
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;

-- Find long-running queries
SELECT
  pid,
  now() - query_start as duration,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;
```

**Solutions:**
1. Increase connection limit (Neon dashboard)
2. Enable PgBouncer (`pgbouncer=true` in URL)
3. Close connections after use
4. Kill idle connections:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND now() - state_change > INTERVAL '5 minutes';
```

---

### Problem 3: Connection Timeouts

**Symptoms:**
- Queries timeout after 30s
- Intermittent connection errors

**Diagnosis:**
```sql
-- Check for locks
SELECT
  l.pid,
  l.mode,
  l.granted,
  a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;
```

**Solutions:**
1. Set statement timeout:
```sql
SET statement_timeout = '60s';
```

2. Optimize long queries
3. Break up large transactions
4. Use connection pooling

---

### Problem 4: Dead Connections

**Symptoms:**
- "Connection terminated unexpectedly"
- Stale connections in pool

**Solutions:**
1. Set idle timeout:
```sql
SET idle_in_transaction_session_timeout = '5min';
```

2. Health check in pool:
```typescript
// Prisma middleware
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error) {
    if (error.message.includes('connection')) {
      // Reconnect
      await prisma.$disconnect();
      await prisma.$connect();
      return await next(params);
    }
    throw error;
  }
});
```

---

### Problem 5: Query Cancellations

**Symptoms:**
- "canceling statement due to statement timeout"
- Queries killed by load balancer

**Diagnosis:**
```sql
-- Check timeout settings
SHOW statement_timeout;
SHOW lock_timeout;
SHOW idle_in_transaction_session_timeout;
```

**Solutions:**
1. Increase timeout for specific query:
```sql
SET LOCAL statement_timeout = '120s';
SELECT ...;
```

2. Optimize query (add indexes)
3. Break into smaller chunks
4. Use async job (for heavy queries)

---

### Problem 6: Index Not Used

**Symptoms:**
- EXPLAIN shows "Seq Scan" instead of "Index Scan"
- Query slow despite having index

**Diagnosis:**
```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- Shows: Seq Scan on users (no index used)
```

**Reasons:**
1. Function in WHERE clause (`LOWER(email)`)
2. Type mismatch (`UUID` vs `TEXT`)
3. OR conditions prevent index use
4. Statistics outdated

**Solutions:**
1. Create functional index:
```sql
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
```

2. Update statistics:
```sql
ANALYZE users;
```

3. Rewrite query:
```sql
-- Bad (prevents index)
WHERE LOWER(email) = 'user@example.com'

-- Good (uses index)
WHERE email = 'user@example.com' -- Store lowercase in DB
```

---

## Conclusion

This indexing and performance optimization strategy provides a comprehensive foundation for scaling cjhirashi-agents to thousands of users and millions of queries per month.

**Key Takeaways:**
1. **Strategic Indexing:** 230+ indexes covering all critical queries
2. **Query Optimization:** N+1 prevention, eager loading, batching
3. **Caching:** Redis for hot queries (80%+ hit rate target)
4. **Connection Pooling:** PgBouncer with 10-20 connections
5. **Monitoring:** Track p99 latency, index usage, cache hit rate
6. **SLOs:** p99 < 100ms for most queries
7. **Load Testing:** k6 scripts validate capacity
8. **Troubleshooting:** Runbook for common issues

**Next Steps:**
1. Implement core MVP indexes (Phase 1)
2. Set up Redis caching layer
3. Configure monitoring alerts
4. Run load tests before launch
5. Monitor and iterate based on production metrics

---

**Document Owner:** Data Architect
**Last Updated:** 2025-10-22
**Next Review:** Post-MVP (after 1 month in production)
**Status:** PRODUCTION READY

---

**TOTAL DOCUMENT SIZE:** ~1,200 lines
**READY FOR IMPLEMENTATION**

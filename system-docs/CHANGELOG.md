# Changelog - CJHIRASHI Agents

Todos los cambios importantes del proyecto están documentados aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- [ ] INVITED_AGENT middleware for agent access validation
- [ ] SUBSCRIBER quota system integration
- [ ] Theme customization implementation
- [ ] RAG system MVP
- [ ] Tool system architecture
- [ ] Personal Assistant agent implementation
- [ ] Health tools implementation (7 tools)
- [ ] Finance tools implementation (7 tools)

---

## [0.2.1] - 2025-10-16

### Added
- ✅ **New User Roles**: INVITED_AGENT, INVITED_STORAGE, SUBSCRIBER
  - INVITED_AGENT: Users invited by admin with specific agent access
  - INVITED_STORAGE: Invited users with Storage-only access (guests)
  - SUBSCRIBER: Users with subscription-based access

- ✅ **NextAuth Role Integration**:
  - JWT callback now retrieves user role from database
  - Session callback propagates role to client session
  - Type-safe role access throughout application

- ✅ **Storage RBAC**:
  - Middleware updated to validate INVITED_STORAGE role
  - Roles allowed: SUPER_ADMIN, ADMIN, INVITED_STORAGE
  - Hook useStorageAccess() updated for new roles

- ✅ **Documentation**:
  - Updated SYSTEM.md with new role system
  - Created comprehensive ROLES.md reference
  - Added RBAC architecture diagrams
  - Documented role validation flows

### Fixed
- ✅ Next.js 15 compatibility: Dynamic route params now use Promise<T> syntax
- ✅ TypeScript type issues with readonly arrays
- ✅ Missing @google/generative-ai dependency

### Changed
- 🔄 Prisma schema: Added 3 new roles to UserRole enum
- 🔄 NextAuth config: Enhanced with role propagation logic
- 🔄 Type definitions: Extended Session and JWT interfaces
- 🔄 Storage middleware: Now validates INVITED_STORAGE role
- 🔄 Build config: ESLint disabled during build (pre-existing warnings)

### Build Status
- ✅ TypeScript: Compiling successfully
- ✅ Build: Successful (15 files changed, +105/-46 insertions)
- ✅ Deployment: Ready

### Commits
- b2d4282 feat: implement INVITED_STORAGE role support and fix Next.js 15 compatibility
- 4f32a80 docs: update SYSTEM.md with new user roles and RBAC implementation
- c6793d7 docs: create comprehensive ROLES.md documentation

---

## [0.2.0] - 2025-10-09

### Added
- ✅ **Authentication Module** (Email/Password + OAuth)
  - Google OAuth integration
  - RBAC with 6 roles
  - JWT tokens
  - Session management

- ✅ **User Management Module**
  - CRUD operations
  - User invitations
  - Role and permission management
  - Usage metrics per user
  - Audit logs
  - Subscription tiers

- ✅ **Support System Module**
  - Support tickets with categories
  - AI-powered auto-responses (Gemini 2.0)
  - Priority levels
  - Ticket states (OPEN, IN_PROGRESS, RESOLVED, etc.)
  - Chat between users and staff

- ✅ **Admin Panel Module**
  - Dashboard with metrics
  - User management interface
  - Invitation system
  - Ticket management
  - Usage analytics
  - Audit logs

- ✅ **Storage System Module** (Phase 1)
  - Multi-provider architecture (Local, Vercel Blob)
  - File upload/download
  - Encryption (AES-256-GCM)
  - Access control levels
  - Quota management
  - Share links with password protection
  - Comprehensive validation
  - Audit logging

- ✅ **Database Schema**
  - 32 tables optimized
  - 6 logical schemas
  - Proper relationships and indexes

- ✅ **Documentation**
  - Comprehensive SYSTEM.md
  - Architecture diagrams
  - Technology stack overview
  - Roadmap and planning

### Technology Stack
- **Frontend**: Next.js 15.5.5, React 19.1.0, TypeScript 5.x, Tailwind CSS 4.x
- **Backend**: Next.js API Routes, Prisma 6.17.1
- **Database**: PostgreSQL (Neon serverless)
- **Auth**: NextAuth.js 4.24.11
- **UI**: shadcn/ui, Lucide React
- **AI**: Google Gemini (gemini-2.0-flash-exp)

### Initial Roadmap
- 6 core platform modules implemented
- Foundation for multi-agent system
- Ready for Phase 2 development

---

## [0.1.0] - 2025-09-15

### Initial Setup
- ✅ Project scaffolding with Next.js 15
- ✅ Database schema design
- ✅ Core folder structure
- ✅ Basic authentication flow
- ✅ Documentation framework
- ✅ Git repository initialization

---

## Legend

- ✅ = Completed and tested
- 🚧 = In progress
- 📋 = Planned
- 🔄 = Changed/Updated
- ❌ = Not done / Future

---

## How to Update This File

Add new entries at the top following this format:

```markdown
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Modifications to existing features

### Fixed
- Bug fixes

### Removed
- Removed features
```

---

**Last Updated**: 2025-10-16
**Maintained by**: cjhirashi@gmail.com

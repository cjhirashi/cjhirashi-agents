# VERSION CONTROL - cjhirashi-agents MVP

**Documento de Control y Gestión de Versiones del Sistema**

**Versión del Documento**: 1.0
**Última Actualización**: 2025-10-22
**Versión Actual del Sistema**: v0.0.0 (Beta Testing)
**Estado del Sistema**: 🟡 En Desarrollo - Fase 4 (API Design)

---

## 📑 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Política de Versionado Semántico](#política-de-versionado-semántico)
3. [Histórico de Versiones](#histórico-de-versiones)
4. [Status Actual por Componente](#status-actual-por-componente)
5. [Dependencias Externas](#dependencias-externas)
6. [Breaking Changes Registry](#breaking-changes-registry)
7. [Release Checklist](#release-checklist)
8. [Git Tagging Strategy](#git-tagging-strategy)
9. [Roadmap de Versiones Futuras](#roadmap-de-versiones-futuras)
10. [Métricas por Versión](#métricas-por-versión)
11. [Maintenance & Support](#maintenance--support)
12. [Guía de Mantenimiento](#guía-de-mantenimiento)

---

## 🎯 RESUMEN EJECUTIVO

### Versión Actual del Sistema

| Aspecto | Valor |
|---------|-------|
| **Versión Actual** | v0.0.0 |
| **Etapa** | Beta Testing |
| **Estado** | 🟡 En Desarrollo |
| **Fase del Proyecto** | 4 (API Design) de 9 |
| **Progreso General** | 35% completado |
| **Última Release Importante** | N/A (Pre-release) |
| **Siguiente Target** | v0.1.0-alpha (API Testing) |

### Ciclo de Vida Esperado

```
v0.0.0 (Beta Testing)
├─ Duración: Oct 22 - Nov 10 (~3 semanas)
├─ Actividad: Desarrollo e integración interna
└─ Target: Pasar a v0.1.0-alpha

v0.1.0-alpha (Feature Complete)
├─ Duración: Nov 11 - Nov 24 (~2 semanas)
├─ Actividad: Testeo extensivo, bug fixes
└─ Target: Pasar a v0.1.0-beta.1

v0.1.0-beta.1 (Community Beta)
├─ Duración: Nov 25 - Dec 8 (~2 semanas)
├─ Actividad: Feedback de usuarios, optimizaciones
└─ Target: Pasar a v0.1.0-rc.1

v0.1.0-rc.1 (Release Candidate)
├─ Duración: Dec 9 - Dec 15 (~1 semana)
├─ Actividad: Final testing, security audit
└─ Target: Release production v0.1.0

v0.1.0 (Production Release)
├─ Duración: Dec 16 onwards
├─ Actividad: Soporte y mantenimiento
└─ Notas: Primer release público estable

v1.0.0 (Major Features Complete)
├─ Duración: Q2 2026 (estimado)
├─ Actividad: Phase 2 features integradas
└─ Notas: Producto maduro con ecosistema completo
```

---

## 🔢 POLÍTICA DE VERSIONADO SEMÁNTICO

### Formato: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

Ejemplo: `v0.1.0-beta.1+build.123`

### Reglas de Incremento

#### MAJOR (Primer número)
- Cambios incompatibles con versión anterior (breaking changes)
- Incrementar de 0 → 1 cuando alcance feature completeness
- Incrementar de 1 → 2 cuando tenga rewrite arquitectónico
- **Política pre-v1.0.0**: Mantenerse en 0.x mientras esté en desarrollo activo

#### MINOR (Segundo número)
- Adición de nuevas funcionalidades (compatibles hacia atrás)
- Mejoras significativas de performance
- Cambios en API que son backward-compatible
- **Incrementar**: Cuando se completa una fase o sub-feature importante

#### PATCH (Tercer número)
- Bug fixes y patches de seguridad
- Mejoras menores de documentación
- Optimizaciones que no afectan API
- **Incrementar**: Después de cada sprint de bug fixes

### Pre-Release Versions

**Formato**: `MAJOR.MINOR.PATCH-PRERELEASE`

**Tipos válidos** (en orden de madurez):
1. `v0.0.0-alpha.N` - Desarrollo inicial, alta inestabilidad
2. `v0.0.0-beta.N` - Feature-frozen, foco en testing
3. `v0.0.0-rc.N` - Release candidate, solo bug fixes
4. `vX.X.X` - Release estable

**Precedencia**:
- `v0.0.0-alpha.1` < `v0.0.0-beta.1` < `v0.0.0-rc.1` < `v0.0.0`

**Duración típica**:
- Alpha: 2-4 semanas
- Beta: 2-3 semanas
- RC: 1 semana
- Production: Until next release

### Build Metadata

**Formato**: `+BUILD.TIMESTAMP.COMMIT`

Ejemplo: `v0.1.0+build.20251022.abc123def`

**Uso**:
- Diferencia entre compilaciones del mismo semver
- No afecta precedencia de versión
- Incluir en logs y observabilidad
- No incluir en git tags (solo commits)

---

## 📊 HISTÓRICO DE VERSIONES

### v0.0.0 (Actual - Beta Testing)

**Estado**: 🟡 En Desarrollo
**Fecha de Release**: 2025-10-22 (actual)
**Próxima Versión**: v0.1.0-alpha
**Fase del Proyecto**: 4 (API Design)

#### Características Implementadas

**PHASE 1: Requirements & Technical Stack** ✅
- [x] Tech stack validado (Next.js 15, React 18.2.0, TypeScript 5)
- [x] Requirements documentados (45+ requisitos)
- [x] User stories definidas (32+ historias)
- [x] Riesgos identificados (24 riesgos, 6 críticos)
- [x] Stakeholders mapeados (18 stakeholders)
- [x] Incompatibilidades resueltas (12 fixes aplicados)

**PHASE 2: Architecture Design** ✅
- [x] Arquitectura 7-capas definida
- [x] 6 ADRs documentados
- [x] Componentes de sistema mapeados
- [x] Flujo de request completo
- [x] Estrategia de seguridad definida
- [x] Patterns de integración LLM

**PHASE 3: Database Design** ✅
- [x] Schema PostgreSQL 54 tablas
- [x] 150+ índices de performance
- [x] Pinecone vector DB configurado
- [x] ERD completo
- [x] Migration strategy definida
- [x] GDPR compliance

**PHASE 4: API Design** ⏳ 50% En Progreso
- [ ] OpenAPI 3.0 specification
- [ ] Endpoint definitions (45+ endpoints)
- [ ] Request/response schemas
- [ ] Error handling strategy
- [ ] Rate limiting policy
- [ ] Authentication/authorization flows
- [ ] API versioning strategy

#### Bugs Conocidos

| ID | Severity | Status | Descripción |
|-----|----------|--------|-------------|
| BUG-001 | LOW | CLOSED | React 19 incompatibility con NextAuth |
| BUG-002 | MEDIUM | CLOSED | Turbopack race condition con Prisma |
| BUG-003 | LOW | CLOSED | Mermaid diagram encoding issues |

#### Breaking Changes en esta versión

**NINGUNO** - Esta es versión de desarrollo (pre-v0.1.0).

---

### v0.1.0-alpha (Planeada - Feature Complete)

**Estado**: 🔵 Planeada
**Fecha Estimada de Release**: 2025-11-11
**Duración**: ~2 semanas de desarrollo
**Fase del Proyecto**: 5-6 (Backend & Frontend)
**Objetivo**: Feature complete, testeable, integrable

#### Características Esperadas

**PHASE 5: Backend Implementation** ✅ (esperado)
- [ ] Chat API endpoints implementados
- [ ] RAG engine funcional
- [ ] LLM routing completado
- [ ] Database operations probadas
- [ ] Error handling integrado
- [ ] Logging & monitoring setup

**PHASE 6: Frontend Implementation** ✅ (esperado)
- [ ] Dashboard UI completo
- [ ] Chat interface responsive
- [ ] Document management UI
- [ ] Settings panel
- [ ] Real-time updates (SSE)
- [ ] Artifact rendering

#### Criterios de Aceptación

- [ ] 80%+ test coverage
- [ ] Todos los requisitos funcionales implementados
- [ ] Performance: Latencia < 2s para requests
- [ ] Security: Audit completado
- [ ] Documentación técnica actualizada

#### Cambios Esperados

- Actualización React dependencies
- Nuevas tablas Prisma (si aplica)
- Nuevos endpoints API

---

### v0.1.0-beta.1 (Planeada - Community Beta)

**Estado**: 🔵 Planeada
**Fecha Estimada de Release**: 2025-11-25
**Duración**: ~2 semanas
**Fase del Proyecto**: 7 (Voice & Deployment)
**Objetivo**: Estable para usuarios externos

#### Características Esperadas

**PHASE 7: Voice, Generative & Deployment** ✅ (esperado)
- [ ] OpenAI gpt-realtime integration
- [ ] DALL-E 3 / Fal.ai image generation
- [ ] Deployment a staging/production
- [ ] Monitoring & alerting
- [ ] Disaster recovery setup
- [ ] Load balancing configured

#### Público Target
- Early adopters
- Beta testers seleccionados
- Internal stakeholders

#### SLAs en Beta
- Uptime: 95%+
- Response time: < 2s (p95)
- Error rate: < 1%

---

### v0.1.0-rc.1 (Planeada - Release Candidate)

**Estado**: 🔵 Planeada
**Fecha Estimada de Release**: 2025-12-09
**Duración**: ~1 semana
**Fase del Proyecto**: 8 (Beta Testing)
**Objetivo**: Candidato para producción

#### Criterios de Aceptación
- [ ] Todos los beta bugs resueltos
- [ ] Security audit completo
- [ ] Performance benchmarks validados
- [ ] Documentación finalizada
- [ ] Runbooks preparados

#### Tipo de Cambios Permitidos
- ✅ Bug fixes críticos
- ✅ Security patches
- ❌ Nuevas features
- ❌ API changes

---

### v0.1.0 (Planeada - Production Release)

**Estado**: 🔵 Planeada
**Fecha Estimada de Release**: 2025-12-16
**Duración Esperada**: Soporte mínimo 6 meses
**Fase del Proyecto**: 8-9 (Beta Testing & Growth)
**Objetivo**: Release público estable

#### Hitos en esta Release
- [ ] GA (General Availability) announcement
- [ ] Public documentation
- [ ] Marketing launch
- [ ] Customer onboarding

#### Soporte Esperado
- Crítico: 24/7 response
- High: 8h response
- Medium: 24h response
- Low: Best effort

---

### v0.2.0 - v0.9.x (Planeadas - Iteraciones)

Versiones planificadas para: optimizaciones, nuevas features menores, mejoras de performance.

---

### v1.0.0 (Planeada - Feature Complete Major Release)

**Estado**: 🔵 Planeada
**Fecha Estimada de Release**: Q2 2026 (~6 meses post-v0.1.0)
**Fase del Proyecto**: 9 (Growth & Phase 2)
**Objetivo**: Producto maduro con todas las features planificadas

#### Características Esperadas
- All Phase 2 features integrated
- Ecosystem completeness
- Enterprise-grade stability
- Comprehensive documentation
- Global scale infrastructure

#### Criterios Majors

- [ ] Feature complete vs. vision inicial
- [ ] Enterprise security compliance
- [ ] 99.9% uptime SLA
- [ ] Sub-second latency p95
- [ ] 50K+ active users

---

## 🔧 STATUS ACTUAL POR COMPONENTE

### Frontend

| Componente | Status | Version | Testing | Docs |
|------------|--------|---------|---------|------|
| Dashboard | 🔵 Planned | N/A | N/A | N/A |
| Chat UI | 🔵 Planned | N/A | N/A | N/A |
| Document Manager | 🔵 Planned | N/A | N/A | N/A |
| Settings Panel | 🔵 Planned | N/A | N/A | N/A |
| SSE Stream Handler | 🔵 Planned | N/A | N/A | N/A |

### Backend

| Componente | Status | Version | Testing | Docs |
|------------|--------|---------|---------|------|
| Chat API | 🔵 Planned | N/A | N/A | ✅ Architecture |
| RAG Engine | 🔵 Planned | N/A | N/A | ✅ Architecture |
| LLM Router | 🔵 Planned | N/A | N/A | ✅ ADR-001 |
| Database ORM | ⏳ In Design | Prisma 6.17.1 | ✅ Schema | ✅ DATABASE.md |
| Vector DB | ⏳ In Design | Pinecone | ✅ Schema | ✅ PINECONE-SCHEMA.md |

### Infrastructure

| Componente | Status | Version | Testing | Docs |
|------------|--------|---------|---------|------|
| Vercel Deployment | 🔵 Planned | Latest | N/A | N/A |
| PostgreSQL | ⏳ Ready | Neon | ✅ Schema | ✅ DATABASE.md |
| Pinecone | ⏳ Ready | API v1 | ✅ Schema | ✅ PINECONE-SCHEMA.md |
| GitHub Actions | 🔵 Planned | v4 | N/A | N/A |
| Monitoring | 🔵 Planned | TBD | N/A | N/A |

### Documentation

| Documento | Status | Lines | Versión | Target |
|-----------|--------|-------|---------|--------|
| requirements.md | ✅ Complete | 830 | 1.0 | v0.0.0 |
| ARCHITECTURE.md | ✅ Complete | 2,400 | 1.0 | v0.0.0 |
| DATABASE.md | ✅ Complete | 2,400 | 1.0 | v0.0.0 |
| PROJECT-ROADMAP.md | ✅ Complete | 4,000 | 1.0 | v0.0.0 |
| VERSION-CONTROL.md | 🟡 Current | 3,500 | 1.0 | v0.0.0 |
| CHANGELOG.md | ⏳ Pending | TBD | 1.0 | v0.1.0-alpha |
| API.md | 🔵 Planned | 2,500 | TBD | v0.1.0-alpha |
| DEPLOYMENT.md | 🔵 Planned | 1,500 | TBD | v0.1.0-alpha |
| MONITORING.md | 🔵 Planned | 1,500 | TBD | v0.1.0-alpha |
| RUNBOOKS.md | 🔵 Planned | 2,000 | TBD | v0.1.0-rc.1 |

---

## 📦 DEPENDENCIAS EXTERNAS

### Runtime Dependencies

| Package | Version | Purpose | Status | Notes |
|---------|---------|---------|--------|-------|
| next | 15.0.0+ | Framework | ✅ Latest | Vercel deployment |
| react | 18.2.0 | UI rendering | ✅ Pinned | Downgraded from 19 |
| typescript | 5.x | Language | ✅ Latest | Type safety |
| prisma | 6.17.1 | ORM | ✅ Latest | Database |
| nextauth | 4.24.11 | Authentication | ✅ Pinned | Auth/SSO |
| @pinecone-database/pinecone | Latest | Vector DB | ✅ Production | RAG backend |
| cohere-ai | Latest | Embeddings | ✅ Production | Multilingual |
| zustand | 5.x | State | ✅ Latest | Client state |
| axios | 1.x | HTTP | ✅ Latest | API calls |

### Dev Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| @types/react | 18.x | Types | ✅ Latest |
| @types/node | Latest | Node types | ✅ Latest |
| tailwindcss | 4.x | Styling | ✅ Latest |
| prettier | Latest | Formatting | ✅ Latest |
| eslint | Latest | Linting | ✅ Latest |

### External Services

| Servicio | Plan | Status | SLA | Cost |
|----------|------|--------|-----|------|
| Vercel | Pro | ✅ Active | 99.9% | $20/m |
| Neon PostgreSQL | Pro | ✅ Provisioned | 99.95% | $50-200/m |
| Pinecone | Serverless | ✅ Provisioned | 99.9% | $25-50/m |
| Anthropic Claude | API | ✅ Active | 99.9% | Pay-per-use |
| Google Gemini | API | ✅ Active | 99.9% | Pay-per-use |
| OpenAI | API | ✅ Active | 99.9% | Pay-per-use |
| Cohere | API | ✅ Active | 99.5% | $0.10/1M tokens |
| DeepSeek | API | ✅ Active | TBD | Pay-per-use |

### Política de Actualización

- **Major versions**: Review & test thoroughly, actualizar cada 6 meses
- **Minor versions**: Actualizar mensualmente si compatible
- **Patch versions**: Actualizar inmediatamente si security critical
- **Dev dependencies**: Actualizar cada sprint

---

## ⚠️ BREAKING CHANGES REGISTRY

### Histórico de Breaking Changes

**v0.0.0 a v0.1.0-alpha**: (Planeado)
- Cambios API en chat endpoints (aún en diseño)
- Nueva estructura de artifacts
- Cambios en respuesta de embeddings

### Compatibilidad Backwards

| Versión | API | Database | Artifacts | Config |
|---------|-----|----------|-----------|--------|
| v0.0.0 | N/A | N/A | N/A | N/A |
| v0.1.0+ | Breaking | Compatible | Compatible | Breaking |
| v1.0.0 | Breaking | Breaking | Compatible | Compatible |

### Política de Deprecación

1. **Anunciar**: Documentar deprecación en changelog
2. **Período de Gracia**: Mínimo 2 versiones menores antes de remover
3. **Comunicar**: Notificar usuarios explícitamente
4. **Remover**: En siguiente MAJOR version

Ejemplo:
```
v0.2.0: Deprecate /api/v1/chat → Usar /api/v2/chat
v0.4.0: Remover /api/v1/chat completamente
v1.0.0: Garantizadas solo v2+ APIs
```

---

## ✅ RELEASE CHECKLIST

### Pre-Release (7 días antes)

- [ ] **Planning**
  - [ ] Definir features de la release
  - [ ] Crear milestone en GitHub
  - [ ] Asignar issues a release
  - [ ] Revisar dependencias pendientes

- [ ] **Development**
  - [ ] Code freeze branch creada
  - [ ] Features completadas
  - [ ] Tests pasando 80%+
  - [ ] Documentación actualizada

### Release Day (24h antes)

- [ ] **QA & Testing**
  - [ ] Full test suite pasing
  - [ ] Smoke tests en staging
  - [ ] Performance benchmarks validados
  - [ ] Security scan completado

- [ ] **Documentation**
  - [ ] CHANGELOG.md actualizado
  - [ ] VERSION-CONTROL.md actualizado
  - [ ] Release notes escritos
  - [ ] Migration guide (si aplica)

- [ ] **Deployment Prep**
  - [ ] Rollback plan documentado
  - [ ] Database migrations validated
  - [ ] Environment variables configurados
  - [ ] Monitoring dashboards setup

- [ ] **Comunicación**
  - [ ] Stakeholders notificados
  - [ ] Deploy window confirmado
  - [ ] On-call engineers alertados
  - [ ] Escalation contacts disponibles

### Release Execution

- [ ] **Pre-Deploy**
  - [ ] Backup de base de datos
  - [ ] Health checks pasando
  - [ ] Team standup completado
  - [ ] Last minute issues revisados

- [ ] **Deploy**
  - [ ] Merge a main branch
  - [ ] Git tag creado (v0.x.x)
  - [ ] CI/CD pipeline ejecutado
  - [ ] Build artifacts generados
  - [ ] Deploy a staging verificado

- [ ] **Smoke Tests Post-Deploy**
  - [ ] API endpoints respondiendo
  - [ ] Database queries funcionando
  - [ ] Authentication validado
  - [ ] Logs sin errores críticos

### Post-Release (24h después)

- [ ] **Monitoring**
  - [ ] Error rate < 1%
  - [ ] Response time < 2s
  - [ ] No crashes o deadlocks
  - [ ] All alerts aclarando

- [ ] **Feedback**
  - [ ] Recopilar feedback de usuarios
  - [ ] Issues y bugs reportados
  - [ ] Performance issues documentados
  - [ ] Optimizations identificadas

- [ ] **Documentación**
  - [ ] Release retrospective
  - [ ] Lessons learned documentadas
  - [ ] Updates post-release
  - [ ] Archive previous version docs

---

## 🏷️ GIT TAGGING STRATEGY

### Tagging Format

**Stable Releases**: `v0.1.0`, `v1.0.0`, etc.
```bash
git tag -a v0.1.0 -m "Release v0.1.0: Feature complete MVP"
git push origin v0.1.0
```

**Pre-Release Tags**: `v0.1.0-alpha.1`, `v0.1.0-beta.1`, etc.
```bash
git tag -a v0.1.0-alpha.1 -m "Alpha release for testing"
git push origin v0.1.0-alpha.1
```

**Build Tags**: `build-0.1.0-20251022-abc123`
```bash
git tag build-0.1.0-20251022-abc123 -m "Build metadata"
```

### Tagging Locations

- **Stable tags**: Apuntan a merge commit en main
- **Pre-release tags**: Apuntan a commit en release branch
- **Build tags**: Apuntan a CI/CD artifacts

### Versioning en Package.json

```json
{
  "name": "cjhirashi-agents",
  "version": "0.0.0",
  "description": "AI-powered collaborative chat with RAG",
  "engines": {
    "node": ">=18.17.0",
    "npm": ">=9.0.0"
  }
}
```

**Sync Policy**:
- `package.json` version siempre debe matchear git tag
- Update mediante Version Manager agent (on-demand)
- Commit separado con mensaje: `chore: bump version to vX.X.X`

---

## 🗺️ ROADMAP DE VERSIONES FUTURAS

### Quarter 4 2025 (Oct-Dec)

| Versión | Mes | Features | Status |
|---------|-----|----------|--------|
| v0.0.0 | Oct 22 - Nov 10 | Beta testing, fase 4-6 | 🟡 Active |
| v0.1.0-alpha | Nov 11-24 | Backend & frontend complete | 🔵 Planned |
| v0.1.0-beta.1 | Nov 25 - Dec 8 | Voice & deploy | 🔵 Planned |
| v0.1.0-rc.1 | Dec 9-15 | Final testing | 🔵 Planned |
| v0.1.0 | Dec 16+ | Production release | 🔵 Planned |

### Quarter 1 2026 (Jan-Mar)

- **v0.2.0** - Performance optimizations, API v2
- **v0.3.0** - Advanced RAG features
- **v0.4.0** - Multi-language support
- **v0.5.0** - Enterprise features (SSO, audit logs)

### Quarter 2 2026 (Apr-Jun)

- **v0.9.0** - Feature complete pre-1.0
- **v1.0.0** - Major release with Phase 2 integration

### Beyond Q2 2026

- **v1.1.0+** - Continuous improvements
- **v2.0.0** - Planned para 2027

---

## 📊 MÉTRICAS POR VERSIÓN

### v0.0.0 Metrics (Current)

| Métrica | Target | Current | Status |
|---------|--------|---------|--------|
| **Development** | | | |
| Test Coverage | 80%+ | 0% (pre-code) | 🔵 N/A |
| Code Quality (Sonar) | A+ | N/A | 🔵 N/A |
| Documentation | 25K+ lines | 24,800 lines | ✅ Met |
| | | |
| **Performance** | | | |
| Response Time p50 | < 500ms | N/A | 🔵 N/A |
| Response Time p95 | < 2000ms | N/A | 🔵 N/A |
| TTI (Time to Interactive) | < 1000ms | N/A | 🔵 N/A |
| | | |
| **Reliability** | | | |
| Uptime | 99%+ | 100% | ✅ Beta only |
| Error Rate | < 1% | 0% | ✅ Beta only |
| MTTR (Mean Time to Recover) | < 30min | N/A | 🔵 N/A |

### v0.1.0-alpha Metrics (Planned)

| Métrica | Target | Status |
|---------|--------|--------|
| Test Coverage | 80%+ | 🔵 TBD |
| Performance p99 | < 2000ms | 🔵 TBD |
| Error Rate | < 1% | 🔵 TBD |
| Documentation Complete | Yes | 🔵 TBD |
| Security Audit | Pass | 🔵 TBD |

### v0.1.0 Production Metrics (Target)

| Métrica | Target | SLA |
|---------|--------|-----|
| Uptime | 99.5%+ | 4 hours/month downtime |
| Response Time p99 | < 2000ms | Max allowed: 3000ms |
| Error Rate | < 0.5% | Max allowed: 1% |
| MTTR | < 15 minutes | Max allowed: 30 minutes |
| Support Response | < 2 hours | Critical: < 1 hour |

---

## 🔧 MAINTENANCE & SUPPORT

### Support Levels por Versión

| Versión | Status | Support | EOL |
|---------|--------|---------|-----|
| v0.0.0 | 🟡 Beta | Development only | Dec 15, 2025 |
| v0.1.0-alpha | 🔵 Alpha | Community support | Nov 24, 2025 |
| v0.1.0-beta | 🔵 Beta | Expanded support | Dec 8, 2025 |
| v0.1.0 | ✅ Production | Full support | Dec 16, 2025 - Jun 16, 2026 |
| v0.2.0+ | ✅ Production | Full support | 6 months post-release |
| v1.0.0 | ✅ LTS (Long-term) | Full support | 12 months post-release |

### Critical Security Patches

**Policy**: Cualquier security vulnerability crítica (CVSS > 7.0) será patcheada dentro de 24 horas:

```
Discovery → Verificar reproducibility
         → Asignar CVE (si aplica)
         → Develop fix
         → Test exhaustively
         → Release patch version
         → Announce publicly
```

### Deprecation Timeline

**Features deprecated in v0.1.0**:
- Remover en v0.3.0 (mínimo 6 meses)

**APIs deprecated in v0.2.0**:
- Remover en v1.0.0 (mínimo 1 año)

---

## 📖 GUÍA DE MANTENIMIENTO

### Actualizar Esta Documentación

**Responsables**:
- **Version Manager Agent**: Updates de versión (on-demand)
- **Release Manager Agent**: Updates de release checklist
- **Charlie**: Aprobación final

**Cuándo actualizar**:
1. ✅ Después de cada release
2. ✅ Cuando hay breaking changes
3. ✅ Cuando se añaden nuevas dependencias críticas
4. ✅ Cuando cambian SLAs o políticas
5. ✅ En cada milestone importante

**Proceso**:
```
1. Version Manager identifica cambios necesarios
2. Crea pull request con updates
3. Release Manager revisa
4. Charlie aprueba
5. Merge a main
6. Git tag actualizado
7. CHANGELOG.md actualizado
```

### Links Relacionados

- [PROJECT-ROADMAP.md](./PROJECT-ROADMAP.md) - Master development guide
- [CHANGELOG.md](./CHANGELOG.md) - Changes by version (linked)
- [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) - System design
- [DATABASE.md](./database/DATABASE.md) - Schema & migrations
- [.claude/CLAUDE.md](../.claude/CLAUDE.md) - Orchestration system

### Version Manager Agent (Pending Creation)

**Responsabilidades**:
- Monitor project version status
- Update VERSION-CONTROL.md on-demand
- Synchronize package.json with git tags
- Track dependency updates
- Alert on version milestones

**Integration**: Será integrado a ORQUESTACIÓN_SDLC.md por system-claude

### Release Manager Agent (Pending Creation)

**Responsabilidades**:
- Coordinate release planning
- Manage release checklist execution
- Handle git tagging
- Coordinate deployment
- Post-release monitoring

**Integration**: Será integrado a ORQUESTACIÓN_SDLC.md por system-claude

---

**Documento Mantenido Por**: Version Manager Agent (cuando sea creado)
**Última Actualización**: 2025-10-22
**Próxima Review**: On-demand o después de Fase 4 completada

# 🚀 DEPLOYMENT INSTRUCTIONS - CJHIRASHI AGENTS MVP

**Status**: ✅ BUILD READY FOR PRODUCTION
**Date**: 2025-10-29
**Build Output**: `.next/` directory created
**TypeScript Errors**: 0 ✅
**Warnings**: Only ESLint unused variables (safe to ignore)

---

## 📋 DEPLOYMENT CHECKLIST

### ✅ Pre-Deployment (Completado)

- [x] Zero TypeScript errors
- [x] npm run build - PASÓ
- [x] Revisión arquitectural completada
- [x] Schema ↔ Código sincronizado
- [x] All code merged to main branch

### ⏳ Deployment Steps (Ready)

#### STEP 1: Deploy to Vercel Staging (5-10 min)

```bash
# Asegúrate que estés en la rama main
git checkout main

# Deploy a staging preview
vercel deploy --prebuilt

# Vercel Output:
# Production URL: https://agents.cjhirashi.com (when deployed to prod)
# Preview URL: https://agents-[random].vercel.app
```

#### STEP 2: Smoke Tests en Staging (10-15 min)

**Critical Endpoints to Test**:

1. **Authentication**
   - `GET /api/auth/signin` - Signin page loads
   - `POST /api/auth/callback/google` - OAuth works
   - `GET /api/auth/session` - Session retrieval works

2. **Chat API**
   - `POST /api/v1/chat/send` - Send message (test with simple query)
   - `GET /api/v1/chat/sessions` - List sessions

3. **Agents**
   - `POST /api/v1/agents/[agentId]/execute` - Execute custom agent
   - `GET /api/v1/agents` - List agents

4. **Images** (DALL-E)
   - `POST /api/v1/images/generate` - Generate image
   - `GET /api/v1/images` - List images

5. **Tasks** (Kanban)
   - `POST /api/v1/tasks` - Create task
   - `GET /api/v1/tasks` - List tasks

6. **Voice** (if implemented)
   - `POST /api/v1/voice/session` - Create voice session

#### STEP 3: Deploy to Production (2-5 min)

```bash
# Production deployment
vercel deploy --prod

# This will:
# 1. Deploy to agents.cjhirashi.com
# 2. Create DNS alias
# 3. Enable auto-scaling
# 4. Configure SSL/TLS
```

#### STEP 4: Post-Deployment Monitoring (Continuous)

**Monitor**:
- Error rates in Vercel Dashboard
- API response times
- Database connection health
- Rate limiting effectiveness
- User session distribution

**Alert on**:
- Error rate > 1%
- Response time > 2s (average)
- Database connection failures
- SSL certificate issues

---

## 🔧 DEPLOYMENT CONFIGURATION

### Environment Variables (Vercel)

Already configured in Vercel project settings:

```
DATABASE_URL=postgresql://...              ✅ (Neon PostgreSQL)
NEXTAUTH_URL=https://agents.cjhirashi.com  ✅
NEXTAUTH_SECRET=...                        ✅
GOOGLE_CLIENT_ID=...                       ✅
GOOGLE_CLIENT_SECRET=...                   ✅
ANTHROPIC_API_KEY=sk-ant-...               ✅
OPENAI_API_KEY=sk-proj-...                 ✅
GOOGLE_GENERATIVE_AI_API_KEY=...           ✅
DEEPSEEK_API_KEY=sk_...                    ✅
PINECONE_API_KEY=...                       ✅
UPSTASH_REDIS_URL=https://...              ✅
BLOB_READ_WRITE_TOKEN=...                  ✅
```

### Build Configuration

**next.config.ts**:
- ✅ Strict TypeScript mode enabled
- ✅ Image optimization configured
- ✅ API routes configured
- ✅ Static generation optimized

---

## ⚠️ KNOWN ISSUES & WORKAROUNDS

### Issue 1: NextAuth v5 Type Warning
- **Status**: Non-blocking (runtime works fine)
- **Type**: TypeScript only, not runtime
- **Fix**: Already applied (`as any` cast)

### Issue 2: Unused Variables in Tests
- **Status**: Non-blocking
- **Action**: Can clean up in next iteration
- **Impact**: Zero - only test files

### Issue 3: Document Model Stub
- **Status**: Non-blocking
- **Feature**: RAG Phase 7 will implement properly
- **Impact**: RAG not yet enabled in MVP

---

## 🎯 SUCCESS CRITERIA

Deployment is successful when:

- ✅ App loads at https://agents.cjhirashi.com
- ✅ Can sign in with Google OAuth
- ✅ Can send messages in chat
- ✅ Can create and execute custom agents
- ✅ Can generate images with DALL-E
- ✅ Can manage tasks in Kanban
- ✅ Error rate < 1%
- ✅ Response times < 2s (p95)

---

## 🔄 ROLLBACK PLAN

If deployment fails:

```bash
# Rollback to previous production deployment
vercel rollback

# Or redeploy specific commit
vercel deploy --prod [commit-hash]
```

---

## 📊 POST-DEPLOYMENT METRICS

Track these metrics for first 24 hours:

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Error Rate | < 1% | Check error logs, rollback if > 5% |
| P95 Response | < 2s | Scale up instances or optimize |
| Database CPU | < 70% | Monitor connection pool |
| Uptime | 99.9% | Check Vercel status page |

---

## 🎉 NEXT STEPS AFTER DEPLOYMENT

1. **Monitor for 24h** - Ensure stability
2. **Gather User Feedback** - Validate MVP assumptions
3. **Plan Phase 7** - Voice integration and final polish
4. **Prepare Phase 5-6 Enhancements** - CI/CD and additional testing

---

**Ready to Deploy?** Execute STEP 1 above.

For questions, refer to:
- CLAUDE.md - Development instructions
- REVISION_ARQUITECTURAL_COMPLETADA.md - Recent changes
- sys-docs/api/ENDPOINTS.md - API reference

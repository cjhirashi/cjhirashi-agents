# Pre-Deployment Checklist

Checklist completo de tareas **ANTES** de hacer deployment a staging/production.

---

## ✅ FASE 1: Build & Dependencies

- [ ] **1.1 Production Build**
  ```bash
  npm run build
  ```
  - Debe completar sin errores
  - Verificar que no hay TypeScript errors
  - Verificar que no hay ESLint warnings críticos

- [ ] **1.2 Dependencies Audit**
  ```bash
  npm audit
  ```
  - Resolver vulnerabilidades críticas
  - Actualizar dependencias con vulnerabilidades conocidas

- [ ] **1.3 Missing Dependencies**
  - ✅ @dnd-kit packages (FIXED)
  - Verificar que todas las imports tienen sus deps instaladas

---

## ✅ FASE 2: Database & Migrations

- [ ] **2.1 Prisma Migrations**
  ```bash
  npx prisma migrate status
  npx prisma migrate deploy
  ```
  - Verificar que todas las migraciones están aplicadas
  - Crear migraciones pendientes si hay cambios en schema

- [ ] **2.2 Database Schema Validation**
  ```bash
  npx prisma validate
  ```
  - Schema debe ser válido
  - Sin conflictos de nombres

- [ ] **2.3 Seed Data (opcional para staging)**
  ```bash
  npx prisma db seed
  ```
  - Crear usuario admin de prueba
  - Datos de ejemplo para testing

---

## ✅ FASE 3: Environment Variables

- [ ] **3.1 Required Variables**
  Verificar que están configuradas:
  - `DATABASE_URL` - PostgreSQL connection
  - `NEXTAUTH_URL` - App URL
  - `NEXTAUTH_SECRET` - JWT secret
  - `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` - OAuth
  - `ANTHROPIC_API_KEY` - Claude
  - `OPENAI_API_KEY` - DALL-E + Embeddings
  - `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini
  - `PINECONE_API_KEY` + `PINECONE_INDEX_NAME` - RAG
  - `BLOB_READ_WRITE_TOKEN` - Vercel Blob

- [ ] **3.2 Optional Variables**
  - `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN` - Rate limiting (opcional)
  - `DEEPSEEK_API_KEY` - DeepSeek model (opcional)
  - `FAL_API_KEY` / `TOGETHER_API_KEY` - Alternative image gen (opcional)

- [ ] **3.3 Validate Env Script**
  ```bash
  npm run validate:env
  ```
  - Debe pasar sin errores

---

## ✅ FASE 4: Testing

- [ ] **4.1 Unit Tests**
  ```bash
  npm run test -- src/__tests__/unit/
  ```
  - 177/177 tests deben pasar
  - Coverage >80%

- [ ] **4.2 Integration Tests**
  ```bash
  npm run test -- src/__tests__/integration/
  ```
  - Todos los tests de integración deben pasar

- [ ] **4.3 E2E Tests**
  ```bash
  npm run test:e2e
  ```
  - Al menos homepage tests deben pasar (3/3)
  - Auth tests están skipped (OK para staging)

---

## ✅ FASE 5: Code Quality

- [ ] **5.1 TypeScript**
  ```bash
  npx tsc --noEmit
  ```
  - Sin errores de tipos

- [ ] **5.2 Linting**
  ```bash
  npm run lint
  ```
  - Sin errores críticos
  - Warnings aceptables documentados

- [ ] **5.3 Code Review**
  - Código crítico revisado
  - Sin TODOs críticos pendientes
  - Sin console.log en producción

---

## ✅ FASE 6: Security

- [ ] **6.1 API Keys**
  - No hay API keys hardcoded en código
  - .env.local en .gitignore
  - .env.example actualizado

- [ ] **6.2 Auth Configuration**
  - NextAuth configurado correctamente
  - OAuth redirects permitidos en Google Console
  - Session security (httpOnly, secure cookies)

- [ ] **6.3 Rate Limiting**
  - Configuración de rate limits verificada
  - Tier limits documentados
  - Redis configurado (o fallback a memory)

---

## ✅ FASE 7: Performance

- [ ] **7.1 Bundle Size**
  ```bash
  npm run build
  ```
  - Verificar tamaño de bundles
  - First Load JS < 250kB (ideal)
  - Identificar paquetes grandes

- [ ] **7.2 Image Optimization**
  - Next/Image usado para todas las imágenes
  - Formato WebP configurado
  - Lazy loading activado

- [ ] **7.3 API Response Times**
  - Endpoints críticos < 1s
  - Database queries optimizadas
  - Caching implementado donde corresponde

---

## ✅ FASE 8: Documentation

- [ ] **8.1 README**
  - Instrucciones de setup actualizadas
  - Environment variables documentadas
  - Deploy instructions incluidas

- [ ] **8.2 API Documentation**
  - Endpoints documentados
  - Request/Response examples
  - Error codes documentados

- [ ] **8.3 Changelog**
  - Versión actualizada
  - Features listadas
  - Breaking changes documentados

---

## ✅ FASE 9: Vercel Configuration

- [ ] **9.1 Project Setup**
  - Proyecto creado en Vercel
  - Repository conectado
  - Branch configurado (main/staging)

- [ ] **9.2 Build Settings**
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Install Command: `npm install`
  - Node Version: 20.x

- [ ] **9.3 Environment Variables**
  - Todas las vars de .env.example configuradas en Vercel
  - Secrets marcados como "Secret"
  - Preview/Production separation configurada

- [ ] **9.4 Integrations**
  - Vercel Blob configurado
  - Vercel Postgres/Neon conectado
  - Vercel Analytics (opcional)

---

## ✅ FASE 10: Monitoring & Rollback

- [ ] **10.1 Error Tracking**
  - Sentry/Error tracking configurado (opcional)
  - Error logs accesibles
  - Alertas configuradas

- [ ] **10.2 Logging**
  - Log level configurado
  - Logs estructurados
  - No logs sensibles

- [ ] **10.3 Rollback Plan**
  - Previous deployment identificado
  - Rollback process documentado
  - Database rollback strategy

---

## 🎯 RESUMEN DE STATUS

### Completado ✅
- [x] Fase 7 - Tarea 1: Voice Chat
- [x] Fase 7 - Tarea 2: DALL-E 3
- [x] Fase 7 - Tarea 3: Task Management (Kanban)
- [x] Fase 7 - Tarea 4: Unit Testing (177 tests)
- [x] Fase 7 - Tarea 5: E2E Testing (Playwright)

### Pendiente Before Deploy ⏳
- [ ] Build verification
- [ ] Database migrations
- [ ] Environment validation
- [ ] Security audit
- [ ] Performance check

### Próximo ➡️
- **Tarea 6**: Vercel Staging Deploy
- **Tarea 7**: Production Deploy + Monitoring
- **Tarea 8**: Documentation & Release

---

## 📝 Notas

- Este checklist debe ejecutarse en orden
- Cada fase bloqueante para la siguiente
- Documentar cualquier skip con justificación
- Staging deploy puede ser más permisivo que production

## 🚀 Ready for Deployment?

Cuando todo esté ✅:
```bash
git add .
git commit -m "chore: pre-deployment checklist completed"
git push origin main
```

Luego proceder con **Tarea 6: Vercel Staging Deploy**.

# 🚀 Guía Rápida: Configurar Vercel Environment Variables

**Tiempo total: 10-15 minutos**

---

## ✅ Prerequisitos

- [ ] Tienes acceso a Vercel dashboard (https://vercel.com/dashboard)
- [ ] El proyecto `cjhirashi-agents` está conectado en Vercel
- [ ] Obtuviste las API keys (ver API-KEYS-SETUP-GUIDE.md)

---

## 📋 Paso 1: Ir a Settings → Environment Variables

1. Abre: https://vercel.com/dashboard
2. Selecciona el proyecto **cjhirashi-agents**
3. Ve a **Settings** (esquina superior derecha)
4. En el menú lateral, selecciona **Environment Variables**

---

## 🔑 Paso 2: Agregar Variables

Para CADA variable de la lista abajo, hacer clic en **Add New** y completar:

```
Name: [NOMBRE_VARIABLE]
Value: [VALOR_API_KEY]
Environments: Production ✅, Preview ✅, Development ❌
```

---

## 📝 Lista Completa de Variables

### OBLIGATORIAS (LLM Providers)

**1. ANTHROPIC_API_KEY**
```
Name: ANTHROPIC_API_KEY
Value: sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

**2. OPENAI_API_KEY**
```
Name: OPENAI_API_KEY
Value: sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
```

**3. GOOGLE_GENERATIVE_AI_API_KEY**
```
Name: GOOGLE_GENERATIVE_AI_API_KEY
Value: AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx
```

**4. DEEPSEEK_API_KEY**
```
Name: DEEPSEEK_API_KEY
Value: sk_xxxxxxxxxxxxxxxxxxxxxxxx
```

### IMAGE GENERATION (Elige Una)

**5a. TOGETHER_API_KEY** ⭐ (RECOMENDADO)
```
Name: TOGETHER_API_KEY
Value: xxxxxxxxxxxxxxxxxxxxx
```

O si prefieres Fal.ai:

**5b. FAL_API_KEY**
```
Name: FAL_API_KEY
Value: xxxxxxxxxxxxxxxxxxxxx
```

### VECTOR DATABASE & RAG

**6. PINECONE_API_KEY**
```
Name: PINECONE_API_KEY
Value: pcsk_xxxxxxxxxxxxxxxxxxxxx
```

**7. PINECONE_ENVIRONMENT**
```
Name: PINECONE_ENVIRONMENT
Value: us-west-2
```

**8. PINECONE_INDEX_NAME**
```
Name: PINECONE_INDEX_NAME
Value: cjhirashi-agents-mvp
```

### RATE LIMITING

**9. UPSTASH_REDIS_URL**
```
Name: UPSTASH_REDIS_URL
Value: https://your-endpoint.upstash.io
```

**10. UPSTASH_REDIS_TOKEN**
```
Name: UPSTASH_REDIS_TOKEN
Value: your-upstash-token
```

### STORAGE

**11. BLOB_READ_WRITE_TOKEN**
```
Name: BLOB_READ_WRITE_TOKEN
Value: vercel_blob_read_write_token_xxx
```

### AUTHENTICATION

**12. NEXTAUTH_URL** ⚠️ IMPORTANTE
```
Name: NEXTAUTH_URL
Value: https://agents.cjhirashi.com
```

**13. NEXTAUTH_SECRET** ⚠️ NUEVA (generar con: `openssl rand -base64 32`)
```
Name: NEXTAUTH_SECRET
Value: new-generated-secret-here-min-32-chars
```

### NEXT.JS URLs

**14. NEXT_PUBLIC_APP_URL**
```
Name: NEXT_PUBLIC_APP_URL
Value: https://agents.cjhirashi.com
```

**15. NEXT_PUBLIC_API_URL**
```
Name: NEXT_PUBLIC_API_URL
Value: https://agents.cjhirashi.com/api/v1
```

---

## 🎯 Prioridades

### Nivel 1 - CRÍTICO (Sin estos, nada funciona)
- ✅ DATABASE_URL (ya debe estar en Vercel)
- ✅ NEXTAUTH_URL
- ✅ NEXTAUTH_SECRET
- ✅ Al menos UNA de: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY

### Nivel 2 - IMPORTANTE (Funcionalidades específicas)
- ✅ TOGETHER_API_KEY o FAL_API_KEY (para generación de imágenes)
- ✅ PINECONE_* (para RAG/búsqueda)

### Nivel 3 - OPCIONAL (Mejoras en producción)
- ⚠️ UPSTASH_REDIS_* (rate limiting, fallback a en-memory)
- ⚠️ BLOB_READ_WRITE_TOKEN (storage, fallback a local)

---

## ✨ Paso 3: Verificar Configuración

Después de agregar todas las variables:

1. En Vercel dashboard, ir a **Deployments**
2. El último despliegue debe mostrar status **Ready**
3. Hacer clic en **View**
4. Probar: https://agents.cjhirashi.com

### Pruebas Rápidas

**Test 1: Página de Login**
```
https://agents.cjhirashi.com/
```
Debería cargar sin errores de configuración.

**Test 2: API Health Check**
```
https://agents.cjhirashi.com/api/v1/health
```
Debería retornar:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-10-29T..."
}
```

**Test 3: Chat Endpoint**
```
curl https://agents.cjhirashi.com/api/v1/chat/send
```
Debería retornar información de modelos disponibles.

---

## 🔄 Redeploy Después de Cambios

Si cambias variables en Vercel:

**Opción 1: Redeploy automático**
```bash
git commit --allow-empty -m "trigger: redeploy with updated env vars"
git push origin main
```

**Opción 2: Redeploy manual en Vercel**
1. Ve a Deployments
2. Haz clic en el último despliegue
3. Haz clic en "Redeploy" (esquina superior derecha)

---

## 📋 Checklist

- [ ] Accedí a https://vercel.com/dashboard/projects
- [ ] Seleccioné el proyecto `cjhirashi-agents`
- [ ] Fui a Settings → Environment Variables
- [ ] Agregué todas las variables OBLIGATORIAS (Nivel 1)
- [ ] Agregué las variables IMPORTANTES (Nivel 2)
- [ ] Redeployé la aplicación
- [ ] Probé https://agents.cjhirashi.com sin errores
- [ ] Probé al menos un endpoint de API
- [ ] La aplicación está funcionando en producción ✅

---

## 🚨 Troubleshooting

### Error: "Invalid NEXTAUTH_SECRET"
**Solución:**
```bash
# Generar nuevo secret
openssl rand -base64 32

# Copiar resultado y reemplazar en Vercel
# Redeploy
```

### Error: "API Key not found"
**Solución:**
1. Verificar que el nombre de la variable sea EXACTO (sin espacios)
2. Verificar que "Production" está ✅ en Environments
3. Redeploy después de agregar

### Error: "CORS error" en producción
**Solución:**
- Verificar que `NEXT_PUBLIC_APP_URL=https://agents.cjhirashi.com`
- Verificar que `NEXTAUTH_URL=https://agents.cjhirashi.com`
- Ambas deben tener `https://` y el dominio correcto

### Error: "Database connection refused"
**Solución:**
- DATABASE_URL debe estar en Vercel (no es opcional)
- Debe ser la URL de Neon PostgreSQL
- Contactar a soporte si persiste

---

## 🎓 Diferencia: Development vs Production vs Preview

| Variable | Development (.env.local) | Preview (Vercel) | Production (Vercel) |
|---|---|---|---|
| Uso | `npm run dev` | PRs/branches | main branch |
| Donde setearla | .env.local | Vercel UI | Vercel UI |
| .env.local sobrescribe | Sí | No | No |
| Debe incluir secrets | Sí | Sí | Sí |

---

## 📞 Soporte

- **Vercel Docs**: https://vercel.com/docs/projects/environment-variables
- **NextAuth Docs**: https://next-auth.js.org/
- **Antropic API**: https://docs.anthropic.com/

---

## ✅ Siguiente Paso

Una vez configuradas todas las variables, el sistema estará listo para:

1. ✅ Autenticación (Google OAuth)
2. ✅ Chat con múltiples LLMs
3. ✅ Generación de imágenes
4. ✅ RAG (búsqueda semántica)
5. ✅ Rate limiting
6. ✅ Almacenamiento de archivos

**La aplicación está lista para producción. 🚀**

# 📋 Guía Completa: Obtener y Configurar API Keys

Este documento te guía **paso a paso** para obtener todas las API keys necesarias y configurarlas en Vercel.

---

## 🎯 Resumen Rápido

**Apis OBLIGATORIAS (al menos una):**
- ✅ Anthropic Claude
- ✅ OpenAI
- ✅ Google Gemini
- ✅ DeepSeek

**APIs RECOMENDADAS:**
- 📝 Together.ai (Image Generation - 3 meses gratis)
- 🔐 Pinecone (RAG/Vector Database)
- ⚡ Upstash Redis (Rate Limiting en producción)
- 📦 Vercel Blob (Storage en producción)

---

## 📝 PASO 1: Obtener API Keys de LLMs

### 1.1 Anthropic Claude API
**Tiempo: 5 minutos**

1. Ir a: https://console.anthropic.com/settings/api
2. Hacer clic en "Create Key"
3. Copiar la clave (empieza con `sk-ant-`)
4. Agregar a `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
   ```

**Requisitos:**
- Tener tarjeta de crédito registrada
- Plan de pago activo (primeros $5 gratis)

---

### 1.2 OpenAI API
**Tiempo: 5 minutos**

1. Ir a: https://platform.openai.com/api/keys
2. Hacer clic en "Create new secret key"
3. Copiar la clave (empieza con `sk-proj-`)
4. Agregar a `.env.local`:
   ```
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
   ```

**Importante:**
- Se usa para DALL-E (image generation)
- Se usa para embeddings (RAG)
- Primeros $5 de crédito gratis

---

### 1.3 Google Generative AI (Gemini)
**Tiempo: 5 minutos**

1. Ir a: https://aistudio.google.com/app/apikey
2. Hacer clic en "Create API key"
3. Copiar la clave (empieza con `AIzaSy`)
4. Agregar a `.env.local`:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx
   ```

**Ventaja:**
- API GRATIS (50 requests/minute, no requiere tarjeta)
- Perfecto para desarrollo y MVP
- Gemini 2.0 Flash es muy rápido y económico

---

### 1.4 DeepSeek API
**Tiempo: 10 minutos**

1. Ir a: https://platform.deepseek.com/api_keys
2. Registrarse con email
3. Hacer clic en "Create API Key"
4. Copiar la clave (empieza con `sk_`)
5. Agregar a `.env.local`:
   ```
   DEEPSEEK_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxx
   ```

**Ventaja:**
- Muy económico (5-10x más barato que OpenAI)
- Excelente para presupuestos bajos

---

## 🖼️ PASO 2: Image Generation (Elige UNA)

### 2.1 Together.ai (⭐ RECOMENDADO - 3 meses gratis)
**Tiempo: 5 minutos**

1. Ir a: https://www.together.ai/
2. Hacer clic en "Sign Up"
3. Registrarse con email/GitHub
4. Ir a Dashboard → API Keys
5. Copiar la API key
6. Agregar a `.env.local`:
   ```
   TOGETHER_API_KEY=xxxxxxxxxxxxxxxxxxxxx
   ```

**Ventajas:**
- 3 meses de API completamente gratis
- Sin límite de requests durante trial
- Excelente para MVP

---

### 2.2 Fal.ai (Alternativa - 100 créditos gratis)
**Tiempo: 5 minutos**

1. Ir a: https://fal.ai/
2. Hacer clic en "Sign Up"
3. Ir a Settings → API Keys
4. Copiar la API key
5. Agregar a `.env.local`:
   ```
   FAL_API_KEY=xxxxxxxxxxxxxxxxxxxxx
   ```

**Ventajas:**
- 100 créditos gratis (≈ 50-100 generaciones)
- Rápido y eficiente
- Interfaz simple

---

## 🔍 PASO 3: Pinecone (Vector Database para RAG)
**Tiempo: 15 minutos**

1. Ir a: https://www.pinecone.io/
2. Hacer clic en "Sign Up" o "Get Started"
3. Registrarse (preferible con Google)
4. En el dashboard, crear una organización
5. Crear un **Index** con estos parámetros:
   ```
   Name: cjhirashi-agents-mvp
   Dimensions: 1536
   Metric: cosine
   ```
6. Una vez creado, hacer clic en el index
7. Copiar la **API Key** y el **Environment**
8. Agregar a `.env.local`:
   ```
   PINECONE_API_KEY=pcsk_xxxxxxxxxxxxxxxxxxxxx
   PINECONE_ENVIRONMENT=us-west-2  (o el que uses)
   PINECONE_INDEX_NAME=cjhirashi-agents-mvp
   ```

**Verificar:**
```bash
# En la terminal
npx prisma db push  # Sincronizar DB
npm run seed-models  # Cargar modelos de ejemplo
```

**Nota:**
- Pinecone tiene un free tier generoso (1 free pod, 1M vectors)
- Ideal para MVP

---

## ⚡ PASO 4: Upstash Redis (Rate Limiting)
**Tiempo: 10 minutos**

**⚠️ SOLO REQUERIDO EN PRODUCCIÓN** - Para desarrollo local, usar mock values.

1. Ir a: https://console.upstash.com/
2. Hacer clic en "Create Database"
3. Elegir región más cercana
4. Copiar el **REST API URL** y **Token**
5. Agregar a `.env.local`:
   ```
   UPSTASH_REDIS_URL=https://your-endpoint.upstash.io
   UPSTASH_REDIS_TOKEN=your-upstash-token
   ```

**Para desarrollo:**
- Dejar los mock values actuales:
  ```
  UPSTASH_REDIS_URL=redis://localhost:6379
  UPSTASH_REDIS_TOKEN=dev_mock_token
  ```

---

## 📦 PASO 5: Vercel Blob (Storage)
**Tiempo: 5 minutos**

**⚠️ SOLO REQUERIDO EN PRODUCCIÓN**

1. Ir a: https://vercel.com/dashboard
2. Seleccionar el proyecto `cjhirashi-agents`
3. Ir a Settings → Storage
4. Hacer clic en "Create Storage" → "Blob"
5. Crear un nuevo bucket
6. Copiar el token (BLOB_READ_WRITE_TOKEN)
7. En Vercel dashboard, agregar como Environment Variable

**Para desarrollo local:**
- Usar almacenamiento LOCAL (ya configurado):
  ```
  STORAGE_PROVIDER=LOCAL
  LOCAL_STORAGE_DIR=./.storage
  ```

---

## 🔐 PASO 6: NextAuth para Producción
**Tiempo: 5 minutos**

En Vercel, actualizar estas variables:

```
NEXTAUTH_URL=https://agents.cjhirashi.com
NEXTAUTH_SECRET=(generar nuevo con openssl)
```

**Generar nuevo NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
# Copiar el resultado y pegar en Vercel
```

---

## 🚀 PASO 7: Configurar Environment Variables en Vercel

### 7.1 Ir al Dashboard de Vercel

1. Ir a: https://vercel.com/dashboard
2. Seleccionar proyecto `cjhirashi-agents`
3. Ir a **Settings** → **Environment Variables**

### 7.2 Agregar Variables (una por una)

Para cada variable en `.env.local`, crear una en Vercel:

**Ejemplo: Agregar ANTHROPIC_API_KEY**
```
Name: ANTHROPIC_API_KEY
Value: sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
Production: ✅ (checked)
Preview: ✅ (checked)
Development: ❌ (unchecked - usar .env.local)
```

### 7.3 Variables a Agregar en Vercel

```
✅ ANTHROPIC_API_KEY
✅ OPENAI_API_KEY
✅ GOOGLE_GENERATIVE_AI_API_KEY
✅ DEEPSEEK_API_KEY
✅ TOGETHER_API_KEY (o FAL_API_KEY)
✅ PINECONE_API_KEY
✅ PINECONE_ENVIRONMENT
✅ PINECONE_INDEX_NAME
✅ UPSTASH_REDIS_URL
✅ UPSTASH_REDIS_TOKEN
✅ BLOB_READ_WRITE_TOKEN
✅ NEXTAUTH_URL=https://agents.cjhirashi.com
✅ NEXTAUTH_SECRET=(nuevo)
✅ NEXT_PUBLIC_APP_URL=https://agents.cjhirashi.com
✅ NEXT_PUBLIC_API_URL=https://agents.cjhirashi.com/api/v1
```

---

## ✅ PASO 8: Validar Configuración

### 8.1 En desarrollo local

```bash
# Verificar que el archivo .env.local existe
test -f .env.local && echo "✅ .env.local existe"

# Verificar que las variables están cargadas
echo $ANTHROPIC_API_KEY

# Ejecutar el servidor
npm run dev

# Probar en http://localhost:3000/api/v1/chat/send (sin params = lista models)
curl http://localhost:3000/api/v1/chat/send
```

### 8.2 En producción (Vercel)

```bash
# Después de configurar las variables en Vercel dashboard

# Desplegar nueva versión
git add .env.local
git commit -m "chore: update .env.local with API keys template"
git push origin main

# Vercel desplegará automáticamente
# Ir a Deployments → View in Vercel
# Probar: https://agents.cjhirashi.com
```

---

## 🧪 PASO 9: Pruebas Rápidas

### Prueba 1: Chat con Claude
```bash
curl -X POST http://localhost:3000/api/v1/chat/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "message": "Hola, ¿cómo te llamas?",
    "model": "claude-3-5-sonnet-20241022"
  }'
```

### Prueba 2: Generar Imagen
```bash
curl -X POST http://localhost:3000/api/v1/images/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over the ocean"
  }'
```

### Prueba 3: Crear Custom Agent
```bash
curl -X POST http://localhost:3000/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Agente",
    "systemPrompt": "Eres un asistente amigable",
    "modelId": "claude-3-5-sonnet-20241022"
  }'
```

---

## 📊 Matriz de Requisitos por Funcionalidad

| Funcionalidad | API Key Requerida | ¿Obligatoria? | Costo |
|---|---|---|---|
| Chat básico | Anthropic/OpenAI/Gemini | Sí (≥1) | Gratis/Pago |
| Image Generation | Together.ai / Fal.ai | No (Mock) | Gratis (trial) |
| RAG / Búsqueda | Pinecone | No (se salta si no existe) | Gratis (free tier) |
| Rate Limiting Prod | Upstash | No (en-memory fallback) | Gratis (free tier) |
| Storage Prod | Vercel Blob | No (LOCAL fallback) | Gratis (free tier) |
| OAuth Google | Google OAuth | Sí (para login) | Gratis |

---

## 🚨 Troubleshooting

### Error: "Invalid API Key"
**Solución:**
1. Copiar la clave exactamente (sin espacios)
2. Verificar que está en el archivo correcto (`.env.local` para dev)
3. Recargar el servidor: `npm run dev`

### Error: "ANTHROPIC_API_KEY is missing"
**Solución:**
```bash
# Verificar que .env.local existe
ls -la .env.local

# Verificar que la variable está ahí
grep ANTHROPIC_API_KEY .env.local

# Si no está, editar y agregar:
echo 'ANTHROPIC_API_KEY=sk-ant-xxx' >> .env.local
```

### Error: "Database connection failed"
**Solución:**
- Verificar que `DATABASE_URL` en `.env.local` es correcto
- Probar conexión: `npx prisma db push`

### Error: "CORS error" en Vercel
**Solución:**
1. En Vercel dashboard, ir a Settings → Environment Variables
2. Verificar que `NEXTAUTH_URL=https://agents.cjhirashi.com`
3. Redeploy: `git commit --amend --no-edit && git push --force-with-lease`

---

## 📚 Guías de Referencia por Proveedor

- **Anthropic**: https://docs.anthropic.com/en/api/getting-started
- **OpenAI**: https://platform.openai.com/docs/quickstart
- **Google Gemini**: https://ai.google.dev/tutorials/quickstart
- **DeepSeek**: https://platform.deepseek.com/api/keys
- **Together.ai**: https://docs.together.ai/
- **Pinecone**: https://docs.pinecone.io/
- **Upstash**: https://docs.upstash.com/
- **Vercel**: https://vercel.com/docs/storage/vercel-blob

---

## 📋 Checklist Final

- [ ] Obtuve todas las API keys necesarias
- [ ] Actualicé `.env.local` con los valores reales
- [ ] Verifiqué que `.env.local` está en `.gitignore`
- [ ] Probé `npm run dev` sin errores
- [ ] Configuré las variables en Vercel dashboard
- [ ] Probé los endpoints en producción
- [ ] Actualicé `NEXTAUTH_URL` en Vercel
- [ ] Generé nuevo `NEXTAUTH_SECRET` para producción

---

**¡Listo! Tu aplicación está configurada para producción. 🚀**

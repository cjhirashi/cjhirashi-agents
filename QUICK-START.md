# ⚡ Quick Start - Setup en 30 Minutos

**Si estás apurado, sigue ESTO exactamente:**

---

## 🎯 Objetivo Final
Tener la app funcionando en producción con al menos UN LLM provider

---

## ⏱️ Timeline: 30 minutos

### MIN 1-5: Anthropic API Key (GRATIS)

```bash
# 1. Abre en navegador:
# https://console.anthropic.com/settings/api

# 2. Clic en "Create Key"
# 3. Copiar la clave (empieza con sk-ant-)
# 4. Guardar en notepad temporalmente
```

### MIN 6-10: Google Gemini API Key (GRATIS, sin tarjeta)

```bash
# 1. Abre en navegador:
# https://aistudio.google.com/app/apikey

# 2. Clic en "Create API key"
# 3. Copiar la clave (empieza con AIzaSy)
# 4. Guardar en notepad temporalmente
```

**Mientras esperas:** Puedes generar NEXTAUTH_SECRET en otra pestaña

```bash
# En terminal:
openssl rand -base64 32
# Copiar el resultado
```

### MIN 11-20: Configurar .env.local

```bash
# En tu editor, abrir: .env.local
# Buscar estas líneas y REEMPLAZARLAS:

ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx"
# Reemplaza sk-ant-xxx con tu clave REAL

GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx"
# Reemplaza AIzaSy-xxx con tu clave REAL

# Guardar
```

### MIN 21-25: Configurar Vercel

```bash
# 1. Abre: https://vercel.com/dashboard
# 2. Click en "cjhirashi-agents"
# 3. Ir a Settings → Environment Variables

# 4. Click en "Add New" y agregar:
# Name: ANTHROPIC_API_KEY
# Value: sk-ant-xxxxxxxx (el de arriba)
# Environments: Production ✅, Preview ✅, Development ❌

# 5. Click en "Add New" y agregar:
# Name: GOOGLE_GENERATIVE_AI_API_KEY
# Value: AIzaSy-xxxxxxxx (el de arriba)
# Environments: Production ✅, Preview ✅, Development ❌

# 6. Click en "Add New" y agregar:
# Name: NEXTAUTH_URL
# Value: https://agents.cjhirashi.com
# Environments: Production ✅, Preview ✅, Development ❌

# 7. Click en "Add New" y agregar:
# Name: NEXTAUTH_SECRET
# Value: [resultado de openssl de arriba]
# Environments: Production ✅, Preview ✅, Development ❌

# 8. Esperar a que Vercel redeploy automáticamente
```

### MIN 26-30: Validar

```bash
# Abre en navegador:
https://agents.cjhirashi.com

# Debe cargar sin errores
# Si ves página de login → ✅ FUNCIONANDO

# En terminal, prueba:
curl https://agents.cjhirashi.com/api/v1/chat/send

# Debe retornar algo así:
# {"available_models": ["claude-3.5-sonnet-20241022", ...]}
```

---

## ✅ Si todo funcionó

**¡Listo! Tu app está en producción.** 🚀

Ahora puedes:
- Acceder a https://agents.cjhirashi.com
- Hacer login con Google
- Usar chat con Claude o Gemini
- (Imágenes, RAG, etc. son opcionales - agregar después)

---

## 🚨 Si algo falló

### Error: "Can't load page"
```
→ Vercel deployment aún en proceso
→ Esperar 2-3 minutos
→ Refrescar página
```

### Error: "API Key invalid"
```
→ Revisita https://console.anthropic.com/settings/api
→ Verifica que la clave sea EXACTA (sin espacios)
→ Reemplaza en Vercel y redeploy
```

### Error: "NEXTAUTH_URL error"
```
→ Asegúrate que sea EXACTAMENTE:
   https://agents.cjhirashi.com
→ NO http:// (debe ser https://)
→ NO con trailing slash
→ Redeploy en Vercel
```

---

## 🎓 Próximos Pasos (Opcional)

Una vez que todo funciona:

**Para Imágenes (5 min):**
1. Ir a: https://www.together.ai/ → Sign Up
2. Create API Key → Copiar
3. Agregar a .env.local: TOGETHER_API_KEY
4. Agregar a Vercel: TOGETHER_API_KEY
5. Done!

**Para RAG/Búsqueda (10 min):**
1. Ir a: https://www.pinecone.io/ → Sign Up
2. Create Index (name: cjhirashi-agents-mvp, dims: 1536)
3. Copiar API Key + Environment
4. Agregar a Vercel: PINECONE_* (4 variables)

---

## 🔗 Documentos Completos

Si necesitas más detalles:
- **API-KEYS-SETUP-GUIDE.md** - Guía exhaustiva para cada API
- **VERCEL-ENVIRONMENT-SETUP.md** - Paso a paso detallado en Vercel
- **SETUP-SUMMARY.md** - Overview completo
- **CLAUDE.md** - Documentación del proyecto

---

**¡Go! ⚡**

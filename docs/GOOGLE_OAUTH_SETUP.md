# Guía Paso a Paso: Configurar Google OAuth 2.0

Esta guía te llevará de la mano para configurar las credenciales de Google OAuth necesarias para la autenticación en cjhirashi-agents.

## 📋 Tabla de Contenidos

1. [Acceder a Google Cloud Console](#1-acceder-a-google-cloud-console)
2. [Crear o Seleccionar un Proyecto](#2-crear-o-seleccionar-un-proyecto)
3. [Configurar la Pantalla de Consentimiento OAuth](#3-configurar-la-pantalla-de-consentimiento-oauth)
4. [Crear Credenciales OAuth 2.0](#4-crear-credenciales-oauth-20)
5. [Obtener Client ID y Client Secret](#5-obtener-client-id-y-client-secret)
6. [Configurar Variables de Entorno](#6-configurar-variables-de-entorno)

---

## 1. Acceder a Google Cloud Console

### Paso 1.1: Ir a Google Cloud Console

1. Abre tu navegador web
2. Ve a: **https://console.cloud.google.com/**
3. Inicia sesión con tu cuenta de Google (usa la cuenta que quieres asociar al proyecto)

```
URL: https://console.cloud.google.com/
```

### Paso 1.2: Navegar a APIs y Servicios

Una vez dentro del console:

1. En el menú lateral izquierdo (☰), busca **"APIs y servicios"**
2. Haz clic en **"APIs y servicios"**
3. Luego haz clic en **"Credenciales"**

```
Ruta: ☰ Menu → APIs y servicios → Credenciales
```

O usa el buscador rápido:
- Presiona `/` en el teclado
- Escribe "credenciales"
- Selecciona "Credenciales" en los resultados

---

## 2. Crear o Seleccionar un Proyecto

### Opción A: Crear un Nuevo Proyecto

Si es tu primera vez o quieres un proyecto dedicado:

1. En la parte superior, haz clic en el selector de proyecto (junto al logo de Google Cloud)
2. Se abrirá un modal, haz clic en **"NUEVO PROYECTO"** (esquina superior derecha)
3. Completa los campos:
   ```
   Nombre del proyecto: cjhirashi-agents
   Organización: Sin organización (o tu organización si tienes)
   Ubicación: Sin organización
   ```
4. Haz clic en **"CREAR"**
5. Espera unos segundos mientras se crea el proyecto
6. Selecciona el proyecto recién creado desde el selector

### Opción B: Usar un Proyecto Existente

Si ya tienes un proyecto:

1. Haz clic en el selector de proyecto (parte superior)
2. Busca tu proyecto en la lista
3. Selecciónalo

```
Ejemplo de nombre de proyecto: cjhirashi-agents
ID del proyecto: cjhirashi-agents-2025 (se genera automáticamente)
```

---

## 3. Configurar la Pantalla de Consentimiento OAuth

**IMPORTANTE:** Antes de crear credenciales, DEBES configurar la pantalla de consentimiento.

### Paso 3.1: Acceder a la Configuración

1. En el menú lateral, ve a: **"APIs y servicios" → "Pantalla de consentimiento de OAuth"**
2. O usa la ruta directa: https://console.cloud.google.com/apis/credentials/consent

```
Ruta: APIs y servicios → Pantalla de consentimiento de OAuth
```

### Paso 3.2: Seleccionar Tipo de Usuario

Se te preguntará qué tipo de aplicación quieres crear:

- **Interno**: Solo usuarios de tu organización (requiere Google Workspace)
- **Externo**: Cualquier usuario con cuenta de Google ✅ **SELECCIONA ESTA**

```
Selección recomendada: EXTERNO
```

Haz clic en **"CREAR"**

### Paso 3.3: Configurar Información de la App

#### Pantalla 1: Información de la aplicación OAuth

Completa los siguientes campos:

```
┌─────────────────────────────────────────────────────────────────┐
│ Nombre de la aplicación *                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ cjhirashi agents                                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Correo electrónico de asistencia al usuario *                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ tu-email@gmail.com                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Logotipo de la aplicación (opcional)                             │
│ [ Subir logo ]                                                   │
│                                                                   │
│ Dominios de la aplicación                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ localhost (para desarrollo local - opcional)                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Dominios autorizados (opcional por ahora)                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Información de contacto del desarrollador *                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ tu-email@gmail.com                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Campos obligatorios:**
- **Nombre de la aplicación**: `cjhirashi agents`
- **Correo de asistencia**: Tu email de Google
- **Información de contacto**: Tu email de Google

Haz clic en **"GUARDAR Y CONTINUAR"**

#### Pantalla 2: Permisos (Scopes)

Para autenticación básica con Google, NextAuth solicita automáticamente los permisos necesarios:
- `openid`
- `email`
- `profile`

**NO necesitas agregar permisos manualmente en esta pantalla.**

Simplemente haz clic en **"GUARDAR Y CONTINUAR"**

#### Pantalla 3: Usuarios de prueba (Solo modo Externo)

Si tu app está en modo "Externo" y no está publicada, solo los usuarios de prueba podrán iniciar sesión.

**Agregar usuarios de prueba:**

1. Haz clic en **"+ AGREGAR USUARIOS"**
2. Ingresa los correos electrónicos que podrán probar la app:
   ```
   tu-email@gmail.com
   otro-email@gmail.com
   ```
3. Haz clic en **"AGREGAR"**
4. Haz clic en **"GUARDAR Y CONTINUAR"**

```
💡 Tip: Agrega tu email personal y cualquier otra cuenta que uses para testing
```

#### Pantalla 4: Resumen

Revisa toda la información y haz clic en **"VOLVER AL PANEL"**

---

## 4. Crear Credenciales OAuth 2.0

Ahora sí, vamos a crear las credenciales que usará tu aplicación.

### Paso 4.1: Ir a Credenciales

1. En el menú lateral, ve a: **"APIs y servicios" → "Credenciales"**
2. O usa la ruta directa: https://console.cloud.google.com/apis/credentials

### Paso 4.2: Crear Credenciales

1. En la parte superior, haz clic en **"+ CREAR CREDENCIALES"**
2. En el menú desplegable, selecciona **"ID de cliente de OAuth"**

```
Ruta: + CREAR CREDENCIALES → ID de cliente de OAuth
```

### Paso 4.3: Configurar el Cliente OAuth

Se te presentará un formulario:

```
┌─────────────────────────────────────────────────────────────────┐
│ Tipo de aplicación *                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ● Aplicación web                                      [▼]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Nombre *                                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ cjhirashi-agents-web-client                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Orígenes de JavaScript autorizados                               │
│ [ + Agregar URI ]                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ http://localhost:3000                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ URIs de redireccionamiento autorizados *                         │
│ [ + Agregar URI ]                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ http://localhost:3000/api/auth/callback/google              │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Completa los campos:**

1. **Tipo de aplicación**: Selecciona **"Aplicación web"**

2. **Nombre**: `cjhirashi-agents-web-client` (o el nombre que prefieras)

3. **Orígenes de JavaScript autorizados** (opcional pero recomendado):
   - Haz clic en **"+ Agregar URI"**
   - Ingresa: `http://localhost:3000`
   - Haz clic en Enter

4. **URIs de redireccionamiento autorizados** (OBLIGATORIO):
   - Haz clic en **"+ Agregar URI"**
   - Ingresa: `http://localhost:3000/api/auth/callback/google`
   - Haz clic en Enter

```
⚠️ IMPORTANTE: El URI de redirección DEBE ser EXACTAMENTE:
http://localhost:3000/api/auth/callback/google

NO olvides /api/auth/callback/google al final
```

### Paso 4.4: Crear las Credenciales

Haz clic en **"CREAR"** en la parte inferior del formulario.

---

## 5. Obtener Client ID y Client Secret

### Paso 5.1: Modal de Credenciales Creadas

Después de hacer clic en "CREAR", aparecerá un modal titulado **"Cliente de OAuth creado"**:

```
┌───────────────────────────────────────────────────────────────┐
│                  Cliente de OAuth creado                      │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Tu ID de cliente                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 123456789012-abc123def456ghi789jkl012mno345pqr.apps    │ │
│  │ .googleusercontent.com                         [📋]    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Tu secreto de cliente                                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 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3456          [📋]│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│         [ DESCARGAR JSON ]          [ OK ]                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Paso 5.2: Copiar las Credenciales

**OPCIÓN 1: Copiar manualmente**

1. Haz clic en el icono de copiar [📋] junto a **"Tu ID de cliente"**
2. Pégalo en un archivo de texto temporal
3. Haz clic en el icono de copiar [📋] junto a **"Tu secreto de cliente"**
4. Pégalo en el mismo archivo de texto

**OPCIÓN 2: Descargar JSON**

1. Haz clic en **"DESCARGAR JSON"**
2. Se descargará un archivo como: `client_secret_123456789012-abc.apps.googleusercontent.com.json`
3. Abre el archivo con un editor de texto
4. Encontrarás las credenciales dentro:
   ```json
   {
     "web": {
       "client_id": "123456789012-abc...apps.googleusercontent.com",
       "client_secret": "GOCSPX-ABcd1234EFgh5678...",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       ...
     }
   }
   ```

### Paso 5.3: Guardar las Credenciales de Forma Segura

```
⚠️ IMPORTANTE: El Client Secret es sensible. Guárdalo de forma segura.

❌ NO lo compartas en:
   - Repositorios públicos de Git
   - Screenshots públicos
   - Mensajes de chat/email no cifrados
   - Código fuente commiteado

✅ Guárdalo en:
   - Archivo .env (que está en .gitignore)
   - Administrador de contraseñas
   - Variable de entorno del sistema
```

Haz clic en **"OK"** para cerrar el modal.

### Paso 5.4: Acceder a las Credenciales Después

Si cierras el modal, puedes volver a ver tus credenciales:

1. Ve a **"APIs y servicios" → "Credenciales"**
2. En la sección **"ID de clientes de OAuth 2.0"**, verás tu cliente listado
3. Haz clic en el nombre del cliente (ej: `cjhirashi-agents-web-client`)
4. Se abrirá la configuración donde puedes ver el Client ID
5. El Client Secret aparecerá parcialmente oculto, pero puedes copiarlo

```
Ejemplo de formato:
Client ID:     123456789012-abc123def456ghi789jkl012mno345pqr.apps.googleusercontent.com
Client Secret: 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3456
```

---

## 6. Configurar Variables de Entorno

Ahora vamos a usar estas credenciales en tu proyecto.

### Paso 6.1: Crear el Archivo .env

En la raíz de tu proyecto `cjhirashi-agents`:

```bash
# Si no existe, copia el ejemplo
cp .env.example .env
```

### Paso 6.2: Editar el Archivo .env

Abre el archivo `.env` con tu editor favorito:

```bash
# Con VS Code
code .env

# Con nano
nano .env

# Con notepad (Windows)
notepad .env
```

### Paso 6.3: Agregar las Credenciales

Busca las líneas de Google OAuth y reemplázalas con tus credenciales:

```env
# Google OAuth
GOOGLE_CLIENT_ID="123456789012-abc123def456ghi789jkl012mno345pqr.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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3456"
```

**Reemplaza:**
- `123456789012-abc123def456ghi789jkl012mno345pqr.apps.googleusercontent.com` con tu Client ID
- `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3456` con tu Client Secret

```
⚠️ MANTÉN las comillas "" alrededor de los valores
```

### Paso 6.4: Generar NEXTAUTH_SECRET

El archivo `.env` también requiere un `NEXTAUTH_SECRET`. Genera uno aleatorio:

**En Mac/Linux/Git Bash:**
```bash
openssl rand -base64 32
```

**En PowerShell (Windows):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Resultado esperado:**
```
R5tK8mN3pQ7wX2cV9bL4jH6gF1sD8aY5uE0iO3rT9mN=
```

Copia ese valor y pégalo en tu `.env`:

```env
NEXTAUTH_SECRET="R5tK8mN3pQ7wX2cV9bL4jH6gF1sD8aY5uE0iO3rT9mN="
```

### Paso 6.5: Archivo .env Completo

Tu archivo `.env` debería verse así:

```env
# Database
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/cjhirashi_agents?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="R5tK8mN3pQ7wX2cV9bL4jH6gF1sD8aY5uE0iO3rT9mN="

# Google OAuth
GOOGLE_CLIENT_ID="123456789012-abc123def456ghi789jkl012mno345pqr.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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3456"

# ADK Agents (Opcional por ahora)
ADK_AGENT_ENDPOINT="https://your-cloud-run-url"
```

### Paso 6.6: Verificar que .env está en .gitignore

**MUY IMPORTANTE**: Asegúrate de que `.env` NO se suba a Git:

```bash
# Verifica que .env está en .gitignore
cat .gitignore | grep .env
```

Deberías ver:
```
.env
.env.local
.env*.local
```

Si no está, agrégalo:
```bash
echo ".env" >> .gitignore
```

---

## 7. Verificar la Configuración

### Paso 7.1: Reiniciar el Servidor de Desarrollo

Si ya tenías el servidor corriendo, reinícialo para que tome las nuevas variables:

```bash
# Detener el servidor (Ctrl+C)
# Luego iniciar de nuevo
npm run dev
```

### Paso 7.2: Probar la Autenticación

1. Abre tu navegador en: http://localhost:3000
2. Ve a la página de login: http://localhost:3000/auth/signin
3. Haz clic en **"Continuar con Google"**
4. Deberías ser redirigido a la pantalla de selección de cuenta de Google
5. Selecciona tu cuenta (debe ser una de las cuentas de prueba que agregaste)
6. Acepta los permisos si es necesario
7. Serás redirigido de vuelta a tu app en: http://localhost:3000/dashboard

### Paso 7.3: Verificar que Estás Autenticado

En el dashboard, deberías ver:
- En el **Sidebar**: Tu avatar y nombre de usuario
- Al hacer clic en tu avatar: Menú con opciones de perfil y cerrar sesión

---

## 🎉 ¡Felicidades!

Has configurado exitosamente Google OAuth 2.0 para tu aplicación cjhirashi-agents.

---

## 🐛 Solución de Problemas

### Error: "redirect_uri_mismatch"

```
Error 400: redirect_uri_mismatch
```

**Causa**: El URI de redirección en tu código no coincide con el configurado en Google Cloud.

**Solución**:
1. Ve a Google Cloud Console → Credenciales
2. Haz clic en tu cliente OAuth
3. En **"URIs de redireccionamiento autorizados"**, verifica que esté:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Si no está, agrégalo y guarda
5. Espera 5 minutos para que se propague el cambio

### Error: "Access blocked: This app's request is invalid"

**Causa**: No configuraste la pantalla de consentimiento OAuth.

**Solución**: Ve al [Paso 3](#3-configurar-la-pantalla-de-consentimiento-oauth) y completa la configuración.

### Error: "This app is blocked"

```
This app is blocked
This app tried to access sensitive info in your Google Account.
```

**Causa**: Tu email no está en la lista de usuarios de prueba.

**Solución**:
1. Ve a: APIs y servicios → Pantalla de consentimiento de OAuth
2. En la sección "Usuarios de prueba", agrega tu email
3. Guarda los cambios
4. Intenta nuevamente

### Error: Configuration

Si ves este error en `/auth/error?error=Configuration`:

**Causas posibles**:
1. Variables de entorno mal configuradas
2. Cliente de Prisma no generado
3. Base de datos no conectada

**Soluciones**:

```bash
# 1. Verifica que las variables estén correctas
cat .env

# 2. Regenera el cliente de Prisma
npx prisma generate

# 3. Verifica la conexión a la base de datos
npx prisma db pull

# 4. Reinicia el servidor
npm run dev
```

### No puedo encontrar mi Client Secret

1. Ve a: APIs y servicios → Credenciales
2. Encuentra tu cliente OAuth en "ID de clientes de OAuth 2.0"
3. Haz clic en el icono de la papelera (🗑️) para eliminar el cliente
4. Crea uno nuevo siguiendo el [Paso 4](#4-crear-credenciales-oauth-20)
5. Se te mostrarán nuevas credenciales

```
⚠️ Nota: Eliminar un cliente OAuth revocará todas las sesiones activas
```

---

## 📝 Checklist Final

Antes de continuar, verifica que tengas todo:

- [ ] Proyecto creado en Google Cloud Console
- [ ] Pantalla de consentimiento OAuth configurada
- [ ] Usuarios de prueba agregados (tu email)
- [ ] Credenciales OAuth 2.0 creadas
- [ ] Client ID copiado
- [ ] Client Secret copiado y guardado de forma segura
- [ ] URI de redirección configurado: `http://localhost:3000/api/auth/callback/google`
- [ ] Archivo `.env` creado y configurado
- [ ] `NEXTAUTH_SECRET` generado
- [ ] `.env` en `.gitignore`
- [ ] Servidor de desarrollo funcionando
- [ ] Login con Google exitoso

---

## 🔐 Seguridad para Producción

Cuando estés listo para producción:

### 1. Agregar Dominios de Producción

En Google Cloud Console:

1. Ve a tu cliente OAuth
2. En **"Orígenes de JavaScript autorizados"**, agrega:
   ```
   https://tu-dominio.com
   https://www.tu-dominio.com
   ```
3. En **"URIs de redireccionamiento autorizados"**, agrega:
   ```
   https://tu-dominio.com/api/auth/callback/google
   https://www.tu-dominio.com/api/auth/callback/google
   ```

### 2. Publicar la App (Opcional)

Si quieres que cualquier usuario pueda autenticarse:

1. Ve a: Pantalla de consentimiento de OAuth
2. Haz clic en **"PUBLICAR APP"**
3. Google revisará tu app (puede tomar días/semanas)
4. Una vez aprobada, cualquier usuario de Google podrá iniciar sesión

```
💡 Tip: Para uso personal, NO necesitas publicar la app.
Solo agrega los emails que necesites como usuarios de prueba.
```

---

## 📚 Recursos Adicionales

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 💬 Soporte

Si tienes problemas adicionales:

1. Revisa los logs del servidor: Busca errores en la terminal donde corre `npm run dev`
2. Revisa los logs del navegador: Abre DevTools (F12) y ve a la pestaña Console
3. Consulta la documentación de NextAuth: https://next-auth.js.org/
4. Abre un issue en el repositorio con los detalles del error

---

**¡Ahora estás listo para continuar con los siguientes pasos!**

Próximo paso: [Configurar la Base de Datos](AUTH_SETUP.md#3-configurar-base-de-datos)

# Configuración de Cloud SQL (PostgreSQL) en Google Cloud

Esta guía te llevará paso a paso para configurar una instancia de Cloud SQL PostgreSQL para tu proyecto cjhirashi-agents.

## 📋 Tabla de Contenidos

1. [Crear Instancia de Cloud SQL](#1-crear-instancia-de-cloud-sql)
2. [Configurar la Base de Datos](#2-configurar-la-base-de-datos)
3. [Configurar Conexión Segura](#3-configurar-conexión-segura)
4. [Actualizar Variables de Entorno](#4-actualizar-variables-de-entorno)
5. [Probar la Conexión](#5-probar-la-conexión)

---

## 1. Crear Instancia de Cloud SQL

### Paso 1.1: Acceder a Cloud SQL

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Asegúrate de estar en el proyecto **cjhirashi-agents** (selector en la parte superior)
3. En el menú lateral (☰), busca **"SQL"** o ve directamente a:
   ```
   https://console.cloud.google.com/sql/instances
   ```

```
Ruta: ☰ Menu → SQL
```

### Paso 1.2: Habilitar Cloud SQL API (si es necesario)

Si es tu primera vez usando Cloud SQL, verás un botón para habilitar la API:

1. Haz clic en **"HABILITAR"** o **"ENABLE API"**
2. Espera unos segundos mientras se activa la API

### Paso 1.3: Crear Nueva Instancia

1. Haz clic en **"CREAR INSTANCIA"** o **"CREATE INSTANCE"**
2. Selecciona el motor de base de datos: **PostgreSQL**

```
┌─────────────────────────────────────────────────────────────┐
│  Elige el motor de tu base de datos                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [  MySQL  ]   [ PostgreSQL ]   [ SQL Server ]             │
│                      ✓                                      │
└─────────────────────────────────────────────────────────────┘
```

### Paso 1.4: Configurar la Instancia

Ahora verás un formulario de configuración. Te recomiendo estos valores:

#### **Información de la Instancia**

```
┌─────────────────────────────────────────────────────────────┐
│ ID de instancia *                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ cjhirashi-agents-db                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Contraseña para el usuario postgres *                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ••••••••••••••••                        [Generar]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ⚠️ IMPORTANTE: Guarda esta contraseña de forma segura      │
└─────────────────────────────────────────────────────────────┘
```

**Campos a completar:**
- **ID de instancia**: `cjhirashi-agents-db`
- **Contraseña**: Haz clic en **"GENERAR"** y copia la contraseña generada
  - O crea una contraseña segura (mínimo 12 caracteres)
  - **⚠️ GUÁRDALA**: La necesitarás después

```
💡 Tip: Usa el botón "Generar" para crear una contraseña segura automáticamente
```

#### **Versión de la Base de Datos**

```
Versión de la base de datos: PostgreSQL 15 (o la más reciente)
```

#### **Preajuste de Configuración**

Para desarrollo, usa el plan más económico:

```
┌─────────────────────────────────────────────────────────────┐
│ Elige un preajuste de configuración                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ○ Producción       ● Desarrollo       ○ Empresarial       │
│                                                             │
│  El preajuste Desarrollo incluye:                           │
│  • 1 vCPU, 3.75 GB de memoria                              │
│  • 10 GB de almacenamiento SSD                             │
│  • Backups automáticos deshabilitados                       │
│  • Alta disponibilidad deshabilitada                        │
│                                                             │
│  Costo estimado: ~$9 USD/mes                               │
└─────────────────────────────────────────────────────────────┘
```

**Selecciona:** **Desarrollo** (●)

#### **Región y Zona**

```
┌─────────────────────────────────────────────────────────────┐
│ Región *                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ us-central1 (Iowa)                              [▼]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Zona                                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Zona única                                      [▼]    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Recomendaciones:**
- **Región**: Elige la más cercana a ti o a tus usuarios
  - América: `us-central1`, `us-east1`, `southamerica-east1`
  - Europa: `europe-west1`, `europe-west2`
  - Asia: `asia-northeast1`
- **Zona**: `Zona única` (para desarrollo)

#### **Personalizar la Instancia (Opcional)**

Si quieres ajustar más opciones, haz clic en **"MOSTRAR CONFIGURACIÓN"** o **"SHOW CONFIGURATION"**:

##### **Conectividad**

```
┌─────────────────────────────────────────────────────────────┐
│ Conectividad                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ☑ IP privada (requiere VPC)                                │
│ ☑ IP pública                           ← ACTIVA ESTA       │
│                                                             │
│ Redes autorizadas                                           │
│ [ + Agregar red ]                                           │
└─────────────────────────────────────────────────────────────┘
```

**IMPORTANTE**: Para desarrollo, asegúrate de tener **IP pública** habilitada (☑)

**Para conectarte desde tu computadora local:**

1. Haz clic en **"+ Agregar red"**
2. Ingresa:
   ```
   Nombre: Mi computadora local
   Red: 0.0.0.0/0
   ```

```
⚠️ SEGURIDAD: 0.0.0.0/0 permite conexiones desde cualquier IP.
Solo usa esto para desarrollo. En producción, restringe a IPs específicas.
```

**Alternativa segura**: Usa Cloud SQL Proxy (te explico después)

##### **Respaldos Automáticos**

```
┌─────────────────────────────────────────────────────────────┐
│ Respaldos automatizados                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ☐ Habilitar respaldos automatizados                        │
│   (puedes dejarlo deshabilitado para desarrollo)           │
└─────────────────────────────────────────────────────────────┘
```

Para desarrollo, puedes dejarlo **deshabilitado** (☐) para ahorrar costos.

##### **Marcas de Base de Datos (Flags)**

```
Puedes dejar las flags por defecto
```

### Paso 1.5: Crear la Instancia

1. Revisa toda la configuración
2. Verifica el costo estimado en el panel derecho
3. Haz clic en **"CREAR INSTANCIA"** o **"CREATE INSTANCE"** en la parte inferior

```
⏱️ La creación de la instancia puede tardar 5-10 minutos
```

Mientras se crea, verás:
```
┌─────────────────────────────────────────────────────────────┐
│  🔄 Creando instancia...                                    │
│                                                             │
│  cjhirashi-agents-db                                        │
│  Estado: Creando instancia                                  │
│  Región: us-central1                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Configurar la Base de Datos

Una vez que la instancia esté lista (✓ estado verde), vamos a configurar la base de datos.

### Paso 2.1: Acceder a la Instancia

1. En la lista de instancias SQL, haz clic en **cjhirashi-agents-db**
2. Se abrirá la página de detalles de la instancia

### Paso 2.2: Crear la Base de Datos

1. En el menú lateral de la instancia, haz clic en **"Bases de datos"** o **"Databases"**
2. Haz clic en **"CREAR BASE DE DATOS"** o **"CREATE DATABASE"**

```
┌─────────────────────────────────────────────────────────────┐
│ Nombre de la base de datos *                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ cjhirashi_agents                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Conjunto de caracteres (opcional)                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ UTF8                                            [▼]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Intercalación (opcional)                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ en_US.UTF8                                      [▼]    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Campos:**
- **Nombre**: `cjhirashi_agents`
- **Conjunto de caracteres**: `UTF8` (default)
- **Intercalación**: `en_US.UTF8` (default)

Haz clic en **"CREAR"**

### Paso 2.3: Verificar Usuario Postgres

El usuario `postgres` se crea automáticamente con la contraseña que generaste al crear la instancia.

Para verificar o crear usuarios adicionales:

1. En el menú lateral, haz clic en **"Usuarios"** o **"Users"**
2. Deberías ver el usuario **postgres** listado
3. (Opcional) Puedes crear un usuario adicional específico para la app:
   - Haz clic en **"AGREGAR CUENTA DE USUARIO"**
   - Nombre: `cjhirashi_user`
   - Contraseña: Genera una segura
   - Haz clic en **"AGREGAR"**

```
Usuario recomendado para producción: cjhirashi_user
Usuario para desarrollo: postgres (está bien)
```

---

## 3. Configurar Conexión Segura

Tienes **2 opciones** para conectarte a Cloud SQL desde tu computadora local:

### **Opción A: Conexión Directa con IP Pública (Más Simple)**

Si habilitaste IP pública y agregaste `0.0.0.0/0` a redes autorizadas, puedes conectarte directamente.

#### Obtener la IP de la Instancia

1. Ve a la página principal de tu instancia **cjhirashi-agents-db**
2. En la sección **"Conectar con esta instancia"**, busca:
   ```
   Dirección IP pública: 34.123.45.67 (ejemplo)
   ```
3. **Copia esta IP** - la necesitarás para el `DATABASE_URL`

### **Opción B: Cloud SQL Auth Proxy (Más Seguro - Recomendado)**

El Cloud SQL Auth Proxy crea un túnel seguro sin necesidad de abrir la instancia a internet.

#### Instalar Cloud SQL Auth Proxy

**En Windows:**

1. Descarga el proxy:
   ```powershell
   # Descargar Cloud SQL Proxy
   Invoke-WebRequest -Uri https://dl.google.com/cloudsql/cloud_sql_proxy_x64.exe -OutFile cloud_sql_proxy.exe
   ```

2. Mueve el archivo a una ubicación en tu PATH o a la carpeta del proyecto

**En Mac/Linux:**

```bash
# Mac
curl -o cloud-sql-proxy https://dl.google.com/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Linux
curl -o cloud-sql-proxy https://dl.google.com/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy
```

#### Obtener el Connection Name

1. En la página de tu instancia, busca **"Nombre de conexión"** o **"Connection name"**
2. Se ve algo así: `proyecto:region:instancia`
   ```
   Ejemplo: cjhirashi-agents-2025:us-central1:cjhirashi-agents-db
   ```
3. **Copia este nombre completo**

#### Autenticar con Google Cloud

```bash
# Instala gcloud CLI si no lo tienes
# https://cloud.google.com/sdk/docs/install

# Autentícate
gcloud auth application-default login

# Selecciona el proyecto
gcloud config set project cjhirashi-agents-2025
```

#### Ejecutar el Proxy

**Windows PowerShell:**
```powershell
.\cloud_sql_proxy.exe cjhirashi-agents-2025:us-central1:cjhirashi-agents-db
```

**Mac/Linux:**
```bash
./cloud-sql-proxy cjhirashi-agents-2025:us-central1:cjhirashi-agents-db
```

Deberías ver:
```
Listening on 127.0.0.1:5432
Ready for new connections
```

Deja esta terminal abierta mientras trabajas. El proxy creará un socket local en el puerto **5432**.

---

## 4. Actualizar Variables de Entorno

Ahora vamos a actualizar tu archivo `.env` con la información de Cloud SQL.

### Formato del DATABASE_URL

#### **Si usas Conexión Directa (Opción A):**

```env
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@34.123.45.67:5432/cjhirashi_agents?schema=public"
```

Reemplaza:
- `TU_CONTRASEÑA` → Contraseña del usuario postgres que guardaste
- `34.123.45.67` → IP pública de tu instancia Cloud SQL
- `cjhirashi_agents` → Nombre de tu base de datos

#### **Si usas Cloud SQL Auth Proxy (Opción B - Recomendado):**

```env
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@127.0.0.1:5432/cjhirashi_agents?schema=public"
```

Reemplaza:
- `TU_CONTRASEÑA` → Contraseña del usuario postgres
- `127.0.0.1:5432` → El proxy redirige localmente
- `cjhirashi_agents` → Nombre de tu base de datos

```
⚠️ IMPORTANTE: Si usas Cloud SQL Proxy, el host es 127.0.0.1 (localhost)
```

### Ejemplo Completo del .env

```env
# Database - Cloud SQL
DATABASE_URL="postgresql://postgres:Ab1Cd2Ef3Gh4Ij5@127.0.0.1:5432/cjhirashi_agents?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="1auI3eVR+7v1MS6Mp8R07rqpRZAseq6p7o2vviE654g="

# Google OAuth
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"

# ADK Agents (Opcional)
ADK_AGENT_ENDPOINT="https://your-cloud-run-url"
```

---

## 5. Probar la Conexión

### Paso 5.1: Verificar con Prisma

Primero, asegúrate de tener las dependencias instaladas:

```bash
npm install
```

### Paso 5.2: Probar la Conexión

Ejecuta este comando para verificar que Prisma puede conectarse:

```bash
npx prisma db pull
```

Si la conexión es exitosa, verás:
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "cjhirashi_agents"

Introspecting based on datasource defined in prisma\schema.prisma

✔ Introspected 0 models and 0 enums
```

```
✅ Si ves este mensaje, la conexión funciona correctamente!
```

### Paso 5.3: Aplicar el Schema de Prisma

Ahora vamos a crear las tablas en Cloud SQL:

```bash
# Aplicar el schema a la base de datos
npx prisma db push
```

Deberías ver:
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "cjhirashi_agents"

🚀  Your database is now in sync with your Prisma schema. Done in 1.23s

✔ Generated Prisma Client
```

### Paso 5.4: Verificar las Tablas Creadas

Puedes usar Prisma Studio para ver las tablas:

```bash
npx prisma studio
```

Se abrirá una interfaz web en `http://localhost:5555` donde podrás ver:
- ✅ Tabla `users`
- ✅ Tabla `accounts`
- ✅ Tabla `auth_sessions`
- ✅ Tabla `verification_tokens`
- ✅ Tabla `sessions`
- ✅ Tabla `agents`
- ✅ Tabla `conversations`
- ✅ Tabla `messages`

```
🎉 ¡Éxito! Tu base de datos Cloud SQL está lista
```

---

## 🎯 Resumen de Configuración

### Lo que has hecho:

- [x] Crear instancia de Cloud SQL (PostgreSQL)
- [x] Configurar base de datos `cjhirashi_agents`
- [x] Configurar usuario `postgres`
- [x] Habilitar conectividad (IP pública o Proxy)
- [x] Actualizar `DATABASE_URL` en `.env`
- [x] Aplicar schema de Prisma con `db push`
- [x] Verificar tablas creadas

### Tu configuración final:

```
Instancia Cloud SQL: cjhirashi-agents-db
Base de datos: cjhirashi_agents
Usuario: postgres
Región: [tu región seleccionada]
Conexión: Cloud SQL Auth Proxy (127.0.0.1:5432) o IP Pública
```

---

## 💰 Costos Estimados

### Instancia de Desarrollo:
```
Configuración: 1 vCPU, 3.75 GB RAM, 10 GB SSD
Costo mensual: ~$9-12 USD
Costo por hora: ~$0.015 USD/hora
```

### Tips para Reducir Costos:

1. **Detén la instancia cuando no la uses:**
   - Ve a la consola de Cloud SQL
   - Selecciona tu instancia
   - Clic en **DETENER** (⏸️)
   - Vuelve a iniciarla cuando necesites trabajar

2. **Configura una política de stop automático:**
   - No hay cargo cuando la instancia está detenida
   - Solo pagas almacenamiento (~$0.17/GB/mes)

3. **Para producción, escala según necesites**

---

## 🔐 Seguridad para Producción

Cuando despliegues a producción:

### 1. Restringe IPs Autorizadas

En lugar de `0.0.0.0/0`, agrega solo:
- IP de tu servidor Vercel
- IPs específicas de desarrolladores

### 2. Usa SSL/TLS

En el `DATABASE_URL`, agrega parámetros SSL:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/cjhirashi_agents?schema=public&sslmode=require&sslcert=/path/to/cert&sslkey=/path/to/key&sslrootcert=/path/to/ca"
```

### 3. Crea Usuario Específico

No uses el usuario `postgres` en producción. Crea un usuario con permisos limitados:

```sql
CREATE USER cjhirashi_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE cjhirashi_agents TO cjhirashi_app;
GRANT USAGE ON SCHEMA public TO cjhirashi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cjhirashi_app;
```

### 4. Habilita Backups Automáticos

En la configuración de la instancia:
- Backups automatizados: ☑ Habilitado
- Ventana de backup: Elige horario de bajo tráfico
- Retención: 7-30 días

---

## 🐛 Solución de Problemas

### Error: "Connection refused"

**Causa**: No puedes alcanzar la instancia Cloud SQL

**Soluciones**:
1. Verifica que la instancia esté **en ejecución** (no detenida)
2. Si usas IP pública, verifica que `0.0.0.0/0` esté en redes autorizadas
3. Si usas proxy, verifica que esté corriendo en otra terminal

### Error: "password authentication failed"

**Causa**: Contraseña incorrecta en `DATABASE_URL`

**Soluciones**:
1. Verifica la contraseña en tu `.env`
2. Si olvidaste la contraseña, restablécela:
   - Ve a Cloud SQL → Usuarios
   - Selecciona `postgres`
   - Haz clic en los 3 puntos (⋮) → Cambiar contraseña
   - Genera nueva contraseña
   - Actualiza tu `.env`

### Error: "database does not exist"

**Causa**: La base de datos `cjhirashi_agents` no existe

**Solución**: Ve al [Paso 2.2](#paso-22-crear-la-base-de-datos) y crea la base de datos

### Error: "FATAL: no pg_hba.conf entry"

**Causa**: Tu IP no está autorizada

**Solución**:
1. Ve a tu instancia Cloud SQL
2. Editar → Conectividad → Redes autorizadas
3. Agrega tu IP pública actual (puedes verla en https://whatismyip.com/)
4. O usa Cloud SQL Auth Proxy para evitar este problema

### Cloud SQL Proxy no se conecta

**Causa**: No estás autenticado o el connection name es incorrecto

**Solución**:
```bash
# Re-autentícate
gcloud auth application-default login

# Verifica el connection name en la consola
# Debe ser: proyecto:region:instancia
```

---

## 📚 Recursos Adicionales

- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy)
- [Prisma with Cloud SQL](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-google-cloud)
- [Cloud SQL Pricing](https://cloud.google.com/sql/pricing)

---

## ✅ Próximos Pasos

Una vez configurada Cloud SQL:

1. Ejecutar migraciones: `npx prisma db push`
2. Generar cliente Prisma: `npx prisma generate`
3. Iniciar servidor: `npm run dev`
4. Probar autenticación con Google

**¡Ya casi terminas! 🎉**

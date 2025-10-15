# Database Setup con Prisma

Este directorio contiene la configuración de la base de datos usando Prisma ORM.

## 🚀 Setup Rápido

### 1. Instalar PostgreSQL (Opción Docker - Recomendado)

```bash
# Iniciar PostgreSQL en Docker
docker run --name cjhirashi-postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=cjhirashi_agents \
  -p 5432:5432 \
  -d postgres

# Verificar que esté corriendo
docker ps
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto (copia de `.env.example`):

```env
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/cjhirashi_agents?schema=public"
```

### 3. Generar el Cliente de Prisma

```bash
npx prisma generate
```

### 4. Crear las Tablas en la Base de Datos

```bash
npx prisma db push
```

O si prefieres usar migraciones:

```bash
npx prisma migrate dev --name init
```

### 5. (Opcional) Ver la Base de Datos con Prisma Studio

```bash
npx prisma studio
```

Esto abrirá una interfaz web en `http://localhost:5555` para ver y editar los datos.

## 📊 Modelos de Datos

### User
Usuario del sistema (autenticado con Google OAuth)

### Agent
Agentes de IA configurados (ADK agents)

### Session
Sesiones de usuario para agrupar conversaciones

### Conversation
Conversaciones individuales con un agente específico

### Message
Mensajes dentro de una conversación (user/assistant/system)

## 🔧 Comandos Útiles

```bash
# Generar cliente de Prisma después de cambios en schema
npx prisma generate

# Aplicar cambios al schema en desarrollo
npx prisma db push

# Crear una nueva migración
npx prisma migrate dev --name descripcion_cambio

# Aplicar migraciones en producción
npx prisma migrate deploy

# Abrir Prisma Studio
npx prisma studio

# Reset completo de la base de datos (¡CUIDADO!)
npx prisma migrate reset
```

## 🌐 Cloud SQL (Producción)

Para producción en Google Cloud Platform:

1. Crear instancia de Cloud SQL (PostgreSQL)
2. Configurar IP autorizada o Cloud SQL Proxy
3. Actualizar `DATABASE_URL` en variables de entorno de Vercel
4. Ejecutar migraciones: `npx prisma migrate deploy`

## 📚 Recursos

- [Prisma Docs](https://www.prisma.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Cloud SQL Docs](https://cloud.google.com/sql/docs)

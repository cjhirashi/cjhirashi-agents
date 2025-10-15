<div align="center">

# 🤖 CJHIRASHI Agents

**Hub personal de agentes de IA con ADK de Google - Interfaz elegante para conversaciones multimodales**

![Status](https://img.shields.io/badge/status-in%20development-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript&logoColor=white)

[Demo](#) • [Documentación](#-documentación) • [Roadmap](#-roadmap)

</div>

---

## 🎯 Sobre el Proyecto

**CJHIRASHI Agents** es una aplicación web personal diseñada para integrar y gestionar agentes de IA desarrollados con **Agent Development Kit (ADK)** de Google. Proporciona una interfaz minimalista y elegante inspirada en Vercel para interactuar con agentes multimodales, gestionar conversaciones y administrar usuarios con un sistema robusto de roles y permisos.

### ¿Por qué este proyecto?

La proliferación de agentes de IA especializados requiere una interfaz unificada que permita:
- **Centralizar** interacciones con múltiples agentes ADK
- **Administrar** acceso granular por usuario y agente
- **Mantener contexto** entre conversaciones largas y complejas
- **Visualizar** outputs estructurados (código, tablas, gráficos) de forma óptima
- **Escalar** de uso personal a sistema multi-usuario empresarial

---

## ✨ Características Implementadas

### ✅ Sistema de Autenticación
- 🔐 **NextAuth v4** con Google OAuth
- 🔄 **Estrategia JWT** para sesiones rápidas y escalables
- 👤 **Perfil de Usuario** con avatar y datos en el sidebar
- 🚪 **Login/Logout** con redirección inteligente
- 🛡️ **Middleware de protección** de rutas del dashboard

### ✅ Sistema de Administración
- 👥 **Gestión de Usuarios**
  - Ver todos los usuarios del sistema
  - Cambiar roles (ADMIN / USER)
  - Activar/Desactivar cuentas
  - Ver agentes asignados por usuario

- 🤖 **Gestión de Agentes**
  - Ver todos los agentes del sistema
  - Marcar agentes como públicos/privados
  - Ver creador de cada agente

- 🔑 **Sistema de Permisos Granular**
  - Conceder/revocar acceso a agentes específicos
  - Admins tienen acceso automático a todo
  - Agentes públicos accesibles para todos
  - Permisos individuales por usuario-agente

### ✅ Interfaz de Usuario
- 🎨 **Diseño Minimalista**: Inspirado en Vercel con tema claro/oscuro
- 📱 **Responsive Design**: Sidebar colapsable y menú móvil
- 🤖 **Dashboard de Agentes**: Grid visual con 6 agentes especializados
- 📊 **Tarjetas de Estadísticas**: Métricas de agentes, conversaciones y actividad
- 🧭 **Navegación Intuitiva**: Estados activos y transiciones suaves

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Frontend** | Next.js + Tailwind CSS + shadcn/ui | 15.5.5 / v4 / latest | Interfaz de usuario responsiva |
| **State Management** | Zustand | latest | Gestión de estado global |
| **Backend** | Next.js API Routes + Zod | 15.5.5 / latest | Validación y endpoints API |
| **Base de Datos** | PostgreSQL (Cloud SQL) | - | Persistencia de datos |
| **ORM** | Prisma | 6.17.1 | Abstracción de base de datos |
| **Autenticación** | NextAuth.js v4 | 4.24.11 | OAuth con Google + JWT |
| **Theme** | next-themes | latest | Sistema de temas dark/light/system |
| **Icons** | lucide-react | latest | Iconografía consistente |
| **Agentes IA** | ADK (Google Cloud Run) | - | Ejecución de agentes multimodales |
| **Hosting** | Vercel + Google Cloud Platform | - | Deploy frontend + backend/agentes |

---

## 🗂️ Estructura de Datos

### Modelos Principales

```prisma
model User {
  id               String              @id @default(uuid())
  email            String?             @unique
  name             String?
  role             UserRole            @default(USER)  // ADMIN | USER
  isActive         Boolean             @default(true)
  createdAgents    Agent[]             @relation("CreatedAgents")
  agentPermissions UserAgentPermission[]
  authSessions     Session[]
  chatSessions     ChatSession[]
}

model Agent {
  id              String                @id @default(uuid())
  createdBy       String
  name            String
  description     String?
  model           String
  isPublic        Boolean               @default(false)
  creator         User                  @relation("CreatedAgents")
  userPermissions UserAgentPermission[]
  conversations   Conversation[]
}

model UserAgentPermission {
  id        String   @id @default(uuid())
  userId    String
  agentId   String
  grantedBy String?  // Admin que concedió el permiso
  user      User     @relation(...)
  agent     Agent    @relation(...)

  @@unique([userId, agentId])
}

model ChatSession {
  id            String         @id @default(uuid())
  userId        String
  conversations Conversation[]
}

model Conversation {
  id            String      @id @default(uuid())
  chatSessionId String
  agentId       String
  title         String
  messages      Message[]
}

model Message {
  id      String  @id @default(uuid())
  role    String  // 'user' | 'assistant' | 'system'
  content String  @db.Text
}
```

### Sistema de Permisos

El sistema implementa **4 niveles de acceso** a los agentes:

1. **🔴 ADMIN**: Acceso automático a todos los agentes
2. **🟢 Agentes Públicos**: Accesibles para todos los usuarios activos
3. **🟡 Permisos Explícitos**: Acceso concedido individualmente por admin
4. **🔵 Creador**: El usuario que creó el agente siempre tiene acceso

---

## 🚀 Instalación y Setup

### Prerrequisitos

```bash
# Node.js 18+
node --version

# npm
npm --version
```

### 1. Clonar el repositorio

```bash
git clone https://github.com/cjhirashi/cjhirashi-agents.git
cd cjhirashi-agents
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Database - Cloud SQL (Google Cloud)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret"  # Genera con: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ADK Agents (Opcional)
ADK_AGENT_ENDPOINT="https://your-cloud-run-url"
```

**📚 Para más detalles:**
- Autenticación: [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md)
- Cloud SQL: [docs/CLOUD_SQL_SETUP.md](docs/CLOUD_SQL_SETUP.md)

### 4. Configurar base de datos

```bash
# Generar el cliente de Prisma
npx prisma generate

# Aplicar el schema a la base de datos
npx prisma db push

# (Opcional) Abrir Prisma Studio
npx prisma studio
```

### 5. Configurar usuario administrador

```bash
# Hacer a un usuario administrador
npm run set-admin tu-email@gmail.com
```

### 6. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Build
npm run build            # Construye para producción
npm run start            # Inicia servidor de producción

# Base de datos
npx prisma generate      # Regenera cliente de Prisma
npx prisma db push       # Aplica cambios del schema
npx prisma studio        # Abre interfaz visual de datos

# Administración
npm run set-admin <email>    # Hace a un usuario administrador
```

---

## 📊 Panel de Administración

### Acceso

1. Inicia sesión con tu cuenta de Google
2. Asegúrate de tener rol **ADMIN** (usa `npm run set-admin`)
3. En el sidebar verás la opción "Admin Panel"
4. Accede a: [http://localhost:3000/dashboard/admin](http://localhost:3000/dashboard/admin)

### Características

#### 👥 Pestaña de Usuarios
- **Ver usuarios**: Lista completa con email, rol y estado
- **Cambiar roles**: Switch entre USER y ADMIN
- **Activar/Desactivar**: Control de acceso a la plataforma
- **Ver permisos**: Agentes asignados a cada usuario
- **Gestionar permisos**: Conceder/revocar acceso a agentes específicos

#### 🤖 Pestaña de Agentes
- **Ver todos los agentes**: Lista con creador y modelo
- **Visibilidad**: Marcar agentes como públicos o privados
- **Información**: Descripción y configuración de cada agente

---

## 🗺️ Roadmap

### ✅ Fase 0 - Setup Inicial (Completada)
- [x] Proyecto Next.js 15 con TypeScript
- [x] Tailwind CSS v4 + shadcn/ui
- [x] Theme provider (dark/light/system)
- [x] Componentes UI base
- [x] Landing page

### ✅ Fase 1 - MVP (Completada)
- [x] Dashboard con selector de agentes
- [x] Sidebar colapsable y responsive
- [x] Navegación completa
- [x] **Autenticación con Google OAuth**
- [x] **Sistema de roles (ADMIN/USER)**
- [x] **Panel de administración completo**
- [x] **Gestión de permisos por agente**
- [x] **Middleware de protección de rutas**

### 🚧 Fase 2 - Chat y Agentes (En Progreso)
- [ ] Interfaz de chat funcional
- [ ] Integración con agentes ADK
- [ ] Historial de conversaciones
- [ ] Mensajes en tiempo real
- [ ] Soporte para markdown y código

### 💭 Fase 3 - Artefactos (Planeado)
- [ ] Sistema de artefactos
- [ ] Interfaces adaptativas por agente
- [ ] Respuestas estructuradas complejas
- [ ] Visualizaciones avanzadas

### 🔮 Fase 4 - Avanzado (Futuro)
- [ ] Versionado de outputs
- [ ] Sistema de widgets personalizables
- [ ] Analytics de uso
- [ ] API pública para integraciones

---

## 📚 Documentación

- **[Guía de Autenticación](docs/AUTH_SETUP.md)** - Configurar Google OAuth
- **[Setup de Cloud SQL](docs/CLOUD_SQL_SETUP.md)** - Configurar PostgreSQL en GCP
- **[Migración a Agentes](docs/MIGRATION_TO_AGENTS.md)** - Guía de actualización del sistema de permisos
- **[Dashboard](src/app/dashboard/README.md)** - Uso del dashboard

---

## 🎨 Guía de Diseño

### Paleta de Colores

#### Modo Oscuro (Default)
- **Background**: `#000000` / `#111111`
- **Text**: `#FFFFFF`
- **Accent**: `#06B6D4` (Cyan)

#### Modo Claro
- **Background**: `#FFFFFF` / `#FAFAFA`
- **Text**: `#000000`
- **Accent**: `#06B6D4` (Cyan)

### Principios
1. **Minimalismo Elegante**: Inspirado en Vercel
2. **Responsividad Total**: Mobile-first
3. **Microinteracciones**: Animaciones sutiles
4. **Accesibilidad**: WCAG 2.1 AA

---

## 🤝 Contribuciones

Este es un proyecto personal en desarrollo activo. Sugerencias y bugs:

1. Abre un [Issue](https://github.com/cjhirashi/cjhirashi-agents/issues)
2. Describe el problema o mejora
3. Incluye capturas si es relevante

---

## 📄 Licencia

MIT License - Copyright (c) 2025 Carlos Jiménez Hirashi

---

## 👨‍💻 Autor

**Carlos Jiménez Hirashi** - *Creator & Lead Developer*

- GitHub: [@cjhirashi](https://github.com/cjhirashi)
- Email: [cjhirashi@gmail.com](mailto:cjhirashi@gmail.com)

---

## 🙏 Agradecimientos

- **Google ADK Team** - Framework de agentes de IA
- **Vercel** - Inspiración en diseño y hosting
- **shadcn/ui** - Componentes UI de alta calidad
- **Next.js Team** - El mejor framework React

---

<div align="center">

**CJHIRASHI Agents** • Construido con ❤️ por Carlos

⭐ Star este proyecto si te resulta útil

</div>

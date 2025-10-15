<div align="center">

# 🤖 CJHIRASHI Agents

**Hub personal de agentes de IA con ADK de Google - Interfaz elegante para conversaciones multimodales**

![Status](https://img.shields.io/badge/status-in%20development-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript&logoColor=white)

[Demo](#) • [Documentación](#) • [Roadmap](#-roadmap)

</div>

---

## 🎯 Sobre el Proyecto

**CJHIRASHI Agents** es una aplicación web personal diseñada para integrar y gestionar agentes de IA desarrollados con **Agent Development Kit (ADK)** de Google. Proporciona una interfaz minimalista y elegante inspirada en Vercel para interactuar con agentes multimodales, gestionar conversaciones y visualizar outputs estructurados de forma intuitiva.

### ¿Por qué este proyecto?

La proliferación de agentes de IA especializados requiere una interfaz unificada que permita:
- **Centralizar** interacciones con múltiples agentes ADK
- **Mantener contexto** entre conversaciones largas y complejas
- **Visualizar** outputs estructurados (código, tablas, gráficos) de forma óptima
- **Evolucionar** hacia un sistema de artefactos y widgets personalizables

Este proyecto nace como solución personal pero está arquitecturado para escalar hacia uso multi-usuario empresarial.

---

## ✨ Características

### Fase 1 - MVP (En Desarrollo)

- 🎨 **Interfaz Minimalista**: Diseño inspirado en Vercel con tema claro/oscuro
- 🤖 **Dashboard de Agentes**: Selector visual para múltiples agentes especializados
- 💬 **Chat Interface**: Conversaciones fluidas con soporte markdown y código
- 📚 **Historial Persistente**: Almacenamiento y búsqueda de conversaciones previas
- 🔐 **Autenticación Personal**: Login seguro con Google OAuth

### Fase 2 - Artefactos (Planeado)

- 📦 Sistema de artefactos para outputs complejos
- 🎛️ Interfaces adaptativas según tipo de agente
- 📊 Respuestas estructuradas con visualizaciones avanzadas

### Fase 3 - Avanzado (Futuro)

- 🕐 Versionado de outputs generados
- 🧩 Sistema de widgets personalizables
- 👥 Soporte multi-usuario con roles
- 📈 Visualizaciones y analytics de uso

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

```mermaid
graph LR
    A[Cliente Web] -->|Next.js 15| B[Frontend Layer]
    B -->|API Routes| C[Backend Layer]
    C -->|Prisma| D[(Cloud SQL PostgreSQL)]
    C -->|HTTP| E[Cloud Run - ADK Agents]
    B -->|NextAuth v4| F[Google OAuth]
    
    style A fill:#06B6D4,stroke:#333,stroke-width:2px,color:#000
    style B fill:#000,stroke:#06B6D4,stroke-width:2px,color:#fff
    style C fill:#000,stroke:#06B6D4,stroke-width:2px,color:#fff
    style D fill:#316192,stroke:#333,stroke-width:2px,color:#fff
    style E fill:#4285F4,stroke:#333,stroke-width:2px,color:#fff
    style F fill:#DB4437,stroke:#333,stroke-width:2px,color:#fff
```

### Componentes del Stack

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Frontend** | Next.js + Tailwind CSS + shadcn/ui | 15.5.5 / v4 / latest | Interfaz de usuario responsiva y moderna |
| **State Management** | Zustand | latest | Gestión de estado global ligera |
| **Backend** | Next.js API Routes + Zod | 15.5.5 / latest | Validación y endpoints API |
| **Base de Datos** | PostgreSQL (Cloud SQL) | - | Persistencia de datos |
| **ORM** | Prisma | latest | Abstracción de base de datos |
| **Autenticación** | NextAuth.js v4 | latest | Autenticación OAuth con Google |
| **Theme** | next-themes | latest | Sistema de temas dark/light/system |
| **Icons** | lucide-react | latest | Iconografía consistente |
| **Agentes IA** | ADK (Google Cloud Run) | - | Ejecución de agentes multimodales |
| **Hosting** | Vercel + Google Cloud Platform | - | Deploy frontend + backend/agentes |

---

## 🗂️ Estructura de Datos

### Diagrama Entidad-Relación

```mermaid
erDiagram
    USER ||--o{ SESSION : creates
    USER ||--o{ AGENT : owns
    SESSION ||--o{ CONVERSATION : contains
    CONVERSATION ||--o{ MESSAGE : includes
    AGENT ||--o{ CONVERSATION : participates
    
    USER {
        uuid id PK
        string email
        string name
        string image
        datetime created_at
        datetime updated_at
    }
    
    AGENT {
        uuid id PK
        uuid user_id FK
        string name
        string description
        string model
        json config
        string endpoint_url
        datetime created_at
    }
    
    SESSION {
        uuid id PK
        uuid user_id FK
        datetime started_at
        datetime last_activity
        json metadata
    }
    
    CONVERSATION {
        uuid id PK
        uuid session_id FK
        uuid agent_id FK
        string title
        datetime created_at
        datetime updated_at
    }
    
    MESSAGE {
        uuid id PK
        uuid conversation_id FK
        string role
        text content
        json metadata
        datetime timestamp
    }
```

### Modelos de Datos (Prisma Schema)

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  image         String?
  sessions      Session[]
  agents        Agent[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Agent {
  id            String         @id @default(uuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id])
  name          String
  description   String?
  model         String
  config        Json?
  endpointUrl   String
  conversations Conversation[]
  createdAt     DateTime       @default(now())
}

model Session {
  id            String         @id @default(uuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id])
  startedAt     DateTime       @default(now())
  lastActivity  DateTime       @updatedAt
  metadata      Json?
  conversations Conversation[]
}

model Conversation {
  id          String    @id @default(uuid())
  sessionId   String
  session     Session   @relation(fields: [sessionId], references: [id])
  agentId     String
  agent       Agent     @relation(fields: [agentId], references: [id])
  title       String
  messages    Message[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Message {
  id              String       @id @default(uuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  role            String       // 'user' | 'assistant' | 'system'
  content         String       @db.Text
  metadata        Json?
  timestamp       DateTime     @default(now())
}
```

---

## 🔄 Flujo del Sistema

### Flujo Completo de Interacción

```mermaid
flowchart TD
    A[Usuario accede a la app] --> B{¿Autenticado?}
    B -->|No| C[Redirect a Login Google OAuth]
    C --> D[NextAuth valida credenciales]
    D --> E[Crea/actualiza User en DB]
    E --> F[Redirect a Dashboard]
    
    B -->|Sí| F
    F --> G[Dashboard: Lista de agentes disponibles]
    G --> H[Usuario selecciona agente]
    H --> I[Carga interfaz de chat]
    
    I --> J[Usuario envía mensaje]
    J --> K[Frontend: Envía POST a /api/chat]
    K --> L[Backend: Valida request con Zod]
    L --> M[Backend: Guarda mensaje en DB]
    M --> N[Backend: Llama a Cloud Run Agent]
    
    N --> O{Respuesta exitosa?}
    O -->|Sí| P[Parsea respuesta del agente]
    P --> Q[Guarda mensaje assistant en DB]
    Q --> R[Retorna respuesta al frontend]
    R --> S[Frontend: Renderiza respuesta]
    S --> T[Actualiza UI con markdown/código]
    
    O -->|No| U[Maneja error]
    U --> V[Muestra mensaje de error al usuario]
    
    T --> W{¿Continuar conversación?}
    W -->|Sí| J
    W -->|No| X[Guarda conversación]
    X --> Y[Usuario puede navegar historial]
    
    style A fill:#06B6D4,stroke:#333,stroke-width:2px,color:#000
    style F fill:#000,stroke:#06B6D4,stroke-width:2px,color:#fff
    style I fill:#000,stroke:#06B6D4,stroke-width:2px,color:#fff
    style S fill:#10B981,stroke:#333,stroke-width:2px,color:#000
    style V fill:#EF4444,stroke:#333,stroke-width:2px,color:#fff
```

---

## 📊 Dashboard

El dashboard es el corazón de la aplicación, proporcionando una interfaz intuitiva para gestionar y acceder a tus agentes de IA.

### Características del Dashboard

#### Sidebar de Navegación
- **Colapsable**: Maximiza el espacio de trabajo con el botón de contraer/expandir
- **Responsive**: En móvil se transforma en un menú hamburguesa accesible mediante Sheet
- **Navegación Organizada**:
  - **Principal**: Dashboard, Agentes, Conversaciones
  - **Historial**: Mis Chats
  - **Configuración**: Documentación, Ajustes
- **Estados Activos**: Resalta visualmente la página actual
- **Perfil de Usuario**: Sección inferior con avatar y datos (placeholder para autenticación)

#### Página Principal del Dashboard
- **Tarjetas de Estadísticas**:
  - Agentes Disponibles
  - Conversaciones Activas
  - Última Actividad
- **Grid de Agentes**: 6 agentes especializados con diseño elegante
  - Code Assistant (Cyan) - Programación y debugging
  - Data Analyst (Purple) - Análisis de datos
  - Content Writer (Emerald) - Creación de contenido
  - Research Assistant (Amber) - Investigación
  - Creative Designer (Rose) - Diseño UI/UX
  - DevOps Expert (Blue) - Infraestructura y CI/CD
- **Tarjetas Interactivas**: Efectos hover con animaciones suaves

#### Páginas de Navegación
- `/dashboard` - Vista principal con estadísticas y agentes
- `/dashboard/agents` - Exploración de agentes
- `/dashboard/conversations` - Conversaciones activas
- `/dashboard/history` - Historial de chats
- `/dashboard/docs` - Documentación y guías
- `/dashboard/settings` - Configuración de preferencias

Para más detalles sobre el uso del dashboard, consulta [src/app/dashboard/README.md](src/app/dashboard/README.md)

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

### 2. Instalar dependencias del proyecto

El proyecto ya viene con `package.json` configurado. Instala todas las dependencias:

```bash
npm install
```

### 3. Componentes y librerías instaladas

El proyecto incluye:

**Core:**
- Next.js 15.5.5
- React 19
- TypeScript 5.0+
- Tailwind CSS v4

**UI Components (shadcn/ui):**
- button, card, input, textarea
- avatar, dropdown-menu, separator
- scroll-area, sonner (notifications)

**State & Auth:**
- Zustand (state management)
- NextAuth.js v4 (authentication)

**Database:**
- Prisma (ORM)
- @prisma/client

**Utilities:**
- next-themes (theme management)
- zod (validation)
- lucide-react (icons)
- class-variance-authority, clsx, tailwind-merge

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```bash
cp .env.example .env
```

Luego edita `.env` con tus credenciales:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"  # Genera uno con: openssl rand -base64 32

# Google OAuth (obtén en: https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ADK Agents (Opcional por ahora)
ADK_AGENT_ENDPOINT="https://your-cloud-run-url"
```

**Para más detalles sobre la configuración de autenticación, consulta [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md)**

### 5. Configurar base de datos

```bash
# Generar el cliente de Prisma
npx prisma generate

# Aplicar el schema a la base de datos
npx prisma db push

# (Opcional) Abrir Prisma Studio para ver los datos
npx prisma studio
```

### 6. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 7. Verificar funcionamiento

- ✅ La página de inicio debe cargar
- ✅ El toggle de tema (esquina superior derecha) debe cambiar entre dark/light/system
- ✅ Los estilos deben verse correctamente en ambos temas
- ✅ El sidebar debe mostrar la navegación correctamente
- ✅ La autenticación con Google debe funcionar (si configuraste las credenciales)

---

## 🗺️ Roadmap

### ✅ Fase 0 - Setup Inicial (Completada)

- [x] Crear repositorio GitHub
- [x] Generar README con arquitectura completa
- [x] Inicializar proyecto Next.js 15 con TypeScript
- [x] Configurar Tailwind CSS v4
- [x] Instalar y configurar shadcn/ui (New York style, Slate theme)
- [x] Implementar theme provider (dark/light/system)
- [x] Crear componente ThemeToggle
- [x] Instalar componentes UI base (button, card, input, textarea, avatar, dropdown-menu, separator, scroll-area, sonner)
- [x] Crear landing page inicial
- [x] Verificar servidor de desarrollo funcionando

### 🚧 Fase 1 - MVP (En Progreso)

#### Completado
- [x] Setup base gráfica (navbar, sidebar, layout)
- [x] Dashboard: selector de agentes
- [x] Crear componente Sidebar colapsable y responsive
- [x] Crear layout del dashboard con navegación
- [x] Implementar páginas de navegación (Agentes, Conversaciones, Historial, Docs, Settings)
- [x] Diseñar tarjetas de agentes con 6 variantes de color
- [x] Agregar 6 agentes mock (Code Assistant, Data Analyst, Content Writer, Research Assistant, Creative Designer, DevOps Expert)
- [x] Implementar estados activos en navegación
- [x] Dashboard con estadísticas (Agentes, Conversaciones, Actividad)

#### En Desarrollo
- [ ] Chat interface básica
- [ ] Integración con primer agente ADK
- [ ] Historial de conversaciones funcional

#### Completado Recientemente
- [x] Integrar autenticación (NextAuth + Google)
- [x] Setup Prisma con modelos de NextAuth
- [x] Crear modelos de datos (User, Account, AuthSession, VerificationToken)
- [x] Sidebar con información de usuario autenticado
- [x] Página de inicio de sesión con Google OAuth
- [x] Página de error de autenticación
- [x] SessionProvider en layout principal
- [x] Menú de usuario con opciones (Perfil, Configuración, Cerrar sesión)

#### Pendiente
- [ ] Configurar Cloud SQL en Google Cloud
- [ ] Deploy a Vercel
- [ ] Configurar variables de entorno de producción

**ETA Fase 1:** Marzo 2025

### 💭 Fase 2 - Artefactos (Planeado)

- [ ] Sistema de artefactos
- [ ] Interfaces adaptativas por tipo de agente
- [ ] Respuestas estructuradas complejas

**ETA Fase 2:** Abril 2025

### 🔮 Fase 3 - Avanzado (Futuro)

- [ ] Versionado de outputs
- [ ] Sistema de widgets
- [ ] Multi-usuario con roles
- [ ] Consultas a datos históricos
- [ ] Visualizaciones avanzadas

**ETA Fase 3:** Q3 2025

---

## 🎨 Guía de Diseño

### Paleta de Colores

#### Modo Oscuro (Default)
- **Background Primary:** `#000000`
- **Background Secondary:** `#111111`
- **Text Primary:** `#FFFFFF`
- **Accent:** `#06B6D4` (Cyan)

#### Modo Claro
- **Background Primary:** `#FFFFFF`
- **Background Secondary:** `#FAFAFA`
- **Text Primary:** `#000000`
- **Accent:** `#06B6D4` (Cyan)

### Principios de Diseño

1. **Minimalismo Elegante**: Inspirado en Vercel - limpio, espaciado generoso, tipografía clara
2. **Responsividad Total**: Mobile-first approach con breakpoints optimizados
3. **Microinteracciones**: Animaciones sutiles que mejoran la experiencia
4. **Accesibilidad**: WCAG 2.1 AA compliance en contraste y navegación

---

## 🤝 Contribuciones

Este es un proyecto personal en desarrollo activo. Si tienes sugerencias o encuentras bugs:

1. Abre un [Issue](https://github.com/cjhirashi/cjhirashi-agents/issues)
2. Describe el problema o mejora propuesta
3. Incluye capturas de pantalla si es relevante

---

## 📄 Licencia

Este proyecto está licenciado bajo la [MIT License](LICENSE).

```txt
MIT License

Copyright (c) 2025 Carlos Jiménez Hirashi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 👨‍💻 Autor

**Carlos Jiménez Hirashi** - *Creator & Lead Developer*

- GitHub: [@cjhirashi](https://github.com/cjhirashi)
- LinkedIn: [@cjhirashi](https://linkedin.com/in/cjhirashi)
- Email: [cjhirashi@gmail.com](mailto:cjhirashi@gmail.com)

---

## 🙏 Agradecimientos

- **Google ADK Team** - Por el framework de agentes de IA
- **Vercel** - Inspiración en diseño y hosting platform
- **shadcn/ui** - Componentes UI de alta calidad
- **Next.js Team** - Por el mejor framework React

---

<div align="center">

**CJHIRASHI Agents** • Construido con ❤️ por Carlos

⭐ Star este proyecto si te resulta útil

</div>
<div align="center">

# 🤖 CJHIRASHI Agents

**Sistema Completo de Asistentes IA Personalizados con Gestión de Salud y Finanzas**

![Status](https://img.shields.io/badge/status-in%20development-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.17-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

[Demo](https://agents.cjhirashi.com) • [Documentación](#-documentación) • [Roadmap](#-roadmap)

</div>

---

## 🎯 Sobre el Proyecto

**CJHIRASHI Agents** es una plataforma integral que combina **asistentes IA personalizados** con **gestión de salud** y **finanzas personales**. Diseñado para ofrecer una experiencia única donde los agentes de IA aprenden de ti y te ayudan a tomar mejores decisiones en tu vida diaria.

### ¿Por qué este proyecto?

La vida moderna requiere gestionar múltiples áreas de forma inteligente:
- 💊 **Salud**: Medicamentos, citas médicas, mediciones vitales
- 💰 **Finanzas**: Presupuestos, transacciones, deudas, inversiones
- 🤖 **IA Personalizada**: Agentes que aprenden tu personalidad y preferencias
- 📊 **Insights Inteligentes**: Análisis automáticos con IA para mejorar tu vida

**CJHIRASHI Agents** unifica todo en una plataforma segura, privada y escalable.

---

## ✨ Características Principales

### 🤖 Sistema de Agentes IA

- **Asistente Personal**: Con acceso a todos tus datos de salud y finanzas
- **Doctor IA**: Especializado en gestión de salud y medicamentos
- **Asesor Financiero IA**: Experto en presupuestos y análisis financiero
- **Agentes Personalizados**: Crea tus propios agentes con configuración custom
- **Conversaciones con Memoria**: Los agentes recuerdan el contexto
- **Artefactos Versionados**: Genera código, documentos e imágenes con control de versiones
- **Streaming Responses**: Respuestas en tiempo real

### 🏥 Sistema de Salud

- **Gestión de Medicamentos**
  - Recordatorios inteligentes
  - Tracking de adherencia (% cumplimiento)
  - Historial completo de tomas

- **Citas Médicas**
  - Calendario de citas
  - Recordatorios automáticos (24h, 2h, 30min)
  - Historial de consultas

- **Mediciones de Salud**
  - Peso, presión arterial, glucosa, temperatura
  - Gráficas de tendencias
  - Integración con wearables (Apple Health, Google Fit)

- **Análisis IA**
  - Insights automáticos de salud
  - Alertas inteligentes
  - Recomendaciones personalizadas

### 💰 Sistema Financiero

- **Cuentas y Transacciones**
  - Múltiples cuentas bancarias
  - Categorización automática con IA
  - Búsqueda y filtrado avanzado

- **Presupuestos Inteligentes**
  - Por categoría (alimentación, transporte, etc.)
  - Alertas al 80%, 100% y excedido
  - Comparación mensual

- **Gestión de Deudas**
  - Calculadora de pagos
  - Estrategias de liquidación (avalancha, bola de nieve)
  - Tracking de intereses

- **Análisis IA**
  - Insights financieros mensuales
  - Pronósticos de flujo de efectivo
  - Recomendaciones de ahorro

### 👥 Sistema de Usuarios

- **Autenticación Segura**: OAuth2 con Google
- **Roles y Permisos**: SUPER_ADMIN, ADMIN, USER, GUEST
- **Perfil de Personalidad IA**: Análisis Big Five automático
- **Sistema de Invitaciones**: Invita usuarios por email
- **Suscripciones**: FREE (100 msg/mes), PRO ($20), BUSINESS ($99)

### 🔒 Seguridad y Privacidad

- **Encriptación AES-256**: Para datos sensibles (salud, finanzas)
- **HIPAA Compliant**: Cumplimiento de normativas médicas
- **GDPR Ready**: Derecho al olvido, portabilidad de datos
- **Auditoría Completa**: Logs inmutables de todas las acciones
- **2FA (próximamente)**: Autenticación de dos factores

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Frontend** | Next.js + React 19 | 15 | App Router, Server Components |
| **Styling** | Tailwind CSS v4 + shadcn/ui | 4 / latest | Diseño responsivo y componentes |
| **State** | Zustand | latest | Estado global cliente |
| **Backend** | Next.js API Routes | 15 | Endpoints RESTful |
| **Validation** | Zod | latest | Validación de schemas |
| **Database** | Neon PostgreSQL | - | Serverless, scale-to-zero |
| **ORM** | Prisma | 6.17.1 | Type-safe database access |
| **Auth** | NextAuth v4 | 4.24.11 | OAuth + JWT |
| **IA** | Google Gemini 2.0 Flash | latest | Agentes y análisis |
| **Email** | Resend | latest | Notificaciones |
| **Cache** | Upstash Redis | latest | Performance y rate limiting |
| **Hosting** | Vercel | - | Edge functions + CDN |

### Arquitectura de 7 Capas

```
┌─────────────────────────────────────────┐
│     Frontend (Next.js 15 + React 19)    │ ← Usuario
├─────────────────────────────────────────┤
│        API Layer (Next.js Routes)       │ ← Endpoints RESTful
├─────────────────────────────────────────┤
│      Business Logic (Services)          │ ← Lógica de negocio
├─────────────────────────────────────────┤
│     Data Access (Prisma Repositories)   │ ← Abstracción DB
├─────────────────────────────────────────┤
│         Database (Neon PostgreSQL)      │ ← 32 tablas
├─────────────────────────────────────────┤
│    External Services (Gemini, Resend)   │ ← Servicios externos
└─────────────────────────────────────────┘
```

### Base de Datos (32 Tablas)

**6 Esquemas Lógicos**:

1. **👥 Usuarios** (6 tablas): Auth, permisos, invitaciones, perfil IA
2. **🏥 Salud** (7 tablas): Medicamentos, citas, alergias, mediciones
3. **💰 Finanzas** (8 tablas): Cuentas, transacciones, presupuestos, deudas
4. **🤖 Agentes** (6 tablas): Agentes, conversaciones, mensajes, artefactos
5. **📊 Métricas** (4 tablas): Logs de uso, costos, alertas
6. **🔍 Auditoría** (1 tabla): Trazabilidad completa

---

## 🚀 Instalación y Setup

### Prerrequisitos

```bash
# Node.js 18+
node --version

# npm 9+
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

Crea un archivo `.env` en la raíz:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Google AI (Gemini)
GOOGLE_AI_API_KEY="your-gemini-api-key"

# Encryption (genera con openssl rand -hex 32)
ENCRYPTION_KEY="your-32-byte-hex-key"

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"

# Email (Resend)
RESEND_API_KEY="re_your-api-key"
```

**📚 Guías detalladas:**
- [Autenticación](docs/architecture/03-SECURITY.md)
- [Base de Datos](docs/architecture/02-DATABASE.md)

### 4. Configurar base de datos

```bash
# Generar cliente de Prisma
npx prisma generate

# Aplicar schema (usa schema-v2.prisma para el sistema completo)
npx prisma db push --schema=prisma/schema-v2.prisma

# (Opcional) Abrir Prisma Studio
npx prisma studio
```

### 5. Configurar primer usuario

```bash
# Hacer tu email super admin
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
npm run dev              # Servidor de desarrollo
npm run build            # Build para producción
npm run start            # Servidor de producción
npm run lint             # Linter

# Base de datos
npx prisma generate      # Regenerar cliente
npx prisma db push       # Aplicar schema
npx prisma studio        # UI visual
npx prisma migrate dev   # Crear migración

# Administración
npm run set-admin <email>    # Crear super admin
```

---

## 📊 Panel de Administración

### Acceso

1. Inicia sesión con Google
2. Asegúrate de tener rol **ADMIN** o **SUPER_ADMIN**
3. Accede al menú "Admin" en el sidebar
4. URL: [http://localhost:3000/admin](http://localhost:3000/admin)

### Funcionalidades

#### 👥 Gestión de Usuarios
- Ver todos los usuarios del sistema
- Cambiar roles (SUPER_ADMIN, ADMIN, USER)
- Activar/Desactivar cuentas
- Enviar invitaciones por email
- Ver y modificar límites de uso
- Eliminar usuarios (GDPR compliance)

#### 🤖 Gestión de Agentes
- Ver todos los agentes
- Marcar como públicos/privados
- Ver métricas de uso
- Gestionar permisos de acceso

#### 📊 Métricas Globales
- Usuarios activos
- Tokens consumidos
- Costos totales
- Conversaciones diarias

---

## 🗺️ Roadmap

### ✅ Fase 1 - MVP (Completada)

- [x] Proyecto Next.js 15 con TypeScript
- [x] Autenticación con Google OAuth
- [x] Sistema RBAC completo
- [x] Panel de administración
- [x] Base de datos con Neon
- [x] **Migración de Google Cloud SQL → Neon**
- [x] **Deployment en Vercel**

### ✅ Fase 2 - Documentación (Completada)

- [x] Arquitectura general (3 diagramas)
- [x] Base de datos (5 diagramas, ERD completo)
- [x] Seguridad (8 diagramas, HIPAA/GDPR)
- [x] Escalabilidad (roadmap 12 meses)
- [x] API Reference (60+ endpoints)
- [x] Sistema de Usuarios
- [x] Sistema de Salud
- [x] Sistema Financiero
- [x] Sistema de Agentes
- [x] **14 documentos, 40+ diagramas Mermaid, 25,000 líneas**

### 🚧 Fase 3 - Implementación de Chat (En Progreso)

- [ ] Interfaz de chat con streaming
- [ ] Integración con Gemini 2.0
- [ ] Historial de conversaciones
- [ ] Sistema de artefactos
- [ ] Soporte markdown y código

### 💭 Fase 4 - Sistema de Salud (Planeado)

- [ ] CRUD de medicamentos
- [ ] Recordatorios inteligentes
- [ ] Calendario de citas
- [ ] Gráficas de mediciones
- [ ] Análisis IA de salud

### 🔮 Fase 5 - Sistema Financiero (Planeado)

- [ ] Gestión de cuentas
- [ ] Tracking de transacciones
- [ ] Presupuestos con alertas
- [ ] Calculadora de deudas
- [ ] Análisis IA financiero

### 🎯 Fase 6 - Avanzado (Futuro)

- [ ] Perfil IA automático
- [ ] Integraciones (Apple Health, Google Fit)
- [ ] Webhooks
- [ ] API pública
- [ ] Mobile app (React Native)

---

## 📚 Documentación

### 📖 Documentación Completa

Toda la documentación está en [`/docs`](docs/):

#### Arquitectura
- **[Visión General](docs/architecture/01-OVERVIEW.md)** - Arquitectura de 7 capas
- **[Base de Datos](docs/architecture/02-DATABASE.md)** - Schema completo con ERD
- **[Seguridad](docs/architecture/03-SECURITY.md)** - RBAC, encriptación, HIPAA
- **[Escalabilidad](docs/architecture/04-SCALABILITY.md)** - Caching, replicas, roadmap

#### Sistemas
- **[Sistema de Usuarios](docs/systems/users/README.md)** - RBAC, invitaciones, perfil IA
- **[Sistema de Salud](docs/systems/health/README.md)** - Medicamentos, citas, análisis
- **[Sistema Financiero](docs/systems/finance/README.md)** - Presupuestos, deudas, IA
- **[Sistema de Agentes](docs/systems/agents/README.md)** - Conversaciones, artefactos

#### API
- **[API Reference](docs/api/README.md)** - 60+ endpoints documentados

#### Agentes
- **[Personal Assistant](docs/agents/personal-assistant/README.md)** - Agente base
- **[Plantilla de Agentes](docs/agents/_TEMPLATE/README.md)** - Para crear nuevos

### 📊 Estadísticas de Documentación

- **14 documentos** técnicos completos
- **40+ diagramas Mermaid** profesionales
- **25,000 líneas** de documentación
- **32 tablas** documentadas
- **92% cobertura** total

---

## 🎨 Guía de Diseño

### Paleta de Colores

Los diagramas y documentación usan **azules oscuros**:

- Primary: `#1e3a8a`
- Secondary: `#1e40af`, `#2563eb`
- Accent: `#3b82f6`, `#60a5fa`

### Interfaz de Usuario

- **Minimalismo**: Inspirado en Vercel
- **Dark Mode**: Por defecto
- **Responsive**: Mobile-first
- **Accesibilidad**: WCAG 2.1 AA

---

## 🔐 Seguridad

### Características de Seguridad

✅ **Encriptación AES-256-GCM** para datos sensibles
✅ **OAuth2** con Google
✅ **JWT** con expiración de 30 días
✅ **RBAC** con 4 roles y permisos granulares
✅ **Auditoría completa** de acciones críticas
✅ **Rate limiting** por tier de suscripción
✅ **CSRF protection**
✅ **XSS prevention**
✅ **SQL injection** prevention (Prisma ORM)

### Cumplimiento

- **HIPAA**: Para datos de salud
- **GDPR**: Derecho al olvido, portabilidad
- **SOC 2** (futuro)

---

## 🤝 Contribuciones

Este es un proyecto personal en desarrollo activo. Para contribuir:

1. Abre un [Issue](https://github.com/cjhirashi/cjhirashi-agents/issues)
2. Fork el repositorio
3. Crea una rama: `git checkout -b feature/mi-feature`
4. Commit: `git commit -m 'Add: nueva feature'`
5. Push: `git push origin feature/mi-feature`
6. Abre un Pull Request

### Código de Conducta

- Sé respetuoso
- Usa commits descriptivos
- Documenta cambios importantes
- Tests para nuevas features

---

## 📄 Licencia

MIT License - Copyright (c) 2025 Carlos Jiménez Hirashi

Ver [LICENSE](LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Carlos Jiménez Hirashi** - *Creator & Lead Developer*

- 🌐 Website: [cjhirashi.com](https://cjhirashi.com)
- 💼 GitHub: [@cjhirashi](https://github.com/cjhirashi)
- 📧 Email: [cjhirashi@gmail.com](mailto:cjhirashi@gmail.com)
- 🐦 Twitter: [@cjhirashi](https://twitter.com/cjhirashi)

---

## 🙏 Agradecimientos

- **Google AI Team** - Gemini API y documentación
- **Vercel** - Plataforma de hosting y design inspiration
- **shadcn/ui** - Componentes UI de alta calidad
- **Next.js Team** - El mejor framework React
- **Prisma Team** - ORM type-safe increíble
- **Neon** - PostgreSQL serverless

---

## 📞 Soporte

¿Necesitas ayuda?

- 📖 Lee la [documentación completa](docs/)
- 🐛 Reporta bugs en [Issues](https://github.com/cjhirashi/cjhirashi-agents/issues)
- 💬 Contáctame: [cjhirashi@gmail.com](mailto:cjhirashi@gmail.com)

---

<div align="center">

### 🌟 CJHIRASHI Agents

**Tu asistente personal inteligente para una vida mejor**

Construido con ❤️ por Carlos Jiménez Hirashi

⭐ **Star este proyecto** si te resulta útil

[Ver Demo](https://agents.cjhirashi.com) • [Documentación](docs/) • [Reportar Bug](https://github.com/cjhirashi/cjhirashi-agents/issues)

---

**Versión**: 2.0.0 | **Última actualización**: Octubre 2025

</div>

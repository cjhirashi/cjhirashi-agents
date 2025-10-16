# 📚 Documentación Técnica - CJHIRASHI Agents

**Sistema de Asistente Personal de IA con Múltiples Agentes Especializados**

Versión: 2.0.0
Última actualización: 15 de octubre, 2025
Autor: Carlos Jiménez Hirashi

---

## 📋 Índice General

### 1. Arquitectura del Sistema
- [🏗️ Visión General de Arquitectura](./architecture/01-OVERVIEW.md)
- [🗄️ Arquitectura de Base de Datos](./architecture/02-DATABASE.md)
- [🔐 Arquitectura de Seguridad](./architecture/03-SECURITY.md)
- [⚡ Arquitectura de Escalabilidad](./architecture/04-SCALABILITY.md)
- [🔄 Flujos de Datos](./architecture/05-DATA-FLOWS.md)

### 2. Sistemas Principales

#### 2.1 Sistema de Usuarios
- [👥 Gestión de Usuarios](./systems/users/01-USER-MANAGEMENT.md)
- [🔑 Roles y Permisos](./systems/users/02-ROLES-PERMISSIONS.md)
- [📧 Sistema de Invitaciones](./systems/users/03-INVITATIONS.md)
- [🔐 Autenticación y Sesiones](./systems/users/04-AUTHENTICATION.md)
- [🧠 Perfil de Personalidad IA](./systems/users/05-AI-PROFILE.md)

#### 2.2 Sistema de Salud
- [🏥 Visión General del Sistema de Salud](./systems/health/01-OVERVIEW.md)
- [💊 Gestión de Medicamentos](./systems/health/02-MEDICATIONS.md)
- [🩺 Condiciones Médicas](./systems/health/03-CONDITIONS.md)
- [📅 Citas y Recordatorios](./systems/health/04-APPOINTMENTS.md)
- [📊 Métricas de Salud](./systems/health/05-MEASUREMENTS.md)
- [⚠️ Alergias y Emergencias](./systems/health/06-ALLERGIES-EMERGENCY.md)

#### 2.3 Sistema Financiero
- [💰 Visión General del Sistema Financiero](./systems/finance/01-OVERVIEW.md)
- [🏦 Gestión de Cuentas](./systems/finance/02-ACCOUNTS.md)
- [📊 Transacciones y Categorización](./systems/finance/03-TRANSACTIONS.md)
- [💳 Presupuestos](./systems/finance/04-BUDGETS.md)
- [📈 Inversiones](./systems/finance/05-INVESTMENTS.md)
- [💸 Gestión de Deudas](./systems/finance/06-DEBTS.md)
- [🔄 Pagos Recurrentes](./systems/finance/07-RECURRING-PAYMENTS.md)
- [🤖 Análisis IA Financiero](./systems/finance/08-AI-ANALYSIS.md)

#### 2.4 Sistema de Agentes
- [🤖 Arquitectura de Agentes](./systems/agents/01-ARCHITECTURE.md)
- [📝 Creación de Agentes](./systems/agents/02-AGENT-CREATION.md)
- [💬 Sistema de Conversaciones](./systems/agents/03-CONVERSATIONS.md)
- [🎨 Artefactos y Versionamiento](./systems/agents/04-ARTIFACTS.md)
- [📊 Métricas y Analytics](./systems/agents/05-METRICS.md)
- [🔌 Integración ADK](./systems/agents/06-ADK-INTEGRATION.md)

#### 2.5 Sistema de Suscripciones
- [💳 Planes y Límites](./systems/subscriptions/01-PLANS-LIMITS.md)
- [📊 Tracking de Uso](./systems/subscriptions/02-USAGE-TRACKING.md)
- [⚠️ Alertas y Notificaciones](./systems/subscriptions/03-ALERTS.md)
- [💰 Facturación (Futuro)](./systems/subscriptions/04-BILLING.md)

### 3. Agentes Especializados

#### 3.1 Asistente Personal (Base)
- [📖 Documentación del Asistente Personal](./agents/personal-assistant/README.md)
- [🎯 Capacidades y Funciones](./agents/personal-assistant/CAPABILITIES.md)
- [📚 Guía de Uso](./agents/personal-assistant/USER-GUIDE.md)
- [🔧 Configuración](./agents/personal-assistant/CONFIGURATION.md)
- [📊 Estadísticas y Métricas](./agents/personal-assistant/METRICS.md)

#### 3.2 [Plantilla para Nuevos Agentes]
- [📖 Documentación del Agente](./agents/_TEMPLATE/README.md)
- [🎯 Capacidades y Funciones](./agents/_TEMPLATE/CAPABILITIES.md)
- [📚 Guía de Uso](./agents/_TEMPLATE/USER-GUIDE.md)
- [🔧 Configuración](./agents/_TEMPLATE/CONFIGURATION.md)
- [📊 Estadísticas y Métricas](./agents/_TEMPLATE/METRICS.md)

### 4. API Reference
- [🔌 API Overview](./api/01-OVERVIEW.md)
- [👥 Users API](./api/02-USERS.md)
- [🏥 Health API](./api/03-HEALTH.md)
- [💰 Finance API](./api/04-FINANCE.md)
- [🤖 Agents API](./api/05-AGENTS.md)
- [💬 Conversations API](./api/06-CONVERSATIONS.md)
- [📊 Analytics API](./api/07-ANALYTICS.md)
- [🔐 Authentication](./api/08-AUTHENTICATION.md)

### 5. Guías de Desarrollo
- [🚀 Getting Started](./guides/01-GETTING-STARTED.md)
- [🔧 Configuración Local](./guides/02-LOCAL-SETUP.md)
- [🐳 Docker Setup](./guides/03-DOCKER-SETUP.md)
- [🌐 Deployment](./guides/04-DEPLOYMENT.md)
- [🧪 Testing](./guides/05-TESTING.md)
- [📝 Estándares de Código](./guides/06-CODE-STANDARDS.md)
- [🔄 Contribución](./guides/07-CONTRIBUTING.md)

### 6. Diagramas
- [🏗️ Arquitectura General](./diagrams/system-architecture.md)
- [🗄️ Diagrama de Base de Datos](./diagrams/database-schema.md)
- [🔄 Flujos de Usuario](./diagrams/user-flows.md)
- [🤖 Flujo de Agentes](./diagrams/agent-flows.md)
- [🔐 Flujo de Autenticación](./diagrams/auth-flow.md)
- [💰 Flujo Financiero](./diagrams/finance-flow.md)
- [🏥 Flujo de Salud](./diagrams/health-flow.md)

---

## 🎯 Inicio Rápido

### Para Usuarios
1. [Crear una cuenta](./guides/user/01-ACCOUNT-CREATION.md)
2. [Configurar perfil](./guides/user/02-PROFILE-SETUP.md)
3. [Primer agente](./guides/user/03-FIRST-AGENT.md)

### Para Desarrolladores
1. [Clonar el repositorio](./guides/01-GETTING-STARTED.md#clone)
2. [Configurar entorno](./guides/02-LOCAL-SETUP.md)
3. [Crear tu primer agente](./guides/dev/01-CREATE-AGENT.md)

### Para Administradores
1. [Panel de administración](./guides/admin/01-ADMIN-PANEL.md)
2. [Gestión de usuarios](./guides/admin/02-USER-MANAGEMENT.md)
3. [Monitoreo del sistema](./guides/admin/03-MONITORING.md)

---

## 🔍 Buscar en la Documentación

- **Usuarios**: Si buscas cómo usar una función, ve a [Guías de Usuario](./guides/user/)
- **Desarrolladores**: Si buscas APIs o arquitectura, ve a [API Reference](./api/)
- **Administradores**: Si buscas gestión del sistema, ve a [Guías Admin](./guides/admin/)

---

## 📞 Soporte

- **Email**: cjhirashi@gmail.com
- **Issues**: [GitHub Issues](https://github.com/cjhirashi/cjhirashi-agents/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cjhirashi/cjhirashi-agents/discussions)

---

## 📄 Licencia

MIT License - Copyright (c) 2025 Carlos Jiménez Hirashi

---

**Última actualización**: 15 de octubre, 2025

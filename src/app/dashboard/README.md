# 📊 Dashboard - Guía de Uso

## Descripción General

El Dashboard de **cjhirashi agents** es la interfaz principal para gestionar y acceder a tus agentes de IA. Proporciona una experiencia intuitiva con navegación organizada, estadísticas en tiempo real y acceso rápido a todas las funcionalidades de la aplicación.

---

## 🎨 Componentes Principales

### 1. Sidebar (Barra Lateral)

La sidebar es el sistema de navegación principal de la aplicación.

#### Características:
- **Colapsable**: Haz clic en el botón "Contraer" en la parte inferior para maximizar el espacio de trabajo
- **Responsive**: En dispositivos móviles, el sidebar se oculta automáticamente y es accesible mediante el menú hamburguesa
- **Estados Activos**: La página actual se resalta con color primario y fondo destacado
- **Tooltips**: Cuando está colapsado, muestra tooltips con los nombres de las secciones

#### Secciones de Navegación:

##### 🔵 Principal
- **Dashboard**: Vista principal con estadísticas y acceso rápido a agentes
- **Agentes**: Exploración completa de todos los agentes disponibles
- **Conversaciones**: Gestión de conversaciones activas

##### 🟡 Historial
- **Mis Chats**: Acceso al historial de conversaciones anteriores

##### 🟢 Configuración
- **Documentación**: Guías y recursos de ayuda
- **Ajustes**: Configuración de preferencias de usuario

#### Perfil de Usuario
En la parte inferior del sidebar (visible solo cuando está expandido):
- Avatar del usuario
- Nombre y email
- *Nota: Actualmente muestra datos mock. Se integrará con autenticación en futuras versiones.*

---

### 2. Dashboard Principal (`/dashboard`)

#### Tarjetas de Estadísticas

Tres tarjetas informativas en la parte superior:

**Agentes Disponibles**
- Muestra el número total de agentes listos para usar
- Actualmente: 6 agentes especializados

**Conversaciones**
- Contador de conversaciones activas del mes
- Se actualizará cuando se implemente el sistema de chat

**Última Actividad**
- Indicador de la última interacción con un agente
- Pendiente de implementación con sistema de historial

#### Grid de Agentes

Muestra todos los agentes disponibles en un diseño de tarjetas responsivo:

| Agente | Color | Especialidad | Tags |
|--------|-------|--------------|------|
| **Code Assistant** | Cyan | Programación, debugging y arquitectura | Código, Debugging, Arquitectura |
| **Data Analyst** | Purple | Análisis de datos y visualizaciones | Datos, Analytics, Visualización |
| **Content Writer** | Emerald | Creación de contenido profesional | Escritura, Marketing, Docs |
| **Research Assistant** | Amber | Investigación y síntesis | Investigación, Síntesis, Documentación |
| **Creative Designer** | Rose | Diseño UI/UX y conceptos visuales | Diseño, UI/UX, Creatividad |
| **DevOps Expert** | Blue | Infraestructura y CI/CD | DevOps, CI/CD, Cloud |

#### Interacciones con Tarjetas de Agentes:
- **Hover**: Efecto de escala suave y brillo en el borde
- **Click**: Redirige a la interfaz de chat con el agente seleccionado (próximamente)
- **Iconos**: Indicador visual del tipo de agente

---

### 3. Página de Agentes (`/dashboard/agents`)

Vista dedicada para explorar todos los agentes disponibles.

**Características:**
- Vista completa de todos los agentes en grid
- Mismas tarjetas interactivas que el dashboard principal
- Enfoque exclusivo en la exploración de agentes

**Uso:**
- Navega desde el sidebar: Principal → Agentes
- Explora las capacidades de cada agente
- Selecciona un agente para iniciar conversación

---

### 4. Página de Conversaciones (`/dashboard/conversations`)

Gestión de tus conversaciones activas con los agentes.

**Estado Actual:**
- Placeholder para futuras conversaciones
- Se implementará cuando se desarrolle la interfaz de chat

**Funcionalidades Planeadas:**
- Lista de conversaciones activas
- Información de último mensaje
- Filtrado y búsqueda de conversaciones
- Acceso rápido para continuar chats

---

### 5. Página de Historial (`/dashboard/history`)

Acceso a todas tus conversaciones pasadas.

**Estado Actual:**
- Placeholder para historial de conversaciones
- Se implementará junto con el sistema de persistencia

**Funcionalidades Planeadas:**
- Búsqueda de conversaciones por fecha, agente o contenido
- Visualización de métricas de uso
- Exportación de conversaciones
- Favoritos y etiquetado

---

### 6. Página de Documentación (`/dashboard/docs`)

Recursos y guías para aprovechar al máximo la plataforma.

**Secciones Planificadas:**
- **Introducción**: Conceptos básicos de cjhirashi agents
- **Guía de Uso**: Cómo interactuar efectivamente con los agentes
- **API Reference**: Documentación técnica para desarrolladores

**Estado Actual:**
- Estructura base implementada
- Contenido en desarrollo

---

### 7. Página de Ajustes (`/dashboard/settings`)

Configuración personalizada de la aplicación.

**Categorías de Configuración:**

**Perfil**
- Gestión de información personal
- Avatar y datos de usuario

**Notificaciones**
- Preferencias de notificaciones
- Alertas de actividad

**Apariencia**
- Tema (Dark/Light/System)
- Personalización de interfaz

**Privacidad y Seguridad**
- Control de datos
- Configuración de seguridad

**Estado Actual:**
- Estructura de categorías definida
- Implementación pendiente de sistema de autenticación

---

## 📱 Diseño Responsive

### Desktop (≥768px)
- Sidebar siempre visible
- Grid de 3 columnas para agentes
- Máxima información visible

### Tablet (≥640px)
- Sidebar colapsable
- Grid de 2 columnas para agentes
- Navegación optimizada

### Mobile (<640px)
- Sidebar oculto, accesible mediante menú hamburguesa
- Grid de 1 columna para agentes
- Header móvil con logo y menú

---

## 🎯 Flujo de Navegación Recomendado

### Primera Visita
1. Inicia en la **Landing Page** (`/`)
2. Haz clic en "Comenzar" para acceder al Dashboard
3. Explora los agentes disponibles en el grid
4. Selecciona un agente para iniciar conversación (próximamente)

### Uso Recurrente
1. Accede directamente al **Dashboard** (`/dashboard`)
2. Revisa tus estadísticas en las tarjetas superiores
3. Continúa conversaciones desde **Conversaciones**
4. Consulta historial desde **Mis Chats**

### Exploración
1. Navega a **Agentes** para ver todos los agentes disponibles
2. Lee la **Documentación** para aprender mejores prácticas
3. Personaliza tu experiencia en **Ajustes**

---

## 🔧 Arquitectura del Dashboard

### Estructura de Archivos

```
src/app/dashboard/
├── layout.tsx              # Layout principal con sidebar
├── page.tsx                # Dashboard principal
├── agents/
│   └── page.tsx           # Página de agentes
├── conversations/
│   └── page.tsx           # Página de conversaciones
├── history/
│   └── page.tsx           # Página de historial
├── docs/
│   └── page.tsx           # Página de documentación
├── settings/
│   └── page.tsx           # Página de ajustes
└── README.md              # Este archivo
```

### Componentes Utilizados

**Componentes de UI (shadcn/ui):**
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardDescription`
- `Button`
- `Separator`
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetTrigger`

**Componentes Personalizados:**
- `Sidebar` - Navegación lateral
- `AgentCard` - Tarjeta de agente individual
- `AgentGrid` - Grid de agentes

**Iconos (lucide-react):**
- `LayoutDashboard`, `Bot`, `MessageSquare`
- `History`, `FileText`, `Settings`
- `Menu`, `ChevronLeft`, `ChevronRight`

---

## 🚀 Próximas Implementaciones

### Corto Plazo
- [ ] Interfaz de chat funcional
- [ ] Integración con agentes ADK
- [ ] Sistema de conversaciones en tiempo real

### Mediano Plazo
- [ ] Autenticación con Google OAuth
- [ ] Persistencia de conversaciones en base de datos
- [ ] Búsqueda y filtrado de conversaciones
- [ ] Estadísticas reales de uso

### Largo Plazo
- [ ] Sistema de artefactos
- [ ] Widgets personalizables
- [ ] Exportación de conversaciones
- [ ] Analíticas avanzadas

---

## 📖 Recursos Adicionales

- **README Principal**: [Ver README.md](../../../README.md)
- **Documentación de Next.js**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com

---

## 💡 Tips de Uso

### Maximizar Productividad
1. **Usa atajos de teclado** (próximamente)
2. **Colapsa el sidebar** cuando necesites más espacio
3. **Guarda conversaciones importantes** en favoritos (próximamente)

### Mejores Prácticas
1. Explora cada agente para entender sus capacidades
2. Lee la documentación para interacciones más efectivas
3. Organiza tus conversaciones con etiquetas (próximamente)

---

## 🐛 Problemas Conocidos

Ninguno reportado actualmente. Si encuentras algún problema, por favor repórtalo en [GitHub Issues](https://github.com/cjhirashi/cjhirashi-agents/issues).

---

## 📝 Changelog

### v0.1.0 - 2025-01-14
- ✅ Implementación inicial del dashboard
- ✅ Sidebar colapsable y responsive
- ✅ 6 páginas de navegación
- ✅ Grid de agentes con 6 agentes mock
- ✅ Tarjetas de estadísticas
- ✅ Estados activos en navegación
- ✅ Diseño responsive completo

---

<div align="center">

**¿Preguntas o sugerencias?**

Contacta a Carlos Jiménez Hirashi - [cjhirashi@gmail.com](mailto:cjhirashi@gmail.com)

</div>

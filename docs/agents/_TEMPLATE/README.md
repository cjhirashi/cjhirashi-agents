# 🤖 [Nombre del Agente]

**Categoría**: [personal / productivity / creative / data / other]
**Modelo**: [gemini-2.0-flash / claude-3-opus / etc]
**Versión**: 1.0.0
**Estado**: [En desarrollo / Activo / Mantenimiento]

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Capacidades](#capacidades)
3. [Casos de Uso](#casos-de-uso)
4. [Configuración](#configuración)
5. [Guía de Uso](#guía-de-uso)
6. [Métricas y Estadísticas](#métricas-y-estadísticas)
7. [Base de Conocimiento](#base-de-conocimiento)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Descripción General

[Descripción breve del agente - 2-3 líneas]

### Propósito

[¿Para qué sirve este agente? ¿Qué problema resuelve?]

### Público Objetivo

- [Tipo de usuario 1]
- [Tipo de usuario 2]

---

## ⚡ Capacidades

### Funciones Principales

| Capacidad | Descripción | Ejemplo |
|-----------|-------------|---------|
| [Función 1] | [Descripción detallada] | [Ejemplo de uso] |
| [Función 2] | [Descripción detallada] | [Ejemplo de uso] |
| [Función 3] | [Descripción detallada] | [Ejemplo de uso] |

### Limitaciones

- ❌ [Limitación 1]
- ❌ [Limitación 2]
- ⚠️ [Precaución 1]

---

## 💼 Casos de Uso

### Caso 1: [Nombre del caso]

**Escenario**: [Descripción del escenario]

**Flujo**:
1. Usuario: [Acción del usuario]
2. Agente: [Respuesta del agente]
3. Usuario: [Siguiente acción]
4. Agente: [Resultado final]

**Resultado esperado**: [Qué debe lograr]

### Caso 2: [Nombre del caso]

[Repetir estructura]

---

## ⚙️ Configuración

### Configuración Básica

\`\`\`typescript
{
  "name": "[nombre-del-agente]",
  "slug": "[url-slug]",
  "model": "[modelo-ia]",
  "config": {
    "temperature": 0.7,
    "maxTokens": 4000,
    "topP": 0.9
  },
  "systemPrompt": "Eres un asistente...",
  "capabilities": [
    "[capacidad-1]",
    "[capacidad-2]"
  ]
}
\`\`\`

### Variables de Entorno

\`\`\`bash
# Endpoint del agente
[AGENT_NAME]_ENDPOINT="https://..."

# API Keys (si aplica)
[AGENT_NAME]_API_KEY="..."

# Configuración específica
[AGENT_NAME]_MAX_RETRIES=3
\`\`\`

### Parámetros Avanzados

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| temperature | float | 0.7 | Creatividad de las respuestas |
| maxTokens | int | 4000 | Tokens máximos por respuesta |
| contextWindow | int | 32000 | Ventana de contexto |

---

## 📖 Guía de Uso

### Inicio Rápido

1. **Activar el agente**
   \`\`\`
   1. Ve a Dashboard → Agentes
   2. Selecciona "[Nombre del Agente]"
   3. Click en "Iniciar Conversación"
   \`\`\`

2. **Primera interacción**
   \`\`\`
   Usuario: "Hola, ¿qué puedes hacer?"
   Agente: [Respuesta de bienvenida]
   \`\`\`

3. **Comandos básicos**
   - `/help` - Muestra ayuda
   - `/config` - Muestra configuración actual
   - `/reset` - Reinicia la conversación

### Comandos Avanzados

#### Comando: `/[nombre-comando]`

**Descripción**: [Qué hace este comando]

**Sintaxis**:
\`\`\`
/[nombre-comando] [parámetro1] [parámetro2]
\`\`\`

**Ejemplo**:
\`\`\`
Usuario: /[ejemplo-comando] valor1 valor2
Agente: [Resultado esperado]
\`\`\`

### Mejores Prácticas

✅ **DO**:
- [Práctica recomendada 1]
- [Práctica recomendada 2]

❌ **DON'T**:
- [Práctica no recomendada 1]
- [Práctica no recomendada 2]

---

## 📊 Métricas y Estadísticas

### Dashboard de Métricas

El agente rastrea las siguientes métricas:

| Métrica | Descripción | Visualización |
|---------|-------------|---------------|
| Total de usos | Conversaciones iniciadas | Contador |
| Mensajes totales | Mensajes procesados | Gráfica de línea |
| Tokens usados | Consumo de tokens | Gráfica de barras |
| Rating promedio | Satisfacción del usuario | Estrellas (1-5) |
| Tiempo de respuesta | Latencia promedio | ms |

### Estadísticas del Usuario

Cada usuario puede ver sus propias estadísticas:

\`\`\`
┌─────────────────────────────────────┐
│  📊 Tus Estadísticas                │
├─────────────────────────────────────┤
│  Conversaciones: 45                 │
│  Mensajes enviados: 230             │
│  Tokens usados: 125K                │
│  Artefactos creados: 12             │
│  Última interacción: Hace 2 horas   │
└─────────────────────────────────────┘
\`\`\`

### Exportar Datos

\`\`\`bash
# Exportar métricas a CSV
curl -X GET /api/agents/[agent-id]/metrics/export \
  -H "Authorization: Bearer <token>" \
  -o metrics.csv
\`\`\`

---

## 📚 Base de Conocimiento

### Fuentes de Información

Este agente tiene acceso a:

1. **[Fuente 1]**: [Descripción]
2. **[Fuente 2]**: [Descripción]
3. **[Fuente 3]**: [Descripción]

### Actualización de Conocimiento

- **Frecuencia**: [Diaria / Semanal / Manual]
- **Última actualización**: [Fecha]
- **Próxima actualización**: [Fecha]

### Limitaciones de Conocimiento

El agente NO tiene información sobre:
- [Limitación 1]
- [Limitación 2]

---

## 🔌 API Reference

### Endpoints

#### POST /api/agents/[agent-slug]/chat

**Descripción**: Envía un mensaje al agente

**Request**:
\`\`\`typescript
{
  "message": "Tu mensaje aquí",
  "conversationId": "uuid", // opcional
  "metadata": {
    "context": "adicional"
  }
}
\`\`\`

**Response**:
\`\`\`typescript
{
  "response": "Respuesta del agente",
  "conversationId": "uuid",
  "tokensUsed": 150,
  "metadata": {
    "model": "gemini-2.0-flash",
    "duration": 850
  }
}
\`\`\`

#### GET /api/agents/[agent-slug]/artifacts

**Descripción**: Obtiene artefactos generados

**Query Params**:
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 20)
- `type`: Tipo de artefacto (opcional)

**Response**:
\`\`\`typescript
{
  "artifacts": [
    {
      "id": "uuid",
      "name": "Nombre",
      "type": "code",
      "version": 1,
      "createdAt": "2025-10-15T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
\`\`\`

---

## 🔧 Troubleshooting

### Problemas Comunes

#### El agente no responde

**Síntomas**: No hay respuesta después de enviar mensaje

**Solución**:
1. Verifica tu conexión a internet
2. Revisa el estado del agente en Dashboard
3. Reinicia la conversación con `/reset`

#### Respuestas lentas

**Síntomas**: El agente tarda más de 10 segundos

**Causas posibles**:
- Alto tráfico en el sistema
- Consulta muy compleja
- Problema con el endpoint

**Solución**:
1. Reduce la complejidad de la consulta
2. Espera unos minutos y reintenta
3. Contacta a soporte si persiste

#### Error: "Rate limit exceeded"

**Causa**: Has excedido el límite de mensajes por minuto

**Solución**:
- Espera 60 segundos antes de enviar otro mensaje
- Considera actualizar tu plan de suscripción

### Logs y Debugging

#### Activar modo debug

\`\`\`typescript
// En la consola del navegador
localStorage.setItem('debug', 'agent:[agent-name]');
\`\`\`

#### Ver logs

\`\`\`bash
# Logs del servidor
tail -f logs/agent-[name].log

# Filtrar errores
grep "ERROR" logs/agent-[name].log
\`\`\`

---

## 🆘 Soporte

### Canales de Soporte

- **Email**: support@cjhirashi-agents.com
- **Discord**: [Link al servidor]
- **Issues**: [GitHub Issues](https://github.com/cjhirashi/cjhirashi-agents/issues)

### Reportar un Bug

1. Ve a [GitHub Issues](https://github.com/cjhirashi/cjhirashi-agents/issues/new)
2. Usa la plantilla "Bug Report"
3. Incluye:
   - Descripción del problema
   - Pasos para reproducir
   - Screenshots (si aplica)
   - Logs relevantes

---

## 📝 Changelog

### v1.0.0 (2025-10-15)
- ✨ Lanzamiento inicial
- [Lista de features]

---

## 📄 Licencia

Este agente es parte del proyecto CJHIRASHI Agents.
Ver [LICENSE](../../../LICENSE) para más información.

---

**Última actualización**: [Fecha]
**Mantenedor**: [Nombre]
**Feedback**: [Link a formulario]

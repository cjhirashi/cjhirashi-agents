import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from '@/lib/logging/logger';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

/**
 * Genera una respuesta automática de IA para un ticket de soporte
 */
export async function generateAISupportResponse(
  title: string,
  description: string,
  category: string
): Promise<string | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Eres un asistente de soporte técnico para CJHIRASHI Agents, una plataforma de asistentes IA personalizados.

Usuario ha reportado el siguiente problema:

**Título**: ${title}
**Categoría**: ${category}
**Descripción**: ${description}

Tu tarea es:
1. Analizar el problema
2. Proporcionar una solución clara y paso a paso si es posible
3. Si no puedes resolver completamente, ofrecer pasos de diagnóstico
4. Ser amable, profesional y conciso

**IMPORTANTE**:
- Si el problema es simple (ejemplo: cómo usar una funcionalidad), proporciona la solución completa
- Si es complejo (bug, error técnico), sugiere pasos de diagnóstico y menciona que un administrador revisará el caso
- Usa formato markdown para mejor legibilidad
- Limita tu respuesta a 300 palabras máximo

Responde de forma clara y útil:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return text;
  } catch (error) {
    logger.error("Error generating AI support response", {
      error: error instanceof Error ? error.message : 'Unknown error',
      category,
    });
    return null;
  }
}

/**
 * Analiza si la IA puede resolver el problema automáticamente
 */
export async function canAIResolve(
  title: string,
  description: string,
  category: string
): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Analiza si el siguiente problema puede ser resuelto automáticamente con una guía sin intervención humana:

**Título**: ${title}
**Categoría**: ${category}
**Descripción**: ${description}

Responde SOLO con "SI" si:
- Es una pregunta sobre cómo usar una funcionalidad
- Es un problema común con solución documentada
- Requiere pasos simples que el usuario puede hacer

Responde SOLO con "NO" si:
- Es un bug o error técnico
- Requiere acceso al sistema por parte de un administrador
- Es un problema de cuenta o facturación
- Requiere investigación técnica

Responde SOLO con una palabra: SI o NO`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim().toUpperCase();

    return text === "SI";
  } catch (error) {
    logger.error("Error analyzing AI resolution", {
      error: error instanceof Error ? error.message : 'Unknown error',
      category,
    });
    return false;
  }
}

/**
 * Genera un mensaje de seguimiento inteligente basado en la conversación
 */
export async function generateAIFollowUp(
  ticketHistory: Array<{ role: string; content: string }>
): Promise<string | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const conversationText = ticketHistory
      .map((msg) => `[${msg.role}]: ${msg.content}`)
      .join("\n\n");

    const prompt = `Eres un asistente de soporte. Esta es la conversación actual:

${conversationText}

Genera un mensaje de seguimiento inteligente que:
1. Resuma el estado actual
2. Ofrezca ayuda adicional si es necesario
3. Sea breve (máximo 100 palabras)
4. Use formato markdown

Genera el mensaje:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return text;
  } catch (error) {
    logger.error("Error generating AI follow-up", {
      error: error instanceof Error ? error.message : 'Unknown error',
      historyLength: ticketHistory.length,
    });
    return null;
  }
}

/**
 * System Prompts for Different Use Cases
 *
 * Pre-defined system prompts optimized for different scenarios.
 * Can be extended with RAG context when available.
 */

/**
 * System prompt types
 */
export type SystemPromptType = 'default' | 'code' | 'analysis' | 'creative';

/**
 * Pre-defined system prompts
 */
export const SYSTEM_PROMPTS: Record<SystemPromptType, string> = {
  default: `You are a helpful AI assistant powered by cjhirashi-agents.
You provide accurate, concise, and professional responses.
Always be respectful and focus on helping the user achieve their goals.`,

  code: `You are an expert software engineer and coding assistant.
You write clean, efficient, and well-documented code.
You follow best practices and explain your reasoning.
When providing code, include comments and explain the logic.
Prioritize clarity, maintainability, and performance.`,

  analysis: `You are a data analyst and problem-solving expert.
You provide thorough analysis with clear reasoning.
Break down complex problems into manageable parts.
Support your conclusions with evidence and logic.
Be precise and objective in your assessments.`,

  creative: `You are a creative writing assistant.
You help generate engaging, original content.
You adapt your tone and style to the user's needs.
Be imaginative while maintaining coherence and quality.
Focus on clarity, flow, and impact.`,
};

/**
 * Build system prompt with optional RAG context
 *
 * @param type - Type of system prompt (default, code, analysis, creative)
 * @param ragContext - Optional RAG context to inject
 * @returns Complete system prompt
 */
export function buildSystemPrompt(
  type: SystemPromptType = 'default',
  ragContext?: string
): string {
  const basePrompt = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.default;

  if (!ragContext || ragContext.trim().length === 0) {
    return basePrompt;
  }

  // Inject RAG context
  return `${basePrompt}

---

RELEVANT CONTEXT:
${ragContext}

---

Use the provided context to answer the user's question accurately.
If the answer is not in the context, say "I don't have that information in the provided context."
Always cite the source when using context.`;
}

/**
 * Detect prompt type from user message
 *
 * Simple heuristic to auto-detect the best system prompt type
 *
 * @param message - User message
 * @returns Detected prompt type
 */
export function detectPromptType(message: string): SystemPromptType {
  const lowerMessage = message.toLowerCase();

  // Code-related keywords
  if (
    lowerMessage.includes('code') ||
    lowerMessage.includes('function') ||
    lowerMessage.includes('implement') ||
    lowerMessage.includes('bug') ||
    lowerMessage.includes('debug') ||
    lowerMessage.includes('error')
  ) {
    return 'code';
  }

  // Analysis-related keywords
  if (
    lowerMessage.includes('analyze') ||
    lowerMessage.includes('analysis') ||
    lowerMessage.includes('compare') ||
    lowerMessage.includes('explain') ||
    lowerMessage.includes('why') ||
    lowerMessage.includes('how')
  ) {
    return 'analysis';
  }

  // Creative keywords
  if (
    lowerMessage.includes('write') ||
    lowerMessage.includes('create') ||
    lowerMessage.includes('story') ||
    lowerMessage.includes('poem') ||
    lowerMessage.includes('creative')
  ) {
    return 'creative';
  }

  // Default
  return 'default';
}

/**
 * Build system prompt with auto-detection
 *
 * @param message - User message (for auto-detection)
 * @param ragContext - Optional RAG context
 * @returns Complete system prompt
 */
export function buildSystemPromptAuto(
  message: string,
  ragContext?: string
): string {
  const type = detectPromptType(message);
  return buildSystemPrompt(type, ragContext);
}

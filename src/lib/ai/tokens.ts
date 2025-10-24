/**
 * Token Counting and Cost Calculation Utilities
 *
 * Provides functions to estimate token usage and calculate costs.
 * Uses a simple character-based approximation (1 token ≈ 4 characters).
 */

/**
 * Estimate tokens from text
 *
 * Simple approximation: 1 token ≈ 4 characters
 * For production, use tiktoken library for accurate counting
 *
 * @param text - Text to count tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;

  // Average: 1 token = ~4 characters
  const estimatedTokens = Math.ceil(text.length / 4);

  return estimatedTokens;
}

/**
 * Calculate cost based on tokens and cost per 1k tokens
 *
 * @param tokens - Number of tokens
 * @param costPer1kTokens - Cost per 1,000 tokens
 * @returns Cost in dollars (rounded to 6 decimals)
 */
export function calculateCost(
  tokens: number,
  costPer1kTokens: number
): number {
  if (tokens <= 0 || costPer1kTokens <= 0) return 0;

  const cost = (tokens / 1000) * costPer1kTokens;

  // Round to 6 decimal places (e.g., $0.000123)
  return Math.round(cost * 1000000) / 1000000;
}

/**
 * Calculate total cost from input and output tokens
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param inputCostPer1k - Cost per 1k input tokens
 * @param outputCostPer1k - Cost per 1k output tokens
 * @returns Total cost in dollars
 */
export function calculateTotalCost(
  inputTokens: number,
  outputTokens: number,
  inputCostPer1k: number,
  outputCostPer1k: number
): number {
  const inputCost = calculateCost(inputTokens, inputCostPer1k);
  const outputCost = calculateCost(outputTokens, outputCostPer1k);

  return inputCost + outputCost;
}

/**
 * Format cost for display
 *
 * @param cost - Cost in dollars
 * @returns Formatted cost string (e.g., "$0.000123")
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

/**
 * Estimate cost for a prompt
 *
 * @param prompt - Prompt text
 * @param costPer1kTokens - Average cost per 1k tokens
 * @returns Estimated cost
 */
export function estimatePromptCost(
  prompt: string,
  costPer1kTokens: number
): number {
  const tokens = estimateTokens(prompt);
  return calculateCost(tokens, costPer1kTokens);
}

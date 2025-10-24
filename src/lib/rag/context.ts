/**
 * RAG Context Builder
 *
 * Build context from relevant documents for LLM prompts:
 * 1. Perform semantic search
 * 2. Format results into context string
 * 3. Inject into system prompt
 * 4. Track token usage
 *
 * @module lib/rag/context
 */

import { semanticSearch, hasIndexedDocuments } from './search';
import logger from '@/lib/logging/logger';
import type { SearchOptions, SearchResult } from './search';

// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

export interface RAGContextOptions {
  userId: string;
  query: string;
  topK?: number;
  similarityThreshold?: number;
  maxTokens?: number; // Maximum tokens for context
  includeMetadata?: boolean;
}

export interface RAGContext {
  context: string;
  isEmpty: boolean;
  resultsUsed: number;
  estimatedTokens: number;
  sources: Array<{
    filename: string;
    score: number;
    contentType: string;
  }>;
}

// ═══════════════════════════════════════════════════════════
// MAIN CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Build RAG context for LLM prompt
 *
 * Performs semantic search and formats results into context string
 * suitable for injection into system prompt
 *
 * @param options - Context options
 * @returns RAG context object
 */
export async function buildRAGContext(
  options: RAGContextOptions
): Promise<RAGContext> {
  const {
    userId,
    query,
    topK = 5,
    similarityThreshold = 0.7,
    maxTokens = 2000,
    includeMetadata = true,
  } = options;

  logger.info('[RAG Context] Building context', {
    userId,
    query: query.substring(0, 100),
    topK,
    similarityThreshold,
    maxTokens,
  });

  try {
    // Check if user has indexed documents
    const hasDocuments = await hasIndexedDocuments(userId);

    if (!hasDocuments) {
      logger.info('[RAG Context] No indexed documents found', { userId });

      return {
        context: '',
        isEmpty: true,
        resultsUsed: 0,
        estimatedTokens: 0,
        sources: [],
      };
    }

    // Perform semantic search
    const searchResponse = await semanticSearch({
      userId,
      query,
      topK,
      similarityThreshold,
    });

    if (searchResponse.results.length === 0) {
      logger.info('[RAG Context] No relevant results found', {
        userId,
        query: query.substring(0, 100),
      });

      return {
        context: '',
        isEmpty: true,
        resultsUsed: 0,
        estimatedTokens: 0,
        sources: [],
      };
    }

    // Format results into context string
    const { contextString, resultsUsed, estimatedTokens } = formatContext(
      searchResponse.results,
      maxTokens,
      includeMetadata
    );

    // Extract sources
    const sources = searchResponse.results.slice(0, resultsUsed).map((result) => ({
      filename: result.metadata.filename,
      score: result.score,
      contentType: result.metadata.contentType,
    }));

    logger.info('[RAG Context] Context built successfully', {
      resultsUsed,
      estimatedTokens,
      totalResults: searchResponse.results.length,
      userId,
    });

    return {
      context: contextString,
      isEmpty: false,
      resultsUsed,
      estimatedTokens,
      sources,
    };
  } catch (error) {
    logger.error('[RAG Context] Failed to build context', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      query: query.substring(0, 100),
    });

    return {
      context: '',
      isEmpty: true,
      resultsUsed: 0,
      estimatedTokens: 0,
      sources: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════
// FORMATTING FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Format search results into context string
 *
 * Combines results into formatted string with metadata
 * Respects maxTokens limit
 *
 * @param results - Search results
 * @param maxTokens - Maximum tokens for context
 * @param includeMetadata - Include source metadata
 * @returns Formatted context object
 */
function formatContext(
  results: SearchResult[],
  maxTokens: number,
  includeMetadata: boolean
): {
  contextString: string;
  resultsUsed: number;
  estimatedTokens: number;
} {
  const contextParts: string[] = [];
  let totalTokens = 0;
  let resultsUsed = 0;

  for (const result of results) {
    const { content, metadata, score } = result;

    // Format chunk with metadata
    let chunkText = '';

    if (includeMetadata) {
      chunkText += `[Source: ${metadata.filename} | Relevance: ${(score * 100).toFixed(1)}%]\n`;
    }

    chunkText += content;

    // Estimate tokens (rough: 1 token ≈ 4 characters)
    const chunkTokens = Math.ceil(chunkText.length / 4);

    // Check if adding this chunk exceeds maxTokens
    if (totalTokens + chunkTokens > maxTokens) {
      logger.info('[RAG Context] Token limit reached', {
        totalTokens,
        maxTokens,
        resultsUsed,
      });
      break;
    }

    contextParts.push(chunkText);
    totalTokens += chunkTokens;
    resultsUsed++;
  }

  const contextString = contextParts.join('\n\n---\n\n');

  return {
    contextString,
    resultsUsed,
    estimatedTokens: totalTokens,
  };
}

/**
 * Inject RAG context into system prompt
 *
 * Prepends context to existing system prompt with clear separation
 *
 * @param basePrompt - Base system prompt
 * @param ragContext - RAG context object
 * @returns Enhanced system prompt
 */
export function injectRAGContext(
  basePrompt: string,
  ragContext: RAGContext
): string {
  if (ragContext.isEmpty) {
    return basePrompt;
  }

  const contextPrompt = `
# Relevant Context from User's Documents

The following information has been retrieved from the user's documents based on their query.
Use this context to provide more accurate and personalized responses.

**Important:**
- Base your answer primarily on the provided context
- If the context doesn't contain relevant information, say so
- Cite sources when referencing specific information

---

${ragContext.context}

---

# Original Instructions

${basePrompt}
`;

  return contextPrompt.trim();
}

/**
 * Generate context summary
 *
 * Creates a brief summary of what context was used
 *
 * @param ragContext - RAG context object
 * @returns Context summary string
 */
export function generateContextSummary(ragContext: RAGContext): string {
  if (ragContext.isEmpty) {
    return 'No relevant documents found.';
  }

  const sourcesList = ragContext.sources
    .map(
      (source, index) =>
        `${index + 1}. ${source.filename} (${(source.score * 100).toFixed(1)}% relevant)`
    )
    .join('\n');

  return `
Used ${ragContext.resultsUsed} relevant section(s) from your documents:

${sourcesList}

Estimated tokens used: ${ragContext.estimatedTokens}
`;
}

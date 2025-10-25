/**
 * RAG Semantic Search
 *
 * Semantic search functionality using Pinecone vector database:
 * 1. Generate embedding for query
 * 2. Search Pinecone for similar vectors
 * 3. Return top-K relevant chunks with metadata
 * 4. Filter by similarity threshold
 *
 * @module lib/rag/search
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { getPineconeIndex } from '@/lib/pinecone';
import logger from '@/lib/logging/logger';
import prisma from '@/lib/db/prisma';
import type { DocumentContentType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

export interface SearchOptions {
  userId: string;
  query: string;
  topK?: number;
  similarityThreshold?: number;
  contentType?: DocumentContentType;
  language?: string;
}

export interface SearchResult {
  content: string;
  score: number;
  metadata: {
    documentId: string;
    chunkIndex: number;
    filename: string;
    contentType: string;
    language: string;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  query: string;
  threshold: number;
}

// ═══════════════════════════════════════════════════════════
// MAIN SEARCH FUNCTION
// ═══════════════════════════════════════════════════════════

/**
 * Perform semantic search on user's documents
 *
 * Steps:
 * 1. Generate embedding for query
 * 2. Search Pinecone in user's namespace
 * 3. Filter by similarity threshold
 * 4. Enrich with document metadata
 * 5. Return top-K results
 *
 * @param options - Search options
 * @returns Search response with ranked results
 */
export async function semanticSearch(
  options: SearchOptions
): Promise<SearchResponse> {
  const {
    userId,
    query,
    topK = 5,
    similarityThreshold = 0.7,
    contentType,
    language,
  } = options;

  logger.info('[RAG Search] Starting semantic search', {
    userId,
    query: query.substring(0, 100), // Log first 100 chars
    topK,
    similarityThreshold,
    contentType,
    language,
  });

  try {
    // ═══════════════════════════════════════════════════════
    // STEP 1: Validate Pinecone availability
    // ═══════════════════════════════════════════════════════

    const pineconeIndex = getPineconeIndex();

    if (!pineconeIndex) {
      logger.warn('[RAG Search] Pinecone not configured, returning empty results');
      return {
        results: [],
        totalResults: 0,
        query,
        threshold: similarityThreshold,
      };
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: Initialize embeddings model
    // ═══════════════════════════════════════════════════════

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    });

    // ═══════════════════════════════════════════════════════
    // STEP 3: Create Pinecone store with user namespace
    // ═══════════════════════════════════════════════════════

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace: userId,
      textKey: 'text',
    });

    logger.info('[RAG Search] Vector store initialized', {
      namespace: userId,
    });

    // ═══════════════════════════════════════════════════════
    // STEP 4: Perform similarity search
    // ═══════════════════════════════════════════════════════

    const searchResults = await vectorStore.similaritySearchWithScore(query, topK);

    logger.info('[RAG Search] Similarity search completed', {
      resultsFound: searchResults.length,
      userId,
    });

    // ═══════════════════════════════════════════════════════
    // STEP 5: Filter by similarity threshold
    // ═══════════════════════════════════════════════════════

    const filteredResults = searchResults.filter(([_, score]) => score >= similarityThreshold);

    logger.info('[RAG Search] Results filtered by threshold', {
      beforeFiltering: searchResults.length,
      afterFiltering: filteredResults.length,
      threshold: similarityThreshold,
    });

    // ═══════════════════════════════════════════════════════
    // STEP 6: Enrich with document metadata
    // ═══════════════════════════════════════════════════════

    const enrichedResults: SearchResult[] = await Promise.all(
      filteredResults.map(async ([doc, score]) => {
        const metadata = doc.metadata as Record<string, unknown>;

        // Get document info from database (optional - for additional metadata)
        let documentInfo = null;
        if (metadata.documentId) {
          documentInfo = await prisma.document.findUnique({
            where: { id: metadata.documentId },
            select: {
              filename: true,
              originalName: true,
              contentType: true,
              language: true,
            },
          });
        }

        return {
          content: doc.pageContent,
          score,
          metadata: {
            documentId: metadata.documentId || 'unknown',
            chunkIndex: metadata.chunkIndex || 0,
            filename: documentInfo?.originalName || metadata.filename || 'unknown',
            contentType: documentInfo?.contentType || metadata.contentType || 'GENERAL',
            language: documentInfo?.language || metadata.language || 'es',
          },
        };
      })
    );

    // ═══════════════════════════════════════════════════════
    // STEP 7: Apply additional filters (contentType, language)
    // ═══════════════════════════════════════════════════════

    let finalResults = enrichedResults;

    if (contentType) {
      finalResults = finalResults.filter(
        (result) => result.metadata.contentType === contentType
      );

      logger.info('[RAG Search] Filtered by contentType', {
        contentType,
        resultsAfterFilter: finalResults.length,
      });
    }

    if (language) {
      finalResults = finalResults.filter(
        (result) => result.metadata.language === language
      );

      logger.info('[RAG Search] Filtered by language', {
        language,
        resultsAfterFilter: finalResults.length,
      });
    }

    // ═══════════════════════════════════════════════════════
    // STEP 8: Return search response
    // ═══════════════════════════════════════════════════════

    const response: SearchResponse = {
      results: finalResults,
      totalResults: finalResults.length,
      query,
      threshold: similarityThreshold,
    };

    logger.info('[RAG Search] Search completed successfully', {
      totalResults: response.totalResults,
      userId,
    });

    return response;
  } catch (error) {
    logger.error('[RAG Search] Search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      query: query.substring(0, 100),
    });

    // Return empty results on error
    return {
      results: [],
      totalResults: 0,
      query,
      threshold: similarityThreshold,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get document statistics for user
 *
 * Returns count of documents by status and total chunks
 *
 * @param userId - User ID
 * @returns Document statistics
 */
export async function getDocumentStats(userId: string) {
  try {
    const stats = await prisma.document.groupBy({
      by: ['status'],
      where: {
        userId,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    const totalChunks = await prisma.documentChunk.count({
      where: {
        document: {
          userId,
          deletedAt: null,
        },
      },
    });

    return {
      byStatus: stats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        },
        {} as Record<string, number>
      ),
      totalChunks,
    };
  } catch (error) {
    logger.error('[RAG Search] Failed to get document stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });

    return {
      byStatus: {},
      totalChunks: 0,
    };
  }
}

/**
 * Check if user has any indexed documents
 *
 * @param userId - User ID
 * @returns True if user has indexed documents
 */
export async function hasIndexedDocuments(userId: string): Promise<boolean> {
  const count = await prisma.document.count({
    where: {
      userId,
      status: 'COMPLETED',
      deletedAt: null,
    },
  });

  return count > 0;
}

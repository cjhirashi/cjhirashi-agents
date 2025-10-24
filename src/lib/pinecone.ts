/**
 * Pinecone Vector Database Client
 *
 * Singleton client for Pinecone integration (RAG Pipeline)
 *
 * @module lib/pinecone
 */

import { Pinecone } from '@pinecone-database/pinecone';
import logger from '@/lib/logging/logger';

// ═══════════════════════════════════════════════════════════
// ENVIRONMENT VALIDATION
// ═══════════════════════════════════════════════════════════

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || 'us-west-2';
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'cjhirashi-agents-mvp';
const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536');

if (!PINECONE_API_KEY) {
  logger.warn('[PINECONE] API key not configured. RAG features will be disabled.');
}

// ═══════════════════════════════════════════════════════════
// SINGLETON CLIENT
// ═══════════════════════════════════════════════════════════

let pineconeClient: Pinecone | null = null;

/**
 * Get Pinecone client instance (singleton)
 *
 * @returns Pinecone client or null if not configured
 */
export function getPineconeClient(): Pinecone | null {
  if (!PINECONE_API_KEY) {
    return null;
  }

  if (!pineconeClient) {
    try {
      pineconeClient = new Pinecone({
        apiKey: PINECONE_API_KEY,
      });

      logger.info('[PINECONE] Client initialized successfully', {
        environment: PINECONE_ENVIRONMENT,
        indexName: PINECONE_INDEX_NAME,
        dimensions: EMBEDDING_DIMENSIONS,
      });
    } catch (error) {
      logger.error('[PINECONE] Failed to initialize client', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  return pineconeClient;
}

/**
 * Get Pinecone index (namespace-aware)
 *
 * @returns Pinecone index or null if not configured
 */
export function getPineconeIndex() {
  const client = getPineconeClient();

  if (!client) {
    return null;
  }

  try {
    const index = client.index(PINECONE_INDEX_NAME);

    logger.debug('[PINECONE] Index retrieved', {
      indexName: PINECONE_INDEX_NAME,
    });

    return index;
  } catch (error) {
    logger.error('[PINECONE] Failed to get index', {
      error: error instanceof Error ? error.message : 'Unknown error',
      indexName: PINECONE_INDEX_NAME,
    });
    return null;
  }
}

/**
 * Check if Pinecone is configured and ready
 *
 * @returns True if Pinecone is ready, false otherwise
 */
export function isPineconeReady(): boolean {
  return getPineconeClient() !== null;
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

export {
  PINECONE_INDEX_NAME,
  PINECONE_ENVIRONMENT,
  EMBEDDING_DIMENSIONS,
};

export default getPineconeClient;

/**
 * RAG Processing Pipeline
 *
 * Complete pipeline for document processing:
 * 1. Extract text from document
 * 2. Split into chunks (LangChain RecursiveCharacterTextSplitter)
 * 3. Generate embeddings (OpenAI text-embedding-3-small)
 * 4. Store in Pinecone with metadata
 * 5. Update database with processing status
 *
 * @module lib/rag/pipeline
 */

import pdf from 'pdf-parse';
import { openai } from '@ai-sdk/openai';
import { put } from '@vercel/blob';
import { getPineconeIndex } from '@/lib/pinecone';
import logger from '@/lib/logging/logger';
// Note: Document model not yet in schema - will be added in future phase
// import type { Document, DocumentStatus, DocumentContentType } from '@prisma/client';

// Temporary type definitions until Document model is added to schema
type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
type DocumentContentType = 'PDF' | 'TEXT' | 'MARKDOWN';

// Temporary Document interface matching expected schema
interface Document {
  id: string;
  userId: string;
  filename: string;
  contentType: DocumentContentType;
  size: number;
  blobUrl: string;
  status: DocumentStatus;
  errorMessage?: string | null;
  chunkCount?: number;
  processedAt?: Date | null;
  createdAt: Date;
}

// Mock prisma client with document methods for type checking
// This is a stub until Document model is added to schema
const prisma = {
  document: {
    create: async (args: any): Promise<Document> => {
      throw new Error('Document model not yet implemented in schema');
    },
    update: async (args: any): Promise<Document> => {
      throw new Error('Document model not yet implemented in schema');
    },
    findUnique: async (args: any): Promise<Document | null> => {
      throw new Error('Document model not yet implemented in schema');
    },
  },
  documentChunk: {
    createMany: async (args: any): Promise<any> => {
      throw new Error('DocumentChunk model not yet implemented in schema');
    },
    deleteMany: async (args: any): Promise<any> => {
      throw new Error('DocumentChunk model not yet implemented in schema');
    },
  },
} as any;

// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

export interface ProcessDocumentOptions {
  userId: string;
  file: File;
  contentType?: DocumentContentType;
  language?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface ProcessingResult {
  document: Document;
  success: boolean;
  error?: string;
  chunksCreated: number;
  vectorsStored: number;
}

// ═══════════════════════════════════════════════════════════
// MAIN PIPELINE FUNCTION
// ═══════════════════════════════════════════════════════════

/**
 * Process document through complete RAG pipeline
 *
 * Steps:
 * 1. Upload to Vercel Blob
 * 2. Create Document record (status: PENDING)
 * 3. Extract text from file
 * 4. Split into chunks
 * 5. Generate embeddings
 * 6. Store in Pinecone
 * 7. Update Document record (status: COMPLETED)
 *
 * @param options - Processing options
 * @returns Processing result
 */
export async function processDocument(
  options: ProcessDocumentOptions
): Promise<ProcessingResult> {
  const {
    userId,
    file,
    contentType = 'GENERAL',
    language = 'es',
    chunkSize = 800,
    chunkOverlap = 200,
  } = options;

  logger.info('[RAG Pipeline] Starting document processing', {
    userId,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  });

  let document: Document | null = null;

  try {
    // ═══════════════════════════════════════════════════════
    // STEP 1: Upload to Vercel Blob
    // ═══════════════════════════════════════════════════════

    logger.info('[RAG Pipeline] Uploading to Vercel Blob');

    const filename = `documents/${userId}/${Date.now()}-${file.name}`;
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    logger.info('[RAG Pipeline] Upload completed', {
      url: blob.url,
      pathname: blob.pathname,
    });

    // ═══════════════════════════════════════════════════════
    // STEP 2: Create Document record (PENDING)
    // ═══════════════════════════════════════════════════════

    document = await prisma.document.create({
      data: {
        userId,
        filename: blob.pathname,
        originalName: file.name,
        storageUrl: blob.url,
        mimeType: file.type,
        size: BigInt(file.size),
        status: 'PENDING',
        contentType,
        language,
        chunkSize,
        chunkOverlap,
      },
    });

    if (!document) {
      throw new Error('Failed to create document record');
    }

    logger.info('[RAG Pipeline] Document record created', {
      documentId: document.id,
      status: document.status,
    });

    // ═══════════════════════════════════════════════════════
    // STEP 3: Extract text from file
    // ═══════════════════════════════════════════════════════

    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'PROCESSING' },
    });

    logger.info('[RAG Pipeline] Extracting text from document');

    const extractedText = await extractText(file, blob.url);

    logger.info('[RAG Pipeline] Text extracted', {
      textLength: extractedText.length,
      documentId: document.id,
    });

    // Update document with extracted text
    await prisma.document.update({
      where: { id: document.id },
      data: { extractedText },
    });

    // ═══════════════════════════════════════════════════════
    // STEP 4: Split into chunks
    // ═══════════════════════════════════════════════════════

    logger.info('[RAG Pipeline] Splitting text into chunks');

    // Simple text splitting (without LangChain)
    const chunks = splitText(extractedText, chunkSize, chunkOverlap);

    const langchainDocs = chunks.map((content, index) => ({
      pageContent: content,
      metadata: {
        documentId: document.id,
        userId,
        filename: file.name,
        contentType,
        language,
        chunkIndex: index,
      },
    }));

    logger.info('[RAG Pipeline] Text split into chunks', {
      totalChunks: langchainDocs.length,
      documentId: document.id,
    });

    // ═══════════════════════════════════════════════════════
    // STEP 5: Generate embeddings & Store in Pinecone
    // ═══════════════════════════════════════════════════════

    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'INDEXING' },
    });

    logger.info('[RAG Pipeline] Generating embeddings and storing in Pinecone');

    const pineconeIndex = getPineconeIndex();

    if (!pineconeIndex) {
      throw new Error('Pinecone index not available');
    }

    // Generate embeddings for all chunks using OpenAI API directly
    const vectors = await Promise.all(
      langchainDocs.map(async (doc, index) => {
        const embedding = await generateEmbedding(doc.pageContent);
        return {
          id: `${document.id}-chunk-${index}`,
          values: embedding,
          metadata: {
            documentId: document.id,
            userId,
            content: doc.pageContent,
            ...doc.metadata,
          },
        };
      })
    );

    // Store vectors in Pinecone with namespace = userId
    if (vectors.length > 0) {
      await pineconeIndex.namespace(userId).upsert(vectors);
    }

    logger.info('[RAG Pipeline] Vectors stored in Pinecone', {
      vectorsStored: vectors.length,
      namespace: userId,
      documentId: document.id,
    });

    // ═══════════════════════════════════════════════════════
    // STEP 6: Store chunks in database
    // ═══════════════════════════════════════════════════════

    logger.info('[RAG Pipeline] Storing chunks in database');

    const chunkRecords = langchainDocs.map((doc, index) => ({
      documentId: document!.id,
      content: doc.pageContent,
      chunkIndex: index,
      tokens: Math.ceil(doc.pageContent.length / 4), // Rough estimate: 1 token ≈ 4 chars
      vectorId: `${document!.id}-chunk-${index}`, // Pinecone vector ID
      metadata: doc.metadata,
    }));

    await prisma.documentChunk.createMany({
      data: chunkRecords,
    });

    logger.info('[RAG Pipeline] Chunks stored in database', {
      chunksStored: chunkRecords.length,
      documentId: document.id,
    });

    // ═══════════════════════════════════════════════════════
    // STEP 7: Update Document record (COMPLETED)
    // ═══════════════════════════════════════════════════════

    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'COMPLETED',
        totalChunks: langchainDocs.length,
        vectorIndexId: document.id, // Use documentId as vectorIndexId
      },
    });

    logger.info('[RAG Pipeline] Document processing completed', {
      documentId: updatedDocument.id,
      totalChunks: langchainDocs.length,
      status: updatedDocument.status,
    });

    return {
      document: updatedDocument,
      success: true,
      chunksCreated: langchainDocs.length,
      vectorsStored: langchainDocs.length,
    };
  } catch (error) {
    logger.error('[RAG Pipeline] Processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      documentId: document?.id,
    });

    // Update document status to FAILED
    if (document) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'FAILED',
          processingError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }

    return {
      document: document!,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      chunksCreated: 0,
      vectorsStored: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Extract text from file based on mime type
 *
 * Supported formats:
 * - application/pdf (using PDFLoader)
 * - text/plain (direct read)
 * - text/markdown (direct read)
 *
 * @param file - File to extract text from
 * @param blobUrl - URL of uploaded blob
 * @returns Extracted text
 */
async function extractText(file: File, blobUrl: string): Promise<string> {
  const mimeType = file.type;

  logger.info('[RAG Pipeline] Extracting text', {
    mimeType,
    filename: file.name,
  });

  try {
    let extractedText: string;

    if (mimeType === 'application/pdf') {
      // Use pdf-parse for PDFs
      const arrayBuffer = await file.arrayBuffer();
      const data = await pdf(Buffer.from(arrayBuffer));
      extractedText = data.text;
    } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      // Direct read for text files
      extractedText = await file.text();
    } else {
      throw new Error(`Unsupported mime type: ${mimeType}`);
    }

    logger.info('[RAG Pipeline] Text extraction successful', {
      textLength: extractedText.length,
      mimeType,
    });

    return extractedText;
  } catch (error) {
    logger.error('[RAG Pipeline] Text extraction failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      mimeType,
      filename: file.name,
    });

    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete document and all associated data
 *
 * Steps:
 * 1. Delete vectors from Pinecone
 * 2. Delete chunks from database
 * 3. Soft delete document record
 *
 * @param documentId - Document ID to delete
 * @param userId - User ID (for namespace)
 */
export async function deleteDocument(documentId: string, userId: string): Promise<void> {
  logger.info('[RAG Pipeline] Deleting document', {
    documentId,
    userId,
  });

  try {
    // Get document with chunks
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { chunks: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Verify ownership
    if (document.userId !== userId) {
      throw new Error('Unauthorized: Document does not belong to user');
    }

    // Delete vectors from Pinecone
    const pineconeIndex = getPineconeIndex();

    if (pineconeIndex && document.chunks.length > 0) {
      const vectorIds = document.chunks
        .map((chunk: any) => chunk.vectorId)
        .filter((id: any): id is string => id !== null);

      if (vectorIds.length > 0) {
        await pineconeIndex.namespace(userId).deleteMany(vectorIds);

        logger.info('[RAG Pipeline] Vectors deleted from Pinecone', {
          vectorsDeleted: vectorIds.length,
          documentId,
        });
      }
    }

    // Delete chunks from database
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    logger.info('[RAG Pipeline] Chunks deleted from database', {
      chunksDeleted: document.chunks.length,
      documentId,
    });

    // Soft delete document
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    logger.info('[RAG Pipeline] Document soft deleted', {
      documentId,
    });
  } catch (error) {
    logger.error('[RAG Pipeline] Delete failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      documentId,
      userId,
    });

    throw error;
  }
}

// ═══════════════════════════════════════════════════════════
// SIMPLE TEXT SPLITTER (without LangChain)
// ═══════════════════════════════════════════════════════════

/**
 * Simple text splitting function
 * Splits text into chunks with overlap
 */
function splitText(text: string, chunkSize: number = 800, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.substring(start, end);
    chunks.push(chunk);
    start += chunkSize - overlap;
  }

  return chunks;
}

// ═══════════════════════════════════════════════════════════
// EMBEDDING GENERATION
// ═══════════════════════════════════════════════════════════

/**
 * Generate embedding for text using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

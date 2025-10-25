/**
 * Documents Page
 *
 * Main page for document management (upload, list, quota tracking)
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { DocumentsClient } from './documents-client';

// ═══════════════════════════════════════════════════════════
// SERVER COMPONENT
// ═══════════════════════════════════════════════════════════

export default async function DocumentsPage() {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const userId = session.user.id;

  // Fetch documents
  const documents = await prisma.file.findMany({
    where: {
      userId,
      deletedAt: null,
      usageContext: 'ARTIFACT', // RAG documents
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      filename: true,
      originalName: true,
      size: true,
      mimeType: true,
      processingStatus: true,
      createdAt: true,
    },
  });

  // Transform to Document type
  const transformedDocuments = documents.map((doc) => ({
    id: doc.id,
    filename: doc.filename,
    originalName: doc.originalName,
    filesize: Number(doc.size),
    status: (doc.processingStatus || 'ready') as 'processing' | 'ready' | 'failed',
    uploadedAt: doc.createdAt,
    contentType: doc.mimeType,
  }));

  // Calculate quota (total used storage)
  const totalUsed = documents.reduce((sum, doc) => sum + Number(doc.size), 0);

  // Get tier from user (default: FREE)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
    },
  });

  const tier = (user?.subscriptionTier || 'FREE') as 'FREE' | 'PRO' | 'ENTERPRISE';

  // Define quota limits (in bytes)
  const quotaLimits = {
    FREE: 50 * 1024 * 1024, // 50MB
    PRO: 1024 * 1024 * 1024, // 1GB
    ENTERPRISE: 10 * 1024 * 1024 * 1024, // 10GB
  };

  const limitBytes = quotaLimits[tier] || quotaLimits.FREE;

  return (
    <DocumentsClient
      initialDocuments={transformedDocuments}
      usedBytes={totalUsed}
      limitBytes={limitBytes}
      tier={tier}
    />
  );
}

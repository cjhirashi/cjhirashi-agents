/**
 * Prisma Client Singleton
 *
 * This file creates a singleton instance of the Prisma client to prevent
 * multiple instances in development (hot reloading) and production.
 *
 * @see https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import logger from '@/lib/logging/logger';

// Declare global to prevent TypeScript errors
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Prisma client options
const prismaOptions: Prisma.PrismaClientOptions = {
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
};

// Create singleton instance
const prisma = global.prisma || new PrismaClient(prismaOptions);

// Store in global for development
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

/**
 * Helper to gracefully disconnect Prisma client
 * Call this on server shutdown
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

/**
 * Test database connection
 */
export async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

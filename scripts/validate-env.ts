#!/usr/bin/env tsx

/**
 * Validates that all required environment variables are set
 * Run before build or deployment
 */

// Load environment variables from .env.local and .env
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });

const REQUIRED_ENV_VARS = {
  // NextAuth
  NEXTAUTH_SECRET: 'Required for NextAuth JWT signing',
  NEXTAUTH_URL: 'Required for NextAuth OAuth redirects',

  // Database
  DATABASE_URL: 'Required for Prisma database connection',

  // LLM Providers (at least one required)
  ANTHROPIC_API_KEY: 'Required for Claude models (optional if using others)',
  OPENAI_API_KEY: 'Required for GPT models (optional if using others)',
  GOOGLE_GENERATIVE_AI_API_KEY: 'Required for Gemini models (optional if using others)',
  DEEPSEEK_API_KEY: 'Required for DeepSeek models (optional if using others)',

  // Vector Database (RAG)
  PINECONE_API_KEY: 'Required for RAG document storage',
  PINECONE_ENVIRONMENT: 'Required for Pinecone connection',
  PINECONE_INDEX_NAME: 'Required for Pinecone index',
  PINECONE_NAMESPACE: 'Required for Pinecone namespace',
  PINECONE_DIMENSION: 'Required for embeddings dimension (1536 for OpenAI)',

  // Rate Limiting (Production)
  UPSTASH_REDIS_URL: 'Required for production rate limiting',
  UPSTASH_REDIS_TOKEN: 'Required for Upstash Redis authentication',

  // Storage
  BLOB_READ_WRITE_TOKEN: 'Required for Vercel Blob storage',
} as const;

const OPTIONAL_ENV_VARS = {
  // OAuth Providers (optional)
  GOOGLE_CLIENT_ID: 'Optional for Google OAuth',
  GOOGLE_CLIENT_SECRET: 'Optional for Google OAuth',
  GITHUB_ID: 'Optional for GitHub OAuth',
  GITHUB_SECRET: 'Optional for GitHub OAuth',
} as const;

function validateEnv() {
  console.log('🔍 Validating environment variables...\n');

  let hasErrors = false;
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[key]) {
      missing.push(`❌ ${key}: ${description}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${key}`);
    }
  }

  // Check optional variables
  console.log('\n📌 Optional variables:');
  for (const [key, description] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[key]) {
      warnings.push(`⚠️  ${key}: ${description} (not set)`);
    } else {
      console.log(`✅ ${key}`);
    }
  }

  // Report results
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:\n');
    missing.forEach(msg => console.error(msg));
    console.error('\n💡 Copy .env.example to .env.local and fill in the values');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Optional environment variables not set:\n');
    warnings.forEach(msg => console.warn(msg));
  }

  console.log('\n✅ All required environment variables are set!\n');
}

validateEnv();

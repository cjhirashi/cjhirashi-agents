import { beforeAll, afterAll } from 'vitest';

// Setup global test environment
beforeAll(() => {
  // Mock environment variables for testing
  process.env.NEXTAUTH_SECRET = 'test-secret-for-testing-purposes-only';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

  // LLM API Keys (mock)
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';
  process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';

  // RAG / Vector DB (mock)
  process.env.PINECONE_API_KEY = 'test-pinecone-key';
  process.env.PINECONE_ENVIRONMENT = 'test-env';
  process.env.PINECONE_INDEX_NAME = 'test-index';
  process.env.PINECONE_NAMESPACE = 'test-namespace';
  process.env.PINECONE_DIMENSION = '1536';

  // Storage (mock)
  process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token';

  // Rate Limiting (mock)
  process.env.UPSTASH_REDIS_URL = 'http://localhost:6379';
  process.env.UPSTASH_REDIS_TOKEN = 'test-redis-token';
});

// Cleanup after all tests
afterAll(() => {
  // Reset environment variables
});

# cjhirashi-agents Backend - Setup Guide

## 📦 Prerequisites

Before starting, ensure you have:

- **Node.js** >= 18.17.0
- **PostgreSQL** >= 15.0 (or Neon.tech account)
- **Redis** (optional, for rate limiting)
- **API Keys** for:
  - Anthropic (Claude)
  - OpenAI (for embeddings)
  - Google AI (Gemini)
  - Pinecone (vector database)
  - Vercel Blob Storage

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/cjhirashi/cjhirashi-agents.git
cd cjhirashi-agents
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and fill in your API keys and database URL
```

**Required variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `ANTHROPIC_API_KEY` - Get from https://console.anthropic.com/
- `OPENAI_API_KEY` - Get from https://platform.openai.com/
- `PINECONE_API_KEY` - Get from https://app.pinecone.io/

### 4. Setup Database

```bash
# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# (Optional) Seed the database
npm run db:seed
```

### 5. Test Database Connection

```bash
npm run db:test
```

You should see:
```
✅ Database connection successful
```

### 6. Start Development Server

```bash
npm run dev
```

The server will start at http://localhost:3000

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test Suite

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

---

## 📁 Project Structure

```
src/
├── app/
│   └── api/
│       └── v1/
│           ├── chat/         # Chat endpoints
│           ├── rag/          # RAG endpoints
│           ├── agents/       # Agent management
│           └── health/       # Health check
│
├── lib/
│   ├── ai/                   # LLM routing & models
│   ├── rag/                  # RAG pipeline
│   ├── auth/                 # NextAuth configuration
│   ├── db/                   # Prisma client
│   ├── api/                  # API utilities
│   ├── logging/              # Winston logger
│   └── utils/                # Helper functions
│
├── types/                    # TypeScript types
│   ├── api.ts
│   ├── chat.ts
│   └── llm.ts
│
└── __tests__/                # Test suites
    ├── api/
    ├── integration/
    ├── unit/
    └── e2e/
```

---

## 🔌 API Endpoints

### Chat

- `POST /api/v1/chat/send` - Send message (SSE streaming)
- `GET /api/v1/chat/sessions` - List chat sessions
- `POST /api/v1/chat/sessions` - Create new session
- `GET /api/v1/chat/sessions/{id}` - Get session details
- `DELETE /api/v1/chat/sessions/{id}` - Delete session
- `GET /api/v1/chat/history/{sessionId}` - Get chat history

### RAG

- `POST /api/v1/rag/documents` - Upload document
- `GET /api/v1/rag/documents` - List documents
- `POST /api/v1/rag/search` - Semantic search
- `DELETE /api/v1/rag/documents/{id}` - Delete document

### Agents

- `GET /api/v1/agents` - List available agents
- `GET /api/v1/agents/{id}` - Get agent details
- `POST /api/v1/agents/{id}/enable` - Enable agent
- `DELETE /api/v1/agents/{id}/disable` - Disable agent

### Health

- `GET /api/v1/health` - Health check

---

## 🔧 Troubleshooting

### Database Connection Issues

**Error:** `P1001: Can't reach database server`

**Solution:**
1. Check your `DATABASE_URL` in `.env.local`
2. Ensure PostgreSQL is running
3. Test connection: `npm run db:test`

### Prisma Client Not Found

**Error:** `@prisma/client did not initialize yet`

**Solution:**
```bash
npx prisma generate
```

### Winston Logging Issues

**Error:** `Cannot find module 'winston'`

**Solution:**
```bash
npm install winston
```

### SSE Streaming Not Working

**Error:** Browser doesn't receive events

**Solution:**
1. Check CORS configuration
2. Verify `Content-Type: text/event-stream` header
3. Ensure connection isn't timing out

---

## 📝 Scripts

```bash
# Development
npm run dev                # Start dev server
npm run build              # Build for production
npm run start              # Start production server

# Database
npm run db:test            # Test database connection
npm run db:seed            # Seed database
npm run db:reset           # Reset database (WARNING: deletes all data)
npx prisma studio          # Open Prisma Studio (GUI)

# Testing
npm test                   # Run all tests
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests
npm run test:coverage      # Coverage report

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format with Prettier
npm run type-check         # TypeScript type checking
```

---

## 🛡️ Security

### Never Commit

- `.env.local`
- API keys
- Secrets
- Tokens

### Best Practices

1. Use environment variables for all secrets
2. Enable HTTPS in production
3. Implement rate limiting
4. Validate all inputs
5. Sanitize outputs
6. Use parameterized queries

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
# Or deploy via CLI
vercel --prod
```

### Environment Variables Required in Production

All variables from `.env.example` MUST be set in Vercel dashboard:
- Database
- Authentication
- LLM APIs
- Storage
- Redis (if using)

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Winston Logger](https://github.com/winstonjs/winston)

---

## 🤝 Support

If you encounter issues:
1. Check this README first
2. Review error logs
3. Check environment variables
4. Test database connection
5. Contact team lead

---

**Last Updated:** 2025-10-23
**Version:** 1.0.0
**Status:** Phase 5 - Backend Implementation

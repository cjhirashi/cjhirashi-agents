# Arquitectura del Sistema - cjhirashi-agents

Diagrama de componentes y flujos principales de la arquitectura MVP, mostrando las 7 capas y sus interacciones.

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor':'#0F172A',
  'primaryTextColor':'#F3F4F6',
  'primaryBorderColor':'#3B82F6',
  'lineColor':'#60A5FA',
  'secondaryColor':'#1E293B',
  'tertiaryColor':'#0F172A',
  'background':'#0F172A',
  'mainBkg':'#1E293B',
  'fontSize':'12px',
  'fontFamily':'inter'
}}}%%

graph TB
    subgraph presentation["🎨 PRESENTATION LAYER"]
        dashboard["📱 Dashboard UI<br/>React 18 + Next.js Pages"]
        chatInterface["💬 Chat Interface<br/>Real-time SSE Stream"]
        userSettings["⚙️ User Settings<br/>Auth & Preferences"]
    end

    subgraph routing["🛣️ ROUTING & API LAYER"]
        authMiddleware["🔐 NextAuth Middleware<br/>JWT + Session"]
        apiRoutes["🔀 API Routes<br/>/api/chat, /api/rag, /api/settings"]
        rbacLayer["👮 RBAC Handler<br/>Role-based Access Control"]
    end

    subgraph businessLogic["⚙️ BUSINESS LOGIC LAYER"]
        chatOrchestrator["🎯 Chat Orchestrator<br/>Message processing & routing"]
        llmSelector["🤖 LLM Selector<br/>Model selection logic"]
        ragEngine["🧠 RAG Engine<br/>Context retrieval"]
        artifactExtractor["📦 Artifact Extractor<br/>Code/Document parsing"]
    end

    subgraph serviceLayer["🔌 SERVICE LAYER"]
        llmService["🧬 LLM Service<br/>Claude, Gemini, DeepSeek, OpenAI"]
        mcpService["🔗 MCP Service<br/>Gmail, Calendar, Notion"]
        vectorService["📍 Vector Service<br/>Pinecone Integration"]
        storageService["💾 Blob Storage Service<br/>Vercel Blob Upload"]
    end

    subgraph dataAccess["🗂️ DATA ACCESS LAYER"]
        prismaORM["📊 Prisma ORM<br/>Repository Pattern"]
        queryBuilder["🔨 Query Builder<br/>Type-safe Queries"]
        caching["⚡ Cache Layer<br/>Memory Cache + Redis"]
    end

    subgraph dataStorage["💽 DATA STORAGE LAYER"]
        postgresql["🐘 PostgreSQL<br/>Neon - User, Chat, Settings"]
        pinecone["🎲 Pinecone Vector DB<br/>Embeddings, Semantic Search"]
        blobStorage["📦 Vercel Blob<br/>Artifacts, Documents"]
    end

    subgraph infrastructure["🏗️ INFRASTRUCTURE LAYER"]
        vercelHost["☁️ Vercel Hosting<br/>Deployment & Edge"]
        monitoring["📈 Monitoring<br/>Logs, Metrics, Traces"]
        cicd["🔄 CI/CD Pipeline<br/>Build, Test, Deploy"]
    end

    %% PRESENTATION LAYER connections
    dashboard -->|User Input| authMiddleware
    chatInterface -->|Send Message| authMiddleware
    userSettings -->|Update Profile| authMiddleware

    %% ROUTING LAYER connections
    authMiddleware -->|Validate Token| rbacLayer
    rbacLayer -->|Route to Handler| apiRoutes
    apiRoutes -->|Process Request| chatOrchestrator

    %% BUSINESS LOGIC connections
    chatOrchestrator -->|Select Model| llmSelector
    chatOrchestrator -->|Fetch Context| ragEngine
    chatOrchestrator -->|Parse Result| artifactExtractor
    llmSelector -->|Pass Model| llmService
    ragEngine -->|Query Vector| vectorService
    artifactExtractor -->|Save Artifact| storageService

    %% SERVICE LAYER connections
    llmService -->|Call API| businessLogic
    mcpService -->|Query External| businessLogic
    vectorService -->|Embedding| dataAccess
    storageService -->|Upload| dataStorage

    %% DATA ACCESS connections
    chatOrchestrator -->|Save Chat| prismaORM
    prismaORM -->|Execute Query| queryBuilder
    queryBuilder -->|Check Cache| caching

    %% DATA STORAGE connections
    queryBuilder -->|Read/Write| postgresql
    vectorService -->|Store/Retrieve| pinecone
    storageService -->|Store File| blobStorage

    %% Response flow back
    caching -->|Return Data| chatOrchestrator
    postgresql -->|Chat History| chatOrchestrator
    pinecone -->|RAG Results| ragEngine
    blobStorage -->|Document Link| artifactExtractor
    llmService -->|Stream Tokens| chatInterface
    chatInterface -->|Render UI| dashboard

    %% Styling
    classDef presentationStyle fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#F3F4F6
    classDef routingStyle fill:#10B981,stroke:#047857,stroke-width:2px,color:#F3F4F6
    classDef businessStyle fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#F3F4F6
    classDef serviceStyle fill:#A78BFA,stroke:#7C3AED,stroke-width:2px,color:#F3F4F6
    classDef dataAccessStyle fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#F3F4F6
    classDef storageStyle fill:#06B6D4,stroke:#0891B2,stroke-width:2px,color:#F3F4F6
    classDef infraStyle fill:#6B7280,stroke:#374151,stroke-width:2px,color:#F3F4F6

    class presentation presentationStyle
    class authMiddleware,apiRoutes,rbacLayer routingStyle
    class chatOrchestrator,llmSelector,ragEngine,artifactExtractor businessStyle
    class llmService,mcpService,vectorService,storageService serviceStyle
    class prismaORM,queryBuilder,caching dataAccessStyle
    class postgresql,pinecone,blobStorage storageStyle
    class vercelHost,monitoring,cicd infraStyle
```

## Descripción de Capas

### 1. Presentation Layer (Azul #3B82F6)
- **Interfaz de usuario** con React 18
- Dashboard centralizado para gestión de chats
- Chat real-time con SSE streaming
- Configuración de usuario y preferencias

### 2. Routing & API Layer (Verde #10B981)
- **NextAuth** para autenticación y JWT
- API Routes de Next.js para endpoints
- RBAC (Role-Based Access Control) para autorización
- Validación de headers y tokens

### 3. Business Logic Layer (Naranja #F59E0B)
- **LLM Selector** elige modelo según contexto
- **RAG Engine** recupera contexto de Pinecone
- **Chat Orchestrator** coordina flujos
- **Artifact Extractor** procesa código y documentos

### 4. Service Layer (Púrpura #A78BFA)
- **LLM Service**: Claude, Gemini, DeepSeek, OpenAI
- **MCP Service**: Gmail, Google Calendar, Notion
- **Vector Service**: Integración con Pinecone
- **Storage Service**: Vercel Blob para artifacts

### 5. Data Access Layer (Rosa #EC4899)
- **Prisma ORM** con patrón Repository
- **Query Builder** type-safe
- **Cache Layer** para optimización
- Memory cache y Redis

### 6. Data Storage Layer (Cyan #06B6D4)
- **PostgreSQL** (Neon): usuarios, chats, configuración
- **Pinecone**: embeddings y búsqueda semántica
- **Vercel Blob**: almacenamiento de artifacts

### 7. Infrastructure Layer (Gris #6B7280)
- **Vercel**: hosting y edge functions
- **Monitoring**: logs, métricas, traces
- **CI/CD**: build, test, deploy automatizado

## Flujos Principales

1. **Chat Request**: Dashboard → Auth → API → Business Logic → Services → Storage → Response
2. **RAG Retrieval**: Business Logic → Vector Service → Pinecone → Context
3. **Artifact Save**: Business Logic → Storage Service → Vercel Blob → Link
4. **Real-time Stream**: LLM Service → SSE → Browser → UI

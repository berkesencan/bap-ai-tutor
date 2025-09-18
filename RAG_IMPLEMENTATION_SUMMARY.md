# 🚀 RAG Pipeline Implementation Summary

## 📋 **What Was Built**

A complete production-ready **Retrieval-Augmented Generation (RAG) pipeline** for the AI Tutor platform that replaces "context stuffing" with intelligent document retrieval and citation.

### **Core Components**

1. **📄 Document Ingestion Service** (`/backend/ingestion/`)
   - **LlamaParse** for PDF processing with page numbers
   - **Unstructured** server for DOCX/PPTX/HTML processing  
   - **Google Document AI** fallback for OCR of scanned documents
   - **Hierarchical chunking** (800-1200 tokens, 10-15% overlap)
   - **Jina v3 embeddings** with model-agnostic dimensions
   - **Firebase Storage** integration for normalized document storage

2. **🔍 Hybrid Search & Retrieval** (`/backend/retrieval/`)
   - **Typesense** for BM25 keyword search (top 200 candidates)
   - **pgvector** for dense semantic search (top 200 candidates)
   - **Voyage Rerank 2.5** for final ranking (top 6-8 results)
   - **Low-confidence detection** with user-friendly fallbacks
   - **60-second retrieval caching** for performance

3. **🧠 Enhanced Chat Orchestration** (`/backend/services/ai.service.js`)
   - **Feature flag** (`RAG_ENABLED=true`) for safe rollout
   - **Rolling conversation summaries** (300-500 tokens)
   - **Grounded prompts** with source citations
   - **Firestore session management** with last 6 turns + summary
   - **Graceful fallback** to legacy context-stuffing on errors

4. **🎨 Frontend Enhancements** (`/frontend/src/components/`)
   - **Sources panel** under AI responses with clickable page links
   - **Material status badges** (IDX/PROC/OCR/NEW) showing indexing status
   - **Document refresh** with cache invalidation per material
   - **RAG feature flag** (`REACT_APP_RAG_ENABLED=true`) support

### **Technology Stack**

| Component | Technology | Purpose |
|-----------|------------|---------|
| **PDF Parsing** | LlamaParse | Markdown output with page numbers |
| **Office Docs** | Unstructured | DOCX/PPTX/HTML with typed blocks |
| **OCR Fallback** | Google Document AI | Scanned documents & images |
| **Vector Search** | pgvector (PostgreSQL) | Dense semantic similarity |
| **Keyword Search** | Typesense | BM25 full-text search |
| **Embeddings** | Jina v3 (1024-dim) | Model-agnostic vector generation |
| **Reranking** | Voyage Rerank 2.5 | Final relevance scoring |
| **Database** | Cloud SQL PostgreSQL | Vector storage with indexes |
| **Caching** | Firebase Firestore | Document metadata & sessions |
| **File Storage** | Firebase Storage | Raw files & parsed documents |

---

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RAG PIPELINE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📤 INGESTION FLOW                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ Firebase    │───▶│ LlamaParse   │───▶│ Hierarchical│───▶│ Jina v3     │ │
│  │ Storage     │    │ Unstructured │    │ Chunking    │    │ Embeddings  │ │
│  │ (Raw Files) │    │ Doc AI OCR   │    │ (800-1200   │    │ (1024-dim)  │ │
│  └─────────────┘    └──────────────┘    │ tokens)     │    └─────────────┘ │
│                                         └─────────────┘           │         │
│                                                │                  │         │
│                                                ▼                  ▼         │
│                                    ┌─────────────────┐  ┌─────────────────┐ │
│                                    │ Typesense       │  │ pgvector        │ │
│                                    │ (BM25 Search)   │  │ (Vector Search) │ │
│                                    └─────────────────┘  └─────────────────┘ │
│                                                                             │
│  🔍 RETRIEVAL FLOW                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ User Query  │───▶│ Hybrid       │───▶│ Voyage      │───▶│ Grounded    │ │
│  │ + Chat      │    │ Search       │    │ Rerank 2.5  │    │ AI Response │ │
│  │ Summary     │    │ (400 cands)  │    │ (Top 6-8)   │    │ + Citations │ │
│  └─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 **File Structure**

### **Backend Files Added/Modified**

```
backend/
├── ingestion/
│   ├── types.ts                    # TypeScript interfaces
│   ├── parsers.ts                  # LlamaParse, Unstructured, OCR
│   ├── chunker.ts                  # Hierarchical document chunking
│   ├── embeddings.ts               # Jina v3 + OpenAI embedding services
│   ├── database.ts                 # pgvector operations
│   ├── search-index.ts             # Typesense operations
│   └── ingestion.service.ts        # Main ingestion orchestration
├── retrieval/
│   ├── types.ts                    # Retrieval interfaces
│   ├── rerankers.ts                # Voyage + Cohere reranking
│   └── retrieval.service.ts        # Hybrid search orchestration
├── routes/
│   └── rag.routes.js               # /api/rag/* endpoints
├── services/
│   └── ai.service.js               # ✏️ Modified for RAG integration
├── index.js                        # ✏️ Added RAG routes
├── .env                            # ✏️ Added RAG environment variables
├── test-rag-pipeline.js            # RAG testing script
└── RAG_DEPLOYMENT.md               # Deployment guide
```

### **Frontend Files Modified**

```
frontend/src/components/
├── AiTutorChat.jsx                 # ✏️ Added sources panel & status badges
├── AiTutorChat.css                 # ✏️ Added RAG styling
└── .env.local                      # ✏️ Added REACT_APP_RAG_ENABLED=true
```

---

## 🚦 **API Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rag/ingest` | Ingest document for RAG processing |
| `POST` | `/api/rag/retrieve` | Retrieve relevant chunks for query |
| `GET` | `/api/rag/health` | Health check for all RAG services |
| `POST` | `/api/rag/clear-cache` | Clear retrieval cache |
| `DELETE` | `/api/rag/course/:courseId` | Delete all indexed content for course |

### **Example Usage**

```javascript
// Ingest a document
const response = await fetch('/api/rag/ingest', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    courseId: 'intro-cs',
    materialId: 'exam-3',
    gcsPath: 'gs://studyplan-bucket/exams/exam3.pdf',
    fileName: 'Exam 3.pdf',
    fileType: 'pdf',
    contentHash: 'sha256hash'
  })
});

// Retrieve relevant chunks
const retrieval = await fetch('/api/rag/retrieve', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    courseId: 'intro-cs',
    query: 'What is Question 6 about the Cut Lemma?',
    chat_window_summary: 'Previous discussion about MST algorithms...',
    limit: 8
  })
});
```

---

## 🔧 **Environment Variables**

### **Backend (.env)**

```bash
# Feature Flag
RAG_ENABLED=true

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Search Engine
TYPESENSE_HOST=your-typesense-host
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=your-api-key

# Document Processing
LLAMA_CLOUD_API_KEY=llx-your-key
UNSTRUCTURED_URL=http://unstructured-server:8000

# OCR
OCR_PROVIDER=google
GOOGLE_DOC_AI_KEY=your-doc-ai-key

# AI Services
JINA_API_KEY=jina-your-key
VOYAGE_API_KEY=pa-your-key
EMBEDDING_DIMENSION=1024
```

### **Frontend (.env.local)**

```bash
REACT_APP_RAG_ENABLED=true
```

---

## 🎯 **Key Features**

### **1. Intelligent Document Processing**
- **Multi-format support**: PDF, DOCX, PPTX, HTML, images
- **Page-aware chunking**: Preserves page numbers for citations
- **Table preservation**: Tables kept intact as single chunks
- **OCR fallback**: Handles scanned documents automatically

### **2. Hybrid Search**
- **Keyword + Semantic**: BM25 + dense vector search
- **Smart reranking**: Voyage AI for relevance scoring
- **Low confidence detection**: Graceful handling of poor matches
- **Caching**: 60-second cache for repeated queries

### **3. Production-Ready**
- **Feature flags**: Safe rollout with `RAG_ENABLED`
- **Graceful fallback**: Legacy context-stuffing on errors
- **Health monitoring**: Comprehensive health checks
- **Idempotent ingestion**: Skip re-processing unchanged documents

### **4. User Experience**
- **Source citations**: Clickable page references in chat
- **Material status**: Visual indicators for indexing progress
- **Cache management**: User-controlled refresh and clearing
- **Responsive UI**: Mobile-optimized source panels

---

## 📊 **Performance & Scalability**

### **Expected Performance**
- **Ingestion**: ~2-5 minutes per document (depending on size)
- **Retrieval**: ~200-500ms per query (with caching)
- **Embedding**: ~1-2 seconds per document chunk batch
- **Reranking**: ~100-300ms for 8 final results

### **Scaling Considerations**
- **Ingestion**: CPU-intensive, scale horizontally
- **Retrieval**: Memory-intensive, consider connection pooling
- **Database**: Monitor vector index performance
- **API limits**: Respect embedding and reranking rate limits

---

## 🧪 **Testing**

Run the test script to verify your RAG setup:

```bash
cd backend
node test-rag-pipeline.js
```

### **Acceptance Tests**

✅ **Document Upload**: Scanned exam PDF → parsed with headings/tables preserved  
✅ **Query Processing**: "Explain Question 6 about Cut Lemma" → cites MST pages with page links  
✅ **Follow-up Context**: "What about equal weights?" → uses rolling summary from previous conversation  
✅ **Offline Resilience**: Network issues → graceful fallback to cached responses  

---

## 🚀 **Deployment**

### **Cloud Run (Recommended)**

```bash
# Deploy ingestion service
gcloud run deploy ai-tutor-ingestion \
  --source=. \
  --memory=2Gi \
  --cpu=2 \
  --timeout=900 \
  --set-cloudsql-instances=PROJECT:REGION:rag-postgres

# Deploy retrieval service  
gcloud run deploy ai-tutor-retrieval \
  --source=. \
  --memory=1Gi \
  --cpu=1 \
  --set-cloudsql-instances=PROJECT:REGION:rag-postgres
```

### **Database Setup**

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Create chunks table with dynamic dimensions
CREATE TABLE rag_chunks (
  id UUID PRIMARY KEY,
  course_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  page INT,
  heading_path TEXT[],
  text TEXT NOT NULL,
  embedding VECTOR(1024),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX rag_chunks_course_id_idx ON rag_chunks(course_id);
CREATE INDEX rag_chunks_embed_idx ON rag_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists=100);
```

---

## 🎉 **Benefits Over Previous System**

| Aspect | Before (Context Stuffing) | After (RAG Pipeline) |
|--------|---------------------------|---------------------|
| **Document Coverage** | Limited by context window | Complete document analysis |
| **Query Accuracy** | Vague, often missed details | Precise, cited responses |
| **Scalability** | Poor (linear with doc size) | Excellent (constant retrieval time) |
| **Citations** | None | Page-level source citations |
| **Multi-document** | Difficult to manage | Seamless cross-document search |
| **Performance** | Slow with large docs | Fast hybrid search |
| **User Experience** | Frustrating "I don't see..." | Helpful source navigation |

---

## 🔮 **Future Enhancements**

- **Multi-modal RAG**: Image and diagram understanding
- **Federated search**: Cross-course knowledge retrieval  
- **Advanced chunking**: Sentence transformers for better boundaries
- **Query expansion**: Synonym and concept expansion
- **Real-time indexing**: WebSocket-based live document updates
- **Analytics dashboard**: RAG performance and usage metrics

---

## 📞 **Support**

For questions or issues with the RAG implementation:

1. **Check logs**: All services include comprehensive logging
2. **Run health checks**: Use `/api/rag/health` endpoint
3. **Test pipeline**: Execute `test-rag-pipeline.js` script
4. **Review deployment**: Follow `RAG_DEPLOYMENT.md` guide

**The RAG pipeline is now ready for production use! 🚀**

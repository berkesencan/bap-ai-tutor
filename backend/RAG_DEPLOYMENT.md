# RAG Pipeline Deployment Guide

## Prerequisites

1. **PostgreSQL with pgvector**
   ```bash
   # Using Cloud SQL (GCP)
   gcloud sql instances create rag-postgres \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1
   
   # Enable pgvector extension
   gcloud sql connect rag-postgres --user=postgres
   CREATE EXTENSION vector;
   ```

2. **Typesense**
   ```bash
   # Option 1: Typesense Cloud (recommended)
   # Sign up at https://cloud.typesense.org/
   
   # Option 2: Self-hosted on Cloud Run
   gcloud run deploy typesense \
     --image=typesense/typesense:0.25.2 \
     --platform=managed \
     --region=us-central1 \
     --port=8108 \
     --set-env-vars="TYPESENSE_API_KEY=your-api-key,TYPESENSE_DATA_DIR=/data" \
     --memory=2Gi
   ```

## Environment Variables

Update your `.env` file:

```bash
# RAG Pipeline Configuration
RAG_ENABLED=true
DATABASE_URL=postgresql://user:password@host:5432/database
TYPESENSE_HOST=your-typesense-host
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=your-typesense-key

# Document Processing
LLAMA_CLOUD_API_KEY=llx-your-llamaparse-key
UNSTRUCTURED_URL=https://your-unstructured-server.com

# OCR Providers
OCR_PROVIDER=google
GOOGLE_DOC_AI_KEY=your-doc-ai-key

# Embeddings and Reranking
JINA_API_KEY=jina-your-key
VOYAGE_API_KEY=pa-your-voyage-key

# Vector Dimensions
EMBEDDING_DIMENSION=1024
```

## Cloud Run Deployment

### Ingestion Service
```bash
gcloud run deploy ai-tutor-ingestion \
  --source=. \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=900 \
  --set-env-vars="RAG_ENABLED=true,NODE_ENV=production" \
  --set-cloudsql-instances=PROJECT_ID:REGION:rag-postgres
```

### Retrieval Service
```bash
gcloud run deploy ai-tutor-retrieval \
  --source=. \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --set-env-vars="RAG_ENABLED=true,NODE_ENV=production" \
  --set-cloudsql-instances=PROJECT_ID:REGION:rag-postgres
```

## Database Migration

Run the following SQL to set up the database:

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Create chunks table
CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY,
  course_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  page INT,
  heading_path TEXT[],
  text TEXT NOT NULL,
  embedding VECTOR(1024),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS rag_chunks_course_id_idx ON rag_chunks(course_id);
CREATE INDEX IF NOT EXISTS rag_chunks_file_id_idx ON rag_chunks(file_id);
CREATE INDEX IF NOT EXISTS rag_chunks_embed_idx 
ON rag_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists=100);
```

## API Testing

Test the RAG endpoints:

```bash
# Health check
curl -X GET https://your-api-url/api/rag/health

# Ingest a document
curl -X POST https://your-api-url/api/rag/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "courseId": "test-course",
    "materialId": "test-material",
    "gcsPath": "gs://your-bucket/test.pdf",
    "fileName": "test.pdf",
    "fileType": "pdf",
    "contentHash": "abc123"
  }'

# Retrieve documents
curl -X POST https://your-api-url/api/rag/retrieve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "courseId": "test-course",
    "query": "What is Question 6 about?",
    "limit": 8
  }'
```

## Monitoring

Set up monitoring for:
- PostgreSQL connection health
- Typesense query performance
- Embedding API rate limits
- Document processing failures

## Scaling

- **Ingestion**: CPU-intensive, scale based on document processing queue
- **Retrieval**: Memory-intensive, scale based on query volume
- **Database**: Monitor connection pool usage and query performance
- **Typesense**: Monitor memory usage and query latency

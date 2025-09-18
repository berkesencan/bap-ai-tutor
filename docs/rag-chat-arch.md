# RAG Chat Architecture

## Overview
This document outlines the architecture of the RAG (Retrieval-Augmented Generation) chat system that enables the AI Tutor to answer questions about course materials and assignments.

## Components

### Frontend
- **AiTutorChat.jsx**: Main chat interface component
  - Course context selector
  - Materials panel showing assignments/PDFs
  - Chat input and message display
  - PDF viewer modal
  - RAG debug info display

### API Routes
- **GET /api/rag/debug/report**: Debug endpoint for RAG index status
- **POST /api/rag/index/course/:courseId**: Index PDFs for a course
- **POST /api/rag/index/assignment/:courseId/:assignmentId**: Index single assignment
- **POST /api/rag/retrieve**: Retrieve relevant chunks for a query
- **POST /api/ai/chat**: Main chat endpoint with RAG integration

### Services/Modules

#### Backend Services
- **ingestion.service.js**: Handles document ingestion into RAG system
  - PDF text extraction with OCR
  - Chunking and embedding generation
  - Storage in PostgreSQL and Typesense
- **retrieval.service.js**: Handles RAG retrieval process
  - Query cleaning and preprocessing
  - Typesense search with PDF prioritization
  - Chunk ranking and filtering
- **ai.service.js**: AI chat logic
  - RAG integration for context-aware responses
  - Fallback mechanisms for courses without PDFs
  - Response normalization

#### Data Models
- **rag_chunks**: PostgreSQL table storing document chunks
  - Fields: id, course_id, title, content, heading, chunk_index, kind, source_platform
- **rag_index_meta**: PostgreSQL table storing indexing metadata
  - Fields: course_id, last_indexed, doc_counts, status
- **assignments**: Firestore collection with Gradescope assignments
- **courses**: Firestore collection with course information

## Data Flow

### 1. Course Selection
1. User selects course from dropdown in AI Tutor
2. Frontend calls `GET /api/ai/materials/:courseId`
3. Backend returns assignments and materials for the course
4. Frontend displays materials in scrollable panel

### 2. PDF Indexing (when needed)
1. User clicks "Index PDFs now" button
2. Frontend calls `POST /api/rag/index/course/:courseId`
3. Backend fetches Gradescope assignments for the course
4. For each assignment, downloads PDF and extracts text
5. Chunks text and generates embeddings
6. Stores chunks in PostgreSQL and Typesense
7. Updates indexing metadata

### 3. Chat with RAG
1. User types question in chat input
2. Frontend calls `POST /api/ai/chat` with courseId and message
3. Backend calls `retrieval.service.retrieve()` to find relevant chunks
4. Backend calls `ai.service.answerQuestionWithRAG()` with chunks
5. AI service builds context-aware prompt and calls Gemini
6. Response includes sources and confidence level
7. Frontend displays answer with citations

### 4. PDF Viewing
1. User clicks on assignment in materials panel
2. Frontend calls `openMaterial()` function
3. For Gradescope assignments, calls `GET /api/gradescope/assignments/:gsCourseId/:gsAssignmentId/pdf`
4. PDF opens in modal viewer

## Key Features

### PDF Prioritization
- RAG retrieval prioritizes `kind='gradescope-pdf'` chunks over metadata
- Query cleaning removes punctuation and common words
- Fallback to metadata chunks if no PDF chunks found

### Error Handling
- Graceful fallback when no PDFs are indexed
- Clear error messages for expired Gradescope sessions
- Debug information for troubleshooting

### Performance
- Caching of retrieval results
- Parallel processing of multiple assignments
- Efficient chunk storage and retrieval

## Configuration

### Environment Variables
- `RAG_ENABLED`: Enable/disable RAG functionality
- `LOG_RAG_DEBUG`: Enable detailed RAG logging
- `DEV_NO_AUTH`: Development mode authentication bypass

### Database Schema
- PostgreSQL with pgvector for embeddings
- Typesense for keyword search
- Firestore for course and assignment data

## Troubleshooting

### Common Issues
1. **"I don't see this information"**: Check if PDFs are indexed (`GET /api/rag/debug/report`)
2. **Empty responses**: Verify RAG pipeline is working (`POST /api/rag/retrieve`)
3. **PDF viewer issues**: Check Gradescope session and assignment IDs
4. **Slow responses**: Check database performance and chunk counts

### Debug Endpoints
- `GET /api/rag/debug/report?courseId=...`: Check indexing status
- `POST /api/rag/retrieve`: Test retrieval directly
- `POST /api/ai/chat`: Test full chat pipeline
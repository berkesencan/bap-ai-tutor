# Embedding Fallbacks Implementation Summary

## Overview
Implemented reliable retrieval with embedding fallbacks and proper provider configuration to ensure BM25 works alone when embeddings fail.

## Changes Made

### 1. Flags & Configuration (`backend/config/flags.js`)
- Added new embedding provider flags:
  - `EMBEDDINGS_PROVIDER` (google, jina, none) - default: "google"
  - `GOOGLE_API_KEY` - Google API key
  - `JINA_API_KEY` - Jina API key  
  - `GOOGLE_EMBED_MODEL` - default: "text-embedding-004"
  - `JINA_EMBED_MODEL` - default: "jina-embeddings-v3"
- Added validation logic to force embeddings OFF if provider is set but API key is missing
- Updated exports to include new flags

### 2. Embedding Abstraction Layer (`backend/retrieval/embeddings/`)
- **`index.js`**: Main abstraction with `embed(query)` function that dispatches to providers
- **`google.js`**: Google Generative Language API implementation
- **`jina.js`**: Jina OpenAI-compatible API implementation
- Both providers return `null` on error (no throwing)

### 3. Retrieval Service Updates (`backend/retrieval/retrieval.service.js`)
- Imported new embedding abstraction
- Updated `searchSemantic()` to use new `embed()` function
- Updated `searchSingleQuery()` to use new `embed()` function with fallback logging
- Enhanced Typesense queries to include:
  - `query_by: 'title,heading,content,text'`
  - `include_fields: 'id,title,heading,content,text,page,kind,question_label,filename,assignment_id,course_id,_text_match'`
- Added content normalization: `doc.content = doc.content?.trim()?.length ? doc.content : (doc.text || '')`
- Removed old embedding generation methods

### 4. AI Service Updates (`backend/services/ai.service.js`)
- Updated `mapChunksToPromptContext()` to filter out snippets < 20 chars
- Ensured proper content/text field usage

### 5. Ingestion Service Updates (`backend/ingestion/ingestion.service.js`)
- Added validation to only mark success when `Array.isArray(chunks) && chunks.length > 0`
- Enhanced error reporting with specific failure reasons
- Added proper error responses for parsing failures

### 6. Frontend Chat Component (`frontend/src/components/AiTutorChat.jsx`)
- Updated materials list display to only show when there's NO assistant text
- Added conditional rendering: `(!msg.text || !msg.content || (msg.text || msg.content).trim().length === 0)`

### 7. Environment Configuration (`backend/env.dev.example`)
- Added new embedding flags with comments
- Organized configuration sections
- Added provider/model combination explanations

### 8. Debug Endpoint (`backend/routes/debug.routes.js`)
- Created `/api/debug/peek?courseId=...` endpoint
- Tests BM25 search with "Problem 2" query
- Returns `{ title, page, len: (content.length), sample: content.slice(0,140) }` for top 3 results
- Added to main routes in `backend/routes/index.js`

### 9. Test Script (`test-embedding-fallbacks.js`)
- Created comprehensive test script for all embedding modes
- Tests BM25-only, Google embeddings, and Jina embeddings
- Validates provider configuration

## Key Features

### Embedding Fallbacks
- **BM25-Only Mode**: When `USE_EMBEDDINGS=false` or embedding generation fails
- **Provider Validation**: Automatic fallback to BM25 if API keys are missing
- **Error Handling**: No throwing, graceful degradation to keyword search

### Provider Support
- **Google**: Uses Generative Language API with proper model names
- **Jina**: Uses OpenAI-compatible API with correct model names
- **None**: Disables embeddings entirely

### Typesense Integration
- Enhanced field inclusion for better content retrieval
- Proper content normalization
- Relaxed filters to avoid type mismatches

### Frontend Improvements
- Materials list only shows when assistant has no text
- Better conditional rendering logic

## Testing

### Manual Tests
1. **BM25 Only**: Set `USE_EMBEDDINGS=false` and test retrieval
2. **Google Embeddings**: Set `EMBEDDINGS_PROVIDER=google` with valid API key
3. **Jina Embeddings**: Set `EMBEDDINGS_PROVIDER=jina` with valid API key
4. **Typesense Probe**: Use `/api/debug/peek?courseId=...` to verify content

### Automated Tests
Run `node test-embedding-fallbacks.js` to test all modes

## Configuration Examples

### BM25 Only (No API Keys)
```env
USE_EMBEDDINGS=false
```

### Google Embeddings
```env
USE_EMBEDDINGS=true
EMBEDDINGS_PROVIDER=google
GOOGLE_API_KEY=your-key-here
GOOGLE_EMBED_MODEL=text-embedding-004
```

### Jina Embeddings
```env
USE_EMBEDDINGS=true
EMBEDDINGS_PROVIDER=jina
JINA_API_KEY=your-key-here
JINA_EMBED_MODEL=jina-embeddings-v3
```

## Logs & Monitoring

The implementation includes comprehensive logging:
- Embedding provider selection and fallbacks
- BM25 vs hybrid search mode
- Content normalization results
- Parsing success/failure with reasons
- Retrieval statistics and performance

All changes maintain backward compatibility and include proper error handling.

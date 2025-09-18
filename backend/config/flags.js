/**
 * RAG Feature Flags Configuration
 * 
 * Centralized configuration for RAG pipeline feature toggles
 * Read once at startup to avoid process.env calls throughout codebase
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Core RAG flags
const RAG_ENABLED = process.env.RAG_ENABLED === 'true';
const DEV_NO_AUTH = process.env.DEV_NO_AUTH === 'true';
const DEV_USER_ID = process.env.DEV_USER_ID || 'dev-user';

// Dev impersonation and membership relaxation (dev-only)
const DEV_IMPERSONATE = process.env.DEV_IMPERSONATE === 'true';
const DEV_RELAX_MEMBERSHIP = process.env.DEV_RELAX_MEMBERSHIP === 'true';

// Dev shadowing for course context (dev-only)
const DEV_SHADOW_USER_ID = process.env.DEV_SHADOW_USER_ID || '';
const ALLOW_DEV_SHADOW_HEADER = process.env.ALLOW_DEV_SHADOW_HEADER !== 'false';

// Helper function for boolean parsing
function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  const s = String(v).toLowerCase().trim();
  return ['1', 'true', 'yes', 'on'].includes(s);
}

// Optional features
const RAW_USE_EMBEDDINGS = bool(process.env.USE_EMBEDDINGS, true);
const USE_RERANK = process.env.USE_RERANK === 'true';
const USE_LLAMA_PARSE = process.env.USE_LLAMA_PARSE === 'true';

// Embedding configuration
const EMBEDDINGS_PROVIDER = (process.env.EMBEDDINGS_PROVIDER || 'google').toLowerCase();
const EMBEDDINGS_MODEL = process.env.EMBEDDINGS_MODEL || 'text-embedding-004';
const EMBEDDINGS_DIM = Number(process.env.EMBEDDINGS_DIM || 768);
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const JINA_API_KEY = process.env.JINA_API_KEY;
const GOOGLE_EMBED_MODEL = process.env.GOOGLE_EMBED_MODEL || 'text-embedding-004';
const JINA_EMBED_MODEL = process.env.JINA_EMBED_MODEL || 'jina-embeddings-v3';

// Check if we have the required API keys for the selected provider
const HAS_GOOGLE_KEY = !!process.env.GOOGLE_API_KEY;
const HAS_JINA_KEY = !!process.env.JINA_API_KEY;

const PROVIDER_OK =
  (EMBEDDINGS_PROVIDER === 'google' && HAS_GOOGLE_KEY) ||
  (EMBEDDINGS_PROVIDER === 'jina' && HAS_JINA_KEY);

// FINAL, EFFECTIVE FLAG (no reassignment later)
const USE_EMBEDDINGS = RAW_USE_EMBEDDINGS && PROVIDER_OK && EMBEDDINGS_PROVIDER !== 'none';

// Auto-detect embedding dimension at runtime
let ACTUAL_EMBEDDINGS_DIM = null;

// OCR configuration
const OCR_PROVIDER = process.env.OCR_PROVIDER || 'tesseract';
const OCR_LANGUAGES = process.env.OCR_LANGUAGES || 'eng';
const OCR_STRATEGY = process.env.OCR_STRATEGY || 'hi_res';

// Context configuration
const MAX_CONTEXT_CHARS = Number(process.env.MAX_CONTEXT_CHARS || 1200);

// Reranker configuration
const ENABLE_RERANKER = process.env.ENABLE_RERANKER === 'true';
const RERANKER_PROVIDER = process.env.RERANKER_PROVIDER || 'cohere';
const RERANKER_TOP_K_INPUT = parseInt(process.env.RERANKER_TOP_K_INPUT || '20', 10);
const RERANKER_TOP_N = parseInt(process.env.RERANKER_TOP_N || '8', 10);

// Multi-Query Expansion configuration
const ENABLE_MQE = process.env.ENABLE_MQE === 'true';
const MQE_NUM = parseInt(process.env.MQE_NUM || '3', 10);
const MQE_PROVIDER = process.env.MQE_PROVIDER || 'gemini';
const MQE_TEMPERATURE = Number(process.env.MQE_TEMPERATURE || 0.1);

// Service URLs
const UNSTRUCTURED_URL = process.env.UNSTRUCTURED_URL || 'http://localhost:8001';
const DATABASE_URL = process.env.DATABASE_URL;
const TYPESENSE_HOST = process.env.TYPESENSE_HOST || 'localhost';
const TYPESENSE_PORT = process.env.TYPESENSE_PORT || '8108';
const TYPESENSE_PROTOCOL = process.env.TYPESENSE_PROTOCOL || 'http';
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY || 'xyz';

// API Keys (optional features)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;
const LLAMA_CLOUD_API_KEY = process.env.LLAMA_CLOUD_API_KEY;

// Validation
if (RAG_ENABLED && !DATABASE_URL) {
  console.warn('[FLAGS] RAG_ENABLED=true but DATABASE_URL not set');
}

// Embedding provider validation and fallback
if (RAW_USE_EMBEDDINGS && !PROVIDER_OK && EMBEDDINGS_PROVIDER !== 'none') {
  console.warn(
    `[FLAGS] Embeddings requested but missing API key for provider="${EMBEDDINGS_PROVIDER}". ` +
    `Falling back to BM25-only.`
  );
}

if (USE_RERANK && !VOYAGE_API_KEY && !COHERE_API_KEY) {
  console.warn('[FLAGS] USE_RERANK=true but no reranking API key set');
}

// Export configuration
module.exports = {
  // Core flags
  RAG_ENABLED,
  DEV_NO_AUTH,
  DEV_USER_ID,
  DEV_IMPERSONATE,
  DEV_RELAX_MEMBERSHIP,
  DEV_SHADOW_USER_ID,
  ALLOW_DEV_SHADOW_HEADER,
  
  // Optional features
  USE_EMBEDDINGS,
  USE_RERANK,
  USE_LLAMA_PARSE,
  
  // Embedding configuration
  EMBEDDINGS_PROVIDER,
  EMBEDDINGS_MODEL,
  EMBEDDINGS_DIM,
  ACTUAL_EMBEDDINGS_DIM,
  GOOGLE_API_KEY,
  JINA_API_KEY,
  GOOGLE_EMBED_MODEL,
  JINA_EMBED_MODEL,
  RAW_USE_EMBEDDINGS,
  HAS_GOOGLE_KEY,
  HAS_JINA_KEY,
  PROVIDER_OK,
  
  // OCR configuration
  OCR_PROVIDER,
  OCR_LANGUAGES,
  OCR_STRATEGY,
  
  // Context configuration
  MAX_CONTEXT_CHARS,
  
  // Reranker configuration
  ENABLE_RERANKER,
  RERANKER_PROVIDER,
  RERANKER_TOP_K_INPUT,
  RERANKER_TOP_N,
  
  // Multi-Query Expansion configuration
  ENABLE_MQE,
  MQE_NUM,
  MQE_PROVIDER,
  MQE_TEMPERATURE,
  
  // Service configuration
  UNSTRUCTURED_URL,
  DATABASE_URL,
  TYPESENSE_HOST,
  TYPESENSE_PORT,
  TYPESENSE_PROTOCOL,
  TYPESENSE_API_KEY,
  
  // API Keys
  OPENAI_API_KEY,
  VOYAGE_API_KEY,
  COHERE_API_KEY,
  LLAMA_CLOUD_API_KEY,
  
  // Computed values
  TYPESENSE_URL: `${TYPESENSE_PROTOCOL}://${TYPESENSE_HOST}:${TYPESENSE_PORT}`,
  
  // Debug info
  toString() {
    return JSON.stringify({
      RAG_ENABLED,
      DEV_NO_AUTH,
      USE_EMBEDDINGS,
      USE_RERANK,
      USE_LLAMA_PARSE,
      EMBEDDINGS_MODEL,
      EMBEDDINGS_DIM,
      OCR_PROVIDER,
      OCR_LANGUAGES,
      OCR_STRATEGY,
      MAX_CONTEXT_CHARS,
      ENABLE_RERANKER,
      RERANKER_PROVIDER,
      RERANKER_TOP_K_INPUT,
      RERANKER_TOP_N,
      ENABLE_MQE,
      MQE_NUM,
      MQE_PROVIDER,
      MQE_TEMPERATURE,
      hasDatabase: !!DATABASE_URL,
      hasTypesense: !!TYPESENSE_API_KEY,
      hasEmbeddings: !!(GOOGLE_API_KEY || JINA_API_KEY || OPENAI_API_KEY),
      hasRerank: !!(VOYAGE_API_KEY || COHERE_API_KEY)
    }, null, 2);
  }
};

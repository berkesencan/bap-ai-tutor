/**
 * Reranker Module - Unified interface for different reranking providers
 */

const { rerankWithCohere } = require('./cohere');
const { rerankWithBGE } = require('./bge');

/**
 * Rerank documents using the specified provider
 * @param {Object} params - Reranking parameters
 * @param {string} params.provider - Provider name ('cohere' | 'bge')
 * @param {string} params.query - Original query
 * @param {Array} params.docs - Documents to rerank [{ id, text, meta }]
 * @param {number} params.topN - Number of top documents to return
 * @returns {Promise<Array>} - Reranked documents with rerankScore
 */
async function rerank({ provider, query, docs, topN }) {
  if (!docs?.length) return [];
  
  try {
    switch (provider) {
      case 'cohere':
        return await rerankWithCohere({ query, docs, topN });
      case 'bge':
        return await rerankWithBGE({ query, docs, topN });
      default:
        console.warn(`[RERANKER] Unknown provider: ${provider}, falling back to original order`);
        return docs.slice(0, topN);
    }
  } catch (error) {
    console.error(`[RERANKER] Error with provider ${provider}:`, error.message);
    // Fallback to original order on error
    return docs.slice(0, topN);
  }
}

module.exports = { rerank };

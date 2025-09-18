/**
 * Cohere Reranker Implementation (v7+ API)
 */

const flags = require('../../config/flags');

let client;
function getClient() {
  if (client) return client;
  const { CohereClient } = require('cohere-ai'); // v7+ API
  const apiKey = process.env.COHERE_API_KEY || flags.COHERE_API_KEY;
  if (!apiKey) throw new Error('COHERE_API_KEY is missing');
  client = new CohereClient({ token: apiKey });
  return client;
}

/**
 * Rerank documents using Cohere's rerank API
 * @param {Object} params - Reranking parameters
 * @param {string} params.query - Original query
 * @param {Array} params.docs - Documents to rerank [{ id, text, meta }]
 * @param {number} params.topN - Number of top documents to return
 * @returns {Promise<Array>} - Reranked documents with rerankScore
 */
async function rerankWithCohere({ query, docs, topN }) {
  if (!docs?.length) return [];
  
  try {
    console.log(`[RERANKER] Cohere reranking ${docs.length} docs, keeping top ${topN}`);
    
    const cohere = getClient();
    const resp = await cohere.rerank({
      model: 'rerank-english-v3.0',
      query,
      // New API expects array of { text }
      documents: docs.map(d => ({ text: d.text })),
      topN: Math.min(topN, docs.length),
    });

    // resp.results: [{ index, relevance_score }]
    const reranked = resp.results
      .map(r => ({
        ...docs[r.index],
        rerankScore: r.relevance_score ?? r.relevanceScore ?? r.score ?? 0,
      }))
      .sort((a, b) => b.rerankScore - a.rerankScore);

    console.log(`[RERANKER] Cohere completed, returned ${reranked.length} docs`);
    return reranked;

  } catch (err) {
    console.warn('[RERANK] Cohere failed:', err.message);
    return docs.slice(0, Math.min(topN, docs.length)); // graceful fallback
  }
}

module.exports = { rerankWithCohere };

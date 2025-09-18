/**
 * BGE Reranker Implementation using @xenova/transformers
 */

let crossEncoder = null;

/**
 * Load the BGE reranker model (lazy loading)
 * @returns {Promise<Object>} - The loaded model
 */
async function load() {
  if (!crossEncoder) {
    console.log('[RERANKER] Loading BGE reranker model...');
    try {
      // Dynamic import for ES module
      const { pipeline } = await import('@xenova/transformers');
      
      crossEncoder = await pipeline('text-classification', 'BAAI/bge-reranker-base', { 
        quantized: true,
        progress_callback: (progress) => {
          if (progress.status === 'downloading') {
            console.log(`[RERANKER] Downloading model: ${Math.round(progress.progress * 100)}%`);
          }
        }
      });
      console.log('[RERANKER] BGE model loaded successfully');
    } catch (error) {
      console.error('[RERANKER] Failed to load BGE model:', error.message);
      throw error;
    }
  }
  return crossEncoder;
}

/**
 * Rerank documents using BGE reranker
 * @param {Object} params - Reranking parameters
 * @param {string} params.query - Original query
 * @param {Array} params.docs - Documents to rerank [{ id, text, meta }]
 * @param {number} params.topN - Number of top documents to return
 * @returns {Promise<Array>} - Reranked documents with rerankScore
 */
async function rerankWithBGE({ query, docs, topN }) {
  try {
    console.log(`[RERANKER] BGE reranking ${docs.length} docs, keeping top ${topN}`);
    
    const model = await load();
    
    // Create query-document pairs for scoring
    const pairs = docs.map(d => [query, d.text]);
    
    // Get relevance scores
    const scores = await model(pairs, { 
      topk: docs.length,
      batch_size: 8 // Process in batches to avoid memory issues
    });

    // Map scores back to documents and sort by relevance
    const ranked = docs.map((doc, i) => ({ 
      ...doc, 
      rerankScore: scores[i]?.score || 0 
    }))
    .sort((a, b) => b.rerankScore - a.rerankScore);

    const result = ranked.slice(0, Math.min(topN, ranked.length));
    console.log(`[RERANKER] BGE completed, returned ${result.length} docs`);
    
    return result;

  } catch (error) {
    console.error('[RERANKER] BGE reranking failed:', error.message);
    throw error;
  }
}

module.exports = { rerankWithBGE };

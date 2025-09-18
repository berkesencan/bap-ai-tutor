const axios = require('axios');
const flags = require('../../config/flags');

/**
 * Jina Embeddings provider
 * Uses Jina's OpenAI-compatible API for text embeddings
 * @param {string} query - Text to embed
 * @returns {Promise<number[]|null>} - Embedding vector or null on error
 */
async function embed(query) {
  if (!flags.JINA_API_KEY) {
    console.warn('[JINA_EMBEDDINGS] No API key provided');
    return null;
  }

  try {
    const response = await axios.post(
      'https://api.jina.ai/v1/embeddings',
      {
        model: flags.JINA_EMBED_MODEL,
        input: [query],
        encoding_format: 'float'
      },
      {
        headers: {
          'Authorization': `Bearer ${flags.JINA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.status === 200 && response.data?.data?.[0]?.embedding) {
      return response.data.data[0].embedding;
    } else {
      console.error('[JINA_EMBEDDINGS] Unexpected response format:', response.data);
      return null;
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        console.error('[JINA_EMBEDDINGS] Authentication failed - check API key');
      } else {
        console.error(`[JINA_EMBEDDINGS] API error ${error.response.status}:`, error.response.data);
      }
    } else {
      console.error('[JINA_EMBEDDINGS] Request failed:', error.message);
    }
    return null;
  }
}

module.exports = {
  embed
};

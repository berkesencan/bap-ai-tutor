const axios = require('axios');
const flags = require('../../config/flags');

/**
 * Google Generative Language Embeddings provider
 * Uses the Google AI Studio API for text embeddings
 * @param {string} query - Text to embed
 * @returns {Promise<number[]|null>} - Embedding vector or null on error
 */
async function embed(query) {
  if (!flags.GOOGLE_API_KEY) {
    console.warn('[GOOGLE_EMBEDDINGS] No API key provided');
    return null;
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${flags.GOOGLE_EMBED_MODEL}:embedContent?key=${flags.GOOGLE_API_KEY}`,
      {
        model: `models/${flags.GOOGLE_EMBED_MODEL}`,
        content: {
          parts: [{ text: query }]
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.status === 200 && response.data?.embedding?.values) {
      return response.data.embedding.values;
    } else {
      console.error('[GOOGLE_EMBEDDINGS] Unexpected response format:', response.data);
      return null;
    }
  } catch (error) {
    if (error.response) {
      console.error(`[GOOGLE_EMBEDDINGS] API error ${error.response.status}:`, error.response.data);
    } else {
      console.error('[GOOGLE_EMBEDDINGS] Request failed:', error.message);
    }
    return null;
  }
}

module.exports = {
  embed
};

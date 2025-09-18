const flags = require('../../config/flags');

/**
 * Embedding abstraction layer
 * Dispatches to the appropriate embedding provider based on configuration
 * @param {string} query - Text to embed
 * @returns {Promise<number[]|null>} - Embedding vector or null on error
 */
async function embed(query) {
  if (!flags.USE_EMBEDDINGS) {
    return null;
  }

  try {
    let embedding = null;

    if (flags.EMBEDDINGS_PROVIDER === 'google') {
      const googleEmbed = require('./google');
      embedding = await googleEmbed.embed(query);
    } else if (flags.EMBEDDINGS_PROVIDER === 'jina') {
      const jinaEmbed = require('./jina');
      embedding = await jinaEmbed.embed(query);
    } else if (flags.EMBEDDINGS_PROVIDER === 'none') {
      return null;
    } else {
      console.warn(`[EMBEDDINGS] Unknown provider: ${flags.EMBEDDINGS_PROVIDER}`);
      return null;
    }

    return embedding;
  } catch (error) {
    console.error('[EMBEDDINGS] Error generating embedding:', error.message);
    return null;
  }
}

module.exports = {
  embed
};

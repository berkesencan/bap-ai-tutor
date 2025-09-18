const { getRetrievalService } = require('../../retrieval/retrieval.service');

class RetrieveController {
  static async retrieve(req, res) {
    try {
      const { courseId, query, limit = 8 } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_QUERY',
          message: 'query parameter is required'
        });
      }

      const retrievalService = getRetrievalService();
      if (!retrievalService) {
        return res.status(500).json({
          success: false,
          error: 'RETRIEVAL_SERVICE_UNAVAILABLE',
          message: 'RAG retrieval service not available'
        });
      }

      const result = await retrievalService.retrieve({
        courseId,
        query,
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: {
          chunks: result.chunks,
          low_confidence: result.low_confidence,
          stats: result.stats
        }
      });

    } catch (error) {
      console.error('[RAG RETRIEVE] Error:', error);
      res.status(500).json({
        success: false,
        error: 'RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
}

module.exports = RetrieveController;

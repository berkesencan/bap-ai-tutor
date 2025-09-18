const { getIngestionService } = require('../../ingestion/ingestion.service');

class DebugController {
  static async getDebugReport(req, res) {
    try {
      const { courseId } = req.query;
      
      if (!courseId) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_COURSE_ID',
          message: 'courseId query parameter is required'
        });
      }

      const ingestionService = getIngestionService();
      
      // Get chunk counts by kind
      const chunks = await ingestionService.getChunksByCourse(courseId);
      const docCounts = {
        total: chunks.length,
        pdfDocs: chunks.filter(c => c.kind === 'gradescope-pdf').length,
        metadataDocs: chunks.filter(c => c.kind === 'assignment-metadata').length,
        otherDocs: chunks.filter(c => !['gradescope-pdf', 'assignment-metadata'].includes(c.kind)).length
      };

      // Get sample chunks
      const sample = chunks.slice(0, 3).map(c => ({
        id: c.id,
        title: c.title,
        kind: c.kind,
        source_platform: c.source_platform,
        content_preview: (c.content || '').substring(0, 100) + '...'
      }));

      // Get indexing metadata
      const indexMeta = await ingestionService.getIndexMeta(courseId);

      res.json({
        success: true,
        data: {
          courseId,
          docCounts,
          sample,
          indexMeta,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('[RAG DEBUG] Error getting debug report:', error);
      res.status(500).json({
        success: false,
        error: 'DEBUG_REPORT_FAILED',
        message: error.message
      });
    }
  }
}

module.exports = DebugController;
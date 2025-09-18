const progressTracking = require('../services/progress-tracking.service');

console.log('[IMPORT STATUS] Controller loaded');

class ImportStatusController {
  /**
   * Get import status for a course
   */
  static async status(req, res) {
    const courseId = req.params.courseId || req.query.courseId;
    if (!courseId) {
      return res.status(200).json({ course: { status: 'unknown' }, assignments: [] });
    }
    
    const userId = req.user?.uid || req.query.uid || req.headers['x-dev-user-id'] || process.env.DEV_USER_ID;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: 'User ID required (uid query param or authenticated user)'
      });
    }
    
    console.log(`[IMPORT STATUS] hit`, { uid: userId, courseId });
    
    try {
      // Get course progress
      const courseProgress = await progressTracking.getCourseProgress(userId, courseId);
      console.log(`[IMPORT STATUS] course doc found:`, !!courseProgress);
      
      if (!courseProgress) {
        // Return graceful response instead of 404
        return res.json({
          success: true,
          data: {
            course: { status: 'unknown' },
            assignments: [],
            totalAssignments: 0
          }
        });
      }
      
      // Get assignments (limit to 100)
      const assignments = await progressTracking.getCourseAssignments(userId, courseId, 100);
      
      res.json({
        success: true,
        data: {
          course: courseProgress,
          assignments,
          totalAssignments: assignments.length
        }
      });
      
    } catch (error) {
      console.error('[IMPORT STATUS] Error getting course status:', error);
      res.status(500).json({
        success: false,
        error: 'STATUS_FAILED',
        message: error.message
      });
    }
  }
}

module.exports = ImportStatusController;

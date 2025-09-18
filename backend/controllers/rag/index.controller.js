const { getIngestionService } = require('../../ingestion/ingestion.service');
const { getServiceForUser } = require('../gradescope.controller');
const { fetchAssignmentArtifact } = require('../../services/gradescope/fetcher');
const Assignment = require('../../models/assignment.model');
const Course = require('../../models/course.model');

class IndexController {
  static async indexCourse(req, res) {
    try {
      const { courseId } = req.params;
      const { force } = req.query;
      const userId = req.user?.uid || req.headers['x-dev-user-id'] || process.env.DEV_USER_ID;

      if (!courseId) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_COURSE_ID',
          message: 'courseId parameter is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'User authentication required - missing userId'
        });
      }

      console.log(`[RAG INDEX] Starting course indexing for courseId=${courseId}, userId=${userId}`);
      console.log(`[RAG INDEX] UserId type: ${typeof userId}, value: ${userId}`);

      // Get course information
      const course = await Course.getById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          error: 'COURSE_NOT_FOUND',
          message: 'Course not found'
        });
      }

      // Check if already indexed (unless force=true)
      if (force !== 'true') {
        const ingestionService = getIngestionService();
        const existingChunks = await ingestionService.getChunksByCourse(courseId);
        const pdfChunks = existingChunks.filter(c => c.kind === 'gradescope-pdf');
        
        if (pdfChunks.length > 0) {
          return res.json({
            success: true,
            message: 'Course already indexed',
            data: {
              courseId,
              existingPdfChunks: pdfChunks.length,
              totalChunks: existingChunks.length
            }
          });
        }
      }

      // Course data already retrieved above
      
      // Get assignments for this course
      const assignments = await Assignment.getByCourseId(courseId);
      console.log(`[RAG INDEX] Found ${assignments.length} total assignments`);
      assignments.forEach(a => {
        console.log(`[RAG INDEX] Assignment: ${a.title}, platform: ${a.platform}, source: ${a.source}`);
      });
      
      const gradescopeAssignments = assignments.filter(a => 
        a.platform?.toLowerCase() === 'gradescope' || 
        a.source?.toLowerCase() === 'gradescope'
      );

      if (gradescopeAssignments.length === 0) {
        return res.json({
          success: true,
          message: 'No Gradescope assignments found for this course',
          data: {
            courseId,
            totalAssignments: assignments.length,
            gradescopeAssignments: 0
          }
        });
      }

      console.log(`[RAG INDEX] Found ${gradescopeAssignments.length} Gradescope assignments`);

      const ingestionService = getIngestionService();
      const gradescopeService = await getServiceForUser(userId);
      let indexedCount = 0;
      let errorCount = 0;
      const errors = [];

      // Process each assignment
      for (const assignment of gradescopeAssignments) {
        try {
          console.log(`[RAG INDEX] Processing assignment: ${assignment.title}`);
          
          // Get Gradescope course and assignment IDs
          const gsCourseId = assignment.raw?.gsCourseId || course.externalId;
          const gsAssignmentId = assignment.raw?.gsAssignmentId || assignment.externalId;

          console.log(`[RAG INDEX] Assignment ${assignment.title}: gsCourseId=${gsCourseId}, gsAssignmentId=${gsAssignmentId}`);

          if (!gsCourseId || !gsAssignmentId) {
            console.warn(`[RAG INDEX] Missing Gradescope IDs for assignment ${assignment.id}`);
            errorCount++;
            errors.push(`Assignment ${assignment.title}: Missing Gradescope IDs`);
            continue;
          }

          // Use the new fetcher to get assignment artifact
          const artifact = await fetchAssignmentArtifact(userId, gsCourseId, gsAssignmentId);

          if (artifact.kind === 'locked') {
            console.log(`[RAG INDEX] Assignment locked: ${assignment.title} - ${artifact.reason}`);
            // Create/update index metadata for locked assignment
            await ingestionService.updateAssignmentStatus(assignment.id, {
              status: 'LOCKED',
              reason: artifact.reason,
              evidence: artifact.evidence,
              lastCheckedAt: new Date(),
              gsCourseId,
              gsAssignmentId
            });
            continue;
          }

          if (artifact.kind !== 'pdf' && artifact.kind !== 'rendered-pdf') {
            console.warn(`[RAG INDEX] Unexpected artifact kind for assignment ${assignment.title}: ${artifact.kind}`);
            errorCount++;
            errors.push(`Assignment ${assignment.title}: Unexpected artifact kind`);
            continue;
          }

          // Extract text from PDF
          const extractedText = await gradescopeService.extractTextFromPDF(artifact.bytes);
          
          if (!extractedText || extractedText.trim().length < 200) {
            console.warn(`[RAG INDEX] Insufficient text extracted from PDF for assignment ${assignment.title}`);
            await ingestionService.updateAssignmentStatus(assignment.id, {
              status: 'LOCKED',
              reason: 'insufficient_content',
              evidence: 'PDF too small or empty',
              lastCheckedAt: new Date(),
              gsCourseId,
              gsAssignmentId
            });
            continue;
          }

          // Ingest the text
          const chunks = await ingestionService.ingestDocument({
            courseId: courseId,
            title: assignment.title,
            content: extractedText,
            kind: 'gradescope-pdf',
            sourcePlatform: 'gradescope',
            metadata: {
              assignmentId: assignment.id,
              gsCourseId: gsCourseId,
              gsAssignmentId: gsAssignmentId,
              platform: 'gradescope'
            }
          });

          indexedCount += chunks.length;
          console.log(`[RAG INDEX] Indexed ${chunks.length} chunks for assignment ${assignment.title}`);

        } catch (error) {
          console.error(`[RAG INDEX] Error processing assignment ${assignment.title}:`, error);
          errorCount++;
          errors.push(`Assignment ${assignment.title}: ${error.message}`);
        }
      }

      // Update indexing metadata
      await ingestionService.updateIndexMeta(courseId, {
        lastIndexed: new Date(),
        status: 'completed',
        docCounts: {
          assignments: gradescopeAssignments.length,
          chunks: indexedCount,
          errors: errorCount
        }
      });

      console.log(`[RAG INDEX] Course indexing completed: ${indexedCount} chunks, ${errorCount} errors`);

      res.json({
        success: true,
        message: 'Course indexing completed',
        data: {
          courseId,
          totalAssignments: gradescopeAssignments.length,
          indexedChunks: indexedCount,
          errorCount,
          errors: errors.slice(0, 10) // Limit error details
        }
      });

    } catch (error) {
      console.error('[RAG INDEX] Error indexing course:', error);
      res.status(500).json({
        success: false,
        error: 'INDEXING_FAILED',
        message: error.message
      });
    }
  }

  static async indexAssignment(req, res) {
    try {
      const { courseId, assignmentId } = req.params;
      const userId = req.user?.uid || req.headers['x-dev-user-id'] || process.env.DEV_USER_ID;

      if (!courseId || !assignmentId) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PARAMETERS',
          message: 'courseId and assignmentId parameters are required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'User authentication required - missing userId'
        });
      }

      console.log(`[RAG INDEX] Starting assignment indexing for courseId=${courseId}, assignmentId=${assignmentId}`);

      // Get assignment
      const assignment = await Assignment.getById(assignmentId);
      if (!assignment || assignment.courseId !== courseId) {
        return res.status(404).json({
          success: false,
          error: 'ASSIGNMENT_NOT_FOUND',
          message: 'Assignment not found or does not belong to this course'
        });
      }

      if (assignment.platform !== 'gradescope') {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PLATFORM',
          message: 'Only Gradescope assignments can be indexed'
        });
      }

      const ingestionService = getIngestionService();
      const gradescopeService = await getServiceForUser(userId);

      // Get Gradescope IDs
      const gsCourseId = assignment.raw?.gsCourseId || assignment.courseExternalId;
      const gsAssignmentId = assignment.raw?.gsAssignmentId || assignment.externalId;

      if (!gsCourseId || !gsAssignmentId) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_GRADESCOPE_IDS',
          message: 'Missing Gradescope course or assignment ID'
        });
      }

      // Download and process PDF with user context
      const pdfBuffer = await gradescopeService.getAssignmentPDF(gsCourseId, gsAssignmentId, userId);
      if (!pdfBuffer) {
        return res.status(404).json({
          success: false,
          error: 'PDF_NOT_AVAILABLE',
          message: 'PDF not available for this assignment'
        });
      }

      const extractedText = await gradescopeService.extractTextFromPDF(pdfBuffer);
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'NO_TEXT_EXTRACTED',
          message: 'No text could be extracted from the PDF'
        });
      }

      // Ingest the text
      const chunks = await ingestionService.ingestDocument({
        courseId: courseId,
        title: assignment.title,
        content: extractedText,
        kind: 'gradescope-pdf',
        sourcePlatform: 'gradescope',
        metadata: {
          assignmentId: assignment.id,
          gsCourseId: gsCourseId,
          gsAssignmentId: gsAssignmentId,
          platform: 'gradescope'
        }
      });

      console.log(`[RAG INDEX] Assignment indexing completed: ${chunks.length} chunks`);

      res.json({
        success: true,
        message: 'Assignment indexing completed',
        data: {
          courseId,
          assignmentId,
          indexedChunks: chunks.length,
          title: assignment.title
        }
      });

    } catch (error) {
      console.error('[RAG INDEX] Error indexing assignment:', error);
      res.status(500).json({
        success: false,
        error: 'INDEXING_FAILED',
        message: error.message
      });
    }
  }
}

module.exports = IndexController;
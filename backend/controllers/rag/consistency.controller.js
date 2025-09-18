const { Pool } = require('pg');
const flags = require('../../config/flags');
const { getIngestionService } = require('../../ingestion/ingestion.service');
const { getServiceForUser } = require('../gradescope.controller');
const { fetchAssignmentArtifact } = require('../../services/gradescope/fetcher');
const progressTracking = require('../../services/progress-tracking.service');
const { gradescopeKey, gcsPath } = require('../../services/storage/path');
const pLimit = require('p-limit');

class ConsistencyController {
  static async checkConsistency(req, res) {
    try {
      const { courseId } = req.params;
      
      if (!courseId) {
        return res.status(400).json({ 
          success: false, 
          error: 'MISSING_COURSE_ID',
          message: 'Course ID is required' 
        });
      }

      // Initialize database connection
      const db = new Pool({
        connectionString: flags.DATABASE_URL,
        ssl: false,
      });

      // Get materials from UI (using the same logic as the materials endpoint)
      const materialsFromUI = await ConsistencyController.getMaterialsFromUI(courseId);
      
      // Get indexed titles from database
      const indexedTitles = await ConsistencyController.getIndexedTitles(db, courseId);
      
      // Find missing and orphaned items
      const materialsSet = new Set(materialsFromUI);
      const indexedSet = new Set(indexedTitles);
      
      const missingInIndex = materialsFromUI.filter(title => !indexedSet.has(title));
      const orphansInIndex = indexedTitles.filter(title => !materialsSet.has(title));

      await db.end();

      res.json({
        success: true,
        data: {
          courseId,
          materialsFromUI,
          indexedTitles,
          missingInIndex,
          orphansInIndex,
          summary: {
            totalMaterials: materialsFromUI.length,
            totalIndexed: indexedTitles.length,
            missingCount: missingInIndex.length,
            orphanCount: orphansInIndex.length
          }
        }
      });

    } catch (error) {
      console.error('[CONSISTENCY CHECKER] Error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'CONSISTENCY_CHECK_FAILED', 
        message: error.message 
      });
    }
  }

  static async getMaterialsFromUI(courseId, userId) {
    // Use the same authoritative source as the materials endpoint
    try {
      const Assignment = require('../../models/assignment.model');
      const Course = require('../../models/course.model');
      
      // Get course info
      const course = await Course.getById(courseId);
      if (!course) {
        return { assignments: [] };
      }
      
      // Get assignments from assignments collection (authoritative source)
      const assignments = await Assignment.getByCourseId(courseId);
      console.log(`[CONSISTENCY CHECKER] Found ${assignments.length} assignments for course ${course.name}`);
      
      return {
        assignments: assignments.map(assignment => ({
          id: assignment.id,
          externalId: assignment.externalId || assignment.id,
          title: assignment.title || assignment.name || 'Untitled',
          platform: 'gradescope',
          raw: {
            gsCourseId: course.externalId || courseId,
            gsAssignmentId: assignment.externalId || assignment.id,
            sourcePlatform: 'gradescope'
          }
        }))
      };
      
    } catch (error) {
      console.error('[CONSISTENCY CHECKER] Error getting materials from UI:', error);
      return { assignments: [] };
    }
  }

  static async getIndexedTitles(db, courseId) {
    try {
      const result = await db.query(
        'SELECT DISTINCT title FROM rag_chunks WHERE course_id = $1 AND kind = $2 AND title IS NOT NULL ORDER BY title',
        [courseId, 'gradescope-pdf']
      );
      
      return result.rows.map(row => row.title);
      
    } catch (error) {
      console.error('[CONSISTENCY CHECKER] Error getting indexed titles:', error);
      return [];
    }
  }

  static async reindexMissingFromUi(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.uid || req.headers['x-dev-user-id'] || process.env.DEV_USER_ID || 'dev-cli';
      
      console.log(`[RECONCILE] course=${courseId} starting`);
      
      // Get UI materials (source of truth)
      const ui = await ConsistencyController.getMaterialsFromUI(courseId, userId);
      const assignments = ui.assignments || [];
      
      console.log(`[RECONCILE] course=${courseId} found ${assignments.length} assignments`);
      
      // Initialize progress tracking
      await progressTracking.initializeCourseProgress(userId, courseId, assignments.length);
      
      // Initialize all assignments as queued
      for (const assignment of assignments) {
        await progressTracking.initializeAssignmentProgress(
          userId, 
          courseId, 
          assignment.externalId, 
          assignment.title
        );
      }
      
      const ingestion = getIngestionService();
      const limit = pLimit(3); // Concurrency limit of 3
      
      let indexedCount = 0;
      let lockedCount = 0;
      let failedCount = 0;
      let missingCount = 0;
      
      // Process assignments with concurrency control
      const processAssignment = async (assignment) => {
        try {
          console.log(`[RECONCILE] Processing assignment: ${assignment.title}`);
          
          // Mark as running
          await progressTracking.markAssignmentRunning(userId, courseId, assignment.externalId);
          
          // Use the new fetcher to get assignment artifact
          const artifact = await fetchAssignmentArtifact(
            userId,
            assignment.raw.gsCourseId,
            assignment.raw.gsAssignmentId
          );

          if (artifact.kind === 'pdf' || artifact.kind === 'rendered-pdf') {
            // We have a valid PDF, upload to storage first
            const { FirebaseStorageProvider } = require('../../services/storage/firebase');
            const storage = FirebaseStorageProvider;
            
            const key = gradescopeKey({
              uid: userId,
              courseId: assignment.raw.gsCourseId,
              assignmentId: assignment.raw.gsAssignmentId
            });
            const { gcsPath: uploadedGcsPath } = await storage.putObject(key, artifact.bytes, { 
              contentType: "application/pdf", 
              cacheControl: "public,max-age=3600,immutable" 
            });
            
            console.log(`[UPLOAD] ${uploadedGcsPath}`);
            
            // Extract text and ingest
            const gs = await getServiceForUser(userId);
            const extractedText = await gs.extractTextFromPDF(artifact.bytes);
            
            if (extractedText && extractedText.trim().length >= 200) {
              // Ingest the document with the uploaded file
              await ingestion.ingestDocument({
                courseId,
                materialId: assignment.externalId,
                gcsPath: uploadedGcsPath,
                fileName: `${assignment.title}.pdf`,
                fileType: 'pdf',
                contentHash: `gradescope-${assignment.raw.gsAssignmentId}-${Date.now()}`,
                force: false
              });

              console.log(`[INGEST] success ${assignment.externalId}`);
              
              // Mark as ready
              await progressTracking.markAssignmentReady(userId, courseId, assignment.externalId, uploadedGcsPath);
              
              // Update course counters
              await progressTracking.updateCourseCounters(userId, courseId, {
                done: indexedCount + lockedCount + failedCount + missingCount + 1,
                filesReady: indexedCount + 1
              });
              
              indexedCount++;
            } else {
              // Mark as missing (insufficient content)
              await progressTracking.markAssignmentMissing(userId, courseId, assignment.externalId);
              lockedCount++;
            }
          } else {
            // Mark as missing (no PDF available)
            await progressTracking.markAssignmentMissing(userId, courseId, assignment.externalId);
            missingCount++;
          }
          
        } catch (error) {
          console.error(`[RECONCILE] Error processing assignment ${assignment.title}:`, error.message);
          
          // Mark as error
          await progressTracking.markAssignmentError(userId, courseId, assignment.externalId, error);
          failedCount++;
        }
      };
      
      // Process all assignments with concurrency limit
      await Promise.all(assignments.map(assignment => limit(() => processAssignment(assignment))));
      
      // Update final course status
      if (failedCount > 0) {
        await progressTracking.markCourseError(userId, courseId, new Error(`${failedCount} assignments failed`));
      } else {
        await progressTracking.markCourseReady(userId, courseId);
      }
      
      console.log(`[RECONCILE] course=${courseId} discovered=${assignments.length} uploaded=${indexedCount} ingested=${indexedCount} missing=${missingCount} error=${failedCount}`);
      
      return res.json({
        success: true,
        data: {
          courseId,
          uiCount: assignments.length,
          indexedCount,
          lockedCount,
          failedCount,
          missingCount
        }
      });
      
    } catch (error) {
      console.error('[RECONCILE] Error:', error);
      
      // Mark course as error
      const userId = req.user?.uid || req.headers['x-dev-user-id'] || process.env.DEV_USER_ID || 'dev-cli';
      await progressTracking.markCourseError(userId, req.params.courseId, error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async reindexAllVisible(req, res) {
    try {
      const userId = req.user?.uid || req.headers['x-dev-user-id'] || process.env.DEV_USER_ID || 'dev-cli';
      
      console.log(`[REINDEX ALL] Starting reindex for user ${userId}`);
      
      // Get all visible courses for the user
      const { getUserVisibleCourses } = require('../../services/courses.visible.service');
      const courses = await getUserVisibleCourses(userId);
      
      const results = [];
      
      // Process each course
      for (const course of courses) {
        try {
          console.log(`[REINDEX ALL] Processing course: ${course.name} (${course.id})`);
          
          // Reuse the per-course reconcile logic
          const mockReq = { params: { courseId: course.id } };
          const mockRes = {
            json: (data) => ({ course: course.name, ok: true, ...data.data })
          };
          
          const result = await ConsistencyController.reindexMissingFromUi(mockReq, mockRes);
          results.push(result);
          
        } catch (error) {
          console.error(`[REINDEX ALL] Error processing course ${course.name}:`, error);
          results.push({ 
            course: course.name, 
            ok: false, 
            error: error.message 
          });
        }
      }
      
      console.log(`[REINDEX ALL] Completed processing ${courses.length} courses`);
      
      res.json({
        success: true,
        data: {
          totalCourses: courses.length,
          results: results
        }
      });
      
    } catch (error) {
      console.error('[REINDEX ALL] Error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'REINDEX_ALL_FAILED', 
        message: error.message 
      });
    }
  }
}

module.exports = ConsistencyController;

const { admin } = require('./config/firebase');
const { getIngestionService } = require('./ingestion/ingestion.service');
const { getServiceForUser } = require('./controllers/gradescope.controller');

// Utility function to mask sensitive data in logs
function maskSensitiveData(str) {
  if (!str) return str;
  return str
    .replace(/_gradescope_session=[^;]+/g, '_gradescope_session=***MASKED***')
    .replace(/signed_token=[^;]+/g, 'signed_token=***MASKED***')
    .replace(/remember_me=[^;]+/g, 'remember_me=***MASKED***')
    .replace(/x-request-id[^,]*/g, 'x-request-id=***MASKED***');
}

/**
 * Auto-ingest assignment PDF into RAG when user tries to view it
 * @param {string} courseId - Internal BAP course ID
 * @param {string} assignmentId - Gradescope assignment ID
 * @param {string} userId - User ID
 * @param {Object} assignmentData - Assignment metadata
 * @param {string} gradescopeCourseId - Gradescope course ID
 * @returns {Promise<Object>} - Ingestion result
 */
async function autoIngestAssignmentPDF(courseId, assignmentId, userId, assignmentData, gradescopeCourseId) {
  try {
    console.log(`[AUTO-INGEST] Starting auto-ingestion for assignment ${assignmentId} (course: ${gradescopeCourseId})`);
    
    // Check if already ingested
    const ingestion = getIngestionService();
    await ingestion.initialize();
    
    const materialId = `assignment-${assignmentId}`;
    const existingChunks = await ingestion.getChunksByFile(courseId, materialId);
    
    if (existingChunks.length > 0) {
      console.log(`[AUTO-INGEST] Assignment ${assignmentId} already ingested (${existingChunks.length} chunks)`);
      return { status: 'already_ingested', chunkCount: existingChunks.length };
    }
    
    // Download PDF from Gradescope using the Gradescope course ID
    const gradescopeService = await getServiceForUser(userId);
    
    // Check assignment type first to avoid unnecessary PDF fetch for Programming assignments
    try {
      const assignmentInfo = await gradescopeService.getAssignmentInfo(gradescopeCourseId, assignmentId);
      if (assignmentInfo?.assignmentType === 'Programming') {
        console.log(`[AUTO-INGEST] Skipping PDF fetch for Programming assignment ${assignmentId}`);
        return {
          status: 'skipped',
          reason: 'Programming assignment - no PDF available',
          hasPdf: false,
          assignmentType: 'Programming'
        };
      }
    } catch (infoError) {
      console.warn(`[AUTO-INGEST] Could not get assignment info: ${infoError.message}`);
      // Continue with PDF fetch attempt
    }
    
    // Retry logic for transient 5xx errors
    let pdfBuffer;
    let lastError;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        pdfBuffer = await gradescopeService.getAssignmentPDF(gradescopeCourseId, assignmentId);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        
        // Only retry on 5xx errors, not on 4xx or other errors
        if (error.status >= 500 && error.status < 600 && attempt < maxRetries) {
          const delay = Math.random() * 1000 + 500; // 500-1500ms jittered delay
          console.warn(`[AUTO-INGEST] Attempt ${attempt} failed with 5xx error, retrying in ${delay}ms: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error; // Don't retry on 4xx or final attempt
        }
      }
    }
    
    if (!pdfBuffer || !pdfBuffer.length) {
      throw new Error(`No PDF buffer returned for assignment ${assignmentId} after ${maxRetries} attempts`);
    }

    // Upload directly to Firebase Storage (for persistence)
    const bucket = admin.storage().bucket();
    const gcsKey = `gradescope/${userId}/${gradescopeCourseId}/${assignmentId}.pdf`;
    await bucket.file(gcsKey).save(pdfBuffer, {
      resumable: false,
      contentType: 'application/pdf',
      metadata: { cacheControl: 'public,max-age=3600' },
    });
    const gcsPath = `gs://${bucket.name}/${gcsKey}`;

    console.log(`[AUTO-INGEST] Uploaded PDF to storage: ${gcsPath}`);

    // Ingest into RAG using the in-memory buffer (no GCS download needed)
    const result = await ingestion.ingestDocument({
      courseId,
      materialId,
      fileName: `${assignmentData.title || 'Assignment'}.pdf`,
      fileType: 'pdf',
      contentHash: `auto-${assignmentId}-${Date.now()}`,
      force: false,
      // Pass buffer directly to avoid GCS download round-trip
      buffer: pdfBuffer,
      gcsPath: gcsPath, // Keep for reference
      source: 'gradescope',
      metadata: { 
        userId, 
        courseId, 
        assignmentId, 
        gradescopeCourseId,
        gcsPath 
      }
    });

    console.log(`[AUTO-INGEST] Successfully ingested assignment ${assignmentId}: ${result.chunkCount} chunks`);
    return result;
    
  } catch (error) {
    const maskedError = maskSensitiveData(error.message);
    console.error(`[AUTO-INGEST] Failed to auto-ingest assignment ${assignmentId}:`, maskedError);
    return { 
      status: 'failed', 
      error: maskedError,
      hasPdf: false,
      reason: 'Auto-ingestion failed'
    };
  }
}

module.exports = { autoIngestAssignmentPDF };
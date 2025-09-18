#!/usr/bin/env node

/**
 * Backfill Script: Re-ingest PDFs with OCR and regenerate embeddings
 * 
 * This script finds chunks where content is empty or embeddings are missing/wrong dimension,
 * then re-runs ingestion with OCR enabled and regenerates embeddings.
 */

const { Pool } = require('pg');
const Typesense = require('typesense');
const flags = require('../config/flags');
const { getIngestionService } = require('../ingestion/ingestion.service');
const { getServiceForUser } = require('../controllers/gradescope.controller');

// Initialize database connection
const db = new Pool({
  connectionString: flags.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Initialize Typesense client
const typesense = new Typesense.Client({
  nodes: [{
    host: flags.TYPESENSE_HOST,
    port: parseInt(flags.TYPESENSE_PORT),
    protocol: flags.TYPESENSE_PROTOCOL
  }],
  apiKey: flags.TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 10
});

async function findChunksNeedingBackfill() {
  console.log('[BACKFILL] Finding chunks that need backfill...');
  
  const query = `
    SELECT 
      course_id,
      file_id,
      COUNT(*) as chunk_count,
      COUNT(CASE WHEN content IS NULL OR content = '' THEN 1 END) as empty_content_count,
      COUNT(CASE WHEN embedding IS NULL THEN 1 END) as missing_embedding_count,
      COUNT(CASE WHEN array_length(embedding, 1) != $1 THEN 1 END) as wrong_dimension_count
    FROM rag_chunks 
    WHERE kind = 'gradescope-pdf'
    GROUP BY course_id, file_id
    HAVING 
      COUNT(CASE WHEN content IS NULL OR content = '' THEN 1 END) > 0 OR
      COUNT(CASE WHEN embedding IS NULL THEN 1 END) > 0 OR
      COUNT(CASE WHEN array_length(embedding, 1) != $1 THEN 1 END) > 0
    ORDER BY course_id, file_id
  `;
  
  const result = await db.query(query, [flags.EMBEDDINGS_DIM]);
  return result.rows;
}

async function getAssignmentInfo(courseId, fileId) {
  console.log(`[BACKFILL] Getting assignment info for course ${courseId}, file ${fileId}`);
  
  try {
    // Get assignment details from database
    const assignmentQuery = `
      SELECT 
        a.id as assignment_id,
        a.title,
        a.external_id as gradescope_assignment_id,
        c.external_id as gradescope_course_id,
        c.title as course_title
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.course_id = $1 AND a.id = $2
    `;
    
    const result = await db.query(assignmentQuery, [courseId, fileId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error(`[BACKFILL] Error getting assignment info:`, error.message);
    return null;
  }
}

async function reingestAssignment(assignmentInfo, userId = 'dev-cli') {
  if (!assignmentInfo) {
    console.log('[BACKFILL] No assignment info found, skipping');
    return { status: 'skipped', reason: 'No assignment info' };
  }
  
  console.log(`[BACKFILL] Re-ingesting assignment: ${assignmentInfo.title}`);
  
  try {
    // Get Gradescope service
    const gradescopeService = await getServiceForUser(userId);
    
    // Check assignment type first
    try {
      const assignmentInfoGS = await gradescopeService.getAssignmentInfo(
        assignmentInfo.gradescope_course_id, 
        assignmentInfo.gradescope_assignment_id
      );
      
      if (assignmentInfoGS?.assignmentType === 'Programming') {
        console.log(`[BACKFILL] Skipping Programming assignment: ${assignmentInfo.title}`);
        return { status: 'skipped', reason: 'Programming assignment' };
      }
    } catch (infoError) {
      console.warn(`[BACKFILL] Could not get assignment info: ${infoError.message}`);
    }
    
    // Download PDF
    const pdfBuffer = await gradescopeService.getAssignmentPDF(
      assignmentInfo.gradescope_course_id,
      assignmentInfo.gradescope_assignment_id
    );
    
    if (!pdfBuffer || !pdfBuffer.length) {
      console.log(`[BACKFILL] No PDF buffer for assignment: ${assignmentInfo.title}`);
      return { status: 'skipped', reason: 'No PDF buffer' };
    }
    
    // Upload to Firebase Storage
    const { admin } = require('../config/firebase');
    const bucket = admin.storage().bucket();
    const gcsKey = `gradescope/${userId}/${assignmentInfo.gradescope_course_id}/${assignmentInfo.gradescope_assignment_id}.pdf`;
    
    await bucket.file(gcsKey).save(pdfBuffer, {
      resumable: false,
      contentType: 'application/pdf',
      metadata: { cacheControl: 'public,max-age=3600' },
    });
    
    const gcsPath = `gs://${bucket.name}/${gcsKey}`;
    console.log(`[BACKFILL] Uploaded PDF to: ${gcsPath}`);
    
    // Re-ingest with OCR enabled
    const ingestionService = getIngestionService();
    await ingestionService.initialize();
    
    console.log(`[BACKFILL] Starting re-ingestion for ${assignmentInfo.title}...`);
    const result = await ingestionService.ingestDocument({
      courseId: assignmentInfo.course_id,
      materialId: assignmentInfo.assignment_id,
      fileName: `${assignmentInfo.title}.pdf`,
      fileType: 'pdf',
      contentHash: `backfill-${assignmentInfo.assignment_id}-${Date.now()}`,
      force: true, // Force re-ingestion
      buffer: pdfBuffer,
      gcsPath: gcsPath,
      source: 'gradescope',
      metadata: {
        userId,
        courseId: assignmentInfo.course_id,
        assignmentId: assignmentInfo.assignment_id,
        gradescopeCourseId: assignmentInfo.gradescope_course_id,
        gcsPath
      }
    });
    
    console.log(`[BACKFILL] Re-ingestion result:`, {
      status: result.status,
      chunkCount: result.chunkCount,
      hasPdf: result.hasPdf,
      bytesProcessed: result.bytesProcessed
    });
    
    // Test retrieval after re-ingestion
    if (result.status === 'success' && result.chunkCount > 0) {
      console.log(`[BACKFILL] Testing retrieval for ${assignmentInfo.title}...`);
      try {
        const { getRetrievalService } = require('../retrieval/retrieval.service');
        const retrieval = getRetrievalService();
        const testQuery = `What is in ${assignmentInfo.title}?`;
        const retrievalResult = await retrieval.retrieveChunks(assignmentInfo.course_id, testQuery, 3);
        
        console.log(`[BACKFILL] Retrieval test:`, {
          hits: retrievalResult.chunks?.length || 0,
          topSnippets: retrievalResult.chunks?.slice(0, 3).map(c => (c.content || '').slice(0, 120)) || []
        });
      } catch (retrievalError) {
        console.warn(`[BACKFILL] Retrieval test failed:`, retrievalError.message);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error(`[BACKFILL] Error re-ingesting assignment ${assignmentInfo.title}:`, error.message);
    return { status: 'error', error: error.message };
  }
}

async function main() {
  console.log('=== BACKFILL CONTENT AND EMBEDDINGS ===');
  console.log('Configuration:', {
    USE_EMBEDDINGS: flags.USE_EMBEDDINGS,
    EMBEDDINGS_DIM: flags.EMBEDDINGS_DIM,
    OCR_PROVIDER: flags.OCR_PROVIDER,
    OCR_STRATEGY: flags.OCR_STRATEGY
  });
  
  try {
    // Find chunks that need backfill
    const chunksToBackfill = await findChunksNeedingBackfill();
    console.log(`[BACKFILL] Found ${chunksToBackfill.length} file groups needing backfill`);
    
    if (chunksToBackfill.length === 0) {
      console.log('[BACKFILL] No chunks need backfill. Exiting.');
      return;
    }
    
    // Show summary
    chunksToBackfill.forEach(group => {
      console.log(`[BACKFILL] Course ${group.course_id}, File ${group.file_id}:`);
      console.log(`  - Total chunks: ${group.chunk_count}`);
      console.log(`  - Empty content: ${group.empty_content_count}`);
      console.log(`  - Missing embeddings: ${group.missing_embedding_count}`);
      console.log(`  - Wrong dimension: ${group.wrong_dimension_count}`);
    });
    
    // Process each file group
    const results = [];
    for (const group of chunksToBackfill) {
      console.log(`\n[BACKFILL] Processing course ${group.course_id}, file ${group.file_id}...`);
      
      const assignmentInfo = await getAssignmentInfo(group.course_id, group.file_id);
      const result = await reingestAssignment(assignmentInfo);
      
      results.push({
        courseId: group.course_id,
        fileId: group.file_id,
        assignmentTitle: assignmentInfo?.title || 'Unknown',
        result
      });
      
      // Small delay between assignments
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n=== BACKFILL SUMMARY ===');
    const successful = results.filter(r => r.result.status === 'success').length;
    const skipped = results.filter(r => r.result.status === 'skipped').length;
    const errors = results.filter(r => r.result.status === 'error').length;
    
    console.log(`Total processed: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    if (errors > 0) {
      console.log('\nErrors:');
      results.filter(r => r.result.status === 'error').forEach(r => {
        console.log(`  - ${r.assignmentTitle}: ${r.result.error}`);
      });
    }
    
  } catch (error) {
    console.error('[BACKFILL] Fatal error:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, findChunksNeedingBackfill, reingestAssignment };

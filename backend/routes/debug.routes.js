const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { getRetrievalService } = require('../retrieval/retrieval.service');
const { getIngestionService } = require('../ingestion/ingestion.service');
const { getServiceForUser } = require('../controllers/gradescope.controller');

// Configure multer for file uploads
const upload = multer({ 
  dest: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

/**
 * Debug endpoint to peek at Typesense content
 * GET /api/debug/peek?courseId=...
 */
router.get('/peek', async (req, res) => {
  try {
    const { courseId } = req.query;
    
    if (!courseId) {
      return res.status(400).json({ error: 'courseId parameter required' });
    }
    
    const retrieval = getRetrievalService();
    if (!retrieval.typesense) {
      return res.status(500).json({ error: 'Typesense not available' });
    }
    
    // Run a BM25 search with safe field queries
    const results = await retrieval.typesense.collections('rag_chunks')
      .documents()
      .search({
        q: '*', // Search all documents
        query_by: 'title,heading,content',
        filter_by: `course_id:=${courseId}`,
        include_fields: 'id,title,heading,content,page,kind,course_id,_text_match',
        per_page: 3,
        page: 1
      });
    
    const topResults = (results.hits || []).map(hit => {
      const doc = hit.document;
      return {
        title: doc.title,
        page: doc.page,
        len: (doc.content || '').length,
        sample: (doc.content || '').slice(0, 140),
        kind: doc.kind,
        text_match: hit.text_match
      };
    });
    
    res.json({
      success: true,
      data: {
        courseId,
        totalHits: results.found || 0,
        topResults
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Peek endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Debug endpoint to reingest a specific assignment
 * POST /api/debug/reingest?courseId=...&assignmentId=...
 */
router.post('/reingest', async (req, res) => {
  try {
    const { courseId, assignmentId } = req.query;
    
    if (!courseId || !assignmentId) {
      return res.status(400).json({ error: 'courseId and assignmentId parameters required' });
    }
    
    console.log(`[DEBUG] Reingesting assignment ${assignmentId} for course ${courseId}`);
    
    // Get Gradescope service
    const gradescopeService = await getServiceForUser('dev-cli');
    if (!gradescopeService) {
      return res.status(500).json({ error: 'Gradescope service not available' });
    }
    
    // Download PDF
    const pdfBuffer = await gradescopeService.getAssignmentPDF(courseId, assignmentId);
    if (!pdfBuffer) {
      return res.json({ 
        success: false, 
        reason: 'no_chunks',
        message: 'PDF download failed or returned null'
      });
    }
    
    // Ingest the PDF
    const ingestion = getIngestionService();
    const result = await ingestion.ingestDocument({
      courseId,
      materialId: assignmentId,
      buffer: pdfBuffer,
      fileName: `assignment-${assignmentId}.pdf`,
      fileType: 'pdf',
      kind: 'gradescope-pdf',
      sourcePlatform: 'gradescope'
    });
    
    if (result.status === 'success') {
      res.json({
        success: true,
        chunks: result.chunkCount,
        message: `Successfully ingested ${result.chunkCount} chunks`
      });
    } else {
      res.json({
        success: false,
        reason: 'no_chunks',
        message: result.error || 'Ingestion failed',
        details: result
      });
    }
    
  } catch (error) {
    console.error('[DEBUG] Reingest endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      reason: 'no_chunks',
      error: error.message 
    });
  }
});

/**
 * Debug endpoint to ingest local PDF files
 * POST /api/debug/ingest-local
 * Accepts either multipart upload or JSON with filePath
 */
router.post('/ingest-local', upload.single('file'), async (req, res) => {
  try {
    const { courseId, title, label, kind = 'local-pdf' } = req.query;
    
    if (!courseId) {
      return res.status(400).json({ error: 'courseId parameter required' });
    }
    
    console.log(`[DEBUG] Ingesting local file for course ${courseId}, title: ${title}, label: ${label}`);
    
    let filePath;
    let fileName;
    let fileBuffer;
    
    // Handle multipart upload
    if (req.file) {
      filePath = req.file.path;
      fileName = req.file.originalname || `local-file-${Date.now()}.pdf`;
      fileBuffer = fs.readFileSync(filePath);
      console.log(`[DEBUG] Received multipart file: ${fileName} (${fileBuffer.length} bytes)`);
    } 
    // Handle JSON with filePath
    else if (req.body && req.body.filePath) {
      filePath = req.body.filePath;
      fileName = path.basename(filePath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ 
          success: false, 
          reason: 'no_chunks',
          error: `File not found: ${filePath}` 
        });
      }
      
      fileBuffer = fs.readFileSync(filePath);
      console.log(`[DEBUG] Using file path: ${filePath} (${fileBuffer.length} bytes)`);
    } else {
      return res.status(400).json({ 
        success: false, 
        reason: 'no_chunks',
        error: 'Either file upload or filePath in JSON body required' 
      });
    }
    
    // Verify it's a PDF
    if (!fileBuffer || fileBuffer.length < 4 || fileBuffer.slice(0, 4).toString() !== '%PDF') {
      return res.status(400).json({ 
        success: false, 
        reason: 'no_chunks',
        error: 'File is not a valid PDF' 
      });
    }
    
    // Get ingestion service
    const ingestion = getIngestionService();
    if (!ingestion) {
      return res.status(500).json({ 
        success: false, 
        reason: 'no_chunks',
        error: 'Ingestion service not available' 
      });
    }
    
    // Ingest the document with increased timeout and fallbacks
    const result = await ingestion.ingestDocument({
      courseId,
      materialId: `local-${Date.now()}`,
      buffer: fileBuffer,
      fileName: fileName,
      fileType: 'pdf',
      kind: kind,
      sourcePlatform: 'local',
      title: title || fileName,
      force: true // Force re-ingestion for debug
    });
    
    // Clean up uploaded file if it was from multipart
    if (req.file && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('[DEBUG] Failed to cleanup uploaded file:', cleanupError.message);
      }
    }
    
    if (result.status === 'success') {
      res.json({
        success: true,
        chunks: result.chunkCount,
        message: `Successfully ingested ${result.chunkCount} chunks from ${fileName}`
      });
    } else {
      res.json({
        success: false,
        reason: 'no_chunks',
        error: result.error || 'Ingestion failed',
        details: result
      });
    }
    
  } catch (error) {
    console.error('[DEBUG] Ingest-local endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      reason: 'no_chunks',
      error: error.message 
    });
  }
});

module.exports = router;
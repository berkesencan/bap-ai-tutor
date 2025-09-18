const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const flags = require('../config/flags');

// TODO: DEPRECATED - Legacy material extracts for context stuffing
const materialExtractsRef = flags.RAG_ENABLED ? null : db.collection('materialExtracts');

/**
 * Clear cache for a specific document to force re-analysis
 */
router.post('/clear-document-cache', async (req, res) => {
  if (flags.RAG_ENABLED) {
    return res.status(410).json({
      success: false,
      error: 'Legacy cache clearing is not available when RAG is enabled. Use /api/rag/clear-cache instead.'
    });
  }
  
  try {
    const { courseId, assignmentId, userId } = req.body;
    
    if (!courseId || !assignmentId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: courseId, assignmentId, userId'
      });
    }

    // Clear the Gemini Vision cache
    const cacheId = `${userId}__gemini__${courseId}__${assignmentId}`;
    
    console.log(`[CACHE CLEAR] Clearing cache for document: ${cacheId}`);
    
    try {
      await materialExtractsRef.doc(cacheId).delete();
      console.log(`[CACHE CLEAR] ✅ Successfully cleared cache for ${cacheId}`);
      
      res.json({
        success: true,
        message: 'Document cache cleared successfully. Next analysis will be comprehensive.',
        cacheId: cacheId
      });
      
    } catch (deleteError) {
      console.warn(`[CACHE CLEAR] Cache document may not exist: ${deleteError.message}`);
      res.json({
        success: true,
        message: 'Cache cleared (document may not have been cached yet)',
        cacheId: cacheId
      });
    }
    
  } catch (error) {
    console.error('[CACHE CLEAR] Error clearing document cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear document cache',
      details: error.message
    });
  }
});

/**
 * NUCLEAR OPTION: Clear ALL document cache
 */
router.post('/clear-all-cache', async (req, res) => {
  try {
    console.log(`[CACHE CLEAR] 🧨 NUCLEAR: Clearing ALL document cache...`);
    
    // Query all documents
    const allCacheQuery = await materialExtractsRef.get();
    
    const batch = db.batch();
    let deleteCount = 0;
    
    allCacheQuery.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    
    if (deleteCount > 0) {
      await batch.commit();
      console.log(`[CACHE CLEAR] 🧨 NUCLEAR: Cleared ${deleteCount} cached documents`);
    }
    
    res.json({
      success: true,
      message: `🧨 NUCLEAR CLEAR: Deleted ${deleteCount} cached documents. All future analyses will be fresh.`,
      deletedCount: deleteCount
    });
    
  } catch (error) {
    console.error('[CACHE CLEAR] Error in nuclear clear:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to nuclear clear cache',
      details: error.message
    });
  }
});

/**
 * Clear all cache for a user
 */
router.post('/clear-user-cache', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userId'
      });
    }

    console.log(`[CACHE CLEAR] Clearing all cache for user: ${userId}`);
    
    // Query all documents for this user
    const userCacheQuery = await materialExtractsRef.where('userId', '==', userId).get();
    
    const batch = db.batch();
    let deleteCount = 0;
    
    userCacheQuery.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    
    if (deleteCount > 0) {
      await batch.commit();
      console.log(`[CACHE CLEAR] ✅ Cleared ${deleteCount} cached documents for user ${userId}`);
    }
    
    res.json({
      success: true,
      message: `Cleared ${deleteCount} cached documents. All future analyses will be comprehensive.`,
      deletedCount: deleteCount
    });
    
  } catch (error) {
    console.error('[CACHE CLEAR] Error clearing user cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear user cache',
      details: error.message
    });
  }
});

module.exports = router;

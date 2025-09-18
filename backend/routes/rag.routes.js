const express = require('express');
const router = express.Router();

const DebugController = require('../controllers/rag/debug.controller');
const IndexController = require('../controllers/rag/index.controller');
const RetrieveController = require('../controllers/rag/retrieve.controller');
const ConsistencyController = require('../controllers/rag/consistency.controller');

// Debug endpoints
router.get('/debug/report', DebugController.getDebugReport);

// Consistency endpoints
router.get('/consistency/:courseId', ConsistencyController.checkConsistency);
router.post('/consistency/reindex/:courseId', ConsistencyController.reindexMissingFromUi);
router.post('/consistency/reindex-all', ConsistencyController.reindexAllVisible);

// Indexing endpoints
router.post('/index/course/:courseId', IndexController.indexCourse);
router.post('/index/assignment/:courseId/:assignmentId', IndexController.indexAssignment);

// Retrieval endpoints
router.post('/retrieve', RetrieveController.retrieve);

module.exports = router;
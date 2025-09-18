/**
 * Legacy Route Compatibility Configuration
 * 
 * Maps old frontend API paths to current handlers for development compatibility.
 * Only active when DEV_NO_AUTH=true to avoid masking production issues.
 * 
 * Add more routes as needed during frontend migration.
 */

module.exports = [
  // Legacy course context routes for old UI
  {
    method: 'get',
    legacyPath: '/api/ai/classrooms',
    // IMPORTANT: do NOT proxy this to /api/courses anymore because the new
    // AI chat needs the richer shape from ai.service (totals, integrations).
    // We still keep the legacy path so the FE can call it during migration,
    // but we route it to the real controller.
    handler: require('../controllers/ai.controller').getAvailableClassrooms,
    description: 'Legacy classrooms endpoint - use AIController.getAvailableClassrooms'
  },
  {
    method: 'get',
    legacyPath: '/api/ai/materials/:contextId',
    // Route to ChatController for proper materials handling
    handler: require('../controllers/ai/chat.controller').getIntegratedMaterials,
    description: 'Legacy materials endpoint - use ChatController.getIntegratedMaterials'
  },
  {
    method: 'post',
    legacyPath: '/api/ai/practice-exam',
    handler: require('../controllers/practice-exam.controller').generatePracticeExam,
    description: 'Legacy practice exam generation endpoint'
  },
  {
    method: 'post',
    legacyPath: '/api/ai/generate-questions',
    handler: require('../controllers/ai.controller').generatePracticeQuestions,
    description: 'Legacy practice questions generation'
  },
  {
    method: 'post',
    legacyPath: '/api/ai/study-plan',
    handler: require('../controllers/ai.controller').generateStudyPlan,
    description: 'Legacy study plan generation'
  },
  {
    method: 'post',
    legacyPath: '/api/ai/explain',
    handler: require('../controllers/ai.controller').explainConcept,
    description: 'Legacy concept explanation endpoint'
  }
  // Note: PDF processing routes (/api/ai/process-pdf, /api/ai/process-pdf-with-message) 
  // are defined inline in routes/ai.routes.js, not as controller methods
  // Add more legacy routes as needed:
  // {
  //   method: 'get',
  //   legacyPath: '/api/ai/download-pdf/:filename',
  //   handler: require('../controllers/ai.controller').downloadPDF,
  //   description: 'Legacy PDF download endpoint'
  // }
];

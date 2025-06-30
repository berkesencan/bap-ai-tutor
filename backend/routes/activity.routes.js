const express = require('express');
const router = express.Router();
const { 
  createActivity, 
  getMyCourseActivities,
  generateAIActivityController,
  joinActivity,
  getPublicActivities
} = require('../controllers/activity.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Core Activity Routes
router.post('/', authenticateToken, createActivity);
router.get('/my-activities', authenticateToken, getMyCourseActivities);
router.get('/public', getPublicActivities);
router.post('/generate-ai', authenticateToken, generateAIActivityController);

// Activity Participation
router.post('/:activityId/join', authenticateToken, joinActivity);

module.exports = router; 
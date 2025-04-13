const express = require('express');
const AnalyticsController = require('../controllers/analytics.controller');

const router = express.Router();

/**
 * @route GET /api/analytics/overview
 * @desc Get overview analytics for the current user
 * @access Private
 */
router.get('/overview', AnalyticsController.getOverview);

/**
 * @route GET /api/analytics/course/:courseId
 * @desc Get analytics for a specific course
 * @access Private
 */
router.get('/course/:courseId', AnalyticsController.getCourseAnalytics);

/**
 * @route GET /api/analytics/study
 * @desc Get study analytics for the current user
 * @access Private
 */
router.get('/study', AnalyticsController.getStudyAnalytics);

/**
 * @route GET /api/analytics/ai
 * @desc Get AI interaction analytics for the current user
 * @access Private
 */
router.get('/ai', AnalyticsController.getAIAnalytics);

/**
 * @route GET /api/analytics/trends
 * @desc Get learning trends for the current user
 * @access Private
 */
router.get('/trends', AnalyticsController.getLearningTrends);

module.exports = router;
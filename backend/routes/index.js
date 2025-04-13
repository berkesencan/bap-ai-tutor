const express = require('express');
const authRoutes = require('./auth.routes');
const courseRoutes = require('./course.routes');
const assignmentRoutes = require('./assignment.routes');
const scheduleRoutes = require('./schedule.routes');
const studyRoutes = require('./study.routes');
const aiRoutes = require('./ai.routes');
const analyticsRoutes = require('./analytics.routes');

const router = express.Router();

// Mount routes
router.use('/courses', courseRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/study', studyRoutes);
router.use('/ai', aiRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = {
  auth: authRoutes,
  ...router
}; 
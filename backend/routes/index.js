const express = require('express');
const authRoutes = require('./auth.routes');
const courseRoutes = require('./course.routes');
const assignmentRoutes = require('./assignment.routes');
const aiRoutes = require('./ai.routes');
const analyticsRoutes = require('./analytics.routes');
const scheduleRoutes = require('./schedule.routes');
const studyRoutes = require('./study.routes');
const gradescopeRoutes = require('./gradescope.routes');

const router = express.Router();

// Define routes
router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/ai', aiRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/study', studyRoutes);
router.use('/gradescope', gradescopeRoutes);

// Users route for getting user details
router.use('/users', require('./users.routes'));

module.exports = router; 
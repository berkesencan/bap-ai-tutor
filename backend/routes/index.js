const express = require('express');
const authRoutes = require('./auth.routes');
const courseRoutes = require('./course.routes');
const assignmentRoutes = require('./assignment.routes');
const scheduleRoutes = require('./schedule.routes');
const studyRoutes = require('./study.routes');
const analyticsRoutes = require('./analytics.routes');
const classroomRoutes = require('./classroom.routes');
const gradescopeRoutes = require('./gradescope.routes');
const aiRoutes = require('./ai.routes');
const activityRoutes = require('./activity.routes');

const router = express.Router();

// Route definitions
router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/study', studyRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/classrooms', classroomRoutes);
router.use('/gradescope', gradescopeRoutes);
router.use('/ai', aiRoutes);
router.use('/activities', activityRoutes);

// Users route for getting user details
router.use('/users', require('./users.routes'));

module.exports = router; 
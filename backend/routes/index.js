const express = require('express');
const authRoutes = require('./auth.routes');
const courseRoutes = require('./course.routes');
const assignmentRoutes = require('./assignment.routes');
const scheduleRoutes = require('./schedule.routes');
const studyRoutes = require('./study.routes');
const aiRoutes = require('./ai.routes');
const analyticsRoutes = require('./analytics.routes');

// Export all routes
module.exports = {
  auth: authRoutes,
  courses: courseRoutes,
  assignments: assignmentRoutes,
  schedules: scheduleRoutes,
  study: studyRoutes,
  ai: aiRoutes,
  analytics: analyticsRoutes
}; 
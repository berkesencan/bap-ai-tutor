const express = require('express');
const path = require('path');
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
const usersRoutes = require('./users.routes');
const debugRoutes = require('./debug.routes');

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
router.use('/users', usersRoutes);
router.use('/debug', debugRoutes);

// 🎨 SERVE GENERATED 3D MODELS
// Route to serve Shap-E generated OBJ files
router.use('/3d-models', express.static(path.join(__dirname, '../uploads/3d-models'), {
  setHeaders: (res, filePath) => {
    console.log(`📦 Serving 3D model: ${path.basename(filePath)}`);
    
    if (filePath.endsWith('.obj')) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
    }
  }
}));

// Health check route
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'BAP AI Tutor Backend',
    llama_mesh: 'enabled'
  });
});

module.exports = router; 
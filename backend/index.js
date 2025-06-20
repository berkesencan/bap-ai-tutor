const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const courseRoutes = require('./routes/course.routes');
const studyRoutes = require('./routes/study.routes');
const aiRoutes = require('./routes/ai.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const gradescopeRoutes = require('./routes/gradescope.routes');
const classroomRoutes = require('./routes/classroom.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { verifyToken: authMiddleware } = require('./middleware/auth.middleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Apply routes - unprotected routes
app.use('/api/auth', authRoutes);

// Create a test route for Gemini API without authentication
app.use('/api/test-ai', require('./routes/ai.routes'));

// Protected routes with auth middleware
app.use('/api/assignments', authMiddleware, assignmentRoutes);
app.use('/api/schedules', authMiddleware, scheduleRoutes);
app.use('/api/courses', authMiddleware, courseRoutes);
app.use('/api/study', authMiddleware, studyRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/gradescope', authMiddleware, gradescopeRoutes);
app.use('/api/classrooms', authMiddleware, classroomRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to BAP AI Tutor API' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

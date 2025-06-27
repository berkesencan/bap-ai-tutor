const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Security validation - ensure critical environment variables are set
const requiredEnvVars = ['ENCRYPTION_KEY', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('🚨 SECURITY ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  console.error('Please set these variables in your .env file for security.');
  process.exit(1);
}

// Validate encryption key strength
if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
  console.error('🚨 SECURITY WARNING: ENCRYPTION_KEY should be at least 32 characters for security.');
}

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
const usersRoutes = require('./routes/users.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { verifyToken: authMiddleware } = require('./middleware/auth.middleware');

// Import for cleanup tasks
const GradescopeAuth = require('./models/gradescope-auth.model');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies with size limit

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
app.use('/api/users', authMiddleware, usersRoutes);

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
  
  // Security status check
  console.log('🔒 Security Status:');
  console.log(`  ✅ ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? 'Set' : '❌ Missing'}`);
  console.log(`  ✅ JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : '❌ Missing'}`);
  console.log(`  ✅ Enhanced security headers: Enabled`);
  console.log(`  ✅ Session data encryption: Enabled`);
  console.log(`  ✅ Password encryption: AES-256-CBC with random salts`);
});

// Schedule daily cleanup of old authentication records (runs at 2 AM)
if (process.env.NODE_ENV === 'production') {
  const schedule = require('node-cron');
  
  // Clean up old auth records daily at 2 AM
  schedule.schedule('0 2 * * *', async () => {
    try {
      console.log('🧹 Running scheduled cleanup of old authentication records...');
      const deletedCount = await GradescopeAuth.cleanupOldRecords(90); // 90 days retention
      console.log(`✅ Cleanup completed: ${deletedCount} old records removed`);
    } catch (error) {
      console.error('❌ Error during scheduled cleanup:', error);
    }
  });
  
  console.log('📅 Scheduled daily cleanup enabled (2 AM)');
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
const path = require('path');

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
const activityRoutes = require('./routes/activity.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { verifyToken: authMiddleware } = require('./middleware/auth.middleware');

// Import for cleanup tasks
const GradescopeAuth = require('./models/gradescope-auth.model');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

// Initialize Socket.IO for real-time progress updates
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io available globally for progress updates
global.io = io;

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected for real-time updates:', socket.id);

  // Join room for 3D model generation updates
  socket.on('join-generation-room', (sessionId) => {
    socket.join(`generation-${sessionId}`);
    console.log(`📡 Client ${socket.id} joined generation room: generation-${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

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

// Unprotected PDF download route
app.get('/api/ai/download-pdf/:filename', require('./controllers/ai.controller').downloadPDF);

// Unprotected practice exam generation route
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

app.post('/api/ai/practice-exam', upload.single('pdf'), require('./controllers/ai.controller').generatePracticeExam);

// Test form parsing (unprotected for debugging)
app.post('/api/ai/test-form', upload.single('pdf'), require('./controllers/ai.controller').testFormParsing);

// Unprotected Neural Conquest routes
const NeuralConquestController = require('./controllers/activities/neural-conquest.controller');
const neuralConquestController = new NeuralConquestController();

// Neural Conquest debug and content routes (no auth required)
app.get('/api/activities/neural-conquest/debug', neuralConquestController.debugStatus.bind(neuralConquestController));
app.get('/api/activities/neural-conquest/topics', neuralConquestController.getAvailableTopics.bind(neuralConquestController));
app.get('/api/activities/neural-conquest/content', neuralConquestController.getContent.bind(neuralConquestController));

// Neural Conquest session route with optional auth
app.get('/api/activities/neural-conquest/session/:sessionId', (req, res) => {
  // Try authentication first, but don't fail if it doesn't work
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Use auth middleware if token is provided
    authMiddleware(req, res, (err) => {
      if (err) {
        console.log('⚠️ Auth failed for session load, proceeding without auth');
        // Clear any auth data and proceed
        req.user = null;
      }
      // Proceed to controller regardless of auth success/failure
      neuralConquestController.getNeuralConquestSession(req, res);
    });
  } else {
    console.log('⚠️ No auth token provided for session load, proceeding without auth');
    // No auth token, proceed without user context
    req.user = null;
    neuralConquestController.getNeuralConquestSession(req, res);
  }
});

// Simple test endpoint to verify the practice exam route is working
app.get('/api/ai/test-route', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Practice exam route is accessible',
    timestamp: new Date().toISOString(),
    routes: {
      practiceExam: '/api/ai/practice-exam (POST with PDF upload)',
      testForm: '/api/ai/test-form (POST with PDF upload)',
      downloadPdf: '/api/ai/download-pdf/:filename (GET)'
    }
  });
});

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
app.use('/api/activities', authMiddleware, activityRoutes);

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route for 3D model serving
app.get('/api/test-3d-models', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const modelsDir = path.join(__dirname, 'uploads/3d-models');
    const files = fs.readdirSync(modelsDir).filter(file => 
      file.endsWith('.obj') || file.endsWith('.ply')
    );
    
    const testResults = files.slice(0, 3).map(file => ({
      filename: file,
      size: fs.statSync(path.join(modelsDir, file)).size,
      url: `/api/3d-models/${file}`,
      accessible: true
    }));
    
    res.json({
      success: true,
      message: '3D model serving test',
      totalFiles: files.length,
      testFiles: testResults,
      baseUrl: '/api/3d-models/'
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      message: 'Failed to test 3D model serving'
    });
  }
});

// NEW: Serve 3D model files
app.use('/api/3d-models', express.static(path.join(__dirname, 'uploads/3d-models')));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to BAP AI Tutor API' });
});

// Error handling middleware
app.use(errorHandler);

// Start server with Socket.IO support
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('🔌 Socket.IO enabled for real-time updates');
  
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

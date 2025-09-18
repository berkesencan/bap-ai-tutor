const express = require('express');
const gradescopeController = require('../controllers/gradescope.controller');
const router = express.Router();

// Check authentication status
router.get('/auth/status', gradescopeController.checkAuthStatus);

// Login route
router.post('/login', gradescopeController.login);

// Get courses
router.get('/courses', gradescopeController.getCourses);

// Get assignments for a course
router.get('/courses/:courseId/assignments', gradescopeController.getAssignments);

// Get assignment PDF
router.get('/assignments/:courseId/:assignmentId/pdf', gradescopeController.getAssignmentPDF);

// Health check
router.get('/health', gradescopeController.health);

module.exports = router;
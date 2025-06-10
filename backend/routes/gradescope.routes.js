const express = require('express');
const gradescopeController = require('../controllers/gradescope.controller');
const router = express.Router();

// Login route
router.post('/login', gradescopeController.login);

// Get courses
router.get('/courses', gradescopeController.getCourses);

// Get assignments for a course
router.get('/courses/:courseId/assignments', gradescopeController.getAssignments);

// Get assignment PDF
router.get('/assignments/:courseId/:assignmentId/pdf', gradescopeController.getAssignmentPDF);

module.exports = router;
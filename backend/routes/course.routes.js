const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/course.controller');
const { verifyToken: authMiddleware } = require('../middleware/auth.middleware');
const { db } = require('../config/firebase');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Course management routes
router.post('/', CourseController.createCourse);
router.get('/', CourseController.getUserCourses);
router.get('/search', CourseController.searchPublicCourses);
router.post('/join', CourseController.joinCourse);
router.post('/import', CourseController.importFromGradescope);
router.post('/manage-gradescope', CourseController.manageGradescopeImports);

// Individual course routes
router.get('/:courseId', CourseController.getCourseById);
router.put('/:courseId', CourseController.updateCourse);
router.delete('/:courseId', CourseController.deleteCourse);
router.post('/:courseId/leave', CourseController.leaveCourse);
router.post('/:courseId/transfer-ownership', CourseController.transferOwnership);

// Member management routes
router.put('/:courseId/members/:memberId/role', CourseController.updateMemberRole);
router.delete('/:courseId/members/:memberId', CourseController.removeMember);

// Course content routes
router.get('/:courseId/assignments', CourseController.getCourseAssignments);
router.get('/:courseId/materials', CourseController.getCourseMaterials);
router.get('/:courseId/analytics', CourseController.getCourseAnalytics);

// Integration management routes
router.get('/:courseId/integrations', CourseController.getUserIntegrations);
router.post('/:courseId/integrations', CourseController.addIntegration);
router.delete('/:courseId/integrations/:platform', CourseController.removeIntegration);
router.post('/:courseId/integrations/:platform/sync', CourseController.syncIntegration);

// Course merging and linking routes
router.get('/integrations/available', CourseController.getAvailableIntegrations);
router.post('/:courseId/link-integrations', CourseController.linkIntegrationsToCourse);
router.delete('/:courseId/unlink-integration/:integrationId', CourseController.unlinkIntegrationFromCourse);
router.post('/merge-integrations', CourseController.mergeIntegrationsIntoCourse);
router.delete('/integration/:courseId', CourseController.deleteIntegrationCourse);

// Get course materials for activities
router.get('/:courseId/materials', async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.uid;

    // Check if user has access to this course
    const courseRef = db.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const courseData = courseDoc.data();
    const userRole = courseData.members?.[userId]?.role;
    
    if (!userRole) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get course materials
    const materialsSnapshot = await courseRef.collection('materials').get();
    const materials = materialsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: { materials }
    });
  } catch (error) {
    console.error('Error fetching course materials:', error);
    res.status(500).json({ error: 'Failed to fetch course materials' });
  }
});

module.exports = router; 
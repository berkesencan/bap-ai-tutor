const Course = require('../models/course.model');
const Assignment = require('../models/assignment.model');
const isContainerCourse = require('../utils/isContainerCourse');

/**
 * Returns user-visible courses (no container rows), with accurate counts from authoritative collections
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of user-visible courses with counts
 */
async function getUserVisibleCourses(userId) {
  try {
    console.log(`[Visible Courses] Getting visible courses for user: ${userId}`);
    
    // Get all courses for the user
    const allCourses = await Course.getByUserId(userId);
    console.log(`[Visible Courses] Found ${allCourses.length} total courses`);
    
    // Filter out container courses
    const visibleCourses = allCourses.filter(course => {
      const isContainer = isContainerCourse(course);
      if (isContainer) {
        console.log(`[Visible Courses] Filtering out container course: ${course.name}`);
      }
      return !isContainer;
    });
    
    console.log(`[Visible Courses] ${visibleCourses.length} courses after filtering containers`);
    
    // Get counts for each visible course from authoritative collections
    const coursesWithCounts = await Promise.all(visibleCourses.map(async (course) => {
      try {
        // Get assignment count from assignments collection (authoritative source)
        let assignmentsCount = 0;
        try {
          const assignments = await Assignment.getByCourseId(course.id);
          assignmentsCount = assignments?.length || 0;
        } catch (assignErr) {
          console.warn(`[Visible Courses] Error getting assignments for course ${course.name}:`, assignErr.message);
        }
        
        // Get materials count (if materials collection exists)
        let materialsCount = 0;
        try {
          // For now, materials count is 0 as we don't have a separate materials collection
          // This could be updated if materials are stored separately
          materialsCount = 0;
        } catch (materialsErr) {
          console.warn(`[Visible Courses] Error getting materials for course ${course.name}:`, materialsErr.message);
        }
        
        console.log(`[Visible Courses] ${course.name}: ${assignmentsCount} assignments, ${materialsCount} materials`);
        
        return {
          id: course.id,
          displayName: course.name,
          platform: course.source || 'bap',
          source: course.source || (course.externalId ? 'gradescope' : 'bap'), // Set source for Connect page compatibility
          term: course.semester || 'Unknown',
          role: course.userRole || 'student',
          externalId: course.externalId,
          type: 'course', // All visible courses are real courses, not containers
          counts: {
            assignments: assignmentsCount,
            materials: materialsCount
          },
          // Include additional metadata for frontend
          code: course.code,
          instructor: course.instructor,
          year: course.year,
          semester: course.semester
        };
      } catch (error) {
        console.error(`[Visible Courses] Error processing course ${course.name}:`, error);
        return {
          id: course.id,
          displayName: course.name,
          platform: course.source || 'bap',
          source: course.source || (course.externalId ? 'gradescope' : 'bap'), // Set source for Connect page compatibility
          term: course.semester || 'Unknown',
          role: course.userRole || 'student',
          externalId: course.externalId,
          type: 'course', // All visible courses are real courses, not containers
          counts: {
            assignments: 0,
            materials: 0
          }
        };
      }
    }));
    
    console.log(`[Visible Courses] Returning ${coursesWithCounts.length} visible courses with counts`);
    return coursesWithCounts;
    
  } catch (error) {
    console.error('[Visible Courses] Error getting user visible courses:', error);
    return [];
  }
}

module.exports = {
  getUserVisibleCourses
};

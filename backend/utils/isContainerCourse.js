/**
 * Determines if a course is a container course (should be hidden from user-facing lists)
 * @param {Object} course - Course object to check
 * @returns {boolean} - True if this is a container course
 */
module.exports = function isContainerCourse(course) {
  if (!course) return false;
  
  // Check explicit container flag
  if (course.isContainer === true) return true;
  
  // Check course type
  if ((course.type || '').toLowerCase() === 'container') return true;
  
  // Check for "My Gradescope Courses" pattern in name
  const name = (course.name || '').toLowerCase().trim();
  if (name === 'my gradescope courses' || name.startsWith('my gradescope courses')) return true;
  
  // Check for other container patterns
  if (name.includes('container') || name.includes('aggregated')) return true;
  
  return false;
};

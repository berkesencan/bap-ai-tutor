import { useEffect, useState } from 'react';
import { api } from '../services/api';

/**
 * Shared hook for fetching course options for both AI Tutor and Assignments pages
 * Returns unified course list with accurate counts from authoritative backend
 */
export default function useCourseOptions() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the unified courses endpoint that returns visible courses only
        const response = await api.getCourses();
        
        if (!isMounted) return;
        
        if (response.success && response.data?.courses) {
          const courseList = response.data.courses;
          
          // Defensive de-dupe by id (shouldn't be needed but good practice)
          const deduped = Object.values(
            Object.fromEntries(courseList.map(course => [course.id, course]))
          );
          
          console.log(`[useCourseOptions] Loaded ${deduped.length} visible courses`);
          setCourses(deduped);
        } else {
          console.warn('[useCourseOptions] Invalid response format:', response);
          setCourses([]);
        }
      } catch (err) {
        console.error('[useCourseOptions] Error fetching courses:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load courses');
          setCourses([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  return { 
    loading, 
    courses, 
    error,
    // Helper to get course by ID
    getCourseById: (id) => courses.find(course => course.id === id),
    // Helper to get courses with assignments
    getCoursesWithAssignments: () => courses.filter(course => course.counts?.assignments > 0)
  };
}

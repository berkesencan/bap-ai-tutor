const { db, admin } = require('../config/firebase');

class ProgressTrackingService {
  /**
   * Update course progress
   */
  async updateCourseProgress(userId, courseId, data) {
    const courseRef = db.collection('users').doc(userId).collection('courses').doc(courseId);
    
    const updateData = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log(`[PROGRESS] setCourseStatus ${userId}/${courseId}`, data);
    await courseRef.set(updateData, { merge: true });
    return courseRef;
  }

  /**
   * Update assignment progress
   */
  async updateAssignmentProgress(userId, courseId, assignmentId, data) {
    const assignmentRef = db.collection('users')
      .doc(userId)
      .collection('courses')
      .doc(courseId)
      .collection('assignments')
      .doc(assignmentId);
    
    const updateData = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log(`[PROGRESS] setAssignment ${userId}/${courseId}/${assignmentId}`, data);
    await assignmentRef.set(updateData, { merge: true });
    return assignmentRef;
  }

  /**
   * Get course progress
   */
  async getCourseProgress(userId, courseId) {
    const courseRef = db.collection('users').doc(userId).collection('courses').doc(courseId);
    const doc = await courseRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Get assignment progress
   */
  async getAssignmentProgress(userId, courseId, assignmentId) {
    const assignmentRef = db.collection('users')
      .doc(userId)
      .collection('courses')
      .doc(courseId)
      .collection('assignments')
      .doc(assignmentId);
    
    const doc = await assignmentRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Get all assignments for a course
   */
  async getCourseAssignments(userId, courseId, limit = 100) {
    const assignmentsRef = db.collection('users')
      .doc(userId)
      .collection('courses')
      .doc(courseId)
      .collection('assignments');
    
    const snapshot = await assignmentsRef.limit(limit).get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Initialize course progress
   */
  async initializeCourseProgress(userId, courseId, total = 0) {
    return this.updateCourseProgress(userId, courseId, {
      status: 'queued',
      total,
      done: 0,
      filesReady: 0,
      lastItem: null,
      error: null
    });
  }

  /**
   * Initialize assignment progress
   */
  async initializeAssignmentProgress(userId, courseId, assignmentId, title) {
    return this.updateAssignmentProgress(userId, courseId, assignmentId, {
      title,
      status: 'queued',
      gcsPath: null,
      hasPdf: false,
      error: null
    });
  }

  /**
   * Mark assignment as running
   */
  async markAssignmentRunning(userId, courseId, assignmentId) {
    return this.updateAssignmentProgress(userId, courseId, assignmentId, {
      status: 'running'
    });
  }

  /**
   * Mark assignment as ready
   */
  async markAssignmentReady(userId, courseId, assignmentId, gcsPath) {
    return this.updateAssignmentProgress(userId, courseId, assignmentId, {
      status: 'ready',
      gcsPath,
      hasPdf: true,
      error: null
    });
  }

  /**
   * Mark assignment as missing
   */
  async markAssignmentMissing(userId, courseId, assignmentId) {
    return this.updateAssignmentProgress(userId, courseId, assignmentId, {
      status: 'missing',
      hasPdf: false,
      error: null
    });
  }

  /**
   * Mark assignment as error
   */
  async markAssignmentError(userId, courseId, assignmentId, error) {
    return this.updateAssignmentProgress(userId, courseId, assignmentId, {
      status: 'error',
      error: error.message || String(error)
    });
  }

  /**
   * Update course counters
   */
  async updateCourseCounters(userId, courseId, updates) {
    const courseRef = db.collection('users').doc(userId).collection('courses').doc(courseId);
    
    const updateData = {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await courseRef.update(updateData);
    return courseRef;
  }

  /**
   * Mark course as ready
   */
  async markCourseReady(userId, courseId) {
    return this.updateCourseProgress(userId, courseId, {
      status: 'ready'
    });
  }

  /**
   * Mark course as error
   */
  async markCourseError(userId, courseId, error) {
    return this.updateCourseProgress(userId, courseId, {
      status: 'error',
      error: error.message || String(error)
    });
  }
}

module.exports = new ProgressTrackingService();

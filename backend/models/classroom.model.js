const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

class Classroom {
  /**
   * Create a new classroom
   * @param {Object} classroomData - Classroom data
   * @param {string} teacherId - Teacher's user ID
   * @returns {Promise<Object>} - Created classroom data
   */
  static async create(classroomData, teacherId) {
    try {
      const classroomId = uuidv4();
      const inviteCode = this.generateInviteCode();
      
      const classroom = {
        id: classroomId,
        name: classroomData.name,
        subject: classroomData.subject || null,
        semester: classroomData.semester || null,
        description: classroomData.description || null,
        teacherId: teacherId,
        inviteCode: inviteCode,
        invitePassword: classroomData.invitePassword || null,
        aiSettings: {
          tutorEnabled: classroomData.aiSettings?.tutorEnabled ?? true,
          studyPlanEnabled: classroomData.aiSettings?.studyPlanEnabled ?? true,
          practiceQuestionsEnabled: classroomData.aiSettings?.practiceQuestionsEnabled ?? true,
          conceptExplanationEnabled: classroomData.aiSettings?.conceptExplanationEnabled ?? true,
          interactiveActivitiesEnabled: classroomData.aiSettings?.interactiveActivitiesEnabled ?? true,
          gamificationEnabled: classroomData.aiSettings?.gamificationEnabled ?? true,
          allowedIntegrations: classroomData.aiSettings?.allowedIntegrations || ['gradescope', 'canvas', 'brightspace']
        },
        enrolledStudents: [],
        integrations: {},
        materials: [],
        activities: [],
        analytics: {
          totalStudents: 0,
          totalAIInteractions: 0,
          averageEngagement: 0
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('classrooms').doc(classroomId).set(classroom);
      return classroom;
    } catch (error) {
      console.error('Error creating classroom:', error);
      throw error;
    }
  }

  /**
   * Generate a unique 6-character invite code
   * @returns {string} - Invite code
   */
  static generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get classroom by ID
   * @param {string} classroomId - Classroom ID
   * @returns {Promise<Object|null>} - Classroom data or null
   */
  static async getById(classroomId) {
    try {
      const doc = await db.collection('classrooms').doc(classroomId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting classroom by ID:', error);
      throw error;
    }
  }

  /**
   * Get classroom by invite code
   * @param {string} inviteCode - Invite code
   * @returns {Promise<Object|null>} - Classroom data or null
   */
  static async getByInviteCode(inviteCode) {
    try {
      const snapshot = await db.collection('classrooms')
        .where('inviteCode', '==', inviteCode.toUpperCase())
        .where('isActive', '==', true)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      return snapshot.docs[0].data();
    } catch (error) {
      console.error('Error getting classroom by invite code:', error);
      throw error;
    }
  }

  /**
   * Get all classrooms for a teacher
   * @param {string} teacherId - Teacher's user ID
   * @returns {Promise<Array>} - Array of classroom data
   */
  static async getByTeacherId(teacherId) {
    try {
      const snapshot = await db.collection('classrooms')
        .where('teacherId', '==', teacherId)
        .get();
      
      const classrooms = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Filter for active classrooms and sort in memory
        if (data.isActive !== false) { // Include undefined as active
          classrooms.push(data);
        }
      });
      
      // Sort by createdAt in memory
      classrooms.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
        const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
        return bTime - aTime; // desc order
      });
      
      return classrooms;
    } catch (error) {
      console.error('Error getting classrooms by teacher ID:', error);
      throw error;
    }
  }

  /**
   * Get all classrooms for a student
   * @param {string} studentId - Student's user ID
   * @returns {Promise<Array>} - Array of classroom data
   */
  static async getByStudentId(studentId) {
    try {
      const snapshot = await db.collection('classrooms')
        .where('enrolledStudents', 'array-contains', studentId)
        .get();
      
      const classrooms = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Filter for active classrooms and sort in memory
        if (data.isActive !== false) { // Include undefined as active
          classrooms.push(data);
        }
      });
      
      // Sort by createdAt in memory
      classrooms.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
        const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
        return bTime - aTime; // desc order
      });
      
      return classrooms;
    } catch (error) {
      console.error('Error getting classrooms by student ID:', error);
      throw error;
    }
  }

  /**
   * Add student to classroom
   * @param {string} classroomId - Classroom ID
   * @param {string} studentId - Student's user ID
   * @param {string} password - Optional password for protected classrooms
   * @returns {Promise<Object>} - Updated classroom data
   */
  static async addStudent(classroomId, studentId, password = null) {
    try {
      const classroom = await this.getById(classroomId);
      if (!classroom) {
        throw new Error('Classroom not found');
      }

      // Check password if required
      if (classroom.invitePassword && classroom.invitePassword !== password) {
        throw new Error('Invalid password');
      }

      // Check if student is already enrolled
      if (classroom.enrolledStudents.includes(studentId)) {
        throw new Error('Student already enrolled');
      }

      // Add student to classroom
      classroom.enrolledStudents.push(studentId);
      classroom.analytics.totalStudents = classroom.enrolledStudents.length;
      classroom.updatedAt = new Date();

      await db.collection('classrooms').doc(classroomId).update({
        enrolledStudents: classroom.enrolledStudents,
        'analytics.totalStudents': classroom.analytics.totalStudents,
        updatedAt: classroom.updatedAt
      });

      return classroom;
    } catch (error) {
      console.error('Error adding student to classroom:', error);
      throw error;
    }
  }

  /**
   * Add integration to classroom
   * @param {string} classroomId - Classroom ID
   * @param {string} studentId - Student's user ID
   * @param {string} platform - Integration platform (gradescope, canvas, etc.)
   * @param {Object} integrationData - Integration data
   * @returns {Promise<Object>} - Updated classroom data
   */
  static async addIntegration(classroomId, studentId, platform, integrationData) {
    try {
      const classroom = await this.getById(classroomId);
      if (!classroom) {
        throw new Error('Classroom not found');
      }

      if (!classroom.enrolledStudents.includes(studentId)) {
        throw new Error('Student not enrolled in classroom');
      }

      // Initialize integrations structure if needed
      if (!classroom.integrations[studentId]) {
        classroom.integrations[studentId] = {};
      }

      // Add integration
      classroom.integrations[studentId][platform] = {
        ...integrationData,
        connectedAt: new Date(),
        isActive: true
      };

      classroom.updatedAt = new Date();

      await db.collection('classrooms').doc(classroomId).update({
        [`integrations.${studentId}.${platform}`]: classroom.integrations[studentId][platform],
        updatedAt: classroom.updatedAt
      });

      return classroom;
    } catch (error) {
      console.error('Error adding integration to classroom:', error);
      throw error;
    }
  }

  /**
   * Update classroom settings
   * @param {string} classroomId - Classroom ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated classroom data
   */
  static async update(classroomId, updateData) {
    try {
      const updateDoc = {
        ...updateData,
        updatedAt: new Date()
      };

      await db.collection('classrooms').doc(classroomId).update(updateDoc);
      return this.getById(classroomId);
    } catch (error) {
      console.error('Error updating classroom:', error);
      throw error;
    }
  }

  /**
   * Track AI interaction for analytics
   * @param {string} classroomId - Classroom ID
   * @param {string} studentId - Student's user ID
   * @param {string} interactionType - Type of AI interaction
   * @returns {Promise<void>}
   */
  static async trackAIInteraction(classroomId, studentId, interactionType) {
    try {
      const classroom = await this.getById(classroomId);
      if (!classroom) return;

      // Update analytics
      classroom.analytics.totalAIInteractions += 1;
      
      await db.collection('classrooms').doc(classroomId).update({
        'analytics.totalAIInteractions': classroom.analytics.totalAIInteractions,
        updatedAt: new Date()
      });

      // Log individual interaction for detailed analytics
      await db.collection('ai_interactions').add({
        classroomId,
        studentId,
        interactionType,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error tracking AI interaction:', error);
    }
  }

  /**
   * Delete classroom (soft delete)
   * @param {string} classroomId - Classroom ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(classroomId) {
    try {
      await db.collection('classrooms').doc(classroomId).update({
        isActive: false,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error deleting classroom:', error);
      throw error;
    }
  }
}

module.exports = Classroom; 
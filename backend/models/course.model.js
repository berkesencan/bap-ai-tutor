const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

/**
 * Course model for handling course data operations with Firebase
 */
class Course {
  /**
   * Create a new course
   * @param {Object} courseData - Course data
   * @param {string} userId - User ID of the creator
   * @returns {Promise<Object>} - Created course data
   */
  static async create(courseData, userId) {
    try {
      const courseId = uuidv4();
      const joinCode = this.generateJoinCode();
      
      const course = {
        id: courseId,
        name: courseData.name,
        code: courseData.code || null, // e.g., "CS101", "MATH201"
        semester: courseData.semester || null,
        year: courseData.year || new Date().getFullYear(),
        description: courseData.description || null,
        institution: courseData.institution || null,
        instructor: courseData.instructor || null,
        createdBy: userId,
        joinCode: joinCode,
        joinPassword: courseData.joinPassword || null,
        
        // Fields for integrations like Gradescope
        source: courseData.source || null,
        externalId: courseData.externalId || null,
        
        // Course members and roles
        members: [userId], // Array of user IDs
        memberRoles: {
          [userId]: 'creator' // creator, member
        },
        
        // Integration mappings per user
        integrations: {
          // Structure: { userId: { platform: integrationData } }
        },
        
        // Aggregated course data from all integrations
        assignments: [], // Deduplicated assignments from all integrations
        materials: [], // Course materials from all integrations
        announcements: [], // Announcements from all integrations
        grades: {}, // Per-user grades aggregated from integrations
        
        // Course settings
        settings: {
          allowMemberInvites: courseData.settings?.allowMemberInvites ?? true,
          autoDeduplication: courseData.settings?.autoDeduplication ?? true,
          aiEnabled: courseData.settings?.aiEnabled ?? true,
          publiclyJoinable: courseData.settings?.publiclyJoinable ?? false
        },
        
        // Analytics and metadata
        analytics: {
          totalMembers: 1,
          totalIntegrations: 0,
          totalAssignments: 0,
          lastActivity: new Date(),
          integrationStats: {}
        },
        
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('courses').doc(courseId).set(course);
      return course;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }

  /**
   * Generate a unique 6-character join code
   * @returns {string} - Join code
   */
  static generateJoinCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get course by ID
   * @param {string} courseId - Course ID
   * @returns {Promise<Object|null>} - Course data or null
   */
  static async getById(courseId) {
    try {
      const doc = await db.collection('courses').doc(courseId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting course by ID:', error);
      throw error;
    }
  }

  /**
   * Get course by join code
   * @param {string} joinCode - Join code
   * @returns {Promise<Object|null>} - Course data or null
   */
  static async getByJoinCode(joinCode) {
    try {
      const snapshot = await db.collection('courses')
        .where('joinCode', '==', joinCode.toUpperCase())
        .where('isActive', '==', true)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      return snapshot.docs[0].data();
    } catch (error) {
      console.error('Error getting course by join code:', error);
      throw error;
    }
  }

  /**
   * Get all courses for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of course data
   */
  static async getByUserId(userId) {
    try {
      // Simplified query to avoid composite index requirement
      const snapshot = await db.collection('courses')
        .where('members', 'array-contains', userId)
        .get();
      
      const courses = [];
      snapshot.forEach(doc => {
        const courseData = doc.data();
        // Filter active courses and add user's role to the course data
        if (courseData.isActive !== false) { // Include courses where isActive is true or undefined
          courseData.userRole = courseData.memberRoles[userId] || 'member';
          courses.push(courseData);
        }
      });
      
      // Sort by updatedAt in memory to avoid composite index
      courses.sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
        return dateB - dateA; // Descending order
      });
      
      return courses;
    } catch (error) {
      console.error('Error getting courses by user ID:', error);
      throw error;
    }
  }

  /**
   * Join a course
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID
   * @param {string} password - Optional password
   * @returns {Promise<Object>} - Updated course data
   */
  static async joinCourse(courseId, userId, password = null) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // Check password if required
      if (course.joinPassword && course.joinPassword !== password) {
        throw new Error('Invalid password');
      }

      // Check if user is already a member
      if (course.members.includes(userId)) {
        throw new Error('User already joined this course');
      }

      // Add user to course
      course.members.push(userId);
      course.memberRoles[userId] = 'member';
      course.analytics.totalMembers = course.members.length;
      course.analytics.lastActivity = new Date();
      course.updatedAt = new Date();

      await db.collection('courses').doc(courseId).update({
        members: course.members,
        [`memberRoles.${userId}`]: 'member',
        'analytics.totalMembers': course.analytics.totalMembers,
        'analytics.lastActivity': course.analytics.lastActivity,
        updatedAt: course.updatedAt
      });

      return course;
    } catch (error) {
      console.error('Error joining course:', error);
      throw error;
    }
  }

  /**
   * Add integration to course for a specific user
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID
   * @param {string} platform - Integration platform
   * @param {Object} integrationData - Integration data
   * @returns {Promise<Object>} - Updated course data
   */
  static async addIntegration(courseId, userId, platform, integrationData) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (!course.members.includes(userId)) {
        throw new Error('User is not a member of this course');
      }

      // Initialize user integrations if not exists
      if (!course.integrations[userId]) {
        course.integrations[userId] = {};
      }

      // Add integration
      course.integrations[userId][platform] = {
        ...integrationData,
        connectedAt: new Date(),
        isActive: true,
        lastSync: new Date()
      };

      // Update analytics
      course.analytics.totalIntegrations = Object.values(course.integrations)
        .reduce((total, userIntegrations) => {
          return total + Object.keys(userIntegrations).length;
        }, 0);

      if (!course.analytics.integrationStats[platform]) {
        course.analytics.integrationStats[platform] = 0;
      }
      course.analytics.integrationStats[platform]++;

      course.analytics.lastActivity = new Date();
      course.updatedAt = new Date();

      await db.collection('courses').doc(courseId).update({
        [`integrations.${userId}.${platform}`]: course.integrations[userId][platform],
        'analytics.totalIntegrations': course.analytics.totalIntegrations,
        [`analytics.integrationStats.${platform}`]: course.analytics.integrationStats[platform],
        'analytics.lastActivity': course.analytics.lastActivity,
        updatedAt: course.updatedAt
      });

      // Trigger content aggregation
      await this.aggregateContentFromIntegrations(courseId);

      return course;
    } catch (error) {
      console.error('Error adding integration to course:', error);
      throw error;
    }
  }

  /**
   * Remove integration from course
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID
   * @param {string} platform - Integration platform
   * @returns {Promise<Object>} - Updated course data
   */
  static async removeIntegration(courseId, userId, platform) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (!course.integrations[userId] || !course.integrations[userId][platform]) {
        throw new Error('Integration not found');
      }

      // Remove integration
      delete course.integrations[userId][platform];

      // Clean up empty user integration object
      if (Object.keys(course.integrations[userId]).length === 0) {
        delete course.integrations[userId];
      }

      // Update analytics
      course.analytics.totalIntegrations = Object.values(course.integrations)
        .reduce((total, userIntegrations) => {
          return total + Object.keys(userIntegrations).length;
        }, 0);

      if (course.analytics.integrationStats[platform] > 0) {
        course.analytics.integrationStats[platform]--;
      }

      course.analytics.lastActivity = new Date();
      course.updatedAt = new Date();

      await db.collection('courses').doc(courseId).update({
        [`integrations.${userId}`]: course.integrations[userId] || {},
        'analytics.totalIntegrations': course.analytics.totalIntegrations,
        [`analytics.integrationStats.${platform}`]: course.analytics.integrationStats[platform],
        'analytics.lastActivity': course.analytics.lastActivity,
        updatedAt: course.updatedAt
      });

      // Re-aggregate content
      await this.aggregateContentFromIntegrations(courseId);

      return course;
    } catch (error) {
      console.error('Error removing integration from course:', error);
      throw error;
    }
  }

  /**
   * Aggregate content from all integrations in a course
   * @param {string} courseId - Course ID
   * @returns {Promise<void>}
   */
  static async aggregateContentFromIntegrations(courseId) {
    try {
      const course = await this.getById(courseId);
      if (!course) return;

      const aggregatedAssignments = [];
      const aggregatedMaterials = [];
      const aggregatedAnnouncements = [];

      // Process each user's integrations
      for (const [userId, userIntegrations] of Object.entries(course.integrations)) {
        for (const [platform, integration] of Object.entries(userIntegrations)) {
          if (!integration.isActive) continue;

          // Add assignments with metadata
          if (integration.assignments) {
            integration.assignments.forEach(assignment => {
              aggregatedAssignments.push({
                ...assignment,
                sourceUserId: userId,
                sourcePlatform: platform,
                aggregatedAt: new Date()
              });
            });
          }

          // Add materials
          if (integration.materials) {
            integration.materials.forEach(material => {
              aggregatedMaterials.push({
                ...material,
                sourceUserId: userId,
                sourcePlatform: platform,
                aggregatedAt: new Date()
              });
            });
          }

          // Add announcements
          if (integration.announcements) {
            integration.announcements.forEach(announcement => {
              aggregatedAnnouncements.push({
                ...announcement,
                sourceUserId: userId,
                sourcePlatform: platform,
                aggregatedAt: new Date()
              });
            });
          }
        }
      }

      // Deduplicate content if enabled
      let finalAssignments = aggregatedAssignments;
      if (course.settings.autoDeduplication) {
        finalAssignments = this.deduplicateAssignments(aggregatedAssignments);
      }

      // Update course with aggregated content
      await db.collection('courses').doc(courseId).update({
        assignments: finalAssignments,
        materials: aggregatedMaterials,
        announcements: aggregatedAnnouncements,
        'analytics.totalAssignments': finalAssignments.length,
        'analytics.lastActivity': new Date(),
        updatedAt: new Date()
      });

    } catch (error) {
      console.error('Error aggregating content from integrations:', error);
    }
  }

  /**
   * Deduplicate assignments based on name and due date similarity
   * @param {Array} assignments - Array of assignments
   * @returns {Array} - Deduplicated assignments
   */
  static deduplicateAssignments(assignments) {
    const deduplicated = [];
    const seen = new Map();

    assignments.forEach(assignment => {
      const key = `${assignment.name?.toLowerCase()}_${assignment.dueDate}`;
      
      if (!seen.has(key)) {
        seen.set(key, assignment);
        deduplicated.push({
          ...assignment,
          duplicates: []
        });
      } else {
        // Add as duplicate
        const existingIndex = deduplicated.findIndex(a => 
          a.name?.toLowerCase() === assignment.name?.toLowerCase() && 
          a.dueDate === assignment.dueDate
        );
        
        if (existingIndex >= 0) {
          deduplicated[existingIndex].duplicates.push({
            sourceUserId: assignment.sourceUserId,
            sourcePlatform: assignment.sourcePlatform,
            originalData: assignment
          });
        }
      }
    });

    return deduplicated;
  }

  /**
   * Update course settings
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID (must be creator)
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated course data
   */
  static async update(courseId, userId, updateData) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (course.createdBy !== userId) {
        throw new Error('Only the course creator can update course settings');
      }

      const updateDoc = {
        ...updateData,
        updatedAt: new Date(),
        'analytics.lastActivity': new Date()
      };

      await db.collection('courses').doc(courseId).update(updateDoc);
      return this.getById(courseId);
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  }

  /**
   * Leave a course
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  static async leaveCourse(courseId, userId) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (course.createdBy === userId) {
        throw new Error('Course creator cannot leave the course');
      }

      // Remove user from members
      course.members = course.members.filter(id => id !== userId);
      delete course.memberRoles[userId];
      
      // Remove user's integrations
      delete course.integrations[userId];

      // Update analytics
      course.analytics.totalMembers = course.members.length;
      course.analytics.totalIntegrations = Object.values(course.integrations)
        .reduce((total, userIntegrations) => {
          return total + Object.keys(userIntegrations).length;
        }, 0);

      await db.collection('courses').doc(courseId).update({
        members: course.members,
        [`memberRoles.${userId}`]: null,
        [`integrations.${userId}`]: null,
        'analytics.totalMembers': course.analytics.totalMembers,
        'analytics.totalIntegrations': course.analytics.totalIntegrations,
        'analytics.lastActivity': new Date(),
        updatedAt: new Date()
      });

      // Re-aggregate content without this user's integrations
      await this.aggregateContentFromIntegrations(courseId);

      return true;
    } catch (error) {
      console.error('Error leaving course:', error);
      throw error;
    }
  }

  /**
   * Delete course (creator only)
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID (must be creator)
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(courseId, userId) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (course.createdBy !== userId) {
        throw new Error('Only the course creator can delete the course');
      }

      await db.collection('courses').doc(courseId).update({
        isActive: false,
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  }

  /**
   * Search public courses
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} - Array of matching courses
   */
  static async searchPublicCourses(query, filters = {}) {
    try {
      // Simplified query to avoid composite index issues
      const snapshot = await db.collection('courses')
        .where('settings.publiclyJoinable', '==', true)
        .limit(100)
        .get();
      
      const courses = [];
      
      snapshot.forEach(doc => {
        const course = doc.data();
        
        // Filter in memory to avoid composite index requirements
        if (course.isActive !== false) { // Include active courses
          // Apply filters
          if (filters.institution && course.institution !== filters.institution) return;
          if (filters.semester && course.semester !== filters.semester) return;
          if (filters.year && course.year !== filters.year) return;
          
          // Filter by query if provided
          if (!query || 
              course.name?.toLowerCase().includes(query.toLowerCase()) ||
              course.code?.toLowerCase().includes(query.toLowerCase()) ||
              course.instructor?.toLowerCase().includes(query.toLowerCase())) {
            
            // Remove sensitive data for public search
            const publicCourse = { ...course };
            delete publicCourse.integrations;
            delete publicCourse.joinPassword;
            courses.push(publicCourse);
          }
        }
      });

      // Limit results to 50 after filtering
      return courses.slice(0, 50);
    } catch (error) {
      console.error('Error searching public courses:', error);
      throw error;
    }
  }
}

module.exports = Course; 
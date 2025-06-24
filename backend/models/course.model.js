const { db } = require('../config/firebase');
const firebase = require('firebase-admin');
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
          [userId]: 'creator' // creator, admin, member
        },
        
        // Integration mappings per user (both old format and new linked integrations)
        integrations: {
          // Structure: { userId: { platform: integrationData } }
        },
        
        // NEW: Per-user linked integrations
        userLinkedIntegrations: {
          // Structure: { userId: [{ integrationId, platform, platformName, courseName, courseCode, linkedAt, linkedBy, isActive }] }
        },
        
        // Aggregated course data from all integrations (now per-user)
        userAggregatedData: {
          // Structure: { userId: { assignments: [], materials: [], announcements: [], grades: {} } }
        },
        
        // Legacy: Global aggregated data (deprecated, kept for backwards compatibility)
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
      console.log('Searching for course with join code:', joinCode.toUpperCase());
      
      const snapshot = await db.collection('courses')
        .where('joinCode', '==', joinCode.toUpperCase())
        .where('isActive', '==', true)
        .limit(1)
        .get();
      
      console.log('Join code search result:', {
        empty: snapshot.empty,
        size: snapshot.size
      });
      
      if (snapshot.empty) return null;
      
      const courseData = snapshot.docs[0].data();
      console.log('Found course:', {
        id: courseData.id,
        name: courseData.name,
        joinCode: courseData.joinCode
      });
      
      return courseData;
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
        // User is already a member, just return the course
        return course;
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
   * @param {string} newOwnerId - New owner ID (required if current user is creator)
   * @returns {Promise<boolean>} - Success status
   */
  static async leaveCourse(courseId, userId, newOwnerId = null) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // If user is the creator, they need to transfer ownership first
      if (course.createdBy === userId) {
        if (!newOwnerId) {
          throw new Error('Course creator must transfer ownership before leaving');
        }
        
        // Validate new owner is a member and not the same person
        if (!course.members.includes(newOwnerId)) {
          throw new Error('New owner must be a member of the course');
        }
        
        if (newOwnerId === userId) {
          throw new Error('Cannot transfer ownership to yourself');
        }
        
        // Transfer ownership
        await this.transferOwnership(courseId, userId, newOwnerId);
      }

      // Remove user from members
      course.members = course.members.filter(id => id !== userId);
      delete course.memberRoles[userId];
      
      // Remove user's integrations and linked integrations
      delete course.integrations[userId];
      delete course.userLinkedIntegrations[userId];
      delete course.userAggregatedData[userId];

      // Update analytics
      course.analytics.totalMembers = course.members.length;
      course.analytics.totalIntegrations = Object.values(course.integrations)
        .reduce((total, userIntegrations) => {
          return total + Object.keys(userIntegrations).length;
        }, 0);

      await db.collection('courses').doc(courseId).update({
        members: course.members,
        [`memberRoles.${userId}`]: firebase.firestore.FieldValue.delete(),
        [`integrations.${userId}`]: firebase.firestore.FieldValue.delete(),
        [`userLinkedIntegrations.${userId}`]: firebase.firestore.FieldValue.delete(),
        [`userAggregatedData.${userId}`]: firebase.firestore.FieldValue.delete(),
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
   * Transfer course ownership
   * @param {string} courseId - Course ID
   * @param {string} currentOwnerId - Current owner ID
   * @param {string} newOwnerId - New owner ID
   * @returns {Promise<boolean>} - Success status
   */
  static async transferOwnership(courseId, currentOwnerId, newOwnerId) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (course.createdBy !== currentOwnerId) {
        throw new Error('Only the course creator can transfer ownership');
      }

      if (!course.members.includes(newOwnerId)) {
        throw new Error('New owner must be a member of the course');
      }

      if (newOwnerId === currentOwnerId) {
        throw new Error('Cannot transfer ownership to yourself');
      }

      await db.collection('courses').doc(courseId).update({
        createdBy: newOwnerId,
        [`memberRoles.${newOwnerId}`]: 'creator',
        [`memberRoles.${currentOwnerId}`]: 'admin', // Demote previous owner to admin
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error transferring ownership:', error);
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
            
            console.log('Adding public course:', {
              id: publicCourse.id,
              name: publicCourse.name,
              joinCode: publicCourse.joinCode,
              hasJoinCode: !!publicCourse.joinCode
            });
            
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

  /**
   * Update a member's role in a course
   * @param {string} courseId - The ID of the course
   * @param {string} requestingUserId - The ID of the user making the request
   * @param {string} targetUserId - The ID of the user whose role is to be updated
   * @param {string} newRole - The new role ('admin' or 'member')
   * @returns {Promise<void>}
   */
  static async updateMemberRole(courseId, requestingUserId, targetUserId, newRole) {
    if (newRole !== 'admin' && newRole !== 'member') {
      throw new Error('Invalid role specified. Must be "admin" or "member".');
    }

    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found.');
      }

      const requesterRole = course.memberRoles[requestingUserId];
      if (requesterRole !== 'creator' && requesterRole !== 'admin') {
        throw new Error('Permission denied. User must be a creator or admin to change roles.');
      }

      if (course.memberRoles[targetUserId] === 'creator') {
        throw new Error('Cannot change the role of the course creator.');
      }

      await db.collection('courses').doc(courseId).update({
        [`memberRoles.${targetUserId}`]: newRole,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Remove a member from a course
   * @param {string} courseId - The ID of the course
   * @param {string} requestingUserId - The ID of the user making the request
   * @param {string} targetUserId - The ID of the user to be removed
   * @returns {Promise<void>}
   */
  static async removeMember(courseId, requestingUserId, targetUserId) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found.');
      }

      const requesterRole = course.memberRoles[requestingUserId];
      if (requesterRole !== 'creator' && requesterRole !== 'admin') {
        throw new Error('Permission denied. User must be a creator or admin to remove members.');
      }

      if (targetUserId === course.createdBy) {
        throw new Error('Cannot remove the course creator.');
      }
      
      const newMembers = course.members.filter(id => id !== targetUserId);
      
      // Firestore allows deleting fields using dot notation in an update call
      await db.collection('courses').doc(courseId).update({
        members: newMembers,
        [`memberRoles.${targetUserId}`]: firebase.firestore.FieldValue.delete(),
        'analytics.totalMembers': newMembers.length,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  /**
   * Link integrations to an existing course for a specific user
   * @param {string} courseId - Course ID
   * @param {Array} integrationCourses - Array of integration course objects
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated course data
   */
  static async linkIntegrations(courseId, integrationCourses, userId) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // Check if user has permission (creator, admin, or member)
      if (!course.members.includes(userId)) {
        throw new Error('User is not a member of this course');
      }

      // Initialize user-specific linked integrations if not exists
      if (!course.userLinkedIntegrations) {
        course.userLinkedIntegrations = {};
      }
      if (!course.userLinkedIntegrations[userId]) {
        course.userLinkedIntegrations[userId] = [];
      }

      // Add each integration for this user
      const newIntegrations = [];
      for (const integrationCourse of integrationCourses) {
        // Check if already linked for this user
        const existingLink = course.userLinkedIntegrations[userId].find(
          link => link.integrationId === integrationCourse.id
        );

        if (!existingLink) {
          const integrationLink = {
            integrationId: integrationCourse.id,
            platform: integrationCourse.source,
            platformName: this.getPlatformDisplayName(integrationCourse.source),
            courseName: integrationCourse.name,
            courseCode: integrationCourse.code,
            linkedAt: new Date(),
            linkedBy: userId,
            isActive: true
          };

          course.userLinkedIntegrations[userId].push(integrationLink);
          newIntegrations.push(integrationLink);
        }
      }

      // Update course with user-specific linked integrations
      course.updatedAt = new Date();
      course.analytics.lastActivity = new Date();

      await db.collection('courses').doc(courseId).update({
        userLinkedIntegrations: course.userLinkedIntegrations,
        updatedAt: course.updatedAt,
        'analytics.lastActivity': course.analytics.lastActivity
      });

      // Aggregate content from linked integrations for this user
      await this.aggregateUserLinkedIntegrationContent(courseId, userId);

      return course;
    } catch (error) {
      console.error('Error linking integrations:', error);
      throw error;
    }
  }

  /**
   * Unlink integration from a course for a specific user
   * @param {string} courseId - Course ID
   * @param {string} integrationId - Integration course ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated course data
   */
  static async unlinkIntegration(courseId, integrationId, userId) {
    try {
      const course = await this.getById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      if (!course.userLinkedIntegrations || !course.userLinkedIntegrations[userId]) {
        throw new Error('No integrations linked to this course for this user');
      }

      // Remove the integration for this user
      const initialLength = course.userLinkedIntegrations[userId].length;
      course.userLinkedIntegrations[userId] = course.userLinkedIntegrations[userId].filter(
        link => link.integrationId !== integrationId
      );

      if (course.userLinkedIntegrations[userId].length === initialLength) {
        throw new Error('Integration not found in user linked integrations');
      }

      // Update course
      course.updatedAt = new Date();
      course.analytics.lastActivity = new Date();

      await db.collection('courses').doc(courseId).update({
        userLinkedIntegrations: course.userLinkedIntegrations,
        updatedAt: course.updatedAt,
        'analytics.lastActivity': course.analytics.lastActivity
      });

      // Re-aggregate content for this user
      await this.aggregateUserLinkedIntegrationContent(courseId, userId);

      return course;
    } catch (error) {
      console.error('Error unlinking integration:', error);
      throw error;
    }
  }

  /**
   * Create a new course with user-specific linked integrations
   * @param {Object} courseData - Course data
   * @param {Array} integrationCourses - Array of integration course objects
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Created course data
   */
  static async createWithIntegrations(courseData, integrationCourses, userId) {
    try {
      // Create the base course
      const course = await this.create(courseData, userId);

      // Link the integrations for this user
      const linkedIntegrations = integrationCourses.map(integrationCourse => ({
        integrationId: integrationCourse.id,
        platform: integrationCourse.source,
        platformName: this.getPlatformDisplayName(integrationCourse.source),
        courseName: integrationCourse.name,
        courseCode: integrationCourse.code,
        linkedAt: new Date(),
        linkedBy: userId,
        isActive: true
      }));

      // Initialize user-specific linked integrations
      const userLinkedIntegrations = {
        [userId]: linkedIntegrations
      };

      // Update the course with user-specific linked integrations
      course.userLinkedIntegrations = userLinkedIntegrations;
      course.updatedAt = new Date();

      await db.collection('courses').doc(course.id).update({
        userLinkedIntegrations: course.userLinkedIntegrations,
        updatedAt: course.updatedAt
      });

      // Aggregate content from linked integrations for this user
      await this.aggregateUserLinkedIntegrationContent(course.id, userId);

      return course;
    } catch (error) {
      console.error('Error creating course with integrations:', error);
      throw error;
    }
  }

  /**
   * Aggregate content from user-specific linked integrations
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  static async aggregateUserLinkedIntegrationContent(courseId, userId) {
    try {
      const course = await this.getById(courseId);
      if (!course || !course.userLinkedIntegrations || !course.userLinkedIntegrations[userId]) return;

      console.log(`[Course Model] Starting aggregation for user ${userId} with ${course.userLinkedIntegrations[userId].length} linked integrations`);

      const aggregatedAssignments = [];
      const aggregatedMaterials = [];
      const aggregatedAnnouncements = [];

      // Import Assignment model to fetch assignments
      const Assignment = require('./assignment.model');

      // Process each linked integration for this user
      for (const integration of course.userLinkedIntegrations[userId]) {
        if (!integration.isActive) continue;

        console.log(`[Course Model] Processing integration: ${integration.platformName} - ${integration.courseName} (ID: ${integration.integrationId})`);

        const integrationCourse = await this.getById(integration.integrationId);
        if (!integrationCourse) {
          console.log(`[Course Model] Integration course not found: ${integration.integrationId}`);
          continue;
        }

        // Fetch assignments from the assignments collection for this integration course
        try {
          const integrationAssignments = await Assignment.getByCourseId(integration.integrationId);
          console.log(`[Course Model] Found ${integrationAssignments.length} assignments in integration course ${integration.courseName}`);

          if (integrationAssignments && integrationAssignments.length > 0) {
            const userAssignments = this.filterAssignmentsForUser(integrationAssignments, userId, integrationCourse);
            userAssignments.forEach(assignment => {
              aggregatedAssignments.push({
                ...assignment,
                sourceIntegration: integration.integrationId,
                sourcePlatform: integration.platform,
                sourcePlatformName: integration.platformName,
                aggregatedAt: new Date()
              });
            });
            console.log(`[Course Model] Added ${userAssignments.length} assignments from ${integration.courseName}`);
          }
        } catch (assignmentError) {
          console.error(`[Course Model] Error fetching assignments for integration ${integration.integrationId}:`, assignmentError);
        }

        // Add materials (from course document if they exist)
        if (integrationCourse.materials) {
          const userMaterials = this.filterMaterialsForUser(integrationCourse.materials, userId, integrationCourse);
          userMaterials.forEach(material => {
            aggregatedMaterials.push({
              ...material,
              sourceIntegration: integration.integrationId,
              sourcePlatform: integration.platform,
              sourcePlatformName: integration.platformName,
              aggregatedAt: new Date()
            });
          });
          console.log(`[Course Model] Added ${userMaterials.length} materials from ${integration.courseName}`);
        }

        // Add announcements (from course document if they exist)
        if (integrationCourse.announcements) {
          const userAnnouncements = this.filterAnnouncementsForUser(integrationCourse.announcements, userId, integrationCourse);
          userAnnouncements.forEach(announcement => {
            aggregatedAnnouncements.push({
              ...announcement,
              sourceIntegration: integration.integrationId,
              sourcePlatform: integration.platform,
              sourcePlatformName: integration.platformName,
              aggregatedAt: new Date()
            });
          });
          console.log(`[Course Model] Added ${userAnnouncements.length} announcements from ${integration.courseName}`);
        }
      }

      // Deduplicate content if enabled
      let finalAssignments = aggregatedAssignments;
      if (course.settings && course.settings.autoDeduplication) {
        finalAssignments = this.deduplicateAssignments(aggregatedAssignments);
      }

      console.log(`[Course Model] Final aggregated data for user ${userId}: ${finalAssignments.length} assignments, ${aggregatedMaterials.length} materials, ${aggregatedAnnouncements.length} announcements`);

      // Initialize user aggregated data if not exists
      if (!course.userAggregatedData) {
        course.userAggregatedData = {};
      }

      // Update course with user-specific aggregated content
      const userAggregatedData = {
        ...course.userAggregatedData,
        [userId]: {
          assignments: finalAssignments,
          materials: aggregatedMaterials,
          announcements: aggregatedAnnouncements,
          lastAggregated: new Date()
        }
      };

      await db.collection('courses').doc(courseId).update({
        userAggregatedData: userAggregatedData,
        'analytics.lastActivity': new Date(),
        updatedAt: new Date()
      });

      console.log(`[Course Model] Successfully updated user aggregated data for user ${userId}`);

    } catch (error) {
      console.error('Error aggregating user linked integration content:', error);
    }
  }

  /**
   * Filter assignments for a specific user based on their access in the integration
   * @param {Array} assignments - All assignments
   * @param {string} userId - User ID
   * @param {Object} integrationCourse - Integration course data
   * @returns {Array} - Filtered assignments
   */
  static filterAssignmentsForUser(assignments, userId, integrationCourse) {
    // For now, return all assignments. In the future, this can be enhanced
    // to filter based on user's role, enrollment status, or visibility settings
    // in the integration platform
    
    // Check if user has specific integration data
    if (integrationCourse.integrations && integrationCourse.integrations[userId]) {
      const userIntegrationData = integrationCourse.integrations[userId];
      
      // If user has platform-specific assignments, use those
      Object.values(userIntegrationData).forEach(platformData => {
        if (platformData.assignments && platformData.assignments.length > 0) {
          return platformData.assignments;
        }
      });
    }
    
    return assignments;
  }

  /**
   * Filter materials for a specific user
   * @param {Array} materials - All materials
   * @param {string} userId - User ID
   * @param {Object} integrationCourse - Integration course data
   * @returns {Array} - Filtered materials
   */
  static filterMaterialsForUser(materials, userId, integrationCourse) {
    // Similar filtering logic for materials
    if (integrationCourse.integrations && integrationCourse.integrations[userId]) {
      const userIntegrationData = integrationCourse.integrations[userId];
      
      Object.values(userIntegrationData).forEach(platformData => {
        if (platformData.materials && platformData.materials.length > 0) {
          return platformData.materials;
        }
      });
    }
    
    return materials;
  }

  /**
   * Filter announcements for a specific user
   * @param {Array} announcements - All announcements
   * @param {string} userId - User ID
   * @param {Object} integrationCourse - Integration course data
   * @returns {Array} - Filtered announcements
   */
  static filterAnnouncementsForUser(announcements, userId, integrationCourse) {
    // Similar filtering logic for announcements
    if (integrationCourse.integrations && integrationCourse.integrations[userId]) {
      const userIntegrationData = integrationCourse.integrations[userId];
      
      Object.values(userIntegrationData).forEach(platformData => {
        if (platformData.announcements && platformData.announcements.length > 0) {
          return platformData.announcements;
        }
      });
    }
    
    return announcements;
  }

  /**
   * Legacy: Aggregate content from linked integrations (deprecated)
   * @param {string} courseId - Course ID
   * @returns {Promise<void>}
   */
  static async aggregateLinkedIntegrationContent(courseId) {
    try {
      const course = await this.getById(courseId);
      if (!course || !course.linkedIntegrations) return;

      const aggregatedAssignments = [];
      const aggregatedMaterials = [];
      const aggregatedAnnouncements = [];

      // Process each linked integration
      for (const integration of course.linkedIntegrations) {
        if (!integration.isActive) continue;

        const integrationCourse = await this.getById(integration.integrationId);
        if (!integrationCourse) continue;

        // Add assignments with integration metadata
        if (integrationCourse.assignments) {
          integrationCourse.assignments.forEach(assignment => {
            aggregatedAssignments.push({
              ...assignment,
              sourceIntegration: integration.integrationId,
              sourcePlatform: integration.platform,
              sourcePlatformName: integration.platformName,
              aggregatedAt: new Date()
            });
          });
        }

        // Add materials
        if (integrationCourse.materials) {
          integrationCourse.materials.forEach(material => {
            aggregatedMaterials.push({
              ...material,
              sourceIntegration: integration.integrationId,
              sourcePlatform: integration.platform,
              sourcePlatformName: integration.platformName,
              aggregatedAt: new Date()
            });
          });
        }

        // Add announcements
        if (integrationCourse.announcements) {
          integrationCourse.announcements.forEach(announcement => {
            aggregatedAnnouncements.push({
              ...announcement,
              sourceIntegration: integration.integrationId,
              sourcePlatform: integration.platform,
              sourcePlatformName: integration.platformName,
              aggregatedAt: new Date()
            });
          });
        }
      }

      // Deduplicate content if enabled
      let finalAssignments = aggregatedAssignments;
      if (course.settings && course.settings.autoDeduplication) {
        finalAssignments = this.deduplicateAssignments(aggregatedAssignments);
      }

      // Update course with aggregated content (legacy format)
      await db.collection('courses').doc(courseId).update({
        assignments: finalAssignments,
        materials: aggregatedMaterials,
        announcements: aggregatedAnnouncements,
        'analytics.totalAssignments': finalAssignments.length,
        'analytics.lastActivity': new Date(),
        updatedAt: new Date()
      });

    } catch (error) {
      console.error('Error aggregating linked integration content:', error);
    }
  }

  /**
   * Get platform display name
   * @param {string} platform - Platform identifier
   * @returns {string} - Display name
   */
  static getPlatformDisplayName(platform) {
    const platformNames = {
      gradescope: 'Gradescope',
      canvas: 'Canvas',
      blackboard: 'Blackboard',
      brightspace: 'Brightspace',
      moodle: 'Moodle'
    };
    return platformNames[platform] || platform;
  }

  /**
   * Get platform icon
   * @param {string} platform - Platform identifier
   * @returns {string} - Platform icon
   */
  static getPlatformIcon(platform) {
    const platformIcons = {
      gradescope: '🎓',
      canvas: '🎨',
      blackboard: '📚',
      brightspace: '💡',
      moodle: '📖'
    };
    return platformIcons[platform] || '🔗';
  }
}

module.exports = Course; 
const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

class Activity {
  /**
   * Create a new interactive activity
   * @param {Object} activityData - Activity data
   * @param {string} teacherId - Teacher's user ID
   * @param {string} classroomId - Classroom ID
   * @returns {Promise<Object>} - Created activity data
   */
  static async create(activityData, teacherId, classroomId) {
    try {
      const activityId = uuidv4();
      const joinCode = this.generateJoinCode();
      
      const activity = {
        id: activityId,
        classroomId: classroomId,
        teacherId: teacherId,
        title: activityData.title,
        type: activityData.type, // 'ai-quiz', 'collaborative-solving', 'concept-race', 'step-by-step'
        description: activityData.description || null,
        joinCode: joinCode,
        settings: {
          maxParticipants: activityData.settings?.maxParticipants || 50,
          timeLimit: activityData.settings?.timeLimit || 300, // seconds
          allowHints: activityData.settings?.allowHints ?? true,
          showLeaderboard: activityData.settings?.showLeaderboard ?? true,
          aiDifficulty: activityData.settings?.aiDifficulty || 'medium', // easy, medium, hard, adaptive
          gamificationEnabled: activityData.settings?.gamificationEnabled ?? true,
          pointsSystem: {
            correctAnswer: 100,
            speedBonus: 50,
            streakBonus: 25,
            hintPenalty: -10
          }
        },
        content: {
          topic: activityData.content?.topic || null,
          difficulty: activityData.content?.difficulty || 'medium',
          questions: activityData.content?.questions || [],
          materials: activityData.content?.materials || [], // Related course materials
          aiPrompts: activityData.content?.aiPrompts || [] // Custom AI prompts for content generation
        },
        participants: [],
        responses: {},
        leaderboard: [],
        status: 'draft', // draft, active, paused, completed
        stats: {
          totalParticipants: 0,
          averageScore: 0,
          completionRate: 0,
          engagementScore: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        completedAt: null
      };

      await db.collection('activities').doc(activityId).set(activity);
      return activity;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  }

  /**
   * Generate a unique 4-character join code for activities
   * @returns {string} - Join code
   */
  static generateJoinCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get activity by ID
   * @param {string} activityId - Activity ID
   * @returns {Promise<Object|null>} - Activity data or null
   */
  static async getById(activityId) {
    try {
      const doc = await db.collection('activities').doc(activityId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting activity by ID:', error);
      throw error;
    }
  }

  /**
   * Get activity by join code
   * @param {string} joinCode - Join code
   * @returns {Promise<Object|null>} - Activity data or null
   */
  static async getByJoinCode(joinCode) {
    try {
      const snapshot = await db.collection('activities')
        .where('joinCode', '==', joinCode.toUpperCase())
        .where('status', 'in', ['active', 'paused'])
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      return snapshot.docs[0].data();
    } catch (error) {
      console.error('Error getting activity by join code:', error);
      throw error;
    }
  }

  /**
   * Get all activities for a classroom
   * @param {string} classroomId - Classroom ID
   * @returns {Promise<Array>} - Array of activity data
   */
  static async getByClassroomId(classroomId) {
    try {
      const snapshot = await db.collection('activities')
        .where('classroomId', '==', classroomId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const activities = [];
      snapshot.forEach(doc => {
        activities.push(doc.data());
      });
      
      return activities;
    } catch (error) {
      console.error('Error getting activities by classroom ID:', error);
      throw error;
    }
  }

  /**
   * Join activity as participant
   * @param {string} activityId - Activity ID
   * @param {string} studentId - Student's user ID
   * @param {string} studentName - Student's name
   * @returns {Promise<Object>} - Updated activity data
   */
  static async joinActivity(activityId, studentId, studentName) {
    try {
      const activity = await this.getById(activityId);
      if (!activity) {
        throw new Error('Activity not found');
      }

      if (activity.status !== 'active') {
        throw new Error('Activity is not currently active');
      }

      if (activity.participants.length >= activity.settings.maxParticipants) {
        throw new Error('Activity is full');
      }

      // Check if student is already participating
      const existingParticipant = activity.participants.find(p => p.studentId === studentId);
      if (existingParticipant) {
        throw new Error('Student already participating');
      }

      // Add participant
      const participant = {
        studentId,
        name: studentName,
        score: 0,
        streak: 0,
        joinedAt: new Date(),
        isActive: true
      };

      activity.participants.push(participant);
      activity.stats.totalParticipants = activity.participants.length;
      activity.updatedAt = new Date();

      await db.collection('activities').doc(activityId).update({
        participants: activity.participants,
        'stats.totalParticipants': activity.stats.totalParticipants,
        updatedAt: activity.updatedAt
      });

      return activity;
    } catch (error) {
      console.error('Error joining activity:', error);
      throw error;
    }
  }

  /**
   * Submit response to activity
   * @param {string} activityId - Activity ID
   * @param {string} studentId - Student's user ID
   * @param {Object} response - Response data
   * @returns {Promise<Object>} - Response result with scoring
   */
  static async submitResponse(activityId, studentId, response) {
    try {
      const activity = await this.getById(activityId);
      if (!activity) {
        throw new Error('Activity not found');
      }

      // Initialize responses for student if not exists
      if (!activity.responses[studentId]) {
        activity.responses[studentId] = [];
      }

      // Calculate score based on activity type and settings
      const scoreResult = await this.calculateScore(activity, response);
      
      // Add response
      const responseData = {
        ...response,
        submittedAt: new Date(),
        score: scoreResult.points,
        feedback: scoreResult.feedback,
        isCorrect: scoreResult.isCorrect
      };

      activity.responses[studentId].push(responseData);

      // Update participant score and streak
      const participantIndex = activity.participants.findIndex(p => p.studentId === studentId);
      if (participantIndex !== -1) {
        activity.participants[participantIndex].score += scoreResult.points;
        
        if (scoreResult.isCorrect) {
          activity.participants[participantIndex].streak += 1;
        } else {
          activity.participants[participantIndex].streak = 0;
        }
      }

      // Update leaderboard
      activity.leaderboard = activity.participants
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      activity.updatedAt = new Date();

      await db.collection('activities').doc(activityId).update({
        [`responses.${studentId}`]: activity.responses[studentId],
        participants: activity.participants,
        leaderboard: activity.leaderboard,
        updatedAt: activity.updatedAt
      });

      return {
        success: true,
        score: scoreResult.points,
        totalScore: activity.participants[participantIndex]?.score || 0,
        feedback: scoreResult.feedback,
        leaderboardPosition: activity.leaderboard.findIndex(p => p.studentId === studentId) + 1
      };
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    }
  }

  /**
   * Calculate score for a response
   * @param {Object} activity - Activity data
   * @param {Object} response - Response data
   * @returns {Promise<Object>} - Score result
   */
  static async calculateScore(activity, response) {
    const { pointsSystem } = activity.settings;
    let points = 0;
    let feedback = '';
    let isCorrect = false;

    switch (activity.type) {
      case 'ai-quiz':
        // AI evaluates the answer
        isCorrect = await this.evaluateWithAI(response.answer, response.expectedAnswer);
        if (isCorrect) {
          points = pointsSystem.correctAnswer;
          feedback = 'Correct! Well done!';
          
          // Speed bonus (if answered quickly)
          if (response.timeSpent < 10) {
            points += pointsSystem.speedBonus;
            feedback += ' ⚡ Speed bonus!';
          }
        } else {
          feedback = 'Not quite right. Try again!';
        }
        break;

      case 'collaborative-solving':
        // Partial credit for steps in problem solving
        points = Math.floor((response.completedSteps / response.totalSteps) * pointsSystem.correctAnswer);
        isCorrect = response.completedSteps === response.totalSteps;
        feedback = `Completed ${response.completedSteps}/${response.totalSteps} steps correctly!`;
        break;

      case 'concept-race':
        // Time-based scoring
        const timeBonus = Math.max(0, 60 - response.timeSpent) * 2;
        if (response.isCorrect) {
          points = pointsSystem.correctAnswer + timeBonus;
          isCorrect = true;
          feedback = `Correct! Time bonus: +${timeBonus} points`;
        }
        break;

      default:
        points = response.isCorrect ? pointsSystem.correctAnswer : 0;
        isCorrect = response.isCorrect;
        feedback = isCorrect ? 'Correct!' : 'Try again!';
    }

    // Apply hint penalty if hints were used
    if (response.hintsUsed > 0) {
      points += pointsSystem.hintPenalty * response.hintsUsed;
      feedback += ` (${response.hintsUsed} hints used)`;
    }

    return { points: Math.max(0, points), feedback, isCorrect };
  }

  /**
   * Use AI to evaluate student responses
   * @param {string} studentAnswer - Student's answer
   * @param {string} expectedAnswer - Expected answer
   * @returns {Promise<boolean>} - Whether the answer is correct
   */
  static async evaluateWithAI(studentAnswer, expectedAnswer) {
    try {
      // This would integrate with your AI service
      // For now, simple string comparison
      return studentAnswer.toLowerCase().trim() === expectedAnswer.toLowerCase().trim();
    } catch (error) {
      console.error('Error evaluating with AI:', error);
      return false;
    }
  }

  /**
   * Generate AI-powered questions for activity
   * @param {string} activityId - Activity ID
   * @param {Object} params - Generation parameters
   * @returns {Promise<Array>} - Generated questions
   */
  static async generateAIQuestions(activityId, params) {
    try {
      // This would integrate with your AI service to generate questions
      // based on course materials and difficulty level
      const mockQuestions = [
        {
          id: uuidv4(),
          question: `What is the derivative of ${params.topic}?`,
          type: 'multiple-choice',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A',
          explanation: 'AI-generated explanation...',
          difficulty: params.difficulty,
          points: 100
        }
      ];

      return mockQuestions;
    } catch (error) {
      console.error('Error generating AI questions:', error);
      throw error;
    }
  }

  /**
   * Update activity status
   * @param {string} activityId - Activity ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated activity data
   */
  static async updateStatus(activityId, status) {
    try {
      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'active' && !updateData.startedAt) {
        updateData.startedAt = new Date();
      }

      if (status === 'completed') {
        updateData.completedAt = new Date();
        
        // Calculate final stats
        const activity = await this.getById(activityId);
        if (activity) {
          const totalResponses = Object.values(activity.responses).flat().length;
          const correctResponses = Object.values(activity.responses)
            .flat()
            .filter(r => r.isCorrect).length;
          
          updateData['stats.completionRate'] = totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0;
          updateData['stats.averageScore'] = activity.participants.length > 0 
            ? activity.participants.reduce((sum, p) => sum + p.score, 0) / activity.participants.length 
            : 0;
        }
      }

      await db.collection('activities').doc(activityId).update(updateData);
      return this.getById(activityId);
    } catch (error) {
      console.error('Error updating activity status:', error);
      throw error;
    }
  }

  /**
   * Delete activity
   * @param {string} activityId - Activity ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(activityId) {
    try {
      await db.collection('activities').doc(activityId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }
}

module.exports = Activity; 
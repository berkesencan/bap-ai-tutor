const { db } = require('../../config/firebase');

class ActivityAnalyticsController {
  
  async getActivityAnalytics(req, res) {
    try {
      const { activityId } = req.params;
      const userId = req.user.uid;

      const activityRef = db.collection('activities').doc(activityId);
      const activityDoc = await activityRef.get();

      if (!activityDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        });
      }

      const activity = activityDoc.data();

      // Check permissions
      if (activity.createdBy !== userId) {
        const hasPermission = await this.checkInstructorPermissions(userId, activity.courseId);
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions to view analytics'
          });
        }
      }

      // Get session data
      const sessionsRef = db.collection('game_sessions')
        .where('activityId', '==', activityId);
      
      const sessionsSnapshot = await sessionsRef.get();
      const sessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const analytics = this.generateAnalytics(sessions);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Error getting activity analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get activity analytics'
      });
    }
  }

  generateAnalytics(sessions) {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;

    return {
      overview: {
        totalParticipants: totalSessions,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions * 100).toFixed(1) : 0,
        averageScore: this.calculateAverageScore(sessions),
        averageTimeSpent: this.calculateAverageTimeSpent(sessions),
        engagementScore: this.calculateEngagementScore(sessions)
      },
      performance: {
        scoreDistribution: this.calculateScoreDistribution(sessions),
        timeDistribution: this.calculateTimeDistribution(sessions)
      },
      participation: {
        dailyActive: this.calculateDailyActiveUsers(sessions),
        participationOverTime: this.calculateParticipationOverTime(sessions)
      }
    };
  }

  calculateAverageScore(sessions) {
    if (sessions.length === 0) return 0;
    const totalScore = sessions.reduce((sum, session) => sum + (session.progress?.score || 0), 0);
    return Math.round(totalScore / sessions.length);
  }

  calculateAverageTimeSpent(sessions) {
    if (sessions.length === 0) return 0;
    const totalTime = sessions.reduce((sum, session) => {
      const start = new Date(session.startedAt);
      const end = session.completedAt ? new Date(session.completedAt) : new Date();
      return sum + (end - start);
    }, 0);
    return Math.round(totalTime / sessions.length / 1000 / 60); // minutes
  }

  calculateEngagementScore(sessions) {
    // Simplified engagement calculation
    let engagementScore = 0;
    
    sessions.forEach(session => {
      let sessionScore = 0;
      
      const timeSpent = session.progress?.totalTimeSpent || 0;
      if (timeSpent >= 15 && timeSpent <= 45) sessionScore += 30;
      
      if (session.status === 'completed') sessionScore += 40;
      
      const accuracy = session.progress?.accuracy || 0;
      sessionScore += accuracy * 0.3;
      
      engagementScore += sessionScore;
    });
    
    return sessions.length > 0 ? Math.round(engagementScore / sessions.length) : 0;
  }

  calculateScoreDistribution(sessions) {
    const ranges = [
      { min: 0, max: 20, count: 0 },
      { min: 21, max: 40, count: 0 },
      { min: 41, max: 60, count: 0 },
      { min: 61, max: 80, count: 0 },
      { min: 81, max: 100, count: 0 }
    ];

    sessions.forEach(session => {
      const score = session.progress?.score || 0;
      const range = ranges.find(r => score >= r.min && score <= r.max);
      if (range) range.count++;
    });

    return ranges;
  }

  calculateTimeDistribution(sessions) {
    const ranges = [
      { min: 0, max: 10, count: 0, label: '0-10 min' },
      { min: 11, max: 20, count: 0, label: '11-20 min' },
      { min: 21, max: 30, count: 0, label: '21-30 min' },
      { min: 31, max: 45, count: 0, label: '31-45 min' },
      { min: 46, max: 999, count: 0, label: '45+ min' }
    ];

    sessions.forEach(session => {
      const timeSpent = session.progress?.totalTimeSpent || 0;
      const range = ranges.find(r => timeSpent >= r.min && timeSpent <= r.max);
      if (range) range.count++;
    });

    return ranges;
  }

  calculateDailyActiveUsers(sessions) {
    const dailyUsers = {};
    sessions.forEach(session => {
      const date = new Date(session.startedAt).toDateString();
      if (!dailyUsers[date]) dailyUsers[date] = new Set();
      dailyUsers[date].add(session.userId);
    });

    return Object.keys(dailyUsers).map(date => ({
      date,
      activeUsers: dailyUsers[date].size
    }));
  }

  calculateParticipationOverTime(sessions) {
    const participation = {};
    sessions.forEach(session => {
      const hour = new Date(session.startedAt).getHours();
      participation[hour] = (participation[hour] || 0) + 1;
    });
    return participation;
  }

  async checkInstructorPermissions(userId, courseId) {
    try {
      const courseRef = db.collection('courses').doc(courseId);
      const courseDoc = await courseRef.get();
      
      if (!courseDoc.exists) return false;
      
      const courseData = courseDoc.data();
      return courseData.instructorId === userId || 
             courseData.assistants?.includes(userId);
    } catch (error) {
      console.error('Error checking instructor permissions:', error);
      return false;
    }
  }
}

module.exports = ActivityAnalyticsController;

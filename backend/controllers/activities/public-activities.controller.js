const { db } = require('../../config/firebase');

class PublicActivitiesController {
  
  async getMyActivities(req, res) {
    try {
      const userId = req.user?.uid;
      
      // Get user's enrolled courses
      const Course = require('../../models/course.model');
      const userCourses = await Course.getByUserId(userId);

      if (userCourses.length === 0) {
        return res.json({
          success: true,
          data: { 
            courses: [],
            activitiesByCourse: {},
            playerStats: {
              totalXP: 0,
              currentLevel: 'Novice Scholar',
              badges: [],
              completedActivities: 0,
              weeklyProgress: 0
            }
          }
        });
      }

      // Generate sample activities for each course
      const activitiesByCourse = {};
      const sampleActivities = [
        {
          id: 'neural-conquest-1',
          title: 'Conquer Calculus Territory',
          gameMode: 'neural-conquest',
          difficulty: 'intermediate',
          estimatedTime: 25,
          participants: 45,
          status: 'active',
          description: 'Master calculus concepts through strategic territorial conquest'
        },
        {
          id: 'mystery-syndicate-1',
          title: 'The Physics Conspiracy',
          gameMode: 'mystery-syndicate',
          difficulty: 'advanced',
          estimatedTime: 40,
          participants: 23,
          status: 'active',
          description: 'Uncover hidden physics principles through collaborative investigation'
        }
      ];

      userCourses.forEach(course => {
        activitiesByCourse[course.id] = {
          courseName: course.name,
          activities: sampleActivities.map(activity => ({
            ...activity,
            courseId: course.id
          }))
        };
      });

      const playerStats = {
        totalXP: 2847,
        currentLevel: 'Knowledge Architect',
        badges: [
          { id: 'first_conquest', name: 'First Conquest', icon: '🏆' },
          { id: 'mystery_solver', name: 'Mystery Solver', icon: '🕵️' }
        ],
        completedActivities: 42,
        weeklyProgress: 85
      };

      // Load active NC games (single + multiplayer, including invites)
      let activeGames = [];
      if (userId) {
        let userEmail = req.user?.email;
        if (!userEmail) {
          try {
            const udoc = await db.collection('users').doc(userId).get();
            if (udoc.exists) userEmail = udoc.data().email;
          } catch {}
        }
        const spSnap = await db.collection('neural_conquest_sessions')
          .where('userId', '==', userId)
          .where('isActive', '==', true)
          .limit(10)
          .get();
        spSnap.forEach(doc => {
          const s = doc.data();
          activeGames.push({
            id: s.id || doc.id,
            type: 'neural-conquest',
            mode: 'single',
            topic: s.topicData?.topic || s.topic || 'Neural Conquest',
            createdAt: s.createdAt,
            status: s.gameState?.phase === 'game_over' ? 'completed' : 'active'
          });
        });

        const mpSnap = await db.collection('neural_conquest_multiplayer').limit(50).get();
        mpSnap.forEach(doc => {
          const g = doc.data();
          const isPlayer = Array.isArray(g.players) && g.players.find(p => p.id === userId);
          const isInvited = (Array.isArray(g.inviteUserIds) && g.inviteUserIds.includes(userId)) ||
                            (userEmail && Array.isArray(g.inviteEmails) && g.inviteEmails.includes(userEmail));
          if (isPlayer || isInvited) {
            activeGames.push({
              id: g.gameId || doc.id,
              type: 'neural-conquest',
              mode: 'multiplayer',
              topic: g.topicData?.topic || 'Neural Conquest',
              createdAt: g.createdAt,
              status: isPlayer ? (g.status || 'active') : 'invited'
            });
          }
        });
      }

      res.json({
        success: true,
        data: {
          courses: userCourses,
          activitiesByCourse,
          playerStats,
          activeGames
        }
      });

    } catch (error) {
      console.error('Error fetching my activities:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activities'
      });
    }
  }

  async getPublicActivities(req, res) {
    try {
      const { 
        search = '', 
        type = 'all', 
        difficulty = 'all', 
        subject = 'all',
        sortBy = 'popular',
        page = 1,
        limit = 12 
      } = req.query;

      // Sample public activities
      let activities = [
        {
          id: 'public-neural-1',
          title: 'Calculus Conquest: Derivatives Domain',
          gameMode: 'neural-conquest',
          difficulty: 'intermediate',
          estimatedTime: 30,
          description: 'Master derivatives through strategic territorial conquest in this calculus-focused empire building game.',
          createdBy: 'Prof. Mathematics',
          institution: 'MIT',
          subject: 'Mathematics',
          participants: 1247,
          rating: 4.8,
          likes: 892,
          playCount: 3421,
          tags: ['calculus', 'derivatives', 'strategic', 'competitive'],
          credentialValue: 'high',
          createdAt: new Date('2024-01-15').toISOString(),
          status: 'published'
        },
        {
          id: 'public-mystery-1',
          title: 'The Quantum Mechanics Conspiracy',
          gameMode: 'mystery-syndicate',
          difficulty: 'advanced',
          estimatedTime: 45,
          description: 'Uncover the mysteries of quantum mechanics through collaborative investigation.',
          createdBy: 'Dr. Physics',
          institution: 'Stanford',
          subject: 'Physics',
          participants: 756,
          rating: 4.9,
          likes: 623,
          playCount: 2134,
          tags: ['quantum', 'physics', 'collaborative', 'mystery'],
          credentialValue: 'very-high',
          createdAt: new Date('2024-01-10').toISOString(),
          status: 'published'
        }
      ];

      // Apply filters
      if (search) {
        const searchLower = search.toLowerCase();
        activities = activities.filter(activity => 
          activity.title.toLowerCase().includes(searchLower) ||
          activity.description.toLowerCase().includes(searchLower) ||
          activity.subject.toLowerCase().includes(searchLower)
        );
      }

      if (type && type !== 'all') {
        activities = activities.filter(activity => activity.gameMode === type);
      }

      if (difficulty && difficulty !== 'all') {
        activities = activities.filter(activity => activity.difficulty === difficulty);
      }

      if (subject && subject !== 'all') {
        activities = activities.filter(activity => activity.subject.toLowerCase().includes(subject.toLowerCase()));
      }

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          activities.sort((a, b) => (b.participants || 0) - (a.participants || 0));
          break;
        case 'recent':
          activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'rating':
          activities.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        default:
          break;
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedActivities = activities.slice(startIndex, startIndex + limit);

      res.json({
        success: true,
        data: {
          activities: paginatedActivities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: activities.length,
            totalPages: Math.ceil(activities.length / limit)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching public activities:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch public activities'
      });
    }
  }
}

module.exports = PublicActivitiesController;

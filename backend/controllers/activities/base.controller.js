const { db } = require('../../config/firebase');

class BaseActivityController {
  
  // Create a new learning activity
  async createActivity(req, res) {
    try {
      const { 
        title, 
        description, 
        type, 
        courseId, 
        materials, 
        settings, 
        privacy,
        gameMode,
        difficulty,
        duration
      } = req.body;

      if (!title || !type || !courseId) {
        return res.status(400).json({
          success: false,
          message: 'Title, type, and course are required'
        });
      }

      // Create activity data
      const activityData = {
        title: title.trim(),
        description: description?.trim() || '',
        type,
        courseId,
        materials: materials || [],
        settings: {
          anonymousMode: settings?.anonymousMode ?? true,
          allowAsyncPlay: settings?.allowAsyncPlay ?? true,
          difficultyAdaptation: settings?.difficultyAdaptation ?? true,
          ...settings
        },
        privacy: {
          shareWithInstitution: privacy?.shareWithInstitution ?? false,
          allowPublicDiscovery: privacy?.allowPublicDiscovery ?? false,
          dataRetentionDays: privacy?.dataRetentionDays ?? 365,
          ...privacy
        },
        createdBy: req.user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
        gameMode,
        difficulty,
        duration,
        tags: [gameMode],
        visibility: settings?.isPublic ? 'public' : 'course'
      };

      const activityRef = await db.collection('activities').add(activityData);

      res.status(201).json({
        success: true,
        message: 'Activity created successfully',
        data: {
          id: activityRef.id,
          ...activityData
        }
      });

    } catch (error) {
      console.error('Error creating activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create activity'
      });
    }
  }

  // Get single activity
  async getActivity(req, res) {
    try {
      const { activityId } = req.params;
      const activityRef = db.collection('activities').doc(activityId);
      const activityDoc = await activityRef.get();

      if (!activityDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        });
      }

      const activityData = { id: activityDoc.id, ...activityDoc.data() };

      res.json({
        success: true,
        data: activityData
      });

    } catch (error) {
      console.error('Error getting activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get activity'
      });
    }
  }

  // Update activity
  async updateActivity(req, res) {
    try {
      const { activityId } = req.params;
      const updates = req.body;

      const activityRef = db.collection('activities').doc(activityId);
      const activityDoc = await activityRef.get();

      if (!activityDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        });
      }

      const activityData = activityDoc.data();
      if (activityData.createdBy !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      await activityRef.update({
        ...updates,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Activity updated successfully'
      });

    } catch (error) {
      console.error('Error updating activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update activity'
      });
    }
  }

  // Delete activity
  async deleteActivity(req, res) {
    try {
      const { activityId } = req.params;

      const activityRef = db.collection('activities').doc(activityId);
      const activityDoc = await activityRef.get();

      if (!activityDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        });
      }

      const activityData = activityDoc.data();
      if (activityData.createdBy !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      await activityRef.delete();

      res.json({
        success: true,
        message: 'Activity deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete activity'
      });
    }
  }

  // Publish activity
  async publishActivity(req, res) {
    try {
      const { activityId } = req.params;

      const activityRef = db.collection('activities').doc(activityId);
      const activityDoc = await activityRef.get();

      if (!activityDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        });
      }

      const activityData = activityDoc.data();
      if (activityData.createdBy !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      await activityRef.update({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Activity published successfully'
      });

    } catch (error) {
      console.error('Error publishing activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to publish activity'
      });
    }
  }
}

module.exports = BaseActivityController;

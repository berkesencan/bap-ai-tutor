const Study = require('../models/study.model');
const { handleError } = require('../middleware/error.middleware');

class StudyController {
  /**
   * Create a new study session
   * @route POST /api/study
   */
  static async createSession(req, res) {
    try {
      const studyData = {
        ...req.body,
        userId: req.user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const session = await Study.create(studyData, req.user.uid);
      res.status(201).json(session);
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Get all study sessions for current user
   * @route GET /api/study
   */
  static async getSessions(req, res) {
    try {
      const sessions = await Study.getByUserId(req.user.uid);
      res.json(sessions);
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Get a study session by ID
   * @route GET /api/study/:id
   */
  static async getSession(req, res) {
    try {
      const session = await Study.getById(req.params.id);
      if (!session) {
        return res.status(404).json({ message: 'Study session not found' });
      }

      // Check if the session belongs to the current user
      if (session.userId !== req.user.uid) {
        return res.status(403).json({ message: 'Not authorized to access this study session' });
      }

      res.json(session);
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Update a study session
   * @route PUT /api/study/:id
   */
  static async updateSession(req, res) {
    try {
      const session = await Study.getById(req.params.id);
      if (!session) {
        return res.status(404).json({ message: 'Study session not found' });
      }

      // Check if the session belongs to the current user
      if (session.userId !== req.user.uid) {
        return res.status(403).json({ message: 'Not authorized to update this study session' });
      }

      const updateData = {
        ...req.body,
        updatedAt: new Date()
      };

      const updatedSession = await Study.update(req.params.id, updateData);
      res.json(updatedSession);
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Delete a study session
   * @route DELETE /api/study/:id
   */
  static async deleteSession(req, res) {
    try {
      const session = await Study.getById(req.params.id);
      if (!session) {
        return res.status(404).json({ message: 'Study session not found' });
      }

      // Check if the session belongs to the current user
      if (session.userId !== req.user.uid) {
        return res.status(403).json({ message: 'Not authorized to delete this study session' });
      }

      await Study.delete(req.params.id);
      res.json({ message: 'Study session deleted successfully' });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Get study statistics for current user
   * @route GET /api/study/stats
   */
  static async getStats(req, res) {
    try {
      const stats = await Study.getStats(req.user.uid);
      res.json(stats);
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Get study sessions for a specific course
   * @route GET /api/study/course/:courseId
   */
  static async getCourseSessions(req, res) {
    try {
      const sessions = await Study.getByCourseId(req.params.courseId);
      res.json(sessions);
    } catch (error) {
      handleError(error, res);
    }
  }
}

module.exports = StudyController; 
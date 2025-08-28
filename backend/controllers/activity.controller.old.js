const { db } = require('../config/firebase');
const { generateAIContent } = require('../services/gemini.service');
const admin = require('firebase-admin');

// Main Activity Controller - Orchestrates specialized controllers
const BaseActivityController = require('./activities/base.controller');
const SessionController = require('./activities/session.controller');
const NeuralConquestController = require('./activities/neural-conquest.controller');
const PublicActivitiesController = require('./activities/public-activities.controller');
const ActivityAnalyticsController = require('./activities/analytics.controller');
const AIGenerationController = require('./activities/ai-generation.controller');

class ActivityController {
  constructor() {
    // Initialize specialized controllers
    this.baseController = new BaseActivityController();
    this.sessionController = new SessionController();
    this.neuralConquestController = new NeuralConquestController();
    this.publicActivitiesController = new PublicActivitiesController();
    this.analyticsController = new ActivityAnalyticsController();
    this.aiGenerationController = new AIGenerationController();
  }

  // Base Activity Operations
  async createActivity(req, res) {
    return this.baseController.createActivity(req, res);
  }

  async getActivity(req, res) {
    return this.baseController.getActivity(req, res);
  }

  async updateActivity(req, res) {
    return this.baseController.updateActivity(req, res);
  }

  async deleteActivity(req, res) {
    return this.baseController.deleteActivity(req, res);
  }

  async publishActivity(req, res) {
    return this.baseController.publishActivity(req, res);
  }

  // Session Management
  async startSession(req, res) {
    return this.sessionController.startSession(req, res);
  }

  async joinActivity(req, res) {
    return this.sessionController.joinActivity(req, res);
  }

  async submitActivityResponse(req, res) {
    return this.sessionController.submitActivityResponse(req, res);
  }

  async getLeaderboard(req, res) {
    return this.sessionController.getLeaderboard(req, res);
  }

  // Neural Conquest Game
  async getNeuralConquestSession(req, res) {
    return this.neuralConquestController.getNeuralConquestSession(req, res);
  }

  async getNeuralConquestContent(req, res) {
    return this.neuralConquestController.getNeuralConquestContent(req, res);
  }

  async saveNeuralConquestGame(req, res) {
    return this.neuralConquestController.saveNeuralConquestGame(req, res);
  }

  // Public Activities & Discovery
  async getMyActivities(req, res) {
    return this.publicActivitiesController.getMyActivities(req, res);
  }

  async getPublicActivities(req, res) {
    return this.publicActivitiesController.getPublicActivities(req, res);
  }

  // Analytics & Reporting
  async getActivityAnalytics(req, res) {
    return this.analyticsController.getActivityAnalytics(req, res);
  }

  // AI Generation
  async generateAIActivity(req, res) {
    return this.aiGenerationController.generateAIActivity(req, res);
  }

  // Helper methods that might be used across controllers
  generateSessionConfig(gameMode, courseData, settings) {
    return this.sessionController.generateSessionConfig(gameMode, courseData, settings);
  }

  generateNeuralConquestQuestions(concepts) {
    return this.neuralConquestController.generateNeuralConquestQuestions(concepts);
  }
}

module.exports = ActivityController; 
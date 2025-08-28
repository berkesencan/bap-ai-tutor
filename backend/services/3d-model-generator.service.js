const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * OpenAI Shap-E 3D Model Generator Service
 * Uses OpenAI Shap-E model via diffusers library for fast, efficient text-to-3D generation
 * No fallbacks - only real AI-powered 3D generation
 */
class ShapE3DModelGenerator {
  constructor() {
    this.pythonServicePath = path.join(__dirname, 'shap-e.service.py');
    this.uploadsDir = path.join(__dirname, '../uploads/3d-models');
    
    console.log('🎯 OpenAI Shap-E Generator initialized - FAST AI GENERATION MODE');
    this.ensureUploadsDir();
  }

  async ensureUploadsDir() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('❌ Error creating uploads directory:', error);
      throw new Error(`Failed to create uploads directory: ${error.message}`);
  }
  }

  /**
   * Generate multiple 3D models in parallel using OpenAI Shap-E
   * @param {Array<Object>} objectsData - Array of objects to generate
   * @returns {Promise<Array<Object>>} - Array of model results
   */
  async generateMultiple3DModels(objectsData) {
    console.log(`🚀 Starting parallel Shap-E generation for ${objectsData.length} objects`);
    
    if (!Array.isArray(objectsData) || objectsData.length === 0) {
      throw new Error('objectsData must be a non-empty array');
    }

    try {
      // Generate all models in parallel
      const generationPromises = objectsData.map((objectData, index) => {
        console.log(`📦 Queuing parallel generation ${index + 1}/${objectsData.length}: ${objectData.name}`);
        return this.generateCustom3DModel(objectData).catch(error => ({
          success: false,
          error: error.message,
          objectName: objectData.name,
          originalError: error
        }));
      });

      // Wait for all generations to complete
      console.log(`⏳ Waiting for ${objectsData.length} parallel Shap-E generations...`);
      const results = await Promise.all(generationPromises);

      // Log results summary
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      console.log(`✅ Parallel generation complete: ${successful} successful, ${failed} failed`);

      return results;

    } catch (error) {
      console.error('❌ Parallel generation failed:', error);
      throw new Error(`Parallel 3D generation failed: ${error.message}`);
    }
  }

  /**
   * Generate 3D model using OpenAI Shap-E - Fast AI Generation
   * @param {Object} objectData - Object containing name, description, concept, etc.
   * @returns {Promise<Object>} - Model data or throws error
   */
  async generateCustom3DModel(objectData) {
    console.log(`🎨 Generating 3D model with OpenAI Shap-E: ${objectData.name}`);
      
    try {
      // Validate input
      if (!objectData || !objectData.name) {
        throw new Error('Object data with name is required');
      }

      // Check if Python service exists
      try {
        await fs.access(this.pythonServicePath);
      } catch (error) {
        throw new Error(`Python Shap-E service not found at: ${this.pythonServicePath}`);
      }

      // Prepare object data for Python service
      const enhancedObjectData = {
        name: objectData.name,
        description: objectData.description || `a detailed 3D model of ${objectData.name}`,
        concept: objectData.concept || 'general',
        difficulty: objectData.difficulty || 2,
        visualStyle: objectData.visualStyle || 'realistic',
        educationalContext: objectData.educationalContext || objectData.description
      };

      console.log(`📝 Calling OpenAI Shap-E with data:`, enhancedObjectData);

      // Call Python Shap-E service
      const result = await this.callPythonShapEService(enhancedObjectData);
      
      if (!result.success) {
        throw new Error(`Shap-E generation failed: ${result.error}`);
      }

      console.log(`✅ Shap-E successfully generated: ${result.filename}`);
      return result;

    } catch (error) {
      console.error(`❌ Shap-E generation failed for ${objectData.name}:`, error);
      
      // NO FALLBACKS - throw proper error with context
      const enhancedError = new Error(`3D Model Generation Failed: ${error.message}`);
      enhancedError.code = 'SHAP_E_GENERATION_FAILED';
      enhancedError.objectName = objectData.name;
      enhancedError.originalError = error;
      enhancedError.timestamp = new Date().toISOString();
      
      throw enhancedError;
    }
  }

  /**
   * Prefer calling persistent FastAPI Shap-E server; fallback to legacy spawn if unreachable
   */
  async callPythonShapEService(objectData) {
    const axios = require('axios');
    const apiURL = process.env.SHAPE_API_URL || 'http://127.0.0.1:8008/generate';

    try {
      const { data } = await axios.post(apiURL, objectData, { timeout: 10 * 60 * 1000 });
      if (data && data.success) return data;
      throw new Error(data?.detail || 'Unknown Shap-E API error');
    } catch (apiErr) {
      console.warn('⚠️ Shap-E API not reachable, falling back to spawn:', apiErr.message);
      // ---------- Legacy spawn fallback ----------
      return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        console.log('🐍 Spawning legacy Python Shap-E process...');
        const pythonProcess = spawn('python', [this.pythonServicePath, JSON.stringify(objectData)], { stdio: ['pipe', 'pipe', 'pipe'] });
        const timeout = setTimeout(() => {
          pythonProcess.kill('SIGTERM');
          reject(new Error('Legacy Shap-E generation timed out'));
        }, 10 * 60 * 1000);

        let output = '';
        pythonProcess.stdout.on('data', (d) => (output += d.toString()));
        pythonProcess.stderr.on('data', (d) => console.log('[Python]', d.toString()));
        pythonProcess.on('close', (code) => {
          clearTimeout(timeout);
          try {
            const parsed = JSON.parse(output);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Invalid JSON from Shap-E process'));
      }
        });
      });
    }
  }

  /**
   * Get available topics for Neural Conquest
   * Returns educational topics suitable for 3D model generation
   */
  getAvailableTopics() {
    return [
      'Ancient Civilizations',
      'Space Exploration', 
      'Ocean Life',
      'Modern Technology',
      'Renewable Energy',
      'Human Anatomy',
      'Molecular Biology',
      'Physics Concepts',
      'Mathematical Shapes',
      'Art Movements',
      'World Geography',
      'Cultural Heritage',
      'Scientific Instruments',
      'Historical Landmarks',
      'Engineering Marvels'
    ];
  }

  /**
   * Generate topic data with 3D objects - NO FALLBACKS
   * @param {string} topicName - Topic to generate content for
   * @param {number} objectCount - Number of 3D objects to generate
   * @returns {Promise<Object>} - Topic data with questions and objects
   */
  async generateTopicData(topicName, objectCount = 15) {
    console.log(`🎯 Generating topic data for: ${topicName} (${objectCount} objects)`);
    
    try {
      // This method should only be called after Gemini generates the topics
      // and the user selects which ones to generate 3D models for
      throw new Error('generateTopicData should not be called directly. Use Gemini to generate topics first, then call generate3DModelsForSelectedTopics.');

    } catch (error) {
      console.error(`❌ Topic data generation failed for ${topicName}:`, error);
      
      // NO FALLBACKS - throw proper error
      const enhancedError = new Error(`Topic Data Generation Failed: ${error.message}`);
      enhancedError.code = 'TOPIC_GENERATION_FAILED';
      enhancedError.topicName = topicName;
      enhancedError.timestamp = new Date().toISOString();
      
      throw enhancedError;
    }
  }

  /**
   * Calculate synapse reward based on difficulty and streak
   * @param {string} topic - Topic name
   * @param {number} difficulty - Question difficulty (1-5)
   * @param {number} streak - Current streak count
   * @returns {number} - Synapse reward amount
   */
  calculateSynapseReward(topic, difficulty, streak) {
    const baseReward = 50;
    const difficultyMultiplier = difficulty || 1;
    const streakBonus = Math.min(streak * 10, 100); // Max 100 bonus
    
    return Math.floor(baseReward * difficultyMultiplier + streakBonus);
    }

  /**
   * Validate topic data structure
   * @param {Object} topicData - Topic data to validate
   * @returns {Object} - Validation result
   */
  validateTopicData(topicData) {
    const errors = [];
    
    if (!topicData) {
      errors.push('Topic data is null or undefined');
    } else {
      if (!topicData.topic) errors.push('Missing topic name');
      if (!Array.isArray(topicData.questions)) errors.push('Questions must be an array');
      if (!Array.isArray(topicData.objects)) errors.push('Objects must be an array');
      
      if (topicData.questions && topicData.questions.length === 0) {
        errors.push('No questions provided');
      }
      
      if (topicData.objects && topicData.objects.length === 0) {
        errors.push('No 3D objects provided');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get system status for debugging
   * @returns {Promise<Object>} - System status
   */
  async getSystemStatus() {
    try {
      const status = {
        service: 'OpenAI Shap-E 3D Generator',
        mode: 'NO_FALLBACKS',
        timestamp: new Date().toISOString(),
        pythonService: {
          path: this.pythonServicePath,
          exists: false
        },
        uploadsDir: {
          path: this.uploadsDir,
          exists: false
        },
        availableTopics: this.getAvailableTopics().length
      };

      // Check if Python service exists
      try {
        await fs.access(this.pythonServicePath);
        status.pythonService.exists = true;
      } catch (error) {
        status.pythonService.error = 'Python service file not found';
  }

      // Check uploads directory
      try {
        await fs.access(this.uploadsDir);
        status.uploadsDir.exists = true;
      } catch (error) {
        status.uploadsDir.error = 'Uploads directory not accessible';
      }

      return status;

    } catch (error) {
      throw new Error(`Failed to get system status: ${error.message}`);
    }
  }
}

module.exports = ShapE3DModelGenerator;

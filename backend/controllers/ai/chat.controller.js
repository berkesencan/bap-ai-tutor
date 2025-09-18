const { handleError } = require('../../middleware/error.middleware');
const GeminiService = require('../../services/gemini.service');
const aiService = require('../../services/ai.service');

class ChatController {
  
  /**
   * Handle a chat message using Gemini with classroom context
   * @route POST /api/ai/chat
   */
  static async handleChatMessage(req, res) {
    try {
      const { history, message, classroomId, courseId, sessionId } = req.body;
      const userId = req.user?.uid || req.headers['x-dev-user-id'] || process.env.DEV_USER_ID || 'dev-cli';
      
      console.log('[CHAT CONTROLLER] Request details:', {
        userId,
        message: message?.substring(0, 50),
        courseId: courseId || classroomId,
        sessionId,
        hasHistory: !!history
      });
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'message is required' });
      }

      // Use enhanced AI service with classroom context
      const response = await aiService.answerQuestion({
        userId,
        question: message,
        courseId: courseId || classroomId,
        classroomId: classroomId,
        sessionId: sessionId,
        context: history ? history.map(msg => {
          const prefix = (msg.role === 'user' || msg.sender === 'user') ? 'User:' : 'AI:';
          return `${prefix} ${msg.content || msg.text || msg.parts || ''}`;
        }).join('\n') : ''
      });
      
      console.log('[CHAT CONTROLLER] AI service response type:', typeof response);
      console.log('[CHAT CONTROLLER] AI service response keys:', Object.keys(response || {}));
      
      const answerText = response?.text ?? response?.response ?? '';
      const payload = {
        success: true,
        data: {
          response: answerText,
          text: answerText,
          sources: Array.isArray(response?.sources) ? response.sources : [],
          materials: Array.isArray(response?.materials) ? response.materials : [],
          usageMetadata: response?.usageMetadata || response?.usage || {},
          confidence: response?.confidence || 'unknown',
        },
      };
      
      if (process.env.LOG_RAG_DEBUG === 'true') {
        const raw = JSON.stringify(payload);
        console.log('[CHAT][BYTES]', Buffer.byteLength(raw));
        console.log('[CHAT][PREVIEW]', raw.slice(0, 200) + (raw.length > 200 ? '…' : ''));
      }
      
      const pdfSources = payload.data.sources.filter(s => s.kind === 'gradescope-pdf').length;
      console.log(`[CHAT] course=${courseId} hasText=${!!answerText} sources=${payload.data.sources.length} pdfSources=${pdfSources} bytes=${Buffer.byteLength(JSON.stringify(payload))}`);
      res.json(payload);
      
    } catch (error) {
      console.error('[CHAT CONTROLLER] Error:', error);
      console.error('[CHAT CONTROLLER] Error stack:', error.stack);
      res.status(500).json({ 
        success: false, 
        error: 'AI_CHAT_FAILED', 
        message: error.message || 'Unknown error'
      });
    }
  }

  /**
   * Get available classrooms for AI context
   * @route GET /api/ai/classrooms
   */
  static async getAvailableClassrooms(req, res) {
    try {
      const { resolveEffectiveUser } = require('../../utils/effectiveUser');
      const { effectiveReadUserId } = resolveEffectiveUser(req);
      if (!effectiveReadUserId) {
        return res.status(401).json({ success: false, error: 'No token provided', code: 'NO_TOKEN' });
      }
      
      // Use the new unified visible courses service
      const { getUserVisibleCourses } = require('../../services/courses.visible.service');
      const courses = await getUserVisibleCourses(effectiveReadUserId);
      
      res.json({ 
        success: true, 
        data: { courses }
      });
    } catch (error) {
      console.error('[AI Chat] Error in getAvailableClassrooms:', error);
      handleError(error, res);
    }
  }

  /**
   * Get integrated materials for a classroom or course
   * @route GET /api/ai/materials/:contextId
   */
  static async getIntegratedMaterials(req, res) {
    try {
      const { resolveEffectiveUser } = require('../../utils/effectiveUser');
      const { effectiveReadUserId } = resolveEffectiveUser(req);
      if (!effectiveReadUserId) {
        return res.status(401).json({ success: false, error: 'No token provided', code: 'NO_TOKEN' });
      }
      
      const { contextId } = req.params;
      const { type = 'classroom' } = req.query; // 'classroom' or 'course'
      
      console.log(`[AI Chat] Getting materials for context: ${contextId}, type: ${type}, user: ${effectiveReadUserId}`);
      console.log(`[AI Chat] req.params:`, req.params);
      console.log(`[AI Chat] req.url:`, req.url);
      
      // For course context, get assignments from authoritative source
      if (type === 'course') {
        const Assignment = require('../../models/assignment.model');
        const Course = require('../../models/course.model');
        
        // Get course info
        const course = await Course.getById(contextId);
        if (!course) {
          return res.status(404).json({ success: false, error: 'Course not found' });
        }
        
        // Get assignments from assignments collection (authoritative source)
        const assignments = await Assignment.getByCourseId(contextId);
        console.log(`[AI Chat] Found ${assignments.length} assignments for course ${course.name}`);
        
        // Add necessary metadata for PDF fetching
        const assignmentsWithMetadata = assignments.map(assignment => ({
          ...assignment,
          platform: 'gradescope',
          raw: {
            platform: 'gradescope',
            sourcePlatform: 'gradescope',
            courseId: course.externalId || contextId,
            assignmentId: assignment.externalId || assignment.id,
            gsCourseId: course.externalId || contextId,
            gsAssignmentId: assignment.externalId || assignment.id
          }
        }));
        
        return res.json({
          success: true,
          data: {
            materials: [], // No separate materials collection for now
            assignments: assignmentsWithMetadata,
            announcements: []
          }
        });
      }
      
      // For classroom context, use existing logic
      const materials = await aiService.getIntegratedMaterials(effectiveReadUserId, contextId, type);
      
      res.json({ 
        success: true, 
        data: materials
      });
    } catch (error) {
      console.error('[AI Chat] Error in getIntegratedMaterials:', error);
      handleError(error, res);
    }
  }

  /**
   * Test Gemini 1.5 Flash API - Now returns usage metadata
   * @route POST /api/ai/test-gemini
   */
  static async testGemini(req, res) {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required field: prompt' 
        });
      }

      console.log("Test Gemini API called with prompt:", prompt);
      const { text, usageMetadata } = await GeminiService.testGeminiFlash(prompt); 
      console.log("Response received from Gemini:", text.substring(0, 100) + "...");
      
      res.json({ 
        success: true, 
        data: { 
          response: text,
          model: 'gemini-1.5-flash',
          usageMetadata: usageMetadata
        } 
      });
    } catch (error) {
      console.error('Test Gemini Error:', error);
      handleError(error, res);
    }
  }
}

module.exports = ChatController;

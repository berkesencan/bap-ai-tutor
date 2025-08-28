const { handleError } = require('../../middleware/error.middleware');
const GeminiService = require('../../services/gemini.service');
const admin = require('firebase-admin');
const db = admin.firestore();

class ContentGenerationController {
  
  /**
   * Generate a personalized study plan using Gemini
   * @route POST /api/ai/study-plan
   */
  static async generateStudyPlan(req, res) {
    try {
      const { topic, durationDays, hoursPerDay, subtopics, goal } = req.body;
      
      if (!topic || !durationDays || !hoursPerDay) {
        return res.status(400).json({ success: false, message: 'Missing required fields: topic, durationDays, hoursPerDay' });
      }

      const studyPlanText = await GeminiService.generateStudyPlan({
        topic,
        durationDays,
        hoursPerDay,
        subtopics: subtopics || [],
        goal: goal || 'learn the material effectively'
      });
      
      res.json({ success: true, data: { studyPlan: studyPlanText } });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Explain a concept using Gemini
   * @route POST /api/ai/explain
   */
  static async explainConcept(req, res) {
    try {
      const { concept, context } = req.body;
      if (!concept) {
        return res.status(400).json({ success: false, message: 'Missing required field: concept' });
      }

      const explanationText = await GeminiService.explainConcept(concept, context);
      
      res.json({ success: true, data: { explanation: explanationText } });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Generate practice questions using Gemini
   * @route POST /api/ai/practice-questions
   */
  static async generatePracticeQuestions(req, res) {
    try {
      const { topic, count, difficulty } = req.body;
      if (!topic) {
        return res.status(400).json({ success: false, message: 'Missing required field: topic' });
      }

      const questionsText = await GeminiService.generatePracticeQuestions(
        topic, 
        count ? parseInt(count) : 5,
        difficulty || 'medium'
      );
      
      res.json({ success: true, data: { questions: questionsText } });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Generate activity content based on type and materials
   * @route POST /api/ai/generate-activity-content
   */
  static async generateActivityContent(req, res) {
    try {
      const { activityType, materials, difficulty, settings } = req.body;
      
      if (!activityType || !materials || materials.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Activity type and materials are required'
        });
      }

      let content;
      
      switch (activityType) {
        case 'quiz-battle':
          content = await this.generateQuizContent(materials, difficulty, settings?.questionCount || 10);
          break;
        case 'concept-race':
          content = await this.generateConceptRaceContent(materials, difficulty);
          break;
        case 'problem-solver':
          content = await this.generateProblemSolvingContent(materials, difficulty);
          break;
        case 'mystery-case':
          content = await this.generateCaseStudyContent(materials, difficulty);
          break;
        case 'debate-arena':
          content = await this.generateDebateContent(materials, difficulty);
          break;
        case 'simulation-lab':
          content = await this.generateSimulationContent(materials, difficulty);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported activity type'
          });
      }

      res.json({
        success: true,
        data: {
          activityType,
          content,
          difficulty,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error generating activity content:', error);
      handleError(error, res);
    }
  }

  /**
   * Generate practice exam from materials
   * @route POST /api/ai/generate-practice-exam
   */
  static async generatePracticeExam(req, res) {
    try {
      const { subject, materials, questionCount = 20, difficulty = 'medium', examType = 'multiple-choice' } = req.body;
      const userId = req.user.uid;

      if (!subject) {
        return res.status(400).json({
          success: false,
          message: 'Subject is required'
        });
      }

      // Create materials context from uploaded materials
      let materialsContext = '';
      if (materials && materials.length > 0) {
        materialsContext = materials.map(material => 
          `Material: ${material.name}\nContent: ${material.content || 'PDF content'}`
        ).join('\n\n');
      }

      const prompt = `Generate a comprehensive practice exam for ${subject}.

${materialsContext ? `Based on these materials:\n${materialsContext}\n\n` : ''}

Requirements:
- ${questionCount} questions total
- Difficulty level: ${difficulty}
- Question type: ${examType}
- Include a mix of question types if possible
- Provide detailed explanations for each answer
- Cover key concepts comprehensively
- Include point values for each question

Format the response as a structured exam with:
1. Exam title and instructions
2. Questions with multiple choice options (A, B, C, D)
3. Correct answers
4. Detailed explanations
5. Point distribution
6. Estimated time to complete

Make this exam challenging but fair, suitable for testing deep understanding of the material.`;

      const examContent = await GeminiService.generateAIContent(prompt);

      // Parse and structure the exam content
      const structuredExam = this.parseExamContent(examContent, questionCount);

      // Save exam to database
      const examRef = await db.collection('practice_exams').add({
        subject,
        content: structuredExam,
        rawContent: examContent,
        questionCount,
        difficulty,
        examType,
        createdBy: userId,
        createdAt: new Date(),
        materials: materials || []
      });

      res.json({
        success: true,
        data: {
          examId: examRef.id,
          exam: structuredExam,
          rawContent: examContent
        }
      });

    } catch (error) {
      console.error('Error generating practice exam:', error);
      handleError(error, res);
    }
  }

  // Helper methods for content generation
  static async generateQuizContent(materials, difficulty, questionCount) {
    const materialsText = materials.map(m => `${m.name}: ${m.content || 'Content not available'}`).join('\n\n');
    
    const prompt = `Create ${questionCount} multiple choice questions based on these materials:
    
${materialsText}

Difficulty: ${difficulty}
Format: Each question should have 4 options (A, B, C, D) with clear explanations.`;

    return await GeminiService.generateAIContent(prompt);
  }

  static async generateConceptRaceContent(materials, difficulty) {
    const materialsText = materials.map(m => `${m.name}: ${m.content || 'Content not available'}`).join('\n\n');
    
    const prompt = `Create a fast-paced concept identification game based on these materials:
    
${materialsText}

Difficulty: ${difficulty}
Include rapid-fire questions, concept definitions, and key term identification.`;

    return await GeminiService.generateAIContent(prompt);
  }

  static async generateProblemSolvingContent(materials, difficulty) {
    const materialsText = materials.map(m => `${m.name}: ${m.content || 'Content not available'}`).join('\n\n');
    
    const prompt = `Create collaborative problem-solving scenarios based on these materials:
    
${materialsText}

Difficulty: ${difficulty}
Include step-by-step problems that require teamwork and AI guidance.`;

    return await GeminiService.generateAIContent(prompt);
  }

  static async generateCaseStudyContent(materials, difficulty) {
    const materialsText = materials.map(m => `${m.name}: ${m.content || 'Content not available'}`).join('\n\n');
    
    const prompt = `Create an interactive case study with branching paths based on these materials:
    
${materialsText}

Difficulty: ${difficulty}
Include decision points, consequences, and multiple possible outcomes.`;

    return await GeminiService.generateAIContent(prompt);
  }

  static async generateDebateContent(materials, difficulty) {
    const materialsText = materials.map(m => `${m.name}: ${m.content || 'Content not available'}`).join('\n\n');
    
    const prompt = `Create a structured debate scenario with AI moderation based on these materials:
    
${materialsText}

Difficulty: ${difficulty}
Include debate topics, argument frameworks, and evaluation criteria.`;

    return await GeminiService.generateAIContent(prompt);
  }

  static async generateSimulationContent(materials, difficulty) {
    const materialsText = materials.map(m => `${m.name}: ${m.content || 'Content not available'}`).join('\n\n');
    
    const prompt = `Create an interactive simulation or experiment based on these materials:
    
${materialsText}

Difficulty: ${difficulty}
Include variables to manipulate, expected outcomes, and learning objectives.`;

    return await GeminiService.generateAIContent(prompt);
  }

  static parseExamContent(examContent, questionCount) {
    // Simple parsing logic - in production, this would be more sophisticated
    const lines = examContent.split('\n');
    const questions = [];
    let currentQuestion = null;
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          question: line,
          options: [],
          answer: '',
          explanation: '',
          points: this.calculateQuestionPoints(questions.length + 1, questionCount)
        };
      } else if (line.match(/^[A-D]\)/)) {
        if (currentQuestion) {
          currentQuestion.options.push(line);
        }
      } else if (line.toLowerCase().includes('answer:')) {
        if (currentQuestion) {
          currentQuestion.answer = line;
        }
      } else if (line.toLowerCase().includes('explanation:')) {
        if (currentQuestion) {
          currentQuestion.explanation = line;
        }
      }
    }
    
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
    
    return {
      title: `Practice Exam - ${questionCount} Questions`,
      instructions: 'Answer all questions to the best of your ability. Each question has one correct answer.',
      questions,
      totalPoints: 100,
      estimatedTime: questionCount * 2 // 2 minutes per question
    };
  }

  static calculateQuestionPoints(questionNumber, totalQuestions) {
    const basePoints = Math.floor(100 / totalQuestions);
    const remainder = 100 % totalQuestions;
    
    // Distribute remainder points to the first few questions
    return questionNumber <= remainder ? basePoints + 1 : basePoints;
  }
}

module.exports = ContentGenerationController;

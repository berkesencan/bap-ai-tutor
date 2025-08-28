const { generateAIContent } = require('../../services/gemini.service');
const { db } = require('../../config/firebase');

class AIGenerationController {
  
  async generateAIActivity(req, res) {
    try {
      const { 
        description, 
        courseId, 
        gameMode = 'synthesis-arena', 
        difficulty = 'intermediate',
        duration = 25,
        learningObjectives = [],
        materials = []
      } = req.body;

      if (!description || description.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a detailed description (at least 10 characters)'
        });
      }

      // Get course context if provided
      let courseContext = null;
      if (courseId && courseId !== 'general') {
        const Course = require('../../models/course.model');
        courseContext = await Course.getById(courseId);
        
        if (!courseContext || !courseContext.members.includes(req.user.uid)) {
          return res.status(403).json({
            success: false,
            message: 'You are not enrolled in this course'
          });
        }
      }

      // Create AI prompt
      const prompt = this.createAIActivityPrompt(description, gameMode, difficulty, duration, learningObjectives);
      
      // Generate activity with AI
      const aiResponse = await generateAIContent(prompt);
      let generatedActivity;
      
      try {
        generatedActivity = JSON.parse(aiResponse);
      } catch (parseError) {
        generatedActivity = {
          title: `AI-Generated ${gameMode.replace('-', ' ')} Activity`,
          description: description,
          content: aiResponse,
          questions: this.generateFallbackQuestions(description, difficulty),
          challenges: this.generateFallbackChallenges(gameMode, difficulty)
        };
      }

      // Create activity in database
      const activityData = {
        title: generatedActivity.title,
        description: generatedActivity.description,
        type: 'ai-generated',
        gameMode,
        difficulty,
        duration,
        courseId: courseId || 'general',
        courseName: courseContext?.name || 'General Knowledge',
        materials: materials || [],
        content: generatedActivity,
        settings: {
          anonymousMode: true,
          allowAsyncPlay: true,
          difficultyAdaptation: true,
          detailedAnalytics: true,
          aiGenerated: true
        },
        privacy: {
          shareWithInstitution: false,
          allowPublicDiscovery: false,
          dataRetentionDays: 365
        },
        createdBy: req.user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'published',
        tags: ['ai-generated', gameMode, difficulty],
        aiMetadata: {
          prompt: description,
          generatedAt: new Date().toISOString(),
          model: 'gemini-pro',
          enhancementLevel: 'advanced'
        }
      };

      const activityRef = await db.collection('activities').add(activityData);

      res.status(201).json({
        success: true,
        message: 'AI activity generated successfully!',
        data: {
          id: activityRef.id,
          ...activityData,
          preview: {
            estimatedTime: duration,
            questionCount: generatedActivity.questions?.length || 10,
            challengeCount: generatedActivity.challenges?.length || 5,
            difficultyLevel: difficulty,
            gameMode: gameMode
          }
        }
      });

    } catch (error) {
      console.error('Error generating AI activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate AI activity. Please try again.'
      });
    }
  }

  createAIActivityPrompt(description, gameMode, difficulty, duration, learningObjectives) {
    const gameModeDescriptions = {
      'neural-conquest': 'a strategic territory conquest game where knowledge is power',
      'mystery-syndicate': 'a collaborative investigation where teams solve complex mysteries',
      'synthesis-arena': 'a fast-paced battle where players synthesize concepts rapidly'
    };

    const difficultyGuidelines = {
      'beginner': 'accessible to newcomers, clear explanations, basic concepts',
      'intermediate': 'moderate complexity, some prior knowledge assumed',
      'advanced': 'challenging content, deep understanding required',
      'expert': 'highly complex, expert-level knowledge and critical thinking'
    };

    return `Create an engaging educational activity for ${gameModeDescriptions[gameMode]}.

ACTIVITY DESCRIPTION: ${description}

REQUIREMENTS:
- Game Mode: ${gameMode}
- Difficulty: ${difficulty} (${difficultyGuidelines[difficulty]})
- Duration: ${duration} minutes
- Learning Objectives: ${learningObjectives.join(', ') || 'To be determined based on content'}

GENERATE A JSON RESPONSE WITH:
{
  "title": "Engaging activity title",
  "description": "Detailed description that excites learners",
  "learningObjectives": ["objective1", "objective2", "objective3"],
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Why this answer is correct",
      "difficulty": "${difficulty}",
      "concept": "Related concept"
    }
  ],
  "challenges": [
    {
      "id": "challenge1",
      "title": "Challenge title",
      "description": "What players need to do",
      "type": "${gameMode}",
      "points": 100,
      "timeLimit": 60
    }
  ]
}

Make it genuinely fun and addictive while being educational.`;
  }

  generateFallbackQuestions(description, difficulty) {
    const questionCount = { beginner: 5, intermediate: 8, advanced: 12, expert: 15 };
    const questions = [];
    
    for (let i = 0; i < (questionCount[difficulty] || 8); i++) {
      questions.push({
        question: `Question ${i + 1} about ${description}`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct: Math.floor(Math.random() * 4),
        explanation: "This is the correct answer based on the concept.",
        difficulty,
        concept: "General Knowledge"
      });
    }
    
    return questions;
  }

  generateFallbackChallenges(gameMode, difficulty) {
    const challengeTemplates = {
      'neural-conquest': [
        { title: "Territory Battle", description: "Conquer a new territory", type: "conquest" },
        { title: "Empire Defense", description: "Defend your territories", type: "defense" }
      ],
      'mystery-syndicate': [
        { title: "Clue Hunter", description: "Find hidden clues", type: "investigation" },
        { title: "Case Solver", description: "Solve the mystery", type: "deduction" }
      ],
      'synthesis-arena': [
        { title: "Concept Fusion", description: "Combine concepts creatively", type: "synthesis" },
        { title: "Speed Round", description: "Quick-fire synthesis challenge", type: "speed" }
      ]
    };

    const templates = challengeTemplates[gameMode] || challengeTemplates['synthesis-arena'];
    return templates.map((template, index) => ({
      id: `challenge_${index + 1}`,
      ...template,
      points: 100 * (index + 1),
      timeLimit: 60 + (index * 30)
    }));
  }
}

module.exports = AIGenerationController;

// Main AI Controller - Orchestrates specialized AI controllers
const ChatController = require('./ai/chat.controller');
const ContentGenerationController = require('./ai/content-generation.controller');
const AnalysisController = require('./ai/analysis.controller');
const geminiService = require('../services/gemini.service');

class AIController {
  
  // Chat and Conversation Management
  static async handleChatMessage(req, res) {
    return ChatController.handleChatMessage(req, res);
  }

  static async getAvailableClassrooms(req, res) {
    return ChatController.getAvailableClassrooms(req, res);
  }

  static async getIntegratedMaterials(req, res) {
    return ChatController.getIntegratedMaterials(req, res);
  }

  static async testGemini(req, res) {
    return ChatController.testGemini(req, res);
  }

  // Content Generation
  static async generateStudyPlan(req, res) {
    return ContentGenerationController.generateStudyPlan(req, res);
  }

  static async explainConcept(req, res) {
    return ContentGenerationController.explainConcept(req, res);
  }

  static async generatePracticeQuestions(req, res) {
    return ContentGenerationController.generatePracticeQuestions(req, res);
  }

  static async generateActivityContent(req, res) {
    return ContentGenerationController.generateActivityContent(req, res);
  }

  static async generatePracticeExam(req, res) {
    return ContentGenerationController.generatePracticeExam(req, res);
  }

  // Document Analysis
  static async testFormParsing(req, res) {
    return AnalysisController.testFormParsing(req, res);
  }

  static async downloadPDF(req, res) {
    return AnalysisController.downloadPDF(req, res);
  }

  static async analyzeDocument(req, res) {
    return AnalysisController.analyzeDocument(req, res);
  }

  static async batchAnalyzeDocuments(req, res) {
    return AnalysisController.batchAnalyzeDocuments(req, res);
  }

  // Legacy Activity Methods (for backward compatibility)
  static async createActivity(req, res) {
    // Redirect to new activity controller
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.createActivity(req, res);
  }

  static async getActivities(req, res) {
    // Redirect to new activity controller
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.getMyActivities(req, res);
  }

  static async getActivity(req, res) {
    // Redirect to new activity controller
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.getActivity(req, res);
  }

  static async updateActivity(req, res) {
    // Redirect to new activity controller
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.updateActivity(req, res);
  }

  static async startActivity(req, res) {
    // Redirect to new activity controller
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.startSession(req, res);
  }

  static async joinActivity(req, res) {
    // Redirect to new activity controller
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.joinActivity(req, res);
  }

  // Generate Neural Conquest topics WITHOUT 3D models (for topic selection phase)
  static async generateNeuralConquestTopics(req, res) {
    try {
      const { topicDescription, difficulty = 'medium', subjectArea } = req.body;

      if (!topicDescription || topicDescription.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Topic description is required'
        });
      }

      console.log(`🎯 Generating Neural Conquest topics for: ${topicDescription}`);

      // Fix: Pass topicDescription (not subjectArea) to determineOptimalTopicCount
      // Determine optimal topic count based on the actual description content
      const optimalCount = AIController.determineOptimalTopicCount(topicDescription, 7); // Default 7 as fallback
      console.log(`📊 Optimal topic count determined: ${optimalCount} for "${topicDescription}" (${difficulty})`);

      // Generate comprehensive prompt for topics and questions
      const prompt = `You are an expert educational content creator AND 3D modeling specialist. Generate exactly ${optimalCount} educational topics for Neural Conquest game based on: "${topicDescription}"

🎯 NEURAL CONQUEST CONTEXT:
- This is a turn-based strategy game where players conquer "neural nodes" (3D objects) by answering questions
- Each topic becomes a 3D object that players can interact with in a brain-themed neural network
- Objects will be generated using OpenAI Shap-E (text-to-3D AI model)
- Topics should represent learnable concepts that can be visualized as distinct 3D objects

📐 SHAP-E 3D MODELING REQUIREMENTS:
Shap-E works best with VERY DETAILED, SPECIFIC descriptions that include:
- Clear geometric shapes and proportions
- Spatial relationships between parts
- Visual characteristics (colors, textures, materials)
- Scale references (size comparisons)
- Structural details and components
- Context and setting

⚠️ AVOID: Vague terms like "detailed model" or "representation"
✅ USE: Specific shapes, clear proportions, visual details, structural elements

REQUIREMENTS:
- Create exactly ${optimalCount} distinct educational topics/objects
- Each topic should have clear educational value suitable for ${subjectArea || 'general education'}
- Include difficulty progression from basic (1-2) to advanced (4-5)
- Make topics engaging for interactive 3D neural network conquest
- Each description MUST be optimized for Shap-E 3D generation

FORMAT YOUR RESPONSE EXACTLY AS:

TOPICS:
[Topic 1]
Name: [Clear, memorable topic name]
Description: [CRITICAL: Write a detailed Shap-E prompt that describes the exact 3D object to generate. Include specific shapes, proportions, visual elements, colors, and structural details. Be as descriptive as possible for 3D modeling. Example: "a detailed miniature volcano model with a cone-shaped mountain featuring a circular crater at the top, visible lava flows cascading down the steep slopes, rocky textured surfaces with dark gray and brown colors, small trees dotting the base, and wispy smoke rising from the crater opening"]
Concept: [Subject area - geography, history, science, technology, mathematics, art, biology, economics, literature, physics, chemistry]
Difficulty: [1-5, with 1-2 being introductory, 3-4 intermediate, 5 advanced]
Cost: [400-1200 synapse based on difficulty: 400-500 for diff 1-2, 600-800 for diff 3-4, 900-1200 for diff 5]
Educational Value: [Specific learning outcomes - what students will understand after engaging with this topic]

[Topic 2]
Name: [Clear, memorable topic name]
Description: [CRITICAL: Another detailed Shap-E prompt with specific 3D modeling instructions. Include exact shapes, measurements, colors, textures, and structural components. Make it visually distinct from other topics.]
Concept: [Subject area]
Difficulty: [1-5]
Cost: [400-1200 based on difficulty]
Educational Value: [Specific learning outcomes]

[Continue for all ${optimalCount} topics - ensure each Description is a detailed Shap-E 3D modeling prompt...]

QUESTIONS:
Generate 15 multiple-choice questions covering these topics:

[Question 1]
Q: [Educational question related to the first few topics]
A) [Option A]
B) [Option B]
C) [Option C] 
D) [Option D]
Correct: [A/B/C/D]
Difficulty: [1-5]
Topic: [Related topic name]

[Continue for 15 questions total, covering all topics...]

🎯 REMEMBER: The Description field is the most critical part - it becomes the Shap-E prompt that generates the 3D model. Make each one detailed, specific, and visually descriptive for optimal 3D generation results.`;

      // Call Gemini AI with retry logic and improved error handling
      console.log('🤖 Calling Gemini AI for topic generation...');
      const aiResponse = await geminiService.generateContent(prompt, 5); // 5 retries for critical functionality
      
      // DEBUG: Log the actual response
      console.log('🔍 Gemini response type:', typeof aiResponse);
      console.log('🔍 Gemini response length:', aiResponse?.length);
      console.log('🔍 Gemini response preview:', aiResponse?.substring(0, 200));
      
      if (!aiResponse || typeof aiResponse !== 'string' || aiResponse.trim().length === 0) {
        throw new Error('Empty or invalid response from Gemini AI');
      }
      
      console.log(`📝 Generated ${aiResponse.length} characters of content for Neural Conquest`);

      // Parse the AI response into structured data
      const parsedData = AIController.parseNeuralConquestResponse(aiResponse);
      
      // If parsing failed, create fallback topics based on the description
      if (!parsedData.topics || parsedData.topics.length === 0) {
        console.warn('⚠️ AI parsing failed, creating enhanced fallback topics');
        const fallbackData = AIController.createEnhancedFallbackTopics(topicDescription, optimalCount);
        
        return res.json({
          success: true,
          data: {
            topics: fallbackData.topics,
            questions: fallbackData.questions,
            totalTopics: fallbackData.topics.length,
            optimalCount: optimalCount,
            subjectArea: subjectArea || AIController.inferMainSubject(topicDescription),
            difficulty: difficulty,
            generated3DModels: false,
            needsModelGeneration: true,
            isFallback: true,
            generatedAt: new Date().toISOString()
          }
        });
      }
      
      // IMPORTANT: DO NOT generate 3D models here - just return topic data for selection
      console.log(`✅ Generated ${parsedData.topics.length} topics and ${parsedData.questions.length} questions for selection`);

      return res.json({
        success: true,
        data: {
          topics: parsedData.topics,
          questions: parsedData.questions,
          totalTopics: parsedData.topics.length,
          optimalCount: optimalCount,
          subjectArea: subjectArea || AIController.inferMainSubject(topicDescription),
          difficulty: difficulty,
          generated3DModels: false, // Key flag - no 3D models yet
          needsModelGeneration: true, // Flag for frontend
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error generating Neural Conquest topics:', error);
      // Always fall back to enhanced topics to avoid blocking UX
      const fallbackCount = AIController.determineOptimalTopicCount(topicDescription, 7);
      const fallbackData = AIController.createEnhancedFallbackTopics(topicDescription, fallbackCount);
      return res.json({
        success: true,
        data: {
          topics: fallbackData.topics,
          questions: fallbackData.questions,
          totalTopics: fallbackData.topics.length,
          optimalCount: fallbackCount,
          subjectArea: subjectArea || AIController.inferMainSubject(topicDescription),
          difficulty: difficulty,
          generated3DModels: false,
          needsModelGeneration: true,
          isFallback: true,
          fallbackReason: error.message || 'AI generation failed; using fallback',
          generatedAt: new Date().toISOString()
        }
      });
    }
  }

  // NEW: Generate 3D models for selected topics (called after user selection)
  static async generate3DModelsForSelectedTopics(req, res) {
    try {
      const { selectedTopics, sessionData } = req.body;

      if (!selectedTopics || !Array.isArray(selectedTopics) || selectedTopics.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected topics array is required'
        });
      }

      console.log(`🎯 Generating 3D models for ${selectedTopics.length} selected topics...`);

      // Initialize 3D model generator
      const ThreeDModelGenerator = require('../services/3d-model-generator.service.js');
      const modelGenerator = new ThreeDModelGenerator();

      // Generate unique session ID for progress tracking
      const sessionId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Prepare all object data for parallel generation
      const objectsData = selectedTopics.map((topic, i) => ({
            name: topic.name,
            description: topic.description,
            concept: topic.concept,
            difficulty: topic.difficulty,
            visualStyle: AIController.determineVisualStyle(topic.concept, topic.difficulty),
        educationalContext: topic.educationalValue || topic.description,
        sessionId: sessionId,
        currentIndex: i + 1,
        totalModels: selectedTopics.length,
        topicIndex: i // For position calculation
      }));

      console.log(`🚀 Starting parallel Shap-E generation for ${objectsData.length} objects...`);

      // Emit initial progress via WebSocket
      if (global.io) {
        global.io.emit('generation-progress', {
          sessionId: sessionId,
          current: 0,
          total: selectedTopics.length,
          stage: 'starting_parallel',
          message: `Starting parallel generation of ${selectedTopics.length} 3D models...`
        });
      }

      // Generate ALL models in parallel using Shap-E
      const modelResults = await modelGenerator.generateMultiple3DModels(objectsData);

      // Process results and create enhanced topics
      const topicsWithModels = [];
      const generationErrors = [];

      for (let i = 0; i < selectedTopics.length; i++) {
        const topic = selectedTopics[i];
        const modelResult = modelResults[i];

        if (modelResult.success) {
          // Successful generation
          const enhancedTopic = {
            ...topic,
            id: `topic_${i}`,
            
            // Real 3D model data from Shap-E
            modelUrl: modelResult.modelUrl,
            
            // Enhanced metadata for Shap-E
            metadata: {
              hasCustomModel: true,
              isCustomGenerated: true,
              modelProvider: modelResult.modelProvider || 'OpenAI Shap-E',
              quality: modelResult.quality,
              generatedAt: modelResult.generatedAt,
              fileSize: modelResult.fileSize,
              shapEGenerated: true
            },
            
            // 3D properties
            model: {
              position: AIController.calculateSpherePosition(i, selectedTopics.length),
              scale: modelResult.scale || 1.0,
              animations: modelResult.animations || ['rotate', 'glow'],
              materials: modelResult.materials || ['shap_e_generated']
            },
            
            // Game properties
            cost: topic.cost || (400 + (topic.difficulty * 200)),
            color: AIController.getConceptColor(topic.concept)
          };

          topicsWithModels.push(enhancedTopic);
          console.log(`✅ Processed Shap-E model for: ${topic.name}`);

        } else {
          // Failed generation
          console.error(`❌ Shap-E generation failed for ${topic.name}:`, modelResult.error);
          
          generationErrors.push({
            topic: topic.name,
            error: modelResult.error,
            index: i
          });

          // Add topic without 3D model (will show error state in frontend)
          const fallbackTopic = {
            ...topic,
            id: `topic_${i}`,
            modelUrl: null,
            metadata: {
              hasCustomModel: false,
              generationFailed: true,
              error: modelResult.error,
              shapEAttempted: true
            },
            model: {
              position: AIController.calculateSpherePosition(i, selectedTopics.length)
            },
            cost: topic.cost || (400 + (topic.difficulty * 200)),
            color: AIController.getConceptColor(topic.concept)
          };

          topicsWithModels.push(fallbackTopic);
        }
      }

      // Emit completion progress via WebSocket
      if (global.io) {
        global.io.emit('generation-progress', {
          sessionId: sessionId,
          current: selectedTopics.length,
          total: selectedTopics.length,
          stage: 'completed',
          message: `Parallel generation complete: ${topicsWithModels.filter(t => t.metadata.hasCustomModel).length} successful`
        });
      }

      console.log(`🎉 3D model generation complete! Success: ${topicsWithModels.filter(t => t.metadata.hasCustomModel).length}/${selectedTopics.length}`);

      return res.json({
        success: true,
        data: {
          topics: topicsWithModels,
          totalTopics: topicsWithModels.length,
          successfulModels: topicsWithModels.filter(t => t.metadata.hasCustomModel).length,
          failedModels: generationErrors.length,
          errors: generationErrors,
          generated3DModels: true, // Key flag - 3D models are ready
          generatedAt: new Date().toISOString(),
          sessionId: sessionId // Include session ID for frontend tracking
        },
        message: `Generated 3D models for ${topicsWithModels.filter(t => t.metadata.hasCustomModel).length} topics`
      });

    } catch (error) {
      console.error('❌ Error generating 3D models for selected topics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate 3D models',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Determine optimal topic count based on subject matter
  static determineOptimalTopicCount(description, targetCount) {
    const lowerDesc = description.toLowerCase();
    
    // Specific subject mappings
    if (lowerDesc.includes('continents')) return 7; // 7 continents
    if (lowerDesc.includes('oceans')) return 5; // 5 oceans
    if (lowerDesc.includes('solar system') || lowerDesc.includes('planets')) return 8; // 8 planets
    if (lowerDesc.includes('world war')) return 6; // Major theaters/periods
    if (lowerDesc.includes('calc') || lowerDesc.includes('calculus')) return 12; // Major calculus topics
    if (lowerDesc.includes('algebra')) return 10; // Algebra fundamentals
    if (lowerDesc.includes('geometry')) return 8; // Geometric concepts
    if (lowerDesc.includes('chemistry') && lowerDesc.includes('periodic')) return 18; // Major element groups
    if (lowerDesc.includes('biology') && lowerDesc.includes('systems')) return 11; // Body systems
    
    // Subject-based defaults
    if (lowerDesc.includes('math') || lowerDesc.includes('calculus') || lowerDesc.includes('algebra')) {
      return Math.min(15, Math.max(8, targetCount)); // Math needs more granular topics
    }
    if (lowerDesc.includes('geography') || lowerDesc.includes('countries')) {
      return Math.min(10, Math.max(5, targetCount)); // Geography varies by scope
    }
    if (lowerDesc.includes('history')) {
      return Math.min(8, Math.max(5, targetCount)); // History by periods/events
    }
    if (lowerDesc.includes('science')) {
      return Math.min(12, Math.max(6, targetCount)); // Science by phenomena/concepts
    }
    
    // Default to target with reasonable bounds
    return Math.min(12, Math.max(5, targetCount));
  }

  // Create fallback topics when AI fails
  static createFallbackTopics(description, count) {
    const fallbackTopics = [];
    
    for (let i = 0; i < count; i++) {
      fallbackTopics.push(AIController.createFallbackTopic(description, i));
    }
    
    return { topics: fallbackTopics };
  }

  static createFallbackTopic(description, index) {
    return {
      name: `Learning Territory ${index + 1}`,
      description: `Educational content related to ${description}`,
      object3D: {
        name: `Knowledge Crystal ${index + 1}`,
        description: `A crystalline structure containing knowledge about ${description}. Made of translucent crystal with glowing energy veins.`,
        concept: AIController.inferConcept(description, description),
        visualStyle: 'stylized'
      },
      icon: ['🎯', '🏆', '⭐', '🎨', '🔬', '🌟', '💡'][index] || '🎯',
      cost: 400 + (index * 200),
      difficulty: Math.min(1 + Math.floor(index / 2), 5),
      educationalValue: `Knowledge about ${description.split(' ').slice(0, 3).join(' ')}`
    };
  }

  // Infer concept category from topic name/description
  static inferConcept(topicName, description) {
    const combined = `${topicName} ${description}`.toLowerCase();
    
    if (combined.includes('geography') || combined.includes('continents') || combined.includes('countries') || 
        combined.includes('mountains') || combined.includes('rivers') || combined.includes('oceans')) {
      return 'geography';
    }
    if (combined.includes('history') || combined.includes('ancient') || combined.includes('war') || 
        combined.includes('civilization') || combined.includes('empire')) {
      return 'history';
    }
    if (combined.includes('science') || combined.includes('physics') || combined.includes('chemistry') || 
        combined.includes('biology') || combined.includes('atom') || combined.includes('molecule')) {
      return 'science';
    }
    if (combined.includes('technology') || combined.includes('computer') || combined.includes('ai') || 
        combined.includes('robot') || combined.includes('digital')) {
      return 'technology';
    }
    if (combined.includes('math') || combined.includes('algebra') || combined.includes('geometry') || 
        combined.includes('calculus') || combined.includes('equation')) {
      return 'mathematics';
    }
    if (combined.includes('art') || combined.includes('painting') || combined.includes('sculpture') || 
        combined.includes('music') || combined.includes('culture')) {
      return 'art';
    }
    
    return 'general';
  }

  // Sanitize topic name to create valid ID
  static sanitizeId(name) {
    return name.toLowerCase()
               .replace(/[^a-z0-9\s]/g, '')
               .replace(/\s+/g, '_')
               .substring(0, 50);
  }

  // Helper method to parse Neural Conquest AI response
  static parseNeuralConquestResponse(aiResponse) {
    const topics = [];
    const questions = [];

    try {
      // Split into sections
      const sections = aiResponse.split(/TOPICS:|QUESTIONS:/i);
      
      if (sections.length >= 2) {
        const topicsSection = sections[1];
        const questionsSection = sections[2] || '';

        // Parse topics
        const topicBlocks = topicsSection.split(/\[Topic \d+\]/i).filter(block => block.trim());
        
        for (const block of topicBlocks) {
          const lines = block.split('\n').map(line => line.trim()).filter(line => line);
          const topic = {};
          
          for (const line of lines) {
            if (line.startsWith('Name:')) {
              topic.name = line.replace('Name:', '').trim();
            } else if (line.startsWith('Description:')) {
              topic.description = line.replace('Description:', '').trim();
            } else if (line.startsWith('Concept:')) {
              topic.concept = line.replace('Concept:', '').trim();
            } else if (line.startsWith('Difficulty:')) {
              topic.difficulty = parseInt(line.replace('Difficulty:', '').trim()) || 1;
            } else if (line.startsWith('Cost:')) {
              topic.cost = parseInt(line.replace('Cost:', '').trim()) || 500;
            } else if (line.startsWith('Educational Value:')) {
              topic.educationalValue = line.replace('Educational Value:', '').trim();
            }
          }
          
          if (topic.name && topic.description) {
            // Generate intelligent icon based on topic content
            topic.icon = AIController.generateTopicIcon(topic.name, topic.description, topic.concept);
            topics.push(topic);
          }
        }

        // Parse questions
        const questionBlocks = questionsSection.split(/\[Question \d+\]/i).filter(block => block.trim());
        
        for (const block of questionBlocks) {
          const lines = block.split('\n').map(line => line.trim()).filter(line => line);
          const question = { options: [] };
          
          for (const line of lines) {
            if (line.startsWith('Q:')) {
              question.question = line.replace('Q:', '').trim();
            } else if (line.match(/^[A-D]\)/)) {
              const option = line.substring(2).trim();
              const letter = line.charAt(0);
              question.options.push({ letter, text: option });
            } else if (line.startsWith('Correct:')) {
              question.correct = line.replace('Correct:', '').trim();
            } else if (line.startsWith('Difficulty:')) {
              question.difficulty = parseInt(line.replace('Difficulty:', '').trim()) || 1;
            } else if (line.startsWith('Topic:')) {
              question.topic = line.replace('Topic:', '').trim();
            }
          }
          
          if (question.question && question.options.length === 4 && question.correct) {
            questions.push(question);
          }
        }
      }

    } catch (parseError) {
      console.warn('⚠️ Error parsing AI response, using fallback parsing', parseError);
      
      // Fallback: extract any topics we can find
      const fallbackTopics = AIController.extractFallbackTopics(aiResponse);
      topics.push(...fallbackTopics);
    }

    return { topics, questions };
  }

  // NEW: Generate intelligent icons based on topic content
  static generateTopicIcon(name, description, concept) {
    const combined = `${name} ${description}`.toLowerCase();
    
    // Geography-specific icons
    if (combined.includes('africa') || combined.includes('sahara')) return '🌍';
    if (combined.includes('asia') || combined.includes('himalaya') || combined.includes('china') || combined.includes('india')) return '🏔️';
    if (combined.includes('europe') || combined.includes('alps') || combined.includes('mediterranean')) return '🏰';
    if (combined.includes('north america') || combined.includes('america') || combined.includes('canada') || combined.includes('usa')) return '🗽';
    if (combined.includes('south america') || combined.includes('amazon') || combined.includes('brazil') || combined.includes('andes')) return '🌿';
    if (combined.includes('australia') || combined.includes('oceania') || combined.includes('pacific')) return '🦘';
    if (combined.includes('antarctica') || combined.includes('arctic') || combined.includes('polar')) return '🐧';
    
    // Ocean and water features
    if (combined.includes('ocean') || combined.includes('pacific') || combined.includes('atlantic') || combined.includes('indian ocean')) return '🌊';
    if (combined.includes('river') || combined.includes('nile') || combined.includes('amazon river') || combined.includes('mississippi')) return '🏞️';
    if (combined.includes('lake') || combined.includes('great lakes') || combined.includes('superior')) return '🏔️';
    
    // Mountain ranges
    if (combined.includes('mountain') || combined.includes('peak') || combined.includes('everest') || combined.includes('k2')) return '⛰️';
    if (combined.includes('himalaya') || combined.includes('alps') || combined.includes('rockies') || combined.includes('andes')) return '🏔️';
    if (combined.includes('volcano') || combined.includes('volcanic')) return '🌋';
    
    // History-specific icons
    if (combined.includes('egypt') || combined.includes('pyramid') || combined.includes('pharaoh')) return '🏛️';
    if (combined.includes('rome') || combined.includes('roman') || combined.includes('caesar') || combined.includes('colosseum')) return '🏛️';
    if (combined.includes('greece') || combined.includes('greek') || combined.includes('athens') || combined.includes('sparta')) return '🏛️';
    if (combined.includes('medieval') || combined.includes('castle') || combined.includes('knight')) return '🏰';
    if (combined.includes('empire') || combined.includes('kingdom') || combined.includes('dynasty')) return '👑';
    if (combined.includes('war') || combined.includes('battle') || combined.includes('military')) return '⚔️';
    if (combined.includes('ancient') || combined.includes('civilization')) return '🏺';
    
    // Science-specific icons
    if (combined.includes('solar system') || combined.includes('planet') || combined.includes('space')) return '🪐';
    if (combined.includes('mars') || combined.includes('red planet')) return '🔴';
    if (combined.includes('earth') || combined.includes('blue planet')) return '🌍';
    if (combined.includes('moon') || combined.includes('lunar')) return '🌙';
    if (combined.includes('sun') || combined.includes('solar')) return '☀️';
    if (combined.includes('star') || combined.includes('galaxy')) return '⭐';
    if (combined.includes('atom') || combined.includes('molecule') || combined.includes('chemistry')) return '⚛️';
    if (combined.includes('dna') || combined.includes('genetics') || combined.includes('biology')) return '🧬';
    if (combined.includes('cell') || combined.includes('microscope')) return '🔬';
    if (combined.includes('physics') || combined.includes('energy') || combined.includes('force')) return '⚡';
    
    // Mathematics-specific icons
    if (combined.includes('calculus') || combined.includes('integral') || combined.includes('derivative')) return '∫';
    if (combined.includes('algebra') || combined.includes('equation') || combined.includes('variable')) return '📐';
    if (combined.includes('geometry') || combined.includes('triangle') || combined.includes('circle')) return '📐';
    if (combined.includes('statistics') || combined.includes('probability') || combined.includes('data')) return '📊';
    if (combined.includes('number') || combined.includes('prime') || combined.includes('fibonacci')) return '🔢';
    
    // Technology-specific icons
    if (combined.includes('computer') || combined.includes('programming') || combined.includes('code')) return '💻';
    if (combined.includes('artificial intelligence') || combined.includes('ai') || combined.includes('machine learning')) return '🤖';
    if (combined.includes('internet') || combined.includes('web') || combined.includes('network')) return '🌐';
    if (combined.includes('robot') || combined.includes('automation')) return '🤖';
    
    // Art and culture icons
    if (combined.includes('music') || combined.includes('symphony') || combined.includes('composer')) return '🎵';
    if (combined.includes('painting') || combined.includes('artist') || combined.includes('canvas')) return '🎨';
    if (combined.includes('sculpture') || combined.includes('statue')) return '🗿';
    if (combined.includes('literature') || combined.includes('book') || combined.includes('novel')) return '📚';
    
    // Fallback icons based on concept
    const conceptIcons = {
      geography: '🌍',
      history: '🏛️', 
      science: '🔬',
      technology: '💻',
      mathematics: '📐',
      art: '🎨',
      biology: '🧬',
      general: '🏆'
    };
    
    return conceptIcons[concept] || '🏆';
  }

  // Fallback topic extraction if structured parsing fails
  static extractFallbackTopics(text) {
    const topics = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('Name:') || line.match(/\d+\./)) {
        const name = line.replace(/^\d+\./, '').replace('Name:', '').trim();
        if (name.length > 3) {
          topics.push({
            name: name.substring(0, 50),
            description: `Educational topic: ${name}`,
            concept: 'general',
            difficulty: Math.floor(Math.random() * 3) + 1,
            cost: 400 + (Math.floor(Math.random() * 3) * 200),
            educationalValue: `Learn about ${name}`
          });
        }
      }
    }
    
    return topics.slice(0, 8); // Limit fallback topics
  }

  // Additional helper methods for 3D model generation
  static determineVisualStyle(concept, difficulty) {
    const styleMap = {
      geography: difficulty > 3 ? 'realistic' : 'stylized',
      history: 'historical',
      science: difficulty > 2 ? 'scientific' : 'futuristic',
      technology: 'futuristic',
      mathematics: 'abstract',
      art: 'artistic',
      biology: 'organic'
    };
    
    return styleMap[concept] || 'realistic';
  }

  static calculateSpherePosition(index, total) {
    const radius = 10; // Distance from center
    const angle = (index / total) * 2 * Math.PI;
    
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle * 0.5) * 2, // Add some vertical variation
      z: Math.sin(angle) * radius
    };
  }

  static getConceptColor(concept) {
    const colorMap = {
      geography: '#4A90E2', // Blue
      history: '#D4AF37', // Gold
      science: '#7ED321', // Green
      technology: '#BD10E0', // Purple
      mathematics: '#F5A623', // Orange
      art: '#E91E63', // Pink
      biology: '#4CAF50', // Light Green
      general: '#9013FE' // Default Purple
    };
    
    return colorMap[concept] || colorMap.general;
  }

  // NEW: Enhanced fallback topic generation based on description analysis
  static createEnhancedFallbackTopics(description, count) {
    const mainSubject = AIController.inferMainSubject(description);
    const topics = [];
    const questions = [];

    // Create subject-specific topics based on description
    const topicTemplates = AIController.getTopicTemplates(mainSubject, description);
    
    for (let i = 0; i < count; i++) {
      const template = topicTemplates[i % topicTemplates.length];
      const difficulty = Math.min(Math.floor(i / 2) + 1, 5);
      
      topics.push({
        name: template.name.replace('{i}', i + 1),
        description: template.description,
        concept: mainSubject,
        difficulty: difficulty,
        cost: 400 + (difficulty * 150),
        educationalValue: template.educationalValue,
        icon: template.icon
      });

      // Generate related questions
      if (i < 15) { // Generate up to 15 questions
        questions.push({
          question: template.sampleQuestion.replace('{i}', i + 1),
          options: template.sampleOptions,
          correct: template.correctAnswer,
          difficulty: difficulty,
          topic: template.name.replace('{i}', i + 1)
        });
      }
    }

    return { topics, questions };
  }

  // Infer main subject from description
  static inferMainSubject(description) {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('geography') || lowerDesc.includes('continents') || lowerDesc.includes('countries') || 
        lowerDesc.includes('mountains') || lowerDesc.includes('rivers') || lowerDesc.includes('oceans')) {
      return 'geography';
    }
    if (lowerDesc.includes('history') || lowerDesc.includes('ancient') || lowerDesc.includes('war') || 
        lowerDesc.includes('civilization') || lowerDesc.includes('empire') || lowerDesc.includes('historical')) {
      return 'history';
    }
    if (lowerDesc.includes('science') || lowerDesc.includes('physics') || lowerDesc.includes('chemistry') || 
        lowerDesc.includes('biology') || lowerDesc.includes('atom') || lowerDesc.includes('molecule')) {
      return 'science';
    }
    if (lowerDesc.includes('space') || lowerDesc.includes('planets') || lowerDesc.includes('astronomy') || 
        lowerDesc.includes('solar system') || lowerDesc.includes('astronaut')) {
      return 'science';
    }
    if (lowerDesc.includes('technology') || lowerDesc.includes('computer') || lowerDesc.includes('ai') || 
        lowerDesc.includes('robot') || lowerDesc.includes('digital')) {
      return 'technology';
    }
    if (lowerDesc.includes('math') || lowerDesc.includes('algebra') || lowerDesc.includes('geometry') || 
        lowerDesc.includes('calculus') || lowerDesc.includes('equation')) {
      return 'mathematics';
    }
    if (lowerDesc.includes('art') || lowerDesc.includes('painting') || lowerDesc.includes('sculpture') || 
        lowerDesc.includes('music') || lowerDesc.includes('culture')) {
      return 'art';
    }
    
    return 'general';
  }

  // Get topic templates based on subject and description
  static getTopicTemplates(subject, description) {
    const templates = {
      geography: [
        {
          name: "Continent Explorer {i}",
          description: "Explore the unique features, climate, and cultures of major continents",
          educationalValue: "Learn about continental geography, climate zones, and cultural diversity",
          icon: "🌍",
          sampleQuestion: "Which continent is known for the Sahara Desert?",
          sampleOptions: [
            { letter: 'A', text: 'Africa' },
            { letter: 'B', text: 'Asia' },
            { letter: 'C', text: 'Australia' },
            { letter: 'D', text: 'South America' }
          ],
          correctAnswer: 'A'
        },
        {
          name: "Ocean Territory {i}",
          description: "Discover the mysteries of Earth's vast oceans and marine ecosystems",
          educationalValue: "Understand ocean geography, marine life, and climate impact",
          icon: "🌊",
          sampleQuestion: "Which is the largest ocean on Earth?",
          sampleOptions: [
            { letter: 'A', text: 'Atlantic' },
            { letter: 'B', text: 'Pacific' },
            { letter: 'C', text: 'Indian' },
            { letter: 'D', text: 'Arctic' }
          ],
          correctAnswer: 'B'
        },
        {
          name: "Mountain Range {i}",
          description: "Scale the world's highest peaks and understand geological formations",
          educationalValue: "Learn about mountain formation, elevation, and geological processes",
          icon: "🏔️",
          sampleQuestion: "What is the highest mountain peak in the world?",
          sampleOptions: [
            { letter: 'A', text: 'K2' },
            { letter: 'B', text: 'Mount Everest' },
            { letter: 'C', text: 'Denali' },
            { letter: 'D', text: 'Mont Blanc' }
          ],
          correctAnswer: 'B'
        }
      ],
      history: [
        {
          name: "Ancient Civilization {i}",
          description: "Explore the rise and achievements of ancient civilizations",
          educationalValue: "Understand historical developments, culture, and societal structures",
          icon: "🏛️",
          sampleQuestion: "Which ancient civilization built the pyramids?",
          sampleOptions: [
            { letter: 'A', text: 'Greeks' },
            { letter: 'B', text: 'Romans' },
            { letter: 'C', text: 'Egyptians' },
            { letter: 'D', text: 'Babylonians' }
          ],
          correctAnswer: 'C'
        },
        {
          name: "Historical Empire {i}",
          description: "Study the expansion and influence of major historical empires",
          educationalValue: "Learn about empire building, trade routes, and cultural exchange",
          icon: "👑",
          sampleQuestion: "Which empire was known as the largest contiguous land empire?",
          sampleOptions: [
            { letter: 'A', text: 'Roman Empire' },
            { letter: 'B', text: 'Mongol Empire' },
            { letter: 'C', text: 'British Empire' },
            { letter: 'D', text: 'Ottoman Empire' }
          ],
          correctAnswer: 'B'
        }
      ],
      science: [
        {
          name: "Planetary System {i}",
          description: "Journey through our solar system and discover planetary characteristics",
          educationalValue: "Understand planetary science, orbital mechanics, and space exploration",
          icon: "🪐",
          sampleQuestion: "Which planet is known as the Red Planet?",
          sampleOptions: [
            { letter: 'A', text: 'Venus' },
            { letter: 'B', text: 'Mars' },
            { letter: 'C', text: 'Jupiter' },
            { letter: 'D', text: 'Saturn' }
          ],
          correctAnswer: 'B'
        },
        {
          name: "Scientific Discovery {i}",
          description: "Explore groundbreaking scientific discoveries and their impact",
          educationalValue: "Learn about scientific method, discoveries, and technological advancement",
          icon: "🔬",
          sampleQuestion: "Who developed the theory of relativity?",
          sampleOptions: [
            { letter: 'A', text: 'Isaac Newton' },
            { letter: 'B', text: 'Albert Einstein' },
            { letter: 'C', text: 'Galileo Galilei' },
            { letter: 'D', text: 'Nikola Tesla' }
          ],
          correctAnswer: 'B'
        }
      ],
      general: [
        {
          name: "Knowledge Territory {i}",
          description: "Explore diverse educational topics and expand your learning horizons",
          educationalValue: "Gain broad knowledge across multiple academic disciplines",
          icon: "🎯",
          sampleQuestion: "What is the most abundant gas in Earth's atmosphere?",
          sampleOptions: [
            { letter: 'A', text: 'Oxygen' },
            { letter: 'B', text: 'Nitrogen' },
            { letter: 'C', text: 'Carbon Dioxide' },
            { letter: 'D', text: 'Hydrogen' }
          ],
          correctAnswer: 'B'
        }
      ]
    };

    return templates[subject] || templates.general;
  }
}

module.exports = AIController;

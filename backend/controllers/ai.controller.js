const { getRequestUserId } = require('../utils/requestUser');// Main AI Controller - Orchestrates specialized controllers
const flags = require('../config/flags');
const NeuralConquestController = require('./neural-conquest.controller');
// TODO: DEPRECATED - Legacy practice exam controller
const PracticeExamController = flags.RAG_ENABLED ? null : require('./practice-exam.controller');
const ChatController = require('./ai/chat.controller');
const ContentGenerationController = require('./ai/content-generation.controller');
const AnalysisController = require('./ai/analysis.controller');
const aiService = require('../services/ai.service');

class AIController {
  // ---------- Chat and Conversation Management ----------
  static async handleChatMessage(req, res) {
    return ChatController.handleChatMessage(req, res);
  }

  static async getAvailableClassrooms(req, res) {
    console.log('[AI Controller] getAvailableClassrooms called - delegating to ChatController');
    try {
      return await ChatController.getAvailableClassrooms(req, res);
    } catch (error) {
      console.error('[AI Controller] Error in getAvailableClassrooms delegation:', error);
      throw error;
    }
  }

  static async getIntegratedMaterials(req, res) {
    return ChatController.getIntegratedMaterials(req, res);
  }

  // Preload and cache materials/extractions for a context (course/classroom)
  static async preloadContext(req, res) {
    try {
      const userId = getRequestUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'No token provided', code: 'NO_TOKEN' });
      }
      const { contextId } = req.params;
      const { type = 'course' } = req.query;

      const result = await aiService.getIntegratedMaterials(userId, contextId, type);
      // Force extraction pass by asking a no-op question that triggers extractor against assignments
      await aiService.answerQuestion({
        userId,
        question: '[SYSTEM] preload context',
        courseId: type === 'course' ? contextId : null,
        classroomId: type === 'classroom' ? contextId : null,
        context: ''
      });
      res.json({ success: true, data: { totalMaterials: result.totalMaterials, totalAssignments: result.totalAssignments } });
    } catch (error) {
      return require('../middleware/error.middleware').handleError(error, res);
    }
  }

  static async testGemini(req, res) {
    return ChatController.testGemini(req, res);
  }

  // ---------- Content Generation ----------
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

  // Practice Exam - delegate to dedicated controller
  static async generatePracticeExam(req, res) {
    return PracticeExamController.generatePracticeExam(req, res);
  }

  // Neural Conquest - delegate endpoints to dedicated controller
  static async generateNeuralConquestTopics(req, res) {
    return NeuralConquestController.generateNeuralConquestTopics(req, res);
  }

  static async generate3DModelsForSelectedTopics(req, res) {
    return NeuralConquestController.generate3DModelsForSelectedTopics(req, res);
  }

  // ---------- Document Analysis ----------
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

  // ---------- Legacy Activity Methods (for backward compatibility) ----------
  static async createActivity(req, res) {
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.createActivity(req, res);
  }

  static async getActivities(req, res) {
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.getMyActivities(req, res);
  }

  static async getActivity(req, res) {
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.getActivity(req, res);
  }

  static async updateActivity(req, res) {
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.updateActivity(req, res);
  }

  static async startActivity(req, res) {
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.startSession(req, res);
  }

  static async joinActivity(req, res) {
    const ActivityController = require('./activity.controller');
    const activityController = new ActivityController();
    return activityController.joinActivity(req, res);
  }

  // ---------- Shared utilities preserved from original AIController ----------

  /**
   * Extract detailed layout info from HTML (used elsewhere in pipeline)
   */
  static extractDetailedLayoutInfo(htmlContent) {
    if (!htmlContent) return 'No layout information available';
    const fontSizes = [...htmlContent.matchAll(/font-size:(\d+)px/g)].map(m => parseInt(m[1]));
    const uniqueFontSizes = [...new Set(fontSizes)].sort((a, b) => b - a);
    const colors = [...htmlContent.matchAll(/color:(#[0-9a-fA-F]{6})/g)].map(m => m[1]);
    const uniqueColors = [...new Set(colors)];
    const fontFamilies = [...htmlContent.matchAll(/font-family:([^;]+)/g)].map(m => m[1]);
    const uniqueFontFamilies = [...new Set(fontFamilies)];
    const boldPatterns = htmlContent.match(/<b[^>]*>.*?<\/b>/g) || [];
    const positionedElements = htmlContent.match(/position:absolute;top:\d+px;left:\d+px/g) || [];
    const layoutElements = [];
    const lines = htmlContent.split('\n');
    for (const line of lines) {
      if (line.includes('CSCI-UA.0480') || line.includes('Midterm Exam') || line.includes('Total:') || line.includes('Important Notes') || line.includes('Problem 1') || line.includes('Problem 2') || line.includes('Problem 3') || line.includes('Problem 4') || line.includes('Honor code') || line.includes('font-size:21px') || line.includes('font-size:18px') || line.includes('color:#ff0000')) {
        layoutElements.push(line.trim());
      }
    }
    const detailedInfo = `DETAILED LAYOUT ANALYSIS:\n\nFONT SIZE HIERARCHY:\n${uniqueFontSizes.map(size => `- ${size}px: ${size >= 21 ? 'Main headers' : size >= 18 ? 'Problem headers' : size >= 17 ? 'Body text' : 'Small text'}`).join('\n')}\n\nCOLOR SCHEME:\n- Black body text (standard)\n- Red warning text (for important notes)\n\nFONT FAMILIES:\n- Standard system fonts for academic documents\n\nLAYOUT ELEMENTS FOUND:\n${layoutElements.slice(0, 10).join('\n')}\n\nFORMATTING REQUIREMENTS:\n1. Use appropriate font sizes for headers and body text\n2. Apply red color to warning text\n3. Use bold formatting for headers\n4. Maintain proper spacing and alignment\n5. Include proper margins and page layout`;
    return detailedInfo;
  }

  // Universal extraction and distribution helpers (kept here for reuse by practice-exam controller)
  static extractQuestionsFromLatex(latexContent) {
    const questions = [];
    try {
      const cleanLatexText = (text) => {
        return text
          .replace(/\\item\s*/g, '')
          .replace(/\\item\s*\[[a-z]\]\s*/g, '')
          .replace(/\\item\s*\[.*?\]\s*/g, '')
          .replace(/\$([^$]+)\$/g, (match, mathContent) => {
            return mathContent
              .replace(/\\log_(\d+)/g, 'log₍$1₎')
              .replace(/\\log_\{(\d+)\}/g, 'log₍$1₎')
              .replace(/\^(\d+)/g, '⁽$1⁾')
              .replace(/\^\{([^}]+)}/g, '⁽$1⁾')
              .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
              .replace(/\\sum_\{([^}]+)\}\^([^\s]+)/g, 'Σ($1 to $2)')
              .replace(/\\mathbb\{([^}]+)\}/g, '$1')
              .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
              .replace(/\\sqrt/g, '√')
              .replace(/\\infty/g, '∞')
              .replace(/\\Theta/g, 'Θ')
              .replace(/\\Omega/g, 'Ω')
              .replace(/\\omega/g, 'ω')
              .replace(/\\ge/g, '≥')
              .replace(/\\le/g, '≤')
              .replace(/\\neq/g, '≠')
              .replace(/\\to/g, '→')
              .replace(/\\lim/g, 'lim')
              .replace(/\\log/g, 'log');
          })
          .replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (m, c) => `\n[CODE SNIPPET]\n${c}\n[/CODE SNIPPET]\n`)
          .replace(/\\begin\{tabular\}([\s\S]*?)\\end\{tabular\}/g, (m, c) => `\n[TABLE]\n${c}\n[/TABLE]\n`)
          .replace(/\\begin\{tikzpicture\}([\s\S]*?)\\end\{tikzpicture\}/g, (m, c) => `\n[DIAGRAM]\n${c}\n[/DIAGRAM]\n`)
          .replace(/\\begin\{lstlisting\}([\s\S]*?)\\end\{lstlisting\}/g, (m, c) => `\n[CODE SNIPPET]\n${c}\n[/CODE SNIPPET]\n`)
          .replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, '$2')
          .replace(/\\textbf\{([^}]+)\}/g, '$1')
          .replace(/\\emph\{([^}]+)\}/g, '$1')
          .replace(/\\section\*?\{([^}]+)\}/g, '$1')
          .replace(/\\subsection\*?\{([^}]+)\}/g, '$1')
          .replace(/\\[a-zA-Z]+\*?\{[^}]*\}/g, '')
          .replace(/\\[a-zA-Z]+\*/g, '')
          .replace(/\\[a-zA-Z]+/g, '')
          .replace(/\{([^}]*)\}/g, '$1')
          .replace(/\\\\/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const examQuestions = this.extractExamFormat(latexContent, cleanLatexText);
      if (examQuestions.length > 0) return examQuestions;
      const homeworkQuestions = this.extractHomeworkFormat(latexContent, cleanLatexText);
      if (homeworkQuestions.length > 0) return homeworkQuestions;
      const numberedQuestions = this.extractNumberedFormat(latexContent, cleanLatexText);
      if (numberedQuestions.length > 0) return numberedQuestions;
      const itemQuestions = this.extractItemFormat(latexContent, cleanLatexText);
      if (itemQuestions.length > 0) return itemQuestions;
      const heuristicQuestions = this.extractHeuristicFormat(latexContent, cleanLatexText);
      if (heuristicQuestions.length > 0) return heuristicQuestions;
    } catch (error) {
      console.error('❌ Error in universal extraction:', error);
    }
    return questions;
  }

  static extractExamFormat(latexContent, cleanLatexText) {
    const questions = [];
    if (!latexContent.includes('\\section*{Problem') && !latexContent.includes('\\section{Problem')) return questions;
    const problemSections = latexContent.split(/\\section\*?\{Problem \d+\}/);
    for (let i = 1; i < problemSections.length; i++) {
      const problemContent = problemSections[i];
      const lines = problemContent.split('\n');
      let questionNumber = i;
      let mainQuestionContext = '';
      let foundFirstSubPart = false;
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex].trim();
        if (line.match(/^\\section/)) break;
        const subPartMatch1 = line.match(/^([a-z])\.\s*\[(\n?\d+)(?:\s*points?)?\]\s*(.*)/i);
        const subPartMatch2 = line.match(/^\(([a-z])\)\s*(.*)/);
        const subPartMatch3 = line.match(/^\[([a-z])\.\]\s*(?:\[(\n?\d+)(?:\s*points?)?\]\s*)?(.*)/i);
        const subPartMatch = subPartMatch1 || subPartMatch2 || subPartMatch3;
        if (subPartMatch) { foundFirstSubPart = true; break; }
        else if (!foundFirstSubPart && line.length > 0) {
          if (mainQuestionContext.length > 0) mainQuestionContext += ' ';
          mainQuestionContext += line;
        }
      }
      let currentSubPart = '';
      let subPartLetter = '';
      let subPartPoints = null;
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex].trim();
        if (line.match(/^\\section/)) break;
        const subPartMatch1 = line.match(/^([a-z])\.\s*\((\d+)\)\s*(.*)/i) || line.match(/^([a-z])\.\s*\[(\n?\d+)(?:\s*points?)?\]\s*(.*)/i);
        const subPartMatch2 = line.match(/^\(([a-z])\)\s*(.*)/);
        const subPartMatch3 = line.match(/^\[([a-z])\.\]\s*(?:\[(\n?\d+)(?:\s*points?)?\]\s*)?(.*)/i);
        const subPartMatch = subPartMatch1 || subPartMatch2 || subPartMatch3;
        if (subPartMatch) {
          if (currentSubPart.trim() && subPartLetter) {
            const cleanSubPartText = cleanLatexText(currentSubPart);
            if (cleanSubPartText.length > 10) {
              const cleanMainContext = cleanLatexText(mainQuestionContext);
              const fullQuestionText = cleanMainContext + (cleanMainContext.length > 0 ? '\n\n' : '') + `(${subPartLetter}) ${cleanSubPartText}`;
              questions.push({ text: `Q${questionNumber}${subPartLetter}) ${fullQuestionText}`, points: subPartPoints });
            }
          }
          if (subPartMatch1) { subPartLetter = subPartMatch1[1]; subPartPoints = parseInt(subPartMatch1[2]); currentSubPart = subPartMatch1[3]; }
          else if (subPartMatch2) { subPartLetter = subPartMatch2[1]; subPartPoints = null; currentSubPart = subPartMatch2[2]; }
          else if (subPartMatch3) { subPartLetter = subPartMatch3[1]; subPartPoints = subPartMatch3[2] ? parseInt(subPartMatch3[2]) : null; currentSubPart = subPartMatch3[3]; }
        } else if (subPartLetter && line.length > 0) {
          currentSubPart += ' ' + line;
        } else if (!subPartLetter && line.length > 0) {
          if (lineIndex === 0 || currentSubPart.length === 0) currentSubPart += line; else currentSubPart += ' ' + line;
          }
        }
      if (currentSubPart.trim() && subPartLetter) {
        const cleanSubPartText = cleanLatexText(currentSubPart);
        if (cleanSubPartText.length > 10) {
          const cleanMainContext = cleanLatexText(mainQuestionContext);
          const fullQuestionText = cleanMainContext + (cleanMainContext.length > 0 ? '\n\n' : '') + `(${subPartLetter}) ${cleanSubPartText}`;
          questions.push({ text: `Q${questionNumber}${subPartLetter}) ${fullQuestionText}`, points: subPartPoints });
        }
      } else if (currentSubPart.trim() && !subPartLetter) {
        const cleanText = cleanLatexText(currentSubPart);
        if (cleanText.length > 20) questions.push({ text: `Q${questionNumber}) ${cleanText}`, points: null });
      }
    }
    return questions;
  }

  static extractHomeworkFormat(latexContent, cleanLatexText) {
    const questions = [];
    if (!latexContent.includes('\\begin{enumerate}')) return questions;
    const beginIndex = latexContent.indexOf('\\begin{enumerate}');
    if (beginIndex === -1) return questions;
    let currentPos = beginIndex + '\\begin{enumerate}'.length;
    let level = 1;
    let endIndex = -1;
    while (currentPos < latexContent.length && level > 0) {
      const beginMatch = latexContent.indexOf('\\begin{enumerate}', currentPos);
      const endMatch = latexContent.indexOf('\\end{enumerate}', currentPos);
      if (endMatch === -1) break;
      if (beginMatch !== -1 && beginMatch < endMatch) { level++; currentPos = beginMatch + '\\begin{enumerate}'.length; }
      else { level--; if (level === 0) { endIndex = endMatch; break; } currentPos = endMatch + '\\end{enumerate}'.length; }
    }
    if (endIndex === -1) return questions;
    const startContent = beginIndex + '\\begin{enumerate}'.length;
    const mainEnumerateContent = latexContent.substring(startContent, endIndex);
    const mainItems = this.extractMainItems(mainEnumerateContent);
    let questionNumber = 1;
    mainItems.forEach(mainItem => {
      const nestedEnumerateMatch = mainItem.match(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/);
      if (nestedEnumerateMatch) {
        const mainQuestionContext = mainItem.replace(/\\begin\{enumerate\}[\s\S]*?\\end\{enumerate\}/, '').trim();
        const cleanMainContext = cleanLatexText(mainQuestionContext);
        const nestedContent = nestedEnumerateMatch[1];
        const subItems = nestedContent.match(/\\item\s*(.*?)(?=\\item|$)/gs) || [];
        subItems.forEach((subItem, subIndex) => {
          const cleanSubItemText = cleanLatexText(subItem);
          if (cleanSubItemText.length > 5) {
            const subPart = String.fromCharCode(97 + subIndex);
            const fullQuestionText = cleanMainContext + (cleanMainContext.length > 0 ? '\n\n' : '') + `(${subPart}) ${cleanSubItemText}`;
            questions.push({ text: `Q${questionNumber}${subPart}) ${fullQuestionText}`, points: null });
          }
        });
        questionNumber++;
      } else {
        const cleanText = cleanLatexText(mainItem);
        if (cleanText.length > 20) { questions.push({ text: `Q${questionNumber}) ${cleanText}`, points: null }); questionNumber++; }
      }
    });
    return questions;
  }

  static extractNumberedFormat(latexContent, cleanLatexText) {
    const questions = [];
    const lines = latexContent.split('\n');
    let currentQuestion = '';
    let questionNumber = 0;
    for (const line of lines) {
      const trimmedLine = line.trim();
      const numberMatch = trimmedLine.match(/^(\d+)\.\s*(.*)/);
      if (numberMatch) {
        if (currentQuestion.trim() && questionNumber > 0) {
          const cleanText = cleanLatexText(currentQuestion);
          if (cleanText.length > 20) questions.push({ text: `Q${questionNumber}) ${cleanText}`, points: null });
        }
        questionNumber = parseInt(numberMatch[1]);
        currentQuestion = numberMatch[2];
      } else if (questionNumber > 0 && trimmedLine.length > 0) {
        currentQuestion += ' ' + trimmedLine;
      }
    }
    if (currentQuestion.trim() && questionNumber > 0) {
      const cleanText = cleanLatexText(currentQuestion);
      if (cleanText.length > 20) questions.push({ text: `Q${questionNumber}) ${cleanText}`, points: null });
    }
    return questions;
  }

  static extractItemFormat(latexContent, cleanLatexText) {
    const questions = [];
    const itemMatches = latexContent.match(/\\item[^\\]*(?:\\[^i][^t][^e][^m][^\\]*)*(?=\\item|\\end|$)/gs);
    if (itemMatches) {
      let mainQuestionContext = '';
      let mainQuestionNumber = 0;
      for (let i = 0; i < itemMatches.length; i++) {
        const item = itemMatches[i];
        const cleanText = cleanLatexText(item);
        if (cleanText.length <= 10 || cleanText.toLowerCase().includes('honor code')) continue;
        const subPartMatch = cleanText.match(/^\[\(([a-z])\)\]\s*(.*)/);
        if (subPartMatch) {
          const subPartLetter = subPartMatch[1];
          const subPartText = subPartMatch[2];
          if (subPartLetter === 'a') {
            if (i > 0) {
              const previousItem = itemMatches[i - 1];
              const previousCleanText = cleanLatexText(previousItem);
              const isPreviousSubPart = previousCleanText.match(/^\[\(([a-z])\)\]/);
              if (!isPreviousSubPart && previousCleanText.length > 20) {
                mainQuestionContext = previousCleanText;
              }
            }
            mainQuestionNumber++;
          }
          const fullQuestionText = mainQuestionContext + (mainQuestionContext.length > 0 ? '\n\n' : '') + `(${subPartLetter}) ${subPartText}`;
          questions.push({ text: `Q${mainQuestionNumber}${subPartLetter}) ${fullQuestionText}`, points: null });
        } else {
          const nextItem = i < itemMatches.length - 1 ? itemMatches[i + 1] : null;
          if (nextItem) {
            const nextCleanText = cleanLatexText(nextItem);
            const isNextSubPart = nextCleanText.match(/^\[\(([a-z])\)\]/);
            if (isNextSubPart) { continue; }
          }
          mainQuestionNumber++;
          questions.push({ text: `Q${mainQuestionNumber}) ${cleanText}`, points: null });
        }
      }
      return questions;
    }
    return questions;
  }

  static extractHeuristicFormat(latexContent, cleanLatexText) {
    const questions = [];
    const lines = latexContent.split('\n');
    let currentQuestion = '';
    let questionCount = 0;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('\\') || trimmedLine.startsWith('%')) continue;
      if (trimmedLine.match(/^[a-z]\)|^[a-z]\./i) || trimmedLine.match(/question|problem|what|how|why|explain|describe|calculate|find|solve/i)) {
        if (currentQuestion.trim()) {
          const cleanText = cleanLatexText(currentQuestion);
          if (cleanText.length > 30) { questionCount++; questions.push({ text: `Q${questionCount}) ${cleanText}`, points: null }); }
        }
        currentQuestion = trimmedLine;
      } else if (currentQuestion && trimmedLine.length > 0) {
        currentQuestion += ' ' + trimmedLine;
      }
    }
    if (currentQuestion.trim()) {
      const cleanText = cleanLatexText(currentQuestion);
      if (cleanText.length > 30) { questionCount++; questions.push({ text: `Q${questionCount}) ${cleanText}`, points: null }); }
    }
    return questions;
  }

  static extractMainItems(enumerateContent) {
    const items = [];
    let nestedLevel = 0;
    let currentItem = '';
    let itemizeBulletLevel = 0;
    const lines = enumerateContent.split('\n');
    let isInMainItem = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      if (trimmedLine.includes('\\begin{enumerate}')) nestedLevel++;
      if (trimmedLine.includes('\\end{enumerate}')) nestedLevel--;
      if (trimmedLine.includes('\\begin{itemize}')) itemizeBulletLevel++;
      if (trimmedLine.includes('\\end{itemize}')) itemizeBulletLevel--;
      if (nestedLevel === 0 && itemizeBulletLevel === 0 && trimmedLine.match(/^\\item\s/)) {
        if (isInMainItem && currentItem.trim()) items.push(currentItem.trim());
        currentItem = line;
        isInMainItem = true;
      } else if (isInMainItem) {
        currentItem += '\n' + line;
      }
    }
    if (isInMainItem && currentItem.trim()) items.push(currentItem.trim());
    return items;
  }

  static distributePointsUniversally(extractedQuestions, frontendPointDistribution, requestedNumQuestions) {
    const distributedQuestions = [];
    const questionsToUse = Math.min(extractedQuestions.length, requestedNumQuestions);
    const selectedQuestions = extractedQuestions.slice(0, questionsToUse);
    const hasExplicitPoints = selectedQuestions.some(q => q.points !== null && q.points > 0);
    if (hasExplicitPoints) {
      for (let i = 0; i < selectedQuestions.length; i++) {
        const question = selectedQuestions[i];
        distributedQuestions.push({ id: i + 1, question: question.text, points: question.points > 0 ? question.points : (frontendPointDistribution[i % frontendPointDistribution.length] || 10) });
      }
    } else if (frontendPointDistribution.length > 0) {
      for (let i = 0; i < selectedQuestions.length; i++) {
        const question = selectedQuestions[i];
        distributedQuestions.push({ id: i + 1, question: question.text, points: frontendPointDistribution[i % frontendPointDistribution.length] || Math.round(100 / requestedNumQuestions) });
      }
    } else {
      const questionsByComplexity = selectedQuestions.map((q, idx) => ({ index: idx, text: q.text, complexity: this.assessQuestionComplexity(q.text), isSubPart: q.text.match(/Q\d+[a-z]\)/) ? true : false }));
      const totalComplexity = questionsByComplexity.reduce((sum, q) => sum + q.complexity, 0);
      const basePointValue = Math.round(100 / selectedQuestions.length);
      for (let i = 0; i < selectedQuestions.length; i++) {
        const question = selectedQuestions[i];
        const complexityInfo = questionsByComplexity[i];
        let points;
        if (totalComplexity > 0) points = Math.max(basePointValue, Math.round((complexityInfo.complexity / totalComplexity) * 100));
        else points = basePointValue;
        points = Math.max(points, complexityInfo.isSubPart ? 3 : 5);
        distributedQuestions.push({ id: i + 1, question: question.text, points });
      }
    }
    return distributedQuestions;
  }

  static distributePointsForInteractive(extractedQuestions, frontendPointDistribution) {
    const distributedQuestions = [];
    const allQuestions = extractedQuestions;
    const hasExplicitPoints = allQuestions.some(q => q.points !== null && q.points > 0);
    if (hasExplicitPoints) {
      for (let i = 0; i < allQuestions.length; i++) {
        const question = allQuestions[i];
        distributedQuestions.push({ id: i + 1, question: question.text, points: question.points > 0 ? question.points : (frontendPointDistribution[i % frontendPointDistribution.length] || 10) });
      }
    } else {
      const basePointValue = Math.max(5, Math.round(100 / allQuestions.length));
      for (let i = 0; i < allQuestions.length; i++) {
        const question = allQuestions[i];
        let points = basePointValue;
        if (question.text.match(/Q\d+[a-z]\)/)) points = Math.max(3, Math.round(basePointValue * 0.8));
        else if (question.text.match(/prove|derive|analyze|explain why|justify/i)) points = Math.max(basePointValue, Math.round(basePointValue * 1.5));
        if (frontendPointDistribution.length > 0) points = frontendPointDistribution[i % frontendPointDistribution.length] || points;
        distributedQuestions.push({ id: i + 1, question: question.text, points });
      }
    }
    return distributedQuestions;
  }

  static assessQuestionComplexity(questionText) {
    let complexity = 1;
    if (questionText.length > 200) complexity += 2; else if (questionText.length > 100) complexity += 1;
    const mathIndicators = questionText.match(/[Θθ∞≥≤→∑√⁽⁾₍₎]/g);
    if (mathIndicators) complexity += Math.min(mathIndicators.length * 0.5, 3);
    const codeIndicators = questionText.match(/algorithm|function|code|implement|complexity|runtime|proof|theorem/gi);
    if (codeIndicators) complexity += Math.min(codeIndicators.length * 0.8, 4);
    const multiPartIndicators = questionText.match(/\b(a\)|b\)|c\)|d\)|part|section|step)\b/gi);
    if (multiPartIndicators) complexity += Math.min(multiPartIndicators.length * 0.3, 2);
    if (questionText.match(/prove|derive|analyze|explain why|justify/i)) complexity += 3;
    else if (questionText.match(/calculate|compute|find|solve/i)) complexity += 2;
    else if (questionText.match(/list|identify|name|select/i)) complexity += 1;
    return Math.round(complexity);
  }

}

module.exports = AIController;

 

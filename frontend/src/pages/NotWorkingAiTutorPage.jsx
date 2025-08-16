import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AiTutorChat from '../components/AiTutorChat';
import { generateStudyPlan, explainConcept, generatePracticeQuestions, testGemini, processPracticeExam, downloadPDF } from '../services/api';
import { FaBookOpen, FaClipboardList, FaQuestion, FaLightbulb, FaSpinner, FaComments, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './AiTutorPage.css';
// Add pulse animation styles
const pulseStyles = `
  @keyframes pulse {
    0% {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(16, 185, 129, 0.7);
    }
    70% {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 10px rgba(16, 185, 129, 0.2);
    }
    100% {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(16, 185, 129, 0);
    }
  }
`;
// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = pulseStyles;
  document.head.appendChild(styleSheet);
}
// FALLBACK MULTIPLE CHOICE DETECTION (REGEX-BASED)
// Removed complex fallback function - using ONLY Gemini API now
// SIMPLE GEMINI-ONLY MULTIPLE CHOICE DETECTION
const detectAndGroupMultipleChoice = async (questionsArray) => {
  try {
    console.log('🔍 Starting smart multiple choice detection...');
    
    // Create the analysis prompt - ONLY relying on Gemini
    const analysisPrompt = `SMART MULTIPLE CHOICE DETECTION
You must distinguish between QUESTION SUBPARTS and MULTIPLE CHOICE OPTIONS.
QUESTIONS TO ANALYZE:
${questionsArray.map((q, i) => `${i + 1}. ${q}`).join('\n')}
CRITICAL DISTINCTION:
**QUESTION SUBPARTS** = Keep as separate questions:
- "(a) f(n) = 3(log₃ n)³, g(n) = n³" - This is a mathematical subpart of a larger problem
- "(b) f(n) = n, g(n) = n^(1/3)" - This is another mathematical subpart
- "(c) T(n) = 2T(n/2) + n, T(1) = 1" - This is a recurrence relation subpart
- These are SEPARATE mathematical problems to solve, NOT multiple choice options!
**TRUE MULTIPLE CHOICE** = Group as one question with options:
- "What is the capital of France? a) Paris b) London c) Berlin d) Madrid"
- This has a question followed by SHORT answer choices
- Options are alternative answers to ONE question
**KEY DIFFERENCES:**
- Subparts: Complex mathematical expressions, equations, separate problems to solve
- Multiple choice: Simple short answer choices to select from
RESPONSE FORMAT:
Return a JSON array where each item is either:
- Single question: {"type": "single", "question": "question text", "originalIndex": 0}
- Multiple choice: {"type": "multiple_choice", "question": "main question", "options": ["a) option1", "b) option2", "c) option3", "d) option4"], "originalIndex": 0}
EXAMPLES:
- "f(n) = 3(log₃ n)³, g(n) = n³" → {"type": "single"} (mathematical subpart)
- "What color is the sky? a) blue b) green c) red" → {"type": "multiple_choice"} (simple choices)
Analyze and return the JSON array:`;
    console.log('🤖 Sending analysis prompt to Gemini...');
    const response = await testGemini(analysisPrompt);
    
    if (response.success && response.data && response.data.response) {
      console.log('🔍 Raw AI Response:', response.data.response);
      try {
        // Extract JSON from response
        const jsonMatch = response.data.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          console.log('📋 Extracted JSON:', jsonMatch[0]);
          const groupedQuestions = JSON.parse(jsonMatch[0]);
          console.log('✅ Multiple choice detection successful:', groupedQuestions);
          
          // DEBUG: Log detection summary
          const multipleChoiceCount = groupedQuestions.filter(q => q.type === 'multiple_choice').length;
          const singleCount = groupedQuestions.filter(q => q.type === 'single').length;
          console.log(`🎯 DETECTION SUMMARY: ${multipleChoiceCount} multiple choice, ${singleCount} single questions`);
          
          return groupedQuestions;
        } else {
          console.warn('⚠️ No JSON found in response, using fallback (original format)');
          // Simple fallback - just return as single questions
          return questionsArray.map((question, index) => ({
            type: 'single',
            question: question,
            originalIndex: index
          }));
        }
      } catch (parseError) {
        console.error('❌ Error parsing multiple choice analysis:', parseError);
        console.log('🔧 Using simple fallback...');
        // Simple fallback - just return as single questions
        return questionsArray.map((question, index) => ({
          type: 'single',
          question: question,
          originalIndex: index
        }));
      }
    } else {
      console.warn('⚠️ Multiple choice detection failed, using simple fallback');
      // Simple fallback - just return as single questions
      return questionsArray.map((question, index) => ({
        type: 'single',
        question: question,
        originalIndex: index
      }));
    }
  } catch (error) {
    console.error('❌ Multiple choice detection error:', error);
    console.log('🔧 Using simple fallback due to error...');
    // Simple fallback - just return as single questions
    return questionsArray.map((question, index) => ({
      type: 'single',
      question: question,
      originalIndex: index
    }));
  }
};
// ENHANCED QUESTION DISPLAY COMPONENT WITH MULTIPLE CHOICE SUPPORT
const QuestionDisplay = ({ questionData, questionText, index, isExam = false, onAnswerChange, userAnswer, isGrading, onGrade }) => {
  const [processedText, setProcessedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState('');
  // Handle both new format (questionData) and old format (questionText)
  const isOldFormat = !questionData && questionText;
  const actualQuestionData = isOldFormat ? { type: 'single', question: questionText } : questionData;
  useEffect(() => {
    const processQuestion = async () => {
      if (hasProcessed) return;
      
      // If questionData is undefined, don't process
      if (!actualQuestionData || !actualQuestionData.question) {
        console.warn('QuestionDisplay: No valid question data provided');
        setProcessedText(questionText || 'No question text available');
        setHasProcessed(true);
        return;
      }
      
      setIsProcessing(true);
      try {
        const questionTextToProcess = actualQuestionData.question;
        const converted = await convertTableTextToHTML(questionTextToProcess);
        setProcessedText(converted);
        setHasProcessed(true);
      } catch (error) {
        console.error('Question processing error:', error);
        setProcessedText(actualQuestionData.question || questionText || 'Error processing question');
      } finally {
        setIsProcessing(false);
      }
    };
    processQuestion();
  }, [questionData, questionText, hasProcessed, actualQuestionData]);
  const handleMultipleChoiceChange = (choice) => {
    setSelectedChoice(choice);
    if (onAnswerChange) {
      onAnswerChange(index, choice);
    }
  };
  const handleTextAnswerChange = (e) => {
    if (onAnswerChange) {
      onAnswerChange(index, e.target.value);
    }
  };
  return (
    <div className="question-display">
      {/* Question Text */}
      <div className="question-text">
        {isProcessing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
            <div className="btn-spinner small"></div>
            <span>Processing question...</span>
          </div>
        ) : (
          <div 
            dangerouslySetInnerHTML={{ __html: processedText }}
            style={{ lineHeight: '1.6' }}
          />
        )}
      </div>
      {/* Multiple Choice Options */}
      {actualQuestionData && actualQuestionData.type === 'multiple_choice' && (
        <div className="multiple-choice-options">
          {actualQuestionData.options && actualQuestionData.options.map((option, optionIndex) => (
            <label key={optionIndex} className="choice-option">
              <input
                type="radio"
                name={`question-${index}`}
                value={option}
                checked={userAnswer === option || selectedChoice === option}
                onChange={() => handleMultipleChoiceChange(option)}
                disabled={isGrading}
              />
              <span className="choice-text">{option}</span>
            </label>
          ))}
        </div>
      )}
      {/* Text Answer (for non-multiple choice) */}
      {(!actualQuestionData || actualQuestionData.type === 'single' || isOldFormat) && (
        <div className="text-answer">
          <textarea
            value={userAnswer || ''}
            onChange={handleTextAnswerChange}
            className="answer-textarea"
            placeholder="Type your answer here..."
            disabled={isGrading}
            rows="4"
          />
        </div>
      )}
      {/* Grade Button */}
      {onGrade && userAnswer && (
        <button
          onClick={() => onGrade(index)}
          disabled={isGrading}
          className="grade-btn"
        >
          {isGrading ? (
            <>
              <div className="btn-spinner small"></div>
              Grading...
            </>
          ) : (
            <>
              <FaCheckCircle />
              Grade Answer
            </>
          )}
        </button>
      )}
    </div>
  );
};
// ENHANCED SMART QUESTION CONTAINER
const SmartQuestionContainer = ({ 
  questionsArray, 
  userAnswers, 
  onAnswerChange, 
  onGrade, 
  questionPoints, 
  userScores, 
  isExam = false 
}) => {
  const [groupedQuestions, setGroupedQuestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  useEffect(() => {
    const analyzeQuestions = async () => {
      if (hasAnalyzed || !questionsArray || questionsArray.length === 0) return;
      
      setIsAnalyzing(true);
      try {
        const analyzed = await detectAndGroupMultipleChoice(questionsArray);
        console.log('📊 DEBUG: Analysis complete, results:');
        analyzed.forEach((result, index) => {
          console.log(`   ${index + 1}. Type: ${result.type}, OriginalIndex: ${result.originalIndex}`);
          if (result.type === 'multiple_choice') {
            console.log(`      Question: "${result.question.substring(0, 50)}..."`);
            console.log(`      Options: ${result.options.join(' | ')}`);
          } else {
            console.log(`      Question: "${result.question.substring(0, 50)}..."`);
          }
        });
        setGroupedQuestions(analyzed);
        setHasAnalyzed(true);
      } catch (error) {
        console.error('Question analysis error:', error);
        // Fallback to original format
        const fallback = questionsArray.map((q, i) => ({
          type: 'single',
          question: q,
          originalIndex: i
        }));
        setGroupedQuestions(fallback);
      } finally {
        setIsAnalyzing(false);
      }
    };
    analyzeQuestions();
  }, [questionsArray, hasAnalyzed]);
  if (isAnalyzing) {
    return (
      <div className="analyzing-questions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
          <div className="btn-spinner"></div>
          <span>🤖 Analyzing questions and detecting multiple choice patterns...</span>
        </div>
      </div>
    );
  }
  return (
    <div className="questions-list">
      {groupedQuestions.map((questionData, index) => (
        <div key={index} className="question-item">
          <div className="question-header">
            <div className="question-number">
              <span>Q{index + 1}</span>
              {questionData && questionData.type === 'multiple_choice' && (
                <span className="question-type-indicator">Multiple Choice</span>
              )}
              {questionData && questionData.originalIndex !== undefined && questionPoints[questionData.originalIndex] && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  fontWeight: 'normal',
                  marginTop: '2px'
                }}>
                  ({questionPoints[questionData.originalIndex]} pts)
                </div>
              )}
            </div>
          </div>
          
          <QuestionDisplay
            questionData={questionData}
            index={questionData ? questionData.originalIndex : index}
            isExam={isExam}
            onAnswerChange={onAnswerChange}
            userAnswer={questionData ? (userAnswers[questionData.originalIndex]?.answer || '') : ''}
            isGrading={questionData ? (userAnswers[questionData.originalIndex]?.isGrading || false) : false}
            onGrade={onGrade}
          />
          
          {/* Show feedback if available */}
          {questionData && userAnswers[questionData.originalIndex]?.feedback && (
            <div className="feedback-section">
              <div className="feedback-content">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: userAnswers[questionData.originalIndex].feedback 
                  }}
                />
              </div>
              {userScores[questionData.originalIndex] !== undefined && (
                <div className="score-display">
                  Score: {userScores[questionData.originalIndex]}/{questionPoints[questionData.originalIndex] || 10} points
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
// ENHANCED TABLE CONVERSION FUNCTION
const convertTableTextToHTML = async (questionText) => {
  // Quick check if question likely contains table data
  const tableKeywords = ['table', 'Task', 'Time', 'Process', 'Job', 'Priority', 'Duration', 'Resource', 'Activity', 'Schedule', 'Queue', 'Buffer', 'Cache', 'Memory', 'CPU', 'Thread', 'Algorithm', 'Data', 'Variable', 'Function', 'Class', 'Object', 'Array', 'List', 'Stack', 'Heap', 'Database', 'SQL', 'Query', 'Result', 'Output', 'Input', 'Parameter', 'Argument', 'Return', 'Value', 'Type', 'Size', 'Length', 'Width', 'Height', 'Capacity', 'Limit', 'Range', 'Minimum', 'Maximum', 'Average', 'Total', 'Sum', 'Count', 'Number', 'Index', 'Position', 'Location', 'Address', 'Pointer', 'Reference', 'Link', 'Connection', 'Network', 'Protocol', 'Port', 'Host', 'Client', 'Server', 'Request', 'Response', 'Status', 'Error', 'Exception', 'Debug', 'Test', 'Validation', 'Verification', 'Optimization', 'Performance', 'Efficiency', 'Speed', 'Latency', 'Throughput', 'Bandwidth', 'Frequency', 'Rate', 'Percentage', 'Ratio', 'Proportion', 'Scale', 'Factor', 'Coefficient', 'Constant', 'Variable', 'Parameter', 'Attribute', 'Property', 'Field', 'Column', 'Row', 'Cell', 'Entry', 'Record', 'Item', 'Element', 'Component', 'Module', 'Library', 'Framework', 'System', 'Platform', 'Environment', 'Configuration', 'Setting', 'Option', 'Choice', 'Selection', 'Decision', 'Condition', 'Requirement', 'Specification', 'Standard', 'Format', 'Structure', 'Layout', 'Design', 'Pattern', 'Template', 'Model', 'Schema', 'Format', 'Syntax', 'Grammar', 'Language', 'Code', 'Script', 'Program', 'Software', 'Application', 'Tool', 'Utility', 'Service', 'Function', 'Method', 'Procedure', 'Algorithm', 'Logic', 'Flow', 'Process', 'Step', 'Phase', 'Stage', 'Level', 'Layer', 'Tier', 'Hierarchy', 'Tree', 'Graph', 'Node', 'Edge', 'Path', 'Route', 'Direction', 'Navigation', 'Search', 'Sort', 'Filter', 'Group', 'Cluster', 'Partition', 'Segment', 'Section', 'Division', 'Category', 'Class', 'Type', 'Kind', 'Sort', 'Variety', 'Genre', 'Style', 'Mode', 'Method', 'Approach', 'Technique', 'Strategy', 'Tactic', 'Solution', 'Answer', 'Result', 'Outcome', 'Effect', 'Impact', 'Influence', 'Factor', 'Cause', 'Reason', 'Purpose', 'Goal', 'Objective', 'Target', 'Aim', 'Intent', 'Plan', 'Strategy', 'Approach', 'Method', 'Way', 'Means', 'Mechanism', 'Process', 'Procedure', 'Protocol', 'Rule', 'Policy', 'Guideline', 'Principle', 'Standard', 'Criterion', 'Measure', 'Metric', 'Indicator', 'Signal', 'Flag', 'Mark', 'Label', 'Tag', 'Name', 'Title', 'Header', 'Footer', 'Body', 'Content', 'Text', 'String', 'Character', 'Symbol', 'Sign', 'Icon', 'Image', 'Picture', 'Photo', 'Graphic', 'Chart', 'Graph', 'Diagram', 'Map', 'Plan', 'Blueprint', 'Sketch', 'Drawing', 'Illustration', 'Figure', 'Shape', 'Form', 'Structure', 'Format', 'Layout', 'Design', 'Style', 'Appearance', 'Look', 'View', 'Display', 'Show', 'Present', 'Exhibit', 'Demonstrate', 'Illustrate', 'Explain', 'Describe', 'Define', 'Specify', 'Detail', 'Elaborate', 'Expand', 'Extend', 'Develop', 'Build', 'Create', 'Generate', 'Produce', 'Make', 'Construct', 'Form', 'Shape', 'Mold', 'Cast', 'Forge', 'Craft', 'Design', 'Plan', 'Organize', 'Arrange', 'Order', 'Sort', 'Rank', 'Priority', 'Importance', 'Significance', 'Weight', 'Value', 'Worth', 'Cost', 'Price', 'Fee', 'Charge', 'Rate', 'Amount', 'Quantity', 'Number', 'Count', 'Total', 'Sum', 'Average', 'Mean', 'Median', 'Mode', 'Range', 'Variance', 'Deviation', 'Error', 'Difference', 'Gap', 'Distance', 'Space', 'Interval', 'Period', 'Duration', 'Length', 'Time', 'Moment', 'Instant', 'Point', 'Spot', 'Location', 'Place', 'Position', 'Site', 'Area', 'Region', 'Zone', 'Sector', 'Domain', 'Field', 'Scope', 'Range', 'Extent', 'Limit', 'Boundary', 'Border', 'Edge', 'Margin', 'Frame', 'Border', 'Outline', 'Contour', 'Shape', 'Form', 'Figure', 'Pattern', 'Template', 'Model', 'Example', 'Sample', 'Instance', 'Case', 'Situation', 'Scenario', 'Context', 'Background', 'Setting', 'Environment', 'Condition', 'State', 'Status', 'Mode', 'Phase', 'Stage', 'Step', 'Level', 'Grade', 'Degree', 'Extent', 'Measure', 'Scale', 'Size', 'Dimension', 'Aspect', 'Feature', 'Characteristic', 'Quality', 'Attribute', 'Property', 'Trait', 'Element', 'Component', 'Part', 'Piece', 'Section', 'Segment', 'Fragment', 'Portion', 'Share', 'Part', 'Division', 'Split', 'Separation', 'Break', 'Cut', 'Slice', 'Chunk', 'Block', 'Unit', 'Module', 'Package', 'Bundle', 'Set', 'Group', 'Collection', 'Series', 'Sequence', 'Order', 'Chain', 'Link', 'Connection', 'Relationship', 'Association', 'Bond', 'Tie', 'Attachment', 'Join', 'Union', 'Merge', 'Combination', 'Mix', 'Blend', 'Fusion', 'Integration', 'Synthesis', 'Composition', 'Structure', 'Organization', 'Arrangement', 'Layout', 'Design', 'Format', 'Style', 'Appearance', 'Look', 'View', 'Perspective', 'Angle', 'Viewpoint', 'Opinion', 'Thought', 'Idea', 'Concept', 'Notion', 'Theory', 'Hypothesis', 'Assumption', 'Belief', 'Understanding', 'Knowledge', 'Information', 'Data', 'Facts', 'Details', 'Specifics', 'Particulars', 'Features', 'Characteristics', 'Properties', 'Attributes', 'Qualities', 'Traits', 'Aspects', 'Elements', 'Components', 'Parts', 'Pieces', 'Sections', 'Segments', 'Divisions', 'Categories', 'Classes', 'Types', 'Kinds', 'Sorts', 'Varieties', 'Forms', 'Shapes', 'Formats', 'Styles', 'Modes', 'Methods', 'Ways', 'Approaches', 'Techniques', 'Strategies', 'Tactics', 'Plans', 'Schemes', 'Systems', 'Processes', 'Procedures', 'Protocols', 'Rules', 'Policies', 'Guidelines', 'Principles', 'Standards', 'Criteria', 'Measures', 'Metrics', 'Indicators', 'Signals', 'Flags', 'Marks', 'Labels', 'Tags', 'Names', 'Titles', 'Headers', 'Footers', 'Bodies', 'Contents', 'Texts', 'Strings', 'Characters', 'Symbols', 'Signs', 'Icons', 'Images', 'Pictures', 'Photos', 'Graphics', 'Charts', 'Graphs', 'Diagrams', 'Maps', 'Plans', 'Blueprints', 'Sketches', 'Drawings', 'Illustrations', 'Figures'];
  
  const hasTableKeyword = tableKeywords.some(keyword => 
    questionText.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // If no table keywords, return original text
  if (!hasTableKeyword) {
    return questionText;
  }
  try {
    const tableConversionPrompt = `TASK: Convert table-like text to HTML table format. Keep all other text exactly the same.
QUESTION: ${questionText}
RULES:
- Convert ONLY table-like data to HTML tables
- Keep all other text exactly as it appears  
- Use <table class="question-table"> for styling
- Return ONLY the processed text, no explanations
EXAMPLE:
Input: "Task A takes 5 minutes, Task B takes 8 minutes"
Output: <table class="question-table"><tr><td>Task A</td><td>5 minutes</td></tr><tr><td>Task B</td><td>8 minutes</td></tr></table>
Process the question:`;
    const response = await testGemini(tableConversionPrompt);
    
    if (response.success && response.data && response.data.response) {
      return response.data.response;
    } else {
      return questionText;
    }
  } catch (error) {
    console.error('Table conversion error:', error);
    return questionText;
  }
};
// OLD TABLE CONVERSION FUNCTION - REMOVED AND REPLACED WITH ENHANCED VERSION
// OLD QUESTION DISPLAY COMPONENT - REMOVED AND REPLACED WITH ENHANCED VERSION
// DEBUG: Test function to check multiple choice detection 
window.debugMultipleChoiceDetection = (testQuestions) => {
  console.log('🧪 DEBUG: Testing multiple choice detection with provided questions...');
  if (!testQuestions || !Array.isArray(testQuestions)) {
    console.error('❌ Please provide an array of questions to test');
    return;
  }
  
  testQuestions.forEach((question, index) => {
    console.log(`${index + 1}. [${question.length} chars] "${question}"`);
  });
  
  // You can call this function to test detection
  console.log('🔍 Call detectAndGroupMultipleChoice manually to test these questions');
};
// Helper function to parse numbered questions
const parseNumberedQuestions = (data) => {
  // Handle the new object format from backend
  let text = '';
  if (typeof data === 'string') {
    text = data;
  } else if (data && typeof data === 'object' && data.text) {
    text = data.text;
  } else if (data && typeof data === 'object') {
    // If it's an object but no .text property, try to stringify it
    text = JSON.stringify(data);
  } else {
    console.warn('parseNumberedQuestions received invalid data:', data);
    return [];
  }
  
  if (!text) return [];
  
  console.log('=== PARSING QUESTIONS ===');
  console.log('Input text length:', text.length);
  console.log('Input text preview:', text.substring(0, 200));
  
  const questions = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Stop at answer sections
    if (line.match(/\*\*answer\s+key/i) || 
        line.match(/\*\*answer\s+space/i) ||
        line.match(/^answer\s*:/i) ||
        line.match(/^---/) ||
        line.match(/answer.*instructor.*use.*only/i)) {
      console.log('Stopping at answer section:', line);
      break;
    }
    
    // Skip headers and course codes - these should NOT be interactive questions
    if (line.match(/CSCI-UA\.\d+-\d+/i) || 
        line.match(/practice\s+exam/i) ||
        line.match(/total:\s*\d+\s*points/i) ||
        line.match(/important\s+notes/i) ||
        line.match(/name:\s*_+/i) ||
        line.match(/date:\s*_+/i) ||
        line.match(/^\*\*.*\*\*$/) ||
        line.match(/honor\s+code/i) ||
        line.match(/ground\s+rules/i) ||
        line.match(/generated\s+on/i) ||
        line.match(/difficulty:/i)) {
      console.log('Skipping header:', line);
      continue;
    }
    
    // Look for "Problem X" format (the main format from updated AI)
    const problemMatch = line.match(/^Problem\s+(\d+)$/i);
    if (problemMatch) {
      const problemNum = parseInt(problemMatch[1]);
      console.log(`Found Problem ${problemNum} at line ${i}`);
      let fullQuestion = '';
      
      // Look ahead to collect all parts of this problem
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        
        // Stop if we hit another Problem or answer section
        if (nextLine.match(/^Problem\s+\d+$/i) || 
            nextLine.match(/\*\*answer/i) ||
            nextLine.match(/^---/) ||
            nextLine.match(/^\d+\./)) {
          break;
        }
        
        // Skip empty lines and answer spaces (lines with just underscores)
        if (!nextLine || nextLine.match(/^_+$/)) {
          j++;
          continue;
        }
        
        // Add content to the question (remove AI-generated point brackets to avoid duplication)
        if (nextLine.length > 3) {
          // Remove AI point brackets [X] since we'll use frontend point system
          const cleanLine = nextLine.replace(/\[(\d+)\s*points?\]/gi, '').replace(/\[(\d+)\]/g, '');
          if (cleanLine.trim()) {
            fullQuestion += (fullQuestion ? ' ' : '') + cleanLine.trim();
          }
        }
        j++;
        
        // Stop after reasonable content length
        if (fullQuestion.length > 1000) break;
      }
      
      if (fullQuestion.trim()) {
        questions.push(fullQuestion.trim());
        console.log(`Added Problem ${problemNum}: ${fullQuestion.substring(0, 50)}...`);
        i = j - 1; // Skip ahead to avoid re-processing
      }
      continue;
    }
    
    // Look for traditional "X." format
    const numberMatch = line.match(/^(\d+)\.\s*(.*)/);
    if (numberMatch) {
      const questionNum = parseInt(numberMatch[1]);
      console.log(`Found Question ${questionNum} at line ${i}`);
      let questionText = numberMatch[2] || '';
      
      // Remove AI point brackets to avoid duplication
      questionText = questionText.replace(/\[(\d+)\s*points?\]/gi, '').replace(/\[(\d+)\]/g, '');
      
      // Look ahead for continuation lines
      let j = i + 1;
      while (j < lines.length && j < i + 8) { // Increased lookahead
        const nextLine = lines[j].trim();
        
        // Stop if we hit another numbered question or answer section
        if (!nextLine || 
            nextLine.match(/^\d+\./) || 
            nextLine.match(/^Problem\s+\d+$/i) ||
            nextLine.match(/\*\*answer/i) ||
            nextLine.match(/^---/)) {
          break;
        }
        
        if (nextLine.length > 3 && !nextLine.match(/^_+$/)) {
          const cleanLine = nextLine.replace(/\[(\d+)\s*points?\]/gi, '').replace(/\[(\d+)\]/g, '');
          if (cleanLine.trim()) {
            questionText += ' ' + cleanLine.trim();
          }
        }
        j++;
      }
      
      if (questionText.trim()) {
        questions.push(questionText.trim());
        console.log(`Added Question ${questionNum}: ${questionText.substring(0, 50)}...`);
        i = j - 1;
      }
    }
  }
  
  console.log(`=== PARSING COMPLETE ===`);
  console.log(`Total questions found: ${questions.length}`);
  console.log('Questions preview:', questions.map((q, i) => `Q${i+1}: ${q.substring(0, 30)}...`));
  
  // Fallback if no structured questions found
  if (questions.length === 0) {
    console.log('No structured questions found, using fallback parsing');
    const fallbackQuestions = text.split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 15) // Increased minimum length
      .filter(q => !q.match(/CSCI-UA\.\d+-\d+/i))
      .filter(q => !q.match(/practice\s+exam/i))
      .filter(q => !q.match(/total:\s*\d+\s*points/i))
      .filter(q => !q.match(/important\s+notes/i))
      .filter(q => !q.match(/generated\s+on/i))
      .filter(q => !q.match(/difficulty:/i))
      .slice(0, 20); // Limit fallback to reasonable number
    
    console.log(`Fallback found ${fallbackQuestions.length} questions`);
    return fallbackQuestions;
  }
  
  return questions;
};
// Helper function to generate point distribution for questions
const generatePointDistribution = (numQuestions, totalPoints = 100) => {
  if (numQuestions === 0) return [];
  
  const points = [];
  let remainingPoints = totalPoints;
  
  // For different question counts, create varied point distributions
  if (numQuestions <= 5) {
    // For 5 or fewer questions, use larger point values
    const basePoints = Math.floor(totalPoints / numQuestions);
    for (let i = 0; i < numQuestions - 1; i++) {
      const questionPoints = basePoints + (Math.random() > 0.5 ? 5 : -5);
      points.push(Math.max(10, questionPoints));
      remainingPoints -= points[i];
    }
    points.push(Math.max(5, remainingPoints)); // Last question gets remaining points
  } else if (numQuestions <= 10) {
    // For 6-10 questions, mix of different point values
    const pointOptions = [15, 12, 10, 8, 5];
    for (let i = 0; i < numQuestions - 1; i++) {
      const randomPoints = pointOptions[Math.floor(Math.random() * pointOptions.length)];
      points.push(randomPoints);
      remainingPoints -= randomPoints;
    }
    points.push(Math.max(5, remainingPoints)); // Adjust last question
  } else {
    // For more than 10 questions, smaller point values
    const avgPoints = Math.floor(totalPoints / numQuestions);
    for (let i = 0; i < numQuestions - 1; i++) {
      const variation = Math.floor(Math.random() * 6) - 3; // -3 to +3
      const questionPoints = Math.max(3, avgPoints + variation);
      points.push(questionPoints);
      remainingPoints -= questionPoints;
    }
    points.push(Math.max(3, remainingPoints));
  }
  
  // Ensure total is exactly 100
  const currentTotal = points.reduce((sum, p) => sum + p, 0);
  if (currentTotal !== totalPoints) {
    const diff = totalPoints - currentTotal;
    points[points.length - 1] += diff;
  }
  
  return points;
};
// Helper function to extract point distribution from PDF content
const extractPointsFromPDF = (content) => {
  if (!content) return null;
  
  const points = [];
  const lines = content.split('\n');
  
  // Extract AI-generated points [X] from the content
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Stop at answer sections
    if (line.match(/\*\*answer\s+key/i) || 
        line.match(/\*\*answer\s+space/i) ||
        line.match(/^answer\s*:/i) ||
        line.match(/^---/) ||
        line.match(/answer.*instructor.*use.*only/i)) {
      break;
    }
    
    // Skip headers
    if (line.match(/CSCI-UA\.\d+-\d+/i) || 
        line.match(/practice\s+exam/i) ||
        line.match(/total:\s*\d+\s*points/i) ||
        line.match(/important\s+notes/i) ||
        line.match(/honor\s+code/i)) {
      continue;
    }
    
    // Look for "Problem X" format and collect points from its content
    const problemMatch = line.match(/^Problem\s+(\d+)$/i);
    if (problemMatch) {
      let problemPoints = 0;
      
      // Look ahead to collect all points for this problem
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        
        // Stop if we hit another Problem
        if (nextLine.match(/^Problem\s+\d+$/i)) {
          break;
        }
        
        // Extract all [X] point values in this problem
        const pointMatches = nextLine.match(/\[(\d+)\]/g);
        if (pointMatches) {
          for (const match of pointMatches) {
            const pointValue = parseInt(match.replace(/[\[\]]/g, ''));
            problemPoints += pointValue;
          }
        }
        
        j++;
      }
      
      if (problemPoints > 0) {
        points.push(problemPoints);
        console.log(`Extracted ${problemPoints} points for Problem ${problemMatch[1]}`);
      }
      
      i = j - 1; // Skip ahead
      continue;
    }
    
    // Look for individual question format "X. [Y points]" or direct "[X]" patterns
    const directPointMatch = line.match(/^(\d+)\.\s*.*\[(\d+)\]/);
    if (directPointMatch) {
      points.push(parseInt(directPointMatch[2]));
      continue;
    }
    
    // Look for standalone point patterns at the start of content lines
    const standaloneMatch = line.match(/^\[(\d+)\]/);
    if (standaloneMatch) {
      points.push(parseInt(standaloneMatch[1]));
      continue;
    }
  }
  
  // If we found AI-generated points, return them
  if (points.length > 0) {
    console.log('Found AI-generated points:', points);
    console.log('Total AI points:', points.reduce((sum, p) => sum + p, 0));
    return points;
  }
  
  // Fallback to section-based extraction if no individual points found
  console.log('No AI-generated points found, falling back to section-based extraction');
  
  const sectionPoints = [];
  let currentSectionPointsEach = 0;
  
  for (const line of lines) {
    // Stop processing if we hit answer sections
    if (line.match(/\*\*answer\s+key/i) || 
        line.match(/\*\*answer\s+space/i) ||
        line.match(/^answer\s*:/i) ||
        line.match(/^\s*\d+\.\s*_+\s*$/) ||
        line.match(/^---/) ||
        line.match(/answer.*instructor.*use.*only/i)) {
      console.log('Stopping point extraction at:', line.substring(0, 50));
      break;
    }
    
    // Look for section headers with points like "Section 1: Multiple Choice (1 point each)"
    const sectionMatch = line.match(/section\s+\d+.*\((\d+)\s*points?\s*each\)/i);
    if (sectionMatch) {
      currentSectionPointsEach = parseInt(sectionMatch[1]);
      continue;
    }
    
    // Count numbered questions in this section (only if we have section points)
    if (currentSectionPointsEach > 0 && (line.match(/^\s*\d+\./) || line.match(/^Problem\s+\d+:/i))) {
      sectionPoints.push(currentSectionPointsEach);
    }
    
    // Reset section points when we hit a new section without points
    if (line.match(/section\s+\d+/i) && !line.match(/points?\s*each/i)) {
      currentSectionPointsEach = 0;
    }
  }
  
  // Scale points to total 100 if we found section-based points
  if (sectionPoints.length > 0) {
    const total = sectionPoints.reduce((sum, p) => sum + p, 0);
    console.log('Section-based points total:', total);
    
    if (total > 0 && total !== 100) {
      // Scale to 100 points proportionally
      const scaledPoints = sectionPoints.map(p => Math.round(p * 100 / total));
      
      // Adjust for rounding errors to ensure total is exactly 100
      const scaledTotal = scaledPoints.reduce((sum, p) => sum + p, 0);
      if (scaledTotal !== 100) {
        const diff = 100 - scaledTotal;
        // Add the difference to the largest point value
        const maxIndex = scaledPoints.indexOf(Math.max(...scaledPoints));
        scaledPoints[maxIndex] += diff;
      }
      
      console.log('Scaled section points to 100:', scaledPoints);
      return scaledPoints;
    }
    return sectionPoints;
  }
  
  return null;
};
// Helper function to parse structured grading feedback
const parseGradingFeedback = (text) => {
  if (!text) return {};
  const feedback = {};
  // Split the response by the delimiter '---'
  const sections = text.split(/\n---\n/);
  
  sections.forEach(section => {
    // Try to match 'Feedback for Question X:'
    const match = section.match(/^Feedback for Question (\d+):\s*(.*)/s);
    if (match) {
      const questionIndex = parseInt(match[1], 10) - 1; // Get 0-based index
      if (!isNaN(questionIndex)) {
        feedback[questionIndex] = match[2].trim(); // Store feedback text
      }
    }
  });
  return feedback;
};
// Helper function to determine if feedback indicates a correct answer
const isCorrectAnswer = (feedbackText) => {
  if (!feedbackText) return false;
  
  const normalizedText = feedbackText.trim().toLowerCase();
  
  // Check for actual evaluation result patterns
  // Look for "correct:" at the beginning of a line, indicating the final evaluation
  const lines = normalizedText.split('\n');
  let foundActualEvaluation = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    // This looks for a line that actually starts with "correct:" with no other text before it
    if (trimmedLine.startsWith('correct:')) {
      console.log("Found actual correct evaluation:", trimmedLine);
      foundActualEvaluation = true;
      break;
    }
  }
  
  // Log detailed information
  console.log("Feedback check:", {
    text: feedbackText.substring(0, 50) + "...",
    normalized: normalizedText.substring(0, 50) + "...",
    lines: lines.length,
    result: foundActualEvaluation
  });
  
  return foundActualEvaluation;
};
const AiTutorPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [error, setError] = useState(null);
  // Read tab from URL parameters on component mount and on URL changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    
    // Only set the tab if it's a valid option
    if (tabParam && ['chat', 'studyPlan', 'concept', 'practice', 'practiceExam'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);
  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update URL without refreshing page
    navigate(`/ai-tutor?tab=${tab}`, { replace: true });
  };
  // Lifted state for chat input
  const [chatMessage, setChatMessage] = useState('');
  // Lifted state for chat history
  const [chatHistory, setChatHistory] = useState([]);
  // Change userAnswers structure to: { index: { answer: string, feedback: string | null, isGrading: boolean } }
  const [userAnswers, setUserAnswers] = useState({}); 
  const [questionPoints, setQuestionPoints] = useState([]); // Points for each practice question
  const [userScores, setUserScores] = useState({}); // Scores for each question
  // Study Plan Form
  const [studyPlanForm, setStudyPlanForm] = useState({
    topic: '',
    durationDays: 7,
    hoursPerDay: 2,
    goal: '',
  });
  // Concept explanation form
  const [conceptForm, setConceptForm] = useState({
    concept: '',
    context: '',
  });
  // Practice questions form
  const [questionsForm, setQuestionsForm] = useState({
    topic: '',
    count: 5,
    difficulty: 'medium',
  });
  // Practice Exam form and result
  const [practiceExamForm, setPracticeExamForm] = useState({
    subject: '',
    pdf: null,
    numQuestions: 10,
    difficulty: 'medium',
    instructions: '',
    generatePDF: false,
  });
  const [practiceExamResult, setPracticeExamResult] = useState(null);
  const [practiceExamLoading, setPracticeExamLoading] = useState(false);
  const [practiceExamError, setPracticeExamError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Practice Exam interactive answers (similar to practice questions)
  const [practiceExamAnswers, setPracticeExamAnswers] = useState({});
  const [practiceExamPoints, setPracticeExamPoints] = useState([]); // Points for each practice exam question
  const [practiceExamScores, setPracticeExamScores] = useState({}); // Scores for each exam question
  const handleStudyPlanSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setActionResult(null);
    try {
      let promptString = `Create a study plan for the topic "${studyPlanForm.topic}" covering ${studyPlanForm.durationDays} days at ${studyPlanForm.hoursPerDay} hours per day.`;
      if (studyPlanForm.goal) {
        promptString += ` The goal is: ${studyPlanForm.goal}.`;
      }
      promptString += ` Provide a detailed day-by-day breakdown.`
      
      console.log("Sending study plan prompt to testGemini:", promptString);
      
      const response = await testGemini(promptString);
      console.log("Study Plan API Response (using testGemini):", response);
      if (response.success) {
        setActionResult({
          type: 'studyPlan',
          content: response.data.response
        });
      } else {
        setError(response.message || 'Failed to generate study plan via test endpoint');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Study plan error (using test endpoint):', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleConceptSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setActionResult(null);
    try {
      let promptString = `Explain the concept "${conceptForm.concept}"`;
      if (conceptForm.context) {
        promptString += ` in the context of ${conceptForm.context}.`;
      }
      promptString += ` Explain it clearly.`
      
      console.log("Sending concept prompt to testGemini:", promptString);
      
      const response = await testGemini(promptString);
      console.log("Concept API Response (using testGemini):", response);
      if (response.success) {
        setActionResult({
          type: 'explanation',
          content: response.data.response
        });
      } else {
        setError(response.message || 'Failed to explain concept via test endpoint');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Concept explanation error (using test endpoint):', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleQuestionsSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setActionResult(null);
    setUserAnswers({}); 
    setQuestionPoints([]);
    setUserScores({});
    
    try {
      // Enhanced prompt with more explicit instructions for well-formed questions
      let promptString = `Generate ${questionsForm.count} complete practice questions about "${questionsForm.topic}" at a ${questionsForm.difficulty} difficulty level.
IMPORTANT FORMATTING INSTRUCTIONS:
1. Number each question clearly (e.g., "1.", "2.", "3.")
2. Each question MUST be complete, detailed, and self-contained 
3. Include all necessary context within each question
4. Each question should be at least 2-3 sentences long
5. Don't use single letters, abbreviations, or incomplete sentences as questions
6. Make sure each question has a clear, specific answer that can be evaluated
7. Review all questions before finalizing to ensure they are complete
For example, instead of "Question 8: c", write "Question 8: Calculate the derivative of f(x) = x² + 3x - 5 using the power rule. Show your work and provide the final answer."
Topic: ${questionsForm.topic}
Difficulty: ${questionsForm.difficulty}
Number of questions: ${questionsForm.count}
Generate ${questionsForm.count} high-quality practice questions now:`;
      
      console.log("Sending enhanced questions prompt to testGemini:", promptString);
      
      // Call the simple testGemini function
      const response = await testGemini(promptString);
      
      console.log("Questions API Response (using testGemini):", response);
      if (response.success) {
        const generatedText = response.data.response;
        
        // Basic validation of the generated questions
        const questionsArray = parseNumberedQuestions(generatedText);
        
        // Check if we have the right number of questions and they're not too short
        if (questionsArray.length < questionsForm.count) {
          // If we don't have enough questions, show a warning but still display what we got
          setError(`Warning: Only ${questionsArray.length} questions were generated instead of the requested ${questionsForm.count}.`);
        }
        
        // Check for very short questions (likely errors)
        const shortQuestions = questionsArray.filter(q => q.length < 20).map((q, i) => i + 1);
        if (shortQuestions.length > 0) {
          setError(`Warning: Questions ${shortQuestions.join(', ')} appear to be too short or incomplete. You may want to regenerate.`);
        }
        
        setActionResult({
          type: 'questions',
          content: generatedText
        });
        
        // Initialize answers structure with isGrading flag
        const initialAnswers = {};
        const initialScores = {};
        const points = generatePointDistribution(questionsArray.length);
        
        questionsArray.forEach((_, index) => {
          initialAnswers[index] = { answer: '', feedback: null, isGrading: false }; 
          initialScores[index] = 0; // Start with 0 points
        });
        
        setUserAnswers(initialAnswers);
        setQuestionPoints(points);
        setUserScores(initialScores);
      } else {
        setError(response.message || 'Failed to generate questions via test endpoint');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Practice questions error (using test endpoint):', error);
    } finally {
      setIsLoading(false);
    }
  };
  // Update answer change handler
  const handleAnswerChange = (index, value) => {
    setUserAnswers(prev => ({ 
      ...prev,
      [index]: { ...(prev[index] || { feedback: null, isGrading: false }), answer: value } 
    }));
  };
  
  // Enhanced grading function that handles both multiple choice and open-ended questions
  const handleGradeSingleAnswer = async (index) => {
    // Set loading state for this specific answer
    setUserAnswers(prev => ({ 
      ...prev, 
      [index]: { ...prev[index], isGrading: true, feedback: null } // Set isGrading, clear old feedback
    }));
    setError(null); // Clear general errors
    
    // Get the specific question and answer
    const questionsArray = parseNumberedQuestions(actionResult?.content || '');
    const questionText = questionsArray[index];
    const answerText = userAnswers[index]?.answer || '(No answer provided)';
    const maxPoints = questionPoints[index] || 10;
    if (!questionText) {
      setError(`Could not find question text for index ${index}.`);
       setUserAnswers(prev => ({ ...prev, [index]: { ...prev[index], isGrading: false } }));
      return;
    }
    
    // Check if this is a multiple choice question by looking at the answer format
    const isMultipleChoice = answerText.match(/^[A-D]\)/);
    
    // Create different grading prompts based on question type
    let gradingPrompt;
    
    if (isMultipleChoice) {
      // Multiple choice grading prompt
      gradingPrompt = `GRADE THIS MULTIPLE CHOICE ANSWER
QUESTION: ${questionText}
STUDENT ANSWER: "${answerText}"
MAX POINTS: ${maxPoints}
MULTIPLE CHOICE GRADING:
1. Identify the correct answer choice
2. Check if the student selected the correct option
3. Award full points for correct answer, zero for incorrect
RESPONSE FORMAT:
CORRECT ANSWER: [A), B), C), or D) with explanation]
STUDENT SELECTED: ${answerText}
POINTS: ${answerText === '[CORRECT_ANSWER]' ? maxPoints : 0}/${maxPoints}
FEEDBACK: [Brief explanation of why this is correct/incorrect]`;
    } else {
      // Open-ended question grading prompt
      gradingPrompt = `GRADE THIS ANSWER - OBJECTIVE CHECKLIST
QUESTION: ${questionText}
STUDENT ANSWER: "${answerText}"
MAX POINTS: ${maxPoints}
OBJECTIVE GRADING CHECKLIST:
1. First, identify what the question is asking for (list the main requirements)
2. For each requirement, check if the student answer addresses it (YES/NO)
3. Count how many requirements are addressed
4. Use this EXACT scoring:
   - Addresses ALL requirements = FULL POINTS (${maxPoints}/${maxPoints})
   - Addresses 75%+ of requirements = 80% of max points
   - Addresses 50%+ of requirements = 60% of max points  
   - Addresses 25%+ of requirements = 30% of max points
   - Addresses less than 25% = 0-10% of max points
CRITICAL RULE: If the answer covers all the main topics asked, give FULL points. Don't deduct for style or extra detail.
RESPONSE FORMAT:
REQUIREMENTS: [List what the question asks for]
STUDENT COVERAGE: [Which requirements are met - YES/NO for each]
POINTS: X/${maxPoints}
FEEDBACK: [Brief explanation]
CORRECT ANSWER: [Complete but concise answer - 1-3 sentences]`;
    }
    console.log(`Sending grading prompt for Q${index + 1} to testGemini:`, gradingPrompt);
    // Add retry logic with exponential backoff
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    while (retryCount <= maxRetries) {
    try {
      const response = await testGemini(gradingPrompt);
        console.log(`Grading API Response Q${index + 1} (attempt ${retryCount + 1}):`, response);
        if (response.success && response.data && response.data.response) {
         console.log("Raw feedback:", response.data.response);
           
           // Validate response format
           if (!response.data.response.includes('POINTS:')) {
             throw new Error('Invalid response format - missing POINTS section');
           }
           
           // Extract points from response
           const pointsMatch = response.data.response.match(/POINTS:\s*(\d+)\/(\d+)/i);
           if (!pointsMatch) {
             throw new Error('Could not extract points from response');
           }
           
           const earnedPoints = parseInt(pointsMatch[1]);
           if (isNaN(earnedPoints)) {
             throw new Error('Invalid points value');
           }
           
           // Update scores
           setUserScores(prev => ({ ...prev, [index]: earnedPoints }));
         
         // Update only the feedback for the specific answer
         setUserAnswers(prev => ({ 
           ...prev, 
           [index]: { ...prev[index], feedback: response.data.response } 
         }));
           
           // Success - break out of retry loop
           break;
           
      } else {
           throw new Error(response.message || response.error || 'Invalid API response');
      }
    } catch (error) {
        console.error(`Grading attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount === maxRetries) {
          // Final attempt failed - show user-friendly error
          const errorMessage = error.message?.includes('fetch') || error.message?.includes('network') 
            ? 'Network error - please check your connection and try again'
            : error.message?.includes('timeout')
            ? 'Request timed out - please try again'
            : `Grading failed: ${error.message || 'Unknown error'}`;
            
       setUserAnswers(prev => ({ 
         ...prev, 
            [index]: { 
              ...prev[index], 
              feedback: `❌ Error: ${errorMessage}\n\nPlease try grading this answer again.` 
            } 
          }));
        } else {
          // Wait before retrying (exponential backoff)
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        retryCount++;
      }
    }
    
    // Always clear loading state
       setUserAnswers(prev => ({ 
         ...prev, 
         [index]: { ...prev[index], isGrading: false } 
       }));
  };
  // Modify the handleDiscussInChat function to support question-specific content
  const handleDiscussInChat = (content, questionIndex) => {
    // Add specific content for questions if questionIndex is provided
    let message;
    
    if (questionIndex !== undefined && actionResult?.type === 'questions') {
      // Handle practice questions
      const questions = parseNumberedQuestions(actionResult.content);
      const question = questions[questionIndex];
      const userAnswer = userAnswers[questionIndex]?.answer || '(No answer provided)';
      const feedback = userAnswers[questionIndex]?.feedback || '(No feedback available)';
      
      message = {
        role: 'ai',
        content: `Let's discuss this question:\n\n**Question:** ${question}\n\n**Your Answer:** ${userAnswer}\n\n**Feedback:** ${feedback}\n\n How can I help you understand this better?`
      };
    } else if (questionIndex !== undefined && practiceExamResult?.questions) {
      // Handle practice exam questions
      const questions = parseNumberedQuestions(practiceExamResult.questions);
      const question = questions[questionIndex];
      const userAnswer = practiceExamAnswers[questionIndex]?.answer || '(No answer provided)';
      const feedback = practiceExamAnswers[questionIndex]?.feedback || '(No feedback available)';
      
      message = {
        role: 'ai',
        content: `Let's discuss this practice exam question:\n\n**Question:** ${question}\n\n**Your Answer:** ${userAnswer}\n\n**Feedback:** ${feedback}\n\n How can I help you understand this better?`
      };
    } else {
      // Original behavior for general content
      message = {
        role: 'ai',
        content: `Okay, here is the content we generated. What would you like to discuss about it?\n\n---\n${content}\n---`
      };
    }
    
    // Add the message to chat history
    setChatHistory(prev => [...prev, message]);
    // Clear the user input field just in case
    setChatMessage(''); 
    // Switch to the chat tab
    setActiveTab('chat');
  };
  // Handle Practice Exam form changes
  const handlePracticeExamChange = (e) => {
    const { name, value, type, files, checked } = e.target;
    if (type === 'file') {
      setPracticeExamForm(prev => ({ ...prev, pdf: files[0] || null }));
    } else if (type === 'checkbox') {
      setPracticeExamForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setPracticeExamForm(prev => ({ ...prev, [name]: value }));
    }
  };
  // Handle Practice Exam form submit
  const handlePracticeExamSubmit = async (e) => {
    e.preventDefault();
    setPracticeExamLoading(true);
    setPracticeExamError(null);
    setPracticeExamResult(null);
    // Clear previous answers/feedback
    setPracticeExamAnswers({});
    setPracticeExamPoints([]);
    setPracticeExamScores({});
    
    console.log('=== PRACTICE EXAM SUBMIT START ===');
    console.log('Form data:', practiceExamForm);
    
    try {
      // Generate point distribution upfront so it can be sent to backend
      const numQuestions = parseInt(practiceExamForm.numQuestions) || 10;
      const questionPoints = generatePointDistribution(numQuestions);
      
      console.log('=== GENERATED POINTS FOR BACKEND ===');
      console.log('Number of questions:', numQuestions);
      console.log('Points array:', questionPoints);
      console.log('Total points:', questionPoints.reduce((sum, p) => sum + p, 0));
      
      // Add points to the form data
      const formWithPoints = {
        ...practiceExamForm,
        questionPoints: questionPoints
      };
      
      console.log('=== SENDING TO BACKEND ===');
      console.log('Form with points:', formWithPoints);
      
      const response = await processPracticeExam(formWithPoints);
      console.log('=== PRACTICE EXAM API RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response success:', response.success);
      console.log('Response data:', response.data);
      
      if (response.success && response.data) {
        console.log('=== SETTING RESULT ===');
        console.log('Setting practiceExamResult to:', response.data);
        
        // Store the entire response data object with new format
        setPracticeExamResult(response.data);
        
        // CRITICAL FIX: Use interactiveQuestions from backend for interactive tutor
        console.log('=== USING BACKEND INTERACTIVE QUESTIONS ===');
        console.log('Backend interactiveQuestions:', response.data.interactiveQuestions);
        console.log('Backend parsedQuestions (PDF):', response.data.parsedQuestions);
        console.log('Raw questions text:', response.data.questions);
        
        // Use the structured questions from backend if available
        let questionsArray = [];
        let questionPoints = [];
        
        // PRIORITY: Use interactiveQuestions for the interactive tutor display
        if (response.data.interactiveQuestions && Array.isArray(response.data.interactiveQuestions)) {
          // Use backend's interactive questions (ALL extracted questions)
          questionsArray = response.data.interactiveQuestions.map(q => q.question);
          questionPoints = response.data.interactiveQuestions.map(q => q.points);
          console.log('✅ Using backend interactive questions (ALL questions)');
          console.log(`Questions: ${questionsArray.length} total questions`);
          console.log('Questions preview:', questionsArray.slice(0, 3).map((q, i) => `${i+1}: ${q.substring(0, 50)}...`));
          console.log('Points:', questionPoints);
        } else if (response.data.parsedQuestions && Array.isArray(response.data.parsedQuestions)) {
          // Fallback to parsedQuestions if interactiveQuestions not available
          questionsArray = response.data.parsedQuestions.map(q => q.question);
          questionPoints = response.data.parsedQuestions.map(q => q.points);
          console.log('⚠️ Fallback to backend parsed questions (limited)');
          console.log('Questions:', questionsArray.map((q, i) => `${i+1}: ${q.substring(0, 50)}...`));
          console.log('Points:', questionPoints);
        } else {
          // Last resort: parse raw text
          console.log('⚠️ Last resort: frontend parsing (backend questions not available)');
          questionsArray = parseNumberedQuestions(response.data.questions || '');
          questionPoints = response.data.questionPoints || [];
        }
        
        // Initialize answers structure for interactive grading
        const initialAnswers = {};
        const initialScores = {};
        
        questionsArray.forEach((_, index) => {
          initialAnswers[index] = { answer: '', feedback: null, isGrading: false }; 
          initialScores[index] = 0; // Start with 0 points
        });
        
        setPracticeExamAnswers(initialAnswers);
        setPracticeExamPoints(questionPoints);
        setPracticeExamScores(initialScores);
        
        console.log('Final setup:', {
          questionsCount: questionsArray.length,
          points: questionPoints,
          totalPoints: questionPoints.reduce((sum, p) => sum + p, 0)
        });
        
        // Updated logging for new LaTeX PDF system
        console.log('PDF Path:', response.data.pdfPath);
        console.log('Subject:', response.data.subject);
        console.log('Difficulty:', response.data.difficulty);
        console.log('Final points for interactive grading:', questionPoints);
        
      } else {
        console.log('=== API ERROR ===');
        console.log('Error:', response.error || response.message);
        setPracticeExamError(response.error || response.message || 'Failed to generate practice exam.');
      }
    } catch (err) {
      console.log('=== EXCEPTION CAUGHT ===');
      console.error('Exception:', err);
      setPracticeExamError(err.message || 'An error occurred.');
    } finally {
      setPracticeExamLoading(false);
      console.log('=== PRACTICE EXAM SUBMIT END ===');
    }
  };
  // Handle PDF download
  const handleDownloadPDF = async (downloadUrl) => {
    if (isDownloading) return; // Prevent multiple downloads
    
    setIsDownloading(true);
    setPracticeExamError(null);
    
    try {
      // Extract filename from the download URL
      const filename = downloadUrl.split('/').pop();
      
      console.log('Downloading PDF:', filename);
      
      let blob;
      
      try {
        // Try using the API function first
        blob = await downloadPDF(filename);
        
        if (!blob || blob.success === false) {
          throw new Error(blob?.error || 'API method failed');
        }
      } catch (apiError) {
        console.warn('API download failed, trying direct fetch:', apiError.message);
        
        // Fallback to direct fetch
        const response = await fetch(`http://localhost:8000${downloadUrl}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/pdf',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        blob = await response.blob();
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      console.log('PDF downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      setPracticeExamError(`Download failed: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };
  // Handle LaTeX PDF download
  const handleDownloadLaTeXPDF = async (pdfPath) => {
    if (isDownloading) return; // Prevent multiple downloads
    
    setIsDownloading(true);
    setPracticeExamError(null);
    
    try {
      console.log('Downloading LaTeX PDF from path:', pdfPath);
      
      // Extract filename from the path
      const filename = pdfPath.split('/').pop();
      
      // Read the file directly using fetch
      const response = await fetch(`http://localhost:8000/api/ai/download-pdf/${filename}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      console.log('LaTeX PDF downloaded successfully');
    } catch (error) {
      console.error('LaTeX PDF download error:', error);
      setPracticeExamError(`Download failed: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };
  // Practice Exam interactive answer handlers (similar to practice questions)
  const handlePracticeExamAnswerChange = (index, value) => {
    setPracticeExamAnswers(prev => ({ 
      ...prev,
      [index]: { ...(prev[index] || { feedback: null, isGrading: false }), answer: value } 
    }));
  };
  
  const handleGradePracticeExamAnswer = async (index) => {
    // Set loading state for this specific answer
    setPracticeExamAnswers(prev => ({ 
      ...prev, 
      [index]: { ...prev[index], isGrading: true, feedback: null } 
    }));
    setPracticeExamError(null);
    
    // FIXED: Use the same question array logic as display
    let questionsArray = [];
    
    // PRIORITY: Use interactiveQuestions for consistent question access
    if (practiceExamResult.interactiveQuestions && Array.isArray(practiceExamResult.interactiveQuestions)) {
      // Use backend's interactive questions (ALL extracted questions)
      questionsArray = practiceExamResult.interactiveQuestions.map(q => q.question);
    } else if (practiceExamResult.parsedQuestions && Array.isArray(practiceExamResult.parsedQuestions)) {
      // Fallback to parsedQuestions if interactiveQuestions not available
      questionsArray = practiceExamResult.parsedQuestions.map(q => q.question);
    } else {
      // Last resort: parse raw text
      questionsArray = parseNumberedQuestions(practiceExamResult?.questions || '');
    }
    
    const questionText = questionsArray[index];
    const answerText = practiceExamAnswers[index]?.answer || '(No answer provided)';
    const maxPoints = practiceExamPoints[index] || 10;
    if (!questionText) {
      setPracticeExamError(`Could not find question text for index ${index}.`);
      setPracticeExamAnswers(prev => ({ ...prev, [index]: { ...prev[index], isGrading: false } }));
      return;
    }
    
    // Create grading prompt with point-based scoring (same as practice questions)
    let gradingPrompt = `GRADE THIS ANSWER - OBJECTIVE CHECKLIST
QUESTION: ${questionText}
STUDENT ANSWER: "${answerText}"
MAX POINTS: ${maxPoints}
OBJECTIVE GRADING CHECKLIST:
1. First, identify what the question is asking for (list the main requirements)
2. For each requirement, check if the student answer addresses it (YES/NO)
3. Count how many requirements are addressed
4. Use this EXACT scoring:
   - Addresses ALL requirements = FULL POINTS (${maxPoints}/${maxPoints})
   - Addresses 75%+ of requirements = 80% of max points
   - Addresses 50%+ of requirements = 60% of max points  
   - Addresses 25%+ of requirements = 30% of max points
   - Addresses less than 25% = 0-10% of max points
CRITICAL RULE: If the answer covers all the main topics asked, give FULL points. Don't deduct for style or extra detail.
RESPONSE FORMAT:
REQUIREMENTS: [List what the question asks for]
STUDENT COVERAGE: [Which requirements are met - YES/NO for each]
POINTS: X/${maxPoints}
FEEDBACK: [Brief explanation]
CORRECT ANSWER: [Complete but concise answer - 1-3 sentences]`;
    console.log(`Sending grading prompt for Practice Exam Q${index + 1} to testGemini:`, gradingPrompt);
    // Add retry logic with exponential backoff
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    while (retryCount <= maxRetries) {
      try {
        const response = await testGemini(gradingPrompt);
        console.log(`Practice Exam Grading API Response Q${index + 1} (attempt ${retryCount + 1}):`, response);
        if (response.success && response.data && response.data.response) {
           console.log("Raw feedback:", response.data.response);
           
           // Validate response format
           if (!response.data.response.includes('POINTS:')) {
             throw new Error('Invalid response format - missing POINTS section');
           }
           
           // Extract points from response
           const pointsMatch = response.data.response.match(/POINTS:\s*(\d+)\/(\d+)/i);
           if (!pointsMatch) {
             throw new Error('Could not extract points from response');
           }
           
           const earnedPoints = parseInt(pointsMatch[1]);
           if (isNaN(earnedPoints)) {
             throw new Error('Invalid points value');
           }
           
           // Update scores
           setPracticeExamScores(prev => ({ ...prev, [index]: earnedPoints }));
           
           setPracticeExamAnswers(prev => ({ 
             ...prev, 
             [index]: { ...prev[index], feedback: response.data.response } 
           }));
           
           // Success - break out of retry loop
           break;
           
        } else {
           throw new Error(response.message || response.error || 'Invalid API response');
        }
      } catch (error) {
        console.error(`Practice Exam Grading attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount === maxRetries) {
          // Final attempt failed - show user-friendly error
          const errorMessage = error.message?.includes('fetch') || error.message?.includes('network') 
            ? 'Network error - please check your connection and try again'
            : error.message?.includes('timeout')
            ? 'Request timed out - please try again'
            : `Grading failed: ${error.message || 'Unknown error'}`;
            
          setPracticeExamAnswers(prev => ({ 
            ...prev, 
            [index]: { 
              ...prev[index], 
              feedback: `❌ Error: ${errorMessage}\n\nPlease try grading this answer again.` 
            } 
          }));
        } else {
          // Wait before retrying (exponential backoff)
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        retryCount++;
      }
    }
    
    // Always clear loading state
    setPracticeExamAnswers(prev => ({ 
      ...prev, 
      [index]: { ...prev[index], isGrading: false } 
    }));
  };
  return (
    <div className="ai-tutor-page">
      <div className="ai-tutor-header">
        <h1 className="ai-tutor-title">🤖 AI Tutor</h1>
        <p className="ai-tutor-subtitle">
          Your intelligent study companion powered by advanced AI
        </p>
      </div>
      
      <div className="ai-tutor-layout">
        {/* Enhanced Sidebar */}
        <div className="ai-tutor-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-header">
              <div className="sidebar-header-icon">🧠</div>
              <h3 className="sidebar-header-title">AI Tools</h3>
              <p className="sidebar-header-subtitle">Choose your learning path</p>
            </div>
            
            <div className="sidebar-navigation">
              <button 
                onClick={() => handleTabChange('chat')}
                className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`}
              >
                <div className="nav-button-icon">💬</div>
                <div className="nav-button-content">
                  <span className="nav-button-title">AI Chat</span>
                  <span className="nav-button-desc">Interactive conversation</span>
                </div>
                {activeTab === 'chat' && <div className="nav-button-indicator"></div>}
              </button>
              
              <button 
                onClick={() => handleTabChange('studyPlan')}
                className={`nav-button ${activeTab === 'studyPlan' ? 'active' : ''}`}
              >
                <div className="nav-button-icon">📅</div>
                <div className="nav-button-content">
                  <span className="nav-button-title">Study Plan</span>
                  <span className="nav-button-desc">Personalized schedule</span>
                </div>
                {activeTab === 'studyPlan' && <div className="nav-button-indicator"></div>}
              </button>
              
              <button 
                onClick={() => handleTabChange('concept')}
                className={`nav-button ${activeTab === 'concept' ? 'active' : ''}`}
              >
                <div className="nav-button-icon">💡</div>
                <div className="nav-button-content">
                  <span className="nav-button-title">Explain Concept</span>
                  <span className="nav-button-desc">Clear explanations</span>
                </div>
                {activeTab === 'concept' && <div className="nav-button-indicator"></div>}
              </button>
              
              <button 
                onClick={() => handleTabChange('practice')}
                className={`nav-button ${activeTab === 'practice' ? 'active' : ''}`}
              >
                <div className="nav-button-icon">📝</div>
                <div className="nav-button-content">
                  <span className="nav-button-title">Practice Questions</span>
                  <span className="nav-button-desc">Test your knowledge</span>
                </div>
                {activeTab === 'practice' && <div className="nav-button-indicator"></div>}
              </button>
              <button 
                onClick={() => handleTabChange('practiceExam')}
                className={`nav-button ${activeTab === 'practiceExam' ? 'active' : ''}`}
              >
                <div className="nav-button-icon">🧪</div>
                <div className="nav-button-content">
                  <span className="nav-button-title">Practice Exams</span>
                  <span className="nav-button-desc">Generate a full exam</span>
                </div>
                {activeTab === 'practiceExam' && <div className="nav-button-indicator"></div>}
              </button>
            </div>
            
            <div className="sidebar-footer">
              <div className="ai-stats">
                <div className="ai-stat">
                  <span className="ai-stat-icon">⚡</span>
                  <span className="ai-stat-text">Powered by Gemini AI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Main Content */}
        <div className="ai-tutor-main">
          {activeTab === 'chat' && 
            <AiTutorChat 
              message={chatMessage} 
              setMessage={setChatMessage} 
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
            />}
          
          {activeTab === 'studyPlan' && (
            <div className="tool-card">
              <div className="tool-header">
                <div className="tool-header-icon">📅</div>
                <div className="tool-header-content">
                  <h2 className="tool-title">Generate Study Plan</h2>
                  <p className="tool-subtitle">Create a personalized learning schedule tailored to your goals</p>
                </div>
              </div>
              
              <form onSubmit={handleStudyPlanSubmit} className="tool-form">
                <div className="form-section">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📚</span>
                      Topic or Course
                      <span className="label-required">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={studyPlanForm.topic}
                      onChange={(e) => setStudyPlanForm({...studyPlanForm, topic: e.target.value})}
                      className="form-input"
                      required
                      placeholder="e.g., Data Structures, Machine Learning, Biology 101"
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">📆</span>
                        Duration (days)
                        <span className="label-required">*</span>
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        max="30"
                        value={studyPlanForm.durationDays}
                        onChange={(e) => setStudyPlanForm({...studyPlanForm, durationDays: parseInt(e.target.value)})}
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">⏰</span>
                        Hours per day
                        <span className="label-required">*</span>
                      </label>
                      <input 
                        type="number" 
                        min="0.5"
                        max="12"
                        step="0.5"
                        value={studyPlanForm.hoursPerDay}
                        onChange={(e) => setStudyPlanForm({...studyPlanForm, hoursPerDay: parseFloat(e.target.value)})}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">🎯</span>
                      Goal (optional)
                    </label>
                    <input 
                      type="text" 
                      value={studyPlanForm.goal}
                      onChange={(e) => setStudyPlanForm({...studyPlanForm, goal: e.target.value})}
                      className="form-input"
                      placeholder="e.g., Pass the final exam, Master algorithms, Understand key concepts"
                    />
                  </div>
                </div>
                
                <button 
                  type="submit"
                  disabled={isLoading || !studyPlanForm.topic}
                  className="form-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <div className="btn-spinner"></div>
                      Generating your plan...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">✨</span>
                      Generate Study Plan
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'concept' && (
            <div className="tool-card">
              <div className="tool-header">
                <div className="tool-header-icon">💡</div>
                <div className="tool-header-content">
                  <h2 className="tool-title">Explain a Concept</h2>
                  <p className="tool-subtitle">Get clear, detailed explanations for any topic or concept</p>
                </div>
              </div>
              
              <form onSubmit={handleConceptSubmit} className="tool-form">
                <div className="form-section">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">🔍</span>
                      Concept
                      <span className="label-required">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={conceptForm.concept}
                      onChange={(e) => setConceptForm({...conceptForm, concept: e.target.value})}
                      className="form-input"
                      required
                      placeholder="e.g., Recursion, Photosynthesis, String Theory"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📖</span>
                      Context (optional)
                    </label>
                    <input 
                      type="text" 
                      value={conceptForm.context}
                      onChange={(e) => setConceptForm({...conceptForm, context: e.target.value})}
                      className="form-input"
                      placeholder="e.g., Computer Science, Biology, Physics"
                    />
                  </div>
                </div>
                
                <button 
                  type="submit"
                  disabled={isLoading || !conceptForm.concept}
                  className="form-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <div className="btn-spinner"></div>
                      Explaining concept...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🧠</span>
                      Explain Concept
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'practice' && (
            <div className="tool-card">
              <div className="tool-header">
                <div className="tool-header-icon">📝</div>
                <div className="tool-header-content">
                  <h2 className="tool-title">Generate Practice Questions</h2>
                  <p className="tool-subtitle">Create custom practice questions to test your understanding</p>
                </div>
              </div>
              
              <form onSubmit={handleQuestionsSubmit} className="tool-form">
                <div className="form-section">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📚</span>
                      Topic
                      <span className="label-required">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={questionsForm.topic}
                      onChange={(e) => setQuestionsForm({...questionsForm, topic: e.target.value})}
                      className="form-input"
                      required
                      placeholder="e.g., Binary Trees, Cell Biology, Linear Algebra"
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">🔢</span>
                        Number of Questions
                      </label>
                      <select 
                        value={questionsForm.count}
                        onChange={(e) => setQuestionsForm({...questionsForm, count: parseInt(e.target.value)})}
                        className="form-select"
                      >
                        <option value={3}>3 Questions</option>
                        <option value={5}>5 Questions</option>
                        <option value={7}>7 Questions</option>
                        <option value={10}>10 Questions</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">📊</span>
                        Difficulty Level
                      </label>
                      <select 
                        value={questionsForm.difficulty}
                        onChange={(e) => setQuestionsForm({...questionsForm, difficulty: e.target.value})}
                        className="form-select"
                      >
                        <option value="easy">🟢 Easy</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="hard">🔴 Hard</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <button 
                  type="submit"
                  disabled={isLoading || !questionsForm.topic}
                  className="form-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <div className="btn-spinner"></div>
                      Generating questions...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🎯</span>
                      Generate Questions
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'practiceExam' && (
            <div className="tool-card">
              <div className="tool-header">
                <div className="tool-header-icon">🧪</div>
                <div className="tool-header-content">
                  <h2 className="tool-title">Generate Practice Exam</h2>
                  <p className="tool-subtitle">Create a custom practice exam for any subject. Optionally upload an old exam to generate questions in a similar format.</p>
                </div>
              </div>
              <form className="tool-form" onSubmit={handlePracticeExamSubmit}>
                <div className="form-section">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📚</span>
                      Subject or Course
                      <span className="label-required">*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-input"
                      name="subject"
                      value={practiceExamForm.subject}
                      onChange={handlePracticeExamChange}
                      required
                      placeholder="e.g., Calculus II, Organic Chemistry, Data Structures"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📄</span>
                      Upload Old Exam (PDF, optional)
                    </label>
                    <input 
                      type="file" 
                      accept=".pdf"
                      className="form-input"
                      name="pdf"
                      onChange={handlePracticeExamChange}
                    />
                    {practiceExamForm.pdf && <span className="file-name">{practiceExamForm.pdf.name}</span>}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">🔢</span>
                        Number of Questions
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        max="50"
                        className="form-input"
                        name="numQuestions"
                        value={practiceExamForm.numQuestions}
                        onChange={handlePracticeExamChange}
                        placeholder="e.g., 10"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">📊</span>
                        Difficulty Level
                      </label>
                      <select 
                        className="form-select"
                        name="difficulty"
                        value={practiceExamForm.difficulty}
                        onChange={handlePracticeExamChange}
                      >
                        <option value="easy">🟢 Easy</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="hard">🔴 Hard</option>
                        <option value="mixed">⚪ Mixed</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📝</span>
                      Topics or Instructions (optional)
                    </label>
                    <textarea 
                      className="form-input"
                      name="instructions"
                      value={practiceExamForm.instructions}
                      onChange={handlePracticeExamChange}
                      rows="3"
                      placeholder="List topics, sample questions, or special instructions for your exam..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        name="generatePDF"
                        checked={practiceExamForm.generatePDF}
                        onChange={handlePracticeExamChange}
                        style={{ margin: 0 }}
                      />
                      <span className="label-icon">📄</span>
                      Generate downloadable PDF
                    </label>
                    <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 24px' }}>
                      Creates a formatted PDF version that you can download and print
                    </p>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="form-submit-btn"
                  disabled={practiceExamLoading || !practiceExamForm.subject}
                >
                  {practiceExamLoading ? (
                    <>
                      <div className="btn-spinner"></div>
                      Generating Practice Exam...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🧪</span>
                      Generate Practice Exam
                    </>
                  )}
                </button>
              </form>
              {/* Result/Error Display */}
              <div className="results-card" style={{ marginTop: 32 }}>
                <div className="results-header">
                  <div className="results-header-icon">🧪</div>
                  <div className="results-header-content">
                    <h3 className="results-title">Your Practice Exam</h3>
                    <p className="results-subtitle">The generated exam will appear here.</p>
                  </div>
                </div>
                <div className="results-content">
                  <div className="results-text">
                    {practiceExamLoading && <div>Generating exam...</div>}
                    {practiceExamError && <div className="error-message">{practiceExamError}</div>}
                    {practiceExamResult && (
                      <div>
                        {/* Debug info */}
                        {console.log('Practice Exam Result:', {
                          hasResult: !!practiceExamResult,
                          pdfPath: practiceExamResult.pdfPath,
                          subject: practiceExamResult.subject,
                          difficulty: practiceExamResult.difficulty,
                          fullResult: practiceExamResult
                        })}
                        
                        {practiceExamResult.pdfPath && (
                          <div style={{ 
                            marginBottom: '24px', 
                            padding: '20px', 
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                            border: '3px solid #059669', 
                            borderRadius: '16px',
                            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
                            textAlign: 'center'
                          }}>
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                              <h3 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                                LaTeX PDF Generated Successfully!
                              </h3>
                              <p style={{ color: '#d1fae5', fontSize: '16px', margin: 0 }}>
                                Your practice exam is ready for download with perfect formatting
                              </p>
                            </div>
                            <button 
                              onClick={() => handleDownloadLaTeXPDF(practiceExamResult.pdfPath)}
                              disabled={isDownloading}
                              style={{
                                padding: '16px 32px',
                                backgroundColor: isDownloading ? '#6b7280' : '#ffffff',
                                color: isDownloading ? 'white' : '#059669',
                                border: '3px solid #ffffff',
                                borderRadius: '12px',
                                cursor: isDownloading ? 'not-allowed' : 'pointer',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                transition: 'all 0.3s ease',
                                boxShadow: isDownloading ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                                opacity: isDownloading ? 0.7 : 1,
                                width: '100%',
                                maxWidth: '300px',
                                margin: '0 auto',
                                transform: isDownloading ? 'none' : 'scale(1)',
                                animation: !isDownloading ? 'pulse 2s infinite' : 'none'
                              }}
                              onMouseOver={(e) => {
                                if (!isDownloading) {
                                  e.target.style.backgroundColor = '#f0fdf4';
                                  e.target.style.transform = 'scale(1.05)';
                                  e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
                                }
                              }}
                              onMouseOut={(e) => {
                                if (!isDownloading) {
                                  e.target.style.backgroundColor = '#ffffff';
                                  e.target.style.transform = 'scale(1)';
                                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                                }
                              }}
                            >
                              {isDownloading ? (
                                <>
                                  <div className="btn-spinner"></div>
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '24px' }}>📄</span>
                                  Download LaTeX PDF
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        
                        {/* Fallback download button - always show if generatePDF was checked */}
                        {practiceExamForm.generatePDF && !practiceExamResult.pdfPath && (
                          <div style={{ 
                            marginBottom: '16px', 
                            padding: '16px', 
                            backgroundColor: '#fef3c7', 
                            border: '2px solid #f59e0b', 
                            borderRadius: '12px',
                            textAlign: 'center'
                          }}>
                            <p style={{ color: '#92400e', margin: 0 }}>
                              ⏳ LaTeX PDF generation in progress... The download button will appear when ready.
                            </p>
                          </div>
                        )}
                        
                        {/* PDF Error Display */}
                        {practiceExamResult.pdfError && (
                          <div style={{ 
                            marginBottom: '16px', 
                            padding: '16px', 
                            backgroundColor: '#fef2f2', 
                            border: '2px solid #ef4444', 
                            borderRadius: '12px', 
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
                            <strong style={{ color: '#dc2626', fontSize: '16px' }}>PDF Generation Failed:</strong>
                            <p style={{ color: '#dc2626', margin: '8px 0 0 0' }}>{practiceExamResult.pdfError}</p>
                          </div>
                        )}
                        
                        {/* Interactive Practice Exam Display */}
                        <div className="questions-card">
                          <div className="questions-header">
                            <div className="questions-header-icon">🧪</div>
                            <div className="questions-header-content">
                              <h3 className="questions-title">Practice Exam Questions</h3>
                              <p className="questions-subtitle">Answer the questions and get instant feedback</p>
                              {practiceExamPoints.length > 0 && (
                                <div style={{ 
                                  marginTop: '8px', 
                                  padding: '8px 12px', 
                                  backgroundColor: '#f3f4f6', 
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  fontWeight: 'bold'
                                }}>
                                  Total Score: {Object.values(practiceExamScores).reduce((sum, score) => sum + score, 0)}/
                                  {practiceExamPoints.reduce((sum, points) => sum + points, 0)} points
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="questions-list">
                            {/* FIXED: Use the structured questions that preserve backend numbering */}
                            {(() => {
                              // Get questions array - PRIORITY: Use interactiveQuestions for consistent display
                              let questionsToDisplay = [];
                              
                              if (practiceExamResult.interactiveQuestions && Array.isArray(practiceExamResult.interactiveQuestions)) {
                                // Use backend's interactive questions (ALL extracted questions)
                                questionsToDisplay = practiceExamResult.interactiveQuestions.map(q => q.question);
                                console.log('📋 Displaying backend interactive questions (ALL questions)');
                              } else if (practiceExamResult.parsedQuestions && Array.isArray(practiceExamResult.parsedQuestions)) {
                                // Fallback to parsedQuestions if interactiveQuestions not available
                                questionsToDisplay = practiceExamResult.parsedQuestions.map(q => q.question);
                                console.log('📋 Fallback: displaying backend parsed questions (limited)');
                              } else {
                                // Last resort: parse raw text
                                questionsToDisplay = parseNumberedQuestions(practiceExamResult.questions || '');
                                console.log('📋 Last resort: displaying parsed questions from raw text');
                              }
                              
                              return questionsToDisplay.map((question, index) => (
                              <div key={index} className="question-item">
                                <div className="question-header">
                                  <div className="question-number">
                                      {/* FIXED: Use simple sequential numbering */}
                                      <span>Q{index + 1}</span>
                                    {practiceExamPoints[index] && (
                                      <div style={{ 
                                        fontSize: '12px', 
                                        color: '#6b7280', 
                                        fontWeight: 'normal',
                                        marginTop: '2px'
                                      }}>
                                        ({practiceExamPoints[index]} pts)
                                      </div>
                                    )}
                                  </div>
                                  <QuestionDisplay 
                                    questionText={question.replace(/^Q\d+[a-z]?\)\s*/, '')} 
                                    index={index} 
                                    isExam={true} 
                                  />
                                </div>
                                
                                <div className="question-answer">
                                  <label className="answer-label">
                                    <span className="label-icon">✍️</span>
                                    Your Answer:
                                    {practiceExamScores[index] !== undefined && practiceExamScores[index] > 0 && (
                                      <span style={{ 
                                        marginLeft: '8px', 
                                        color: '#059669', 
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                      }}>
                                        Score: {practiceExamScores[index]}/{practiceExamPoints[index] || 10} points
                                      </span>
                                    )}
                                  </label>
                                  <textarea
                                    value={practiceExamAnswers[index]?.answer || ''} 
                                    onChange={(e) => handlePracticeExamAnswerChange(index, e.target.value)}
                                    className="answer-textarea"
                                    placeholder="Type your answer here..."
                                    disabled={practiceExamAnswers[index]?.isGrading}
                                    rows="4"
                                  />
                                  
                                  <button 
                                    onClick={() => handleGradePracticeExamAnswer(index)}
                                    className="grade-btn"
                                    disabled={!practiceExamAnswers[index]?.answer || practiceExamAnswers[index]?.isGrading}
                                  >
                                    {practiceExamAnswers[index]?.isGrading ? (
                                      <>
                                        <div className="btn-spinner small"></div>
                                        Grading...
                                      </>
                                    ) : (
                                      <>
                                        <span className="btn-icon">✅</span>
                                        Grade Answer ({practiceExamPoints[index] || 10} pts)
                                      </>
                                    )}
                                  </button>
                                </div>
                                
                                {practiceExamAnswers[index]?.feedback && !practiceExamAnswers[index]?.isGrading && (
                                  <div className={`feedback-card ${practiceExamScores[index] === practiceExamPoints[index]
                                    ? 'correct' 
                                    : practiceExamScores[index] > 0 ? 'partial' : 'incorrect'}`}>
                                     <div className="feedback-header">
                                       <div className="feedback-icon">
                                         {practiceExamScores[index] === practiceExamPoints[index] ? '✅' : 
                                          practiceExamScores[index] > 0 ? '⚡' : '❌'}
                                       </div>
                                       <h5 className="feedback-title">
                                         {practiceExamScores[index] === practiceExamPoints[index] ? 'Perfect!' : 
                                          practiceExamScores[index] > 0 ? 'Partial Credit' : 'Needs Improvement'}
                                         <span style={{ marginLeft: '8px', fontSize: '14px' }}>
                                           ({practiceExamScores[index]}/{practiceExamPoints[index] || 10} points)
                                         </span>
                                       </h5>
                                     </div>
                                     
                                     <div className="feedback-content">
                                       <pre className="feedback-text">{practiceExamAnswers[index].feedback}</pre>
                                     </div>
                                     
                                     <div className="feedback-actions">
                                       <button 
                                         onClick={() => handleDiscussInChat(null, index)}
                                         className="feedback-action-btn"
                                       >
                                         <span className="btn-icon">💬</span>
                                         Discuss in Chat
                                       </button>
                                     </div>
                                   </div>
                                )}
                              </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Enhanced Results Display */}
          {actionResult && actionResult.type !== 'questions' && (
             <div className="results-card">
               <div className="results-header">
                 <div className="results-header-icon">
                   {actionResult.type === 'studyPlan' && '📅'}
                   {actionResult.type === 'explanation' && '💡'}
                 </div>
                 <div className="results-header-content">
                   <h3 className="results-title">
                     {actionResult.type === 'studyPlan' && 'Your Personalized Study Plan'}
                     {actionResult.type === 'explanation' && 'Concept Explanation'}
                   </h3>
                   <p className="results-subtitle">AI-generated content ready for you</p>
                 </div>
               </div>
               
               <div className="results-content">
                 <div className="results-text">
                   {actionResult.content}
                 </div>
               </div>
               
               <div className="results-actions">
                 <button 
                   onClick={() => handleDiscussInChat(actionResult.content)}
                   className="results-action-btn primary"
                 >
                   <span className="btn-icon">💬</span>
                   Discuss in Chat
                 </button>
               </div>
             </div>
          )}
          {/* Enhanced Interactive Questions Display */}
          {actionResult && actionResult.type === 'questions' && (
            <div className="questions-card">
              <div className="questions-header">
                <div className="questions-header-icon">📝</div>
                <div className="questions-header-content">
                  <h3 className="questions-title">Practice Questions</h3>
                  <p className="questions-subtitle">Test your knowledge and get instant feedback</p>
                  {questionPoints.length > 0 && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px 12px', 
                      backgroundColor: '#f3f4f6', 
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      Total Score: {Object.values(userScores).reduce((sum, score) => sum + score, 0)}/
                      {questionPoints.reduce((sum, points) => sum + points, 0)} points
                    </div>
                  )}
                </div>
              </div>
              
              <SmartQuestionContainer
                questionsArray={parseNumberedQuestions(actionResult.content)}
                userAnswers={userAnswers}
                onAnswerChange={handleAnswerChange}
                onGrade={handleGradeSingleAnswer}
                questionPoints={questionPoints}
                userScores={userScores}
                isExam={false}
              />
              
              {/* Add feedback and discuss buttons for practice questions */}
              <div className="questions-feedback">
                {parseNumberedQuestions(actionResult.content).map((question, index) => (
                  userAnswers[index]?.feedback && !userAnswers[index]?.isGrading && (
                    <div key={index} className={`feedback-card ${userScores[index] === questionPoints[index] 
                      ? 'correct' 
                      : userScores[index] > 0 ? 'partial' : 'incorrect'}`}>
                       <div className="feedback-header">
                         <div className="feedback-icon">
                           {userScores[index] === questionPoints[index] ? '✅' : 
                            userScores[index] > 0 ? '⚡' : '❌'}
                         </div>
                         <h5 className="feedback-title">
                           Feedback for Q{index + 1} - {userScores[index] === questionPoints[index] ? 'Perfect!' : 
                            userScores[index] > 0 ? 'Partial Credit' : 'Needs Improvement'}
                           <span style={{ marginLeft: '8px', fontSize: '14px' }}>
                             ({userScores[index]}/{questionPoints[index] || 10} points)
                           </span>
                         </h5>
                       </div>
                       
                       <div className="feedback-content">
                         <pre className="feedback-text">{userAnswers[index].feedback}</pre>
                       </div>
                       
                       <div className="feedback-actions">
                         <button 
                           onClick={() => handleDiscussInChat(null, index)}
                           className="feedback-action-btn"
                         >
                           <span className="btn-icon">💬</span>
                           Discuss in Chat
                         </button>
                       </div>
                     </div>
                  )
                ))}
              </div>
            </div>
          )}
          
          {error && (
            <div className="error-card">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <h3 className="error-title">Something went wrong</h3>
                <p className="error-message">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AiTutorPage; 


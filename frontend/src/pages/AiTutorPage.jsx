import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AiTutorChat from '../components/AiTutorChat';
import { generateStudyPlan, explainConcept, generatePracticeQuestions, testGemini } from '../services/api';
import { FaBookOpen, FaClipboardList, FaQuestion, FaLightbulb, FaSpinner, FaComments, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './AiTutorPage.css';

// Helper function to parse numbered questions
const parseNumberedQuestions = (text) => {
  if (!text) return [];
  // Match lines starting with a number, period, and optional space
  const questionRegex = /^\s*\d+\.\s*(.*)/gm;
  const questions = [];
  let match;
  while ((match = questionRegex.exec(text)) !== null) {
    questions.push(match[1].trim());
  }
  // Fallback if regex fails, split by newline assuming one question per line
  if (questions.length === 0) {
    return text.split('\n').map(q => q.trim()).filter(q => q.length > 0);
  }
  return questions;
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
    if (tabParam && ['chat', 'studyPlan', 'concept', 'practice'].includes(tabParam)) {
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
    // Clear previous answers/feedback
    setUserAnswers({}); 
    
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
        questionsArray.forEach((_, index) => {
          initialAnswers[index] = { answer: '', feedback: null, isGrading: false }; 
        });
        setUserAnswers(initialAnswers);
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
  
  // Rename and modify to handle a single answer
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

    if (!questionText) {
      setError(`Could not find question text for index ${index}.`);
       setUserAnswers(prev => ({ ...prev, [index]: { ...prev[index], isGrading: false } }));
      return;
    }
    
    // Create a simplified and direct grading prompt with a clearer evaluation indicator
    let gradingPrompt = `GRADING TASK

QUESTION: ${questionText}

PART 1: SOLUTION
Solve this question and determine the exact numerical answer.

PART 2: USER'S ANSWER
User submitted: "${answerText}"

Format this part nicely.
PART 3: EVALUATION
First determine the correct answer, then grade the user's answer.

Your response MUST be in this exact format:
[GRADE]: [EXPLANATION]

Where [GRADE] is exactly CORRECT or INCORRECT (all caps)
And [EXPLANATION] explains why with the correct answer included.

Example of correct format:
CORRECT: The answer is 42 and the user provided 42.
INCORRECT: The answer is 42 but the user provided 8.

YOUR RESPONSE:`;

    console.log(`Sending clear format grading prompt for Q${index + 1} to testGemini:`, gradingPrompt);

    try {
      const response = await testGemini(gradingPrompt);
      console.log(`Grading API Response Q${index + 1}:`, response);

      if (response.success) {
         // Add debugging
         console.log("Raw feedback:", response.data.response);
         console.log("First 20 chars:", response.data.response.substring(0, 20));
         console.log("Starts with 'Correct'?", response.data.response.trim().toLowerCase().startsWith("correct"));
         
         // Update only the feedback for the specific answer
         setUserAnswers(prev => ({ 
           ...prev, 
           [index]: { ...prev[index], feedback: response.data.response } 
         }));
      } else {
         // Display error specifically for this question? Or use general error?
         // For now, set feedback to indicate error
         setUserAnswers(prev => ({ 
           ...prev, 
           [index]: { ...prev[index], feedback: `Error grading: ${response.message || 'Unknown error'}` } 
         }));
         // Optionally set general error too: setError(response.message || 'Failed to get grading from AI.');
      }
    } catch (error) {
       setUserAnswers(prev => ({ 
         ...prev, 
         [index]: { ...prev[index], feedback: `Error: ${error.message}` } 
       }));
       // Optionally set general error too: setError('An error occurred while trying to grade the answer.');
       console.error('Grading error:', error);
    } finally {
       // Set loading state for this specific answer back to false
       setUserAnswers(prev => ({ 
         ...prev, 
         [index]: { ...prev[index], isGrading: false } 
       }));
    }
  };

  // Modify the handleDiscussInChat function to support question-specific content
  const handleDiscussInChat = (content, questionIndex) => {
    // Add specific content for questions if questionIndex is provided
    let message;
    
    if (questionIndex !== undefined && actionResult?.type === 'questions') {
      const questions = parseNumberedQuestions(actionResult.content);
      const question = questions[questionIndex];
      const userAnswer = userAnswers[questionIndex]?.answer || '(No answer provided)';
      const feedback = userAnswers[questionIndex]?.feedback || '(No feedback available)';
      
      message = {
        role: 'ai',
        content: `Let's discuss this question:\n\n**Question:** ${question}\n\n**Your Answer:** ${userAnswer}\n\n**Feedback:** ${feedback}\n\n How can I help you understand this better?`
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="page-title">AI Tutor</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-green-600 text-white font-bold">
              AI Tools
            </div>
            <div className="sidebar-button-container">
              <button 
                onClick={() => handleTabChange('chat')}
                className={`sidebar-button ${activeTab === 'chat' ? 'active' : ''}`}
              >
                <FaLightbulb className="button-icon" /> AI Chat
              </button>
              <button 
                onClick={() => handleTabChange('studyPlan')}
                className={`sidebar-button ${activeTab === 'studyPlan' ? 'active' : ''}`}
              >
                <FaBookOpen className="button-icon" /> Study Plan
              </button>
              <button 
                onClick={() => handleTabChange('concept')}
                className={`sidebar-button ${activeTab === 'concept' ? 'active' : ''}`}
              >
                <FaQuestion className="button-icon" /> Explain Concept
              </button>
              <button 
                onClick={() => handleTabChange('practice')}
                className={`sidebar-button ${activeTab === 'practice' ? 'active' : ''}`}
              >
                <FaClipboardList className="button-icon" /> Practice Questions
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3 main-content-area">
          {activeTab === 'chat' && 
            <AiTutorChat 
              message={chatMessage} 
              setMessage={setChatMessage} 
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
            />}
          
          {activeTab === 'studyPlan' && (
            <div className="form-container">
              <h2 className="form-title">
                <FaBookOpen className="form-title-icon" /> Generate Study Plan
              </h2>
              
              <form onSubmit={handleStudyPlanSubmit}>
                <div className="form-input-group">
                  <label className="form-label">Topic or Course*</label>
                  <input 
                    type="text" 
                    value={studyPlanForm.topic}
                    onChange={(e) => setStudyPlanForm({...studyPlanForm, topic: e.target.value})}
                    className="form-input"
                    required
                    placeholder="e.g., Data Structures, Machine Learning, Biology 101"
                  />
                </div>
                
                <div className="form-input-grid">
                  <div className="form-input-group">
                    <label className="form-label">Duration (days)*</label>
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
                  
                  <div className="form-input-group">
                    <label className="form-label">Hours per day*</label>
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
                
                <div className="form-input-group">
                  <label className="form-label">Goal (optional)</label>
                  <input 
                    type="text" 
                    value={studyPlanForm.goal}
                    onChange={(e) => setStudyPlanForm({...studyPlanForm, goal: e.target.value})}
                    className="form-input"
                    placeholder="e.g., Pass the final exam, Master algorithms, Understand key concepts"
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isLoading || !studyPlanForm.topic}
                  className="form-submit-button"
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="spinner-icon" />
                      Generating...
                    </>
                  ) : (
                    'Generate Study Plan'
                  )}
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'concept' && (
            <div className="form-container">
              <h2 className="form-title">
                <FaQuestion className="form-title-icon" /> Explain a Concept
              </h2>
              
              <form onSubmit={handleConceptSubmit}>
                <div className="form-input-group">
                  <label className="form-label">Concept*</label>
                  <input 
                    type="text" 
                    value={conceptForm.concept}
                    onChange={(e) => setConceptForm({...conceptForm, concept: e.target.value})}
                    className="form-input"
                    required
                    placeholder="e.g., Recursion, Photosynthesis, String Theory"
                  />
                </div>
                
                <div className="form-input-group">
                  <label className="form-label">Context (optional)</label>
                  <input 
                    type="text" 
                    value={conceptForm.context}
                    onChange={(e) => setConceptForm({...conceptForm, context: e.target.value})}
                    className="form-input"
                    placeholder="e.g., Computer Science, Biology, Physics"
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isLoading || !conceptForm.concept}
                  className="form-submit-button"
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="spinner-icon" />
                      Generating...
                    </>
                  ) : (
                    'Explain Concept'
                  )}
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'practice' && (
            <div className="form-container">
              <h2 className="form-title">
                <FaClipboardList className="form-title-icon" /> Generate Practice Questions
              </h2>
              
              <form onSubmit={handleQuestionsSubmit}>
                <div className="form-input-group">
                  <label className="form-label">Topic*</label>
                  <input 
                    type="text" 
                    value={questionsForm.topic}
                    onChange={(e) => setQuestionsForm({...questionsForm, topic: e.target.value})}
                    className="form-input"
                    required
                    placeholder="e.g., Binary Trees, Cell Biology, Linear Algebra"
                  />
                </div>
                
                <div className="form-input-grid">
                  <div className="form-input-group">
                    <label className="form-label">Number of Questions</label>
                    <input 
                      type="number" 
                      min="1"
                      max="10"
                      value={questionsForm.count}
                      onChange={(e) => setQuestionsForm({...questionsForm, count: parseInt(e.target.value)})}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-input-group">
                    <label className="form-label">Difficulty</label>
                    <select 
                      value={questionsForm.difficulty}
                      onChange={(e) => setQuestionsForm({...questionsForm, difficulty: e.target.value})}
                      className="form-select"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                
                <button 
                  type="submit"
                  disabled={isLoading || !questionsForm.topic}
                  className="form-submit-button"
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="spinner-icon" />
                      Generating...
                    </>
                  ) : (
                    'Generate Questions'
                  )}
                </button>
              </form>
            </div>
          )}
          
          {/* Render Questions and Answers OR Results display */}
          {actionResult && actionResult.type !== 'questions' && (
             <div className="results-container">
               <h3 className="results-title">
                 {actionResult.type === 'studyPlan' && 'Your Study Plan'}
                 {actionResult.type === 'explanation' && 'Concept Explanation'}
               </h3>
               <div className="results-content">
                 {actionResult.content}
               </div>
               <button 
                 onClick={() => handleDiscussInChat(actionResult.content)}
                 className="form-submit-button mt-4 bg-blue-600 hover:bg-blue-700"
               >
                 <FaComments className="mr-2" /> Discuss in Chat
               </button>
             </div>
          )}

          {/* Interactive Questions Display */}
          {actionResult && actionResult.type === 'questions' && (
            <div className="results-container mt-6">
              <h3 className="results-title">Practice Questions</h3>
              <div className="space-y-6"> 
                {parseNumberedQuestions(actionResult.content).map((question, index) => (
                  <div key={index} className="form-input-group p-4 border rounded-md">
                    <p className="form-label font-semibold">Question {index + 1}:</p>
                    <p className="mb-2">{question}</p>
                    <textarea
                      value={userAnswers[index]?.answer || ''} 
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      rows="3"
                      className="form-input" 
                      placeholder="Type your answer here..."
                      disabled={userAnswers[index]?.isGrading}
                    />
                    <button 
                      onClick={() => handleGradeSingleAnswer(index)}
                      className="form-submit-button mt-2 text-sm px-3 py-1"
                      disabled={!userAnswers[index]?.answer || userAnswers[index]?.isGrading}
                    >
                      {userAnswers[index]?.isGrading ? (
                        <><FaSpinner className="spinner-icon mr-1" /> Grading...</> 
                      ) : (
                        'Grade this Answer'
                      )}
                    </button>
                    {userAnswers[index]?.feedback && !userAnswers[index]?.isGrading && (
                      <div className={`mt-4 p-3 results-content ${isCorrectAnswer(userAnswers[index].feedback)
                        ? 'answer-feedback-correct' 
                        : 'answer-feedback-incorrect'}`}>
                         <div className="feedback-header">
                           {isCorrectAnswer(userAnswers[index].feedback)
                             ? <FaCheckCircle className="feedback-icon-correct" />
                             : <FaTimesCircle className="feedback-icon-incorrect" />
                           }
                           <h5 className={isCorrectAnswer(userAnswers[index].feedback)
                             ? 'feedback-text-correct'
                             : 'feedback-text-incorrect'}>Feedback:</h5>
                         </div>
                         <pre className="whitespace-pre-wrap text-sm">{userAnswers[index].feedback}</pre>
                         
                         <button 
                           onClick={() => handleDiscussInChat(null, index)}
                           className="form-submit-button mt-2 text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700"
                         >
                           <FaComments className="mr-1 inline" /> Discuss in Chat
                         </button>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {error && (
            <div className="error-container">
              <p className="error-title">Error:</p>
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiTutorPage;
import React, { useState } from 'react';
import AiTutorChat from '../components/AiTutorChat';
import { generateStudyPlan, explainConcept, generatePracticeQuestions, testGemini } from '../services/api';
import { FaBookOpen, FaClipboardList, FaQuestion, FaLightbulb, FaSpinner, FaComments } from 'react-icons/fa';
import './AiTutorPage.css';

const AiTutorPage = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [error, setError] = useState(null);

  // Lifted state for chat input
  const [chatMessage, setChatMessage] = useState('');
  // Lifted state for chat history
  const [chatHistory, setChatHistory] = useState([]);

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

    try {
      // Construct a simple prompt for the test endpoint
      let promptString = `Generate ${questionsForm.count} practice questions about "${questionsForm.topic}"`;
      if (questionsForm.difficulty) {
        promptString += ` at a ${questionsForm.difficulty} difficulty level.`;
      }
      
      console.log("Sending questions prompt to testGemini:", promptString); // Log the prompt
      
      // Call the simple testGemini function
      const response = await testGemini(promptString);
      
      console.log("Questions API Response (using testGemini):", response); // Log the response

      if (response.success) {
        // Adjust structure for testGemini response { success: true, data: { response: '...' } }
        setActionResult({
          type: 'questions', // Keep the type for display logic
          content: response.data.response // Get the response text
        });
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

  // Function to handle moving content to chat history
  const handleDiscussInChat = (content) => {
    // Add the generated content as a new message FROM THE AI
    const aiMessage = {
      role: 'ai',
      content: `Okay, here is the content we generated. What would you like to discuss about it?\n\n---\n${content}\n---`
    };
    setChatHistory(prev => [...prev, aiMessage]);
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
                onClick={() => setActiveTab('chat')}
                className={`sidebar-button ${activeTab === 'chat' ? 'active' : ''}`}
              >
                <FaLightbulb className="button-icon" /> AI Chat
              </button>
              <button 
                onClick={() => setActiveTab('studyPlan')}
                className={`sidebar-button ${activeTab === 'studyPlan' ? 'active' : ''}`}
              >
                <FaBookOpen className="button-icon" /> Study Plan
              </button>
              <button 
                onClick={() => setActiveTab('concept')}
                className={`sidebar-button ${activeTab === 'concept' ? 'active' : ''}`}
              >
                <FaQuestion className="button-icon" /> Explain Concept
              </button>
              <button 
                onClick={() => setActiveTab('practice')}
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
          
          {/* Results display */}
          {actionResult && (
            <div className="results-container">
              <h3 className="results-title">
                {actionResult.type === 'studyPlan' && 'Your Study Plan'}
                {actionResult.type === 'explanation' && 'Concept Explanation'}
                {actionResult.type === 'questions' && 'Practice Questions'}
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
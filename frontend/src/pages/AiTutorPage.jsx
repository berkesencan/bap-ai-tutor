import React, { useState } from 'react';
import AiTutorChat from '../components/AiTutorChat';
import { generateStudyPlan, explainConcept, generatePracticeQuestions } from '../services/api';
import { FaBookOpen, FaClipboardList, FaQuestion, FaLightbulb, FaSpinner } from 'react-icons/fa';

const AiTutorPage = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [error, setError] = useState(null);

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
      const response = await generateStudyPlan(studyPlanForm);
      if (response.success) {
        setActionResult({
          type: 'studyPlan',
          content: response.data.studyPlan
        });
      } else {
        setError(response.message || 'Failed to generate study plan');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Study plan error:', error);
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
      const response = await explainConcept(conceptForm);
      if (response.success) {
        setActionResult({
          type: 'explanation',
          content: response.data.explanation
        });
      } else {
        setError(response.message || 'Failed to explain concept');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Concept explanation error:', error);
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
      const response = await generatePracticeQuestions(questionsForm);
      if (response.success) {
        setActionResult({
          type: 'questions',
          content: response.data.questions
        });
      } else {
        setError(response.message || 'Failed to generate practice questions');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Practice questions error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">AI Tutor</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-blue-600 text-white font-bold">
              AI Tools
            </div>
            <div className="p-2">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`w-full text-left p-3 rounded-md flex items-center ${activeTab === 'chat' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              >
                <FaLightbulb className="mr-2" /> AI Chat
              </button>
              <button 
                onClick={() => setActiveTab('studyPlan')}
                className={`w-full text-left p-3 rounded-md flex items-center ${activeTab === 'studyPlan' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              >
                <FaBookOpen className="mr-2" /> Study Plan
              </button>
              <button 
                onClick={() => setActiveTab('concept')}
                className={`w-full text-left p-3 rounded-md flex items-center ${activeTab === 'concept' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              >
                <FaQuestion className="mr-2" /> Explain Concept
              </button>
              <button 
                onClick={() => setActiveTab('practice')}
                className={`w-full text-left p-3 rounded-md flex items-center ${activeTab === 'practice' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              >
                <FaClipboardList className="mr-2" /> Practice Questions
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === 'chat' && <AiTutorChat />}
          
          {activeTab === 'studyPlan' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <FaBookOpen className="mr-2 text-blue-600" /> Generate Study Plan
              </h2>
              
              <form onSubmit={handleStudyPlanSubmit} className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Topic or Course*</label>
                  <input 
                    type="text" 
                    value={studyPlanForm.topic}
                    onChange={(e) => setStudyPlanForm({...studyPlanForm, topic: e.target.value})}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., Data Structures, Machine Learning, Biology 101"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Duration (days)*</label>
                    <input 
                      type="number" 
                      min="1"
                      max="30"
                      value={studyPlanForm.durationDays}
                      onChange={(e) => setStudyPlanForm({...studyPlanForm, durationDays: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1 font-medium">Hours per day*</label>
                    <input 
                      type="number" 
                      min="0.5"
                      max="12"
                      step="0.5"
                      value={studyPlanForm.hoursPerDay}
                      onChange={(e) => setStudyPlanForm({...studyPlanForm, hoursPerDay: parseFloat(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Goal (optional)</label>
                  <input 
                    type="text" 
                    value={studyPlanForm.goal}
                    onChange={(e) => setStudyPlanForm({...studyPlanForm, goal: e.target.value})}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Pass the final exam, Master algorithms, Understand key concepts"
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isLoading || !studyPlanForm.topic}
                  className="bg-blue-600 text-white rounded-md px-4 py-2 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <FaQuestion className="mr-2 text-blue-600" /> Explain a Concept
              </h2>
              
              <form onSubmit={handleConceptSubmit} className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Concept*</label>
                  <input 
                    type="text" 
                    value={conceptForm.concept}
                    onChange={(e) => setConceptForm({...conceptForm, concept: e.target.value})}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., Recursion, Photosynthesis, String Theory"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">Context (optional)</label>
                  <input 
                    type="text" 
                    value={conceptForm.context}
                    onChange={(e) => setConceptForm({...conceptForm, context: e.target.value})}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Computer Science, Biology, Physics"
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isLoading || !conceptForm.concept}
                  className="bg-blue-600 text-white rounded-md px-4 py-2 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <FaClipboardList className="mr-2 text-blue-600" /> Generate Practice Questions
              </h2>
              
              <form onSubmit={handleQuestionsSubmit} className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Topic*</label>
                  <input 
                    type="text" 
                    value={questionsForm.topic}
                    onChange={(e) => setQuestionsForm({...questionsForm, topic: e.target.value})}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., Binary Trees, Cell Biology, Linear Algebra"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Number of Questions</label>
                    <input 
                      type="number" 
                      min="1"
                      max="10"
                      value={questionsForm.count}
                      onChange={(e) => setQuestionsForm({...questionsForm, count: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1 font-medium">Difficulty</label>
                    <select 
                      value={questionsForm.difficulty}
                      onChange={(e) => setQuestionsForm({...questionsForm, difficulty: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="bg-blue-600 text-white rounded-md px-4 py-2 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
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
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-3">
                {actionResult.type === 'studyPlan' && 'Your Study Plan'}
                {actionResult.type === 'explanation' && 'Concept Explanation'}
                {actionResult.type === 'questions' && 'Practice Questions'}
              </h3>
              <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                {actionResult.content}
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-6 bg-red-100 text-red-700 p-4 rounded-lg">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiTutorPage;
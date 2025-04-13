import React, { useState, useRef, useEffect } from 'react';
import { postChatMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner, FaLightbulb, FaBookOpen, FaGraduationCap, FaQuestionCircle } from 'react-icons/fa';

const AiTutorChat = () => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add user message to chat
    const userMessage = { role: 'user', content: message.trim() };
    setChatHistory((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    setMessage('');

    try {
      // Format history for the API
      const historyForApi = chatHistory.map(msg => ({
        role: msg.role === 'ai' ? 'model' : msg.role,
        parts: msg.content
      }));

      // Send message to backend
      const response = await postChatMessage({
        history: historyForApi,
        message: userMessage.content
      });

      if (response.success) {
        // Add AI response to chat
        setChatHistory((prev) => [...prev, { role: 'ai', content: response.data.response }]);
      } else {
        setError(response.message || 'Failed to get response from AI tutor.');
        console.error('AI chat error:', response);
      }
    } catch (error) {
      setError('Failed to connect to the AI tutor. Please try again.');
      console.error('AI chat error:', error);
    } finally {
      setIsLoading(false);
      // Focus the input after sending
      inputRef.current?.focus();
    }
  };

  // Handle quick prompt selection
  const handleQuickPrompt = (promptText) => {
    setMessage(promptText);
    inputRef.current?.focus();
  };

  return (
    <div className="bg-gradient-to-b from-white to-blue-50 rounded-xl shadow-xl overflow-hidden flex flex-col h-[650px] max-w-5xl mx-auto border border-blue-100">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white">
        <h2 className="text-xl font-bold flex items-center">
          <FaRobot className="mr-2 text-blue-200" /> AI Tutor Chat
        </h2>
        <p className="text-sm text-blue-100">Ask me anything about your courses or assignments!</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
        {chatHistory.length === 0 ? (
          <div className="text-center my-12">
            <div className="bg-blue-600 w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg">
              <FaRobot className="text-white text-4xl" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">How can I help you today?</h3>
            <p className="text-gray-600 max-w-xl mx-auto mb-8">
              I'm your AI tutor assistant. I can help explain concepts, create study plans, 
              generate practice questions, or assist with homework problems.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button 
                className="bg-white text-blue-600 p-4 rounded-lg shadow-md text-left hover:shadow-lg transition-all border border-blue-100 flex items-start"
                onClick={() => handleQuickPrompt("Explain the concept of neural networks in AI.")}
              >
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <FaLightbulb className="text-blue-600" />
                </div>
                <div>
                  <span className="font-bold block mb-1">Explain a concept</span>
                  <span className="text-sm text-gray-600">Get clear explanations on any subject</span>
                </div>
              </button>
              
              <button 
                className="bg-white text-blue-600 p-4 rounded-lg shadow-md text-left hover:shadow-lg transition-all border border-blue-100 flex items-start"
                onClick={() => handleQuickPrompt("Create a study plan for my upcoming Computer Science midterm. I need to cover algorithms, data structures, and system design.")}
              >
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <FaBookOpen className="text-blue-600" />
                </div>
                <div>
                  <span className="font-bold block mb-1">Make a study plan</span>
                  <span className="text-sm text-gray-600">Get organized with a personalized schedule</span>
                </div>
              </button>
              
              <button 
                className="bg-white text-blue-600 p-4 rounded-lg shadow-md text-left hover:shadow-lg transition-all border border-blue-100 flex items-start"
                onClick={() => handleQuickPrompt("Generate 5 practice questions for Data Structures covering trees and graphs.")}
              >
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <FaGraduationCap className="text-blue-600" />
                </div>
                <div>
                  <span className="font-bold block mb-1">Practice questions</span>
                  <span className="text-sm text-gray-600">Test your knowledge with tailored questions</span>
                </div>
              </button>
              
              <button 
                className="bg-white text-blue-600 p-4 rounded-lg shadow-md text-left hover:shadow-lg transition-all border border-blue-100 flex items-start"
                onClick={() => handleQuickPrompt("Help me solve this algorithm problem: Find the maximum subarray sum in an array of integers.")}
              >
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <FaQuestionCircle className="text-blue-600" />
                </div>
                <div>
                  <span className="font-bold block mb-1">Homework help</span>
                  <span className="text-sm text-gray-600">Get guidance on solving problems</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {chatHistory.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 rounded-bl-none border border-blue-100'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    {msg.role === 'user' ? (
                      <>
                        <span className="font-semibold mr-1">You</span>
                        {currentUser?.photoURL ? (
                          <img src={currentUser.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                        ) : (
                          <FaUser className="text-xs opacity-70" />
                        )}
                      </>
                    ) : (
                      <>
                        <div className="bg-blue-100 p-1 rounded-full mr-2">
                          <FaRobot className="text-blue-600 text-xs" />
                        </div>
                        <span className="font-semibold">AI Tutor</span>
                      </>
                    )}
                    <span className="text-xs ml-auto opacity-70">
                      {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 rounded-2xl rounded-bl-none p-4 max-w-[80%] shadow-sm border border-blue-100">
                  <div className="flex items-center mb-2">
                    <div className="bg-blue-100 p-1 rounded-full mr-2">
                      <FaRobot className="text-blue-600 text-xs" />
                    </div>
                    <span className="font-semibold">AI Tutor</span>
                  </div>
                  <div className="flex items-center animate-pulse">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mr-1"></div>
                    <div className="h-2 w-2 bg-blue-500 rounded-full mr-1 animate-bounce delay-75"></div>
                    <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200 mx-auto max-w-md">
                <div className="font-bold mb-1">Error</div>
                {error}. Please try again.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="border-t border-blue-100 p-4 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg px-5 py-3 hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none shadow-sm"
            disabled={!message.trim() || isLoading}
          >
            {isLoading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send message
        </div>
      </form>
    </div>
  );
};

export default AiTutorChat; 
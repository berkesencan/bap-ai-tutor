import React, { useState, useRef, useEffect } from 'react';
import { postChatMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner } from 'react-icons/fa';

const AiTutorChat = () => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [error, setError] = useState(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

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
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col h-[600px] max-w-4xl mx-auto">
      <div className="bg-blue-600 p-4 text-white">
        <h2 className="text-xl font-bold flex items-center">
          <FaRobot className="mr-2" /> AI Tutor Chat
        </h2>
        <p className="text-sm text-blue-100">Ask me anything about your courses or assignments!</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <FaRobot className="mx-auto text-5xl mb-3 text-blue-500" />
            <p className="text-lg font-medium">How can I help you today?</p>
            <p className="text-sm mt-2">
              You can ask me questions about your courses, request explanations for concepts,
              help with assignments, or generate a study plan.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
              <button 
                className="bg-blue-50 text-blue-600 p-2 rounded-md text-sm hover:bg-blue-100 transition-colors"
                onClick={() => setMessage("Explain the concept of neural networks in AI.")}
              >
                Explain a concept
              </button>
              <button 
                className="bg-blue-50 text-blue-600 p-2 rounded-md text-sm hover:bg-blue-100 transition-colors"
                onClick={() => setMessage("Create a study plan for my Computer Science midterm.")}
              >
                Make a study plan
              </button>
              <button 
                className="bg-blue-50 text-blue-600 p-2 rounded-md text-sm hover:bg-blue-100 transition-colors"
                onClick={() => setMessage("Generate 5 practice questions for Data Structures.")}
              >
                Practice questions
              </button>
              <button 
                className="bg-blue-50 text-blue-600 p-2 rounded-md text-sm hover:bg-blue-100 transition-colors"
                onClick={() => setMessage("Help me solve this algorithm problem: Find the maximum subarray sum.")}
              >
                Help with problem
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {chatHistory.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] rounded-lg p-3 ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    {msg.role === 'user' ? (
                      <>
                        <span className="font-semibold mr-1">You</span>
                        <FaUser className="text-xs opacity-70" />
                      </>
                    ) : (
                      <>
                        <FaRobot className="text-xs opacity-70 mr-1" />
                        <span className="font-semibold">AI Tutor</span>
                      </>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-800 rounded-lg rounded-bl-none p-3 max-w-[75%]">
                  <div className="flex items-center mb-1">
                    <FaRobot className="text-xs opacity-70 mr-1" />
                    <span className="font-semibold">AI Tutor</span>
                  </div>
                  <div className="flex items-center">
                    <FaSpinner className="animate-spin mr-2" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
                Error: {error}. Please try again.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
            disabled={!message.trim() || isLoading}
          >
            {isLoading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AiTutorChat; 
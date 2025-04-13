import React, { useState, useRef, useEffect } from 'react';
import { postChatMessage, testGemini } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner, FaLightbulb, FaBookOpen, FaGraduationCap, FaQuestionCircle } from 'react-icons/fa';
import './AiTutorChat.css'; // Import the CSS file

const AiTutorChat = ({ message, setMessage, chatHistory, setChatHistory }) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [error, setError] = useState(null);
  const [lastApiResponse, setLastApiResponse] = useState(null);
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

  // Handle sending a new message (with history in prompt)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message || !message.trim()) return; 

    const userMessage = { role: 'user', content: message.trim() };
    // Optimistically update history before sending
    const currentChatHistory = [...chatHistory, userMessage]; 
    setChatHistory(currentChatHistory); // Update parent state
    
    setIsLoading(true);
    setError(null);
    setLastApiResponse(null); 
    setMessage(''); // Clear input

    try {
      // *** MODIFICATION START: Build prompt with history (Simplified) ***
      const MAX_HISTORY_TURNS = 5; // Send last 5 pairs (10 messages total)
      // Get the last N messages, including the one we just added
      const historyToSend = currentChatHistory.slice(-MAX_HISTORY_TURNS * 2);
      
      // Format history simply
      const formattedHistory = historyToSend.map(msg => {
        const prefix = msg.role === 'user' ? 'User:' : 'AI:';
        return `${prefix} ${msg.content}`;
      }).join('\n');
      
      // Construct the prompt: just the formatted history
      // The latest user message is already included at the end of formattedHistory
      const promptForApi = formattedHistory;

      console.log("Sending simplified prompt with history to testGemini:", promptForApi);

      // Call the simple testGemini function with the combined prompt
      const response = await testGemini(promptForApi);
      // *** MODIFICATION END ***

      console.log("API Response received in AiTutorChat:", response);

      if (response.success) {
        const responseText = response.data.response;
        const usageMetadata = response.data.usageMetadata;

        // Log the usage metadata
        if (usageMetadata) {
          console.log("Token Usage:", usageMetadata);
        } else {
          console.log("Token usage metadata not available in response.");
        }

        setLastApiResponse(responseText);
        // Add AI response to history (managed by parent now)
        setChatHistory((prev) => [...prev, { role: 'ai', content: responseText }]); 
      } else {
        setError(response.message || 'Failed to get response from AI tutor.');
        console.error('AI chat error (simplified history prompt):', response);
      }
    } catch (error) {
      setError('Failed to connect to the AI service. Please try again.');
      console.error('AI chat error (simplified history prompt):', error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle quick prompt selection
  const handleQuickPrompt = (promptText) => {
    setMessage(promptText);
    inputRef.current?.focus();
  };

  // Helper function to render text with **bold** formatting
  const renderFormattedContent = (text) => {
    const parts = text.split(/(\*{2})/); // Split by '**', keeping the delimiter
    let isBold = false;
    return parts.map((part, index) => {
      if ( part === '* **' || part === '**' ) {
        isBold = !isBold; // Toggle bold state
        return null; // Don't render the markers themselves
      }
      if (isBold) {
        return <strong key={index}>{part}</strong>;
      }
      return part; // Render plain text
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>
          <FaRobot className="chat-header-icon" /> AI Tutor Chat
        </h2>
        <p>Ask me anything about your courses or assignments!</p>
      </div>

      <div className="messages-area">
        {chatHistory.length === 0 ? (
          <div className="initial-prompt-container">
            <div className="initial-prompt-icon-wrapper">
              <FaRobot />
            </div>
            <h3>How can I help you today?</h3>
            <p>
              I'm your AI tutor assistant. I can help explain concepts, create study plans, 
              generate practice questions, or assist with homework problems.
            </p>
            
            <div className="prompt-buttons-grid">
              <button 
                className="prompt-button"
                onClick={() => handleQuickPrompt("Explain the concept of neural networks in AI.")}
              >
                <div className="prompt-button-icon-wrapper">
                  <FaLightbulb />
                </div>
                <div className="prompt-button-text">
                  <strong>Explain a concept</strong>
                  <span>Get clear explanations on any subject</span>
                </div>
              </button>
              
              <button 
                className="prompt-button"
                onClick={() => handleQuickPrompt("Create a study plan for my upcoming Computer Science midterm. I need to cover algorithms, data structures, and system design.")}
              >
                <div className="prompt-button-icon-wrapper">
                  <FaBookOpen />
                </div>
                <div className="prompt-button-text">
                  <strong>Make a study plan</strong>
                  <span>Get organized with a personalized schedule</span>
                </div>
              </button>
              
              <button 
                className="prompt-button"
                onClick={() => handleQuickPrompt("Generate 5 practice questions for Data Structures covering trees and graphs.")}
              >
                <div className="prompt-button-icon-wrapper">
                  <FaGraduationCap />
                </div>
                <div className="prompt-button-text">
                  <strong>Practice questions</strong>
                  <span>Test your knowledge with tailored questions</span>
                </div>
              </button>
              
              <button 
                className="prompt-button"
                onClick={() => handleQuickPrompt("Help me solve this algorithm problem: Find the maximum subarray sum in an array of integers.")}
              >
                <div className="prompt-button-icon-wrapper">
                  <FaQuestionCircle />
                </div>
                <div className="prompt-button-text">
                  <strong>Homework help</strong>
                  <span>Get guidance on solving problems</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {chatHistory.map((msg, index) => (
              <div 
                key={index} 
                className={`message-bubble-container ${msg.role === 'user' ? 'user' : 'ai'}`}
              >
                <div 
                  className={`message-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}
                >
                  <div className="message-header">
                    {msg.role === 'user' ? (
                      <div className="message-avatar-wrapper">
                        <span className="message-sender">You</span>
                        {currentUser?.photoURL ? (
                          <img src={currentUser.photoURL} alt="User" />
                        ) : (
                          <FaUser />
                        )}
                      </div>
                    ) : (
                      <div className="message-avatar-wrapper">
                        <div className="message-avatar-wrapper ai-icon">
                          <FaRobot />
                        </div>
                        <span className="message-sender">AI Tutor</span>
                      </div>
                    )}
                    <span className="message-timestamp">
                      {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="message-content">
                    {/* Use the helper function for AI messages */} 
                    {msg.role === 'ai' ? renderFormattedContent(msg.content) : msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-bubble-container ai loading-indicator">
                <div className="message-bubble ai">
                  <div className="message-header">
                     <div className="message-avatar-wrapper ai-icon">
                       <FaRobot />
                     </div>
                     <span className="message-sender">AI Tutor</span>
                   </div>
                  <div className="loading-dots">
                     <span></span><span></span><span></span>
                   </div>
                </div>
              </div>
            )}
            {error && (
              <div className="chat-error-message">
                <strong>Error</strong>
                {error}. Please try again.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <div className="chat-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="chat-input"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="chat-send-button"
            disabled={!message || !message.trim() || isLoading}
          >
            {isLoading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
          </button>
        </div>
        <div className="chat-input-hint">
          Press Enter to send message
        </div>
      </form>
    </div>
  );
};

export default AiTutorChat; 
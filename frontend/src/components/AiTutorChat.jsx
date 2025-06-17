import React, { useState, useRef, useEffect } from 'react';
import { postChatMessage, testGemini, processPDF } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner, FaLightbulb, FaBookOpen, FaGraduationCap, FaQuestionCircle, FaVolumeUp, FaPaperclip } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './AiTutorChat.css'; // Import the CSS file

const AiTutorChat = ({ message, setMessage, chatHistory, setChatHistory }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); // Add navigation hook
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [error, setError] = useState(null);
  const [lastApiResponse, setLastApiResponse] = useState(null);
  const inputRef = useRef(null);
  // Audio element reference
  const audioRef = useRef(null);
  // State to track when sound was played
  const [soundPlayed, setSoundPlayed] = useState(false);
  // Track audio loading state
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize audio and try multiple sources
  useEffect(() => {
    // Create the audio element
    const audio = new Audio();
    
    // Try different paths - now using the r2d2.wav file
    const possiblePaths = [
      '/sounds/r2d2.wav',
      `${window.location.origin}/sounds/r2d2.wav`
    ];
    
    // Track which one succeeded
    let loadedPath = null;
    
    // Function to try loading the next path
    const tryNextPath = (index) => {
      if (index >= possiblePaths.length) {
        console.error("All audio paths failed to load", possiblePaths);
        setAudioError("Failed to load robot sound from any location");
        return;
      }
      
      const path = possiblePaths[index];
      console.log(`Trying to load audio from: ${path}`);
      
      audio.src = path;
      
      // Handle successful load
      const handleCanPlayThrough = () => {
        console.log(`Audio loaded successfully from ${path}`);
        loadedPath = path;
        setAudioLoaded(true);
        setAudioError(null);
        // Remove the error listener for this path
        audio.removeEventListener('error', handleError);
      };
      
      // Handle load error - try next path
      const handleError = (e) => {
        console.warn(`Failed to load audio from ${path}`, e);
        // Remove listeners for this path
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        // Try the next path
        tryNextPath(index + 1);
      };
      
      // Set up event listeners
      audio.addEventListener('canplaythrough', handleCanPlayThrough);
      audio.addEventListener('error', handleError);
      
      // Start loading
      audio.load();
    };
    
    // Start with the first path
    tryNextPath(0);
    
    // Set the ref
    audioRef.current = audio;
    
    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play robot sound function
  const playRobotSound = () => {
    console.log("Robot clicked! Attempting to play sound...");
    if (audioRef.current) {
      if (!audioLoaded) {
        console.warn("Audio not yet loaded, showing visual feedback only");
        setSoundPlayed(true);
        setTimeout(() => setSoundPlayed(false), 500);
        return;
      }
      
      audioRef.current.currentTime = 0;
      audioRef.current.play()
        .then(() => {
          console.log("Sound played successfully!");
          setSoundPlayed(true);
          setTimeout(() => setSoundPlayed(false), 500);
        })
        .catch(error => {
          console.error("Error playing sound:", error);
          // Visual feedback if sound fails
          setSoundPlayed(true);
          setTimeout(() => setSoundPlayed(false), 500);
        });
    }
  };

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

  // Handle navigation to different pages based on quick prompt selection
  const handleNavigateToPage = (page) => {
    playRobotSound(); // Play sound for feedback
    setTimeout(() => {
      navigate(page);
    }, 300); // Small delay to let sound play
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB');
      return;
    }
    setIsUploading(true);
    try {
      const response = await processPDF(file);
      const userMessage = { role: 'user', content: 'I uploaded a PDF for analysis.' };
      const aiMessage = { role: 'ai', content: response.text };
      setChatHistory(prev => [...prev, userMessage, aiMessage]);
    } catch (error) {
      console.error('Error uploading PDF:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to process PDF. Please try again.';
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="chat-container">
      {/* Remove the embedded audio element since we're creating it in JavaScript */}
      
      <div className="chat-header">
        <h2>
          <div className={`robot-logo-clickable ${soundPlayed ? 'robot-active' : ''} ${audioLoaded ? 'loaded' : 'not-loaded'}`} onClick={playRobotSound}>
            <FaRobot className="chat-header-icon" />
            {soundPlayed && <span className="sound-wave"></span>}
            {!audioLoaded && <span className="sound-status-indicator"></span>}
          </div>
          AI Tutor Chat
        </h2>
        <p>Ask me anything about your courses or assignments!</p>
      </div>

      <div className="messages-area">
        {chatHistory.length === 0 ? (
          <div className="initial-prompt-container">
            <div 
              className={`initial-prompt-icon-wrapper ${soundPlayed ? 'robot-active' : ''} ${audioLoaded ? 'loaded' : 'not-loaded'}`} 
              onClick={playRobotSound}
            >
              <FaRobot />
              {soundPlayed && <span className="big-sound-wave"></span>}
              {!audioLoaded && <span className="big-sound-status-indicator"></span>}
            </div>
            <h3>How can I help you today?</h3>
            <p>
              I'm your AI tutor assistant. I can help explain concepts, create study plans, 
              generate practice questions, or assist with homework problems.
            </p>
            
            <div className="prompt-buttons-grid">
              <button 
                className="prompt-button"
                onClick={() => handleNavigateToPage('/ai-tutor?tab=concept')}
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
                onClick={() => handleNavigateToPage('/ai-tutor?tab=studyPlan')}
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
                onClick={() => handleNavigateToPage('/ai-tutor?tab=practice')}
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
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <FaSpinner className="spinner" /> : <FaPaperclip />}
          </button>
          <input
            type="text"
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="chat-input"
            disabled={isLoading || isUploading}
          />
          <button
            type="submit"
            className="chat-send-button"
            disabled={!message || !message.trim() || isLoading || isUploading}
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
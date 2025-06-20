import React, { useState, useRef, useEffect } from 'react';
import { postChatMessage, testGemini, processPDF, processPDFWithMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner, FaLightbulb, FaBookOpen, FaGraduationCap, FaQuestionCircle, FaVolumeUp, FaPaperclip, FaUpload, FaFileAlt, FaChalkboardTeacher, FaUsers } from 'react-icons/fa';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [recentPDFs, setRecentPDFs] = useState([]); // Store recent PDF info for memory
  const [showPDFDropdown, setShowPDFDropdown] = useState(false);
  const fileInputRef = useRef(null);
  
  // Enhanced drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const chatContainerRef = useRef(null);

  // Classroom context states
  const [availableClassrooms, setAvailableClassrooms] = useState({ teaching: [], enrolled: [] });
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [showClassroomDropdown, setShowClassroomDropdown] = useState(false);
  const [classroomMaterials, setClassroomMaterials] = useState([]);

  // Fetch available classrooms on component mount
  useEffect(() => {
    fetchAvailableClassrooms();
  }, [currentUser]);

  const fetchAvailableClassrooms = async () => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/ai/classrooms', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableClassrooms(data.data);
      }
    } catch (error) {
      console.error('Error fetching available classrooms:', error);
    }
  };

  const handleClassroomSelect = async (classroom) => {
    setSelectedClassroom(classroom);
    setShowClassroomDropdown(false);
    
    // Fetch integrated materials for this classroom or course
    if (classroom) {
      try {
        const token = await currentUser.getIdToken();
        const contextType = classroom.type || 'classroom';
        const response = await fetch(`/api/ai/materials/${classroom.id}?type=${contextType}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setClassroomMaterials(data.data || {});
        }
      } catch (error) {
        console.error('Error fetching context materials:', error);
      }
    } else {
      setClassroomMaterials({});
    }
  };

  const ClassroomSelector = () => (
    <div className="classroom-selector relative">
      <button
        onClick={() => setShowClassroomDropdown(!showClassroomDropdown)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
      >
        {selectedClassroom ? (
          <>
            <FaChalkboardTeacher className="text-blue-600" />
            <span>{selectedClassroom.name}</span>
            <span className="text-xs text-gray-500">({selectedClassroom.role})</span>
          </>
        ) : (
          <>
            <FaUsers className="text-gray-400" />
            <span className="text-gray-600">Select Classroom</span>
          </>
        )}
      </button>

      {showClassroomDropdown && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="p-2">
            <button
              onClick={() => handleClassroomSelect(null)}
              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                !selectedClassroom ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FaUsers className="text-gray-400" />
                <span>General AI Tutor (No classroom context)</span>
              </div>
            </button>
            
            {availableClassrooms.teaching?.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Teaching
                </div>
                {availableClassrooms.teaching.map(classroom => (
                  <button
                    key={classroom.id}
                    onClick={() => handleClassroomSelect(classroom)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                      selectedClassroom?.id === classroom.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FaChalkboardTeacher className="text-blue-600" />
                        <div>
                          <div className="font-medium">{classroom.name}</div>
                          <div className="text-xs text-gray-500">{classroom.subject}</div>
                        </div>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Teacher</span>
                    </div>
                  </button>
                ))}
              </>
            )}

            {availableClassrooms.enrolled?.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Enrolled
                </div>
                {availableClassrooms.enrolled.map(classroom => (
                  <button
                    key={classroom.id}
                    onClick={() => handleClassroomSelect(classroom)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                      selectedClassroom?.id === classroom.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FaGraduationCap className="text-green-600" />
                        <div>
                          <div className="font-medium">{classroom.name}</div>
                          <div className="text-xs text-gray-500">{classroom.subject}</div>
                        </div>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Student</span>
                    </div>
                  </button>
                ))}
              </>
            )}

            {availableClassrooms.courses?.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  My Courses
                </div>
                {availableClassrooms.courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => handleClassroomSelect(course)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                      selectedClassroom?.id === course.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FaBookOpen className="text-purple-600" />
                        <div>
                          <div className="font-medium">{course.name}</div>
                          <div className="text-xs text-gray-500">
                            {course.subject} {course.semester && `• ${course.semester} ${course.year}`}
                          </div>
                          {course.totalIntegrations > 0 && (
                            <div className="text-xs text-blue-600">
                              {course.totalIntegrations} integrations • {course.totalAssignments} assignments
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        course.role === 'creator' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {course.role === 'creator' ? 'Creator' : 'Member'}
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}

            {!availableClassrooms.teaching?.length && !availableClassrooms.enrolled?.length && !availableClassrooms.courses?.length && (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                <FaUsers className="mx-auto mb-2 text-gray-300" size={24} />
                <p>No classrooms or courses available</p>
                <p className="text-xs mt-1">Create or join a classroom/course to get started</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

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

  // Enhanced drag and drop event handlers
  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragDepth(prev => prev + 1);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragOver(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragDepth(prev => {
        const newDepth = prev - 1;
        if (newDepth === 0) {
          setIsDragOver(false);
        }
        return newDepth;
      });
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      handleFileDrop(e);
    };

    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener('dragenter', handleDragEnter);
      chatContainer.addEventListener('dragleave', handleDragLeave);
      chatContainer.addEventListener('dragover', handleDragOver);
      chatContainer.addEventListener('drop', handleDrop);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('dragenter', handleDragEnter);
        chatContainer.removeEventListener('dragleave', handleDragLeave);
        chatContainer.removeEventListener('dragover', handleDragOver);
        chatContainer.removeEventListener('drop', handleDrop);
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
    
    // Check if we have either a message or an attached file
    if ((!message || !message.trim()) && !attachedFile) {
      return;
    }

    const messageToSend = message ? message.trim() : '';
    const fileToSend = attachedFile;
    
    // Clear input and attachment
    setMessage('');
    setAttachedFile(null);
    setIsLoading(true);

    try {
      let response;
      
      if (fileToSend) {
        // Handle PDF with message
        setIsUploading(true);
        setUploadProgress(0);
        setUploadMessage('Starting...');

        // Add user message with attachment to chat
        const userMessage = {
          text: messageToSend || 'Uploaded a PDF file for analysis',
          sender: 'user',
          timestamp: new Date().toISOString(),
          attachment: {
            name: fileToSend.name,
            type: 'pdf'
          }
        };
        setChatHistory(prev => [...prev, userMessage]);

        // Create prompt with chat history and PDF context (no assumptions)
        let fullPrompt = messageToSend || `Please analyze this PDF file "${fileToSend.name}" and provide a comprehensive summary of its contents.`;
        
        // Add recent chat history for context
        if (chatHistory.length > 0) {
          const recentHistory = chatHistory.slice(-6); // Last 6 messages for context
          const historyContext = recentHistory.map(msg => {
            const role = (msg.sender === 'user' || msg.role === 'user') ? 'User' : 'AI';
            return `${role}: ${msg.text || msg.content}`;
          }).join('\n');
          fullPrompt = `Recent conversation:\n${historyContext}\n\nUser's current message: "${fullPrompt}"`;
        }

        // Add PDF context if available (just for reference, no assumptions)
        if (recentPDFs.length > 0) {
          const pdfContext = recentPDFs.map((pdf, index) => 
            `Previous PDF ${index + 1}: "${pdf.name}" (uploaded ${pdf.timestamp})`
          ).join('\n');
          fullPrompt += `\n\nFor reference, recent PDFs in this conversation:\n${pdfContext}\n\nCurrent PDF: "${fileToSend.name}"`;
        }

        // Process PDF with message and real progress tracking
        response = await processPDFWithMessage(
          fileToSend, 
          fullPrompt,
          (progress, message) => {
            setUploadProgress(Math.min(progress, 100)); // Cap at 100%
            setUploadMessage(message);
          }
        );

        setIsUploading(false);

        if (response.success) {
          // Add PDF to recent PDFs memory (keep last 3 PDFs)
          const newPDF = {
            name: fileToSend.name,
            timestamp: new Date().toLocaleString(),
            content: response.data.text?.substring(0, 500) + '...' // Store summary
          };
          setRecentPDFs(prev => [...prev.slice(-2), newPDF]); // Keep last 3 PDFs

          // Add AI response to chat history
          const aiMessage = {
            text: response.data.text,
            sender: 'ai',
            timestamp: new Date().toISOString(),
            usageMetadata: response.data.usageMetadata
          };
          setChatHistory(prev => [...prev, aiMessage]);
        } else {
          throw new Error(response.error || 'Failed to process PDF with message');
        }
      } else {
        // Handle regular text message with full chat history
        const userMessage = {
          text: messageToSend,
          sender: 'user',
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, userMessage]);

        // Create comprehensive chat history for API
        const fullChatHistory = [...chatHistory, userMessage];
        
        // Add PDF context only if user's message might reference documents
        let enhancedMessage = messageToSend;
        if (recentPDFs.length > 0) {
          const messageWords = messageToSend.toLowerCase();
          const documentKeywords = ['pdf', 'document', 'file', 'paper', 'previous', 'earlier', 'last', 'that', 'this', 'it', 'compare', 'difference', 'similar'];
          const mightReferenceDocs = documentKeywords.some(keyword => messageWords.includes(keyword));
          
          if (mightReferenceDocs) {
            const pdfContext = recentPDFs.map((pdf, index) => 
              `PDF ${index + 1}: "${pdf.name}" (uploaded ${pdf.timestamp})`
            ).join('\n');
            enhancedMessage += `\n\n[Context: Recent PDFs in this conversation: ${pdfContext}]`;
          }
        }

        // Send to chat API with proper history and classroom context
        const chatData = {
          history: fullChatHistory.slice(0, -1).map(msg => ({
            role: (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'ai',
            content: msg.text || msg.content
          })), // All history except the current message, properly formatted
          message: enhancedMessage,
          classroomId: selectedClassroom?.type === 'classroom' ? selectedClassroom?.id : null,
          courseId: selectedClassroom?.type === 'course' ? selectedClassroom?.id : null
        };

        response = await postChatMessage(chatData);

        if (response.success) {
          const aiMessage = {
            text: response.data.response,
            sender: 'ai',
            timestamp: new Date().toISOString(),
            usageMetadata: response.data.usageMetadata
          };
          setChatHistory(prev => [...prev, aiMessage]);
        } else {
          throw new Error(response.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message. Please try again.');
      
      // Add error message to chat
      const errorMessage = {
        text: `Error: ${error.message || 'Failed to process your request'}`,
        sender: 'error',
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadMessage('');
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
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress updates for user feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const increment = Math.random() * 15 + 5; // Random increment between 5-20
          const newProgress = prev + increment;
          
          // Cap progress at 95% until we get the actual response
          if (newProgress >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return newProgress;
        });
      }, 300);

      const response = await processPDF(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success || response.text) {
        const aiMessage = {
          role: 'ai',
          content: response.text || response.data?.text || 'PDF processed successfully!'
        };
        setChatHistory(prev => [...prev, aiMessage]);
        
        // Show success briefly then reset
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1000);
      } else {
        throw new Error(response.error || 'Failed to process PDF');
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      setError(error.message || 'Failed to process PDF. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragDepth(0);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      setAttachedFile(pdfFile);
    } else {
      setError('Please drop a PDF file.');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setAttachedFile(file);
    } else {
      setError('Please select a PDF file.');
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearPDFMemory = () => {
    setRecentPDFs([]);
    setShowPDFDropdown(false);
  };

  const removePDFFromMemory = (indexToRemove) => {
    setRecentPDFs(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const togglePDFDropdown = () => {
    setShowPDFDropdown(prev => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPDFDropdown && !event.target.closest('.pdf-memory-container')) {
        setShowPDFDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPDFDropdown]);

  return (
    <div 
      ref={chatContainerRef}
      className={`enhanced-chat-container ${isDragOver ? 'drag-over' : ''}`}
    >
      {/* Enhanced Drag Overlay */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <div className="drag-icon-wrapper">
              <FaUpload className="drag-icon" />
              <div className="drag-pulse"></div>
            </div>
            <h3 className="drag-title">Drop your PDF here</h3>
            <p className="drag-subtitle">Release to upload and analyze your document</p>
            <div className="drag-supported-formats">
              <span className="format-badge">
                <FaFileAlt />
                PDF Files Only
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {isUploading && uploadProgress > 0 && (
        <div className="upload-progress-overlay">
          <div className="upload-progress-content">
            <div className="upload-icon-wrapper">
              <FaSpinner className="upload-spinner" />
            </div>
            <h3 className="upload-title">{uploadMessage || 'Processing your PDF...'}</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="upload-percentage">{Math.min(Math.round(uploadProgress), 100)}% complete</p>
          </div>
        </div>
      )}
      
      <div className="enhanced-chat-header">
        <div className="chat-header-main">
        <div className="chat-header-content">
          <h2 className="chat-title">
            <div className={`enhanced-robot-logo ${soundPlayed ? 'robot-active' : ''} ${audioLoaded ? 'loaded' : 'not-loaded'}`} onClick={playRobotSound}>
              <FaRobot className="chat-header-icon" />
              {soundPlayed && <span className="sound-wave"></span>}
              {!audioLoaded && <span className="sound-status-indicator"></span>}
            </div>
            AI Tutor Chat
          </h2>
          <p className="chat-description">
              {selectedClassroom ? (
                <>
                  Chatting with context from <strong>{selectedClassroom.name}</strong> classroom.
                  {classroomMaterials.length > 0 && (
                    <span className="text-sm text-blue-600"> I have access to your course materials!</span>
                  )}
                </>
              ) : (
                'Ask me anything about your courses or assignments!'
              )}
            {recentPDFs.length > 0 && (
              <div className="pdf-memory-container">
                <span 
                  className="pdf-memory-indicator"
                  onClick={togglePDFDropdown}
                  onMouseEnter={() => setShowPDFDropdown(true)}
                >
                  📄 {recentPDFs.length} recent PDF{recentPDFs.length > 1 ? 's' : ''} in memory
                </span>
                {showPDFDropdown && (
                  <div 
                    className="pdf-memory-dropdown"
                    onMouseLeave={() => setShowPDFDropdown(false)}
                  >
                    <div className="pdf-dropdown-header">
                      <span>Recent PDFs</span>
                      <button 
                        className="clear-all-btn"
                        onClick={clearPDFMemory}
                        title="Clear all PDFs"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="pdf-dropdown-list">
                      {recentPDFs.map((pdf, index) => (
                        <div key={index} className="pdf-dropdown-item">
                          <div className="pdf-item-info">
                            <div className="pdf-item-name">📄 {pdf.name}</div>
                            <div className="pdf-item-time">{pdf.timestamp}</div>
                          </div>
                          <button
                            className="remove-pdf-btn"
                            onClick={() => removePDFFromMemory(index)}
                            title="Remove this PDF"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </p>
        </div>
        <div className="chat-header-actions">
          {recentPDFs.length > 0 && (
            <button 
              className="clear-memory-btn"
              onClick={clearPDFMemory}
              title="Clear PDF memory"
            >
              🗑️
            </button>
            )}
          </div>
        </div>
        <div className="chat-header-controls">
          <ClassroomSelector />
          {selectedClassroom && classroomMaterials.length > 0 && (
            <div className="classroom-materials-indicator">
              <span className="text-xs text-white">
                📚 {classroomMaterials.length} course materials available
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="enhanced-messages-area">
        {chatHistory.length === 0 ? (
          <div className="enhanced-initial-prompt">
            <div 
              className={`enhanced-prompt-icon-wrapper ${soundPlayed ? 'robot-active' : ''} ${audioLoaded ? 'loaded' : 'not-loaded'}`} 
              onClick={playRobotSound}
            >
              <FaRobot />
              {soundPlayed && <span className="big-sound-wave"></span>}
              {!audioLoaded && <span className="big-sound-status-indicator"></span>}
            </div>
            <h3 className="prompt-welcome-title">How can I help you today?</h3>
            <p className="prompt-welcome-subtitle">
              I'm your AI tutor assistant. I can help explain concepts, create study plans, 
              generate practice questions, or assist with homework problems.
            </p>
            
            <div className="enhanced-prompt-grid">
              <button 
                className="enhanced-prompt-button"
                onClick={() => handleNavigateToPage('/ai-tutor?tab=concept')}
              >
                <div className="prompt-button-icon-wrapper">
                  <FaLightbulb />
                </div>
                <div className="prompt-button-content">
                  <strong className="prompt-button-title">Explain a concept</strong>
                  <span className="prompt-button-desc">Get clear explanations on any subject</span>
                </div>
                <div className="prompt-button-arrow">→</div>
              </button>
              
              <button 
                className="enhanced-prompt-button"
                onClick={() => handleNavigateToPage('/ai-tutor?tab=studyPlan')}
              >
                <div className="prompt-button-icon-wrapper">
                  <FaBookOpen />
                </div>
                <div className="prompt-button-content">
                  <strong className="prompt-button-title">Make a study plan</strong>
                  <span className="prompt-button-desc">Get organized with a personalized schedule</span>
                </div>
                <div className="prompt-button-arrow">→</div>
              </button>
              
              <button 
                className="enhanced-prompt-button"
                onClick={() => handleNavigateToPage('/ai-tutor?tab=practice')}
              >
                <div className="prompt-button-icon-wrapper">
                  <FaGraduationCap />
                </div>
                <div className="prompt-button-content">
                  <strong className="prompt-button-title">Practice questions</strong>
                  <span className="prompt-button-desc">Test your knowledge with tailored questions</span>
                </div>
                <div className="prompt-button-arrow">→</div>
              </button>
              
              <button 
                className="enhanced-prompt-button"
                onClick={() => handleQuickPrompt("Help me solve this algorithm problem: Find the maximum subarray sum in an array of integers.")}
              >
                <div className="prompt-button-icon-wrapper">
                  <FaQuestionCircle />
                </div>
                <div className="prompt-button-content">
                  <strong className="prompt-button-title">Homework help</strong>
                  <span className="prompt-button-desc">Get guidance on solving problems</span>
                </div>
                <div className="prompt-button-arrow">→</div>
              </button>
            </div>
            
            <div className="upload-suggestion">
              <div className="upload-suggestion-content">
                <FaUpload className="upload-suggestion-icon" />
                <span>Drag & drop PDF files anywhere to analyze them instantly</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="enhanced-messages-list">
            {chatHistory.map((msg, index) => (
              <div 
                key={index} 
                className={`enhanced-message-container ${(msg.sender === 'user' || msg.role === 'user') ? 'user' : msg.sender === 'error' ? 'error' : 'ai'}`}
              >
                <div 
                  className={`enhanced-message-bubble ${(msg.sender === 'user' || msg.role === 'user') ? 'user' : msg.sender === 'error' ? 'error' : 'ai'}`}
                >
                  <div className="enhanced-message-header">
                    {(msg.sender === 'user' || msg.role === 'user') ? (
                      <div className="enhanced-message-avatar-wrapper">
                        <span className="enhanced-message-sender">You</span>
                        {currentUser?.photoURL ? (
                          <img src={currentUser.photoURL} alt="User" className="user-avatar" />
                        ) : (
                          <div className="avatar-icon user">
                            <FaUser />
                          </div>
                        )}
                      </div>
                    ) : msg.sender === 'error' ? (
                      <div className="enhanced-message-avatar-wrapper">
                        <div className="avatar-icon error">
                          ⚠️
                        </div>
                        <span className="enhanced-message-sender">Error</span>
                      </div>
                    ) : (
                      <div className="enhanced-message-avatar-wrapper">
                        <div className="avatar-icon ai">
                          <FaRobot />
                        </div>
                        <span className="enhanced-message-sender">AI Tutor</span>
                      </div>
                    )}
                    <span className="enhanced-message-timestamp">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="enhanced-message-content">
                    {/* Show attachment if present */}
                    {msg.attachment && (
                      <div className="message-attachment">
                        <div className="attachment-icon">
                          <FaFileAlt />
                        </div>
                        <span className="attachment-name">{msg.attachment.name}</span>
                      </div>
                    )}
                    {/* Use the helper function for AI messages */} 
                    {(msg.sender === 'ai' || msg.role === 'ai') ? renderFormattedContent(msg.text || msg.content) : (msg.text || msg.content)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="enhanced-message-container ai loading-indicator">
                <div className="enhanced-message-bubble ai">
                  <div className="enhanced-message-header">
                     <div className="avatar-icon ai">
                       <FaRobot />
                    </div>
                     <span className="enhanced-message-sender">AI Tutor</span>
                  </div>
                  <div className="enhanced-loading-dots">
                     <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="enhanced-error-message">
                <div className="error-icon-wrapper">
                  <span className="error-icon">⚠️</span>
                </div>
                <div className="error-content">
                  <strong className="error-title">Error</strong>
                  <p className="error-text">{error}. Please try again.</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="enhanced-chat-input-form">
        {/* Attachment Preview */}
        {attachedFile && (
          <div className="attachment-preview">
            <div className="attachment-item">
              <div className="attachment-icon">
                <FaFileAlt />
              </div>
              <div className="attachment-info">
                <span className="attachment-name">{attachedFile.name}</span>
                <span className="attachment-size">
                  {(attachedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <button
                type="button"
                className="attachment-remove"
                onClick={removeAttachment}
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        <div className="enhanced-chat-input-wrapper">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className={`enhanced-upload-button ${attachedFile ? 'has-attachment' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Upload PDF file"
          >
            {isUploading ? <FaSpinner className="spinner" /> : <FaPaperclip />}
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={attachedFile ? "Add a message with your PDF..." : "Type your message here..."}
            className="enhanced-chat-input"
            disabled={isLoading || isUploading}
          />
          <button
            type="submit"
            className="enhanced-chat-send-button"
            disabled={((!message || !message.trim()) && !attachedFile) || isLoading || isUploading}
          >
            {isLoading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
          </button>
        </div>
        <div className="enhanced-chat-input-hint">
          <span>
            {attachedFile 
              ? `PDF attached: ${attachedFile.name} • Press Enter to send`
              : "Press Enter to send • Drag & drop PDF files to upload"
            }
          </span>
        </div>
      </form>
    </div>
  );
};

export default AiTutorChat; 
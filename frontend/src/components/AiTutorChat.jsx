import React, { useState, useRef, useEffect } from 'react';
import { postChatMessage, testGemini, processPDF, processPDFWithMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner, FaLightbulb, FaBookOpen, FaGraduationCap, FaQuestionCircle, FaVolumeUp, FaPaperclip, FaUpload, FaFileAlt, FaChalkboardTeacher, FaUsers, FaCog, FaExternalLinkAlt, FaLayerGroup, FaCheck, FaClipboardList } from 'react-icons/fa';
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

  // Updated course context states
  const [availableCourses, setAvailableCourses] = useState({ teaching: [], enrolled: [], courses: [] });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [courseMaterials, setCourseMaterials] = useState([]);

  // Fetch available courses on component mount
  useEffect(() => {
    fetchAvailableCourses();
  }, [currentUser]);

  const fetchAvailableCourses = async () => {
    try {
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/ai/classrooms', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[AI Tutor] Received course data:', data.data);
        setAvailableCourses(data.data);
      }
    } catch (error) {
      console.error('Error fetching available courses:', error);
    }
  };

  const handleCourseSelect = async (course) => {
    setSelectedCourse(course);
    setShowCourseDropdown(false);
    
    // Fetch integrated materials for this course
    if (course && currentUser) {
      try {
        const token = await currentUser.getIdToken();
        const contextType = course.type || 'course';
        const response = await fetch(`/api/ai/materials/${course.id}?type=${contextType}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCourseMaterials(data.data || {});
        }
      } catch (error) {
        console.error('Error fetching course materials:', error);
      }
    } else {
      setCourseMaterials({});
    }
  };

  const getIntegrationIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'gradescope':
        return '🎓';
      case 'canvas':
        return '🎨';
      case 'blackboard':
        return '📋';
      case 'moodle':
        return '📚';
      default:
        return '🔗';
    }
  };

  const CourseSelector = () => (
    <div className="course-selector">
      <button
        onClick={() => setShowCourseDropdown(!showCourseDropdown)}
        className="course-selector-button"
      >
        {selectedCourse ? (
          <div className="selected-course-info">
            <div className="course-icon">
              {selectedCourse.type === 'course' ? <FaBookOpen /> : 
               selectedCourse.role === 'teacher' ? <FaChalkboardTeacher /> : <FaGraduationCap />}
            </div>
            <div className="course-details">
              <span className="course-name">{selectedCourse.name}</span>
              <span className="course-meta">
                {selectedCourse.subject && `${selectedCourse.subject} • `}
                {selectedCourse.role}
                {selectedCourse.totalIntegrations > 0 && (
                  <span className="integration-count">
                    • {selectedCourse.totalIntegrations} integrations
                  </span>
                )}
              </span>
            </div>
            <div className="selector-arrow">▼</div>
          </div>
        ) : (
          <div className="no-course-selected">
            <FaUsers className="placeholder-icon" />
            <div className="placeholder-text">
              <span className="placeholder-title">Select Course Context</span>
              <span className="placeholder-subtitle">Choose a course for enhanced AI assistance</span>
            </div>
            <div className="selector-arrow">▼</div>
          </div>
        )}
      </button>

      {showCourseDropdown && (
        <div className="course-dropdown">
          <div className="dropdown-header">
            <h3>Choose Course Context</h3>
            <p>Select a course to get AI assistance tailored to your materials and integrations</p>
          </div>
          
          <div className="dropdown-content">
            {/* General AI Option */}
            <button
              onClick={() => handleCourseSelect(null)}
              className={`course-option general-option ${!selectedCourse ? 'selected' : ''}`}
            >
              <div className="option-icon general-icon">
                <FaRobot />
              </div>
              <div className="option-content">
                <div className="option-title">General AI Tutor</div>
                <div className="option-subtitle">No specific course context</div>
              </div>
              {!selectedCourse && <FaCheck className="selected-check" />}
            </button>

            {/* My Courses */}
            {availableCourses.courses?.length > 0 && (
              <div className="course-section">
                <div className="section-header">
                  <FaBookOpen className="section-icon" />
                  <span>My Courses</span>
                </div>
                {availableCourses.courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => handleCourseSelect(course)}
                    className={`course-option ${selectedCourse?.id === course.id ? 'selected' : ''}`}
                  >
                    <div className="option-icon course-icon">
                      <FaBookOpen />
                    </div>
                    <div className="option-content">
                      <div className="option-title">{course.name}</div>
                      <div className="option-subtitle">
                        {course.subject && `${course.subject} • `}
                        {course.role}
                        {course.semester && course.year && ` • ${course.semester} ${course.year}`}
                      </div>
                      {(course.linkedIntegrations?.length > 0 || course.totalIntegrations > 0) && (
                        <div className="integration-badges">
                          {/* Show user-specific linked integrations first */}
                          {course.linkedIntegrations?.map(integration => (
                            <span key={integration.integrationId} className="integration-badge">
                              {getIntegrationIcon(integration.platform)} {integration.platformName}
                            </span>
                          )) || 
                          /* Fallback to active integrations */
                          Object.entries(course.integrations || {}).map(([platform, integration]) => 
                            integration.isActive && (
                              <span key={platform} className="integration-badge">
                                {getIntegrationIcon(platform)} {integration.platformName || platform}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                    <div className="option-stats">
                      {course.totalIntegrations > 0 && (
                        <span className="stat-item">
                          <FaLayerGroup className="stat-icon" />
                          {course.totalIntegrations}
                        </span>
                      )}
                      {course.totalAssignments > 0 && (
                        <span className="stat-item">
                          <FaFileAlt className="stat-icon" />
                          {course.totalAssignments}
                        </span>
                      )}
                    </div>
                    {selectedCourse?.id === course.id && <FaCheck className="selected-check" />}
                  </button>
                ))}
              </div>
            )}

            {/* Teaching Classrooms (Legacy) */}
            {availableCourses.teaching?.length > 0 && (
              <div className="course-section">
                <div className="section-header">
                  <FaChalkboardTeacher className="section-icon" />
                  <span>Teaching</span>
                </div>
                {availableCourses.teaching.map(classroom => (
                  <button
                    key={classroom.id}
                    onClick={() => handleCourseSelect(classroom)}
                    className={`course-option ${selectedCourse?.id === classroom.id ? 'selected' : ''}`}
                  >
                    <div className="option-icon teacher-icon">
                      <FaChalkboardTeacher />
                    </div>
                    <div className="option-content">
                      <div className="option-title">{classroom.name}</div>
                      <div className="option-subtitle">{classroom.subject} • Teacher</div>
                    </div>
                    <span className="role-badge teacher-badge">Teacher</span>
                    {selectedCourse?.id === classroom.id && <FaCheck className="selected-check" />}
                  </button>
                ))}
              </div>
            )}

            {/* Enrolled Classrooms (Legacy) */}
            {availableCourses.enrolled?.length > 0 && (
              <div className="course-section">
                <div className="section-header">
                  <FaGraduationCap className="section-icon" />
                  <span>Enrolled</span>
                </div>
                {availableCourses.enrolled.map(classroom => (
                  <button
                    key={classroom.id}
                    onClick={() => handleCourseSelect(classroom)}
                    className={`course-option ${selectedCourse?.id === classroom.id ? 'selected' : ''}`}
                  >
                    <div className="option-icon student-icon">
                      <FaGraduationCap />
                    </div>
                    <div className="option-content">
                      <div className="option-title">{classroom.name}</div>
                      <div className="option-subtitle">{classroom.subject} • Student</div>
                    </div>
                    <span className="role-badge student-badge">Student</span>
                    {selectedCourse?.id === classroom.id && <FaCheck className="selected-check" />}
                  </button>
                ))}
              </div>
            )}

            {/* Empty State */}
            {availableCourses.courses?.length === 0 && 
             availableCourses.teaching?.length === 0 && 
             availableCourses.enrolled?.length === 0 && (
              <div className="empty-courses">
                <FaBookOpen className="empty-icon" />
                <h4>No Courses Available</h4>
                <p>Create or join courses to get enhanced AI assistance with course materials and integrations.</p>
                <button 
                  onClick={() => navigate('/courses')}
                  className="go-to-courses-btn"
                >
                  Go to Courses
                </button>
              </div>
            )}
          </div>

          {/* Course Materials Preview */}
          {selectedCourse && courseMaterials && (courseMaterials.totalMaterials > 0 || courseMaterials.totalAssignments > 0) && (
            <div className="materials-preview">
              <div className="preview-header">
                <FaLayerGroup className="preview-icon" />
                <span>Available Materials</span>
              </div>
              <div className="preview-stats">
                {courseMaterials.totalMaterials > 0 && (
                  <span className="preview-stat">
                    <FaFileAlt className="preview-stat-icon" />
                    {courseMaterials.totalMaterials} materials
                  </span>
                )}
                {courseMaterials.totalAssignments > 0 && (
                  <span className="preview-stat">
                    <FaClipboardList className="preview-stat-icon" />
                    {courseMaterials.totalAssignments} assignments
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Initialize audio element
  useEffect(() => {
    // Try different sound file paths
    const soundPaths = [
      '/sounds/r2d2.wav',
      '/sounds/robot-sound.mp3',
      '/robot-sound.mp3'
    ];
    
    let currentSoundIndex = 0;
    
    const tryNextPath = (index) => {
      if (index >= soundPaths.length) {
        console.log("No sound files found, continuing without audio");
        setAudioError("No sound files available");
        return;
      }
      
      const audio = new Audio();
      const soundPath = soundPaths[index];
      audio.src = soundPath;
      
      const handleCanPlayThrough = () => {
        console.log(`Audio loaded successfully from ${soundPath}`);
        setAudioLoaded(true);
        setAudioError(null);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      };
      
      const handleError = (e) => {
        console.warn(`Failed to load audio from ${soundPath}`, e);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        tryNextPath(index + 1);
      };
      
      audio.addEventListener('canplaythrough', handleCanPlayThrough);
      audio.addEventListener('error', handleError);
      audio.load();
      audioRef.current = audio;
    };
    
    tryNextPath(0);
    
    // Drag and drop event listeners
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
      e.stopPropagation();
      setIsDragOver(false);
      setDragDepth(0);

      const files = Array.from(e.dataTransfer.files);
      const pdfFiles = files.filter(file => file.type === 'application/pdf');
      
      if (pdfFiles.length > 0) {
        // Take the first PDF file
        const file = pdfFiles[0];
        setAttachedFile(file);
        console.log('PDF file attached via drag and drop:', file.name);
      } else {
        console.log('No PDF files found in dropped items');
      }
    };

    // Add event listeners to the chat container
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('dragenter', handleDragEnter);
      container.addEventListener('dragleave', handleDragLeave);
      container.addEventListener('dragover', handleDragOver);
      container.addEventListener('drop', handleDrop);
    }

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (container) {
        container.removeEventListener('dragenter', handleDragEnter);
        container.removeEventListener('dragleave', handleDragLeave);
        container.removeEventListener('dragover', handleDragOver);
        container.removeEventListener('drop', handleDrop);
      }
    };
  }, []);

  const playRobotSound = () => {
    console.log("Robot clicked! Attempting to play sound...");
    if (audioRef.current && audioLoaded) {
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
    } else {
      console.log("Audio not loaded or not available");
      // Visual feedback even if no sound
      setSoundPlayed(true);
      setTimeout(() => setSoundPlayed(false), 500);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCourseDropdown && !event.target.closest('.course-selector')) {
        setShowCourseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCourseDropdown]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() && !attachedFile) return;

    const userMessage = message.trim();
    const messageToSend = userMessage || `[Attached PDF: ${attachedFile.name}]`;
    
    setIsLoading(true);
    setError(null);

    // Add user message to chat immediately
    const newUserMessage = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
      hasAttachment: !!attachedFile
    };

    setChatHistory(prev => [...prev, newUserMessage]);
    setMessage('');

    try {
      let response;
      
      if (attachedFile) {
        // Handle PDF processing with message
        console.log('Processing PDF with message...');
        setIsUploading(true);
        setUploadMessage('Processing PDF...');
        
        const formData = new FormData();
        formData.append('pdf', attachedFile);
        if (userMessage) {
          formData.append('message', userMessage);
        }

        response = await processPDFWithMessage(formData, (progress) => {
          setUploadProgress(progress);
        });

        setIsUploading(false);
        setUploadProgress(0);
        setUploadMessage('');

        if (response.success) {
          // Store PDF info for future reference
          const pdfInfo = {
            name: attachedFile.name,
            processed: true,
            timestamp: new Date()
          };
          setRecentPDFs(prev => [pdfInfo, ...prev.slice(0, 4)]); // Keep last 5 PDFs
        }
        
        // Clear the attached file
        setAttachedFile(null);
        } else {
        // Regular chat message
        const chatPayload = {
          message: userMessage,
          history: chatHistory,
          courseId: selectedCourse?.id,
          classroomId: selectedCourse?.type === 'classroom' ? selectedCourse.id : null
        };
        
        response = await postChatMessage(chatPayload);
          }

      console.log('Chat API Response:', response);
      setLastApiResponse(response);

        if (response.success) {
          const aiMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date(),
          materials: response.data.materials,
            usageMetadata: response.data.usageMetadata
          };
          setChatHistory(prev => [...prev, aiMessage]);
        } else {
        setError(response.message || 'Failed to get response from AI');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    setMessage(promptText);
    inputRef.current?.focus();
  };

  const handleNavigateToPage = (page) => {
    navigate(`/ai-tutor?tab=${page}`);
  };

  const renderFormattedContent = (text) => {
    if (!text) return null;
    
    // Split by double newlines to create paragraphs
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, index) => (
      <p key={index} className="message-paragraph">
        {paragraph.split('\n').map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>
            {lineIndex > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </p>
    ));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
          }

    setAttachedFile(file);
    setError(null);
    
    console.log('PDF file attached:', file.name);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setAttachedFile(file);
      console.log('PDF file dropped:', file.name);
    }
  };

  const handleFileSelect = (e) => {
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const removeAttachment = () => {
    setAttachedFile(null);
  };

  const clearPDFMemory = () => {
    setRecentPDFs([]);
  };

  const removePDFFromMemory = (indexToRemove) => {
    setRecentPDFs(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const togglePDFDropdown = () => {
    setShowPDFDropdown(!showPDFDropdown);
  };

  // Close PDF dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPDFDropdown && !event.target.closest('.pdf-memory-container')) {
        setShowPDFDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
              {selectedCourse ? (
                <>
                  Chatting with context from <strong>{selectedCourse.name}</strong> course.
                  {courseMaterials.length > 0 && (
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
          <CourseSelector />
          {selectedCourse && courseMaterials.length > 0 && (
            <div className="classroom-materials-indicator">
              <span className="text-xs text-white">
                📚 {courseMaterials.length} course materials available
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
import React, { useState, useRef, useEffect } from 'react';
import { chatAsk, ragIngest, ragHealth, testGemini, processPDF, processPDFWithMessage, getGradescopeAssignmentPDF, api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import useCourseOptions from '../hooks/useCourseOptions';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner, FaLightbulb, FaBookOpen, FaGraduationCap, FaQuestionCircle, FaVolumeUp, FaPaperclip, FaUpload, FaFileAlt, FaChalkboardTeacher, FaUsers, FaCog, FaExternalLinkAlt, FaLayerGroup, FaCheck, FaClipboardList, FaSync, FaTrashAlt } from 'react-icons/fa';
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
  const [refreshingItems, setRefreshingItems] = useState(new Set()); // Track which items are being refreshed
  const [showPDFDropdown, setShowPDFDropdown] = useState(false);
  const fileInputRef = useRef(null);
  
  // Enhanced drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const chatContainerRef = useRef(null);

  // Updated course context states
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [courseMaterials, setCourseMaterials] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerBlobUrl, setViewerBlobUrl] = useState(null);
  
  // RAG debug and indexing states
  const [ragDebugInfo, setRagDebugInfo] = useState(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(null);
  
  // Use the shared course options hook
  const { loading: coursesLoading, courses: availableCourses, error: coursesError } = useCourseOptions();
  
  // Filter out container courses from the dropdown
  const visibleCourses = (availableCourses || []).filter(
    c => !/^\s*My Gradescope Courses\s*$/i.test(c.name || c.displayName || '')
  );

  // Build a unified list of all context items (materials + assignments)
  const allContextItems = React.useMemo(() => {
    const materials = Array.isArray(courseMaterials?.materials) ? courseMaterials.materials : [];
    const assignments = Array.isArray(courseMaterials?.assignments) ? courseMaterials.assignments : [];

    const normalizedMaterials = materials.map(m => ({
      type: m.type || 'material',
      name: m.name || m.title || 'Untitled material',
      url: m.url || m.fileUrl || null,
      sourceUrl: m.sourceUrl || m.link || null,
      content: m.content || m.text || m.extractedText || m.summary || null,
      raw: m
    }));

    const normalizedAssignments = assignments.map(a => ({
      type: 'assignment',
      name: a.name || a.title || 'Untitled assignment',
      url: a.url || a.fileUrl || null,
      sourceUrl: a.sourceUrl || a.link || null,
      content: a.description || a.instructions || a.text || null,
      platform: a.platform || 'gradescope',
      externalId: a.externalId,
      raw: a.raw || a // Use a.raw if it exists, otherwise use the whole assignment
    }));

    return [...normalizedMaterials, ...normalizedAssignments];
  }, [courseMaterials]);

  // Courses are now loaded via the useCourseOptions hook
  // No need for separate course fetching logic

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
        
        // Fetch RAG debug info
        await fetchRagDebugInfo(course.id);
        
        // Auto-reconcile RAG index (non-blocking)
        console.log('[COURSE SWITCH] auto-reconcile fired for course:', course.id);
        fetch(`/api/rag/consistency/reindex/${course.id}`, { 
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        .then(response => {
          if (response.ok) {
            console.log('[COURSE SWITCH] auto-reconcile completed for course:', course.id);
            // Show toast notification
            setUploadMessage('Syncing context...');
            setTimeout(() => setUploadMessage(''), 2000);
            // Refresh debug info after reconcile
            fetchRagDebugInfo(course.id);
          }
        })
        .catch(error => {
          console.log('[COURSE SWITCH] auto-reconcile failed (non-blocking):', error.message);
        });
      } catch (error) {
        console.error('Error fetching course materials:', error);
      }
    } else {
      setCourseMaterials({});
    }
  };

  // Fetch RAG debug information
  const fetchRagDebugInfo = async (courseId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/rag/debug/report?courseId=${courseId}`, {
        headers: {
          'X-Dev-User-Id': 'dev-cli'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRagDebugInfo(data.data);
      }
    } catch (error) {
      console.error('Error fetching RAG debug info:', error);
    }
  };

  // Refresh RAG context for the selected course
  const handleRefreshContext = async () => {
    if (!selectedCourse || !currentUser) return;
    
    setIsIndexing(true);
    setUploadMessage('Refreshing context...');
    
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/rag/consistency/reindex/${selectedCourse.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[REFRESH] Context refreshed:', data);
        setUploadMessage('Context refreshed successfully!');
        setTimeout(() => setUploadMessage(''), 3000);
        
        // Refresh debug info to update the badge
        await fetchRagDebugInfo(selectedCourse.id);
      } else {
        setUploadMessage('Failed to refresh context');
        setTimeout(() => setUploadMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error refreshing context:', error);
      setUploadMessage('Failed to refresh context');
      setTimeout(() => setUploadMessage(''), 3000);
    } finally {
      setIsIndexing(false);
    }
  };

  // Index PDFs for the selected course
  const handleIndexPDFs = async () => {
    if (!selectedCourse) return;
    
    setIsIndexing(true);
    setIndexingProgress({ message: 'Starting PDF indexing...', progress: 0 });
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/rag/index/course/${selectedCourse.id}`, {
        method: 'POST',
        headers: {
          'X-Dev-User-Id': 'dev-cli'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIndexingProgress({ 
          message: `Indexed ${data.data.indexed} PDFs, skipped ${data.data.skipped}`, 
          progress: 100 
        });
        
        // Refresh RAG debug info
        await fetchRagDebugInfo(selectedCourse.id);
      } else {
        setIndexingProgress({ message: 'Indexing failed', progress: 0 });
      }
    } catch (error) {
      console.error('Error indexing PDFs:', error);
      setIndexingProgress({ message: 'Indexing failed', progress: 0 });
    } finally {
      setIsIndexing(false);
      setTimeout(() => setIndexingProgress(null), 3000);
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
            <div className="placeholder-text">
              <span className="placeholder-title">{selectedCourse.displayName || selectedCourse.name}</span>
            </div>
          </div>
        ) : (
          <div className="no-course-selected">
            <div className="placeholder-icon"><FaUsers /></div>
            <div className="placeholder-text">
              <span className="placeholder-title">Select Course Context</span>
              <span className="placeholder-subtitle">Choose a course for enhanced AI</span>
            </div>
          </div>
        )}
        <div className="selector-arrow">▼</div>
      </button>

      {showCourseDropdown && (
        <>
          <div 
            className="course-dropdown-backdrop"
            onClick={() => setShowCourseDropdown(false)}
          />
          <div className="course-dropdown">
            <div className="dropdown-header">
              <h3>Choose Course Context</h3>
              <p>Select a course to get AI assistance with your materials</p>
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
            {availableCourses?.length > 0 && (
              <div className="course-section">
                <div className="section-header">
                  <FaBookOpen className="section-icon" />
                  <span>My Courses</span>
                </div>
                {visibleCourses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => handleCourseSelect(course)}
                    className={`course-option ${selectedCourse?.id === course.id ? 'selected' : ''}`}
                  >
                    <div className="option-icon course-icon">
                      <FaBookOpen />
                    </div>
                    <div className="option-content">
                      <div className="option-title">{course.displayName || course.name}</div>
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
                      {course.counts?.assignments > 0 && (
                        <span className="stat-item">
                          <FaFileAlt className="stat-icon" />
                          {course.counts.assignments}
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
            {visibleCourses?.length === 0 && 
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

          {/* Course Materials Preview - Compact */}
          {selectedCourse && courseMaterials && (courseMaterials.materials?.length > 0 || courseMaterials.assignments?.length > 0) && (
            <div className="materials-preview">
              <div className="preview-header">
                <FaLayerGroup className="preview-icon" />
                <span>Available: {courseMaterials.materials?.length || 0} materials, {courseMaterials.assignments?.length || 0} assignments</span>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );

  const openMaterial = async (item) => {
    console.log('--- [DEBUG] openMaterial START ---');
    console.log('Clicked Item:', item);

    try {
      setViewerLoading(true);

      // If item has a direct URL, open it directly
      if (item.url && !item.url.startsWith('blob:')) {
        console.log('[DEBUG] Item has a direct, non-blob URL. Opening directly.');
        setViewerItem(item);
        setViewerOpen(true);
        return;
      }

      // Check if this is a Gradescope assignment
      const isGradescope = (
        item.platform?.toLowerCase() === 'gradescope' ||
        item.source?.toLowerCase() === 'gradescope' ||
        item.sourcePlatform?.toLowerCase() === 'gradescope' ||
        item.raw?.platform?.toLowerCase() === 'gradescope'
      );

      if (!isGradescope) {
        console.log('[DEBUG] Item is not a Gradescope item. Opening as text.');
        setViewerItem(item);
        setViewerOpen(true);
        return;
      }

      console.log('[DEBUG] Item identified as Gradescope material.');
      
      // Get Gradescope course and assignment IDs
      const courseId = item.raw?.gsCourseId || item.raw?.courseId;
      const assignmentId = item.raw?.gsAssignmentId || item.raw?.assignmentId || item.externalId;

      console.log(`[DEBUG] Gradescope IDs: courseId=${courseId}, assignmentId=${assignmentId}`);

      if (!courseId || !assignmentId) {
        console.error('[DEBUG] Missing Gradescope IDs. Opening as text.');
        setViewerItem({ ...item, content: 'Missing Gradescope IDs. Cannot load PDF.' });
        setViewerOpen(true);
        return;
      }

      // Use the same API function as AssignmentPDFViewer
      try {
        const { getGradescopeAssignmentPDF } = await import('../services/api');
        const result = await getGradescopeAssignmentPDF(courseId, assignmentId);
        
        if (result instanceof Blob) {
          console.log('[DEBUG] Successfully fetched PDF blob. Creating URL.');
          const blobUrl = URL.createObjectURL(result);
          setViewerBlobUrl(blobUrl);
          setViewerItem({ 
            ...item, 
            url: blobUrl, 
            sourceUrl: `https://www.gradescope.com/courses/${courseId}/assignments/${assignmentId}` 
          });
          setViewerOpen(true);
        } else if (result && typeof result === 'object' && result.success === false) {
          // Handle API error response
          console.error('[DEBUG] API error response:', result);
          
          let errorMessage = 'Failed to load PDF. Please try again or open original.';
          if (result.error) {
            if (result.error.includes('session expired') || result.error.includes('reconnect')) {
              errorMessage = 'Gradescope session expired. Please reconnect your account in the Connect page to view PDFs.';
            } else if (result.error.includes('not available') || result.error.includes('programming assignment') || result.error.includes('submission access')) {
              errorMessage = 'This assignment PDF is not available for download. It may be a programming assignment or require special access. Click "Open original" to view on Gradescope.';
            } else if (result.status === 500 && result.error.includes('assignment PDF is not available')) {
              errorMessage = 'This assignment PDF is not available for download. It may be a programming assignment or require special access. Click "Open original" to view on Gradescope.';
            } else {
              errorMessage = result.error;
            }
          }
          
          setViewerItem({ 
            ...item, 
            content: errorMessage, 
            sourceUrl: `https://www.gradescope.com/courses/${courseId}/assignments/${assignmentId}` 
          });
          setViewerOpen(true);
        } else {
          console.error('[DEBUG] Unexpected result type:', typeof result, result);
          setViewerItem({ 
            ...item, 
            content: 'Failed to load PDF. Please try again or open original.', 
            sourceUrl: `https://www.gradescope.com/courses/${courseId}/assignments/${assignmentId}` 
          });
          setViewerOpen(true);
        }
      } catch (pdfError) {
        console.error('[DEBUG] Error fetching PDF:', pdfError);
        setViewerItem({ 
          ...item, 
          content: 'Failed to load PDF. Please try again or open original.', 
          sourceUrl: `https://www.gradescope.com/courses/${courseId}/assignments/${assignmentId}` 
        });
        setViewerOpen(true);
      }

    } catch (e) {
      console.error('[DEBUG] Critical error in openMaterial:', e);
      setViewerItem(item); // Show original item on error
      setViewerOpen(true);
    } finally {
      setViewerLoading(false);
      console.log('--- [DEBUG] openMaterial END ---');
    }
  };

  const refreshMaterialAnalysis = async (material) => {
    // Derive IDs robustly for Gradescope assignments/materials
    const derivedCourseId = material.raw?.gsCourseId
      || material.courseExternalId
      || selectedCourse?.externalId
      || selectedCourse?.raw?.externalId
      || material.raw?.courseId
      || null;

    const derivedAssignmentId = material.raw?.gsAssignmentId
      || material.externalId
      || material.raw?.externalId
      || material.raw?.id
      || null;

    if (!derivedCourseId || !derivedAssignmentId || !currentUser?.uid) {
      console.error('Missing required data for cache refresh:', { material, derivedCourseId, derivedAssignmentId });
      alert('Cannot refresh: missing course or assignment ID. Try opening the item once first.');
      return;
    }

    const itemKey = `${derivedCourseId}-${derivedAssignmentId}`;
    
    try {
      setRefreshingItems(prev => new Set(prev).add(itemKey));
      
      console.log(`[CACHE REFRESH] Clearing cache for ${material.name}...`);
      
      const response = await fetch('/api/cache/clear-document-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        },
        body: JSON.stringify({
          courseId: String(derivedCourseId),
          assignmentId: String(derivedAssignmentId),
          userId: currentUser.uid
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`[CACHE REFRESH] ✅ Cache cleared for ${material.name}`);
        alert(`✅ Analysis cache cleared for "${material.name}"\n\nNext time you ask about this document, it will be re-analyzed with the latest comprehensive extraction system!`);
      } else {
        console.error('[CACHE REFRESH] Failed:', result.error);
        alert(`❌ Failed to clear cache: ${result.error}`);
      }
      
    } catch (error) {
      console.error('[CACHE REFRESH] Error:', error);
      alert(`❌ Error clearing cache: ${error.message}`);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleClearAllCache = async () => {
    if (!currentUser) return;
    
    if (!window.confirm("Are you sure you want to clear the analysis cache for ALL your documents? This will trigger a fresh, full re-analysis next time you ask about any of them.")) {
      return;
    }

    try {
      console.log(`[CACHE CLEAR] Clearing all cache for user ${currentUser.uid}...`);
      
      const response = await fetch('/api/cache/clear-user-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        },
        body: JSON.stringify({ userId: currentUser.uid })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ Failed to clear cache: ${result.error}`);
      }
      
    } catch (error) {
      alert(`❌ Error clearing cache: ${error.message}`);
    }
  };

  const openSourceDocument = async (source) => {
    console.log('[SOURCES] Opening source document:', source);
    
    try {
      // Find the material in allContextItems by fileId
      const material = allContextItems.find(item => 
        item.raw?.id === source.fileId || 
        item.raw?.gsAssignmentId === source.fileId ||
        item.name === source.title ||
        item.externalId === source.fileId
      );
      
      if (material) {
        // Open the material using existing openMaterial function
        await openMaterial(material, source.page);
      } else {
        // Fallback: try to construct a Firebase Storage URL
        const storageUrl = `https://firebasestorage.googleapis.com/v0/b/studyplan-81a4f.appspot.com/o/course-materials%2F${encodeURIComponent(source.fileId)}?alt=media`;
        window.open(storageUrl, '_blank');
      }
    } catch (error) {
      console.error('[SOURCES] Error opening source document:', error);
      alert(`Could not open ${source.title}. The document may no longer be available.`);
    }
  };

  const getMaterialStatus = (item) => {
    // Check if RAG is enabled
    const RAG_ENABLED = import.meta.env.VITE_RAG_ENABLED === 'true';
    if (!RAG_ENABLED) {
      return null;
    }
    
    // Check various indicators of indexing status
    const hasExtractedContent = item.extractedContent && item.extractedContent.length > 1000;
    const hasIndexMeta = item.indexMeta && item.indexMeta.chunkCount > 0;
    const isProcessing = refreshingItems.has(`${item.raw?.gsCourseId}-${item.raw?.gsAssignmentId}`);
    
    if (isProcessing) {
      return { status: 'processing', label: 'Processing' };
    } else if (hasIndexMeta) {
      return { status: 'indexed', label: `Indexed (${item.indexMeta.chunkCount} chunks)` };
    } else if (hasExtractedContent) {
      return { status: 'indexed', label: 'Indexed' };
    } else if (item.type === 'assignment' && item.name.toLowerCase().includes('exam')) {
      return { status: 'needs-ocr', label: 'Needs OCR' };
    } else {
      return { status: 'needs-indexing', label: 'Not Indexed' };
    }
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerItem(null);
    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
      setViewerBlobUrl(null);
    }
  };

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
        // Regular chat message using RAG
        const chatPayload = {
          sessionId: `user-${currentUser?.uid || 'anonymous'}-course-${selectedCourse?.id || 'default'}`,
          courseId: selectedCourse?.id || 'cs-parallel-sp24', // Default for testing
          message: userMessage
        };
        
        console.log('Using RAG chat with payload:', chatPayload);
        response = await chatAsk(chatPayload);
          }

      console.log('Chat API Response:', response);
      setLastApiResponse(response);

        if (response.success) {
          const data = response?.data || {};
          let text = data.response || data.text || data.answer || '';
          let sources = Array.isArray(data.sources) ? data.sources : [];

          // RAG fallback if backend response is empty
          if (!text || text.trim().length === 0) {
            console.log('Backend response empty, falling back to RAG retrieve...');
            const rr = await api.ragRetrieve({ courseId: chatPayload.courseId, query: userMessage });
            const chunks = rr?.data?.chunks || rr?.chunks || [];
            sources = chunks.map((c, i) => ({
              title: c.title || c.heading || c.filename || `Doc ${i+1}`,
              fileId: c.fileId,
              page: c.page,
              score: c.score
            }));
            if (chunks.length > 0) {
              const titles = [...new Set(chunks.map(c => c.title || c.filename || 'a course document'))].slice(0,3).join(', ');
              text = `Yes—found relevant context in ${chunks.length} chunk(s) from ${titles}. What specifically should I pull from these pages?`;
            } else {
              text = `I couldn't find matching context in the course documents. Try mentioning a title or page.`;
            }
          }

          const aiMessage = {
            role: 'assistant',
            content: text,
            sources: sources,
            timestamp: new Date(),
            materials: response.data.materials, // Legacy materials
            usageMetadata: response.data.usageMetadata || response.data.usage,
            confidence: response.data.confidence
          };
          setChatHistory(prev => [...prev, aiMessage]);
        } else {
        setError(response.error || response.message || 'Failed to get response from AI');
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
                  Chatting with context from <strong>{selectedCourse.displayName || selectedCourse.name}</strong> course.
                  {(courseMaterials.materials?.length > 0 || courseMaterials.assignments?.length > 0) && (
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
          {selectedCourse && (
            <div className="selected-course-meta">
              {selectedCourse.role && (
                <span className="meta-pill role-pill"><strong>Role:</strong> {selectedCourse.role}</span>
              )}
              {typeof selectedCourse.totalIntegrations === 'number' && (
                <span className="meta-pill integrations-pill"><strong>Integrations:</strong> {selectedCourse.totalIntegrations}</span>
              )}
              {(allContextItems.length > 0) && (
                <span className="meta-pill materials-pill"><strong>Context:</strong> {allContextItems.length} items</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="enhanced-messages-area">
        {selectedCourse && allContextItems.length > 0 && (
          <div className="course-materials-display">
            <div className="materials-header">
              <div className="materials-header-left">
                <FaBookOpen className="header-icon" />
              <div className="header-text">
                <span className="header-title">Course Context Loaded</span>
                <span className="header-subtitle">{allContextItems.length} items available from <strong>{selectedCourse.name}</strong></span>
                
                {/* Manual Refresh Button */}
                <button 
                  className="refresh-context-button"
                  onClick={handleRefreshContext}
                  disabled={isIndexing}
                  title="Refresh RAG context for this course"
                >
                  <FaSync className={isIndexing ? 'spinning' : ''} />
                  Refresh Context
                </button>
                
                {/* RAG Debug Info */}
                {ragDebugInfo && (
                  <div className="rag-debug-info">
                    <div className="rag-stats">
                      <span className="stat">PDFs: {ragDebugInfo.docCounts.pdfDocs}</span>
                      <span className="stat">Metadata: {ragDebugInfo.docCounts.metadataDocs}</span>
                      <span className="stat">Chunks: {ragDebugInfo.docCounts.totalChunks}</span>
                    </div>
                    
                    {ragDebugInfo.docCounts.pdfDocs === 0 && ragDebugInfo.docCounts.metadataDocs > 0 && (
                      <div className="rag-warning">
                        <span className="warning-text">Only assignment metadata is indexed. PDF content isn't available yet.</span>
                        <button 
                          className="index-pdfs-button"
                          onClick={handleIndexPDFs}
                          disabled={isIndexing}
                        >
                          {isIndexing ? <FaSpinner className="spinning" /> : <FaSync />}
                          {isIndexing ? 'Indexing...' : 'Index PDFs now'}
                        </button>
                      </div>
                    )}
                    
                    {indexingProgress && (
                      <div className="indexing-progress">
                        <span className="progress-text">{indexingProgress.message}</span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${indexingProgress.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
              <button 
                className="clear-cache-button" 
                title="Clear all my cached document analyses. This will force a fresh, deep re-analysis for all documents."
                onClick={handleClearAllCache}
              >
                <FaTrashAlt />
              </button>
            </div>
            <div className="materials-list-container">
              {allContextItems.map((item, index) => {
                const materialStatus = getMaterialStatus(item);
                return (
                  <button key={index} className="material-file-item clickable" title={item.name} onClick={() => openMaterial(item)}>
                    <FaFileAlt className="file-icon" />
                    <span className="file-name">{item.name}</span>
                    <div className="material-actions">
                      {materialStatus && (
                        <span className={`status-badge ${materialStatus.status}`} title={materialStatus.label}>
                          {materialStatus.status === 'indexed' ? 'IDX' : 
                           materialStatus.status === 'processing' ? 'PROC' :
                           materialStatus.status === 'needs-ocr' ? 'OCR' : 'NEW'}
                        </span>
                      )}
                      <span 
                        className={`refresh-chip ${refreshingItems.has(`${item.raw?.gsCourseId}-${item.raw?.gsAssignmentId}`) ? 'refreshing' : ''}`}
                        onClick={(e) => { e.stopPropagation(); refreshMaterialAnalysis(item); }}
                        title="Refresh Analysis - Clear cache and re-analyze with latest system"
                        role="button"
                        tabIndex={0}
                      >
                        <FaSync className={refreshingItems.has(`${item.raw?.gsCourseId}-${item.raw?.gsAssignmentId}`) ? 'spinning' : ''} />
                      </span>
                      <span
                        className="debug-chip"
                        onClick={(e) => { e.stopPropagation(); alert(JSON.stringify(item, null, 2)); }}
                        title="Show Raw Data"
                        role="button"
                        tabIndex={0}
                      >
                        {'{...}'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                    
                    {/* Show materials list only when there's no assistant text */}
                    {(msg.sender === 'ai' || msg.role === 'ai') && msg.materials && msg.materials.length > 0 && (!msg.text || !msg.content || (msg.text || msg.content).trim().length === 0) && (
                      <div className="message-materials">
                        <div className="materials-header">
                          <FaBookOpen className="materials-icon" />
                          <span>Available Materials ({msg.materials.length})</span>
                        </div>
                        <div className="materials-list">
                          {msg.materials.map((material, materialIndex) => (
                            <div key={materialIndex} className="material-item">
                              <FaFileAlt className="material-file-icon" />
                              <span className="material-name">{material.name || material.title || 'Untitled'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show sources panel for AI messages with sources */}
                    {(msg.sender === 'ai' || msg.role === 'ai') && msg.sources && msg.sources.length > 0 && (
                      <div className="message-sources">
                        <div className="sources-header">
                          <FaBookOpen className="sources-icon" />
                          <span>Sources ({msg.sources.length})</span>
                        </div>
                        <div className="sources-list">
                          {msg.sources.map((source, sourceIndex) => (
                            <div 
                              key={sourceIndex} 
                              className="source-item"
                              onClick={() => openSourceDocument(source)}
                              title={`Open ${source.title}${source.page ? ` at page ${source.page}` : ''}`}
                            >
                              <FaFileAlt className="source-file-icon" />
                              <span className="source-title">{source.title}</span>
                              {source.page && <span className="source-page">p.{source.page}</span>}
                              {source.score && (
                                <span className="source-score" title={`Relevance: ${(source.score * 100).toFixed(1)}%`}>
                                  {(source.score * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

      {/* Simple Material Viewer Modal (no external deps) */}
      {viewerOpen && (
        <div className="material-viewer-backdrop" onClick={closeViewer}>
          <div className="material-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <span className="viewer-title">{viewerItem?.name || 'Material'}</span>
              <button className="viewer-close" onClick={closeViewer}>×</button>
            </div>
            <div className="viewer-content">
              {viewerLoading ? (
                <div className="viewer-empty">Loading…</div>
              ) : viewerItem?.url ? (
                <iframe src={viewerItem.url} title={viewerItem?.name || 'Material'} className="viewer-iframe" />
              ) : viewerItem?.content ? (
                <pre className="viewer-text">{viewerItem.content}</pre>
              ) : (
                <div className="viewer-empty">No preview available for this item.</div>
              )}
              {viewerItem?.sourceUrl && (
                <a className="viewer-external" href={viewerItem.sourceUrl} target="_blank" rel="noreferrer">
                  Open original <FaExternalLinkAlt />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiTutorChat; 
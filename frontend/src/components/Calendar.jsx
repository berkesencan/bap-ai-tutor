import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '../contexts/AuthContext';
import {
  getCalendarData,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  importICSCalendar
} from '../services/api';
import './Calendar.css';

const Calendar = () => {
  const { currentUser } = useAuth();
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: new Date(),
    end: new Date(),
    allDay: false,
    location: '',
    color: '#16a34a'
  });
  const [icsFile, setIcsFile] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Color options for events
  const colorOptions = [
    { value: '#16a34a', label: 'Green', color: '#16a34a' },
    { value: '#2563eb', label: 'Blue', color: '#2563eb' },
    { value: '#dc2626', label: 'Red', color: '#dc2626' },
    { value: '#7c3aed', label: 'Purple', color: '#7c3aed' },
    { value: '#ea580c', label: 'Orange', color: '#ea580c' },
    { value: '#0891b2', label: 'Cyan', color: '#0891b2' },
    { value: '#be185d', label: 'Pink', color: '#be185d' },
    { value: '#059669', label: 'Emerald', color: '#059669' }
  ];

  // Detect dark mode from browser/system preference and document class
  useEffect(() => {
    const checkDarkMode = () => {
      // For debugging, let's force light mode initially
      // and only enable dark mode if explicitly detected
      
      const systemDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const documentDarkMode = document.documentElement.classList.contains('dark') || 
                              document.body.classList.contains('dark') ||
                              document.documentElement.getAttribute('data-theme') === 'dark';
      
      // Check if your app has a specific theme system
      const appTheme = localStorage.getItem('theme') || sessionStorage.getItem('theme');
      const isAppDark = appTheme === 'dark';
      
      // FORCE LIGHT MODE FOR NOW - only go dark if explicitly set
      let isDark = false;
      
      // Only use dark mode if explicitly set in app theme
      if (appTheme === 'dark') {
        isDark = true;
      }
      // Or if document explicitly has dark class AND system is dark
      else if (documentDarkMode && systemDarkMode) {
        isDark = true;
      }
      // Otherwise, stay light
      
      console.log('🌙 Calendar Dark mode detection:', {
        systemDarkMode,
        documentDarkMode,
        appTheme,
        finalDecision: isDark,
        forceLight: !isDark,
        timestamp: new Date().toISOString()
      });
      
      setIsDarkMode(isDark);
    };
    
    // Initial check
    checkDarkMode();
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      console.log('🌙 System theme changed');
      checkDarkMode();
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
    
    // Listen for localStorage changes (theme switching)
    const handleStorageChange = () => {
      console.log('🌙 Storage theme changed');
      checkDarkMode();
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for document class changes (if your app has theme switching)
    const observer = new MutationObserver(() => {
      console.log('🌙 Document class changed');
      checkDarkMode();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
      window.removeEventListener('storage', handleStorageChange);
      observer.disconnect();
    };
  }, []);

  // Debug function to toggle theme manually
  const toggleThemeDebug = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    console.log('🌙 Manual theme toggle:', newMode ? 'dark' : 'light');
  };

  // Debug logging for theme state
  useEffect(() => {
    console.log('🎨 Calendar theme state changed:', {
      isDarkMode,
      containerClass: `calendar-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`,
      timestamp: new Date().toISOString()
    });
  }, [isDarkMode]);

  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getCalendarData();
      
      if (response.success) {
        // Transform events for FullCalendar
        const transformedEvents = response.data.events.map(event => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          allDay: event.allDay || false,
          backgroundColor: event.color || '#16a34a',
          borderColor: event.color || '#16a34a',
          textColor: '#ffffff',
          extendedProps: {
            description: event.description || '',
            location: event.location || '',
            type: event.type || 'custom',
            courseId: event.courseId,
            assignmentId: event.assignmentId,
            originalEvent: event
          }
        }));
        
        setEvents(transformedEvents);
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || 'Failed to load calendar data';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Handle event click
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    const extendedProps = event.extendedProps;
    
    if (extendedProps.type === 'assignment') {
      // For assignments, show info alert
      alert(`Assignment: ${event.title}\nDue: ${new Date(event.start).toLocaleString()}\nCourse: ${extendedProps.courseId || 'Unknown'}`);
      return;
    }
    
    // For custom events, open edit modal
    setSelectedEvent(extendedProps.originalEvent);
    setEventForm({
      title: event.title,
      description: extendedProps.description || '',
      start: new Date(event.start),
      end: new Date(event.end || event.start),
      allDay: event.allDay,
      location: extendedProps.location || '',
      color: event.backgroundColor || '#16a34a'
    });
    setShowEventModal(true);
  };

  // Handle date select (creating new event)
  const handleDateSelect = (selectInfo) => {
    setSelectedEvent(null);
    setEventForm({
      title: '',
      description: '',
      start: selectInfo.start,
      end: selectInfo.end,
      allDay: selectInfo.allDay,
      location: '',
      color: '#16a34a'
    });
    setShowEventModal(true);
    
    // Clear the selection
    selectInfo.view.calendar.unselect();
  };

  // Handle event drag and drop
  const handleEventDrop = async (dropInfo) => {
    const event = dropInfo.event;
    const extendedProps = event.extendedProps;
    
    // Don't allow moving assignments
    if (extendedProps.type === 'assignment') {
      dropInfo.revert();
      alert('Assignments cannot be moved. They are tied to course due dates.');
      return;
    }
    
    try {
      const eventData = {
        title: event.title,
        description: extendedProps.description,
        start: event.start.toISOString(),
        end: (event.end || event.start).toISOString(),
        allDay: event.allDay,
        location: extendedProps.location,
        color: event.backgroundColor
      };
      
      const response = await updateCalendarEvent(extendedProps.originalEvent.id, eventData);
      
      if (!response.success) {
        dropInfo.revert();
        alert(response.error || 'Failed to update event');
      } else {
        // Update the event in our state
        loadCalendarData();
      }
    } catch (err) {
      console.error('Error updating event:', err);
      dropInfo.revert();
      alert('Failed to update event');
    }
  };

  // Handle event resize
  const handleEventResize = async (resizeInfo) => {
    const event = resizeInfo.event;
    const extendedProps = event.extendedProps;
    
    // Don't allow resizing assignments
    if (extendedProps.type === 'assignment') {
      resizeInfo.revert();
      alert('Assignment durations cannot be changed.');
      return;
    }
    
    try {
      const eventData = {
        title: event.title,
        description: extendedProps.description,
        start: event.start.toISOString(),
        end: (event.end || event.start).toISOString(),
        allDay: event.allDay,
        location: extendedProps.location,
        color: event.backgroundColor
      };
      
      const response = await updateCalendarEvent(extendedProps.originalEvent.id, eventData);
      
      if (!response.success) {
        resizeInfo.revert();
        alert(response.error || 'Failed to update event');
      } else {
        loadCalendarData();
      }
    } catch (err) {
      console.error('Error updating event:', err);
      resizeInfo.revert();
      alert('Failed to update event');
    }
  };

  // Handle event form submission
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    
    if (!eventForm.title.trim()) {
      alert('Please enter a title for the event');
      return;
    }
    
    setLoading(true);
    
    try {
      const eventData = {
        ...eventForm,
        start: eventForm.start.toISOString(),
        end: eventForm.end.toISOString()
      };
      
      let response;
      if (selectedEvent) {
        response = await updateCalendarEvent(selectedEvent.id, eventData);
      } else {
        response = await createCalendarEvent(eventData);
      }
      
      if (response.success) {
        setShowEventModal(false);
        loadCalendarData();
      } else {
        alert(response.error || 'Failed to save event');
      }
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async () => {
    if (!selectedEvent || !confirm('Are you sure you want to delete this event?')) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await deleteCalendarEvent(selectedEvent.id);
      
      if (response.success) {
        setShowEventModal(false);
        loadCalendarData();
      } else {
        alert(response.error || 'Failed to delete event');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  // Handle ICS file import
  const handleICSImport = async () => {
    if (!icsFile) {
      alert('Please select an ICS file to import');
      return;
    }
    
    setLoading(true);
    
    try {
      const fileContent = await icsFile.text();
      const response = await importICSCalendar(fileContent);
      
      if (response.success) {
        alert(response.data.message);
        setShowImportModal(false);
        setIcsFile(null);
        loadCalendarData();
      } else {
        alert(response.error || 'Failed to import calendar');
      }
    } catch (err) {
      console.error('Error importing ICS file:', err);
      alert('Failed to import calendar');
    } finally {
      setLoading(false);
    }
  };

  // Format datetime for input
  const formatDateTimeLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  if (loading && events.length === 0) {
    return (
      <div className="calendar-container">
        <div className="calendar-loading">
          <div className="spinner"></div>
          <p>Loading your calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`calendar-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="calendar-header">
        <h2 className="calendar-section-title">
          <span className="calendar-icon">📅</span>
          Your Calendar
        </h2>
        <p className="calendar-subtitle">
          Manage your events, assignments, and schedule all in one place
        </p>
        <div className="calendar-actions">
          <button 
            className="action-button primary"
            onClick={() => setShowImportModal(true)}
            disabled={loading}
          >
            📥 Import Calendar
          </button>
          
          <button 
            className="action-button primary"
            onClick={() => handleDateSelect({ start: new Date(), end: new Date(), allDay: false })}
            disabled={loading}
          >
            ➕ Add Event
          </button>
        </div>
      </div>

      {error && (
        <div className="calendar-error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={loadCalendarData} className="retry-button">
            Retry
          </button>
        </div>
      )}

      <div className="calendar-wrapper">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          events={events}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          eventClick={handleEventClick}
          select={handleDateSelect}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="auto"
          aspectRatio={1.8}
          nowIndicator={true}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
            startTime: '08:00',
            endTime: '18:00'
          }}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          expandRows={true}
          eventDisplay="block"
          displayEventTime={true}
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: false,
            meridiem: 'short'
          }}
          dayHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric' }}
          titleFormat={{ year: 'numeric', month: 'long' }}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            list: 'List',
            multiMonthYear: 'Year'
          }}
          moreLinkClick="popover"
          navLinks={true}
          eventClassNames={(arg) => {
            const classes = ['fc-event-custom'];
            if (arg.event.extendedProps.type === 'assignment') {
              classes.push('fc-event-assignment');
            }
            if (isDarkMode) {
              classes.push('fc-event-dark');
            }
            return classes;
          }}
        />
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedEvent ? 'Edit Event' : 'Create Event'}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowEventModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleEventSubmit} className="event-form">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  placeholder="Event title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  placeholder="Event description"
                  rows={3}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    id="start"
                    value={formatDateTimeLocal(eventForm.start)}
                    onChange={(e) => setEventForm({...eventForm, start: new Date(e.target.value)})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="end">End Date & Time</label>
                  <input
                    type="datetime-local"
                    id="end"
                    value={formatDateTimeLocal(eventForm.end)}
                    onChange={(e) => setEventForm({...eventForm, end: new Date(e.target.value)})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={eventForm.allDay}
                    onChange={(e) => setEventForm({...eventForm, allDay: e.target.checked})}
                  />
                  All Day Event
                </label>
              </div>
              
              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                  placeholder="Event location"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="color">Color</label>
                <div className="color-picker">
                  {colorOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`color-option ${eventForm.color === option.value ? 'selected' : ''}`}
                      style={{ backgroundColor: option.color }}
                      onClick={() => setEventForm({...eventForm, color: option.value})}
                      title={option.label}
                    />
                  ))}
                </div>
              </div>
              
              <div className="modal-actions">
                {selectedEvent && (
                  <button
                    type="button"
                    className="action-button danger"
                    onClick={handleDeleteEvent}
                    disabled={loading}
                  >
                    🗑️ Delete
                  </button>
                )}
                
                <div className="action-group">
                  <button
                    type="button"
                    className="action-button secondary"
                    onClick={() => setShowEventModal(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    className="action-button primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : selectedEvent ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import Calendar</h3>
              <button 
                className="modal-close"
                onClick={() => setShowImportModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="import-content">
              <p className="import-description">
                Import events from your Google Calendar, Outlook, Apple Calendar, or any other calendar app 
                by uploading an ICS file.
              </p>
              
              <div className="import-instructions">
                <h4>How to export your calendar:</h4>
                <ul>
                  <li><strong>Google Calendar:</strong> Settings → Import & Export → Export</li>
                  <li><strong>Outlook:</strong> File → Save Calendar → Save as iCalendar (.ics)</li>
                  <li><strong>Apple Calendar:</strong> File → Export → Export as iCalendar (.ics)</li>
                  <li><strong>Other apps:</strong> Look for "Export" or "Download" options</li>
                </ul>
              </div>
              
              <div className="file-upload">
                <input
                  type="file"
                  accept=".ics"
                  onChange={(e) => setIcsFile(e.target.files[0])}
                  className="file-input"
                  id="ics-file"
                />
                <label htmlFor="ics-file" className="file-label">
                  {icsFile ? `📄 ${icsFile.name}` : '📁 Choose ICS file...'}
                </label>
              </div>
              
              <div className="modal-actions">
                <button
                  type="button"
                  className="action-button secondary"
                  onClick={() => setShowImportModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  className="action-button primary"
                  onClick={handleICSImport}
                  disabled={loading || !icsFile}
                >
                  {loading ? 'Importing...' : 'Import Calendar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar; 
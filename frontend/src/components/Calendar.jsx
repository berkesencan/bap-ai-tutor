import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar as RBCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { startOfWeek, getDay, format, parse, add, sub, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import YearGrid from './YearGrid';
import { useAuth } from '../contexts/AuthContext';
import {
  getCalendarData,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  importICSCalendar
} from '../services/api';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendar.css';
import './rb-overrides.css';

// Configure date-fns localizer for React Big Calendar
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }), // Sunday
  getDay,
  locales: { 'en-US': enUS },
});

const Calendar = () => {
  const { currentUser } = useAuth();
  const calendarRef = useRef(null);
  
  // State management
  const [currentDate, setCurrentDate] = useState(() => {
    // Restore date from localStorage on initial load
    const savedDate = localStorage.getItem('calendar-date');
    if (savedDate) {
      return new Date(savedDate);
    }
    // Default to December 2024 where assignments are available
    return new Date(2024, 11, 1); // December 2024
  });
  const [currentView, setCurrentView] = useState(() => {
    // Restore view from localStorage on initial load
    return localStorage.getItem('calendar-view') || 'month';
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayEvents, setDayEvents] = useState([]);
  const [dayLoading, setDayLoading] = useState(false); // Separate loading state for day popups
  const [cameFromDayModal, setCameFromDayModal] = useState(false); // Track if assignment modal was opened from day modal
  
  // Event form state
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
  
  // Filter states
  const [filters, setFilters] = useState({
    platforms: {
      bap: true,
      gradescope: true,
      canvas: true,
      blackboard: true,
      brightspace: true,
      moodle: true,
      unknown: true
    },
    courses: {}
  });
  const [availableCourses, setAvailableCourses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // SMART CACHING SYSTEM
  const eventCache = useRef(new Map()); // Cache events by month key
  const loadingStates = useRef(new Set()); // Track what's being loaded
  const dayEventsCache = useRef(new Map()); // Cache events by specific day
  
  // Generate cache key for a date range
  const getCacheKey = (date, view) => {
    // Add safety checks
    if (!date || !view) {
      console.warn('getCacheKey called with invalid parameters:', { date, view });
      return 'fallback-key';
    }
    
    // Ensure date is a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to getCacheKey:', date);
      return 'fallback-key';
    }
    
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    
    // Ensure view is a string
    const viewType = typeof view === 'string' ? view : (view?.type || 'month');
    
    if (viewType === 'year') {
      return `year-${year}`;
    } else if (viewType === 'month') {
      return `month-${year}-${month}`;
    } else if (viewType.includes && viewType.includes('week')) {
      // For week views, use the week number
      const weekStart = new Date(dateObj);
      weekStart.setDate(dateObj.getDate() - dateObj.getDay());
      return `week-${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
    } else {
      // For day view
      return `day-${year}-${month}-${dateObj.getDate()}`;
    }
  };
  
  // Get date range for a view
  const getDateRange = (date, view) => {
    // Add safety checks
    if (!date || !view) {
      console.warn('getDateRange called with invalid parameters:', { date, view });
      return null;
    }
    
    // Ensure date is a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to getDateRange:', date);
      return null;
    }
    
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    
    // Ensure view is a string
    const viewType = typeof view === 'string' ? view : (view?.type || 'month');
    
    if (viewType === 'year') {
      // For year view, we don't load any events
      return null;
    } else if (viewType === 'month') {
      // Load full month + buffer
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start, end };
    } else if (viewType.includes && viewType.includes('week')) {
      // Load week + buffer
      const weekStart = new Date(dateObj);
      weekStart.setDate(dateObj.getDate() - dateObj.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59);
      return { start: weekStart, end: weekEnd };
    } else {
      // For day view, load the whole month containing this day
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start, end };
    }
  };

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

  // Custom Month View Component
  const CustomMonthView = ({ date, events, onSelectSlot, onSelectEvent }) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = new Date(calendarStart);
    calendarEnd.setDate(calendarEnd.getDate() + 41); // 6 weeks

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getEventsForDay = (day) => {
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start);
        return isSameDay(eventDate, day);
      });
      
      // Sort events by time within the day
      return dayEvents.sort((a, b) => {
        const timeA = new Date(a.start).getTime();
        const timeB = new Date(b.start).getTime();
        return timeA - timeB;
      });
    };

    const truncateTitle = (title, maxLength = 12) => {
      if (title.length <= maxLength) return title;
      return title.substring(0, maxLength - 1) + '…';
    };

    const getEventColor = (event) => {
      // Prioritize platform-based coloring for integrated assignments
      if (event.type === 'assignment' && event.platform) {
        switch (event.platform.toLowerCase()) {
          case 'gradescope':
            return '#2563eb'; // Blue
          case 'canvas':
            return '#ea580c'; // Orange
          case 'blackboard':
            return '#7c3aed'; // Purple
          case 'brightspace':
            return '#059669'; // Emerald
          case 'moodle':
            return '#be185d'; // Pink
          default:
            return '#dc2626'; // Red for unknown platforms
        }
      }
      return event.color || '#16a34a'; // Default green
    };

    return (
      <div className="custom-month-view">
        {/* Header with weekday names */}
        <div className="custom-month-header">
          {weekdays.map(day => (
            <div key={day} className="custom-weekday">{day}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="custom-month-grid">
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, date);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`custom-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''}`}
              >
                {/* Date header - clickable to navigate to day view */}
                <div 
                  className="custom-day-header"
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    isolation: 'isolate',
                    pointerEvents: 'auto',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to day view for this specific date
                    setCurrentView('day');
                    setCurrentDate(day);
                    localStorage.setItem('calendar-view', 'day');
                    localStorage.setItem('calendar-date', day.toISOString());
                  }}
                >
                  <div className="custom-day-number">
                    {format(day, 'd')}
                  </div>
                </div>
                
                {/* Events section - separate from date header */}
                <div 
                  className="custom-day-events"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    isolation: 'isolate',
                    background: 'transparent',
                    pointerEvents: 'auto',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    // Only trigger create event if clicking on empty space (not on events)
                    if (e.target === e.currentTarget) {
                      e.stopPropagation();
                      onSelectSlot({ start: day, end: day, allDay: true });
                    }
                  }}
                >
                  {dayEvents.slice(0, 3).map((event, index) => (
                    <div
                      key={`${event.id}-${index}`}
                      className={`custom-event ${event.type || 'custom'}-event`}
                      style={{ 
                        backgroundColor: getEventColor(event),
                        position: 'relative',
                        zIndex: 5,
                        isolation: 'isolate',
                        display: 'block',
                        width: '100%',
                        pointerEvents: 'auto',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Pass the event in the same format as React Big Calendar
                        onSelectEvent({
                          ...event,
                          // Ensure all required properties are present
                          resource: event.resource || null
                        });
                      }}
                      title={event.title} // Full title on hover
                    >
                      {truncateTitle(event.title)}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div 
                      className="custom-event-more"
                      style={{
                        pointerEvents: 'auto',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show day modal with all events for this day
                        setCurrentView('day');
                        setCurrentDate(day);
                        localStorage.setItem('calendar-view', 'day');
                        localStorage.setItem('calendar-date', day.toISOString());
                      }}
                    >
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                  
                  {/* Invisible clickable area to ensure background clicks work */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 0,
                      pointerEvents: 'auto',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSlot({ start: day, end: day, allDay: true });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Custom Week View Component
  const CustomWeekView = ({ date, events, onSelectSlot, onSelectEvent, onEventDrop, onEventResize }) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => add(weekStart, { days: i }));
    const timeSlots = Array.from({ length: 48 }, (_, i) => i * 0.5); // 30-minute intervals (0, 0.5, 1, 1.5, etc.)
    
    // Drag selection state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);
    const [dragDay, setDragDay] = useState(null);

    const getEventsForDay = (day) => {
      return events.filter(event => {
        const eventDate = new Date(event.start);
        return isSameDay(eventDate, day);
      });
    };

    const getEventColor = (event) => {
      if (event.type === 'assignment' && event.platform) {
        switch (event.platform.toLowerCase()) {
          case 'gradescope': return '#2563eb';
          case 'canvas': return '#ea580c';
          case 'blackboard': return '#7c3aed';
          case 'brightspace': return '#059669';
          case 'moodle': return '#be185d';
          default: return '#dc2626';
        }
      }
      return event.color || '#16a34a';
    };

    const formatTimeSlot = (timeValue) => {
      const hours = Math.floor(timeValue);
      const minutes = (timeValue % 1) * 60;
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return format(date, 'h:mm a');
    };

    const handleMouseDown = (day, timeValue) => {
      setIsDragging(true);
      setDragStart(timeValue);
      setDragEnd(timeValue);
      setDragDay(day);
    };

    const handleMouseEnter = (day, timeValue) => {
      if (isDragging && dragDay && isSameDay(day, dragDay)) {
        setDragEnd(timeValue);
      }
    };

    const handleMouseUp = () => {
      if (isDragging && dragStart !== null && dragEnd !== null && dragDay) {
        const startTime = Math.min(dragStart, dragEnd);
        const endTime = Math.max(dragStart, dragEnd) + 0.5; // Add 30 minutes to end time
        
        const startDate = new Date(dragDay);
        startDate.setHours(Math.floor(startTime), (startTime % 1) * 60, 0, 0);
        
        const endDate = new Date(dragDay);
        endDate.setHours(Math.floor(endTime), (endTime % 1) * 60, 0, 0);
        
        onSelectSlot({ 
          start: startDate, 
          end: endDate, 
          allDay: false 
        });
      }
      
      // Reset drag state
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setDragDay(null);
    };

    const isTimeSlotSelected = (day, timeValue) => {
      if (!isDragging || !dragDay || !isSameDay(day, dragDay)) return false;
      const minTime = Math.min(dragStart, dragEnd);
      const maxTime = Math.max(dragStart, dragEnd);
      return timeValue >= minTime && timeValue <= maxTime;
    };

    // Add global mouse up listener
    useEffect(() => {
      const handleGlobalMouseUp = () => {
        if (isDragging) {
          handleMouseUp();
        }
      };

      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isDragging, dragStart, dragEnd, dragDay]);

    return (
      <div className="custom-week-view">
        <div className="custom-week-header">
          <div className="custom-time-gutter"></div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className={`custom-week-day-header ${isToday(day) ? 'today' : ''}`}>
              <div className="custom-week-day-name">{format(day, 'EEE')}</div>
              <div className="custom-week-day-number">{format(day, 'd')}</div>
            </div>
          ))}
        </div>
        
        <div className="custom-week-content">
          <div className="custom-week-time-slots">
            {timeSlots.map(timeValue => (
              <div key={timeValue} className="custom-time-slot">
                <div className="custom-time-label">
                  {timeValue % 1 === 0 ? formatTimeSlot(timeValue) : ''}
                </div>
              </div>
            ))}
          </div>
          
          <div className="custom-week-days">
            {weekDays.map(day => (
              <div key={day.toISOString()} className="custom-week-day-column">
                {timeSlots.map(timeValue => (
                  <div
                    key={`${day.toISOString()}-${timeValue}`}
                    className={`custom-week-time-slot ${isTimeSlotSelected(day, timeValue) ? 'selected' : ''}`}
                    onMouseDown={() => handleMouseDown(day, timeValue)}
                    onMouseEnter={() => handleMouseEnter(day, timeValue)}
                    style={{
                      userSelect: 'none',
                      cursor: isDragging ? 'grabbing' : 'pointer'
                    }}
                  />
                ))}
                
                {/* Render events for this day */}
                <div className="custom-week-events">
                  {getEventsForDay(day).map((event, index) => {
                    const eventStart = new Date(event.start);
                    const eventEnd = new Date(event.end);
                    const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
                    const duration = (eventEnd - eventStart) / (1000 * 60 * 60); // hours
                    
                    return (
                      <div
                        key={`${event.id}-${index}`}
                        className="custom-week-event"
                        style={{
                          backgroundColor: getEventColor(event),
                                                top: `${startHour * 30}px`, // 30px per 30-minute slot
                      height: event.allDay ? '20px' : `${Math.max(duration * 60, 20)}px`,
                          position: 'absolute',
                          left: '2px',
                          right: '2px',
                          zIndex: 10,
                          pointerEvents: 'auto'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent({ ...event, resource: event.resource || null });
                        }}
                        title={event.title}
                      >
                        <div className="custom-week-event-content">
                          {event.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Custom Day View Component
  const CustomDayView = ({ date, events, onSelectSlot, onSelectEvent }) => {
    const timeSlots = Array.from({ length: 48 }, (_, i) => i * 0.5); // 30-minute intervals
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return isSameDay(eventDate, date);
    });

    // Drag selection state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);

    const getEventColor = (event) => {
      if (event.type === 'assignment' && event.platform) {
        switch (event.platform.toLowerCase()) {
          case 'gradescope': return '#2563eb';
          case 'canvas': return '#ea580c';
          case 'blackboard': return '#7c3aed';
          case 'brightspace': return '#059669';
          case 'moodle': return '#be185d';
          default: return '#dc2626';
        }
      }
      return event.color || '#16a34a';
    };

    const formatTimeSlot = (timeValue) => {
      const hours = Math.floor(timeValue);
      const minutes = (timeValue % 1) * 60;
      const timeDate = new Date();
      timeDate.setHours(hours, minutes, 0, 0);
      return format(timeDate, 'h:mm a');
    };

    const handleMouseDown = (timeValue) => {
      setIsDragging(true);
      setDragStart(timeValue);
      setDragEnd(timeValue);
    };

    const handleMouseEnter = (timeValue) => {
      if (isDragging) {
        setDragEnd(timeValue);
      }
    };

    const handleMouseUp = () => {
      if (isDragging && dragStart !== null && dragEnd !== null) {
        const startTime = Math.min(dragStart, dragEnd);
        const endTime = Math.max(dragStart, dragEnd) + 0.5; // Add 30 minutes to end time
        
        const startDate = new Date(date);
        startDate.setHours(Math.floor(startTime), (startTime % 1) * 60, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(Math.floor(endTime), (endTime % 1) * 60, 0, 0);
        
        onSelectSlot({ 
          start: startDate, 
          end: endDate, 
          allDay: false 
        });
      }
      
      // Reset drag state
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    };

    const isTimeSlotSelected = (timeValue) => {
      if (!isDragging) return false;
      const minTime = Math.min(dragStart, dragEnd);
      const maxTime = Math.max(dragStart, dragEnd);
      return timeValue >= minTime && timeValue <= maxTime;
    };

    // Add global mouse up listener
    useEffect(() => {
      const handleGlobalMouseUp = () => {
        if (isDragging) {
          handleMouseUp();
        }
      };

      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isDragging, dragStart, dragEnd]);

    return (
      <div className="custom-day-view">
        <div className="custom-day-header">
          <div className="custom-day-title">
            {format(date, 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
        
        <div className="custom-day-content">
          <div className="custom-day-time-slots">
            {timeSlots.map(timeValue => (
              <div key={timeValue} className="custom-time-slot">
                <div className="custom-time-label">
                  {timeValue % 1 === 0 ? formatTimeSlot(timeValue) : ''}
                </div>
              </div>
            ))}
          </div>
          
          <div className="custom-day-column">
            {timeSlots.map(timeValue => (
              <div
                key={timeValue}
                className={`custom-day-time-slot ${isTimeSlotSelected(timeValue) ? 'selected' : ''}`}
                onMouseDown={() => handleMouseDown(timeValue)}
                onMouseEnter={() => handleMouseEnter(timeValue)}
                style={{
                  userSelect: 'none',
                  cursor: isDragging ? 'grabbing' : 'pointer'
                }}
              />
            ))}
            
            {/* Render events for this day */}
            <div className="custom-day-events">
              {dayEvents.map((event, index) => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
                const duration = (eventEnd - eventStart) / (1000 * 60 * 60); // hours
                
                return (
                  <div
                    key={`${event.id}-${index}`}
                    className="custom-day-event"
                    style={{
                      backgroundColor: getEventColor(event),
                      top: `${startHour * 30}px`, // 30px per 30-minute slot
                      height: event.allDay ? '20px' : `${Math.max(duration * 60, 20)}px`,
                      position: 'absolute',
                      left: '2px',
                      right: '2px',
                      zIndex: 10,
                      pointerEvents: 'auto'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent({ ...event, resource: event.resource || null });
                    }}
                    title={event.title}
                  >
                    <div className="custom-day-event-content">
                      {event.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const systemDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const documentDarkMode = document.documentElement.classList.contains('dark') || 
                              document.body.classList.contains('dark') ||
                              document.documentElement.getAttribute('data-theme') === 'dark';
      
      const appTheme = localStorage.getItem('theme') || sessionStorage.getItem('theme');
      let isDark = false;
      
      if (appTheme === 'dark') {
        isDark = true;
      } else if (documentDarkMode && systemDarkMode) {
        isDark = true;
      }
      
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkDarkMode();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    
    const handleStorageChange = () => checkDarkMode();
    window.addEventListener('storage', handleStorageChange);
    
    const observer = new MutationObserver(() => checkDarkMode());
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

  // SMART CALENDAR DATA LOADING
  const loadCalendarData = useCallback(async (date, viewType, forceReload = false) => {
    if (!currentUser) return;
    
    const cacheKey = getCacheKey(date, viewType);
    const dateRange = getDateRange(date, viewType);
    
    // For year view, don't load any events
    if (viewType === 'year') {
      setEvents([]);
      setLoading(false);
      return;
    }
    
    // Check cache first
    if (!forceReload && eventCache.current.has(cacheKey)) {
      const cachedEvents = eventCache.current.get(cacheKey);
      applyFiltersAndSetEvents(cachedEvents);
      return;
    }
    
    // Prevent duplicate requests
    if (loadingStates.current.has(cacheKey)) {
      return;
    }
    
    if (!dateRange) return;
    
    loadingStates.current.add(cacheKey);
    setLoading(true);
    setError(null);
    
    try {
      const response = await getCalendarData(
        dateRange.start.toISOString(),
        dateRange.end.toISOString()
      );
      
      if (response.success) {
        // Transform events for React Big Calendar
        const transformedEvents = response.data.events.map(event => {
          const startDate = new Date(event.start);
          const endDate = event.end ? new Date(event.end) : new Date(event.start);
          
          // Check if this is a late-night event (23:59) which might not display properly
          const isLateNightEvent = startDate.getHours() === 23 && startDate.getMinutes() === 59;
          
          // For assignment events at 23:59, treat them as all-day events
          let adjustedStart = startDate;
          let adjustedEnd = endDate;
          let isAllDay = event.allDay || false;
          
          if (event.type === 'assignment' && isLateNightEvent) {
            // Set to the same day but make it all-day
            adjustedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            adjustedEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1);
            isAllDay = true;
          }
          
          // Determine color based on platform for assignments
          let eventColor = event.color || '#16a34a'; // Default green
          if (event.type === 'assignment' && event.platform) {
            switch (event.platform.toLowerCase()) {
              case 'gradescope':
                eventColor = '#2563eb'; // Blue
                break;
              case 'canvas':
                eventColor = '#ea580c'; // Orange
                break;
              case 'blackboard':
                eventColor = '#7c3aed'; // Purple
                break;
              case 'brightspace':
                eventColor = '#059669'; // Emerald
                break;
              case 'moodle':
                eventColor = '#be185d'; // Pink
                break;
              default:
                eventColor = '#dc2626'; // Red for unknown platforms
                break;
            }
          }
          
          return {
            id: event.id,
            title: event.title,
            start: adjustedStart,
            end: adjustedEnd,
            allDay: isAllDay,
            resource: null,
            color: eventColor,
            // Store additional properties directly on the event object for RBC
            type: event.type || 'custom',
            description: event.description || '',
            location: event.location || '',
            courseId: event.courseId,
            assignmentId: event.assignmentId,
            courseName: event.courseName,
            platform: event.platform,
            fromIntegration: event.fromIntegration,
            originalEvent: event
          };
        });
        
        // Cache the events
        eventCache.current.set(cacheKey, transformedEvents);
        
        // Extract unique courses for filters
        const courses = new Set();
        transformedEvents.forEach(event => {
          if (event.type === 'assignment' && event.courseName) {
            courses.add(JSON.stringify({
              id: event.courseId,
              name: event.courseName
            }));
          }
        });
        
        const uniqueCourses = Array.from(courses).map(courseStr => JSON.parse(courseStr));
        setAvailableCourses(prev => {
          const existing = new Set(prev.map(c => c.id));
          const newCourses = uniqueCourses.filter(c => !existing.has(c.id));
          return [...prev, ...newCourses];
        });
        
        // Initialize course filters
        setFilters(prevFilters => {
          const newCourseFilters = { ...prevFilters.courses };
          uniqueCourses.forEach(course => {
            if (!(course.id in newCourseFilters)) {
              newCourseFilters[course.id] = true;
            }
          });
          
          return {
            ...prevFilters,
            courses: newCourseFilters
          };
        });
        
        // Apply filters and set events
        applyFiltersAndSetEvents(transformedEvents);
        
      } else {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || 'Failed to load calendar data';
        setError(errorMessage);
      }
    } catch (err) {
      setError('Failed to load calendar data. Please check your connection and try again.');
    } finally {
      setLoading(false);
      loadingStates.current.delete(cacheKey);
    }
  }, [currentUser]);

  // Apply filters to events and set them
  const applyFiltersAndSetEvents = useCallback((allEvents) => {
    const filteredEvents = allEvents.filter(event => {
      const { type, platform, courseId } = event;
      
      if (type === 'assignment') {
        // Platform filter - be more lenient with platform matching
        const normalizedPlatform = platform?.toLowerCase() || 'unknown';
        const platformFilter = filters.platforms[normalizedPlatform] !== false;
        
        // Course filter - if courseId is null/undefined, include it; otherwise check filter
        const courseFilter = !courseId || filters.courses[courseId] !== false;
        
        return platformFilter && courseFilter;
      }
      
      return true;
    });
    
    setEvents(filteredEvents);
  }, [filters]);

  // Load events for a specific day (for year view popups)
  const loadDayEvents = useCallback(async (date) => {
    if (!currentUser) return [];
    
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    
    // Check cache first
    if (dayEventsCache.current.has(dayKey)) {
      return dayEventsCache.current.get(dayKey);
    }
    
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const response = await getCalendarData(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );
      
      if (response.success) {
        const transformedEvents = response.data.events.map(event => ({
          ...event,
          start: new Date(event.start),
          end: event.end ? new Date(event.end) : new Date(event.start),
          type: event.type || 'custom',
          description: event.description || '',
          location: event.location || ''
        }));
        
        // Cache events by day
        const eventsByDay = new Map();
        transformedEvents.forEach(event => {
          const eventDate = new Date(event.start);
          const eventDayKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
          
          if (!eventsByDay.has(eventDayKey)) {
            eventsByDay.set(eventDayKey, []);
          }
          eventsByDay.get(eventDayKey).push(event);
        });
        
        // Cache all days from this month
        eventsByDay.forEach((dayEvents, key) => {
          dayEventsCache.current.set(key, dayEvents);
        });
        
        return dayEventsCache.current.get(dayKey) || [];
      }
    } catch (err) {
      console.error('Error loading day events:', err);
    }
    
    return [];
  }, [currentUser]);

  // Handle view changes - Fix FullCalendar callback
  const handleViewChange = useCallback((viewInfo) => {
    // FullCalendar passes different objects depending on the callback
    const viewType = viewInfo?.type || viewInfo?.view?.type;
    const activeStart = viewInfo?.activeStart || viewInfo?.view?.activeStart || viewInfo?.start;
    
    if (viewType) {
      setCurrentView(viewType);
    }
    
    if (activeStart) {
      setCurrentDate(activeStart);
      // Load data for the new view
      loadCalendarData(activeStart, viewType);
    }
  }, [loadCalendarData]);

  // Wrapper function to persist date changes
  const updateCurrentDate = useCallback((newDate) => {
    setCurrentDate(newDate);
    localStorage.setItem('calendar-date', newDate.toISOString());
  }, []);

  // Handle date navigation
  const handleDatesSet = useCallback((range) => {
    let startDate = null;
    if (Array.isArray(range) && range.length > 0) {
      startDate = range[0];
    } else if (range && range.start) {
      startDate = range.start;
    } else if (range instanceof Date) {
      startDate = range;
    }

    if (startDate) {
      updateCurrentDate(startDate);
      if (currentView !== 'year') {
        loadCalendarData(startDate, currentView);
      }
    }
  }, [loadCalendarData, currentView, updateCurrentDate]);

  // Handle day click in different views
  const handleDateClick = useCallback(async (dateClickInfo) => {
    // Handle both FullCalendar dateClickInfo and simple Date objects from YearGrid
    let clickedDate, actualCurrentView;
    
    if (dateClickInfo instanceof Date) {
      // Called from YearGrid - simple Date object
      clickedDate = dateClickInfo;
      actualCurrentView = currentView;
    } else {
      // Called from FullCalendar - dateClickInfo object
      if (dateClickInfo.jsEvent) {
        dateClickInfo.jsEvent.preventDefault();
        dateClickInfo.jsEvent.stopPropagation();
        dateClickInfo.jsEvent.stopImmediatePropagation();
      }
      clickedDate = dateClickInfo.date;
      actualCurrentView = dateClickInfo.view?.type || currentView;
    }
    
    // For year view, always show the day modal popup
    if (actualCurrentView === 'year') {
      // Store current scroll position to restore it later
      const scrollY = window.scrollY;
      
      setDayLoading(true);
      setSelectedDay(clickedDate);
      setDayEvents([]); // Clear previous events immediately
      setShowDayModal(true); // Show modal immediately with loading state
      
      try {
        const dayEvents = await loadDayEvents(clickedDate);
        
        const filteredDayEvents = dayEvents.filter(event => {
          if (event.type === 'assignment') {
            const platformFilter = filters.platforms[event.platform] !== false;
            const courseFilter = filters.courses[event.courseId] !== false;
            return platformFilter && courseFilter;
          }
          return true;
        });
        
        setDayEvents(filteredDayEvents);
        
        // Restore scroll position after a brief delay
        setTimeout(() => {
          window.scrollTo(0, scrollY);
        }, 0);
        
      } catch (error) {
        console.error('Error loading day events:', error);
        setError('Failed to load events for this day');
      } finally {
        setDayLoading(false);
      }
    } 
    // For all other views, open the event creation modal
    else {
      handleDateSelect({
        start: clickedDate,
        end: new Date(clickedDate.getTime() + 60 * 60 * 1000), // Default 1 hour
        allDay: actualCurrentView === 'day',
        view: { calendar: { unselect: () => {} } }
      });
    }
  }, [currentView, filters, loadDayEvents]);

  // Handle date range selection (for creating events)
  const handleDateSelect = (selectInfo) => {
    // Get the actual current view
    const actualCurrentView = selectInfo.view?.type || currentView;
    
    // In year view, COMPLETELY BLOCK selection
    if (actualCurrentView === 'year') {
      return; // Exit early, do nothing
    }
    
    // For non-year views, proceed with creating event
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
    if (selectInfo.view && selectInfo.view.calendar && selectInfo.view.calendar.unselect) {
      selectInfo.view.calendar.unselect();
    }
  };

  // Handle month click in year view
  const handleMonthClick = useCallback((monthDate) => {
    const newView = 'month';
    setCurrentView(newView);
    localStorage.setItem('calendar-view', newView);
    updateCurrentDate(monthDate);
    
    // Load calendar data for the new month view
    loadCalendarData(monthDate, newView);
  }, [loadCalendarData, updateCurrentDate]);

  // Wrapper function to persist view changes
  const updateCurrentView = useCallback((newView) => {
    setCurrentView(newView);
    localStorage.setItem('calendar-view', newView);
    
    // Load calendar data for the new view (except year view)
    if (newView !== 'year') {
      loadCalendarData(currentDate, newView);
    } else {
      // For year view, clear events
      setEvents([]);
    }
  }, [currentView, currentDate, loadCalendarData]);

  // Initial load
  useEffect(() => {
    if (currentUser && currentDate && currentView) {
      loadCalendarData(currentDate, currentView);
    }
  }, [currentUser, loadCalendarData, currentDate, currentView]);

  // Reapply filters when they change
  useEffect(() => {
    if (currentView !== 'year' && eventCache.current.size > 0 && currentDate && currentView) {
      const cacheKey = getCacheKey(currentDate, currentView);
      const cachedEvents = eventCache.current.get(cacheKey);
      if (cachedEvents) {
        applyFiltersAndSetEvents(cachedEvents);
      }
    }
  }, [filters, currentView, currentDate, applyFiltersAndSetEvents]);

  // Filter toggle functions
  const togglePlatformFilter = (platform) => {
    setFilters(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: !prev.platforms[platform]
      }
    }));
  };
  
  const toggleCourseFilter = (courseId) => {
    setFilters(prev => ({
      ...prev,
      courses: {
        ...prev.courses,
        [courseId]: !prev.courses[courseId]
      }
    }));
  };
  
  const toggleAllPlatforms = (enabled) => {
    setFilters(prev => ({
      ...prev,
      platforms: Object.keys(prev.platforms).reduce((acc, platform) => {
        acc[platform] = enabled;
        return acc;
      }, {})
    }));
  };
  
  const toggleAllCourses = (enabled) => {
    setFilters(prev => ({
      ...prev,
      courses: Object.keys(prev.courses).reduce((acc, courseId) => {
        acc[courseId] = enabled;
        return acc;
      }, {})
    }));
  };

  // Handle event click
  const handleEventClick = (clickInfo) => {
    // Handle both React Big Calendar format (clickInfo.event) and direct event objects
    const event = clickInfo.event || clickInfo;
    
    if (!event || !event.type) {
      console.error('Event object missing or invalid:', event);
      return;
    }
    
    if (event.type === 'assignment') {
      // For assignments, show elegant assignment detail modal
      setSelectedAssignment({
        title: event.title,
        courseName: event.courseName || 'Unknown Course',
        platform: event.platform || 'unknown',
        dueDate: event.start,
        description: event.description || '',
        fromIntegration: event.fromIntegration || false,
        assignmentId: event.assignmentId,
        courseId: event.courseId,
        color: event.color
      });
      setCameFromDayModal(false); // Reset flag since this is from regular calendar view
      setShowAssignmentModal(true);
      return;
    }
    
    // For custom events, open edit modal
    setSelectedEvent(event.originalEvent || event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      start: new Date(event.start),
      end: new Date(event.end || event.start),
      allDay: event.allDay,
      location: event.location || '',
      color: event.color || '#16a34a'
    });
    setShowEventModal(true);
  };

  // Handle event drag and drop
  const handleEventDrop = async (dropInfo) => {
    const event = dropInfo.event || dropInfo;
    
    // Don't allow moving assignments
    if (event.type === 'assignment') {
      dropInfo.revert && dropInfo.revert();
      alert('Assignments cannot be moved. They are tied to course due dates.');
      return;
    }
    
    try {
      const eventData = {
        title: event.title,
        description: event.description,
        start: event.start.toISOString(),
        end: (event.end || event.start).toISOString(),
        allDay: event.allDay,
        location: event.location,
        color: event.color
      };
      
      const response = await updateCalendarEvent((event.originalEvent || event).id, eventData);
      
      if (!response.success) {
        dropInfo.revert && dropInfo.revert();
        alert(response.error || 'Failed to update event');
      } else {
        // Invalidate cache and reload
        const cacheKey = getCacheKey(currentDate, currentView);
        eventCache.current.delete(cacheKey);
        loadCalendarData(currentDate, currentView, true);
      }
    } catch (err) {
      console.error('Error updating event:', err);
      dropInfo.revert && dropInfo.revert();
      alert('Failed to update event');
    }
  };

  // Handle event resize
  const handleEventResize = async (resizeInfo) => {
    const event = resizeInfo.event || resizeInfo;
    
    // Don't allow resizing assignments
    if (event.type === 'assignment') {
      resizeInfo.revert && resizeInfo.revert();
      alert('Assignment durations cannot be changed.');
      return;
    }
    
    try {
      const eventData = {
        title: event.title,
        description: event.description,
        start: event.start.toISOString(),
        end: (event.end || event.start).toISOString(),
        allDay: event.allDay,
        location: event.location,
        color: event.color
      };
      
      const response = await updateCalendarEvent((event.originalEvent || event).id, eventData);
      
      if (!response.success) {
        resizeInfo.revert && resizeInfo.revert();
        alert(response.error || 'Failed to update event');
      } else {
        // Invalidate cache and reload
        const cacheKey = getCacheKey(currentDate, currentView);
        eventCache.current.delete(cacheKey);
        loadCalendarData(currentDate, currentView, true);
      }
    } catch (err) {
      console.error('Error updating event:', err);
      resizeInfo.revert && resizeInfo.revert();
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
        // Invalidate cache and reload
        const cacheKey = getCacheKey(currentDate, currentView);
        eventCache.current.delete(cacheKey);
        loadCalendarData(currentDate, currentView, true);
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
        // Invalidate cache and reload
        const cacheKey = getCacheKey(currentDate, currentView);
        eventCache.current.delete(cacheKey);
        loadCalendarData(currentDate, currentView, true);
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
      const response = await importICSCalendar(icsFile);
      
      if (response.success) {
        setShowImportModal(false);
        setIcsFile(null);
        // Clear all caches and reload
        eventCache.current.clear();
        dayEventsCache.current.clear();
        loadCalendarData(currentDate, currentView, true);
      } else {
        alert(response.error || 'Failed to import calendar');
      }
    } catch (err) {
      console.error('Error importing calendar:', err);
      alert('Failed to import calendar');
    } finally {
      setLoading(false);
    }
  };

  // Format date for datetime-local input
  const formatDateTimeLocal = (date) => {
    try {
      // Handle null/undefined dates
      if (!date) {
        return '';
      }
      
      // Create a new Date object to avoid mutating the original
      const d = new Date(date);
      
      // Check if date is valid
      if (isNaN(d.getTime())) {
        console.warn('Invalid date provided to formatDateTimeLocal:', date);
        return '';
      }
      
      // Adjust for timezone offset
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return '';
    }
  };

  // Handle assignment click in day modal
  const handleDayAssignmentClick = (assignment) => {
    setSelectedAssignment({
      title: assignment.title,
      courseName: assignment.courseName || 'Unknown Course',
      platform: assignment.platform || 'unknown',
      dueDate: new Date(assignment.start),
      description: assignment.description || '',
      fromIntegration: assignment.fromIntegration || false,
      assignmentId: assignment.assignmentId,
      courseId: assignment.courseId,
      color: assignment.color
    });
    setCameFromDayModal(true); // Set flag to indicate we came from day modal
    setShowDayModal(false);
    setShowAssignmentModal(true);
  };

  // Handle assignment modal close with smart navigation
  const handleAssignmentModalClose = () => {
    setShowAssignmentModal(false);
    setCameFromDayModal(false); // Reset the flag
    
    // If we came from day modal and we're in year view, return to day modal
    if (cameFromDayModal && currentView === 'year' && selectedDay) {
      setShowDayModal(true);
    }
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
      {/* Header with controls */}
      <div className="calendar-header">
        <div className="calendar-controls">
          {/* Navigation buttons */}
          <div className="nav-controls">
            <button
              onClick={() => {
                let newDate;
                if (currentView === 'month') {
                  newDate = add(currentDate, { months: -1 });
                } else if (currentView === 'week') {
                  newDate = add(currentDate, { weeks: -1 });
                } else if (currentView === 'day') {
                  newDate = add(currentDate, { days: -1 });
                } else if (currentView === 'year') {
                  newDate = add(currentDate, { years: -1 });
                } else {
                  newDate = add(currentDate, { months: -1 });
                }
                updateCurrentDate(newDate);
              }}
              className="btn btn-secondary"
              disabled={loading}
            >
              ←
            </button>
            <button
              onClick={() => {
                const today = new Date();
                if (currentView === 'year') {
                  // In year view, show popup for today
                  handleDateClick(today);
                } else {
                  // In other views, navigate to today
                  updateCurrentDate(today);
                }
              }}
              className="btn btn-secondary"
              disabled={loading}
            >
              Today
            </button>
            <button
              onClick={() => {
                let newDate;
                if (currentView === 'month') {
                  newDate = add(currentDate, { months: 1 });
                } else if (currentView === 'week') {
                  newDate = add(currentDate, { weeks: 1 });
                } else if (currentView === 'day') {
                  newDate = add(currentDate, { days: 1 });
                } else if (currentView === 'year') {
                  newDate = add(currentDate, { years: 1 });
                } else {
                  newDate = add(currentDate, { months: 1 });
                }
                updateCurrentDate(newDate);
              }}
              className="btn btn-secondary"
              disabled={loading}
            >
              →
            </button>
          </div>

          {/* Calendar title */}
          <h2 className="calendar-title">
            {currentView === 'year' 
              ? currentDate.getFullYear()
              : format(currentDate, currentView === 'month' ? 'MMMM yyyy' : currentView === 'week' ? 'MMM yyyy' : 'MMMM dd, yyyy')}
          </h2>

          {/* View selector */}
          <div className="view-controls">
            <button
              onClick={() => updateCurrentView('year')}
              className={`btn ${currentView === 'year' ? 'btn-primary' : 'btn-secondary'}`}
              disabled={loading}
            >
              Year
            </button>
            <button
              onClick={() => updateCurrentView('month')}
              className={`btn ${currentView === 'month' ? 'btn-primary' : 'btn-secondary'}`}
              disabled={loading}
            >
              Month
            </button>
            <button
              onClick={() => updateCurrentView('week')}
              className={`btn ${currentView === 'week' ? 'btn-primary' : 'btn-secondary'}`}
              disabled={loading}
            >
              Week
            </button>
            <button
              onClick={() => updateCurrentView('day')}
              className={`btn ${currentView === 'day' ? 'btn-primary' : 'btn-secondary'}`}
              disabled={loading}
            >
              Day
            </button>
            <button
              onClick={() => updateCurrentView('agenda')}
              className={`btn ${currentView === 'agenda' ? 'btn-primary' : 'btn-secondary'}`}
              disabled={loading}
            >
              List
            </button>
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary"
            disabled={loading}
          >
            📥 Import ICS
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
            disabled={loading}
          >
            🔍 Filters
          </button>
        </div>
        
        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Loading calendar...</span>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <span>⚠️ {error}</span>
            <button 
              onClick={() => loadCalendarData(currentDate, currentView, true)}
              className="btn btn-sm btn-primary ml-2"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-section">
            <h4>Platforms</h4>
            <div className="filter-buttons">
              <button
                onClick={() => toggleAllPlatforms(true)}
                className="btn btn-xs btn-secondary"
              >
                Select All
              </button>
              <button
                onClick={() => toggleAllPlatforms(false)}
                className="btn btn-xs btn-secondary"
              >
                Deselect All
              </button>
            </div>
            <div className="filter-options">
              {Object.entries(filters.platforms).map(([platform, enabled]) => (
                <label key={platform} className="filter-option">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => togglePlatformFilter(platform)}
                  />
                  <span className={`platform-badge platform-${platform}`}>
                    {platform.toUpperCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          {availableCourses.length > 0 && (
            <div className="filters-section">
              <h4>Courses</h4>
              <div className="filter-buttons">
                <button
                  onClick={() => toggleAllCourses(true)}
                  className="btn btn-xs btn-secondary"
                >
                  Select All
                </button>
                <button
                  onClick={() => toggleAllCourses(false)}
                  className="btn btn-xs btn-secondary"
                >
                  Deselect All
                </button>
              </div>
              <div className="filter-options">
                {availableCourses.map(course => (
                  <label key={course.id} className="filter-option">
                    <input
                      type="checkbox"
                      checked={filters.courses[course.id] !== false}
                      onChange={() => toggleCourseFilter(course.id)}
                    />
                    <span className="course-name">{course.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      <div className="calendar-wrapper">
        {currentView === 'year' ? (
          <YearGrid
            year={currentDate.getFullYear()}
            onDayClick={handleDateClick}
            onMonthClick={handleMonthClick}
          />
        ) : (
          <>
            {currentView === 'month' ? (
              <CustomMonthView
                date={currentDate}
                events={(() => {
                  // Filter events for the current month
                  const dateRange = getDateRange(currentDate, currentView);
                  if (!dateRange) return events;
                  
                  const filteredEvents = events.filter(event => {
                    const eventDate = new Date(event.start);
                    return eventDate >= dateRange.start && eventDate <= dateRange.end;
                  });
                  
                  return filteredEvents;
                })()}
                onSelectSlot={handleDateSelect}
                onSelectEvent={handleEventClick}
              />
            ) : currentView === 'week' ? (
              <CustomWeekView
                date={currentDate}
                events={(() => {
                  const dateRange = getDateRange(currentDate, currentView);
                  if (!dateRange) return events;
                  
                  const filteredEvents = events.filter(event => {
                    const eventDate = new Date(event.start);
                    return eventDate >= dateRange.start && eventDate <= dateRange.end;
                  });
                  
                  return filteredEvents;
                })()}
                onSelectSlot={handleDateSelect}
                onSelectEvent={handleEventClick}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
              />
            ) : currentView === 'day' ? (
              <CustomDayView
                date={currentDate}
                events={(() => {
                  const dateRange = getDateRange(currentDate, currentView);
                  if (!dateRange) return events;
                  
                  const filteredEvents = events.filter(event => {
                    const eventDate = new Date(event.start);
                    return eventDate >= dateRange.start && eventDate <= dateRange.end;
                  });
                  
                  return filteredEvents;
                })()}
                onSelectSlot={handleDateSelect}
                onSelectEvent={handleEventClick}
              />
            ) : (
              <RBCalendar
                localizer={localizer}
                events={(() => {
                  // CRITICAL FIX: Only pass events that are in the current view's date range
                  const dateRange = getDateRange(currentDate, currentView);
                  if (!dateRange) return events;
                  
                  const filteredEvents = events.filter(event => {
                    const eventDate = new Date(event.start);
                    return eventDate >= dateRange.start && eventDate <= dateRange.end;
                  });
                  
                  return filteredEvents;
                })()}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                allDayAccessor="allDay"
                defaultView="month"
                view={currentView}
                date={currentDate}
                onNavigate={updateCurrentDate}
                onView={updateCurrentView}
                onRangeChange={handleDatesSet}
                selectable={currentView !== 'year'}
                onSelectSlot={handleDateSelect}
                onSelectEvent={handleEventClick}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                popup
                resizable
                draggableAccessor="isDraggable"
                eventPropGetter={(event) => {
                  return { 
                    style: { 
                      backgroundColor: event.color || '#16a34a', 
                      borderRadius: '4px', 
                      color: 'white',
                      border: 'none',
                      fontSize: '0.75rem',
                      padding: '2px 4px',
                      display: 'block',
                      visibility: 'visible',
                      opacity: 1,
                      minHeight: '18px',
                      lineHeight: '1.2'
                    },
                    className: `calendar-event ${event.type || 'custom'}-event`,
                    'data-event-type': event.type || 'custom',
                    'data-event-title': event.title
                  };
                }}
                style={{ minHeight: '500px' }}
              />
            )}
          </>
        )}
      </div>

      {/* Day Events Modal (for year view day clicks) */}
      {showDayModal && selectedDay && (
        <div className="modal-overlay" onClick={() => setShowDayModal(false)}>
          <div className="modal-content day-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Events for {selectedDay.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</h3>
              <button 
                onClick={() => setShowDayModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {dayLoading ? (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <span>Loading events...</span>
                </div>
              ) : dayEvents.length === 0 ? (
                <div className="no-events">
                  <p>No events or assignments for this day.</p>
                </div>
              ) : (
                <div className="day-events-list">
                  {dayEvents.map((event, index) => (
                    <div 
                      key={index} 
                      className={`day-event-item ${event.type === 'assignment' ? 'assignment' : 'custom-event'}`}
                      onClick={() => event.type === 'assignment' ? handleDayAssignmentClick(event) : null}
                      style={{ borderLeftColor: event.color }}
                    >
                      <div className="event-time">
                        {event.allDay ? 'All Day' : new Date(event.start).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                      <div className="event-title">{event.title}</div>
                      {event.type === 'assignment' && (
                        <div className="event-meta">
                          <span className={`platform-badge platform-${event.platform}`}>
                            {event.platform?.toUpperCase()}
                          </span>
                          <span className="course-name">{event.courseName}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="event-location">📍 {event.location}</div>
                      )}
                      {event.description && (
                        <div className="event-description">{event.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {!dayLoading && (
                <div className="day-modal-actions">
                  <button
                    onClick={() => {
                      setShowDayModal(false);
                      handleDateSelect({
                        start: selectedDay,
                        end: new Date(selectedDay.getTime() + 60 * 60 * 1000), // 1 hour later
                        allDay: false,
                        view: { calendar: { unselect: () => {} } }
                      });
                    }}
                    className="btn btn-primary"
                  >
                    ➕ Create Event
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowDayModal(false);
                      updateCurrentView('month');
                      updateCurrentDate(selectedDay);
                    }}
                    className="btn btn-secondary"
                  >
                    📅 View Month
                  </button>
                  <button
                    onClick={() => {
                      setShowDayModal(false);
                      updateCurrentView('day');
                      updateCurrentDate(selectedDay);
                    }}
                    className="btn btn-secondary"
                  >
                    📋 View Day
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
      
      {/* Assignment Detail Modal */}
      {showAssignmentModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowAssignmentModal(false)}>
          <div className="modal-content assignment-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header with platform badge and title */}
            <div className="assignment-modal-header">
              <div className="assignment-platform-badge" style={{ backgroundColor: selectedAssignment.color }}>
                <span className="platform-icon">
                  {selectedAssignment.platform === 'gradescope' && '🎓'}
                  {selectedAssignment.platform === 'canvas' && '🎨'}
                  {selectedAssignment.platform === 'blackboard' && '📚'}
                  {selectedAssignment.platform === 'brightspace' && '💡'}
                  {selectedAssignment.platform === 'moodle' && '📖'}
                  {selectedAssignment.platform === 'bap' && '📚'}
                  {!['gradescope', 'canvas', 'blackboard', 'brightspace', 'moodle', 'bap'].includes(selectedAssignment.platform) && '🔗'}
                </span>
                <span className="platform-name">
                  {selectedAssignment.platform === 'bap' ? 'BAP' : 
                   selectedAssignment.platform.charAt(0).toUpperCase() + selectedAssignment.platform.slice(1)}
                </span>
              </div>
              <h2 className="assignment-modal-title">{selectedAssignment.title}</h2>
            </div>
            
            {/* Assignment details */}
            <div className="assignment-modal-body">
              <div className="assignment-detail-grid">
                <div className="detail-item">
                  <div className="detail-icon-wrapper">
                    <span className="detail-icon">📚</span>
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Course</div>
                    <div className="detail-value">{selectedAssignment.courseName}</div>
                  </div>
                </div>
                
                <div className="detail-item">
                  <div className="detail-icon-wrapper">
                    <span className="detail-icon">⏰</span>
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Due Date</div>
                    <div className="detail-value">
                      {new Date(selectedAssignment.dueDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                
                {selectedAssignment.description && (
                  <div className="detail-item">
                    <div className="detail-icon-wrapper">
                      <span className="detail-icon">📝</span>
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Description</div>
                      <div className="detail-value">{selectedAssignment.description}</div>
                    </div>
                  </div>
                )}
                
                <div className="detail-item">
                  <div className="detail-icon-wrapper">
                    <span className="detail-icon">🔗</span>
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Source</div>
                    <div className="detail-value">
                      {selectedAssignment.fromIntegration ? 'Imported from ' + 
                        (selectedAssignment.platform === 'bap' ? 'BAP' : 
                         selectedAssignment.platform.charAt(0).toUpperCase() + selectedAssignment.platform.slice(1)) : 
                        'Created in BAP'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer with actions */}
            <div className="assignment-modal-footer">
              {selectedAssignment.platform === 'gradescope' && selectedAssignment.assignmentId && (
                <button
                  className="assignment-action-button primary"
                  onClick={() => window.open(`https://www.gradescope.com/courses/${selectedAssignment.courseId}/assignments/${selectedAssignment.assignmentId}`, '_blank')}
                >
                  <span className="button-icon">🎓</span>
                  View on Gradescope
                </button>
              )}
              
              <button
                className="assignment-action-button secondary"
                onClick={handleAssignmentModalClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar; 
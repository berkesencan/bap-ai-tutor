const { db } = require('../config/firebase');

/**
 * Schedule model for handling schedule data operations with Firebase
 */
class Schedule {
  /**
   * Create a new schedule in Firestore
   * @param {Object} scheduleData - Schedule data to be stored
   * @param {string} userId - User ID who created the schedule
   * @returns {Promise<Object>} - Created schedule data
   */
  static async create(scheduleData, userId) {
    try {
      const { 
        title, 
        description, 
        startDate, 
        endDate, 
        events = [],
        reminders = true,
        color
      } = scheduleData;
      
      const scheduleRef = db.collection('schedules').doc();
      
      const scheduleDoc = {
        id: scheduleRef.id,
        title,
        description,
        startDate,
        endDate,
        events,
        reminders,
        color,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await scheduleRef.set(scheduleDoc);
      
      return scheduleDoc;
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  }
  
  /**
   * Create a new calendar event
   * @param {Object} eventData - Event data to be stored
   * @param {string} userId - User ID who created the event
   * @returns {Promise<Object>} - Created event data
   */
  static async createEvent(eventData, userId) {
    try {
      const { 
        title, 
        description, 
        start, 
        end, 
        allDay = false,
        location,
        color = '#16a34a',
        type = 'custom',
        courseId,
        assignmentId,
        reminders = []
      } = eventData;
      
      const eventRef = db.collection('calendar_events').doc();
      
      const eventDoc = {
        id: eventRef.id,
        title,
        description,
        start: new Date(start),
        end: new Date(end),
        allDay,
        location,
        color,
        type, // 'custom', 'assignment', 'class', 'exam', etc.
        courseId,
        assignmentId,
        reminders,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await eventRef.set(eventDoc);
      
      return eventDoc;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Get calendar events for a user within a date range
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (optional)
   * @param {string} endDate - End date (optional)
   * @returns {Promise<Array>} - Array of events
   */
  static async getCalendarEvents(userId, startDate, endDate) {
    try {
      // Simplified query without date filtering to avoid compound query issues
      let query = db.collection('calendar_events').where('userId', '==', userId);
      const snapshot = await query.get();
      let events = snapshot.docs.map(doc => doc.data());
      
      // Filter by date range in memory if dates are provided
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        events = events.filter(event => {
          const eventDate = new Date(event.start);
          if (start && eventDate < start) return false;
          if (end && eventDate > end) return false;
          return true;
        });
      }
      
      // Sort by start date
      events.sort((a, b) => new Date(a.start) - new Date(b.start));
      
      return events;
    } catch (error) {
      console.error('Error getting calendar events:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive calendar data including events and assignments (OPTIMIZED)
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (optional)
   * @param {string} endDate - End date (optional)
   * @returns {Promise<Object>} - Calendar data with events and assignments
   */
  static async getCalendarDataOptimized(userId, startDate, endDate) {
    try {
      console.log(`[Calendar] Loading optimized calendar data for user ${userId}`);
      
      // Helper function to convert dates to ISO strings
      const convertToISOString = (date) => {
        if (!date) return null;
        
        if (typeof date.toDate === 'function') {
          return date.toDate().toISOString();
        } else if (date instanceof Date) {
          return date.toISOString();
        } else if (typeof date === 'string') {
          try {
            return new Date(date).toISOString();
          } catch (e) {
            console.warn(`[Calendar] Invalid date format: ${date}`);
            return null;
          }
        }
        return null;
      };

      // 1. Get custom events (simplified query to avoid composite index)
      let eventQuery = db.collection('calendar_events').where('userId', '==', userId);
      
      // Don't add date filtering to avoid composite index requirement
      // We'll filter in memory instead
      
      const eventSnapshot = await eventQuery.get();
      
      // Filter events by date range in memory
      const events = eventSnapshot.docs
        .map(doc => doc.data())
        .filter(event => {
          if (!startDate || !endDate) return true;
          
          const eventStart = new Date(event.start);
          const rangeStart = new Date(startDate);
          const rangeEnd = new Date(endDate);
          
          return eventStart >= rangeStart && eventStart <= rangeEnd;
        });
        
      console.log(`[Calendar] Found ${events.length} custom events (filtered from ${eventSnapshot.size} total)`);

      // 2. Get assignments (simplified query to avoid composite index)
      let assignmentQuery = db.collection('assignments').where('userId', '==', userId);
      
      // Don't add date filtering to avoid composite index requirement
      // We'll filter in memory instead
      
      const assignmentSnapshot = await assignmentQuery.get();
      console.log(`[Calendar] Found ${assignmentSnapshot.size} regular assignments (before date filtering)`);

      // 3. Get ONLY user's courses (more efficient than Course.getByUserId)
      const userCoursesQuery = db.collection('courses').where('members', 'array-contains', userId);
      const userCoursesSnapshot = await userCoursesQuery.get();
      const userCourses = userCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[Calendar] Found ${userCourses.length} courses for user`);

      // Create course lookup map for efficiency
      const courseMap = new Map();
      userCourses.forEach(course => {
        courseMap.set(course.id, course);
      });

      // 4. Process regular assignments (with more lenient date filtering)
      let assignments = assignmentSnapshot.docs.map(doc => {
        const data = doc.data();
        const dueDate = convertToISOString(data.dueDate);
        if (!dueDate) return null;
        
        // Only filter if we have BOTH start and end dates AND they're reasonable
        // This prevents filtering out all assignments when looking at current empty month
        if (startDate && endDate) {
          const assignmentDate = new Date(dueDate);
          const rangeStart = new Date(startDate);
          const rangeEnd = new Date(endDate);
          
          // Only filter if the date range is less than 1 year (to avoid filtering historical data)
          const rangeSpanMs = rangeEnd.getTime() - rangeStart.getTime();
          const oneYearMs = 365 * 24 * 60 * 60 * 1000;
          
          if (rangeSpanMs < oneYearMs) {
            // Expand the range by 6 months on each side for more inclusive results
            const expandedStart = new Date(rangeStart.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
            const expandedEnd = new Date(rangeEnd.getTime() + (6 * 30 * 24 * 60 * 60 * 1000));
            
            if (assignmentDate < expandedStart || assignmentDate > expandedEnd) return null;
          }
        }
        
        const course = courseMap.get(data.courseId);
        
        return {
          id: data.id,
          title: data.title,
          start: dueDate,
          end: dueDate,
          allDay: false,
          color: data.platform || data.source ? this.getAssignmentColor(data.platform || data.source) : '#dc2626',
          type: 'assignment',
          courseId: data.courseId,
          assignmentId: data.id,
          description: `Assignment due: ${data.title}${course ? ` (${course.name})` : ''}`,
          location: '',
          userId: data.userId,
          fromIntegration: !!(data.platform || data.source),
          courseName: course?.name || 'Unknown Course',
          platform: data.platform || data.source || 'bap',
        };
      }).filter(assignment => assignment !== null);
      
      console.log(`[Calendar] Processed ${assignments.length} regular assignments (after date filtering)`);

      // 5. Process integration assignments (only from courses that have them)
      const coursesWithIntegrations = userCourses.filter(course => 
        (course.userLinkedIntegrations && course.userLinkedIntegrations[userId]) ||
        (course.linkedIntegrations && course.linkedIntegrations.length > 0) ||
        (course.integrations && course.integrations[userId])
      );

      console.log(`[Calendar] Processing ${coursesWithIntegrations.length} courses with integrations`);

      for (const course of coursesWithIntegrations) {
        // User-specific linked integrations
        if (course.userLinkedIntegrations && course.userLinkedIntegrations[userId]) {
          const userAggregatedData = course.userAggregatedData?.[userId];
          if (userAggregatedData && userAggregatedData.assignments) {
            const integrationAssignments = userAggregatedData.assignments
              .map(assignment => {
                const dueDate = convertToISOString(assignment.dueDate);
                if (!dueDate) return null;
                
                // Use same lenient filtering logic as regular assignments
                if (startDate && endDate) {
                  const assignmentDate = new Date(dueDate);
                  const rangeStart = new Date(startDate);
                  const rangeEnd = new Date(endDate);
                  
                  const rangeSpanMs = rangeEnd.getTime() - rangeStart.getTime();
                  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
                  
                  if (rangeSpanMs < oneYearMs) {
                    const expandedStart = new Date(rangeStart.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
                    const expandedEnd = new Date(rangeEnd.getTime() + (6 * 30 * 24 * 60 * 60 * 1000));
                    
                    if (assignmentDate < expandedStart || assignmentDate > expandedEnd) return null;
                  }
                }
                
                return {
                  id: `integration-${assignment.id || assignment.externalId}`,
                  title: assignment.title,
                  start: dueDate,
                  end: dueDate,
                  allDay: false,
                  color: this.getAssignmentColor(assignment.source || assignment.platform),
                  type: 'assignment',
                  courseId: assignment.courseId,
                  assignmentId: assignment.id || assignment.externalId,
                  description: `Assignment due: ${assignment.title} (${assignment.courseName || course.name})`,
                  location: '',
                  userId: userId,
                  fromIntegration: true,
                  courseName: assignment.courseName || course.name,
                  platform: assignment.source || assignment.platform || 'unknown'
                };
              })
              .filter(assignment => assignment !== null);
            
            assignments = assignments.concat(integrationAssignments);
            console.log(`[Calendar] Added ${integrationAssignments.length} assignments from user-specific integrations for course "${course.name}"`);
          }
        }
        
        // Legacy linked integrations
        else if (course.linkedIntegrations && course.linkedIntegrations.length > 0) {
          const legacyAssignments = (course.assignments || [])
            .map(assignment => {
              const dueDate = convertToISOString(assignment.dueDate);
              if (!dueDate) return null;
              
              // Use same lenient filtering logic
              if (startDate && endDate) {
                const assignmentDate = new Date(dueDate);
                const rangeStart = new Date(startDate);
                const rangeEnd = new Date(endDate);
                
                const rangeSpanMs = rangeEnd.getTime() - rangeStart.getTime();
                const oneYearMs = 365 * 24 * 60 * 60 * 1000;
                
                if (rangeSpanMs < oneYearMs) {
                  const expandedStart = new Date(rangeStart.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
                  const expandedEnd = new Date(rangeEnd.getTime() + (6 * 30 * 24 * 60 * 60 * 1000));
                  
                  if (assignmentDate < expandedStart || assignmentDate > expandedEnd) return null;
                }
              }
              
              return {
                id: `legacy-${assignment.id || assignment.externalId}`,
                title: assignment.title,
                start: dueDate,
                end: dueDate,
                allDay: false,
                color: this.getAssignmentColor(assignment.source || assignment.platform),
                type: 'assignment',
                courseId: assignment.courseId,
                assignmentId: assignment.id || assignment.externalId,
                description: `Assignment due: ${assignment.title} (${assignment.courseName || course.name})`,
                location: '',
                userId: userId,
                fromIntegration: true,
                courseName: assignment.courseName || course.name,
                platform: assignment.source || assignment.platform || 'unknown'
              };
            })
            .filter(assignment => assignment !== null);
          
          assignments = assignments.concat(legacyAssignments);
          console.log(`[Calendar] Added ${legacyAssignments.length} assignments from legacy integrations for course "${course.name}"`);
        }
        
        // Old format integrations
        else if (course.integrations && course.integrations[userId]) {
          Object.values(course.integrations[userId]).forEach(integration => {
            if (integration.isActive && integration.assignments) {
              const oldFormatAssignments = integration.assignments
                .map(assignment => {
                  const dueDate = convertToISOString(assignment.dueDate);
                  if (!dueDate) return null;
                  
                  // Use same lenient filtering logic
                  if (startDate && endDate) {
                    const assignmentDate = new Date(dueDate);
                    const rangeStart = new Date(startDate);
                    const rangeEnd = new Date(endDate);
                    
                    const rangeSpanMs = rangeEnd.getTime() - rangeStart.getTime();
                    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
                    
                    if (rangeSpanMs < oneYearMs) {
                      const expandedStart = new Date(rangeStart.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
                      const expandedEnd = new Date(rangeEnd.getTime() + (6 * 30 * 24 * 60 * 60 * 1000));
                      
                      if (assignmentDate < expandedStart || assignmentDate > expandedEnd) return null;
                    }
                  }
                  
                  return {
                    id: `old-integration-${assignment.id || assignment.externalId}`,
                    title: assignment.title,
                    start: dueDate,
                    end: dueDate,
                    allDay: false,
                    color: this.getAssignmentColor(integration.platform),
                    type: 'assignment',
                    courseId: assignment.courseId,
                    assignmentId: assignment.id || assignment.externalId,
                    description: `Assignment due: ${assignment.title} (${course.name})`,
                    location: '',
                    userId: userId,
                    fromIntegration: true,
                    courseName: course.name,
                    platform: integration.platform || 'unknown'
                  };
                })
                .filter(assignment => assignment !== null);
              
              assignments = assignments.concat(oldFormatAssignments);
              console.log(`[Calendar] Added ${oldFormatAssignments.length} assignments from old format integration "${integration.platform || 'unknown'}" for course "${course.name}"`);
            }
          });
        }
      }

      // 6. Deduplicate assignments
      const deduplicatedAssignments = this.deduplicateAssignments(assignments);
      
      // 7. Combine events and assignments
      const allEvents = [...events, ...deduplicatedAssignments];
      
      console.log(`[Calendar] Final result: ${events.length} events + ${deduplicatedAssignments.length} assignments = ${allEvents.length} total calendar items`);
      
      return {
        events: allEvents,
        summary: {
          totalEvents: events.length,
          totalAssignments: deduplicatedAssignments.length,
          upcomingCount: allEvents.filter(event => new Date(event.start) > new Date()).length,
        }
      };
    } catch (error) {
      console.error('Error getting optimized calendar data:', error);
      
      // Return graceful fallback instead of throwing
      return {
        events: [],
        summary: {
          totalEvents: 0,
          totalAssignments: 0,
          upcomingCount: 0,
        },
        error: 'Failed to load calendar data. Please try again later.'
      };
    }
  }

  /**
   * Deduplicate assignments for calendar display
   * @param {Array} assignments - Array of assignments
   * @returns {Array} - Deduplicated assignments
   */
  static deduplicateAssignments(assignments) {
    const deduplicated = [];
    const seen = new Map();

    console.log(`[Calendar] Deduplicating ${assignments.length} assignments`);

    assignments.forEach(assignment => {
      // Use title (for calendar) or name (for assignments) and dueDate as key
      const title = assignment.title || assignment.name;
      const dueDate = assignment.start || assignment.dueDate;
      const key = `${title?.toLowerCase()}_${dueDate}`;
      
      if (!seen.has(key)) {
        seen.set(key, assignment);
        deduplicated.push({
          ...assignment,
          duplicates: []
        });
      } else {
        // Add as duplicate - check if we already have this assignment
        const existingIndex = deduplicated.findIndex(a => {
          const existingTitle = a.title || a.name;
          const existingDueDate = a.start || a.dueDate;
          return existingTitle?.toLowerCase() === title?.toLowerCase() && 
                 existingDueDate === dueDate;
        });
        
        if (existingIndex >= 0) {
          deduplicated[existingIndex].duplicates.push({
            sourceUserId: assignment.userId,
            sourcePlatform: assignment.platform,
            originalData: assignment
          });
        }
      }
    });

    console.log(`[Calendar] Deduplicated to ${deduplicated.length} unique assignments`);
    return deduplicated;
  }

  /**
   * Update a calendar event
   * @param {string} eventId - Event ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - User ID (for permission check)
   * @returns {Promise<Object>} - Updated event data
   */
  static async updateCalendarEvent(eventId, updateData, userId) {
    try {
      const eventRef = db.collection('calendar_events').doc(eventId);
      const eventDoc = await eventRef.get();
      
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data();
      
      // Check if the event belongs to the current user
      if (eventData.userId !== userId) {
        throw new Error('You do not have permission to update this event');
      }
      
      // Convert date strings to Date objects if they exist
      if (updateData.start) {
        updateData.start = new Date(updateData.start);
      }
      if (updateData.end) {
        updateData.end = new Date(updateData.end);
      }
      
      const updatedData = {
        ...updateData,
        updatedAt: new Date(),
      };
      
      await eventRef.update(updatedData);
      
      // Return updated event
      const updatedEventDoc = await eventRef.get();
      return updatedEventDoc.data();
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID (for permission check)
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteCalendarEvent(eventId, userId) {
    try {
      const eventRef = db.collection('calendar_events').doc(eventId);
      const eventDoc = await eventRef.get();
      
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data();
      
      // Check if the event belongs to the current user
      if (eventData.userId !== userId) {
        throw new Error('You do not have permission to delete this event');
      }
      
      await eventRef.delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Import calendar events from ICS data
   * @param {string} icsData - ICS file content
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of imported events
   */
  static async importICS(icsData, userId) {
    try {
      console.log('[ICS Import] Starting import process...');
      console.log('[ICS Import] ICS data length:', icsData.length);
      console.log('[ICS Import] First 500 characters:', icsData.substring(0, 500));
      
      // Check if this is a valid ICS file
      if (!icsData.includes('BEGIN:VCALENDAR')) {
        throw new Error('Invalid ICS file: Missing VCALENDAR');
      }
      
      const events = this.parseICS(icsData);
      console.log('[ICS Import] Parsed events:', events.length);
      
      if (events.length === 0) {
        console.log('[ICS Import] No events found in ICS file');
        // Check for common issues
        const veventsCount = (icsData.match(/BEGIN:VEVENT/g) || []).length;
        console.log('[ICS Import] Raw VEVENT count in file:', veventsCount);
        
        if (veventsCount > 0) {
          console.log('[ICS Import] Found VEVENT blocks but no events parsed - possible parsing issue');
        }
      }
      
      const importedEvents = [];
      
      for (let i = 0; i < events.length; i++) {
        const eventData = events[i];
        console.log(`[ICS Import] Creating event ${i + 1}/${events.length}:`, {
          title: eventData.title,
          start: eventData.start,
          end: eventData.end,
          allDay: eventData.allDay
        });
        
        try {
          const event = await this.createEvent({
            ...eventData,
            type: 'imported',
            platform: 'imported', // Add platform property for filtering
            color: '#059669', // Green for imported events
          }, userId);
          importedEvents.push(event);
        } catch (eventError) {
          console.error(`[ICS Import] Error creating event ${i + 1}:`, eventError);
          // Continue with other events instead of failing completely
        }
      }
      
      console.log('[ICS Import] Successfully imported:', importedEvents.length, 'events');
      return importedEvents;
    } catch (error) {
      console.error('[ICS Import] Error importing ICS data:', error);
      throw error;
    }
  }

  /**
   * Parse ICS data into event objects
   * @param {string} icsData - ICS file content
   * @returns {Array} - Array of parsed events
   */
  static parseICS(icsData) {
    console.log('[ICS Parser] Starting to parse ICS data...');
    const events = [];
    const rawLines = icsData.split(/\r?\n/);
    
    // Handle line continuation (lines starting with space or tab continue previous line)
    const lines = [];
    let currentLine = '';
    
    for (const line of rawLines) {
      if (line.match(/^[ \t]/) && currentLine) {
        // This line continues the previous line
        currentLine += line.substring(1);
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = line;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    
    console.log(`[ICS Parser] Processed ${lines.length} lines after handling continuations`);
    
    let currentEvent = null;
    let inEvent = false;
    let eventCount = 0;
    
    for (let line of lines) {
      line = line.trim();
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {
          raw: {}  // Store raw values for debugging
        };
        inEvent = true;
        console.log('[ICS Parser] Started parsing event');
      } else if (line === 'END:VEVENT' && inEvent && currentEvent) {
        console.log('[ICS Parser] Finished parsing event:', {
          title: currentEvent.title,
          start: currentEvent.start,
          hasRecurrence: !!currentEvent.rrule,
          raw: currentEvent.raw
        });
        
        // Only add events that have both title and start time
        if (currentEvent.title && currentEvent.start) {
          // Handle recurring events
          if (currentEvent.rrule) {
            const recurringEvents = this.expandRecurringEvent(currentEvent);
            events.push(...recurringEvents);
            console.log(`[ICS Parser] Expanded ${recurringEvents.length} recurring events`);
          } else {
            events.push({
              title: currentEvent.title,
              description: currentEvent.description || '',
              start: currentEvent.start,
              end: currentEvent.end || currentEvent.start,
              allDay: currentEvent.allDay || false,
              location: currentEvent.location || '',
              uid: currentEvent.uid || `event-${eventCount++}`,
            });
          }
        } else {
          console.log('[ICS Parser] Skipping event - missing title or start time');
        }
        
        currentEvent = null;
        inEvent = false;
      } else if (inEvent && currentEvent && line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const fullKey = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        
        // Handle property parameters (e.g., DTSTART;TZID=America/New_York)
        const [key, ...params] = fullKey.split(';');
        const parameters = {};
        
        // Parse parameters
        params.forEach(param => {
          const [paramKey, paramValue] = param.split('=');
          if (paramKey && paramValue) {
            parameters[paramKey] = paramValue;
          }
        });
        
        // Store raw value for debugging
        currentEvent.raw[key] = { value, parameters };
        
        switch (key.toUpperCase()) {
          case 'SUMMARY':
            currentEvent.title = this.unescapeICSValue(value);
            break;
          case 'DESCRIPTION':
            currentEvent.description = this.unescapeICSValue(value);
            break;
          case 'DTSTART':
            const startResult = this.parseICSDate(value, parameters);
            currentEvent.start = startResult.date;
            currentEvent.allDay = startResult.allDay;
            break;
          case 'DTEND':
            const endResult = this.parseICSDate(value, parameters);
            currentEvent.end = endResult.date;
            break;
          case 'LOCATION':
            currentEvent.location = this.unescapeICSValue(value);
            break;
          case 'UID':
            currentEvent.uid = value;
            break;
          case 'RRULE':
            currentEvent.rrule = this.parseRRule(value);
            break;
          case 'EXDATE':
            if (!currentEvent.exdates) currentEvent.exdates = [];
            currentEvent.exdates.push(this.parseICSDate(value, parameters).date);
            break;
        }
      }
    }
    
    console.log(`[ICS Parser] Successfully parsed ${events.length} events`);
    return events;
  }

  /**
   * Parse ICS date format to JavaScript Date
   * @param {string} icsDate - ICS date string
   * @param {Object} parameters - ICS property parameters
   * @returns {Object} - Object with date and allDay properties
   */
  static parseICSDate(icsDate, parameters = {}) {
    let cleanDate = icsDate.trim();
    let allDay = false;
    
    // Handle timezone suffix (Z for UTC, +HHMM/-HHMM for offset)
    const timezoneMatch = cleanDate.match(/([+-]\d{4}|Z)$/);
    if (timezoneMatch) {
      cleanDate = cleanDate.replace(/([+-]\d{4}|Z)$/, '');
    }
    
    // Check if it's a date-only value
    if (parameters.VALUE === 'DATE' || cleanDate.length === 8) {
      allDay = true;
      // Date only: YYYYMMDD
      const year = parseInt(cleanDate.substring(0, 4));
      const month = parseInt(cleanDate.substring(4, 6)) - 1; // Month is 0-based in JS
      const day = parseInt(cleanDate.substring(6, 8));
      return {
        date: new Date(year, month, day),
        allDay: true
      };
    } else if (cleanDate.includes('T') || cleanDate.length >= 15) {
      // DateTime: YYYYMMDDTHHMMSS or YYYYMMDDHHMMSS
      cleanDate = cleanDate.replace('T', '');
      
      if (cleanDate.length >= 14) {
        const year = parseInt(cleanDate.substring(0, 4));
        const month = parseInt(cleanDate.substring(4, 6)) - 1;
        const day = parseInt(cleanDate.substring(6, 8));
        const hour = parseInt(cleanDate.substring(8, 10));
        const minute = parseInt(cleanDate.substring(10, 12));
        const second = parseInt(cleanDate.substring(12, 14)) || 0;
        
        let date = new Date(year, month, day, hour, minute, second);
        
        // Handle UTC timezone
        if (timezoneMatch && timezoneMatch[1] === 'Z') {
          date = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        }
        
        return {
          date,
          allDay: false
        };
      }
    }
    
    // Fallback to current date
    console.warn('[ICS Parser] Failed to parse date:', icsDate);
    return {
      date: new Date(),
      allDay: false
    };
  }

  /**
   * Unescape ICS property values
   * @param {string} value - Escaped ICS value
   * @returns {string} - Unescaped value
   */
  static unescapeICSValue(value) {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  /**
   * Parse RRULE (recurrence rule)
   * @param {string} rruleValue - RRULE value
   * @returns {Object} - Parsed recurrence rule
   */
  static parseRRule(rruleValue) {
    const rule = {};
    const parts = rruleValue.split(';');
    
    parts.forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        switch (key.toUpperCase()) {
          case 'FREQ':
            rule.frequency = value;
            break;
          case 'COUNT':
            rule.count = parseInt(value);
            break;
          case 'UNTIL':
            rule.until = this.parseICSDate(value).date;
            break;
          case 'INTERVAL':
            rule.interval = parseInt(value);
            break;
          case 'BYDAY':
            rule.byDay = value.split(',');
            break;
          case 'BYMONTHDAY':
            rule.byMonthDay = value.split(',').map(d => parseInt(d));
            break;
          case 'BYMONTH':
            rule.byMonth = value.split(',').map(m => parseInt(m));
            break;
        }
      }
    });
    
    return rule;
  }

  /**
   * Expand recurring event into individual events
   * @param {Object} event - Event with recurrence rule
   * @returns {Array} - Array of individual events
   */
  static expandRecurringEvent(event) {
    const events = [];
    const { rrule, start, end } = event;
    
    if (!rrule || !start) return [event];
    
    // Limit the number of recurring events to prevent infinite loops
    const maxEvents = 100;
    const interval = rrule.interval || 1;
    const count = Math.min(rrule.count || maxEvents, maxEvents);
    
    let currentDate = new Date(start);
    const endDate = rrule.until ? new Date(rrule.until) : null;
    
    for (let i = 0; i < count; i++) {
      // Stop if we've reached the until date
      if (endDate && currentDate > endDate) break;
      
      // Skip if this date is in the exception list
      if (event.exdates && event.exdates.some(exdate => 
        Math.abs(currentDate.getTime() - exdate.getTime()) < 24 * 60 * 60 * 1000
      )) {
        continue;
      }
      
      // Create event instance
      const eventInstance = {
        title: event.title,
        description: event.description || '',
        start: new Date(currentDate),
        end: end ? new Date(currentDate.getTime() + (end.getTime() - start.getTime())) : new Date(currentDate),
        allDay: event.allDay || false,
        location: event.location || '',
        uid: `${event.uid || 'recurring'}-${i}`,
        isRecurring: true,
        parentUid: event.uid
      };
      
      events.push(eventInstance);
      
      // Calculate next occurrence based on frequency
      switch (rrule.frequency) {
        case 'DAILY':
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        case 'WEEKLY':
          currentDate.setDate(currentDate.getDate() + (7 * interval));
          break;
        case 'MONTHLY':
          currentDate.setMonth(currentDate.getMonth() + interval);
          break;
        case 'YEARLY':
          currentDate.setFullYear(currentDate.getFullYear() + interval);
          break;
        default:
          // Unknown frequency, stop recurring
          break;
      }
    }
    
    return events;
  }
  
  /**
   * Get a schedule by ID
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<Object>} - Schedule data
   */
  static async getById(scheduleId) {
    try {
      const scheduleRef = db.collection('schedules').doc(scheduleId);
      const scheduleDoc = await scheduleRef.get();
      
      if (!scheduleDoc.exists) {
        return null;
      }
      
      return scheduleDoc.data();
    } catch (error) {
      console.error('Error getting schedule:', error);
      throw error;
    }
  }
  
  /**
   * Get all schedules for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of schedules
   */
  static async getByUserId(userId) {
    try {
      const schedulesRef = db.collection('schedules').where('userId', '==', userId);
      const snapshot = await schedulesRef.get();
      
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting schedules by user ID:', error);
      throw error;
    }
  }

  /**
   * Update a schedule
   * @param {string} scheduleId - Schedule ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated schedule data
   */
  static async update(scheduleId, updateData) {
    try {
      const scheduleRef = db.collection('schedules').doc(scheduleId);
      
      await scheduleRef.update({
        ...updateData,
        updatedAt: new Date(),
      });
      
      return this.getById(scheduleId);
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  }
  
  /**
   * Add an event to a schedule
   * @param {string} scheduleId - Schedule ID
   * @param {Object} eventData - Event data to be added
   * @returns {Promise<Object>} - Updated schedule data
   */
  static async addEvent(scheduleId, eventData) {
    try {
      const scheduleRef = db.collection('schedules').doc(scheduleId);
      const scheduleDoc = await scheduleRef.get();
      
      if (!scheduleDoc.exists) {
        throw new Error('Schedule not found');
      }
      
      const schedule = scheduleDoc.data();
      const events = schedule.events || [];
      
      const newEvent = {
        id: Date.now().toString(),
        ...eventData,
        createdAt: new Date(),
      };
      
      events.push(newEvent);
      
      await scheduleRef.update({
        events,
        updatedAt: new Date(),
      });
      
      return this.getById(scheduleId);
    } catch (error) {
      console.error('Error adding event to schedule:', error);
      throw error;
    }
  }
  
  /**
   * Update an event in a schedule
   * @param {string} scheduleId - Schedule ID
   * @param {string} eventId - Event ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated schedule data
   */
  static async updateEvent(scheduleId, eventId, updateData) {
    try {
      const scheduleRef = db.collection('schedules').doc(scheduleId);
      const scheduleDoc = await scheduleRef.get();
      
      if (!scheduleDoc.exists) {
        throw new Error('Schedule not found');
      }
      
      const schedule = scheduleDoc.data();
      const events = schedule.events || [];
      
      const eventIndex = events.findIndex(event => event.id === eventId);
      
      if (eventIndex === -1) {
        throw new Error('Event not found');
      }
      
      events[eventIndex] = {
        ...events[eventIndex],
        ...updateData,
        updatedAt: new Date(),
      };
      
      await scheduleRef.update({
        events,
        updatedAt: new Date(),
      });
      
      return this.getById(scheduleId);
    } catch (error) {
      console.error('Error updating event in schedule:', error);
      throw error;
    }
  }
  
  /**
   * Delete an event from a schedule
   * @param {string} scheduleId - Schedule ID
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} - Updated schedule data
   */
  static async deleteEvent(scheduleId, eventId) {
    try {
      const scheduleRef = db.collection('schedules').doc(scheduleId);
      const scheduleDoc = await scheduleRef.get();
      
      if (!scheduleDoc.exists) {
        throw new Error('Schedule not found');
      }
      
      const schedule = scheduleDoc.data();
      const events = schedule.events || [];
      
      const filteredEvents = events.filter(event => event.id !== eventId);
      
      await scheduleRef.update({
        events: filteredEvents,
        updatedAt: new Date(),
      });
      
      return this.getById(scheduleId);
    } catch (error) {
      console.error('Error deleting event from schedule:', error);
      throw error;
    }
  }
  
  /**
   * Delete a schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(scheduleId) {
    try {
      const scheduleRef = db.collection('schedules').doc(scheduleId);
      await scheduleRef.delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  }

  /**
   * Get calendar events for a user within a date range
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} - Array of calendar events
   */
  static async getCalendarEvents(userId, startDate, endDate) {
    try {
      // Simple query first - just filter by userId to avoid index requirements
      let query = db.collection('calendar_events')
        .where('userId', '==', userId);
      
      const snapshot = await query.get();
      
      const events = [];
      const startDateObj = startDate ? new Date(startDate) : null;
      const endDateObj = endDate ? new Date(endDate) : null;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const eventStart = data.start.toDate ? data.start.toDate() : new Date(data.start);
        
        // Apply date filtering in JavaScript to avoid index requirements
        if (startDateObj && eventStart < startDateObj) return;
        if (endDateObj && eventStart > endDateObj) return;
        
        events.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps back to dates
          start: eventStart,
          end: data.end.toDate ? data.end.toDate() : new Date(data.end),
          createdAt: data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        });
      });
      
      // Sort by start date manually
      events.sort((a, b) => a.start - b.start);
      
      console.log(`[Calendar Events] Found ${events.length} events for user ${userId} (${snapshot.docs.length} total, filtered by date)`);
      return events;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive calendar data (events + assignments + course schedules)
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Object>} - Object containing events and assignments
   */
  static async getCalendarData(userId, startDate, endDate) {
    try {
      console.log('[Calendar] Loading optimized calendar data for user', userId);
      
      // Get calendar events (including imported ICS events)
      const events = await this.getCalendarEvents(userId, startDate, endDate);
      console.log('[Calendar] Found', events.length, 'calendar events (including imported ICS events)');
      
      // Get assignments from courses (this would need to be implemented based on your assignment system)
      let assignments = [];
      try {
        // This would integrate with your assignment system
        // For now, we'll return empty array but with logging to match the original logs
        assignments = [];
        console.log('[Calendar] Found', assignments.length, 'assignments');
      } catch (assignmentError) {
        console.warn('[Calendar] Error fetching assignments:', assignmentError);
        assignments = [];
      }
      
      return {
        events,
        assignments,
        totalItems: events.length + assignments.length
      };
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      throw error;
    }
  }

  /**
   * Get assignment color based on platform
   * @param {string} platform - Platform name
   * @returns {string} - Color hex code
   */
  static getAssignmentColor(platform) {
    const platformColors = {
      gradescope: '#4f46e5',    // Indigo - matches frontend
      canvas: '#e11d48',        // Rose - matches frontend
      blackboard: '#1f2937',    // Gray - matches frontend
      brightspace: '#f59e0b',   // Amber - matches frontend
      moodle: '#059669'         // Emerald - matches frontend
    };
    
    // Normalize platform name to lowercase for comparison
    const normalizedPlatform = platform?.toLowerCase();
    return platformColors[normalizedPlatform] || '#dc2626'; // Default red for unknown platforms
  }

  /**
   * Delete a calendar event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID who owns the event
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteCalendarEvent(eventId, userId) {
    try {
      const eventRef = db.collection('calendar_events').doc(eventId);
      const eventDoc = await eventRef.get();
      
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }
      
      const event = eventDoc.data();
      
      if (event.userId !== userId) {
        throw new Error('You do not have permission to delete this event');
      }
      
      await eventRef.delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Smart detection of recurring events based on event patterns
   * @param {Object} targetEvent - The event to find recurring matches for
   * @param {Array} allEvents - All events to search through
   * @returns {Array} - Array of matching recurring events
   */
  static detectRecurringEvents(targetEvent, allEvents) {
    if (!targetEvent || !allEvents.length) return [];
    
    // Find events with matching characteristics
    const potentialMatches = allEvents.filter(event => {
      if (event.id === targetEvent.id) return true; // Include the target event itself
      
      // Must have same title (case insensitive)
      if (event.title?.toLowerCase() !== targetEvent.title?.toLowerCase()) return false;
      
      // Must have same location (or both empty)
      const eventLocation = (event.location || '').toLowerCase().trim();
      const targetLocation = (targetEvent.location || '').toLowerCase().trim();
      if (eventLocation !== targetLocation) return false;
      
      // Must have similar duration (within 15 minutes)
      const eventStart = event.start?.toDate ? event.start.toDate() : new Date(event.start);
      const eventEnd = event.end?.toDate ? event.end.toDate() : new Date(event.end);
      const targetStart = targetEvent.start?.toDate ? targetEvent.start.toDate() : new Date(targetEvent.start);
      const targetEnd = targetEvent.end?.toDate ? targetEvent.end.toDate() : new Date(targetEvent.end);
      
      const eventDuration = eventEnd - eventStart;
      const targetDuration = targetEnd - targetStart;
      if (Math.abs(eventDuration - targetDuration) > 15 * 60 * 1000) return false;
      
      // Check if times align (same hour/minute, different dates)
      const sameTimeOfDay = eventStart.getHours() === targetStart.getHours() && 
                           eventStart.getMinutes() === targetStart.getMinutes();
      
      return sameTimeOfDay;
    });
    
    // If we have multiple matches, analyze if they follow a pattern
    if (potentialMatches.length >= 2) {
      // Sort by date
      potentialMatches.sort((a, b) => {
        const aStart = a.start?.toDate ? a.start.toDate() : new Date(a.start);
        const bStart = b.start?.toDate ? b.start.toDate() : new Date(b.start);
        return aStart - bStart;
      });
      
      // Check for regular intervals
      const intervals = [];
      for (let i = 1; i < potentialMatches.length; i++) {
        const prevStart = potentialMatches[i-1].start?.toDate ? potentialMatches[i-1].start.toDate() : new Date(potentialMatches[i-1].start);
        const currStart = potentialMatches[i].start?.toDate ? potentialMatches[i].start.toDate() : new Date(potentialMatches[i].start);
        const daysDiff = Math.round((currStart - prevStart) / (1000 * 60 * 60 * 24));
        intervals.push(daysDiff);
      }
      
      // Check if intervals are consistent
      const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
      const isConsistent = intervals.every(interval => {
        // Allow some flexibility for monthly events (28-31 days)
        if (avgInterval >= 25 && avgInterval <= 35) {
          return interval >= 25 && interval <= 35;
        }
        // For other intervals, must be exact or very close
        return Math.abs(interval - avgInterval) <= 1;
      });
      
      if (isConsistent && avgInterval >= 1) {
        return potentialMatches;
      }
    }
    
    return [];
  }

  /**
   * Delete recurring events with options (this only, all, or this and following)
   * @param {string} eventId - Event ID of the clicked event
   * @param {string} userId - User ID who owns the event
   * @param {string} deleteType - 'this', 'all', or 'following'
   * @returns {Promise<Object>} - Deletion results
   */
  static async deleteRecurringEvent(eventId, userId, deleteType) {
    try {
      console.log(`[Recurring Delete] Starting ${deleteType} deletion for event ${eventId}`);
      
      // Get the clicked event
      const eventRef = db.collection('calendar_events').doc(eventId);
      const eventDoc = await eventRef.get();
      
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }
      
      const clickedEvent = { id: eventId, ...eventDoc.data() };
      
      if (clickedEvent.userId !== userId) {
        throw new Error('You do not have permission to delete this event');
      }
      
      let deletedCount = 0;
      const results = {
        type: deleteType,
        deletedCount: 0,
        eventIds: []
      };
      
      if (deleteType === 'this') {
        // Delete only this specific event
        await eventRef.delete();
        results.deletedCount = 1;
        results.eventIds = [eventId];
        console.log(`[Recurring Delete] Deleted single event: ${eventId}`);
        
      } else if (deleteType === 'all' || deleteType === 'following') {
        // Get all user events to analyze for recurring patterns
        const allEventsQuery = db.collection('calendar_events').where('userId', '==', userId);
        const snapshot = await allEventsQuery.get();
        const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // First try traditional UID-based matching
        const seriesUid = clickedEvent.parentUid || clickedEvent.uid;
        let seriesEvents = [];
        
        if (seriesUid) {
          seriesEvents = allEvents.filter(event => 
            event.parentUid === seriesUid || 
            event.uid === seriesUid || 
            (event.parentUid && event.parentUid === clickedEvent.parentUid)
          );
        }
        
        // If traditional way doesn't find multiple events, use smart detection
        if (seriesEvents.length <= 1) {
          seriesEvents = this.detectRecurringEvents(clickedEvent, allEvents);
          console.log(`[Recurring Delete] Smart detection found ${seriesEvents.length} events in series`);
        }
        
        if (seriesEvents.length > 0) {
          const batch = db.batch();
          const eventDate = clickedEvent.start?.toDate ? clickedEvent.start.toDate() : new Date(clickedEvent.start);
          
          seriesEvents.forEach(event => {
            if (deleteType === 'all') {
              // Delete all events in the series
              const docRef = db.collection('calendar_events').doc(event.id);
              batch.delete(docRef);
              results.eventIds.push(event.id);
            } else if (deleteType === 'following') {
              // Delete this event and all following events
              const eventStart = event.start?.toDate ? event.start.toDate() : new Date(event.start);
              if (eventStart >= eventDate) {
                const docRef = db.collection('calendar_events').doc(event.id);
                batch.delete(docRef);
                results.eventIds.push(event.id);
              }
            }
          });
          
          await batch.commit();
          results.deletedCount = results.eventIds.length;
          console.log(`[Recurring Delete] Deleted ${deleteType} events: ${results.deletedCount} events`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error deleting recurring events:', error);
      throw error;
    }
  }
}

module.exports = Schedule; 
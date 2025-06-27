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
      const events = this.parseICS(icsData);
      const importedEvents = [];
      
      for (const eventData of events) {
        const event = await this.createEvent({
          ...eventData,
          type: 'imported',
          color: '#059669', // Green for imported events
        }, userId);
        importedEvents.push(event);
      }
      
      return importedEvents;
    } catch (error) {
      console.error('Error importing ICS data:', error);
      throw error;
    }
  }

  /**
   * Parse ICS data into event objects
   * @param {string} icsData - ICS file content
   * @returns {Array} - Array of parsed events
   */
  static parseICS(icsData) {
    const events = [];
    const lines = icsData.split('\n');
    let currentEvent = null;
    
    for (let line of lines) {
      line = line.trim();
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.title && currentEvent.start) {
          events.push({
            title: currentEvent.title,
            description: currentEvent.description || '',
            start: currentEvent.start,
            end: currentEvent.end || currentEvent.start,
            allDay: currentEvent.allDay || false,
            location: currentEvent.location || '',
          });
        }
        currentEvent = null;
      } else if (currentEvent && line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':');
        
        switch (key) {
          case 'SUMMARY':
            currentEvent.title = value;
            break;
          case 'DESCRIPTION':
            currentEvent.description = value;
            break;
          case 'DTSTART':
            currentEvent.start = this.parseICSDate(value);
            if (value.length === 8) { // Date only, no time
              currentEvent.allDay = true;
            }
            break;
          case 'DTEND':
            currentEvent.end = this.parseICSDate(value);
            break;
          case 'LOCATION':
            currentEvent.location = value;
            break;
        }
      }
    }
    
    return events;
  }

  /**
   * Parse ICS date format to JavaScript Date
   * @param {string} icsDate - ICS date string
   * @returns {Date} - JavaScript Date object
   */
  static parseICSDate(icsDate) {
    // Remove timezone info for simplicity
    const cleanDate = icsDate.replace(/[TZ]/g, '').replace(/\+\d{4}$/, '');
    
    if (cleanDate.length === 8) {
      // Date only: YYYYMMDD
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      return new Date(year, month - 1, day);
    } else if (cleanDate.length >= 14) {
      // Date and time: YYYYMMDDTHHMMSS
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      const hour = cleanDate.substring(8, 10);
      const minute = cleanDate.substring(10, 12);
      const second = cleanDate.substring(12, 14);
      return new Date(year, month - 1, day, hour, minute, second);
    }
    
    return new Date();
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
}

module.exports = Schedule; 
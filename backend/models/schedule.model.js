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
   * Get comprehensive calendar data including events and assignments
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (optional)
   * @param {string} endDate - End date (optional)
   * @returns {Promise<Object>} - Calendar data with events and assignments
   */
  static async getCalendarData(userId, startDate, endDate) {
    try {
      // Get custom events (simplified query without date filtering for now)
      let eventQuery = db.collection('calendar_events').where('userId', '==', userId);
      const eventSnapshot = await eventQuery.get();
      const events = eventSnapshot.docs.map(doc => doc.data());
      
      // Get assignments from assignments collection (simplified query)
      let assignmentQuery = db.collection('assignments').where('userId', '==', userId);
      const assignmentSnapshot = await assignmentQuery.get();
      const assignments = assignmentSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          title: data.title,
          start: data.dueDate,
          end: data.dueDate,
          allDay: false,
          color: '#dc2626', // Red for assignments
          type: 'assignment',
          courseId: data.courseId,
          assignmentId: data.id,
          description: `Assignment due: ${data.title}`,
          location: '',
          userId: data.userId,
        };
      });
      
      // Filter by date range in memory if dates are provided
      let filteredEvents = events;
      let filteredAssignments = assignments;
      
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start || end) {
          filteredEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            if (start && eventDate < start) return false;
            if (end && eventDate > end) return false;
            return true;
          });
          
          filteredAssignments = assignments.filter(assignment => {
            const assignmentDate = new Date(assignment.start);
            if (start && assignmentDate < start) return false;
            if (end && assignmentDate > end) return false;
            return true;
          });
        }
      }
      
      // Combine events and assignments
      const allEvents = [...filteredEvents, ...filteredAssignments];
      
      return {
        events: allEvents,
        summary: {
          totalEvents: filteredEvents.length,
          totalAssignments: filteredAssignments.length,
          upcomingCount: allEvents.filter(event => new Date(event.start) > new Date()).length,
        }
      };
    } catch (error) {
      console.error('Error getting calendar data:', error);
      throw error;
    }
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
}

module.exports = Schedule; 
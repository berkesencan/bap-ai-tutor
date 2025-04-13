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
   * @returns {Promise<Array>} - Array of schedule data
   */
  static async getByUserId(userId) {
    try {
      const schedulesRef = db.collection('schedules').where('userId', '==', userId);
      const schedulesSnapshot = await schedulesRef.get();
      
      const schedules = [];
      schedulesSnapshot.forEach(doc => {
        schedules.push(doc.data());
      });
      
      return schedules;
    } catch (error) {
      console.error('Error getting schedules by user ID:', error);
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
   * Update a schedule
   * @param {string} scheduleId - Schedule ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated schedule data
   */
  static async update(scheduleId, updateData) {
    try {
      const scheduleRef = db.collection('schedules').doc(scheduleId);
      
      const updateDoc = {
        ...updateData,
        updatedAt: new Date(),
      };
      
      await scheduleRef.update(updateDoc);
      
      return this.getById(scheduleId);
    } catch (error) {
      console.error('Error updating schedule:', error);
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
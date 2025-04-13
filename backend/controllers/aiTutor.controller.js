const OpenAI = require('openai');
const Course = require('../models/course.model');
const Assignment = require('../models/assignment.model');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI Tutor controller for handling AI tutoring operations
 */
class AiTutorController {
  /**
   * Get tutoring help for a specific course
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getCourseHelp(req, res, next) {
    try {
      const { courseId } = req.params;
      const { question } = req.body;
      const userId = req.user.uid;
      
      // Check if the course exists and belongs to the current user
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
      
      if (course.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this course',
        });
      }
      
      // Create a prompt for the AI
      const prompt = `
        You are an AI tutor for a ${course.name} course.
        The course is taught by ${course.professor}.
        The course description is: ${course.description}
        
        Student's question: ${question}
        
        Please provide a helpful, detailed answer to the student's question.
        If you need more information to answer the question, please ask for it.
      `;
      
      // Get response from OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful AI tutor for college students." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });
      
      const response = completion.choices[0].message.content;
      
      res.status(200).json({
        success: true,
        data: {
          response,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get tutoring help for a specific assignment
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getAssignmentHelp(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const { question } = req.body;
      const userId = req.user.uid;
      
      // Check if the assignment exists and belongs to the current user
      const assignment = await Assignment.getById(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found',
        });
      }
      
      if (assignment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this assignment',
        });
      }
      
      // Get the course for this assignment
      const course = await Course.getById(assignment.courseId);
      
      // Create a prompt for the AI
      const prompt = `
        You are an AI tutor helping with an assignment for a ${course.name} course.
        The course is taught by ${course.professor}.
        
        Assignment details:
        Title: ${assignment.title}
        Description: ${assignment.description}
        Due Date: ${assignment.dueDate}
        
        Student's question: ${question}
        
        Please provide a helpful, detailed answer to the student's question.
        If you need more information to answer the question, please ask for it.
      `;
      
      // Get response from OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful AI tutor for college students." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });
      
      const response = completion.choices[0].message.content;
      
      res.status(200).json({
        success: true,
        data: {
          response,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get study plan for a specific course
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getStudyPlan(req, res, next) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;
      
      // Check if the course exists and belongs to the current user
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
      
      if (course.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this course',
        });
      }
      
      // Get assignments for this course
      const assignments = await Assignment.getByCourseId(courseId);
      
      // Create a prompt for the AI
      const prompt = `
        You are an AI tutor for a ${course.name} course.
        The course is taught by ${course.professor}.
        The course description is: ${course.description}
        
        The student has the following assignments:
        ${assignments.map(assignment => `
          - ${assignment.title}: ${assignment.description} (Due: ${assignment.dueDate})
        `).join('\n')}
        
        Please create a detailed study plan for this course, including:
        1. Recommended study schedule
        2. Key concepts to focus on
        3. Resources to use
        4. Tips for success in this course
      `;
      
      // Get response from OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful AI tutor for college students." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });
      
      const response = completion.choices[0].message.content;
      
      res.status(200).json({
        success: true,
        data: {
          response,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get exam preparation help for a specific course
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getExamPrep(req, res, next) {
    try {
      const { courseId } = req.params;
      const { examDate, examType } = req.body;
      const userId = req.user.uid;
      
      // Check if the course exists and belongs to the current user
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
      
      if (course.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this course',
        });
      }
      
      // Create a prompt for the AI
      const prompt = `
        You are an AI tutor for a ${course.name} course.
        The course is taught by ${course.professor}.
        The course description is: ${course.description}
        
        The student has an ${examType} exam on ${examDate}.
        
        Please create a detailed exam preparation plan, including:
        1. Recommended study schedule leading up to the exam
        2. Key topics to review
        3. Practice questions or problems to work on
        4. Test-taking strategies
        5. Tips for managing exam anxiety
      `;
      
      // Get response from OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful AI tutor for college students." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });
      
      const response = completion.choices[0].message.content;
      
      res.status(200).json({
        success: true,
        data: {
          response,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AiTutorController; 
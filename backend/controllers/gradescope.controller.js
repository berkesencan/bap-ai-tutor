const GradescopeService = require('../services/gradescope.service');

const gradescopeService = new GradescopeService();

// Login to Gradescope
exports.login = async (req, res) => {
  try {
    console.log('Backend received login request:', req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.error('Missing email or password in request');
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    await gradescopeService.login(email, password);
    console.log('Login successful, sending response to client');
    res.status(200).json({ message: 'Successfully logged in to Gradescope' });
  } catch (error) {
    console.error('Error in Gradescope login controller:', error.message);
    res.status(401).json({ 
      error: error.message,
      details: 'Failed to authenticate with Gradescope. Please check your credentials and try again.'
    });
  }
};

// Get courses
exports.getCourses = async (req, res) => {
  try {
    const courses = await gradescopeService.getCourses();
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get assignments for a course
exports.getAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const assignments = await gradescopeService.getAssignments(courseId);
    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const GradescopeService = require('../services/gradescope.service');

const gradescopeService = new GradescopeService();

// Login to Gradescope
exports.login = async (req, res) => {
  try {
    console.log('============================================');
    console.log('Backend received login request at:', new Date().toISOString());
    console.log('Request body:', req.body);
    console.log('Auth user:', req.user ? `${req.user.uid} (${req.user.email})` : 'Not authenticated');
    console.log('============================================');
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.error('Missing email or password in request');
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // First just try to send a success response without actually connecting to Gradescope
    // This helps isolate if the issue is with auth/routes or with the Gradescope service
    // Comment this out once debugging is complete
    return res.status(200).json({ message: 'Debug mode: Auth worked, not connecting to Gradescope yet' });
    
    // Regular flow below will run after removing the debug return above
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
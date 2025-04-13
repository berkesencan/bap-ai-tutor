const axios = require('axios');
const qs = require('querystring');
const cheerio = require('cheerio');

class GradescopeService {
  constructor() {
    this.session = axios.create({
      withCredentials: true,
      maxRedirects: 5,
    });
    this.isLoggedIn = false;
    this.account = null;
  }

  async login(email, password) {
    try {
      console.log(`Attempting to login to Gradescope with email: ${email}`);
      
      // Get CSRF token
      console.log('Fetching CSRF token...');
      const response = await this.session.get('https://www.gradescope.com/login');
      const $ = cheerio.load(response.data);
      const csrfToken = $('meta[name="csrf-token"]').attr('content');
      console.log('Got CSRF token:', csrfToken);
      
      // Login
      console.log('Attempting login with CSRF token...');
      const loginData = {
        'authenticity_token': csrfToken,
        'session[email]': email,
        'session[password]': password,
        'session[remember_me]': 1
      };
      console.log('Login data:', loginData);
      
      const loginResponse = await this.session.post('https://www.gradescope.com/login', 
        qs.stringify(loginData), 
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-Token': csrfToken,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
      
      console.log('Login response status:', loginResponse.status);
      console.log('Login response headers:', loginResponse.headers);
      console.log('Response URL:', loginResponse.request.res.responseUrl);
      
      // Check if login was successful
      if (loginResponse.request.res.responseUrl.includes('login')) {
        console.error('Login failed - redirected back to login page');
        throw new Error('Login failed. Check credentials.');
      }
      
      this.isLoggedIn = true;
      console.log('Login successful!');
      return true;
    } catch (error) {
      console.error('Error during Gradescope login:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async getCourses() {
    if (!this.isLoggedIn) {
      throw new Error('Not logged in');
    }
    
    try {
      const response = await this.session.get('https://www.gradescope.com/account');
      const $ = cheerio.load(response.data);
      
      const courses = {};
      $('.courseList--coursesForTerm .courseBox').each((i, elem) => {
        const courseId = $(elem).attr('href').split('/').pop();
        const courseName = $(elem).find('.courseBox--name').text().trim();
        const courseCode = $(elem).find('.courseBox--courseCode').text().trim();
        
        courses[courseId] = {
          id: courseId,
          name: courseName,
          code: courseCode
        };
      });
      
      return courses;
    } catch (error) {
      throw new Error(`Failed to get courses: ${error.message}`);
    }
  }

  async getAssignments(courseId) {
    if (!this.isLoggedIn) {
      throw new Error('Not logged in');
    }
    
    try {
      const response = await this.session.get(`https://www.gradescope.com/courses/${courseId}`);
      const $ = cheerio.load(response.data);
      
      const assignments = [];
      $('.assignments .table--primaryLink').each((i, elem) => {
        const assignmentId = $(elem).attr('href').split('/').pop();
        const assignmentName = $(elem).text().trim();
        
        assignments.push({
          id: assignmentId,
          name: assignmentName
        });
      });
      
      return assignments;
    } catch (error) {
      throw new Error(`Failed to get assignments: ${error.message}`);
    }
  }
}

module.exports = GradescopeService; 
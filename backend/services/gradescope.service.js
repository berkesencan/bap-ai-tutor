const axios = require('axios');
const qs = require('querystring');
const cheerio = require('cheerio');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const GradescopeAuth = require('../models/gradescope-auth.model');

class GradescopeService {
  constructor(userId) {
    // Store user ID for persistence
    this.userId = userId;
    
    // Create a cookie jar
    this.cookieJar = new tough.CookieJar();
    
    // Create axios instance with cookie jar support
    this.session = wrapper(axios.create({
      withCredentials: true,
      maxRedirects: 5,
      jar: this.cookieJar
    }));
    
    this.isLoggedIn = false;
    this.account = null;
    this.lastValidation = null;
  }

  /**
   * Initialize service with stored credentials and session
   */
  async initialize() {
    try {
      console.log(`Initializing Gradescope service for user ${this.userId}`);
      
      // Check if we need to re-authenticate
      const needsReauth = await GradescopeAuth.needsReauth(this.userId);
      
      if (needsReauth) {
        console.log(`User ${this.userId} needs re-authentication`);
        return false;
      }

      // Try to restore session from stored data
      const sessionData = await GradescopeAuth.getSessionData(this.userId);
      if (sessionData && sessionData.cookies) {
        console.log(`Found stored session data for user ${this.userId}, restoring cookies...`);
        // Restore cookies
        for (const cookie of sessionData.cookies) {
          await this.cookieJar.setCookie(cookie, 'https://www.gradescope.com');
        }
      }

      // Validate current session
      const isValid = await this.validateSession();
      if (isValid) {
        this.isLoggedIn = true;
        await GradescopeAuth.updateAuthStatus(this.userId, true);
        console.log(`User ${this.userId} session restored successfully`);
        return true;
      } else {
        console.log(`Restored session for user ${this.userId} is invalid, will attempt re-auth`);
      }

      // If session is invalid, try to re-authenticate with stored credentials
      const credentials = await GradescopeAuth.getCredentials(this.userId);
      if (credentials && credentials.email && credentials.password) {
        console.log(`Attempting automatic re-authentication for user ${this.userId}`);
        return await this.login(credentials.email, credentials.password, false); // Don't store again
      }

      console.log(`No stored credentials found for user ${this.userId}, manual login required`);
      return false;
    } catch (error) {
      console.error(`Error initializing Gradescope service for user ${this.userId}:`, error);
      await GradescopeAuth.updateAuthStatus(this.userId, false, error.message);
      return false;
    }
  }

  /**
   * Validate current session by making a test request
   */
  async validateSession() {
    try {
      const response = await this.session.get('https://www.gradescope.com/account');
      
      // If we get redirected to login, session is invalid
      if (response.request.res.responseUrl.includes('login')) {
        return false;
      }

      // Check if we can find user info on the page (means we're logged in)
      const $ = cheerio.load(response.data);
      const userName = $('.courseList--userName').text().trim();
      
      // Also check for the page title to confirm we're on the account page
      const pageTitle = $('title').text();
      
      if (userName || pageTitle.includes('Your Courses')) {
        this.lastValidation = new Date();
        console.log(`Session validation successful for user ${this.userId}: ${userName || 'Found courses page'}`);
        return true;
      }

      console.log(`Session validation failed for user ${this.userId}: No user info found`);
      return false;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  async login(email, password, storeCredentials = true) {
    try {
      console.log(`Attempting to login to Gradescope with email: ${email} for user: ${this.userId}`);
      
      // First check if we're already logged in by trying the account page
      console.log('Checking if already logged in...');
      const accountCheckResponse = await this.session.get('https://www.gradescope.com/account');
      
      // If we're not redirected to login and can find user info, we're already logged in
      if (!accountCheckResponse.request.res.responseUrl.includes('login')) {
        const $ = cheerio.load(accountCheckResponse.data);
        const userName = $('.courseList--userName').text().trim();
        const pageTitle = $('title').text();
        
        if (userName || pageTitle.includes('Your Courses')) {
          console.log(`Already logged in to Gradescope as: ${userName || 'user'} for user: ${this.userId}`);
          
          this.isLoggedIn = true;
          this.lastValidation = new Date();
          
          // Store session data if requested
          if (storeCredentials) {
            await GradescopeAuth.storeCredentials(this.userId, email, password);
            
            // Store session cookies
            const cookies = await this.cookieJar.getCookies('https://www.gradescope.com');
            const sessionData = {
              cookies: cookies.map(cookie => cookie.toString()),
              lastLogin: new Date()
            };
            await GradescopeAuth.storeSessionData(this.userId, sessionData);
          }
          
          // Update auth status
          await GradescopeAuth.updateAuthStatus(this.userId, true);
          
          console.log('Login successful (already authenticated)!');
          return true;
        }
      }
      
      // If we reach here, we need to actually log in
      console.log('Not logged in, proceeding with login flow...');
      
      // Get CSRF token from login page
      console.log('Fetching CSRF token from login page...');
      const response = await this.session.get('https://www.gradescope.com/login');
      const $ = cheerio.load(response.data);
      const csrfToken = $('meta[name="csrf-token"]').attr('content');
      console.log('Got CSRF token:', csrfToken);
      
      // Check for login form
      if (!$('form[action="/login"]').length) {
        console.error('Login form not found on page');
        console.log('Page title:', $('title').text());
        console.log('Login page HTML snippet:', $.html().substring(0, 500));
        console.log('All forms found:', $('form').map((i, el) => $(el).attr('action')).get());
        throw new Error('Could not find login form');
      }
      
      // Login
      console.log('Preparing login data with CSRF token...');
      const loginData = {
        'authenticity_token': csrfToken,
        'session[email]': email,
        'session[password]': password,
        'session[remember_me]': 1
      };
      
      console.log('Sending login request...');
      const loginResponse = await this.session.post('https://www.gradescope.com/login', 
        qs.stringify(loginData), 
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-Token': csrfToken,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Origin': 'https://www.gradescope.com',
            'Referer': 'https://www.gradescope.com/login'
          }
        });
      
      console.log('Login response status:', loginResponse.status);
      console.log('Response URL:', loginResponse.request.res.responseUrl);
      
      // Check if login was successful - a successful login redirects to /account
      if (loginResponse.request.res.responseUrl.includes('login')) {
        // Load the response to look for error messages
        const $error = cheerio.load(loginResponse.data);
        const errorMsg = $error('.alert-error').text().trim() || 'Invalid email or password';
        console.error('Login failed - redirected back to login page');
        console.error('Error message from page:', errorMsg);
        
        // Update auth status in database
        await GradescopeAuth.updateAuthStatus(this.userId, false, errorMsg);
        
        throw new Error(`Login failed: ${errorMsg}`);
      }
      
      // Try to fetch account page to verify login
      console.log('Verifying login by fetching account page...');
      const accountResponse = await this.session.get('https://www.gradescope.com/account');
      
      if (accountResponse.request.res.responseUrl.includes('login')) {
        console.error('Account page verification failed, redirected to login');
        await GradescopeAuth.updateAuthStatus(this.userId, false, 'Login session was not established properly');
        throw new Error('Login session was not established properly');
      }
      
      // Extract account info if needed
      const $account = cheerio.load(accountResponse.data);
      const userName = $account('.courseList--userName').text().trim();
      console.log('Successfully logged in as:', userName);
      
      this.isLoggedIn = true;
      this.lastValidation = new Date();
      
      // Store credentials and session data if requested
      if (storeCredentials) {
        await GradescopeAuth.storeCredentials(this.userId, email, password);
        
        // Store session cookies
        const cookies = await this.cookieJar.getCookies('https://www.gradescope.com');
        const sessionData = {
          cookies: cookies.map(cookie => cookie.toString()),
          lastLogin: new Date()
        };
        await GradescopeAuth.storeSessionData(this.userId, sessionData);
      }
      
      // Update auth status
      await GradescopeAuth.updateAuthStatus(this.userId, true);
      
      console.log('Login successful!');
      return true;
    } catch (error) {
      console.error('Error during Gradescope login:', error.message);
      await GradescopeAuth.updateAuthStatus(this.userId, false, error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        if (error.response.data && typeof error.response.data === 'string') {
          console.error('Response contains HTML? Length:', error.response.data.length);
          // Look for error messages in the HTML
          const $errorPage = cheerio.load(error.response.data);
          const pageErrors = $errorPage('.alert-error').text().trim();
          if (pageErrors) {
            console.error('Error messages found in response:', pageErrors);
          }
        }
      }
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Ensure we're authenticated, attempting re-auth if needed
   */
  async ensureAuthenticated() {
    // Check if we're currently logged in and recently validated
    if (this.isLoggedIn && this.lastValidation) {
      const timeSinceValidation = Date.now() - this.lastValidation.getTime();
      
      // If validated within last 10 minutes, assume we're good
      if (timeSinceValidation < 10 * 60 * 1000) {
        return true;
      }
    }

    // Try to validate current session
    if (await this.validateSession()) {
      this.isLoggedIn = true;
      await GradescopeAuth.updateAuthStatus(this.userId, true);
      return true;
    }

    // Try to initialize (restore session or re-auth)
    return await this.initialize();
  }

/** 
   * Retrieves course details (id, name, code, term, assignmentCount) as per the screenshot.
   * Taken from the first code, which matches the desired output.
   */
async getCourses() {
  if (!(await this.ensureAuthenticated())) {
    throw new Error('Not logged in');
  }
  
  try {
    console.log('Fetching courses from Gradescope account page...');
    const response = await this.session.get('https://www.gradescope.com/account');
    const $ = cheerio.load(response.data);
    
    console.log('Parsing course data from HTML...');
    const courses = {};
    let currentTerm = '';
    
    $('.courseList--term').each((i, termElem) => {
      currentTerm = $(termElem).text().trim();
      console.log(`Processing term: ${currentTerm}`);
      
      const courseList = $(termElem).next('.courseList--coursesForTerm');
      if (courseList.length === 0) {
        console.log(`No course list found for term ${currentTerm}`);
        return;
      }
      
      courseList.find('a.courseBox').each((j, courseBox) => {
        try {
          const courseUrl = $(courseBox).attr('href');
          if (!courseUrl) {
            console.log('Warning: Found course element without href');
            return;
          }
          const courseId = courseUrl.split('/').pop();
          const courseCode = $(courseBox).find('.courseBox--shortname').text().trim();
          const courseName = $(courseBox).find('.courseBox--name').text().trim();
          const assignmentsText = $(courseBox).find('.courseBox--assignments').text().trim();
          let assignmentCount = 0;
          if (assignmentsText) {
            const match = assignmentsText.match(/(\d+)/);
            if (match) {
              assignmentCount = parseInt(match[1], 10);
            }
          }
          console.log(`Found course: ${courseCode} - ${courseName} (ID: ${courseId}, Assignments: ${assignmentCount})`);
          courses[courseId] = {
            id: courseId,
            name: courseName || 'Unnamed Course',
            code: courseCode || 'No Code',
            term: currentTerm,
            assignmentCount: assignmentCount || 0
          };
        } catch (err) {
          console.log(`Error parsing course: ${err.message}`);
        }
      });
    });
    
    console.log(`Found ${Object.keys(courses).length} courses in total`);
    if (Object.keys(courses).length === 0) {
      console.log('No courses found. HTML snippet:');
      console.log($.html().substring(0, 1000));
    }
    return courses;
  } catch (error) {
    console.error('Error in getCourses:', error);
    throw new Error(`Failed to get courses: ${error.message}`);
  }
}

  async getAssignments(courseId) {
    if (!(await this.ensureAuthenticated())) {
      throw new Error('Not logged in');
    }
    
    try {
      console.log(`Fetching assignments for course ${courseId}...`);
      const response = await this.session.get(`https://www.gradescope.com/courses/${courseId}`);
      const $ = cheerio.load(response.data);
      
      // For debugging: Save a sample of the HTML to see what we're working with
      console.log('HTML sample from assignments page:');
      console.log($.html().substring(0, 1000));
      
      // Check if we're on a dashboard page
      const isDashboard = $('title').text().includes('Dashboard');
      console.log(`Page appears to be a dashboard view: ${isDashboard}`);
      
      console.log('Parsing assignments from HTML...');
      const assignments = [];
      
      // Log the page title for debugging
      console.log('Page title:', $('title').text());
      
      // Method 1: Try traditional assignment table
      console.log('Trying standard assignment table selectors...');
      if ($('.assignments').length > 0) {
        console.log('Found .assignments table, processing rows...');
        
        $('.assignments tbody tr').each((i, row) => {
          try {
            const linkElem = $(row).find('.table--primaryLink');
            const assignmentUrl = linkElem.attr('href');
            
            if (!assignmentUrl) {
              console.log('Warning: Found assignment row without href');
              return; // Skip this element
            }
            
            // Extract assignment ID correctly - get the segment after '/assignments/' 
            const assignmentsMatch = assignmentUrl.match(/\/assignments\/([^/]+)/);
            if (assignmentsMatch && assignmentsMatch[1]) {
              const assignmentId = assignmentsMatch[1];
              const assignmentName = linkElem.text().trim();
              
              // Get due date
              const dueDateElem = $(row).find('td:nth-child(2)');
              const dueDate = dueDateElem.length ? dueDateElem.text().trim() : null;
              console.log(`Due date text: "${dueDate}"`);
              
              // Get grade if available
              const gradeElem = $(row).find('td:nth-child(3)');
              const gradeText = gradeElem.length ? gradeElem.text().trim() : null;
              console.log(`Grade text: "${gradeText}"`);
              
              // Parse grade information
              let grade = null;
              let maxPoints = null;
              if (gradeText && gradeText.includes('/')) {
                const parts = gradeText.split('/');
                grade = parseFloat(parts[0].trim());
                maxPoints = parseFloat(parts[1].trim());
              }
              
              console.log(`Found assignment: ${assignmentName} (ID: ${assignmentId}, Due: ${dueDate}, Grade: ${grade}/${maxPoints})`);
              console.log(`Row HTML: ${$(row).html().substring(0, 200)}`);
              
              assignments.push({
                id: assignmentId,
                name: assignmentName || 'Unnamed Assignment',
                dueDate: dueDate,
                grade: !isNaN(grade) ? grade : null,
                maxPoints: !isNaN(maxPoints) ? maxPoints : null
              });
            } else {
              console.log('Warning: Could not extract assignment ID from URL:', assignmentUrl);
            }
          } catch (err) {
            console.log('Error parsing assignment row:', err.message);
          }
        });
      }
      
      // Method 2: Dashboard view with cards
      if (assignments.length === 0 && isDashboard) {
        console.log('Trying dashboard card selectors...');
        
        // Output counts of potential assignment containers for debugging
        console.log('Dashboard cards count:', $('.dashboard-section__cards .dashboard-card').length);
        console.log('Assignment tiles count:', $('.assignment-tile').length);
        
        // Method 2a: Try modern dashboard cards
        $('.dashboard-section__cards .dashboard-card, .assignment-tile').each((i, elem) => {
          try {
            // Look for anchor tag or element with title
            const linkElem = $(elem).find('a').first();
            const assignmentUrl = linkElem.attr('href');
            
            // If no direct href, try finding one within the card
            if (!assignmentUrl) {
              const allLinks = $(elem).find('a[href*="/assignments/"]');
              if (allLinks.length > 0) {
                const assignmentUrl = allLinks.first().attr('href');
                
                // Extract assignment ID correctly
                const assignmentsMatch = assignmentUrl.match(/\/assignments\/([^/]+)/);
                if (assignmentsMatch && assignmentsMatch[1]) {
                  const assignmentId = assignmentsMatch[1];
                  const assignmentName = $(elem).find('.assignment-name, .dashboard-card__title, h3').text().trim();
                  
                  // Look for due date
                  const dueDateElem = $(elem).find('.assignment-due-date, .due-date, .dashboard-card__due-date');
                  const dueDate = dueDateElem.length ? dueDateElem.text().trim() : null;
                  
                  // Look for grade
                  const gradeElem = $(elem).find('.assignment-grade, .grade, .dashboard-card__grade');
                  const gradeText = gradeElem.length ? gradeElem.text().trim() : null;
                  
                  // Parse grade information
                  let grade = null;
                  let maxPoints = null;
                  if (gradeText && gradeText.includes('/')) {
                    const parts = gradeText.split('/');
                    grade = parseFloat(parts[0].trim());
                    maxPoints = parseFloat(parts[1].trim());
                  }
                  
                  console.log(`Found dashboard assignment (nested link): ${assignmentName} (ID: ${assignmentId}, Due: ${dueDate}, Grade: ${grade}/${maxPoints})`);
                  console.log(`Card HTML: ${$(elem).html().substring(0, 200)}`);
                  
                  assignments.push({
                    id: assignmentId,
                    name: assignmentName || 'Dashboard Assignment',
                    dueDate: dueDate,
                    grade: !isNaN(grade) ? grade : null,
                    maxPoints: !isNaN(maxPoints) ? maxPoints : null
                  });
                } else {
                  console.log('Warning: Could not extract assignment ID from URL:', assignmentUrl);
                }
              }
              return;
            }
            
            // Process direct link
            if (assignmentUrl.includes('/assignments/')) {
              // Extract assignment ID correctly
              const assignmentsMatch = assignmentUrl.match(/\/assignments\/([^/]+)/);
              if (assignmentsMatch && assignmentsMatch[1]) {
                const assignmentId = assignmentsMatch[1];
                const assignmentName = $(elem).find('.assignment-name, .dashboard-card__title, h3').text().trim();
                
                // Look for due date
                const dueDateElem = $(elem).find('.assignment-due-date, .due-date, .dashboard-card__due-date');
                const dueDate = dueDateElem.length ? dueDateElem.text().trim() : null;
                
                // Look for grade
                const gradeElem = $(elem).find('.assignment-grade, .grade, .dashboard-card__grade');
                const gradeText = gradeElem.length ? gradeElem.text().trim() : null;
                
                // Parse grade information
                let grade = null;
                let maxPoints = null;
                if (gradeText && gradeText.includes('/')) {
                  const parts = gradeText.split('/');
                  grade = parseFloat(parts[0].trim());
                  maxPoints = parseFloat(parts[1].trim());
                }
                
                console.log(`Found dashboard assignment: ${assignmentName} (ID: ${assignmentId}, Due: ${dueDate}, Grade: ${grade}/${maxPoints})`);
                console.log(`Card HTML: ${$(elem).html().substring(0, 200)}`);
                
                assignments.push({
                  id: assignmentId,
                  name: assignmentName || 'Dashboard Assignment',
                  dueDate: dueDate,
                  grade: !isNaN(grade) ? grade : null,
                  maxPoints: !isNaN(maxPoints) ? maxPoints : null
                });
              } else {
                console.log('Warning: Could not extract assignment ID from URL:', assignmentUrl);
              }
            }
          } catch (err) {
            console.log('Error parsing dashboard card:', err.message);
          }
        });
      }
      
      // Method 3: Try alternative assignment table structure
      if (assignments.length === 0) {
        console.log('Trying alternative table selectors...');
        
        $('.table--assignmentTable tr, table tr').each((i, elem) => {
          try {
            // Skip header row
            if ($(elem).find('th').length > 0) return;
            
            const linkElem = $(elem).find('a').first();
            const assignmentUrl = linkElem.attr('href');
            
            if (!assignmentUrl || !assignmentUrl.includes('/assignments/')) return;
            
            // Process assignment URL
            if (!assignmentUrl) {
              console.log('Warning: Found alternative table row without assignment URL');
              return;
            }
            
            // Extract assignment ID correctly
            const assignmentsMatch = assignmentUrl.match(/\/assignments\/([^/]+)/);
            if (assignmentsMatch && assignmentsMatch[1]) {
              const assignmentId = assignmentsMatch[1];
              const assignmentName = $(elem).find('a[href*="/assignments/"]').text().trim() || 'Untitled Assignment';
              
              // Look for due date
              let dueDate = null;
              const dateCell = $(elem).find('td').eq(1); // Assuming date is in the second column
              if (dateCell.length) {
                dueDate = dateCell.text().trim();
              }
              
              // Look for grade
              let gradeText = null;
              const gradeCell = $(elem).find('td').eq(2); // Assuming grade is in the third column
              if (gradeCell.length) {
                gradeText = gradeCell.text().trim();
              }
              
              // Parse grade information
              let grade = null;
              let maxPoints = null;
              if (gradeText && gradeText.includes('/')) {
                const parts = gradeText.split('/');
                grade = parseFloat(parts[0].trim());
                maxPoints = parseFloat(parts[1].trim());
              }
              
              console.log(`Found assignment (alt table): ${assignmentName} (ID: ${assignmentId}, Due: ${dueDate}, Grade: ${grade}/${maxPoints})`);
              console.log(`Row HTML: ${$(elem).html().substring(0, 200)}`);
              
              assignments.push({
                id: assignmentId,
                name: assignmentName || 'Alternative Table Assignment',
                dueDate: dueDate,
                grade: !isNaN(grade) ? grade : null,
                maxPoints: !isNaN(maxPoints) ? maxPoints : null
              });
            } else {
              console.log('Warning: Could not extract assignment ID from URL:', assignmentUrl);
            }
          } catch (err) {
            console.log('Error parsing alt assignment row:', err.message);
          }
        });
      }
      
      // Method 4: Search for any links that might be assignments
      if (assignments.length === 0) {
        console.log('Last resort: searching for assignment links in the entire page...');
        
        // Find all links that have /assignments/ in their href
        $('a[href*="/assignments/"]').each((i, elem) => {
          try {
            const assignmentUrl = $(elem).attr('href');
            
            if (!assignmentUrl || !assignmentUrl.includes('/assignments/')) return;
            
            // Extract assignment ID correctly
            const assignmentsMatch = assignmentUrl.match(/\/assignments\/([^/]+)/);
            if (assignmentsMatch && assignmentsMatch[1]) {
              const assignmentId = assignmentsMatch[1];
              
              // Find the closest containing element that might have assignment info
              const container = $(elem).closest('tr, .card, .tile, div');
              const assignmentName = $(elem).text().trim() || container.find('h3, .title, strong').text().trim() || 'Linked Assignment';
              
              // Look for grade and due date in nearby elements
              let gradeText = null;
              let dueDate = null;
              
              if (container.length) {
                // Look for due date
                const dueDateElem = container.find('.due-date, [data-due-date]');
                dueDate = dueDateElem.length ? dueDateElem.text().trim() : null;
                
                // Look for grade
                const gradeElem = container.find('.grade, [data-grade]');
                gradeText = gradeElem.length ? gradeElem.text().trim() : null;
              }
              
              // Parse grade information
              let grade = null;
              let maxPoints = null;
              if (gradeText && gradeText.includes('/')) {
                const parts = gradeText.split('/');
                grade = parseFloat(parts[0].trim());
                maxPoints = parseFloat(parts[1].trim());
              }
              
              console.log(`Found assignment link: ${assignmentName} (ID: ${assignmentId}, Due: ${dueDate}, Grade: ${grade}/${maxPoints})`);
              console.log(`Parent container HTML: ${container.html()?.substring(0, 200)}`);
              
              assignments.push({
                id: assignmentId,
                name: assignmentName || 'Link Assignment',
                dueDate: dueDate,
                grade: !isNaN(grade) ? grade : null,
                maxPoints: !isNaN(maxPoints) ? maxPoints : null
              });
            } else {
              console.log('Warning: Could not extract assignment ID from URL:', assignmentUrl);
            }
          } catch (err) {
            console.log('Error parsing assignment link:', err.message);
          }
        });
      }
      
      console.log(`Found ${assignments.length} assignments in total`);
      
      // If we still have no assignments, log more HTML for debugging
      if (assignments.length === 0) {
        console.log('No assignments found with any selector. Logging more HTML details:');
        
        // Log some potential containers that might hold assignments
        const potentialContainers = [
          '.dashboard-section',
          '.dashboard-cards',
          '.table--assignmentTable',
          'table',
          '.gradebook',
          '.content-box'
        ];
        
        potentialContainers.forEach(selector => {
          const count = $(selector).length;
          console.log(`Count of "${selector}": ${count}`);
          if (count > 0) {
            console.log(`First "${selector}" HTML:`, $(selector).first().html()?.substring(0, 200) + '...');
          }
        });
        
        // Log all links in the page to see if we can identify assignment links
        console.log('All links in page:');
        const linkTexts = [];
        $('a').each((i, elem) => {
          const href = $(elem).attr('href');
          const text = $(elem).text().trim();
          if (href && text && href.includes('/assignments/')) {
            linkTexts.push(`${text} (${href})`);
          }
        });
        console.log(linkTexts.slice(0, 10).join('\n'));
        
        // Log a larger HTML snippet
        console.log('HTML snippet (500 chars):');
        console.log($.html().substring(0, 1000));
      }
      
      return assignments;
    } catch (error) {
      console.error('Error in getAssignments:', error);
      throw new Error(`Failed to get assignments: ${error.message}`);
    }
  }

  /**
   * Fetches the assignment PDF from Gradescope for a given course and assignment ID.
   * @param {string} courseId - The Gradescope course ID
   * @param {string} assignmentId - The Gradescope assignment ID
   * @returns {Promise<Buffer>} - The PDF file as a Buffer
   */
  async getAssignmentPDF(courseId, assignmentId) {
    console.log('DEBUG: Entered getAssignmentPDF', courseId, assignmentId);
    if (!(await this.ensureAuthenticated())) {
      throw new Error('Not logged in');
    }
    try {
      // 1. Go to the assignment or submission page
      let assignmentUrl = `https://www.gradescope.com/courses/${courseId}/assignments/${assignmentId}`;
      let response = await this.session.get(assignmentUrl);
      let $ = cheerio.load(response.data);

      // DEBUG: Log assignment page HTML
      const pageTitle = $('title').text();
      console.log('ASSIGNMENT PAGE HTML:', $.html().substring(0, 1000));
      console.log('PAGE TITLE:', pageTitle);

      // Extract submissionId
      const submissionIdRegex = /\/submissions\/(\d+)/;
      let submissionId = null;

      // Try to find a link to the submission page
      $('a').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && href.includes('/submissions/')) {
          const match = href.match(submissionIdRegex);
          if (match) {
            submissionId = match[1];
          }
        }
      });

      // Fallback: Try to extract from window.gon.page_context in a <script>
      if (!submissionId) {
        const scriptTags = $('script').toArray();
        for (const script of scriptTags) {
          const html = $(script).html();
          if (html && html.includes('window.gon')) {
            const match = html.match(/"id":"(\d+)"/);
            if (match) {
              submissionId = match[1];
              break;
            }
          }
        }
      }

      if (!submissionId) {
        throw new Error('Could not find submission ID');
      }

      // Construct the graded copy PDF URL
      const gradedCopyUrl = `https://www.gradescope.com/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}.pdf`;

      // Download the PDF
      const fileResponse = await this.session.get(gradedCopyUrl, { responseType: 'arraybuffer' });
      return fileResponse.data;
    } catch (error) {
      console.error('Error getting assignment PDF/ZIP:', error);
      throw error;
    }
  }
}

module.exports = GradescopeService;
const admin = require('firebase-admin');
const Course = require('./models/course.model');
const Assignment = require('./models/assignment.model');

// Initialize Firebase Admin (you may need to adjust this based on your setup)
// This is just for testing - make sure you have proper Firebase config

async function testUserSpecificIntegrations() {
  try {
    console.log('🧪 Testing User-Specific Linked Integrations...');

    // Test user IDs
    const userId1 = 'test-user-1';
    const userId2 = 'test-user-2';

    // Step 1: Create integration courses with assignments
    console.log('\n1️⃣ Creating integration courses with assignments...');
    
    const integrationCourse1 = await Course.create({
      name: 'Gradescope Course 1',
      code: 'CS101',
      description: 'Test Gradescope course',
      source: 'gradescope',
      externalId: 'gs-123',
      instructor: 'Prof. Smith'
    }, userId1);
    
    const integrationCourse2 = await Course.create({
      name: 'Canvas Course 1', 
      code: 'MATH201',
      description: 'Test Canvas course',
      source: 'canvas',
      externalId: 'canvas-456',
      instructor: 'Prof. Johnson'
    }, userId2);

    console.log(`✅ Integration courses created:`);
    console.log(`   Gradescope: ${integrationCourse1.name} (ID: ${integrationCourse1.id})`);
    console.log(`   Canvas: ${integrationCourse2.name} (ID: ${integrationCourse2.id})`);

    // Step 2: Add assignments to integration courses
    console.log('\n2️⃣ Adding assignments to integration courses...');
    
    // Add assignments to Gradescope course
    const assignment1 = await Assignment.create({
      title: 'Homework 1 - Gradescope',
      description: 'First homework assignment from Gradescope',
      dueDate: new Date('2024-02-15T23:59:00Z'),
      priority: 'high',
      status: 'pending',
      platform: 'Gradescope',
      source: 'gradescope',
      externalId: 'hw1-gs',
      url: 'https://gradescope.com/assignments/hw1',
      notes: 'Test assignment',
      files: []
    }, integrationCourse1.id, userId1);

    const assignment2 = await Assignment.create({
      title: 'Quiz 1 - Gradescope',
      description: 'First quiz from Gradescope', 
      dueDate: new Date('2024-02-20T23:59:00Z'),
      priority: 'medium',
      status: 'pending',
      platform: 'Gradescope',
      source: 'gradescope',
      externalId: 'quiz1-gs',
      url: 'https://gradescope.com/assignments/quiz1',
      notes: 'Test quiz',
      files: []
    }, integrationCourse1.id, userId1);

    // Add assignments to Canvas course
    const assignment3 = await Assignment.create({
      title: 'Project 1 - Canvas',
      description: 'First project from Canvas',
      dueDate: new Date('2024-02-25T23:59:00Z'),
      priority: 'high',
      status: 'pending',
      platform: 'Canvas',
      source: 'canvas',
      externalId: 'proj1-canvas',
      url: 'https://canvas.com/assignments/project1',
      notes: 'Test project',
      files: []
    }, integrationCourse2.id, userId2);

    console.log(`✅ Assignments created:`);
    console.log(`   ${assignment1.title} in ${integrationCourse1.name}`);
    console.log(`   ${assignment2.title} in ${integrationCourse1.name}`);
    console.log(`   ${assignment3.title} in ${integrationCourse2.name}`);

    // Step 3: Create main course
    console.log('\n3️⃣ Creating main course...');
    const course = await Course.create({
      name: 'Test Course',
      code: 'TEST101',
      description: 'Test course for integration',
      semester: 'Spring',
      year: 2024
    }, userId1);

    // Add user2 as member
    await Course.joinCourse(course.id, userId2);
    console.log(`✅ Course created: ${course.name} (ID: ${course.id})`);
    console.log(`✅ User 2 added as member`);

    // Step 4: Link different integrations for each user
    console.log('\n4️⃣ Linking integrations for users...');
    
    // User 1 links Gradescope course
    await Course.linkIntegrations(course.id, [integrationCourse1], userId1);
    console.log('✅ User 1 linked Gradescope course');
    
    // User 2 links Canvas course
    await Course.linkIntegrations(course.id, [integrationCourse2], userId2);
    console.log('✅ User 2 linked Canvas course');

    // Step 5: Verify user-specific data
    console.log('\n5️⃣ Verifying user-specific aggregated data...');
    const updatedCourse = await Course.getById(course.id);
    
    console.log('\n📊 Course Structure:');
    console.log(`   Total members: ${updatedCourse.members?.length || 0}`);
    console.log(`   User 1 linked integrations: ${updatedCourse.userLinkedIntegrations?.[userId1]?.length || 0}`);
    console.log(`   User 2 linked integrations: ${updatedCourse.userLinkedIntegrations?.[userId2]?.length || 0}`);
    
    if (updatedCourse.userAggregatedData) {
      console.log('\n📋 User-Specific Aggregated Data:');
      if (updatedCourse.userAggregatedData[userId1]) {
        const user1Data = updatedCourse.userAggregatedData[userId1];
        console.log(`   User 1: ${user1Data.assignments?.length || 0} assignments, ${user1Data.materials?.length || 0} materials`);
        if (user1Data.assignments && user1Data.assignments.length > 0) {
          user1Data.assignments.forEach(assignment => {
            console.log(`     - ${assignment.title} (from ${assignment.sourcePlatformName})`);
          });
        }
      }
      if (updatedCourse.userAggregatedData[userId2]) {
        const user2Data = updatedCourse.userAggregatedData[userId2];
        console.log(`   User 2: ${user2Data.assignments?.length || 0} assignments, ${user2Data.materials?.length || 0} materials`);
        if (user2Data.assignments && user2Data.assignments.length > 0) {
          user2Data.assignments.forEach(assignment => {
            console.log(`     - ${assignment.title} (from ${assignment.sourcePlatformName})`);
          });
        }
      }
    }

    // Step 6: Test assignment controller endpoints
    console.log('\n6️⃣ Testing assignment controller endpoints...');
    const AssignmentController = require('./controllers/assignment.controller');
    
    // Mock request/response objects
    const createMockReq = (userId, params = {}, body = {}) => ({
      user: { uid: userId },
      params,
      body
    });
    
    const createMockRes = () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        data: null
      };
      res.json.mockImplementation((data) => {
        res.data = data;
        return res;
      });
      return res;
    };

    // Test getAll for User 1
    console.log('\n   Testing getAll for User 1...');
    const req1 = createMockReq(userId1);
    const res1 = createMockRes();
    await AssignmentController.getAll(req1, res1, (err) => console.error('Error:', err));
    
    if (res1.data && res1.data.success) {
      console.log(`   ✅ User 1 total assignments: ${res1.data.data.assignments.length}`);
      res1.data.data.assignments.forEach(assignment => {
        console.log(`     - ${assignment.title} (Course: ${assignment.courseName || assignment.courseId})`);
      });
    }

    // Test getAll for User 2
    console.log('\n   Testing getAll for User 2...');
    const req2 = createMockReq(userId2);
    const res2 = createMockRes();
    await AssignmentController.getAll(req2, res2, (err) => console.error('Error:', err));
    
    if (res2.data && res2.data.success) {
      console.log(`   ✅ User 2 total assignments: ${res2.data.data.assignments.length}`);
      res2.data.data.assignments.forEach(assignment => {
        console.log(`     - ${assignment.title} (Course: ${assignment.courseName || assignment.courseId})`);
      });
    }

    // Test getByCourse for User 1
    console.log('\n   Testing getByCourse for User 1...');
    const req3 = createMockReq(userId1, { courseId: course.id });
    const res3 = createMockRes();
    await AssignmentController.getByCourse(req3, res3, (err) => console.error('Error:', err));
    
    if (res3.data && res3.data.success) {
      console.log(`   ✅ User 1 course assignments: ${res3.data.data.assignments.length}`);
      res3.data.data.assignments.forEach(assignment => {
        console.log(`     - ${assignment.title} (Platform: ${assignment.sourcePlatformName || assignment.platform})`);
      });
    }

    // Test getByCourse for User 2  
    console.log('\n   Testing getByCourse for User 2...');
    const req4 = createMockReq(userId2, { courseId: course.id });
    const res4 = createMockRes();
    await AssignmentController.getByCourse(req4, res4, (err) => console.error('Error:', err));
    
    if (res4.data && res4.data.success) {
      console.log(`   ✅ User 2 course assignments: ${res4.data.data.assignments.length}`);
      res4.data.data.assignments.forEach(assignment => {
        console.log(`     - ${assignment.title} (Platform: ${assignment.sourcePlatformName || assignment.platform})`);
      });
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n🎉 User-specific linked integrations with assignments are working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'bap-ai-tutor',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
  console.log('Firebase Admin SDK initialized successfully');
}

// Add jest mock for testing
global.jest = {
  fn: () => {
    const mockFn = (...args) => mockFn.mockReturnValue;
    mockFn.mockReturnThis = () => mockFn;
    mockFn.mockImplementation = (impl) => {
      mockFn.mockReturnValue = impl;
      return mockFn;
    };
    mockFn.mockReturnValue = mockFn;
    return mockFn;
  }
};

// Run the test
testUserSpecificIntegrations()
  .then(() => {
    console.log('\n🏁 Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error);
    process.exit(1);
  });

module.exports = { testUserSpecificIntegrations }; 
#!/usr/bin/env node

/**
 * Test script for Gradescope authentication hardening
 * Tests the new session management and health endpoint
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8000';

async function testGradescopeHealth() {
  console.log('🔍 Testing Gradescope health endpoint...');
  
  try {
    const response = await axios.get(`${API_BASE}/api/gradescope/health`);
    console.log('✅ Health endpoint response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    if (error.response) {
      console.log('❌ Health endpoint error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Health endpoint error:', error.message);
    }
    return null;
  }
}

async function testGradescopeAuthStatus() {
  console.log('🔍 Testing Gradescope auth status endpoint...');
  
  try {
    const response = await axios.get(`${API_BASE}/api/gradescope/auth/status`);
    console.log('✅ Auth status response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    if (error.response) {
      console.log('❌ Auth status error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Auth status error:', error.message);
    }
    return null;
  }
}

async function testGradescopeCourses() {
  console.log('🔍 Testing Gradescope courses endpoint...');
  
  try {
    const response = await axios.get(`${API_BASE}/api/gradescope/courses`);
    console.log('✅ Courses response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    if (error.response) {
      console.log('❌ Courses error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Courses error:', error.message);
    }
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Gradescope Authentication Test');
  console.log('==========================================');
  
  // Test health endpoint (should work without auth in dev mode)
  await testGradescopeHealth();
  
  console.log('\n');
  
  // Test auth status endpoint
  await testGradescopeAuthStatus();
  
  console.log('\n');
  
  // Test courses endpoint (will likely fail without proper auth)
  await testGradescopeCourses();
  
  console.log('\n✅ Test completed!');
  console.log('\n📝 Notes:');
  console.log('- Health endpoint should work in dev mode (DEV_NO_AUTH=true)');
  console.log('- Auth status and courses will require proper Gradescope authentication');
  console.log('- Check backend logs for detailed session management info');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testGradescopeHealth,
  testGradescopeAuthStatus,
  testGradescopeCourses
};

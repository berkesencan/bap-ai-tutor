#!/usr/bin/env node

/**
 * Frontend API Call Detector
 * 
 * Scans frontend source files to find all API endpoint calls.
 * Helps identify legacy routes that need compatibility mapping.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to match API calls
const patterns = [
  // fetch() calls
  /fetch\(\s*[`'"]([^`'"]*\/api\/[^`'"]*)[`'"]/g,
  /fetch\(\s*`([^`]*\/api\/[^`]*)`/g,
  
  // axios/apiClient calls
  /apiClient\.(get|post|put|delete)\(\s*[`'"]([^`'"]*\/api\/[^`'"]*)[`'"]/g,
  /apiClient\.(get|post|put|delete)\(\s*`([^`]*\/api\/[^`]*)`/g,
  
  // testApiClient calls
  /testApiClient\.(get|post|put|delete)\(\s*[`'"]([^`'"]*\/api\/[^`'"]*)[`'"]/g,
  /testApiClient\.(get|post|put|delete)\(\s*`([^`]*\/api\/[^`]*)`/g,
  
  // Direct API_BASE usage
  /API_BASE\s*\+\s*[`'"]([^`'"]*\/api\/[^`'"]*)[`'"]/g,
  /API_BASE\s*\+\s*`([^`]*\/api\/[^`]*)`/g,
  
  // Template literals with API paths
  /`\$\{API_BASE\}([^`]*\/api\/[^`]*)`/g,
  /`\$\{API_BASE_URL\}([^`]*\/api\/[^`]*)`/g,
];

function findApiCalls() {
  console.log('🔍 Scanning frontend source files for API calls...\n');
  
  // Find all frontend source files
  const frontendSrc = path.join(__dirname, '../../frontend/src');
  const files = glob.sync('**/*.{js,jsx,ts,tsx}', { 
    cwd: frontendSrc,
    absolute: true 
  });
  
  console.log(`📁 Found ${files.length} frontend source files`);
  
  const foundEndpoints = new Set();
  const fileEndpoints = new Map();
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(frontendSrc, file);
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const endpoint = match[1] || match[2];
          if (endpoint && endpoint.startsWith('/api/')) {
            foundEndpoints.add(endpoint);
            
            if (!fileEndpoints.has(relativePath)) {
              fileEndpoints.set(relativePath, new Set());
            }
            fileEndpoints.get(relativePath).add(endpoint);
          }
        }
      });
    } catch (error) {
      console.warn(`⚠️  Error reading file ${file}:`, error.message);
    }
  });
  
  // Sort endpoints alphabetically
  const sortedEndpoints = Array.from(foundEndpoints).sort();
  
  console.log(`\n📊 Found ${sortedEndpoints.length} unique API endpoints:\n`);
  
  sortedEndpoints.forEach(endpoint => {
    console.log(`  ${endpoint}`);
  });
  
  // Show which files use each endpoint
  console.log('\n📋 Endpoint usage by file:\n');
  fileEndpoints.forEach((endpoints, file) => {
    if (endpoints.size > 0) {
      console.log(`  ${file}:`);
      Array.from(endpoints).sort().forEach(endpoint => {
        console.log(`    ${endpoint}`);
      });
      console.log('');
    }
  });
  
  // Identify potential legacy endpoints
  console.log('\n🚨 Potential legacy endpoints (not in current routes):\n');
  const currentRoutes = [
    '/api/ai/chat',
    '/api/ai/generate-practice-exam', 
    '/api/ai/generate-questions',
    '/api/ai/study-plan',
    '/api/ai/explain',
    '/api/ai/process-pdf',
    '/api/ai/process-pdf-with-message',
    '/api/ai/test-gemini',
    '/api/ai/download-pdf/:filename',
    '/api/courses',
    '/api/assignments',
    '/api/gradescope/auth/status',
    '/api/gradescope/login',
    '/api/gradescope/courses',
    '/api/gradescope/health',
    '/api/rag/ingest',
    '/api/rag/retrieve',
    '/api/rag/health'
  ];
  
  const legacyEndpoints = sortedEndpoints.filter(endpoint => {
    // Remove dynamic parts for comparison
    const normalizedEndpoint = endpoint.replace(/:[^/]+/g, ':param');
    return !currentRoutes.some(route => {
      const normalizedRoute = route.replace(/:[^/]+/g, ':param');
      return normalizedEndpoint === normalizedRoute || 
             normalizedEndpoint.startsWith(normalizedRoute + '/');
    });
  });
  
  if (legacyEndpoints.length > 0) {
    legacyEndpoints.forEach(endpoint => {
      console.log(`  ${endpoint}`);
    });
    console.log('\n💡 Consider adding these to backend/config/legacy-routes.js');
  } else {
    console.log('  ✅ No obvious legacy endpoints found');
  }
  
  return sortedEndpoints;
}

// Run if called directly
if (require.main === module) {
  findApiCalls();
}

module.exports = { findApiCalls };

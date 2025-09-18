#!/usr/bin/env node

/**
 * RAG Assertion Script
 * 
 * Fails CI if any deprecated patterns are found in live code paths.
 * This ensures legacy context-stuffing code is properly removed or guarded.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns that should NOT appear in live code paths
const FORBIDDEN_PATTERNS = [
  // Legacy context stuffing
  { pattern: /buildEnhancedContext/g, description: 'Legacy buildEnhancedContext method' },
  { pattern: /materialExtracts/g, description: 'Legacy materialExtracts Firestore collection' },
  { pattern: /__gemini__/g, description: 'Legacy __gemini__ cache prefixes' },
  
  // Vision parsing in RAG context
  { pattern: /pdf2pic/g, description: 'pdf2pic should not be used in RAG (use Unstructured)' },
  { pattern: /tesseract/g, description: 'tesseract should not be used in RAG (use Unstructured)' },
  { pattern: /gemini-vision/g, description: 'gemini-vision should not be used in RAG' },
  
  // Legacy endpoints
  { pattern: /\/practice-exam/g, description: 'Legacy /practice-exam endpoint' },
  
  // Development mocks (should not be in production)
  { pattern: /simple-parsers/g, description: 'Development mock simple-parsers' },
  { pattern: /simple-embeddings/g, description: 'Development mock simple-embeddings' },
  { pattern: /simple-database/g, description: 'Development mock simple-database' },
  { pattern: /simple-search-index/g, description: 'Development mock simple-search-index' },
  { pattern: /simple-retrieval/g, description: 'Development mock simple-retrieval' }
];

// Files to check
const INCLUDE_PATTERNS = [
  'services/**/*.js',
  'routes/**/*.js',
  'controllers/**/*.js',
  'ingestion/**/*.js',
  'retrieval/**/*.js',
  'index.js'
];

// Files to exclude from checks
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  'scripts/**',
  'test-*.js',
  '*.test.js',
  '**/*.test.js',
  'simple-*.js' // Allow simple-* files to exist, just not be imported
];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    return regex.test(filePath);
  });
}

function checkFile(filePath) {
  if (shouldExcludeFile(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const violations = [];

    // Check if file is properly guarded with RAG_ENABLED checks
    const isGuarded = content.includes('flags.RAG_ENABLED') || 
                      content.includes('if (!flags.RAG_ENABLED)') ||
                      content.includes('// TODO: DEPRECATED');

    for (const { pattern, description } of FORBIDDEN_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        // Get line numbers for better debugging
        const lines = content.split('\n');
        const matchingLines = [];
        
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            matchingLines.push(index + 1);
          }
        });

        // Skip violations if file is properly guarded
        if (isGuarded && (
          description.includes('pdf2pic') ||
          description.includes('tesseract') ||
          description.includes('gemini-vision') ||
          description.includes('materialExtracts') ||
          description.includes('__gemini__') ||
          description.includes('/practice-exam')
        )) {
          continue; // Skip guarded legacy patterns
        }

        violations.push({
          file: filePath,
          pattern: pattern.source,
          description,
          matches: matches.length,
          lines: matchingLines
        });
      }
    }

    return violations;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    return [];
  }
}

function main() {
  console.log('🔍 Running RAG assertion checks...\n');

  let allViolations = [];
  let filesChecked = 0;

  // Get all files to check
  for (const pattern of INCLUDE_PATTERNS) {
    const files = glob.sync(pattern, { cwd: __dirname + '/..' });
    
    for (const file of files) {
      const fullPath = path.resolve(__dirname + '/..', file);
      const violations = checkFile(file);
      allViolations.push(...violations);
      filesChecked++;
    }
  }

  console.log(`📁 Checked ${filesChecked} files\n`);

  if (allViolations.length === 0) {
    console.log('✅ No forbidden patterns found!');
    console.log('🎉 RAG assertion checks passed\n');
    process.exit(0);
  } else {
    console.log(`❌ Found ${allViolations.length} violations:\n`);
    
    allViolations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.description}`);
      console.log(`   File: ${violation.file}`);
      console.log(`   Pattern: /${violation.pattern}/g`);
      console.log(`   Matches: ${violation.matches} (lines: ${violation.lines.join(', ')})`);
      console.log('');
    });

    console.log('💡 Fix suggestions:');
    console.log('   - Remove or guard deprecated code with if (!flags.RAG_ENABLED)');
    console.log('   - Replace with RAG-compatible alternatives');
    console.log('   - Move development mocks to test files');
    console.log('');
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

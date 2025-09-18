const { gradescopeKey, gcsPath, isValidGradescopeKey, extractUidFromKey } = require('./services/storage/path');

console.log('=== Testing Storage Path Builder ===');

// Test 1: Basic path generation
const key1 = gradescopeKey({
  uid: 'user123',
  courseId: 'course456',
  assignmentId: 'assignment789'
});
console.log('Test 1 - Basic key:', key1);
console.log('Expected: gradescope/user123/course456/assignment789.pdf');
console.log('Match:', key1 === 'gradescope/user123/course456/assignment789.pdf');

// Test 2: With prefix
process.env.STORAGE_PREFIX = 'dev/test';
const key2 = gradescopeKey({
  uid: 'user123',
  courseId: 'course456',
  assignmentId: 'assignment789'
});
console.log('\nTest 2 - With prefix:', key2);
console.log('Expected: dev/test/gradescope/user123/course456/assignment789.pdf');
console.log('Match:', key2 === 'dev/test/gradescope/user123/course456/assignment789.pdf');

// Test 3: GCS path generation
process.env.GCS_BUCKET_NAME = 'test-bucket';
const gcsPath1 = gcsPath(key1);
console.log('\nTest 3 - GCS path:', gcsPath1);
console.log('Expected: gs://test-bucket/gradescope/user123/course456/assignment789.pdf');
console.log('Match:', gcsPath1 === 'gs://test-bucket/gradescope/user123/course456/assignment789.pdf');

// Test 4: Key validation
console.log('\nTest 4 - Key validation:');
// Reset prefix for no-prefix test
delete process.env.STORAGE_PREFIX;
console.log('Valid key (no prefix):', isValidGradescopeKey('gradescope/user123/course456/assignment789.pdf'));
console.log('Valid key (with prefix):', isValidGradescopeKey('dev/test/gradescope/user123/course456/assignment789.pdf', 'dev/test'));
console.log('Invalid key:', isValidGradescopeKey('other/user123/course456/assignment789.pdf'));

// Test 5: UID extraction
console.log('\nTest 5 - UID extraction:');
console.log('UID from valid key (no prefix):', extractUidFromKey('gradescope/user123/course456/assignment789.pdf'));
console.log('UID from prefixed key:', extractUidFromKey('dev/test/gradescope/user123/course456/assignment789.pdf', 'dev/test'));
console.log('UID from invalid key:', extractUidFromKey('other/user123/course456/assignment789.pdf'));

console.log('\n=== All Tests Complete ===');

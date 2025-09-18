const { writeFileSync } = require('fs');
const { getServiceForUser } = require('../controllers/gradescope.controller');
const { fetchAssignmentArtifact } = require('../services/gradescope/fetcher');

async function main() {
  const userId = process.env.TEST_USER_ID || 'dev-cli';
  const gsCourseId = process.env.TEST_GS_COURSE_ID || '12345';
  const gsAssignmentId = process.env.TEST_GS_ASSIGNMENT_ID || '67890';

  console.log(`[TEST] Testing Gradescope fetch for user=${userId}, course=${gsCourseId}, assignment=${gsAssignmentId}`);

  try {
    // Sanity: make sure service is actually authenticated as THIS user
    const svc = await getServiceForUser(userId);
    console.log('[WHOAMI] Service created for user:', userId);

    // Test basic Gradescope connectivity
    try {
      const courses = await svc.getCourses();
      console.log('[WHOAMI] Found', courses.length, 'courses');
      if (courses.length > 0) {
        console.log('[WHOAMI] First course:', courses[0].name);
      }
    } catch (error) {
      console.log('[WHOAMI] Could not fetch courses:', error.message);
    }

    const art = await fetchAssignmentArtifact(userId, gsCourseId, gsAssignmentId);
    console.log('[ART] Result:', art.kind, art.reason || '', art.source || '');

    if (art.kind === 'pdf' || art.kind === 'rendered-pdf') {
      const filename = `/tmp/GS-${gsCourseId}-${gsAssignmentId}.pdf`;
      writeFileSync(filename, art.bytes);
      console.log('✅ WROTE PDF OK:', art.bytes.length, 'bytes to', filename);
    } else {
      console.error('❌ LOCKED:', art.reason, art.evidence || '');
      process.exit(2);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

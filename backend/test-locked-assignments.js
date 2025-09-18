const { Pool } = require('pg');
const flags = require('./config/flags');

async function testLockedAssignments() {
  console.log('🔍 Testing locked assignments detection...');
  
  const db = new Pool({
    connectionString: flags.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Check if assignment_index_status table exists and has data
    const result = await db.query(`
      SELECT title, reason, evidence 
      FROM assignment_index_status 
      WHERE assignment_id IN (
        SELECT id FROM assignments WHERE course_id = $1
      ) AND status = 'LOCKED'
    `, ['aa8a2355-a59e-46e8-ae99-99a82358ddb9']);
    
    console.log(`Found ${result.rows.length} locked assignments:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.title}: ${row.reason} (${row.evidence})`);
    });
    
    // Also check if assignments table has the course
    const assignmentsResult = await db.query(`
      SELECT id, title FROM assignments WHERE course_id = $1
    `, ['aa8a2355-a59e-46e8-ae99-99a82358ddb9']);
    
    console.log(`\nFound ${assignmentsResult.rows.length} assignments in course:`);
    assignmentsResult.rows.forEach(row => {
      console.log(`  - ${row.id}: ${row.title}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing locked assignments:', error);
  } finally {
    await db.end();
  }
}

testLockedAssignments();

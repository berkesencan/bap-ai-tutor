const { Pool } = require('pg');
require('dotenv').config();

async function checkChunks() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const result = await db.query(`
      SELECT course_id, kind, COUNT(*) as count 
      FROM rag_chunks 
      GROUP BY course_id, kind 
      ORDER BY course_id, kind
    `);
    
    console.log('Chunks in database:');
    result.rows.forEach(row => {
      console.log(`  Course: ${row.course_id}, Kind: ${row.kind}, Count: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error checking chunks:', error);
  } finally {
    await db.end();
  }
}

checkChunks();

const { Pool } = require('pg');
require('dotenv').config();

async function checkChunkDetails() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const result = await db.query(`
      SELECT id, course_id, file_id, title, content, kind, source_platform
      FROM rag_chunks 
      WHERE course_id = 'aa8a2355-a59e-46e8-ae99-99a82358ddb9'
      LIMIT 3
    `);
    
    console.log('Chunk details:');
    result.rows.forEach((row, i) => {
      console.log(`Chunk ${i + 1}:`, {
        id: row.id,
        course_id: row.course_id,
        file_id: row.file_id,
        title: row.title,
        kind: row.kind,
        source_platform: row.source_platform,
        content_preview: row.content?.substring(0, 50) + '...'
      });
    });
    
  } catch (error) {
    console.error('Error checking chunk details:', error);
  } finally {
    await db.end();
  }
}

checkChunkDetails();

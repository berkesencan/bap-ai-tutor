const { Pool } = require('pg');
const flags = require('./config/flags');

async function fixDatabaseSchema() {
  const db = new Pool({
    connectionString: flags.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Fixing database schema...');
    
    // Add missing doc_counts column
    await db.query('ALTER TABLE rag_index_meta ADD COLUMN IF NOT EXISTS doc_counts JSONB;');
    console.log('✅ Added doc_counts column');
    
    // Check if we have any data in rag_chunks
    const chunksResult = await db.query('SELECT COUNT(*) as count FROM rag_chunks WHERE kind = $1', ['gradescope-pdf']);
    console.log(`📊 Found ${chunksResult.rows[0].count} PDF chunks in database`);
    
    // Check specific titles
    const titlesResult = await db.query('SELECT DISTINCT title FROM rag_chunks WHERE kind = $1 ORDER BY title', ['gradescope-pdf']);
    console.log('📋 PDF chunk titles:', titlesResult.rows.map(r => r.title));
    
    // Check if we have Problem Set 5 specifically
    const ps5Result = await db.query('SELECT title, content FROM rag_chunks WHERE kind = $1 AND (title ILIKE $2 OR content ILIKE $2)', ['gradescope-pdf', '%problem set 5%']);
    console.log(`🔍 Problem Set 5 search results: ${ps5Result.rows.length} chunks`);
    if (ps5Result.rows.length > 0) {
      console.log('📄 PS5 titles found:', ps5Result.rows.map(r => r.title));
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await db.end();
  }
}

fixDatabaseSchema();

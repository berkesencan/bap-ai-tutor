const { Pool } = require('pg');
require('dotenv').config();

async function fixRagSchema() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Fixing RAG schema...');
    
    // Drop the old text column since we now use content
    await db.query('ALTER TABLE rag_chunks DROP COLUMN IF EXISTS text;');
    console.log('✅ Dropped old text column');
    
    console.log('🎉 RAG schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
  } finally {
    await db.end();
  }
}

fixRagSchema();

const { Pool } = require('pg');
require('dotenv').config();

async function migrateRagSchema() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Starting RAG schema migration...');
    
    // Add new columns to rag_chunks table
    const alterQueries = [
      'ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS title TEXT;',
      'ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS content TEXT;',
      'ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS heading TEXT;',
      'ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS chunk_index INT DEFAULT 0;',
      'ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT \'unknown\';',
      'ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS source_platform TEXT;',
      'ALTER TABLE rag_chunks RENAME COLUMN text TO content;'
    ];

    for (const query of alterQueries) {
      try {
        await db.query(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⚠️  Column already renamed or doesn't exist: ${query}`);
        } else {
          console.error(`❌ Error executing ${query}:`, error.message);
        }
      }
    }

    // Create rag_index_meta table
    const createIndexMetaTable = `
      CREATE TABLE IF NOT EXISTS rag_index_meta (
        course_id TEXT NOT NULL,
        assignment_id TEXT NOT NULL,
        chunk_count INT DEFAULT 0,
        ocr_used BOOLEAN DEFAULT FALSE,
        content_bytes BIGINT DEFAULT 0,
        last_indexed TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY (course_id, assignment_id)
      )
    `;

    await db.query(createIndexMetaTable);
    console.log('✅ Created rag_index_meta table');

    console.log('🎉 RAG schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await db.end();
  }
}

migrateRagSchema();

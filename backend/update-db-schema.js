const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') });

async function updateSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Updating database schema...');
    
    // Drop the table if it exists
    await pool.query('DROP TABLE IF EXISTS rag_chunks CASCADE');
    await pool.query('DROP TABLE IF EXISTS rag_index_meta CASCADE');
    
    // Create the table with correct dimensions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rag_chunks (
        id UUID PRIMARY KEY,
        course_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        heading TEXT,
        heading_path TEXT[],
        page INT,
        chunk_index INT DEFAULT 0,
        kind TEXT DEFAULT 'unknown',
        source_platform TEXT,
        embedding VECTOR(768),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    
    // Create index metadata table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rag_index_meta (
        course_id TEXT NOT NULL,
        last_indexed TIMESTAMPTZ DEFAULT now(),
        doc_counts JSONB DEFAULT '{}',
        status TEXT DEFAULT 'pending',
        PRIMARY KEY (course_id)
      )
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS rag_chunks_course_id_idx ON rag_chunks(course_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS rag_chunks_file_id_idx ON rag_chunks(file_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS rag_chunks_kind_idx ON rag_chunks(kind)');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS rag_chunks_embed_idx 
      ON rag_chunks USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists=100)
    `);
    
    console.log('Database schema updated successfully');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await pool.end();
  }
}

updateSchema();

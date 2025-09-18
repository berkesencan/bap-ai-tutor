const { Pool } = require('pg');
const flags = require('./config/flags');

async function createAssignmentStatusTable() {
  console.log('📋 Creating assignment_index_status table...');
  
  const db = new Pool({
    connectionString: flags.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Create the assignment_index_status table
    const query = `
      CREATE TABLE IF NOT EXISTS assignment_index_status (
        id SERIAL PRIMARY KEY,
        assignment_id VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('INDEXED', 'LOCKED', 'FAILED')),
        reason VARCHAR(100),
        evidence TEXT,
        last_checked_at TIMESTAMP WITH TIME ZONE,
        gs_course_id VARCHAR(255),
        gs_assignment_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_assignment_status_assignment_id ON assignment_index_status(assignment_id);
      CREATE INDEX IF NOT EXISTS idx_assignment_status_status ON assignment_index_status(status);
      CREATE INDEX IF NOT EXISTS idx_assignment_status_gs_course_id ON assignment_index_status(gs_course_id);
    `;
    
    await db.query(query);
    console.log('✅ assignment_index_status table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating assignment_index_status table:', error);
  } finally {
    await db.end();
  }
}

createAssignmentStatusTable();

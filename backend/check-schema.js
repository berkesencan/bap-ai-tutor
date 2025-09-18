const { Pool } = require('pg');
require('dotenv').config();

async function checkSchema() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'rag_chunks' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current rag_chunks schema:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await db.end();
  }
}

checkSchema();

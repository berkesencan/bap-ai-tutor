#!/usr/bin/env node

const { Pool } = require('pg');

async function cleanupLegacyChunks() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:q7rT5EGCZiOxcE9D@localhost:55432/rag_db',
    ssl: false
  });

  try {
    console.log('🧹 Starting legacy chunk cleanup...');
    
    // Check current state
    const beforeCount = await pool.query('SELECT COUNT(*) FROM rag_chunks');
    console.log(`📊 Before cleanup: ${beforeCount.rows[0].count} chunks`);
    
    // Show current titles
    const titles = await pool.query(`
      SELECT title, kind, COUNT(*) as count 
      FROM rag_chunks 
      WHERE course_id = 'aa8a2355-a59e-46e8-ae99-99a82358ddb9'
      GROUP BY title, kind 
      ORDER BY count DESC
    `);
    console.log('\n📋 Current titles in Calculus II course:');
    titles.rows.forEach(row => console.log(`  - "${row.title}" (${row.kind}): ${row.count} chunks`));
    
    // Remove empty/legacy rows that poison retrieval
    console.log('\n🗑️  Removing problematic chunks...');
    
    const deleteResult = await pool.query(`
      DELETE FROM rag_chunks 
      WHERE content IS NULL 
         OR kind IS NULL 
         OR title IS NULL 
         OR title = 'test-pdf-1'
         OR title = 'test-pdf-2'
         OR title = 'Untitled'
         OR content = ''
         OR (kind = 'unknown' AND title IS NULL)
    `);
    
    console.log(`✅ Removed ${deleteResult.rowCount} problematic chunks`);
    
    // Check after cleanup
    const afterCount = await pool.query('SELECT COUNT(*) FROM rag_chunks');
    console.log(`📊 After cleanup: ${afterCount.rows[0].count} chunks`);
    
    // Show remaining titles
    const remainingTitles = await pool.query(`
      SELECT title, kind, COUNT(*) as count 
      FROM rag_chunks 
      WHERE course_id = 'aa8a2355-a59e-46e8-ae99-99a82358ddb9'
      GROUP BY title, kind 
      ORDER BY count DESC
    `);
    console.log('\n📋 Remaining titles in Calculus II course:');
    remainingTitles.rows.forEach(row => console.log(`  - "${row.title}" (${row.kind}): ${row.count} chunks`));
    
    // Optional: enforce non-null going forward
    console.log('\n🔧 Adding constraints...');
    try {
      await pool.query('ALTER TABLE rag_chunks ALTER COLUMN content SET NOT NULL');
      console.log('✅ content column set to NOT NULL');
    } catch (e) {
      console.log('⚠️  content column constraint already exists or failed:', e.message);
    }
    
    try {
      await pool.query('ALTER TABLE rag_chunks ALTER COLUMN kind SET NOT NULL');
      console.log('✅ kind column set to NOT NULL');
    } catch (e) {
      console.log('⚠️  kind column constraint already exists or failed:', e.message);
    }
    
    try {
      await pool.query('ALTER TABLE rag_chunks ALTER COLUMN title SET NOT NULL');
      console.log('✅ title column set to NOT NULL');
    } catch (e) {
      console.log('⚠️  title column constraint already exists or failed:', e.message);
    }
    
    console.log('\n🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupLegacyChunks();

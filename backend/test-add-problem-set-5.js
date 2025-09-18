#!/usr/bin/env node

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function addProblemSet5() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:q7rT5EGCZiOxcE9D@localhost:55432/rag_db',
    ssl: false
  });

  try {
    console.log('🧪 Adding Problem Set 5 test data...');
    
    const courseId = 'aa8a2355-a59e-46e8-ae99-99a82358ddb9';
    
    // Add some Problem Set 5 chunks
    const chunks = [
      {
        id: uuidv4(),
        course_id: courseId,
        file_id: 'test-ps5-1',
        title: 'Problem Set 5',
        content: 'Problem Set 5: Advanced Calculus\n\nProblem 1: Find the limit as x approaches infinity of (x^2 + 3x + 1) / (2x^2 - 5x + 2).\n\nProblem 2: Evaluate the integral from 0 to π of sin(x) * cos(x) dx.\n\nProblem 3: Determine if the series Σ(n=1 to ∞) (1/n^2) converges or diverges.',
        heading: 'Problem Set 5',
        heading_path: ['Problem Set 5'],
        page: 1,
        chunk_index: 0,
        kind: 'gradescope-pdf',
        source_platform: 'gradescope',
        source_id: 'test-ps5-1'
      },
      {
        id: uuidv4(),
        course_id: courseId,
        file_id: 'test-ps5-2',
        title: 'Problem Set 5',
        content: 'Problem Set 5 Solutions:\n\nProblem 1 Solution: Using L\'Hôpital\'s rule, the limit is 1/2.\n\nProblem 2 Solution: Using substitution u = sin(x), the integral evaluates to 0.\n\nProblem 3 Solution: This is a p-series with p = 2 > 1, so it converges.',
        heading: 'Problem Set 5 Solutions',
        heading_path: ['Problem Set 5', 'Solutions'],
        page: 2,
        chunk_index: 1,
        kind: 'gradescope-pdf',
        source_platform: 'gradescope',
        source_id: 'test-ps5-2'
      }
    ];
    
      // Insert chunks into database
      for (const chunk of chunks) {
        await pool.query(`
          INSERT INTO rag_chunks (
            id, course_id, file_id, title, content, heading, heading_path, 
            page, chunk_index, kind, source_platform
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          chunk.id, chunk.course_id, chunk.file_id, chunk.title, chunk.content,
          chunk.heading, chunk.heading_path, chunk.page, chunk.chunk_index,
          chunk.kind, chunk.source_platform
        ]);
      }
    
    console.log(`✅ Added ${chunks.length} Problem Set 5 chunks`);
    
    // Verify the chunks were added
    const result = await pool.query(`
      SELECT title, kind, COUNT(*) as count 
      FROM rag_chunks 
      WHERE course_id = $1 AND title = 'Problem Set 5'
      GROUP BY title, kind
    `, [courseId]);
    
    console.log('\n📋 Problem Set 5 chunks in database:');
    result.rows.forEach(row => console.log(`  - "${row.title}" (${row.kind}): ${row.count} chunks`));
    
    console.log('\n🎉 Problem Set 5 test data added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addProblemSet5();

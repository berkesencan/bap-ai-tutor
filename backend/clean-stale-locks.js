const { Pool } = require('pg');
const Typesense = require('typesense');
const flags = require('./config/flags');

async function cleanStaleLocks() {
  console.log('🧹 Cleaning stale LOCKED statuses and reindexing...');
  
  const db = new Pool({
    connectionString: flags.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const typesense = new Typesense.Client({
    nodes: [{
      host: flags.TYPESENSE_HOST,
      port: parseInt(flags.TYPESENSE_PORT),
      protocol: flags.TYPESENSE_PROTOCOL
    }],
    apiKey: flags.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 10
  });

  try {
    // 1. Identify offending assignments
    console.log('🔍 Identifying stale LOCKED statuses...');
    const staleResult = await db.query(`
      SELECT assignment_id, status, reason, gs_course_id, gs_assignment_id
      FROM assignment_index_status
      WHERE status = 'LOCKED' AND reason = 'no_download_link'
    `);
    
    console.log(`Found ${staleResult.rows.length} stale LOCKED statuses:`);
    staleResult.rows.forEach(row => {
      console.log(`  - ${row.assignment_id}: ${row.reason} (${row.gs_course_id}/${row.gs_assignment_id})`);
    });

    // 2. Purge stale lock statuses
    console.log('🗑️ Purging stale lock statuses...');
    const deleteResult = await db.query(`
      DELETE FROM assignment_index_status
      WHERE status = 'LOCKED' AND reason = 'no_download_link'
    `);
    console.log(`Deleted ${deleteResult.rowCount} stale lock statuses`);

    // 3. Clean up any synthetic/empty chunks
    console.log('🧽 Cleaning up synthetic/empty chunks...');
    const chunkResult = await db.query(`
      DELETE FROM rag_chunks
      WHERE source_platform = 'gradescope' 
        AND (content IS NULL OR length(content) < 200)
    `);
    console.log(`Deleted ${chunkResult.rowCount} synthetic/empty chunks`);

    // 4. Clean up Typesense
    console.log('🗑️ Cleaning up Typesense...');
    try {
      const searchResult = await typesense.collections('rag_chunks').documents().search({
        q: '*',
        query_by: 'source_platform',
        filter_by: 'source_platform:=gradescope',
        per_page: 250
      });
      
      if (searchResult.hits && searchResult.hits.length > 0) {
        const idsToDelete = searchResult.hits
          .filter(hit => !hit.document.content || hit.document.content.length < 200)
          .map(hit => hit.document.id);
        
        for (const id of idsToDelete) {
          await typesense.collections('rag_chunks').documents(id).delete();
        }
        console.log(`Deleted ${idsToDelete.length} synthetic chunks from Typesense`);
      }
    } catch (error) {
      console.log('Typesense cleanup skipped:', error.message);
    }

    // 5. Show current status
    console.log('📊 Current status after cleanup:');
    const statusResult = await db.query(`
      SELECT status, COUNT(*) as count
      FROM assignment_index_status
      GROUP BY status
    `);
    statusResult.rows.forEach(row => {
      console.log(`  - ${row.status}: ${row.count}`);
    });

    const chunkCountResult = await db.query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN kind = 'gradescope-pdf' THEN 1 END) as pdf_chunks
      FROM rag_chunks
      WHERE course_id = 'aa8a2355-a59e-46e8-ae99-99a82358ddb9'
    `);
    console.log(`  - Total chunks: ${chunkCountResult.rows[0].total}`);
    console.log(`  - PDF chunks: ${chunkCountResult.rows[0].pdf_chunks}`);

    console.log('✅ Cleanup completed successfully');
    console.log('🔄 Now run: curl -X POST "http://localhost:8000/api/rag/consistency/reindex/aa8a2355-a59e-46e8-ae99-99a82358ddb9"');

  } catch (error) {
    console.error('❌ Error cleaning stale locks:', error);
  } finally {
    await db.end();
  }
}

cleanStaleLocks();

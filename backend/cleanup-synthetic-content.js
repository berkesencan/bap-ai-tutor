const { Pool } = require('pg');
const Typesense = require('typesense');
const flags = require('./config/flags');

async function cleanupSyntheticContent() {
  console.log('🧹 Cleaning up synthetic content...');
  
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
    // Remove synthetic chunks from PostgreSQL
    console.log('🗑️ Removing synthetic chunks from PostgreSQL...');
    const syntheticFileIds = [
      'test-pdf-1', 'test-pdf-2', 'test-ps3-1', 'test-ps4-1', 
      'test-ps5-1', 'test-ps5-2', 'test-ps6-1'
    ];
    
    for (const fileId of syntheticFileIds) {
      const result = await db.query(
        'DELETE FROM rag_chunks WHERE file_id = $1',
        [fileId]
      );
      console.log(`  Removed ${result.rowCount} chunks for file_id: ${fileId}`);
    }

    // Remove synthetic chunks from Typesense
    console.log('🗑️ Removing synthetic chunks from Typesense...');
    for (const fileId of syntheticFileIds) {
      try {
        const searchResult = await typesense.collections('rag_chunks').documents().search({
          q: '*',
          query_by: 'file_id',
          filter_by: `file_id:=${fileId}`,
          per_page: 250
        });
        
        if (searchResult.hits && searchResult.hits.length > 0) {
          const idsToDelete = searchResult.hits.map(hit => hit.document.id);
          for (const id of idsToDelete) {
            await typesense.collections('rag_chunks').documents(id).delete();
          }
          console.log(`  Removed ${idsToDelete.length} chunks from Typesense for file_id: ${fileId}`);
        }
      } catch (error) {
        console.log(`  No chunks found in Typesense for file_id: ${fileId}`);
      }
    }

    // Clean up any remaining test/synthetic content
    console.log('🧽 Cleaning up any remaining test content...');
    const testResult = await db.query(`
      DELETE FROM rag_chunks 
      WHERE file_id LIKE 'test-%' 
         OR title LIKE '%test%' 
         OR content LIKE '%test content%'
         OR content LIKE '%synthetic%'
    `);
    console.log(`  Removed ${testResult.rowCount} additional test chunks`);

    // Verify cleanup
    console.log('✅ Verifying cleanup...');
    const remainingResult = await db.query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN file_id LIKE 'test-%' THEN 1 END) as test_chunks
      FROM rag_chunks 
      WHERE course_id = 'aa8a2355-a59e-46e8-ae99-99a82358ddb9'
    `);
    
    console.log(`📊 Remaining chunks: ${remainingResult.rows[0].total} total, ${remainingResult.rows[0].test_chunks} test chunks`);
    
    if (remainingResult.rows[0].test_chunks > 0) {
      console.log('⚠️  Warning: Some test chunks remain');
    } else {
      console.log('✅ All synthetic content removed successfully');
    }

  } catch (error) {
    console.error('❌ Error cleaning up synthetic content:', error);
  } finally {
    await db.end();
  }
}

cleanupSyntheticContent();

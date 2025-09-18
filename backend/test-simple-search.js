const Typesense = require('typesense');
require('dotenv').config();

async function testSimpleSearch() {
  const typesense = new Typesense.Client({
    nodes: [{
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http'
    }],
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
    connectionTimeoutSeconds: 10
  });

  try {
    console.log('Testing simple search...');
    
    // Test 1: Search without filters
    const search1 = await typesense.collections('rag_chunks')
      .documents()
      .search({
        q: 'derivative',
        query_by: 'content',
        per_page: 5
      });

    console.log('Search 1 (derivative):', {
      found: search1.found,
      hits: search1.hits?.length || 0
    });

    // Test 2: Search with course filter only
    const search2 = await typesense.collections('rag_chunks')
      .documents()
      .search({
        q: 'derivative',
        query_by: 'content',
        filter_by: `course_id:aa8a2355-a59e-46e8-ae99-99a82358ddb9`,
        per_page: 5
      });

    console.log('Search 2 (derivative + course):', {
      found: search2.found,
      hits: search2.hits?.length || 0
    });

    // Test 3: Search with course and kind filter
    const search3 = await typesense.collections('rag_chunks')
      .documents()
      .search({
        q: 'derivative',
        query_by: 'content',
        filter_by: `course_id:aa8a2355-a59e-46e8-ae99-99a82358ddb9 && kind:gradescope-pdf`,
        per_page: 5
      });

    console.log('Search 3 (derivative + course + kind):', {
      found: search3.found,
      hits: search3.hits?.length || 0
    });

    // Test 4: Search with different query
    const search4 = await typesense.collections('rag_chunks')
      .documents()
      .search({
        q: 'x squared',
        query_by: 'content',
        filter_by: `course_id:aa8a2355-a59e-46e8-ae99-99a82358ddb9 && kind:gradescope-pdf`,
        per_page: 5
      });

    console.log('Search 4 (x squared + course + kind):', {
      found: search4.found,
      hits: search4.hits?.length || 0
    });
    
  } catch (error) {
    console.error('Error testing search:', error);
  }
}

testSimpleSearch();

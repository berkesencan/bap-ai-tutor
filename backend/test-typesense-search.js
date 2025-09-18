const Typesense = require('typesense');
require('dotenv').config();

async function testTypesenseSearch() {
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
    console.log('Testing Typesense search...');
    
    // Search for PDF chunks
    const searchParameters = {
      q: 'derivative of x squared',
      query_by: 'content,heading_path',
      filter_by: `course_id:aa8a2355-a59e-46e8-ae99-99a82358ddb9 && kind:gradescope-pdf`,
      per_page: 5,
      page: 1,
      sort_by: '_text_match:desc',
      snippet_threshold: 30,
      num_typos: 1
    };

    const searchResults = await typesense.collections('rag_chunks')
      .documents()
      .search(searchParameters);

    console.log('Search results:', {
      found: searchResults.found,
      hits: searchResults.hits?.length || 0
    });

    if (searchResults.hits && searchResults.hits.length > 0) {
      console.log('First hit:', {
        id: searchResults.hits[0].document.id,
        course_id: searchResults.hits[0].document.course_id,
        kind: searchResults.hits[0].document.kind,
        title: searchResults.hits[0].document.title,
        content_preview: searchResults.hits[0].document.content?.substring(0, 50) + '...'
      });
    }
    
  } catch (error) {
    console.error('Error testing Typesense search:', error);
  }
}

testTypesenseSearch();

const Typesense = require('typesense');
require('dotenv').config();

async function testExactSearch() {
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
    console.log('Testing exact search parameters from retrieval service...');
    
    const courseId = 'aa8a2355-a59e-46e8-ae99-99a82358ddb9';
    const query = 'what is the derivative of x squared?';
    
    // Test the exact parameters from searchTypesense
    const pdfSearchParameters = {
      q: query,
      query_by: 'content,heading_path',
      filter_by: `course_id:${courseId} && kind:gradescope-pdf`,
      per_page: Math.ceil(5 * 0.7), // 70% of results from PDFs
      page: 1,
      sort_by: '_text_match:desc',
      snippet_threshold: 30,
      num_typos: 1
    };

    console.log('Search parameters:', pdfSearchParameters);

    const pdfResults = await typesense.collections('rag_chunks')
      .documents()
      .search(pdfSearchParameters);

    console.log('PDF search results:', {
      found: pdfResults.found,
      hits: pdfResults.hits?.length || 0
    });

    if (pdfResults.hits && pdfResults.hits.length > 0) {
      console.log('First hit:', {
        id: pdfResults.hits[0].document.id,
        course_id: pdfResults.hits[0].document.course_id,
        kind: pdfResults.hits[0].document.kind,
        title: pdfResults.hits[0].document.title
      });
    }
    
  } catch (error) {
    console.error('Error testing exact search:', error);
  }
}

testExactSearch();

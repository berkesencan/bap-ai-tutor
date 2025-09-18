const Typesense = require('typesense');
require('dotenv').config();

async function updateTypesenseSchema() {
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
    console.log('Updating Typesense schema...');
    
    // Delete existing collection
    try {
      await typesense.collections('rag_chunks').delete();
      console.log('✅ Deleted existing collection');
    } catch (error) {
      console.log('⚠️  Collection may not exist:', error.message);
    }
    
    // Create new collection with updated schema
    await typesense.collections().create({
      name: 'rag_chunks',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'course_id', type: 'string', facet: true },
        { name: 'file_id', type: 'string', facet: true },
        { name: 'title', type: 'string', optional: true },
        { name: 'content', type: 'string' },
        { name: 'heading', type: 'string', optional: true },
        { name: 'heading_path', type: 'string[]', optional: true },
        { name: 'page', type: 'int32' },
        { name: 'chunk_index', type: 'int32', optional: true },
        { name: 'kind', type: 'string', facet: true, optional: true },
        { name: 'source_platform', type: 'string', facet: true, optional: true }
      ],
      default_sorting_field: 'page'
    });
    
    console.log('✅ Created new collection with updated schema');
    console.log('🎉 Typesense schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
  }
}

updateTypesenseSchema();

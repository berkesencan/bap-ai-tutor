const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const flags = require('./config/flags');

async function addMissingProblemSets() {
  const db = new Pool({
    connectionString: flags.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const courseId = 'aa8a2355-a59e-46e8-ae99-99a82358ddb9';

  // Test content for Problem Set 3
  const problemSet3Content = `Problem Set 3: Integration Techniques

Problem 1: Evaluate the integral ∫(x² + 2x + 1)dx from 0 to 2.
Solution: Using the power rule, we get ∫(x² + 2x + 1)dx = (x³/3 + x² + x) evaluated from 0 to 2.
At x = 2: (8/3 + 4 + 2) = 8/3 + 6 = 26/3
At x = 0: 0
Therefore, the integral equals 26/3.

Problem 2: Find the area under the curve y = sin(x) from 0 to π.
Solution: ∫₀^π sin(x)dx = [-cos(x)]₀^π = -cos(π) - (-cos(0)) = -(-1) - (-1) = 1 + 1 = 2.

Problem 3: Use integration by parts to evaluate ∫x·e^x dx.
Solution: Let u = x, dv = e^x dx. Then du = dx, v = e^x.
Using integration by parts: ∫x·e^x dx = x·e^x - ∫e^x dx = x·e^x - e^x + C = e^x(x - 1) + C.`;

  // Test content for Problem Set 4
  const problemSet4Content = `Problem Set 4: Differential Equations

Problem 1: Solve the differential equation dy/dx = 2x.
Solution: Separating variables, we get dy = 2x dx.
Integrating both sides: ∫dy = ∫2x dx
y = x² + C, where C is the constant of integration.

Problem 2: Find the general solution to dy/dx = y.
Solution: This is a separable equation. We can write dy/y = dx.
Integrating both sides: ∫dy/y = ∫dx
ln|y| = x + C
Taking exponentials: |y| = e^(x + C) = e^C · e^x
Therefore, y = ±e^C · e^x = Ce^x, where C is an arbitrary constant.

Problem 3: Solve the initial value problem dy/dx = 3x², y(0) = 1.
Solution: First, find the general solution: dy = 3x² dx
Integrating: y = x³ + C
Using the initial condition y(0) = 1: 1 = 0³ + C, so C = 1.
Therefore, the solution is y = x³ + 1.`;

  try {
    // Add Problem Set 3 chunks
    const ps3Chunks = [
      {
        id: uuidv4(),
        course_id: courseId,
        file_id: 'test-ps3-1',
        title: 'Problem Set 3',
        content: problemSet3Content,
        heading: 'Problem Set 3',
        heading_path: ['Problem Set 3'],
        page: 1,
        chunk_index: 0,
        kind: 'gradescope-pdf',
        source_platform: 'gradescope'
      }
    ];

    for (const chunk of ps3Chunks) {
      await db.query(`
        INSERT INTO rag_chunks (id, course_id, file_id, title, content, heading, heading_path, page, chunk_index, kind, source_platform)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        chunk.id, chunk.course_id, chunk.file_id, chunk.title, chunk.content,
        chunk.heading, chunk.heading_path, chunk.page, chunk.chunk_index,
        chunk.kind, chunk.source_platform
      ]);
    }

    // Add Problem Set 4 chunks
    const ps4Chunks = [
      {
        id: uuidv4(),
        course_id: courseId,
        file_id: 'test-ps4-1',
        title: 'Problem Set 4',
        content: problemSet4Content,
        heading: 'Problem Set 4',
        heading_path: ['Problem Set 4'],
        page: 1,
        chunk_index: 0,
        kind: 'gradescope-pdf',
        source_platform: 'gradescope'
      }
    ];

    for (const chunk of ps4Chunks) {
      await db.query(`
        INSERT INTO rag_chunks (id, course_id, file_id, title, content, heading, heading_path, page, chunk_index, kind, source_platform)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        chunk.id, chunk.course_id, chunk.file_id, chunk.title, chunk.content,
        chunk.heading, chunk.heading_path, chunk.page, chunk.chunk_index,
        chunk.kind, chunk.source_platform
      ]);
    }

    console.log('✅ Added test content for Problem Sets 3 and 4');

    // Now add to Typesense
    const Typesense = require('typesense');
    const typesense = new Typesense.Client({
      nodes: [{
        host: flags.TYPESENSE_HOST,
        port: parseInt(flags.TYPESENSE_PORT),
        protocol: flags.TYPESENSE_PROTOCOL
      }],
      apiKey: flags.TYPESENSE_API_KEY,
      connectionTimeoutSeconds: 10
    });

    const allChunks = [...ps3Chunks, ...ps4Chunks];
    const documents = allChunks.map(chunk => ({
      id: chunk.id,
      course_id: chunk.course_id,
      file_id: chunk.file_id,
      title: chunk.title,
      content: chunk.content,
      heading: chunk.heading,
      heading_path: chunk.heading_path,
      page: chunk.page,
      chunk_index: chunk.chunk_index,
      kind: chunk.kind,
      source_platform: chunk.source_platform
    }));

    await typesense.collections('rag_chunks').documents().import(documents, {
      action: 'upsert'
    });

    console.log('✅ Added chunks to Typesense');

  } catch (error) {
    console.error('❌ Error adding missing problem sets:', error);
  } finally {
    await db.end();
  }
}

addMissingProblemSets();

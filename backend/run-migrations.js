const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const flags = require('./config/flags');

async function runMigrations() {
  const db = new Pool({
    connectionString: flags.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Running database migrations...');

    // Migration 0: assignments
    const migration0 = fs.readFileSync(path.join(__dirname, 'migrations', '000_assignments.sql'), 'utf8');
    await db.query(migration0);
    console.log('✅ Migration 000_assignments.sql completed');

    // Migration 1: assignment_files
    const migration1 = fs.readFileSync(path.join(__dirname, 'migrations', '001_assignment_files.sql'), 'utf8');
    await db.query(migration1);
    console.log('✅ Migration 001_assignment_files.sql completed');

    // Migration 2: assignment_index_status
    const migration2 = fs.readFileSync(path.join(__dirname, 'migrations', '002_assignment_index_status.sql'), 'utf8');
    await db.query(migration2);
    console.log('✅ Migration 002_assignment_index_status.sql completed');

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runMigrations();

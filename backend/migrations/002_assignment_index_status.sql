-- 002_assignment_index_status.sql
CREATE TABLE IF NOT EXISTS assignment_index_status (
  assignment_id UUID PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('INDEXED','LOCKED','FAILED','PENDING','IMPORTING')),
  reason TEXT,
  evidence TEXT,
  last_checked_at TIMESTAMPTZ,
  gs_course_id TEXT,
  gs_assignment_id TEXT,
  latest_version INT,
  doc_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_assignment_index_status_status ON assignment_index_status(status);
CREATE INDEX IF NOT EXISTS idx_assignment_index_status_gs_course_id ON assignment_index_status(gs_course_id);

-- 001_assignment_files.sql
CREATE TABLE IF NOT EXISTS assignment_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  version INT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('gradescope-pdf','rendered-pdf')),
  source TEXT NOT NULL CHECK (source IN ('download-link','submission-file','headless-print')),
  storage_key TEXT NOT NULL,        -- gcs key: gradescope/<course>/<assignment>/<doc_hash>.pdf
  doc_hash TEXT NOT NULL,           -- sha256 of bytes
  size_bytes BIGINT NOT NULL,
  page_count INT,
  text_chars INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, version),
  UNIQUE (assignment_id, doc_hash)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_assignment_files_assignment_id ON assignment_files(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_files_doc_hash ON assignment_files(doc_hash);
CREATE INDEX IF NOT EXISTS idx_assignment_files_storage_key ON assignment_files(storage_key);

CREATE TABLE IF NOT EXISTS project_inquiries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  client_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  project_type TEXT NOT NULL,
  project_location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  data_json TEXT NOT NULL,
  attachments_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_project_inquiries_created_at
  ON project_inquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_inquiries_status
  ON project_inquiries (status, created_at DESC);

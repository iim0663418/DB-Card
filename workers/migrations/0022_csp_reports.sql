-- CSP Reports Table
CREATE TABLE IF NOT EXISTS csp_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_uri TEXT NOT NULL,
  violated_directive TEXT NOT NULL,
  blocked_uri TEXT NOT NULL,
  source_file TEXT,
  line_number INTEGER,
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_csp_timestamp ON csp_reports(timestamp);
CREATE INDEX idx_csp_directive ON csp_reports(violated_directive);

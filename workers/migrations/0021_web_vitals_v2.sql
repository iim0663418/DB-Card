-- Web Vitals V2: Column-based schema replacing EAV model
CREATE TABLE web_vitals_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL,
  fcp REAL,
  lcp REAL,
  inp REAL,
  cls REAL,
  card_content_ready REAL,
  timestamp INTEGER NOT NULL
);

-- Migrate existing data: Group by page and timestamp (rounded to nearest second)
-- This handles cases where fcp/lcp/tti were inserted with slightly different timestamps
INSERT INTO web_vitals_v2 (page, fcp, lcp, timestamp)
SELECT
  page,
  MAX(CASE WHEN metric_name = 'fcp' THEN metric_value END) AS fcp,
  MAX(CASE WHEN metric_name = 'lcp' THEN metric_value END) AS lcp,
  MIN(timestamp) AS timestamp
FROM web_vitals
WHERE metric_name IN ('fcp', 'lcp')
GROUP BY page, CAST(timestamp / 1000 AS INTEGER);

-- Drop old table and rename v2
DROP TABLE web_vitals;
ALTER TABLE web_vitals_v2 RENAME TO web_vitals;

-- Add indexes
CREATE INDEX idx_vitals_timestamp ON web_vitals(timestamp);
CREATE INDEX idx_vitals_page ON web_vitals(page);

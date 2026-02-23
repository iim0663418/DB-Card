-- Web Vitals Monitoring Table
CREATE TABLE IF NOT EXISTS web_vitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_name TEXT NOT NULL,
  metric_value INTEGER NOT NULL,
  page TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_vitals_metric ON web_vitals(metric_name);
CREATE INDEX idx_vitals_timestamp ON web_vitals(timestamp);
CREATE INDEX idx_vitals_page ON web_vitals(page);

-- Security Events Table
-- Records security-related events for monitoring and analysis

CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,  -- 'endpoint_enumeration', 'rate_limit_exceeded', 'suspicious_pattern'
  ip_address TEXT NOT NULL,  -- Anonymized IP (first 3 octets only)
  details TEXT,              -- JSON string with additional context
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for querying by event type and time
CREATE INDEX IF NOT EXISTS idx_security_events_type_time 
ON security_events(event_type, created_at DESC);

-- Index for querying by IP
CREATE INDEX IF NOT EXISTS idx_security_events_ip 
ON security_events(ip_address, created_at DESC);

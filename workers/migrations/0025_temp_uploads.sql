-- Migration 0025: temp_uploads table
-- Purpose: Manage temporary image uploads with atomic consumption
-- Version: v3.3 Final (2026-02-22)

CREATE TABLE IF NOT EXISTS temp_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  upload_id TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  image_url TEXT NOT NULL,
  
  -- State management
  consumed INTEGER DEFAULT 0,
  expires_at INTEGER NOT NULL,
  
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_temp_uploads_user ON temp_uploads(user_email, expires_at);
CREATE INDEX IF NOT EXISTS idx_temp_uploads_id ON temp_uploads(upload_id, consumed);

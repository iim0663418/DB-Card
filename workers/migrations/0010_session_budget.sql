-- Migration 0010: Session Budget Tracking
-- Created: 2026-01-20
-- Purpose: Add total_sessions column to track session budget

-- Add total_sessions column
ALTER TABLE cards ADD COLUMN total_sessions INTEGER DEFAULT 0;

-- Create index for efficient queries
CREATE INDEX idx_cards_total_sessions ON cards(total_sessions);

-- Update existing cards to have 0 total_sessions
UPDATE cards SET total_sessions = 0 WHERE total_sessions IS NULL;

-- Migration 0034: Add organization_normalized for Chinese search
-- Purpose: Support traditional/simplified Chinese search normalization
-- Date: 2026-03-04

-- Add normalized organization column
ALTER TABLE received_cards ADD COLUMN organization_normalized TEXT;

-- Create index for fast search
CREATE INDEX IF NOT EXISTS idx_organization_normalized 
ON received_cards(organization_normalized);

-- Note: Existing data will be backfilled separately via script

-- Migration: Sync cards.card_type with uuid_bindings.type
-- Date: 2026-01-19
-- Purpose: Ensure cards.card_type matches uuid_bindings.type after type migration
-- Status: SKIPPED - card_type column doesn't exist in staging (will be removed in 0007)

-- This migration is only needed if cards table has card_type column
-- Since staging was deployed without this column, we skip this migration
SELECT 1; -- No-op migration

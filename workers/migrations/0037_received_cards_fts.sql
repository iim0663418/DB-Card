-- Create FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS received_cards_fts USING fts5(
  uuid UNINDEXED,
  full_name,
  organization,
  title,
  department,
  note,
  content='received_cards',
  content_rowid='rowid'
);

-- Trigger: Auto-sync on INSERT
CREATE TRIGGER IF NOT EXISTS received_cards_fts_insert
AFTER INSERT ON received_cards
BEGIN
  INSERT INTO received_cards_fts(rowid, uuid, full_name, organization, title, department, note)
  VALUES (new.rowid, new.uuid, new.full_name, new.organization, new.title, new.department, new.note);
END;

-- Trigger: Auto-sync on UPDATE
CREATE TRIGGER IF NOT EXISTS received_cards_fts_update
AFTER UPDATE ON received_cards
BEGIN
  UPDATE received_cards_fts
  SET full_name = new.full_name,
      organization = new.organization,
      title = new.title,
      department = new.department,
      note = new.note
  WHERE rowid = new.rowid;
END;

-- Trigger: Auto-sync on DELETE
CREATE TRIGGER IF NOT EXISTS received_cards_fts_delete
AFTER DELETE ON received_cards
BEGIN
  DELETE FROM received_cards_fts WHERE rowid = old.rowid;
END;

-- Initial data sync (backfill existing records)
INSERT INTO received_cards_fts(rowid, uuid, full_name, organization, title, department, note)
SELECT rowid, uuid, full_name, organization, title, department, note
FROM received_cards
WHERE deleted_at IS NULL AND merged_to IS NULL;

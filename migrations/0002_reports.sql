-- Discord Reports are structured, private records. Discord message ids make
-- ingestion idempotent: re-running a cron upserts edits rather than duplicating
-- a filing. Author names are deliberately nullable; no Discord handle is stored
-- or served by this schema.

CREATE TABLE IF NOT EXISTS reports (
  id                TEXT PRIMARY KEY,
  category          TEXT NOT NULL,
  subcategory       TEXT,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  timestamp         TEXT NOT NULL,
  source_message_id TEXT NOT NULL UNIQUE,
  source_channel_id TEXT NOT NULL,
  author_name       TEXT,
  edited_at         TEXT
);

CREATE INDEX IF NOT EXISTS reports_category_timestamp
  ON reports(category, subcategory, timestamp DESC);

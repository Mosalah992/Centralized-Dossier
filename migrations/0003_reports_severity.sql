-- Severity is a review priority, separate from a report's operational category.
-- Existing records were never classified, so migration assigns the explicit
-- safe fallback rather than guessing a lower severity.

ALTER TABLE reports ADD COLUMN severity TEXT NOT NULL DEFAULT 'unassessed'
  CHECK (severity IN ('informational', 'low', 'medium', 'high', 'critical', 'unassessed'));

CREATE INDEX IF NOT EXISTS reports_severity_timestamp
  ON reports(severity, timestamp DESC);

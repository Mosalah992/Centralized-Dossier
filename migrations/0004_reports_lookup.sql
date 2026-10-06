-- Subcategory is now a reader filter (the desk a filing came from), and the
-- summary groups by it. Additive only: no table or column changes.

CREATE INDEX IF NOT EXISTS reports_subcategory_timestamp
  ON reports(subcategory, timestamp DESC);

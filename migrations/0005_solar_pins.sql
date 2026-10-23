-- The Solar's war table: the pieces High Command sets on the realm map
-- (functions/lib/solar-pins.ts, shared/solar.ts). Kept in this database so the
-- Solar needs no new infrastructure; nothing here touches the reports.
--
-- x and y are fractions of the merged map (0 at its left and top edges).

CREATE TABLE IF NOT EXISTS solar_pins (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('pawn', 'interest')),
  x REAL NOT NULL CHECK (x >= 0 AND x <= 1),
  y REAL NOT NULL CHECK (y >= 0 AND y <= 1),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 60),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 280),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

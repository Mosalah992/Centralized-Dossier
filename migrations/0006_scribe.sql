-- The Scribe: personal codes, filings and the bot's drafts (Workstream 3).
-- Kept in thalmor-reports beside the Cabinet's reports, which a filed report is
-- also entered into, so the Scribe needs no new database.
--
--   wrangler d1 execute thalmor-reports --local  --file=./migrations/0006_scribe.sql
--   wrangler d1 execute thalmor-reports --remote --file=./migrations/0006_scribe.sql

-- A member's code for the Scribe Table, issued by /archives code. Only its
-- HMAC under CODE_PEPPER is kept, so a leaked table cannot be guessed back
-- without the pepper. The Discord id is here only so the member's roles can be
-- asked again each time the code is used; no route ever serves it.
CREATE TABLE IF NOT EXISTS codes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  hash            TEXT NOT NULL UNIQUE,
  discord_user_id TEXT NOT NULL,
  -- The in-world name the code fills in for its holder (the roster's, else
  -- their server nickname). Still editable on every filing.
  name            TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  revoked_at      TEXT
);

CREATE INDEX IF NOT EXISTS codes_live_holder ON codes(discord_user_id) WHERE revoked_at IS NULL;

-- Every filing, from either door. The id is the parchment's entry number. The
-- parchment itself is never stored: the reader's browser draws it from these
-- fields (web/src/scribe/), with the Clerk's stamp once there is one.
CREATE TABLE IF NOT EXISTS filings (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  -- report, bulletin, application or public-request (shared/filing.ts).
  category           TEXT NOT NULL,
  -- A report's wing (diplomatic is the Embassy's) and its kind of report;
  -- null for anything else.
  wing               TEXT CHECK (wing IN ('diplomatic', 'intelligence', 'military', 'logistics', 'auxiliary')),
  kind               TEXT CHECK (kind IN ('activity', 'incident', 'investigation', 'operation', 'intelligence', 'inspection', 'personnel', 'administrative')),
  importance         TEXT NOT NULL CHECK (importance IN ('routine', 'nominal', 'notable', 'strategic', 'cataclysm')),
  section            TEXT,
  rank               TEXT NOT NULL,
  name               TEXT NOT NULL,
  superior           TEXT,
  title              TEXT NOT NULL,
  -- shared/filing.ts IncidentTime, as JSON: the in-world hour it happened.
  incident           TEXT NOT NULL,
  body               TEXT NOT NULL,
  door               TEXT NOT NULL CHECK (door IN ('discord', 'web')),
  -- Who filed it, for High Command's accountability on Discord (the bot names
  -- the filer in its post). Null for an open filing from the website. Never
  -- served by any route.
  filer_discord_id   TEXT,
  stamp              TEXT CHECK (stamp IN ('approved', 'denied')),
  -- IncidentTime JSON of the stamp's in-world hour, and the real instant.
  stamp_incident     TEXT,
  stamped_at         TEXT,
  filed_at           TEXT NOT NULL,
  -- Where the bot posted it, once it has.
  discord_channel_id TEXT,
  discord_message_id TEXT,
  -- The Cabinet row it was entered as, for reports.
  report_id          TEXT
);

CREATE INDEX IF NOT EXISTS filings_board ON filings(category, section, filed_at DESC);
CREATE INDEX IF NOT EXISTS filings_unstamped ON filings(stamp, filed_at DESC);

-- The /report wizard's work between steps, one row per member. An hour's life:
-- anything older is ignored and swept on the next write.
CREATE TABLE IF NOT EXISTS filing_drafts (
  id              TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  data            TEXT NOT NULL,
  expires_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS filing_drafts_expiry ON filing_drafts(expires_at);

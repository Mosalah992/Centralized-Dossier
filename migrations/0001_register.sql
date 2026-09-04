-- The Register of Consultation.
--
-- One row per province, one integer each. There is no row per visitor, no
-- address, no user agent and no timestamp — there is deliberately nothing here
-- that could answer "did this person come back". See functions/lib/register.ts.
--
-- Applied to both databases; they are separate stores:
--   wrangler d1 execute thalmor-register --local  --file=./migrations/0001_register.sql
--   wrangler d1 execute thalmor-register --remote --file=./migrations/0001_register.sql

CREATE TABLE IF NOT EXISTS tally (
  -- ISO-3166-1 alpha-2, uppercase. 'XX' is everything the edge could not place:
  -- Cloudflare's own non-country markers (T1, Tor) and anything unresolved.
  country TEXT PRIMARY KEY,
  visits  INTEGER NOT NULL DEFAULT 0
);

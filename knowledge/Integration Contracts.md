# Integration Contracts

## Google Sheets

The spreadsheet is authoritative and is queried read-only. Use title-based tab resolution because gids and the year-bearing Calendar tab title change. `docs/sheet-schema.md` is the detailed parser contract; update it after a verified source-sheet restructure.

## Chronicle and filings

`POST /api/chronicle/gate` verifies the volume word and issues a scoped writ. `GET /api/chronicle` validates it, serves authored months, and may append redacted filings from `CHRONICLE_FILINGS`.

The `chronicler` Worker runs nightly at 04:00 UTC. It reads Discord Informants channels, redacts identifiers using `shared/filings.ts`, stores at most 60 filings, and protects itself from Worker subrequest limits with a 40-channel fetch budget.

## Reports gate and reader routes

`POST /api/reports/gate` validates `REPORTS_PASSPHRASE` in constant time using `REPORTS_COOKIE_SECRET`, then issues an HttpOnly Reports-only writ. `GET /api/reports`, `GET /api/reports/:id` and `GET /api/reports/summary` verify that writ on every call through one helper (`refuseWithoutReportsWrit` in `functions/lib/reports.ts`) and answer only through `reportsJson`, so every status — including 401, 404 and empty results — carries the sealed headers.

`REPORTS_EPOCH` revokes Reports sessions without touching Chronicle sessions. Failed attempts use the existing `GATE_ATTEMPTS` binding under the `reports:` key prefix, so the two doors cannot exhaust each other’s throttle. Both routes answer `private, no-store` and `Vary: Cookie`; absent Reports secrets fail closed.

## Reports ingestion and storage

`reporter/` is the dedicated scheduled Worker. Its category IDs live in `reporter/src/config.ts`; the collector resolves each one as a category, text channel, or forum rather than assuming its Discord type. `shared/reports.ts` drops bots, system messages, embeds, attachment-only content, URLs (including bare domains), and reports shorter than 300 characters before any D1 write.

`REPORTS` binds the dedicated `thalmor-reports` D1 database in both Pages and the collector. `migrations/0002_reports.sql` is applied locally and remotely. The `reports` table uses the Discord message id for idempotent upserts and contains no Discord handle. `author_name` holds the filer's in-world roster name or NULL; see "Reports attribution" below.

Category collection policy remains explicit in `reporter/src/config.ts`. Military and Informants treat every readable text or forum child as a report source because their child channels use in-world names; the channel name becomes the report subcategory. Other category roots retain the narrower `*-report` / `*-reports` child-name rule. Category IDs are therefore sufficient configuration, provided the bot has View Channel and Read Message History on each inherited or explicitly permitted child.

`migrations/0003_reports_severity.sql` adds the constrained `severity` field and its timestamp index. The collector accepts a standalone `Severity: <level>` field anywhere in the official Military or Informants template, including Discord-bold labels and a valid value on the following line. It removes the field before storage and uses `unassessed` for a blank, missing, or invalid value; it never infers severity from narrative prose. `/api/reports` may filter by a valid severity alongside category before its cursor pagination; it retains the sealed response headers.

## Consultation register

`POST /api/register/entry` may increment a country aggregate in D1 after the constrained per-day cookie check. `GET /api/register` returns only aggregate totals. Preserve atomic SQL increments and the narrowly scoped cookie path.

## Secrets

Secrets are Cloudflare secrets or gitignored local environment files. They are never documentation examples, fixtures, issue text, or agent memory. Required values include the Sheets service-account JSON, Chronicle gate secret, and Discord bot token for the Chronicler.

## Public host

`https://thalmor-archives.com` is canonical. `functions/_middleware.ts` redirects the production Pages hostname with a 308 response, including its path and query. Keep the redirect narrow: Pages preview hostnames are the release gate for feature branches.

## Reports search, summary and deep links

`/api/reports` also accepts `q` (1–80 characters, case-insensitive `LIKE` over title and body with `%`, `_` and `\` escaped), `subcategory`, and inclusive `from`/`to` dates; malformed values are ignored, never widened. `/api/reports/:id` returns one filing (ids are numeric Discord message ids; anything else is a 404 before reaching D1). `/api/reports/summary` returns counts only — by category × severity for all time and the last 7 days, and per desk (category, subcategory) for the last 30 days with how many were unassessed. It is computed per request with no shared cache. `migrations/0004_reports_lookup.sql` adds the `(subcategory, timestamp)` index. The reader holds its filters in the page URL and opens `/reports/:id` behind the same gate.

## Reports attribution

The collector reads the archive's public `/api/volumes/roster` once per run (overridable with `ROSTER_URL`), maps each member's column E handles to their column C name in memory, and stores only the resolved name in `author_name`. A handle claimed by two members resolves to NULL; unmatched filers are NULL. If the roster cannot be read, the upsert keeps existing names (`COALESCE`); when it is read, the roster's answer replaces them, so a removed member stops signing filings. No handle, username, display name or Discord user id is written to D1 or logged — the run log carries counts only. Attribution reaches only filings still inside the collector's per-channel read window (the last 100 messages).

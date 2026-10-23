# Integration Contracts

## Google Sheets

The spreadsheet is authoritative and is queried read-only. Use title-based tab resolution because gids and the year-bearing Calendar tab title change. `docs/sheet-schema.md` is the detailed parser contract; update it after a verified source-sheet restructure.

## Chronicle and filings

`POST /api/chronicle/gate` verifies the volume word and issues a scoped writ. `GET /api/chronicle` validates it, serves authored months, and may append redacted filings from `CHRONICLE_FILINGS`.

The `chronicler` Worker runs nightly at 04:00 UTC. It reads Discord Informants channels, redacts identifiers using `shared/filings.ts`, stores at most 60 filings, and protects itself from Worker subrequest limits with a 40-channel fetch budget.

## Reports gate and reader routes

`POST /api/reports/gate` validates `REPORTS_PASSPHRASE` in constant time using `REPORTS_COOKIE_SECRET`, then issues an HttpOnly Reports-only writ. `GET /api/reports`, `GET /api/reports/:id` and `GET /api/reports/summary` verify that writ on every call through one helper (`refuseWithoutReportsWrit` in `functions/lib/reports.ts`) and answer only through `reportsJson`, so every status — including 401, 404 and empty results — carries the sealed headers.

`REPORTS_EPOCH` revokes Reports sessions without touching Solar sessions. Failed attempts use the existing `GATE_ATTEMPTS` binding under the `reports:` key prefix, so the doors cannot exhaust each other’s throttle. Both routes answer `private, no-store` and `Vary: Cookie`; absent Reports secrets fail closed.

## Solar gate and the war table

`POST /api/solar/gate` validates `SOLAR_PASSPHRASE` in constant time using `SOLAR_COOKIE_SECRET` and issues an HttpOnly Solar-only writ (`thalmor_writ_solar`, scope `solar`); `GET` reports whether the reader holds it and `DELETE` clears it. `SOLAR_EPOCH` revokes Solar writs alone; failures are throttled in `GATE_ATTEMPTS` under `solar:`. Without its secrets every Solar route answers 503.

`GET /api/solar/pins` lists the war table's pieces; `POST` sets one down; `PATCH /api/solar/pins/:id` moves or renames one (a partial body keeps the rest); `DELETE` takes it up. Every call needs the Solar writ and answers `private, no-store`, `Vary: Cookie`. Writes must be same-site (`Sec-Fetch-Site`, else `Origin`) and JSON. A piece is `{ kind: 'pawn' | 'interest', x, y, label, note }`: `x` and `y` are fractions (0–1) of the merged realm map, so the table's map and the enlarged one agree; label 1–60 characters, note at most 280, at most 300 pieces. They are kept in `solar_pins` (`migrations/0005_solar_pins.sql`) in the `thalmor-reports` D1 database, through the `REPORTS` binding; nothing about them touches the reports. The shape and its checks are shared by browser and server (`shared/solar.ts`).

## Reports ingestion and storage

`reporter/` is the dedicated scheduled Worker. Its category IDs live in `reporter/src/config.ts`; the collector resolves each one as a category, text channel, or forum rather than assuming its Discord type. `shared/reports.ts` drops bots, system messages, embeds, attachment-only content, URLs (including bare domains), and reports shorter than 300 characters before any D1 write.

`REPORTS` binds the dedicated `thalmor-reports` D1 database in both Pages and the collector. `migrations/0002_reports.sql` is applied locally and remotely. The `reports` table uses the Discord message id for idempotent upserts and contains no Discord handle. `author_name` holds the filer's in-world roster name or NULL; see "Reports attribution" below.

Category collection policy remains explicit in `reporter/src/config.ts`. Military and Informants treat every readable text or forum child as a report source because their child channels use in-world names; the channel name becomes the report subcategory. Other category roots retain the narrower `*-report` / `*-reports` child-name rule. Category IDs are therefore sufficient configuration, provided the bot has View Channel and Read Message History on each inherited or explicitly permitted child.

`migrations/0003_reports_severity.sql` adds the constrained `severity` field and its timestamp index. The collector accepts a standalone `Severity: <level>` field anywhere in the official Military or Informants template, including Discord-bold labels and a valid value on the following line. It removes the field before storage and uses `unassessed` for a blank, missing, or invalid value; it never infers severity from narrative prose. `/api/reports` may filter by a valid severity alongside category before its cursor pagination; it retains the sealed response headers.

## Embassy room

The room adds no endpoint in Phase 1. Its Cabinet calls the existing `GET`/`POST /api/reports/gate` through `reportsIsOpen` / `openReports` in `web/src/api.ts`, then opens its takeover at `/reports`. The Cabinet reads the register exactly as the retired Reports page did: `GET /api/reports` with `from`/`to` (a day wider than each drawer: Fresh! under a day, New to a week, Old to thirty days, Archive older; `web/src/room/cabinet-drawers.ts`) and `cursor`, thirty at a time, and `GET /api/reports/:id` for a letter opened by address; the summary, search and filters are no longer read by the site but remain served. A report's wing (`shared/wings.ts`) is read from its category on the client; nothing about it is stored. The board's sections are `propaganda`, `recruitment`, `festivities`, `standing-orders`, `spiritual-guidance` and `bounties` (`shared/room.ts`); the Librarian backend must post to these slugs. The board, the Scribe Table (`/scribe-table`, formerly the Lectern at `/lectern`, which still opens it; `RoomStatus.scribeTable`) and the shelf ask `/api/room/board`, `/api/room/board/:section`, `/api/room/status` and `/api/room/books/:slug` (contract: `shared/room.ts`, `shared/books.ts`); until the Librarian backend (`openspec/changes/add-librarian-backend`) exists, every unknown `/api/*` path answers `404 {"error":"not-found"}` with `Cache-Control: no-store` from the root middleware (`guardApiFallback` in `functions/lib/assets.ts`), which the room reads as "not yet consecrated".

## Consultation register (retired)

Retired 2026-10-20: `/api/register` and `/api/register/entry` no longer exist and the `REGISTER` D1 binding is gone from `wrangler.toml`. The `thalmor-register` database and `migrations/0001_register.sql` were left in place, untouched; the code is in git history.

## Secrets

Secrets are Cloudflare secrets or gitignored local environment files. They are never documentation examples, fixtures, issue text, or agent memory. Required values include the Sheets service-account JSON, Chronicle gate secret, and Discord bot token for the Chronicler.

## Public host

`https://thalmor-archives.com` is canonical. `functions/_middleware.ts` redirects the production Pages hostname with a 308 response, including its path and query. Keep the redirect narrow: Pages preview hostnames are the release gate for feature branches.

## Reports search, summary and deep links

`/api/reports` also accepts `q` (1–80 characters, case-insensitive `LIKE` over title and body with `%`, `_` and `\` escaped), `subcategory`, and inclusive `from`/`to` dates; malformed values are ignored, never widened. `/api/reports/:id` returns one filing (ids are numeric Discord message ids; anything else is a 404 before reaching D1). `/api/reports/summary` returns counts only — by category × severity for all time and the last 7 days, and per desk (category, subcategory) for the last 30 days with how many were unassessed. It is computed per request with no shared cache. `migrations/0004_reports_lookup.sql` adds the `(subcategory, timestamp)` index. The reader holds its filters in the page URL and opens `/reports/:id` behind the same gate.

## Reports attribution

The collector reads the archive's public `/api/volumes/roster` once per run (overridable with `ROSTER_URL`), maps each member's column E handles to their column C name in memory, and stores only the resolved name in `author_name`. A handle claimed by two members resolves to NULL; unmatched filers are NULL. If the roster cannot be read, the upsert keeps existing names (`COALESCE`); when it is read, the roster's answer replaces them, so a removed member stops signing filings. No handle, username, display name or Discord user id is written to D1 or logged — the run log carries counts only. Attribution reaches only filings still inside the collector's per-channel read window (the last 100 messages).

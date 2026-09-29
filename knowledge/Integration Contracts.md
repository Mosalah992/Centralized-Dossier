# Integration Contracts

## Google Sheets

The spreadsheet is authoritative and is queried read-only. Use title-based tab resolution because gids and the year-bearing Calendar tab title change. `docs/sheet-schema.md` is the detailed parser contract; update it after a verified source-sheet restructure.

## Chronicle and filings

`POST /api/chronicle/gate` verifies the volume word and issues a scoped writ. `GET /api/chronicle` validates it, serves authored months, and may append redacted filings from `CHRONICLE_FILINGS`.

The `chronicler` Worker runs nightly at 04:00 UTC. It reads Discord Informants channels, redacts identifiers using `shared/filings.ts`, stores at most 60 filings, and protects itself from Worker subrequest limits with a 40-channel fetch budget.

## Reports gate (gate-only phase)

`POST /api/reports/gate` validates `REPORTS_PASSPHRASE` in constant time using `REPORTS_COOKIE_SECRET`, then issues an HttpOnly Reports-only writ. `GET /api/reports` verifies that writ on every call and currently returns only an authenticated empty placeholder; its data, D1 schema, collector, and UI are separate follow-on slices.

`REPORTS_EPOCH` revokes Reports sessions without touching Chronicle sessions. Failed attempts use the existing `GATE_ATTEMPTS` binding under the `reports:` key prefix, so the two doors cannot exhaust each other’s throttle. Both routes answer `private, no-store` and `Vary: Cookie`; absent Reports secrets fail closed.

## Reports ingestion and storage

`reporter/` is the dedicated scheduled Worker. Its category IDs live in `reporter/src/config.ts`; the collector resolves each one as a category, text channel, or forum rather than assuming its Discord type. `shared/reports.ts` drops bots, system messages, embeds, attachment-only content, URLs (including bare domains), and reports shorter than 300 characters before any D1 write.

`REPORTS` binds the dedicated `thalmor-reports` D1 database in both Pages and the collector. `migrations/0002_reports.sql` is applied locally and remotely. The `reports` table uses the Discord message id for idempotent upserts and contains no Discord handle; `author_name` is nullable until an in-world-name source is defined.

## Consultation register

`POST /api/register/entry` may increment a country aggregate in D1 after the constrained per-day cookie check. `GET /api/register` returns only aggregate totals. Preserve atomic SQL increments and the narrowly scoped cookie path.

## Secrets

Secrets are Cloudflare secrets or gitignored local environment files. They are never documentation examples, fixtures, issue text, or agent memory. Required values include the Sheets service-account JSON, Chronicle gate secret, and Discord bot token for the Chronicler.

## Public host

`https://thalmor-archives.com` is canonical. `functions/_middleware.ts` redirects the production Pages hostname with a 308 response, including its path and query. Keep the redirect narrow: Pages preview hostnames are the release gate for feature branches.

# Integration Contracts

## Google Sheets

The spreadsheet is authoritative and is queried read-only. Use title-based tab resolution because gids and the year-bearing Calendar tab title change. `docs/sheet-schema.md` is the detailed parser contract; update it after a verified source-sheet restructure.

## Chronicle and filings

`POST /api/chronicle/gate` verifies the volume word and issues a scoped writ. `GET /api/chronicle` validates it, serves authored months, and may append redacted filings from `CHRONICLE_FILINGS`.

The `chronicler` Worker runs nightly at 04:00 UTC. It reads Discord Informants channels, redacts identifiers using `shared/filings.ts`, stores at most 60 filings, and protects itself from Worker subrequest limits with a 40-channel fetch budget.

## Consultation register

`POST /api/register/entry` may increment a country aggregate in D1 after the constrained per-day cookie check. `GET /api/register` returns only aggregate totals. Preserve atomic SQL increments and the narrowly scoped cookie path.

## Secrets

Secrets are Cloudflare secrets or gitignored local environment files. They are never documentation examples, fixtures, issue text, or agent memory. Required values include the Sheets service-account JSON, Chronicle gate secret, and Discord bot token for the Chronicler.

## Public host

`https://thalmor-archives.com` is canonical. `functions/_middleware.ts` redirects the production Pages hostname with a 308 response, including its path and query. Keep the redirect narrow: Pages preview hostnames are the release gate for feature branches.

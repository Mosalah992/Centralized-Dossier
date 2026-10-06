# Reports as a bound dossier

## Outcome

`/reports` stops reading as a filtered list and becomes a sealed dossier in the
same hand as the Chronicles book and the home hero: filings are parchment pages
in a ledger, grouped by month, laid out as the template records they are, each
stamped with its classification and signed with the filer's in-world name.
High Command can find a filing (search, subcategory, date range), link to it,
see at a glance what is pressing, and see which desks are filing without a
classification.

## Why now

- 59 filings since 2026-07-19 and growing every six hours; a flat list of
  thirty-at-a-time folds no longer scales, and there is no way to find one.
- 33 of 59 (56%) are unassessed — every Administration and Military filing —
  because the `Severity:` field is missing from the filing, not because the
  parser fails. Nobody can see that today.
- No filing carries an author. The schema always allowed an in-world name;
  nothing filled it.
- The reader's look predates the hero and the Ancarion gate in front of it.

## Phases

1. **Dossier reader** — reader-only restyle and reading improvements; no
   contract change.
2. **Finding and linking** — additive query parameters and two new routes on
   the existing gated Reports API, plus a deep-linkable `/reports/:id`.
3. **Attribution** — the reporter Worker resolves each filer to an in-world
   roster name at ingestion and stores only that name.

Each phase ships and is verified on production before the next begins.

## Scope and boundaries

- **Gate:** touched only in that new routes sit behind it. The Reports writ,
  passphrase, cookie, epoch and throttle are unchanged; the Chronicle gate is
  untouched. Every new response is `private, no-store` with `Vary: Cookie`.
- **Sheets scope:** not touched. Phase 3 reads the roster through the archive's
  own public `/api/volumes/roster` endpoint; the reporter gains no Google
  credentials and there is no write path.
- **Member data:** yes. Phase 3 renders a member's in-world character name
  beside filings, behind the Reports gate only. No Discord handle, username or
  ID is stored in D1, served, or bundled.
- **D1:** phase 2 adds indexes only; phase 3 writes the existing nullable
  `author_name` column. The reporter remains the only writer.
- **Discord:** read-only, as now. The "filing without classification" nudge is
  a list on the reader, never a message posted to Discord.

## Invariants at risk and how the design holds them

- *Gated responses stay private/no-store + Vary: Cookie.* New routes reuse the
  existing `json()` helper and writ check in `functions/api/reports/`; tests
  assert the headers on every new route, including 401/404/empty paths.
- *No report text in the browser bundle.* The dossier styling and the field
  parser ship; filings arrive only from the gated API.
- *Collector never posts to Discord / no handles stored.* Handle matching
  happens in Worker memory; only the resolved name reaches D1. A unit test
  asserts the upsert never receives a handle.
- *Search must not become an injection or cost surface.* Parameterised `LIKE`
  with escaped wildcards, bounded query length, the existing 30-row page.

## Assumptions

- In-world name = roster column C, matched case-insensitively on the filer's
  Discord `username` or `global_name` against any of the `/`-separated handles
  in column E. Unmatched or ambiguous (two members share a handle) stays blank.
- Backfill reaches only filings still within the collector's per-channel read
  window (last 100 messages); older filings stay unattributed.
- Display-name changes on Discord break a match until the roster is updated;
  that is acceptable and visible ("unattributed").

## Verification

Unit tests for the field parser, query validation, search escaping, summary
and lagging-desk aggregation, roster matching (including ambiguity) and
header assertions; `npm run typecheck`, `npm test`, `npm run build`; each phase
verified on a `*.pages.dev` preview with a real Reports writ, then on
production after deploy (assets checked on the deployment URL first, per the
2026-10-06 cache incident).

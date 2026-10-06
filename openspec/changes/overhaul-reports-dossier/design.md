# Design

## Phase 1 — Dossier reader

- **Structure.** `ReportsView` keeps its gate handling and data hook and is
  split into `ReportsDossier` (index), `ReportPage` (one filing) and
  `ReportStamp`. The `LiquidNav` pill rows become a quiet filter bar set in
  the display face above the ledger, matching the hall's motto/rule styling.
- **Material.** Reuse the Chronicles book's parchment and board variables
  (`chronicle.css`) rather than inventing a second paper: pages sit on a dark
  board with gilt rules; the classification standard becomes a bound plate.
- **Grouping.** Month headings are derived client-side from the already-sorted
  page of results; a month split across pages repeats its heading.
- **Record layout.** `parseReportRecord(body)` in `shared/reports.ts` splits a
  body into ordered blocks: `{field, value}` for lines matching
  `^([A-Z][\w /&'-]{1,32}):\s*(.+)$` and `{prose}` otherwise. It never drops or
  reorders text; it is pure and unit-tested. Rendered as a `<dl>` for fields and
  paragraphs (`white-space: pre-line`) for prose.
- **Stamps.** One CSS stamp per severity (seal shape + engraved label), colour
  plus text, so it reads without colour.
- **Opening a filing.** In phase 1 the page opens in place (replacing the
  index, with a "Return to the dossier" link and preserved scroll position);
  phase 2 gives it an address.
- **Motion.** Page turn reuses the Chronicles' GSAP motif via `motion.ts`;
  reduced motion gets a cut.

## Phase 2 — Finding and linking

- **Routes.** `functions/api/reports/index.ts` gains `q`, `subcategory`,
  `from`, `to` in `parseReportsQuery`; new `functions/api/reports/[id].ts`
  and `functions/api/reports/summary.ts`. Pages routes `summary.ts` before
  `[id].ts`, and `summary` is not a valid report id, so there is no collision.
  All three share one `json()` helper and writ check, moved to
  `functions/lib/reports.ts`.
- **Search.** `(title LIKE ? ESCAPE '\' OR body LIKE ? ESCAPE '\')` with the
  term lower-cased and wildcards escaped; D1 `LIKE` is case-insensitive for
  ASCII. At ~60 rows (and low thousands within a year) a scan is fine; FTS5 is
  deferred until it is not.
- **Indexes.** Migration `0004_reports_lookup.sql` adds
  `(subcategory, timestamp DESC)`; existing indexes cover the rest.
- **Summary.** One `GROUP BY category, severity` query for all time, one for
  `timestamp >= now − 7d`, and one `GROUP BY category, subcategory` over 30 days
  with `SUM(severity = 'unassessed')`. Returned together; computed per request
  (cheap at this size) — no shared cache, so nothing gated is ever held at the
  edge.
- **Client routing.** `router.ts` adds `{ name: 'reports', id?: string }` for
  `/reports/:id`; filter state is read from and written to `location.search`
  with `history.replaceState` so filtering does not flood history. The gate is
  shown first for any `/reports*` path; after admission the requested filing
  opens.

## Phase 3 — Attribution

- **Roster fetch.** Once per run, `GET https://thalmor-archives.com/api/volumes/roster`
  (the public, already-cached endpoint) → `Map<lowercased handle, name | AMBIGUOUS>`.
  Handles are split on `/`, trimmed, lower-cased, a leading `@` dropped.
- **Resolve.** For each included message: try `author.username`, then
  `author.global_name`; take the first unique hit. Store the name only.
- **Upsert.** `author_name = COALESCE(excluded.author_name, reports.author_name)`
  when the roster fetch failed for the run (pass a flag), so a roster outage
  never erases attribution; when the roster loaded, `excluded.author_name` wins,
  so a member removed from the roster becomes unattributed on the next run.
- **Pure core.** `resolveFiler(author, rosterIndex)` lives in `shared/reports.ts`
  and is unit-tested, including ambiguity and the "never returns a handle"
  property.
- **Budget.** One extra subrequest per run; well inside Worker limits.

## Alternatives considered

- *Resolve at read time in Pages.* Rejected: would require storing a handle or
  ID in D1, which the schema promises never to do.
- *A hand-maintained Discord→name mapping.* Rejected: the roster already holds
  the handles, and a second list would drift.
- *Posting nudges to Discord.* Rejected: the collectors are read-only toward
  Discord by design.
- *FTS5 for search.* Deferred; unnecessary at current volume.

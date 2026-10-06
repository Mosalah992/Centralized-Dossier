# Tasks

## Phase 1 — Dossier reader

- [x] Add `parseReportRecord` to `shared/reports.ts` with unit tests (fields, prose, mixed, nothing dropped or reordered).
- [x] Split `ReportsView` into dossier index, filing page and stamp; keep the PortraitGate flow unchanged.
- [x] Restyle `reports.css` on the Chronicles parchment/board material; month headings; bound classification plate; severity stamps legible without colour.
- [x] Add the "Awaiting assessment" view.
- [x] Page-turn motion through `motion.ts`; reduced motion gets a cut.
- [x] `npm run typecheck`, `npm test`, `npm run build`.
- [ ] Verify on a `*.pages.dev` preview with a real Reports writ (desktop, phone, reduced motion); deploy; verify on production (deployment URL first, then domain).

## Phase 2 — Finding and linking

- [x] Extend `parseReportsQuery` with `q`, `subcategory`, `from`, `to` (validation + wildcard escaping) and tests.
- [x] Move `json()` and the writ check into `functions/lib/reports.ts`; add `[id].ts` and `summary.ts`.
- [x] Migration `0004_reports_lookup.sql`; apply to D1 (`--remote`) after review.
- [x] Header tests: every new route and status (200/401/404/empty) carries `private, no-store` and `Vary: Cookie`; 401 carries no data.
- [x] Router: `/reports/:id`; URL-held filter state with `replaceState`.
- [x] Reader: search box, subcategory and date controls, summary line, desks-without-classification list, deep links.
- [ ] Typecheck, tests, build; preview with a real writ; deploy; verify production, including an unauthenticated request to each new route returning 401.

## Phase 3 — Attribution

- [x] Add `resolveFiler` and roster-index builder to `shared/reports.ts` with tests (match, case, `/`-split, `@`, ambiguity, never returns a handle).
- [x] Reporter: fetch roster once per run; resolve; pass a roster-loaded flag; `COALESCE` upsert when the roster failed.
- [x] Assert in tests that no Discord identifier reaches the upsert bindings.
- [x] Reader: "Filed by <name>" on attributed filings only.
- [x] Deploy the reporter; trigger one run; verify on production that attributed filings show names and D1 holds no handles (`SELECT` spot-check of `author_name` values against roster names).

## Records

- [x] Update `CODEX.md`, `knowledge/Architecture.md`, `knowledge/Integration Contracts.md` and the Decision Log (attribution rule, search approach, new routes).

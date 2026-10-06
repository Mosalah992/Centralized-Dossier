# Centralized Dossier — Architecture Memory

## Purpose

The Thalmor Embassy Archives presents community records as ceremonial volumes rather than as a spreadsheet. The project is public-by-link and read-only by design; its only protected content is the Thalmor Chronicles. This file is the high-signal map for agents. Detailed, connected notes live in [knowledge/](knowledge/README.md).

## System map

```mermaid
flowchart TB
  Reader --> Canonical[https://thalmor-archives.com]
  Legacy[thalmor-archives.pages.dev] -->|308 preserves path + query| Canonical
  Canonical --> App[React archive: web/src/App.tsx]
  App --> Router[router.ts]
  App --> Views[Lazy volume views + shelf]
  App --> Client[web/src/api.ts]

  Client --> Pages[Cloudflare Pages Functions]
  Pages --> SheetRoutes[/api/volumes/*]
  SheetRoutes --> Sheets[Google Sheet: authoritative]
  Pages --> Register[/api/register/*]
  Register --> D1[(Register D1)]
  Pages --> Chronicle[/api/chronicle + gate]
  Chronicle --> Writs[Scoped signed cookie]
  Chronicle --> FilingsKV[(CHRONICLE_FILINGS KV)]
  Pages --> Reports[/api/reports + gate]
  Reports --> ReportsWrit[Reports-only signed cookie]
  Reports --> ReportsD1[(Reports D1)]

  Worker[thalmor-chronicler Worker\nnightly scheduled()] -->|read + redact| Discord[Discord Informants]
  Worker -->|write filings| FilingsKV
  Reporter[thalmor-reporter Worker\nevery 6 hours] -->|read + filter| Discord
  Reporter -->|upsert reports| ReportsD1

  Shared[shared/: types, registry, parsers, calendar] --> Client
  Shared --> Pages
  Shared --> Worker
```

This is the implementation-grounded counterpart to the supplied dossier diagram. The diagram’s three main regions map to this repository as follows:

| Diagram region | Repository implementation |
|---|---|
| Archive experience | `web/src/`: App, router, shelf, views, components, CSS, and API client |
| Data services / registers | `functions/api/volumes/`, `server/gsheets.ts`, `shared/volumes.ts`, `shared/parsers/` |
| Chronicle collection | `functions/api/chronicle/`, `functions/lib/session.ts`, `chronicler/`, and shared `CHRONICLE_FILINGS` KV |

## Ownership and data flow

- `shared/` is pure cross-runtime domain logic: volume registry, parsers, types, calendar/reckoning, and filing redaction.
- `web/` is the browser-only presentation layer. `App.tsx` lazy-loads views and hosts the registry-driven `ArchiveSidebar`; `router.ts` owns URLs; `api.ts` owns request hooks and client contracts. The interactive `ArchiveSeal` belongs only to the Reports gate.
- `functions/` is the same-origin Pages API. It fetches Google Sheets read-only, serves public records, owns the sealed Chronicle and Reports gates, and reads optional filings.
- `server/` contains server-only Sheets access. It must never gain a write helper.
- `chronicler/` is a separate Worker because scheduled events cannot run in Pages Functions. It reads Discord nightly and writes redacted, bounded filings to KV.
- `reporter/` is the separate Reports collector. It reads configured Discord categories/channels/forums, applies `shared/reports.ts` privacy filters and explicit severity metadata, and is the only D1 writer.
- `scripts/` creates committed derived assets. `Assets/` is source art; never replace reproducible preparation with one-off exports.

## Volume model

`shared/volumes.ts` is the shelf contract.

- `VOLUMES`: sheet-backed books, resolved by **tab title**, never gid. A missing tab becomes a withdrawn volume rather than a broken archive.
- `KEPT`: repository-authored, browser-bundled content (currently History).
- `SEALED`: server-served content. Enforcement is deliberately not bundled; Chronicle is additionally protected by its own passphrase and scoped writ.

All new volumes must be explicitly classified before implementation. Do not add a repository-owned volume to `VOLUMES`, or a sensitive volume to a browser bundle.

## Stable contracts and invariants

1. The Google Sheet is the data authority; preserve its values and documented contradictions instead of recalculating them.
2. Pages and server code only read the sheet. The external HR bot alone writes its owned roster columns.
3. The Chronicle’s protection is route-local: its response is private/no-store and varies by cookie; missing gate secret fails closed.
4. Optional infrastructure must degrade gracefully: missing filings KV or collector token omits filings, while missing D1 hides the consultation register.
5. Shared KV IDs in root and `chronicler/wrangler.toml` must match.
6. No broad CSS/design-system migration: custom CSS remains authoritative; Fluent v9 is limited to interactive controls through `web/src/fluent/`.
7. Motion uses GSAP via `web/src/motion.ts`; anime.js is only for the calendar instruments and must stay out of the entry chunk.
8. Browser security headers are applied by root middleware from `functions/lib/security.ts` and mirrored in `public/_headers`; neither layer may overwrite route-owned cache or `Vary` headers. The same middleware turns an HTML fallback under `/assets/` into an uncacheable 404, so a mid-deploy miss is never cached as an immutable asset.

## Operations

- Toolchain: Node `24.18.0`, Vite 7, React 18, TypeScript, Cloudflare Pages/Workers.
- OpenSpec: [`openspec/config.yaml`](openspec/config.yaml) is the repository's spec-driven change guide. Use it before a new capability or a cross-boundary change; record scope, invariants, data/gate impact, and live verification. It supplements the versioned `knowledge/` vault rather than replacing it.
- Security: [`SECURITY.md`](SECURITY.md) records the trust boundaries, OWASP control map, and repeatable dependency audit. Keep it aligned with `functions/lib/security.ts` and the sealed-route invariants.
- Checks: `npm run typecheck`, `npm test`, and `npm run build` where applicable.
- Deployment is manual. A Pages upload is not success: verify the live bundle and appropriate public/sealed API behavior after deployment.
- `https://thalmor-archives.com` is the canonical production host. The production Pages hostname redirects there at the root Pages middleware; preview hostnames stay reachable for feature validation.
- Git remote: `Mosalah992/Centralized-Dossier`; never assume the local tree is clean—`index.html` may contain user work.

## Memory loop

The repository’s `knowledge/` vault is intended to be usable in plain Git and in Obsidian. The planned **Memory Consolidator** is a separate scheduled Cloudflare Worker: it will read repository change evidence, use a model to propose only Markdown updates, and open a reviewable GitHub PR. It must never mutate production/archive data, deploy code, or merge its own changes. See [knowledge/Automation.md](knowledge/Automation.md).

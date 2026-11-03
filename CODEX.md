# Centralized Dossier — Architecture Memory

## Purpose

The Thalmor Embassy Archives presents community records as ceremonial volumes rather than as a spreadsheet. The project is public-by-link and read-only by design; its protected content is the Reports register (the Cabinet) and the Solar, High Command's room. The Thalmor Chronicles were opened to all on 2026-10-23. This file is the high-signal map for agents. Detailed, connected notes live in [knowledge/](knowledge/README.md).

## System map

```mermaid
flowchart TB
  Reader --> Canonical[https://thalmor-archives.com]
  Legacy[thalmor-archives.pages.dev] -->|308 preserves path + query| Canonical
  Canonical --> App[React archive: web/src/App.tsx]
  App --> Router[router.ts]
  App --> Views[Lazy volume views + shelf]
  App --> Room[Embassy room: lazy chunk at /]
  Room --> Takeovers[/bookshelf, /board, /scribe-table takeovers]
  Room -->|The Cabinet, Reports writ| Pages
  Room -->|Ancarion's plate, Solar writ| Solar[/solar: map, notes, Clerk Table, Canonreeve's Desk]
  Solar --> Pages
  App --> Gallery[/gallery: the former hero]
  App --> PenalCode[/penalcode: bundled, Embassy-kept Code]
  App --> Client[web/src/api.ts]

  Client --> Pages[Cloudflare Pages Functions]
  Pages --> SheetRoutes[/api/volumes/*]
  SheetRoutes --> Sheets[Google Sheet: authoritative]
  Pages --> Chronicle[/api/chronicle: public]
  Chronicle --> FilingsKV[(CHRONICLE_FILINGS KV)]
  Pages --> SolarAPI[/api/solar/gate, /api/solar/pins]
  SolarAPI --> SolarWrit[Solar-only signed cookie]
  SolarAPI --> ReportsD1
  Pages --> Reports[/api/reports, :id, summary + gate]
  Reports --> ReportsWrit[Reports-only signed cookie]
  Reports --> ReportsD1[(Reports D1)]

  Worker[thalmor-chronicler Worker\nnightly scheduled()] -->|read + redact| Discord[Discord Informants]
  Worker -->|write filings| FilingsKV
  Reporter[thalmor-reporter Worker\nevery 6 hours] -->|read + filter| Discord
  Reporter -->|upsert reports + in-world names| ReportsD1
  Reporter -->|read roster names| Canonical

  Shared[shared/: types, registry, parsers, calendar] --> Client
  Shared --> Pages
  Shared --> Worker
```

This is the implementation-grounded counterpart to the supplied dossier diagram. The diagram’s three main regions map to this repository as follows:

| Diagram region | Repository implementation |
|---|---|
| Archive experience | `web/src/`: App, router, shelf, views, components, CSS, and API client |
| Data services / registers | `functions/api/volumes/`, `server/gsheets.ts`, `shared/volumes.ts`, `shared/parsers/` |
| Chronicle collection | `functions/api/chronicle/`, `chronicler/`, and shared `CHRONICLE_FILINGS` KV |

## Ownership and data flow

- `shared/` is pure cross-runtime domain logic: volume registry, parsers, types, calendar/reckoning, and filing redaction.
- `web/` is the browser-only presentation layer. `App.tsx` lazy-loads views (there is no navigation rail: the room is the way into every page, and each page leads back to it); `router.ts` owns URLs; `api.ts` owns request hooks and client contracts. Every bookshelf volume (Chronicles, History, Arrests, Penal Code, shelf books) is read through `web/src/books/BoundBook.tsx`; none is gated. Ancarion's performance is `useAncarion`; on the room's wall he keeps the Solar, taking its word at his plate (`room/SolarPlate.tsx`). The Cabinet (`/reports`, `/reports/:id`) is the Reports register's reader since 2026-10-22, opened on its own slip. The Solar (`/solar`, `views/Solar.tsx`) is High Command's room: the shared war-table map, notes, and the Clerk Table and Canonreeve's Desk (furnished, wired with the Librarian). `web/src/room/` is the front page (see knowledge/Architecture.md).
- `functions/` is the same-origin Pages API. It fetches Google Sheets read-only, serves public records (the Chronicles among them), owns the Reports and Solar gates, keeps the Solar's war-table pieces, and reads optional filings.
- `server/` contains server-only Sheets access. It must never gain a write helper.
- `chronicler/` is a separate Worker because scheduled events cannot run in Pages Functions. It reads Discord nightly and writes redacted, bounded filings to KV.
- `reporter/` is the separate Reports collector. It reads configured Discord categories/channels/forums, applies `shared/reports.ts` privacy filters and explicit severity metadata, resolves each filer to an in-world roster name (never storing the handle), and is the only D1 writer.
- `scripts/` creates committed derived assets. `Assets/` is source art; never replace reproducible preparation with one-off exports.

## Volume model

`shared/volumes.ts` is the shelf contract.

- `VOLUMES`: sheet-backed books, resolved by **tab title**, never gid. A missing tab becomes a withdrawn volume rather than a broken archive.
- `KEPT`: repository-authored, browser-bundled content (currently History).
- `SEALED`: server-served content. Enforcement and Chronicle are deliberately not bundled; neither is gated any more (the Chronicle's passphrase was retired 2026-10-23).

All new volumes must be explicitly classified before implementation. Do not add a repository-owned volume to `VOLUMES`, or a sensitive volume to a browser bundle.

## Stable contracts and invariants

1. The Google Sheet is the data authority; preserve its values and documented contradictions instead of recalculating them.
2. Pages and server code only read the sheet. The external HR bot alone writes its owned roster columns.
3. Gated routes protect themselves: every Reports and Solar response is private/no-store and varies by cookie, each checks its own scoped writ, and a missing gate secret fails closed. Writes to the Solar must be same-site JSON. The Chronicle is public (2026-10-23).
4. Optional infrastructure must degrade gracefully: missing filings KV or collector token omits filings. (The consultation register, which degraded the same way, was retired 2026-10-20.)
5. Shared KV IDs in root and `chronicler/wrangler.toml` must match.
6. No broad CSS/design-system migration: custom CSS remains authoritative; Fluent v9 is limited to interactive controls through `web/src/fluent/`.
7. Motion uses GSAP via `web/src/motion.ts`; anime.js is only for the Orrery's wheel (the room's orb, reached lazily) and must stay out of the entry and room chunks. The pixel room's own sprites move in drawn frames (strips run with CSS `steps()`), never a smooth transform of their art; Ancarion and the orb stay painted and keep their own motion. three.js is not a dependency since 2026-11-02.
8. Browser security headers are applied by root middleware from `functions/lib/security.ts` and mirrored in `public/_headers`; neither layer may overwrite route-owned cache or `Vary` headers. The same middleware turns an HTML fallback under `/assets/` into an uncacheable 404, so a mid-deploy miss is never cached as an immutable asset, and an HTML fallback under `/api/` into a JSON 404, so a missing endpoint never answers with the app shell.
9. The front page, and since 2026-11-03 every other page, is pixel art drawn in code (`scripts/build-pixels.mjs`, `scripts/pixel/`), except what stays painted by the First Emissary's decision: Ancarion's performance (hung in a pixel frame), the Orrery's glass globe (in a pixel cradle), and the archive's pictures, portraits, seals and the realm map (in pixel gold frames, on the pixel war table). The pages outside the room are built from one kit (`scripts/pixel/ui.mjs` sprites, `web/src/styles/pixel-ui.css`) at `--px` from `pagePixel`/`usePagePixel` (2 to 4 CSS px, whole device pixels); titles are Jacquard 24, labels and controls Pixelify Sans, long prose keeps the serif (the volumes swap `--display`/`--title` for the pixel faces; Fluent's base face stays the serif because FluentProvider wraps a whole volume). The Solar is a pixel room on the room's scene (`SOLAR` in `layout.ts`, `scripts/pixel/solar.mjs`). Nine-slice sprites keep their edges uniform so CSS can stretch them (`test/pixel-art.test.ts`). The art keeps to one palette (`web/src/pixel/palette.ts`), one grid (`web/src/pixel/layout.ts`), every sprite scaled by a whole number of device pixels (`web/src/pixel/scale.ts`) with `image-rendering: pixelated`. No sprite may hold a colour outside the palette or a semi-transparent pixel (`test/pixel-art.test.ts`). Rebuild the sprites and the cursor with `npm run assets:pixels` after changing anything under `scripts/pixel/` or `layout.ts`, and the 35 icons (`web/src/pixel/icons/`, shown with `PixelIcon`) with `npm run assets:icons`; commit the PNGs. The icons letter the same 33 colours in an alphabet of their own (`web/src/pixel/icons/palette.ts`); `test/pixel-icons.test.ts` holds them to the room's list.

## Operations

- Toolchain: Node `24.18.0`, Vite 7, React 18, TypeScript, Cloudflare Pages/Workers.
- OpenSpec: [`openspec/config.yaml`](openspec/config.yaml) is the repository's spec-driven change guide. Use it before a new capability or a cross-boundary change; record scope, invariants, data/gate impact, and live verification. It supplements the versioned `knowledge/` vault rather than replacing it.
- Security: [`SECURITY.md`](SECURITY.md) is the public policy (reporting, scope, principles) and deliberately omits route names and gate mechanics. The enforceable detail lives in `functions/lib/security.ts`, the sealed-route invariants above, and `knowledge/Invariants.md`.
- Checks: `npm run typecheck`, `npm test`, and `npm run build` where applicable.
- CI: `.github/workflows/ci.yml` typechecks, tests, builds and audits every push and PR from a clean clone, with the sealed modules' `.example.ts` placeholders in place. It must never deploy: a clean build carries placeholder Chronicle and Ledger text.
- Deployment is manual. A Pages upload is not success: verify the live bundle and appropriate public/sealed API behavior after deployment.
- `https://thalmor-archives.com` is the canonical production host. The production Pages hostname redirects there at the root Pages middleware; preview hostnames stay reachable for feature validation.
- Git remote: `Mosalah992/Centralized-Dossier`; never assume the local tree is clean—`index.html` may contain user work.

## Memory loop

The repository’s `knowledge/` vault is intended to be usable in plain Git and in Obsidian. The planned **Memory Consolidator** is a separate scheduled Cloudflare Worker: it will read repository change evidence, use a model to propose only Markdown updates, and open a reviewable GitHub PR. It must never mutate production/archive data, deploy code, or merge its own changes. See [knowledge/Automation.md](knowledge/Automation.md).

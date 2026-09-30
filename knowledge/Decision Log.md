# Decision Log

## 2026-09-29 — Markdown-first neural memory

`AGENTS.md` is the execution contract and `CODEX.md` the concise architecture index. The `knowledge/` Obsidian vault holds linked detail. All are version-controlled Markdown so ownership, history, review, and graph navigation remain available without a proprietary memory backend.

## 2026-09-29 — Consolidation proposes, humans approve

The planned scheduled Memory Consolidator will create documentation-only pull requests rather than writing the default branch. Its authority ends at GitHub draft/review creation; it has no production deployment, database, Sheets, Discord, or merge authority.

## 2026-09-29 — Worker runtime selected

The consolidator is specified as a separate scheduled Cloudflare Worker, consistent with the existing Chronicler topology. Pages Functions remain request-driven and are not used for scheduled work.

## 2026-09-29 — Reports are independently sealed

Reports use a separate passphrase, signing secret, epoch, cookie name, and throttle prefix from the Chronicle. The initial gate route is hidden—there is no shelf entry or browser-bundled data—until the ingestion, D1, and reader phases are independently reviewed.

## 2026-09-29 — Dedicated Reports D1 and collector

Reports use the dedicated `thalmor-reports` D1 database and `thalmor-reporter` scheduled Worker. This keeps Discord credentials out of Pages request handling and allows idempotent structured storage. The collector stores no Discord handles; in-world attribution remains null until an authoritative mapping is provided.

## 2026-09-29 — Canonical archive domain

`thalmor-archives.com` is the public archive address. The production Pages hostname permanently redirects there with a 308 response; preview deployment hostnames remain live for isolated feature testing. Host-only session cookies and same-origin request checks migrate naturally with the reader to the canonical host.

## 2026-09-30 - OpenSpec directs cross-boundary changes

`openspec/config.yaml` is the project-specific guide for proposals affecting a new capability, runtime boundary, public endpoint, data contract, gate, Worker, or KV/D1 binding. It complements the Markdown memory rather than becoming a second source of truth: accepted decisions and changed contracts still belong in `CODEX.md` and `knowledge/`.

## 2026-09-30 - Reports severity is explicit and separate from category

Reports use a six-level, deterministic severity field: informational, low, medium, high, critical, and unassessed. The collector reads a leading Discord `Severity:` metadata line and defaults missing or invalid values to unassessed; it never guesses a threat level. Severity communicates required attention, while category remains the subject of the report. Incident status is deliberately deferred.

## 2026-09-30 - Archive interactions stay registry-driven and CSS-led

The collapsible archive navigation is generated from the existing shelf registry, and its search filters destinations rather than unloaded record contents. Volume and Reports disclosures retain their original links and server contracts. The circular Archive Seal is confined to the Reports gate and uses CSS geometry with the established GSAP motion layer; Three.js is not added because it would increase bundle and lifecycle complexity without improving the navigation function.

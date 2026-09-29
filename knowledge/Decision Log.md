# Decision Log

## 2026-09-29 — Markdown-first neural memory

`AGENTS.md` is the execution contract and `CODEX.md` the concise architecture index. The `knowledge/` Obsidian vault holds linked detail. All are version-controlled Markdown so ownership, history, review, and graph navigation remain available without a proprietary memory backend.

## 2026-09-29 — Consolidation proposes, humans approve

The planned scheduled Memory Consolidator will create documentation-only pull requests rather than writing the default branch. Its authority ends at GitHub draft/review creation; it has no production deployment, database, Sheets, Discord, or merge authority.

## 2026-09-29 — Worker runtime selected

The consolidator is specified as a separate scheduled Cloudflare Worker, consistent with the existing Chronicler topology. Pages Functions remain request-driven and are not used for scheduled work.

## 2026-09-29 — Reports are independently sealed

Reports use a separate passphrase, signing secret, epoch, cookie name, and throttle prefix from the Chronicle. The initial gate route is hidden—there is no shelf entry or browser-bundled data—until the ingestion, D1, and reader phases are independently reviewed.

## 2026-09-29 — Canonical archive domain

`thalmor-archives.com` is the public archive address. The production Pages hostname permanently redirects there with a 308 response; preview deployment hostnames remain live for isolated feature testing. Host-only session cookies and same-origin request checks migrate naturally with the reader to the canonical host.

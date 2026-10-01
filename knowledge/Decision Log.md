# Decision Log

## 2026-10-01 - Ancarion is a shared gate presentation, never a shared writ

Chronicles and Reports use the same lazy portrait gate so accessibility,
Ancarion artwork, and reduced-motion behavior do not diverge. The gate
receives a separate adapter for each endpoint; it never reads, writes, or
reuses either volume's session. The supplied frame and matching Ancarion
performance are user-provided. The shared gate plays the real idle performance
when playback is available and otherwise uses the unchanged static portrait;
no facial motion is synthesized.

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

Reports use a six-level, deterministic severity field: informational, low, medium, high, critical, and unassessed. The collector reads an explicit standalone Discord `Severity:` metadata field from the official report template and defaults blank, missing, or invalid values to unassessed; it never guesses a threat level. Severity communicates required attention, while category remains the subject of the report. Incident status is deliberately deferred.

## 2026-09-30 - Archive interactions stay registry-driven and CSS-led

The collapsible archive navigation is generated from the existing shelf registry, and its search filters destinations rather than unloaded record contents. Volume and Reports disclosures retain their original links and server contracts. The circular Archive Seal is confined to the Reports gate and uses CSS geometry with the established GSAP motion layer; Three.js is not added because it would increase bundle and lifecycle complexity without improving the navigation function.

## 2026-09-30 - Browser policy is enforced at both Pages boundaries

`functions/lib/security.ts` is the executable header policy for static, Function, and redirect responses; `public/_headers` mirrors it for Pages static handling. The CSP defaults to denial and permits no inline script, eval, frames, workers, plugins, or cross-origin connections. Inline style remains allowed because Fluent/Griffel and record-specific CSS variables emit runtime styles. Only fingerprinted `/assets/*` files receive immutable caching, and middleware preserves sealed routes' private/no-store and `Vary: Cookie` headers.

## 2026-09-30 - Named report channels are category-scoped

Military and Informants use one child channel per in-world subject rather than `*-reports` names. Their configured Discord category ID is the allowlist boundary, so the collector discovers every readable text/forum child and records its normalized channel name as the subcategory. Other categories retain report-name filtering to avoid ingesting ordinary operational chat; individual child IDs are intentionally not duplicated in configuration.

## 2026-09-30 - Report severity remains explicit

Severity is conveyed through a written label plus a restrained color family on filters and report cards, so color is never the sole classification signal. The collector accepts only an explicit standalone `Severity: <level>` template field and does not infer danger from prose; legacy or unmarked reports remain Unassessed. The Reports liquid marker fills the selected control's rectangular bounds while its internal ink gradient supplies the movement.

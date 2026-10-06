# Decision Log

## 2026-10-06 - Three.js admitted for the Reports sky only

The Reports portrait gate gains a live Nirn sky (Nirn, Masser, Secunda) beside
the portrait. This reverses the earlier "no Three.js" stance for one surface
only: three is imported dynamically from `NirnSky`, ships in its own chunk
(~140 KB gzip), and never reaches the entry chunk (`test/bundle.test.ts`).
The planet surface is procedural, adapted from a getlayers.ai layer with none
of its assets; Masser and Secunda reuse the calendar's mundus art. Phones,
reduced-motion readers and browsers without WebGL2 get a still plate; the
single-column layout draws no sky. Presentation only: the gate's adapter,
endpoint and writ are untouched. Informants (Chronicles) keeps the plain gate.

As built, the gate itself was simplified at the same time: both gates now show Ancarion's portrait centred with only the passphrase field, button and status line beneath it; the title, description and spoken line remain for screen readers only. Behind the Reports gate, Masser and Secunda orbit Nirn (passing behind it), Magnus and the eight Divine planets from the calendar's orrery sit on the left with the Divines slowly orbiting Magnus, and the starfield is denser and mostly faint.

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

## 2026-10-06 - Navigation rail opens on hover, not by toggle

The desktop navigation rail stays at its slim width and slides open over the page while the cursor or keyboard focus is inside it, with short open/close delays so passing the edge does not trigger it. The pinned expand toggle and its `thalmor.sidebar.expanded` preference were removed: an overlay that never pushes the shelf has no layout state worth remembering. Touch layouts keep the existing off-canvas drawer.

## 2026-10-06 - Painted covers, volumes renamed to match

The shelf moved to a new nine-book cover sheet (`Assets/new volume assets.png`) with titles and colours painted in. Rather than erase the lettering and set live titles over it, the volumes were renamed to the painted names (Troops Roster, Chain of Command, Ledger, Registry, Hall of Honors, Calendar, Realm History, Arrests, Chronicles) in `shared/volumes.ts` and the page headings. `scripts/prepare-volumes.mjs` now only finds, scales (to the shortest body height, never upscaling) and baseline-aligns the books; the leather re-dye and title-erase passes were removed. The tradeoff: renaming a volume again needs new art. Sheet tab names are unchanged. The Chronicles gate seal is still cut from the retired Top Secret cover in `Assets/retired/`.

## 2026-10-06 - Home page is a hero; the rail carries the books

With every volume's cover shown in the navigation rail, the home page's cabinet repeated the same nine books. It was replaced by a full-height hero (insignia, title, motto, a pointer to the rail) with the torches, the High Command seal and the consultation register kept. `Book.tsx` and the cabinet/book styles were removed rather than kept dormant; git history holds them if a shelf view returns. High Command Reports uses the golden gate seal in the rail as well.

## 2026-10-06 - Hero states the archive's purpose, then shows the Embassy

The home hero now carries the Dominion's mission statement under the title and the motto "By Order of the Third Aldmeri Dominion", followed by a full-frame portrait of the Embassy (`Assets/portraits/portrait 4.JPG`), a muted looping film, and a two-column gallery of eight more screenshots (`troops 4.jpg` and `troops.png` excluded for their game-text overlays) (`Assets/portraits/My movie 4.mp4`), both prepared by `scripts/prepare-hero.mjs`. The portrait's reveal uses the existing IntersectionObserver helper (`revealOnEnter`), not ScrollTrigger, consistent with motion.ts; scroll-scrubbed parallax was not added for the same reason. The film is `preload="none"`, plays only on screen, and gives reduced-motion readers controls instead of autoplay. It is copied unencoded until ffmpeg is available.

## 2026-10-06 - Missing /assets/* files return an uncacheable 404

Pages serves `index.html` for any path it does not have, and `public/_headers` marks `/assets/*` immutable for a year. During a deploy, readers whose HTML switched a moment before its assets were served the previous deployment's `index.html` as the new entry script, and kept it: a blank page that neither a reload nor a CDN purge could fix. The root middleware now converts any HTML answer under `/assets/` into a `404` with `Cache-Control: no-store` (`functions/lib/assets.ts`). It changes no route-owned cache header. After deploying, verify on the `*.pages.dev` deployment URL first and request custom-domain assets only once its HTML references them.

## 2026-10-06 - Reports become a searchable, signed dossier

`overhaul-reports-dossier`: the Reports reader is bound like the Chronicles book, with month-grouped filings, template fields laid out as records and an "Awaiting assessment" view. Search uses parameterised, escaped `LIKE` rather than FTS5, which is unnecessary at a few hundred filings. Filings gain addresses (`/reports/:id`) and a counts-only summary that also names desks filing without a classification — shown to High Command on the page, because the collectors never post to Discord. Filers are signed with their in-world roster name, resolved in the collector's memory from the public roster; resolving at read time was rejected because it would require storing a Discord identity in D1.

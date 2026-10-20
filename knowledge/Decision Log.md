# Decision Log

## 2026-10-20 - The room is one screen, wall to wall

At the First Emissary's direction the front page fits a single screen with no scrolling and no dark bands at the sides. On landscape screens from 1024px the room's width is the window's less 2rem, and its height is the window's: each object is sized from the rows it stands in, in `--u` (a hundredth of the grid's height, or the width's share when a window is narrow for its height), so nothing overflows and nothing floats in an oversized cell. Objects sit in auto tracks with the slack in flexible tracks between them, the outer ones wider than the two that part the arches from Ancarion. To suit a wide, short wall the bookcase is a five-shelf case standing from the board's top to the arches' feet, and the board is a long one with eleven notices; narrower walls keep the four-shelf case and the square board. The floor row is the deepest after Ancarion's, since the lectern is where a reader acts. The Register and the colophon stay below the fold. Portrait screens and phones keep the scrolling stack.

## 2026-10-20 - The room loses its frame; the rail and the painted covers are retired

The gold frame in the First Emissary's drawing was guidance, not furniture: the room now has no border and its wall fades into the page. The navigation rail is retired on every page, not only the room: the room reaches every remaining destination (archways for Roster, Chain of Command, Gallery and Hall of Honors; the bookshelf for History, Chronicles, Arrests, the Penal Code and the Concordat; the rack for Reports), and every other page leads back with "Return to the Embassy". The nine painted covers went with it (`web/src/covers.ts`, `web/src/assets/volumes/*.webp`, `scripts/prepare-volumes.mjs`); the Chronicles' seal, which never came from the covers, is now cut by `scripts/prepare-seals.mjs`. The bookshelf binds its books as leather spines in each volume's own colour (`theme.ts`).

## 2026-10-20 - The Ledger, the Registry and the Calendar are retired

At the First Emissary's direction the Finance volumes (Ledger, Registry) and the Tamrielic Calendar left the registry, the slug union, the server's parse switch and the app; their URLs now show "No such volume". Their parsers and tests stay in `shared/parsers/`, so restoring one is a registry entry, a slug and a view, and the sheet's tabs are untouched. The Firmament and the hourglass, which lived only in the Calendar, were removed; the orrery remains as the room's orb, which now reads the moons' phases and links nowhere.

## 2026-10-20 - Elven archways, and the eye's path through the room

The archways are redrawn after the high elves' halls of the films: slender lancets on leaf-crowned columns, a band carved with leaves, vines curling up the flanks to a star finial, an inner ogee with a trefoil; the frame keeps its own proportions and the opening is clipped to match. The room is composed for the eye: Ancarion is the focal point (larger, centred, the only object with light of its own), the arches frame him, the clock and orb sit together as one instrument, and the wall reads in a Z from the notices along the top to the rack and lectern where a reader acts.

## 2026-10-19 - The front page is the Embassy's room; the hero becomes the Gallery

Supersedes 2026-10-06 "Home page is a hero; the rail carries the books" and, for placement only, "Hero states the archive's purpose, then shows the Embassy". The front page is now a single room after the First Emissary's drawing, built on the Bruma Joint Archives' room (same owner) and re-hung in black and gold: bookshelf, bulletin board, clock and orb, two archways, Ancarion, the Scroll Rack, the lectern and its note, a signpost to the Solar. The hero's content is unchanged at `/gallery` (reached through the right-hand archway); the register moved to the room's foot. Furniture is drawn SVG with build-time image slots (`web/src/assets/room/{name}.webp` replaces a drawing with no code change) rather than Bruma's runtime probes, which would cost every visitor a request per object, each answered by the app shell. The room is a lazy chunk whose import starts at module scope: the entry chunk had ~10 KB of headroom and the room would have spent it; the entry fell from 254.9 KB to 243.4 KB raw.

## 2026-10-19 - Ancarion is a performer; the Scroll Rack opens on the Reports writ

Ancarion's media, idle rotation, dozing, voice and aura moved out of `PortraitGate` into `useAncarion` (pure rules in `ancarion-script.ts`), so the room can hang him beside the Scroll Rack. The rack asks for the existing Reports passphrase through the existing gate; a wrong word earns the gate's escalating refusals, the right one his nod, and then the rack's doors swing instead of his. A reader already holding the writ gets a nod and the doors. `/reports` and `/reports/:id` reached directly keep the full gate. On the room he loads deferred: the idle after page load, the reactions only when a reader approaches the rack, the doze after 30 s, so the front page does not spend ~2.5 MB of WebM on readers who never knock. Still a shared presentation, never a shared writ (2026-10-01).

## 2026-10-19 - The White-Gold Concordat is kept like the Penal Code

The Concordat (text from the Bruma Joint Archives, `content/books/sources/white-gold-concordat.md`) is Embassy-kept public text: bundled as its own lazy chunk (`web/src/books/`, emitted by `scripts/emit-books.mjs`), in neither VOLUMES nor KEPT, read in the paginated reader ported from Bruma. A KEPT slug would have demanded a painted cover, a rail entry and a volume view; serving it from a Function protects nothing.

## 2026-10-19 - Room surfaces are takeovers; volumes stay routes

Objects leading to existing pages navigate there, so every existing URL is unchanged. The room's own surfaces (bookshelf, board, lectern) open over it as takeovers with real URLs, portalled to <body> with the archive behind made `inert`. Closing steps back through history when opened from the room and replaces the URL with the parent when it was a deep link. A close never waits on its shrink animation alone, because a hidden tab may never finish it.

## 2026-10-19 - Bruma's bulletin board and bounties, brought whole

At the First Emissary's request the board is Bruma's: six sections (Bruma's agenda becomes the Embassy's), notice cards, wanted posters with the race sketches (`public/art/portraits/*-male.webp`, copied from the Bruma project, same owner; the female set is not drawn yet, so a female bounty shows the charcoal silhouette) and Bruma's SVG textures (`public/textures/`). Bruma has no "new" marks; here a per-browser last-seen marker (`thalmor.board.seen`) flags sections with newer notices. Posting arrives with the Librarian backend.

## 2026-10-19 - An unknown /api path answers a JSON 404

Pages answered a request for a missing endpoint with index.html and a 200, so a client asking for JSON was handed the app. The root middleware now turns an HTML answer under `/api/` into `404 {"error":"not-found"}` with `no-store`. The room depends on it to tell an absent backend from data.

## 2026-10-10 - The Chronicles gate stands before a map of Summerset

The Chronicles gate gets its own setting, distinct from the Reports sky: a
gold-on-dark map of the Summerset Isles, drawn darkened behind the gate and
darker still behind the portrait and field (`backdrop` prop, Chronicles
only). It is the owner's AI-generated image with the place names corrected
and no watermark (`Assets/chronicles-map.png`, 1254 px, a lossless copy of
the owner's file; an earlier watermarked draft, `informantsBG.png`, is left
untouched and uncommitted). A replacement only needs that one source file.
A still, so it also shows for reduced motion. The Chronicles gate still
draws no sky.

## 2026-10-10 - He never freezes between idle moments

The 2 s rest on the still between idle clips read as a freeze, so idle clips
now play back to back. A dedicated breathing loop was tried twice and
rejected as a loop: Kling closed his eyes in the first take and widened them
in the second, and barely moved his chest in either, so on a 5 s repeat each
became a recurring tic. Both takes joined the pool instead (`idle-drowse`, a
slow lid-close; `idle-breathe`, a calm widening). The next moment is drawn
from the plain idle and four variants, never the one just played, so nothing
recurs on a fixed beat. Overlays still pause the idle layer on its first
frame and restart it from there.

## 2026-10-10 - Refusals escalate; only an unplayable clip is retired

Wrong passphrases now escalate: the first plays the regenerated refusal
(narrowed eyes), the second the original supplied head-shake
(`Assets/Ancarion live portrait assets/ancarion-shake.webm`, copied untouched
into `Assets/portrait-clips/` with an H.264 MP4 fallback encoded from it), and
every later one the sigh. The head-shake is not a Kling clip from this
pipeline; it is 1024 px at an effective 12 fps, and its first and last frames
sit within about 4/255 of the still.

A `play()` rejection retires a clip only when it is `NotSupportedError` (no
playable source). An `AbortError` (for instance Chromium pausing video-only
media in a background tab) or an autoplay refusal now skips that one
performance instead of disabling the clip, the idle layer, or dozing for the
rest of the visit.

## 2026-10-09 - Ancarion behaves like a Hogwarts portrait

The gate now gives Ancarion a life between passphrases, all from supplied
clips (no motion synthesized in code):

- **Idle rotation:** after each idle and its 2 s rest, the plain idle plays about
  half the time, otherwise an appraising stare or a stirring of the staff's
  smoke, never the same variant twice running. A sideways-glance variant was
  generated and dropped: Kling closed his eyes instead of moving his irises.
- **Notices you:** the first focus on the field plays the listening clip once.
- **Dozing:** 45 s without pointer, key, scroll or focus (20 s at night) and he
  nods off, holding asleep until anything stirs, then wakes. Between 23:00 and
  06:00 local time he is found asleep. Doze and wake meet on an asleep keyframe:
  frame 53 of the approved accept clip, scaled to 760 px
  (`Assets/portrait-clips/ancarion-asleep.png`). The painting is untouched.
- **Hand-offs:** while any clip covers him, the idle layer waits on its first
  frame, so every change of clip is still to still (or asleep to asleep).
- **Voice:** optional recordings in `Assets/ancarion-voice/` (`ancarion-greet`,
  `-denied`, `-annoyed`, `-accepted`, `-woken`) play with the matching moment,
  only when the archive's sound roundel allows and the browser has a gesture.
  A missing line is silence, so the voice can ship before every line exists.

Reduced motion sees none of this: the still stays and he never dozes; the
voice, which is not motion, still follows the roundel. Presentation only:
adapters, endpoints and writs are untouched.

## 2026-10-09 - Ancarion's performances regenerated from his painting

The gate's idle, refusal, sigh and accept clips are now AI-generated (Kling,
image-to-video) from the owner's own painting, `canonreeve.webp`, with the
painting as both first and last frame. Every clip therefore begins and ends on
the still, and the gate can cut between still and clip without a jump. The
site still synthesizes no motion itself; it plays supplied files. Settings,
prompts, task ids and hashes are in `Assets/portrait-clips/manifest.json`; the
raw downloads stay on the author's machine and only the WebM/MP4 encodes are
committed.

Each clip ships as VP9 WebM with an H.264 MP4 fallback (`<source>` order), so
reactions also play on browsers without VP9. Accept is now a performance rather
than a still: the door waits 3.7 s for the nod to finish (0.52 s if the clip
cannot play), and the clip keeps playing beneath the swinging door. The sigh's
fallback timer grew from 3 s to 5.5 s to cover the longer clip. Presentation
only: adapters, endpoints and writs are untouched.

## 2026-10-07 - Phones get the still Nirn plate, not a blank sky

Below 721px the Reports gate drew no sky, which left phones with a flat black
background. `chooseSkyMode` now returns the still plate there; a 720px media
query in `nirn-sky.css` shrinks the bodies and keeps them to the edges so none
sits behind the centred portrait or the passphrase field. The live three.js
scene stays desktop-only. Presentation only: adapter, endpoint and writ untouched.

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

## 2026-10-08 - CI verifies a clean clone and never deploys

A clean clone used to fail `npm run typecheck`: `chronicle.example.ts` lacked the `FUNERAL` export the Worker imports, and `test/volumes-pipeline.test.ts` read the gitignored `content/chronicle.json` and `content/enforcement.jsonl`. The example now carries a placeholder `FUNERAL`, and those two suites skip (with guarded reads) where their JSON is absent. GitHub Actions runs typecheck, test, build and a production `npm audit` with the placeholders copied in. Deploying from CI was rejected: the build there holds placeholder text, so a CI deploy would silently replace the live sealed volumes. Deploys stay manual from the machine that holds them.

## 2026-10-09 - The Penal Code is a public page, not a volume

`add-penal-code`: `/penalcode` (any casing) renders the Criminal Code of the Aldmeri Dominion as a decree on the volume parchment, reached from the hall's top bar. It is Embassy-kept text in its own lazy chunk, so it is neither in `VOLUMES` (sheet-backed only) nor behind a gate; in-world the Code is restricted, but out of world it is rules the community publishes, and gating it would have meant a new secret for no protection. Its art (eagle, three signatures) comes from the community's Code document via `scripts/prepare-penal-code.mjs`; the page does not link to that document. The eagle is drawn as a CSS mask so it takes the volume's ink on parchment. With four entries the top bar folds into its menu at 800px, not 640px, or the links run under the drawer button.

# Embassy Room: Phase 1 report

*Written 2026-10-19 at 22:15 (+03:00) by the interactive session. Branch `room-rehaul`. Nothing has been committed, pushed or deployed.*

## Status

**Phase 1 is complete and verified locally.**

- Typecheck passes for both projects.
- `npm run verify` passes: the build succeeds and **438/438 tests pass**. The baseline was 409; 29 tests were added.
- The room was checked in the browser at 1600, 1440, 1024 and 375 px wide. The Scroll Rack ceremony was run end to end against the local Pages server, using the Reports test secrets from `.claude/launch.json`.

**Not done:**

- **Deploy.** It is manual, and needs your go-ahead.
- **Phase 2, the Librarian backend.** It was proposed as a separate session card ("Librarian backend + bounties").
- **The Solar page.** You deferred it.

## What you get

**The front page (`/`) is now the Embassy's room.** It sits inside a thick gold frame on black and follows your drawing:

| Your drawing | What is there |
|---|---|
| Bookshelf, top left | Drawn lacquered bookcase. It opens a takeover holding:<br>• all nine registers, face-out in their painted covers, each opening its volume<br>• the Penal Code<br>• the **White-Gold Concordat**, ported from Bruma, read in Bruma's page-turning reader |
| Bulletin board, top | **Bruma's whole board.** Six sections: Bounties, New Laws, Figures of Interest, Embassy Agenda, Bread & Circus, News.<br>• Notice cards, with **wanted posters** using Bruma's race sketches.<br>• A gold Aldmeri stamp on each notice.<br>• "New" marks for each browser, plus a red count on the board's plaque.<br>• It says *"The Embassy has nailed nothing up yet"* until the Librarian backend exists. |
| Date & time | Live in-game date and clock (e.g. "10th of Morning Star, 4E 227, 3:58 PM") from `shared/reckoning.ts`. It updates every in-game minute. |
| Orrery → orb | The calendar's own Wheel of Mundus inside a brass glass sphere on a gold stand. Click it to open the Calendar. |
| Left arch | "Roster & Chain of Command". Starfield with a slow gold aurora that brightens on hover. Hover, focus or tap shows two gold plaques: **Troops Roster**, **Chain of Command**. |
| Animated portrait | **Ancarion**, with the same idle clips, dozing and night-sleep as the gates. |
| Right arch | "Gallery & Hall of Honors". Its plaques: **The Gallery** (new `/gallery`) and **Hall of Honors**. |
| Scroll rack | Lacquered pigeonhole cabinet with two doors. See the next section. |
| Lectern + note | The lectern opens "The Lectern awaits its consecration", which explains `/archives/code`. The pinned note carries your two steps, signed *"By order of the First Emissary"*. |
| Solar, bottom left | A signpost pointing west. It is not a link yet: hovering says "The way is not yet open." |

**Clicking the Scroll Rack:**
1. A parchment slip asks for the Reports passphrase.
2. Each wrong word plays Ancarion's escalating refusal: narrowed eyes, then the head-shake, then the sigh.
3. The right word plays his nod. Then **the rack's doors swing open** and the reader lands in `/reports`, already unlocked.
4. A reader who already holds the writ gets a nod and the doors open straight away.

**Other details:**
- **Old hero → `/gallery`.** It keeps the mission, portrait, film, 8-image gallery, recruitment and "Submit Your Oath", and gains a "The Embassy" link back to the room. The visitor Register now sits at the foot of the room.
- **Phones** get a two-column stack in this order: Ancarion; clock and orb; board; lectern; note; shelf and rack; arches; signpost. There is no horizontal scroll.
- **Escape, the close seal and Back** all close a takeover. Deep links work: `/bookshelf`, `/bookshelf/white-gold-concordat`, `/board`, `/board/bounties`, `/lectern`.

## What changed

**New: the room** (`web/src/room/`)
- `Room.tsx`: the grid and takeover host.
- `nav.tsx`, `ImageSlot.tsx`, `art.tsx`: the drawn furniture.
- `Archway.tsx`, `RoomClock.tsx`, `clock-format.ts`, `RoomOrb.tsx`.
- `RoomPortrait.tsx`, `ScrollRack.tsx`.
- `Takeover.tsx`, `room-api.ts`, `board-seen.ts`.
- `takeovers/`: `Bookshelf`, `BookReader`, `paginate`, `book-reading`, `Board`, `Poster`, `Stamp`, `Lectern`.

**New: Ancarion as a performer**
- `web/src/components/useAncarion.tsx` holds his clips, idle rotation, doze, voice, aura and deferred loading.
- `ancarion-script.ts` holds the pure rules.
- `PortraitGate.tsx` now uses the hook. Gate behaviour is unchanged.

**New: books**
- `shared/books.ts`, `shared/document.ts` (from Bruma).
- `scripts/emit-books.mjs`, `content/books/sources/white-gold-concordat.md`.
- `web/src/books/` (the registry and the emitted JSON).

**New: room contract**
- `shared/room.ts`: board sections, notice, bounty and status types for Phase 2.

**New: styles** (all load only with their chunk, never at startup)
- `room.css`, `takeover.css`, `orb.css`, `board.css`, `bookshelf.css`, `ancarion.css`.
- `shelf.css` was renamed to `gallery.css`.

**New: assets** (all copied from your Bruma project)
- `public/textures/{grain,parchment,wood,leather}.svg`
- `public/art/portraits/*-male.webp`

**Changed**
- `App.tsx`: the room loads lazily, and its download starts at startup. Adds the lazy Gallery, page titles, and a gold-frame skeleton while loading. The Ko-fi seal and footer are untouched.
- `router.ts`: room surfaces and `/gallery`. Navigating inside the room no longer scrolls to the top.
- `main.tsx`: no longer loads the hero or register styles.
- `Register.tsx`: imports its own stylesheet.
- `archive-navigation.css`: room width and the skeleton.

**Server**
- `functions/_middleware.ts` and `functions/lib/assets.ts`: an unknown `/api/*` path now answers `404 {"error":"not-found"}` with `no-store` instead of the app's HTML. Verified under Wrangler.

**Tests**
- New: `room.test.ts`, `board-seen.test.ts`, `clock-format.test.ts`, `books.test.ts`.
- Updated: `archive-interactions`, `site-hardening`, `bundle`, `asset-fallback`.
- `bundle.test.ts` now finds the entry chunk from `dist/index.html`. A second tiny `index-*.js` (a react-dom shim) had fooled the old filename match.

**Docs**
- `CODEX.md`: system map and invariants 7 and 8.
- `knowledge/Architecture.md`, `knowledge/Invariants.md` (#7), `knowledge/Integration Contracts.md`.
- Six dated entries in `knowledge/Decision Log.md`. The first supersedes "Home page is a hero".
- This OpenSpec change folder.

## Sizes

| Chunk | Raw | gzip (level 9) |
|---|---|---|
| **Entry** (`index-*.js`) | **243,432 B** (was 254,938) | **85,716 B** |
| Ceiling | 265,000 B | 92,000 B |
| Room | 29,343 B | 10,390 B |
| Bookshelf + reader | 17,763 B | 6,558 B |
| White-Gold Concordat text | 22,651 B | 6,935 B |
| Board | 9,428 B | 3,646 B |
| Ancarion performer | 8,768 B | 3,486 B |
| Gallery | 8,946 B | 3,428 B |
| Orrery (anime.js, shared with the Calendar) | 46,660 B | 18,814 B |

The entry chunk got **11.5 KB smaller**, because the hero left it. On the front page Ancarion loads **only his idle clip**. Reaction clips wait until a reader points at or focuses the rack. This was verified in the browser.

## Browser verification

| Check | Result |
|---|---|
| Desktop 1600/1440: composition matches the drawing | Pass |
| Tablet 1024: three columns | Pass |
| Phone 375: two-column stack, no horizontal scroll | Pass (page width = 375) |
| Arch: focus, then Tab reaches "Troops Roster"; click shows plaques; links correct | Pass |
| Rack: 1st, 2nd, 3rd wrong word plays refusal, then shake, then sigh | Pass (`ancarion-refusal`, `-shake`, `-sigh` clips active) |
| Rack: right word plays nod, opens doors, lands in `/reports` without a second gate | Pass |
| Rack with writ already held: nod, doors, `/reports` | Pass |
| Bookshelf: 9 covers plus Penal Code and WGC spines; WGC reader turns pages | Pass |
| Deep link `/bookshelf/white-gold-concordat`: Esc goes to `/bookshelf`, Esc again goes to `/`; focus returns to the bookshelf; inert lifted | Pass |
| Board: six sections plus the "nothing nailed up" note; Back closes it | Pass |
| Lectern: consecration message | Pass |
| `/gallery`: 8 images, oath link, "The Embassy" link | Pass |
| `/archives/informants` gate unchanged (8 media layers, idle) | Pass |
| `/api/room/board` under Wrangler: JSON 404 | Pass |
| Reduced motion | Covered by CSS and tests (all room stylesheets have reduced-motion blocks; takeovers fade only). Not emulated in the pane. |

Screenshots were inspected in the session and were not saved to disk.

## Issues found and fixed during verification
- A later `.object { width: 100% }` rule overrode the lectern and board widths, so the lectern drew huge. Fixed with more specific selectors.
- The rack's slip lost its absolute position to `.parchment`. Fixed by scoping it.
- Closing a takeover waited on its shrink animation, which a hidden or throttled tab never finishes, so Esc appeared to do nothing. There is now a 700 ms fallback.

## Known issues and risks
- **Console noise:** each room visit logs one `404 /api/room/board`. That is the intended "no backend yet" answer, and it goes away with Phase 2.
- **Female bounties** show a charcoal silhouette, because Bruma has no female race sketches yet.
- **"Return to the cabinet"** is still the label on volume pages. It should probably read "Return to the Embassy". This is a copy decision for you.
- **Shared CSS class names:** the book reader's stylesheet shares names like `.scry` with the Chronicles reader. They look alike by design, but a later visual tweak to one may affect the other.
- **Dev only:** `npm run dev` proxies `/api` to port 8788. Without that server, Reports and Chronicles calls return 500. Nothing changed here.

## Decisions made on your behalf
1. The WGC is a bundled "Embassy-kept" book like the Penal Code, not a sheet volume.
2. The room's own surfaces open as takeovers. Everything else keeps its existing URL.
3. Painted art for the furniture can be dropped into `web/src/assets/room/{bookshelf|board|rack|lectern|signpost}.webp` and replaces the drawing at the next build, with no code change.
4. The board's "Embassy Agenda" replaces "Bruma Agenda", and the section blurbs were rewritten in the Dominion's voice.
5. The room's title reads "Third Aldmeri Dominion / Thalmor Embassy Archives". Your drawing had no title, but the page needs a heading.

## What you need to supply or do next
**To ship Phase 1:**
1. Look over the room at `npm run dev`.
2. Tell me to commit.
3. Deploy, checking `*.thalmor-archives.pages.dev` first, then the domain.

**For Phase 2 (Librarian backend):**
- **Thalmor Discord role IDs** (guild `1498139135758831749`), each with a rank, a tier (1 filer, 2 reader, 3 officer), and whether it may act as clerk or librarian.
- Approval of the filing categories (Logistics, Administration, Mining, Supply, Military, Informants) and kinds (report, bounty).
- **Invite the Librarian bot** to the Thalmor server, with the `bot` and `applications.commands` scopes.
- **Deploy access to the Bruma project.** Its interactions endpoint needs a small forwarder for the Thalmor guild.
- Create the D1 databases `thalmor-room` and `thalmor-room-preview`, and set the secrets `CODE_PEPPER` and `ROOM_SESSION_SECRET` (`DISCORD_BOT_TOKEN` is optional).
- **Confirm the White-Gold Concordat text may be published here.** It is already on the Bruma site.

---

## Revision 2: written 2026-10-20 at 02:45 (+03:00), at your direction

**Status:** done and verified locally.
- Typecheck passes and `npm run verify` passes, with **420/420 tests**. Tests for removed features went with them.
- Checked in the browser at 1600 px and 375 px wide, with no horizontal scroll.
- Nothing is committed or deployed.

| You asked | Done |
|---|---|
| The gold frame was only a guide, so remove it | The room has no border. Its faint wall texture fades into the page at the edges. |
| Remove all book cover assets | The 9 painted covers, `covers.ts` and the script that cut them are deleted. The Chronicles gate's seal never came from the covers; it is now cut by `scripts/prepare-seals.mjs`. |
| Remove the side panel | The rail is removed on **every** page, not just the room. The room links to every remaining page, and each page's first button now reads **"Return to the Embassy"**. The mobile "Archive navigation" button is gone as well. |
| Make /informants a volume on the bookshelf | The bookshelf holds leather spines for **Realm History, Chronicles, Arrests, the Penal Code and the White-Gold Concordat**. The Chronicles still open behind their own passphrase. Roster, Chain of Command and Hall of Honors stay in the archways and are not shelved twice. |
| Make Ancarion bigger | He is now up to 26rem wide (was 21rem), in the widest column, with a warm pool of light behind him as the room's focal point. |
| Use good frontend and eye-guidance practice | Ancarion is the single focal point, framed by the arches. The eye follows a Z: notices along the top, the clock on the right, then down to the rack and lectern where readers act. Every object has the same brass plaque beneath it. The candles are smaller, there is more space between objects, and the clock date wraps evenly. |
| Move the orrery globe closer to the date and time | The orb sits directly under the clock as one instrument and shows both moons' phases (e.g. "Masser · Third Quarter"). It no longer links anywhere, because the Calendar is gone. |
| Remove the calendar section | The Calendar volume is gone: its registry entry, URL, view, hourglass and Firmament. |
| Remove the Ledger and Registry | Removed from the registry, the server, the app and the bookshelf. `/archives/ledger` and `/archives/stipends` now show "No such volume". |
| Make the arches look elven, like LOTR | Redrawn as slender pointed arches on columns topped with carved leaves. The arch band is carved with leaves, vines curl up both sides to a gold star at the top, and fine tracery fills the inside. The starlight and gold aurora inside are unchanged; the doorway plaques now sit below the tracery. |

**Sizes:**

| Chunk | Raw | gzip |
|---|---|---|
| Entry | 237,142 B (was 243,432) | 83,694 B |
| Room | 34,132 B | 12,252 B |
| Hall of Honors (calendar removed) | 6,295 B (was 70,763) | 2,403 B |

**Kept on purpose:**
- The Ledger, Registry and calendar *parsers* and their tests stay in `shared/parsers/`. Bringing a volume back needs only a registry entry, a slug and a view. Your Google Sheet's tabs are untouched.
- The shared calendar logic (events, holidays, observances, constellations) and its tests also stay. Nothing on the site uses it now, so it can be deleted later if you're sure.

**Your call:**
- If you want the side panel back on the volume pages only, it can be restored from git.

---

## 03:00 re-verification (2026-10-20)

*Automated scheduled run, 03:00 EDT. Branch `room-rehaul`. Nothing was edited, committed, pushed or deployed. This report is the only file touched.*

**Anything left?** No. In `tasks.md` the status is "complete" and every Phase 1 box is ticked. No file under `web/src`, `functions` or `test` had changed in the previous 15 minutes, so no other session was at work. Nothing needed finishing or fixing.

**Results:**
- `npm run typecheck`: pass, for both the app and the functions projects.
- `npm run verify`: pass. The build took 6.3 s, and **41 of 41 test files and 420 of 420 tests pass**. There was no failure output.

**Sizes (gzip level 9):**

| Chunk | Raw | gzip | Ceiling |
|---|---|---|---|
| Entry (`assets/index-CvVdpmdj.js`, from `dist/index.html`) | 237,142 B | 83,694 B | 265,000 / 92,000 |
| Room | 34,132 B | 12,252 B | — |
| Gallery | 8,983 B | 3,449 B | — |

The entry and Room chunks are byte-identical to the Revision 2 figures.

**Browser spot-check: NOT done.** Starting the `centralized-dossier` dev server through the preview tool was declined in this unattended run, and per the rules it was not retried or started another way. None of these was re-checked this run:
- `/`, `/bookshelf`, `/bookshelf/white-gold-concordat`, `/board`, `/lectern` and `/gallery`
- Esc closing a takeover

The last browser check was Revision 2's, at 02:45 (+03:00). The code has not changed since; the build and the route and interaction tests above still pass.

**New issues:** none.

**Still yours to decide or supply (unchanged):**
1. Look over the room at `npm run dev`.
2. Tell me to commit.
3. Deploy: check `*.thalmor-archives.pages.dev` first, then the domain.
4. Optional: bring the side panel back on volume pages only.
5. Optional: delete the now-unused calendar, Ledger and Registry parsers and the shared calendar logic.
6. For Phase 2, supply:
   - Thalmor Discord role IDs, each with rank, tier and clerk/librarian rights
   - approval of the filing categories and kinds
   - a Librarian bot invite, with the `bot` and `applications.commands` scopes
   - deploy access to the Bruma project
   - the D1 databases `thalmor-room` and `thalmor-room-preview`, plus the secrets `CODE_PEPPER` and `ROOM_SESSION_SECRET`
   - confirmation that the White-Gold Concordat may be published here

Phase 1 is still complete and green: typecheck, build and 420/420 tests pass, and the entry chunk is 237,142 B raw / 83,694 B gzip.
The browser spot-check was not run, because launching the dev server was declined. Nothing is committed or deployed.

## Revision 3 — one screen, wall to wall (2026-10-20)

On landscape screens 1024px or wider the room now fits exactly one screen and runs to both edges: no scrolling to see the room, and no dark bands beside it. Each object is sized from the screen's height, and the leftover space sits between the furniture.

- **Checked in the browser** at 1920×950, 2560×1300, 1440×790, 1366×650, 1280×720, 1100×860 and 1024×768. At every size the room ends at the bottom of the screen, and every object is within it and within 25px of each side.
- **Phones and portrait tablets** (375×812, 768×1024) keep the scrolling stack, with no horizontal scroll.
- **Art:** a five-shelf bookcase and a long notice board, drawn for the wide wall.
- **Arch name plates** reach a little past the arches, so they never wrap past two lines.
- **Fixed an older bug:** between about 1200px and 1600px the unwrapping arch name plates had squeezed Ancarion down to the arches' width.
- **Checks:** typecheck, build and 420/420 tests pass. Entry chunk is 237.14 kB raw / 83.87 kB gzip.
- Nothing is committed or deployed.

## Revision 4: the First Emissary's review (2026-10-20)

- **`/gallery`** now holds only "Thalmor Embassy Archives", "Gallery" beneath it, and the pictures. "Aldmeri Dominion" in the bar at the top leads to the main page. The Penal Code links are gone; the Code is already a volume on the bookshelf.
- **Torches** from the Gallery now stand either side of the lectern in place of the candles. On phones they are hidden, so phones don't download the two animated images. Readers who ask for reduced motion get the still image.
- **Lectern** is larger: its plate sits on the desk's front, and the bottom row is deeper.
- **Solar** is now a sealed door, which will later open onto the map and the clerk's desk. It is a button: clicking it makes the doors strain against the seal. It is never a link.
- **Hall of Honors:** the "500" on `localhost:5173` came from the dev page forwarding `/api` to a Functions server that wasn't running. The Hall now renders whatever the sheet does, since all its honours are kept in the code; the sheet's "Hall of Honor" tab is empty apart from its title.
- **Fonts:** Cinzel, Cinzel Decorative (for the Embassy's name) and EB Garamond are now self-hosted, under the OFL. The stylesheets had always named them but never loaded them.

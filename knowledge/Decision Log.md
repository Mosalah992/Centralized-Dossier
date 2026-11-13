# Decision Log

## 2026-11-03 - Every page in pixels, and the Solar a room with depth

The First Emissary asked for every page to match the pixel front page: the bookshelf, the Cabinet, the Gallery (not its pictures), the roster, the Hall of Honors (not its portraits), the Chain of Command and the inside of the bulletin board, and the other volumes with them. They are built from one kit rather than page by page: sprites drawn in code (`scripts/pixel/ui.mjs`) and `pixel-ui.css`, at an art pixel of 2 to 4 CSS pixels that is always a whole number of device pixels (`pagePixel`). Nine-slices keep their edges uniform so stretching never smears, and a test holds that. Nothing is tilted any more: a rotated sprite smears, so notices hang higher or lower by whole art pixels. Asked whether long reading should go pixel too, the First Emissary chose pixel everywhere except long prose, which keeps the serif on pixel parchment; the volumes swap the display and title faces for Pixelify Sans and Jacquard 24, and Fluent's base face stays the serif because FluentProvider wraps the whole volume. Pictures, portraits, the volumes' seals and the realm map stay painted, each in a pixel frame. The Solar became a room with depth like the front page, on the room's own scene: the war table in the middle of the floor with the realm map laid whole on its top (pressing it takes up the map, as before), the notes on the left wall, the Clerk Table and Canonreeve's Desk at the foot, a hanging between two night windows on the back wall. The Scribe branch adds a Clerk Table list to `Solar.tsx`; its merge will need to place it in the pixel Clerk Table's card.

## 2026-11-02 - The pixel icons join main, and the cursor is a pixel gauntlet

The 35 icons, redrawn as pixel art with Thalmor gauntlets for the robed hands and the true Dominion eagle, were merged from their own branch. They were drawn in an alphabet of their own over the same 33 colours as the room; rather than redraw them in the room's letters, `test/pixel-icons.test.ts` holds the icons' colours to the room's palette, so the two cannot drift. The painted gauntlet cursor (2026-10-22) gave way to a pixel gauntlet after the icons' pointing hand: upright, one finger raised as the hotspot, black plate with a gold rim so it reads on the dark room and on parchment, at the same 40 CSS pixels, with copies at whole multiples for 1.5x, 2x and 3x screens so its pixels stay square. `scripts/prepare-cursor.mjs` was retired; the click spark is unchanged. The icons are not yet placed on any page.

## 2026-11-02 - The front page in pixel art, drawn in code

The team asked for the room in pixel art that does not look generated, with depth: a floor and side walls on the red lines they drew, pillars and potted plants. Generated and auto-downscaled pixel art gives itself away by uneven grids, mixed pixel sizes and soft edges, so every sprite is drawn in code on one grid and one palette of 33 hue-shifted colours (gold with blue only for magic), and shown only at whole multiples of the device pixel with `image-rendering: pixelated`. The room is a hall in one-point perspective whose floor tiles, panels and beams are projected pixel by pixel toward one vanishing point, with the furniture as sprites placed on an art-pixel grid (`web/src/pixel/layout.ts`). It fills one screen wherever the lettering stays legible and stacks on phones. The candles became drawn frames, which retired three.js. Ancarion was first pixelated live through the palette, and the globe redrawn as frames; the First Emissary had both put back as they were: Ancarion with his painted performances and the hinged door swing, and the Orrery's glass globe with the Wheel turning inside (anime.js, lazily). He hangs in the pixel frame and over the pixel plate, and the globe sits in a pixel cradle. A final look test at 1280x720 to 2560x1440, a phone and a tablet found the title's line unreadable on the gold cornice, the arch names too large and running into each other on phones, Ancarion's reply covering the Scribe Table, textured brass buttons on the Cabinet's slip, and Ancarion filling a tablet's screen; each was fixed. Painted image slots for the furniture (`assets/room/*.webp`) were retired with the SVG furniture.

## 2026-10-23 - The combined realm map, zoomed by real size

The First Emissary supplied one combined map of Skyrim and County Bruma (`Assets/Compined map.png`), which replaced the two charts laid together. It is only 1448 by 1086, so the viewer's image is drawn at twice that with a fine resampler and a light sharpen, and zoom stops at 4x. He also found pieces, their names and the map pixelated when zoomed in: the viewer scaled the whole map layer with a CSS transform (and `will-change`), so the browser enlarged a picture of it, pieces included. The map is now laid out at its zoomed size and only moved by a transform, so the browser draws the map from the full image and the pieces and names afresh at every zoom. No pieces were on the live table, so the change of map moved none.

## 2026-10-23 - Moving between places is one scene, and Ancarion's portrait is the Solar's door

The First Emissary found the changes between places stiff: after Ancarion's nod the room simply cut to the Solar. Every change of place (the room, a volume, the Gallery, the Penal Code, the Solar) now runs as a browser view transition (`web/src/transitions.ts`, the `::view-transition` rules in `base.css`): going deeper, the place left behind drifts toward the reader and fades as the next settles in; coming back out, the reverse. The router waits for the next place's chunk first (`setRoutePreparer`; App's views are `lazyView`s that render at once once preloaded, `web/src/lazyView.ts`), so a transition never lands on a loading notice. The room's takeovers keep their own grow-from-the-object animation and do not use it. A spine opens out into its book, and an archway's doorway comes up to meet the reader as they step through. At his direction the portrait itself is the Solar's door: after the nod the painting swings open on its left hinge onto a dim glimpse of the Solar beyond (its war table with the realm map, its furniture in shadow; `realm-map-glimpse.webp`), and while it swings the room rushes past through the opening into the Solar ("through"); coming back the reader arrives through the same opening and the painting swings shut behind them ("return"). The Solar opens at once when Ancarion has just admitted the reader, confirming with the server meanwhile, instead of showing a loading notice. Readers who ask for less motion, hidden tabs and browsers without view transitions change place at once, as before.

## 2026-10-23 - Ancarion keeps the Solar; the Cabinet keeps its own lock

At the First Emissary's direction, Ancarion's portrait opens the Solar, High Command's room, and his name plate became the place its word is spoken (`web/src/room/SolarPlate.tsx`). The Solar has a word, signing secret, cookie, epoch and throttle of its own (`SOLAR_PASSPHRASE`, `SOLAR_COOKIE_SECRET`, `thalmor_writ_solar`, `SOLAR_EPOCH`, `solar:`), so the Cabinet's word does not open High Command's room nor the Solar's the Cabinet; without its secrets it fails closed. The plate keeps the gate's ceremony (refusals, head-shake, sigh, nod) and a reader already holding the writ is let through from the portrait after a nod. A reader who reaches `/solar` without the writ is turned back to the room with the plate waiting (`web/src/solar-sealed.ts` hands the flag across the two chunks). The Cabinet keeps its gate on its own slip, with Ancarion no longer reacting to it. The sealed door to the Solar was taken down.

## 2026-10-23 - The Solar is furnished: the war table first

`/solar` is a page of its own, laid out after the First Emissary's sketch: notes at the left, the war table with the realm map at the head, the Clerk Table and Canonreeve's Desk at the foot. The map is Skyrim with the County Bruma chart laid over its southern edge where Bruma lies, as two sheets on a table (`scripts/prepare-solar-map.mjs`; `Assets/` holds the sources). Pressed, it spreads into a viewer that pans and zooms by hand (drag, wheel, pinch, keyboard) where Dominion pawns and points of interest are set down, dragged, renamed, annotated and taken up. The First Emissary chose to share the pieces with everyone admitted, so they live in D1 (`solar_pins`, in the existing `thalmor-reports` database rather than new infrastructure) behind the Solar writ, read again every thirty seconds and on focus; the Notes list every piece and open the map on it. He also chose to furnish the Clerk Table and Canonreeve's Desk now and wire them later: they stand with art ported from the Bruma Joint Archives and in-world notes of what they will do, and their work (stamping filings, notices, decrees, books, new markers) comes with the Librarian backend.

## 2026-10-23 - Every volume is a bound book, and none is sealed

The History, the Arrests, the Penal Code and the shelf's White-Gold Concordat are now read exactly as the Chronicles were: two leaves, a turning leaf, the scrying search and guided reading, through one component lifted out of the Chronicles (`web/src/books/BoundBook.tsx`), with each volume's text packed into leaves by `books/bind.tsx`. The Arrests' sieve became the book's search; the Bruma-ported measured reader was retired. The First Emissary removed Ancarion's gate from the Chronicles and chose to make the whole volume public, Latest Filings included: `/api/chronicle` needs no writ and may be cached for a minute, and its gate, `PortraitGate`, the Nirn sky behind it and the Chronicle cookie scope are gone. The `CHRONICLE_PASSPHRASE` and `GATE_SECRET` secrets are no longer read.

## 2026-10-23 - The room rearranged: candles, the note, the Cabinet, the globe

The animated torches gave way to the First Emissary's candle (`Assets/Candle.png`, cut by `scripts/prepare-candle.mjs`), one at either hand of the Scribe Table at about three fifths of its height (he asked for them smaller than first drawn). Their flames are a three.js shader (`web/src/room/candle-flame.ts`) imported only after the room paints, paused off screen and on a hidden tab, and replaced by the painted flame for readers who ask for less motion or have no WebGL; three.js is kept out of the entry and room chunks. The pinned note moved into the corner the Solar's door left beneath the bookshelf, and the Cabinet, drawn taller on turned feet, fills the right-hand column from the orb to the floor. The orb lost its brass rings and became a glass globe held in a brass cradle that turns slowly (drifting stars and sweeping meridians, still under reduced motion) with the orrery's wheel turning inside it. The bookshelf's spines lost their speckled leather texture, which read as a starry filter, and stay plain until the volumes have art of their own.

## 2026-10-22 - The Cabinet replaces the Reports register

At the First Emissary's direction the Scroll Rack became The Cabinet, after a library card catalogue, since the Embassy calls its reports letters. It has four drawers by age (Fresh! under a day, New to a week, Old to thirty days, Archive older), read from the register by date range and kept exactly by `drawerOf`. Pulling a drawer stands its letters like index cards, each sealed in its wing's colour and emblem with its title written on it; taking one out plays a short film: the envelope rises, its flap lifts, the letter slides out, the envelope falls away and the paper opens out of its three folds; Escape or Back folds it away in reverse, and readers who ask for less motion are handed the open letter. It replaces the Reports page (its list, search, filters and summary are retired from the site, though the API still serves them) and keeps its addresses: `/reports` is the Cabinet, `/reports/:id` a letter in it. The gate is unchanged: the same writ, asked in the room before Ancarion; a reader who arrives without it is turned back to the room with the Cabinet's slip open, and goes on to the letter after his nod.

## 2026-10-22 - The six wings seal the letters

Each letter is sealed by the wing it concerns, after the First Emissary's table: Intelligence (blue, eye), Military (red, crossed blades), Logistics (green, key), Diplomatic and Chancery Affairs (amber, laurel), Legal and Doctrinal Affairs (purple, scales), Scholarship and Arcane Affairs (teal, eight-pointed star). Reports still arrive under the collector's Discord categories, read into wings on the client (`shared/wings.ts`): Informants to Intelligence; Military to Military; Logistics, Supply and Mining to Logistics; Administration to the Chancery. Legal and Scholarship hold none until reports come under them. Only the Cabinet uses the wings; the collector, the API and the Scribe Table are unchanged.

## 2026-10-22 - The board's six sections; the Lectern is the Scribe Table

The bulletin board's sections are now Propaganda, Recruitment Posters, Festivities, Standing Orders, Spiritual Guidance and Bounties (kept, with its wanted posters); New Laws, Figures of Interest, Embassy Agenda, Bread & Circus and News are retired. The recruitment notice stands first in Recruitment Posters rather than over the whole board, and its count includes it. The Lectern is renamed the Scribe Table throughout (its plate, its takeover, the pinned note, `/scribe-table`, `RoomStatus.scribeTable`); `/lectern` still opens it.

## 2026-10-22 - The room, from the First Emissary's sketch

From his marked-up screenshot: Summerset-gold boughs reach in over both top corners and frame the title (decorative, swaying slightly, still for reduced motion, hidden on phones); the arches are sharper lancets and nearly as tall as Ancarion, their starlight now cut from the same curve the frame draws (`PORTAL_CLIP`); and the bookcase, the Solar's door, the board, Ancarion and the Scribe Table all grow, paid for by a tighter title and by running the grid to the floor, with only the two corner columns kept clear of the fixed seals. The rows became 20/16/28/4/4/28 so each column parts where the sketch parts it.

## 2026-10-22 - The cursor is a Thalmor gauntlet

The First Emissary's gauntlet (`Assets/cursor/thalmor gloves cursor.jfif`) is the archive's cursor everywhere: on the page and on every control, so links and buttons point with the same hand instead of the system's. The source is a JPEG with a transparency checkerboard painted into it, so `scripts/prepare-cursor.mjs` cuts the gauntlet out by its own dark silhouette and redraws the source's pale outline as a rim in the archive's gold, one CSS pixel wide; the white glint over the fingertip is left off, and nothing else is added. It leans 28 degrees to the left, as an arrow cursor does, so the fingertip is the top-left point and the hotspot. It is broadened 1.3 times across the hand before it leans, a heavier gauntlet than the drawing's slender one (asked for by the First Emissary the same day). It fits 40 by 40 (enlarged from 32 at the First Emissary's asking; Chromium hides cursors over 32px only where they cross its own UI at the window's edge), with a 2x copy for high-density screens through `image-set()`. Each mouse or pen click strikes a brief gold spark at the fingertip (`web/src/click-spark.ts`, styled in base.css): a span dropped at the pointer and removed after 600ms, never in the way of a click, and not struck at all for readers who ask for less motion. Every `cursor: pointer` and `cursor: default` in the stylesheets became `inherit`; text fields keep their I-beam and disabled controls keep `not-allowed`.

## 2026-10-20 - The torches stand outside the arches

Of three arrangements mocked on the live room (sconces beside Ancarion; torches outside the arches; torches either side of the board with the bookcase on the floor), the First Emissary chose the torches outside the arches: one stands on the floor line beside each arch, in the slack between it and the furniture at the wall, lighting the way in. The lectern stands alone. The torches are shown only on the one-screen wall, where that slack exists; narrower walls and phones go without them and fetch neither animated image.

## 2026-10-20 - The visitor counter is retired; the call for recruits is pinned to the board

At the First Emissary's direction the Register of Consultation (visitors counted by province, with flags) is removed entirely: its component, stylesheet, flag sprite and `prepare-flags.mjs`, its two Functions (`/api/register`, `/api/register/entry`) and `functions/lib/register.ts`, its tests, and the `REGISTER` D1 binding. It sat at the room's foot and pushed into the one-screen wall wherever the window was narrow for its height. The `thalmor-register` database and its migration are left untouched in Cloudflare and the repository. The recruitment notice the Gallery shed (the terms, the blessing, "Submit Your Oath" to the Dominion's form) is now a standing proclamation pinned at the head of the bulletin board, kept in the repository (`takeovers/Recruitment.tsx`) so it hangs before any officer has posted anything. The floor row deepened again (30u) so the lectern is larger still; Ancarion's rows gave up 3u for it.

## 2026-10-20 - The Gallery is only a gallery; torches, the Solar's door, and a face for the Embassy's name

At the First Emissary's review of the room: `/gallery` keeps only the Embassy's name with "Gallery" beneath it and the pictures (the assembled portrait, the film, the eight photographs); its statement, recruitment notice and application link, High Command seal, section bar and Penal Code links are gone, and the Dominion's name in its bar leads home. The Penal Code stays where it already was, a volume on the bookshelf. The Gallery's animated torches moved into the room, standing either side of the lectern in place of the candles; the lectern was enlarged, its plate moved onto the desk's front so its whole place goes to the lectern, and the floor row deepened. The Solar's signpost became a door: a sealed Altmer doorway with the Embassy's wax across the seam, which will open onto the map and the clerk's desk; until then it is a button that can be tried (its leaves strain against the seal) and says it is sealed, never a link. The Embassy's name is set in Cinzel Decorative, the swashed cut of the archive's Cinzel, larger, served from the archive's own origin (the Latin cut as packaged by Fontsource, under the OFL) beside the Cinzel and EB Garamond it already self-hosted. The Hall of Honors no longer depends on the sheet: everything it shows is kept in the repository, so a sheet that cannot be read now costs only the "transcribed from" footnote rather than the whole page.

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

## 2026-11-02 - The Scribe draws parchments in a Worker of its own

The report writer (Workstream 3) draws each filing as a parchment PNG in code: satori lays it out and resvg-wasm rasterises it, in `scribe/`, a Worker the Pages project will call by service binding. A separate Worker because resvg alone is about 2.5 MB of WebAssembly, which would weigh on every Pages Function, and because the renderer then has no public door. The PNG is always re-drawn from the stored fields, so the Clerk's stamp is a re-render, not a second stored image; the torn edge is seeded from the filing and the foot is reserved at a fixed height, so stamping changes nothing but the stamp. The sheet is generated arithmetic (no AI, no stock art) and made once per page height, because resampling a stretched sheet was two thirds of resvg's time. Measured: a 1.53 MB gzip bundle (under the free plan's 3 MB) and about 0.5–0.9 s of CPU a page once warm. That is far beyond the free plan's 10 ms of CPU, so the parchment route must cache at the edge and the Scribe assumes the paid plan. Faces (OFL, from Fontsource): Mr De Haviland for the signature, IM Fell English SC printed, Caveat for the body, pending the team's choice on the sample sheet. Open filings (Applications, Public Requests) cannot be marked Strategic or Cataclysm, so nobody outside the Embassy can summon it.

## 2026-11-02 - The Scribe's two doors, codes and the Clerk Table

`add-scribe`, steps 2 to 6. The website's identity is a personal code from the bot (`/archives code`), as in the Bruma Joint Archives, rather than a Discord login: no OAuth client to keep, and the roles stay the authority because Discord is asked again on every use. The seal cookie is signed under a key derived from `CODE_PEPPER` rather than a secret of its own, so changing the pepper retires codes and seals together. A code fills in rank and name but both stay editable, so the bot names the filer's Discord account in its post: a filing that can call every member is never anonymous on Discord, though the id is never served by the site. Applications and Public Requests come from outside the Embassy, so they need no code, are throttled per address, and cannot be Strategic or Cataclysm. Reports enter the Cabinet's `reports` table directly (`scribe-<n>`) under their wing's own name, which `wingOf` reads, rather than through the collector, which skips bot posts. Strategic and Cataclysm reports also wait at the Clerk Table until High Command stamps them: the plan's "reports awaiting a stamp". Rejected: storing rendered PNGs (R2), since every parchment can be drawn again from its fields and the edge cache keeps the drawing. The Scribe is a Discord application of its own. Sharing the collector's was the first choice, but that application (Archivist Ancarion) already sends its interactions to the quartermaster Worker (/clockin, /stock and the rest), and an application has one interactions endpoint; forwarding through the archive was rejected because clock-ins would then fail whenever the archive does. Its token is `SCRIBE_BOT_TOKEN`, named apart from the collectors' `DISCORD_BOT_TOKEN` so the two cannot be swapped. The collector skips its posts as it does any bot's.

## 2026-11-03 - The Scribe runs on Archivist Ancarion; the archive relays the quartermaster

Supersedes the Scribe's own application (2026-11-02, e61bb3b). The team chose the Embassy's established bot, Archivist Ancarion, for the Scribe. An application has one interactions endpoint and Ancarion's was the quartermaster Worker's; the quartermaster's source is not kept here, so the archive becomes the endpoint. `functions/api/discord/interactions.ts` checks the signature, answers PING, keeps `/archives`, `/report` and any `scribe:` component or modal, and hands every other interaction to `QUARTERMASTER_INTERACTIONS_URL` byte for byte with Discord's two signature headers, so the quartermaster's own check still passes; its answer is relayed as given (a 5xx, an error or no answer within 2.5 s becomes a plain ephemeral message, inside Discord's three seconds). The forward comes before anything the Scribe needs is consulted, so clock-ins work whether or not the Scribe is configured. Accepted knowingly: clock-ins now fail when the archive does. The token is `DISCORD_BOT_TOKEN` again, the name the collectors use; in the repository's `.env` the live copy is `DISCORD_TOKEN` and `DISCORD_BOT_TOKEN` is revoked, so `scripts/discord-setup.mjs` tries both and says which Discord accepts. Ancarion already holds every permission the Scribe posts with in all eleven archive channels (`discord-setup.mjs permissions`), so it needs no new invite.

## 2026-11-03 - The parchment is drawn in the reader's browser; the Scribe's Worker is dropped

Supersedes the drawing half of "The Scribe draws its parchments in code" (2026-11-02). The account is on the Workers Free plan, which allows 10 ms of CPU a request; satori and resvg took 500 to 900 ms a parchment, so no server-side drawing fits, and the team chose to stay free. The `scribe/` Worker, its `SCRIBE` service binding, `POST /api/scribe/preview` and `/api/filings/:id/parchment.png` are gone, with satori and resvg-wasm. The same sheet (the measures in `web/src/scribe/sheet.ts`, the paper in `web/src/assets/scribe/`) is now laid out by the browser as HTML in `web/src/scribe/Parchment.tsx`: the body's page and hand are estimated, then measured once the fonts are in. No WebAssembly is involved, so the content policy is unchanged, and the writing is real text. The Scribe Table previews in the browser, the Clerk Table draws each filing it is sent, and `/filings/:id` (`GET /api/filings/:id`, behind the same writs) is the page the bot links to. Discord gets no image: a picture drawn in a member's browser could not be trusted for the bot to post, so every post, the `/report` preview included, is an embed of the parchment's parts with a "Read the parchment" link, and a verdict links to the stamped parchment.

## 2026-11-03 - A report is a wing and a kind; the Auxiliary wing; a channel per wing

The team's reporting structure (two tables, `report categories/` in the main checkout) replaces the Scribe's nine report kinds (Troops Report, Patrol Log, Lesson Log and the rest). A report now names its wing (Embassy, Intelligence, Military, Logistics, Auxiliary; the Embassy's is the Cabinet's Diplomatic wing) and one of eight kinds every wing shares (Activity, Incident, Investigation, Operation, Intelligence, Inspection, Personnel, Administrative); Bulletin Posts, Applications and Public Requests are unchanged. The filing keeps `category` (`report`, `bulletin`, `application`, `public-request`) and gains `wing` and `kind`, null for anything not a report; migration 0006 was edited in place, as it had not been applied remotely. The Cabinet entry's category is the wing, its subcategory the kind ("Incident Report"). The Auxiliary is a new seventh wing (`shared/wings.ts`), bronze wax and, until the room draws it one, the Military's blades. The bot posts a report to its wing's channel: five made by `scripts/discord-setup.mjs archive-channels` in the Archive category (1565081105462202500), each with the category's own permissions, so as private as it is. Their readers are the team's choice: Thalmor High Command, the First and Second Emissary and the ten department heads the Strategic level summons, who may read and reply (`archive-readers`); no wing reads its own channel as such. Legal and Scholarship stay Cabinet wings for collected reports but are not offered to the Scribe's filers.

## 2026-11-13 - One report-id rule for the Cabinet route and the API

A fresh Scribe filing opened at `/reports/scribe-41` answered "No such volume". The Scribe files into the Reports table under `scribe-<n>` (`cabinetEntry`, `functions/lib/scribe.ts`), but both the browser route and `GET /api/reports/:id` accepted only digits, so the report existed and could not be opened by address. The rule is now one definition, `isReportId` in `shared/reports.ts` (`\d{1,24}` or `scribe-` and a filing number with no leading zero), used by `web/src/router.ts` and the endpoint. An isolated bug fix, so no OpenSpec proposal. Invariants kept: the Reports writ is checked before the id, every status still answers through `reportsJson` (private, no-store, `Vary: Cookie`), and a malformed id still never reaches D1. No member data, Sheets scope, KV/D1 schema or public asset is touched.

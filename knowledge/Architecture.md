# Architecture

![[dossierdiagram.png]]

## Entry path

`web/src/main.tsx` starts the SPA. `web/src/App.tsx` chooses the Embassy room, the Gallery, Reports, a lazy volume view, or the dev-only editor. `web/src/router.ts` maps `/` (the room) and the room's own surfaces `/bookshelf`, `/bookshelf/:slug`, `/board`, `/board/:section` and `/lectern`, plus `/gallery`, `/archives/:slug`, `/reports` (with its filters held in the query string), `/reports/:id` for a single filing, and development-only `/editor`. The retired mini-game and its route are intentionally absent from production and source.

There is no navigation rail and there are no painted covers (both retired 2026-10-20). The home page is the Embassy room (`web/src/room/`, a lazy chunk whose import App.tsx starts at module scope), the way into every page: a frameless dark wall after the First Emissary's drawing — bookshelf (Realm History, Chronicles, Arrests, Penal Code, White-Gold Concordat, as leather spines), bulletin board, the in-world clock with the orrery as a brass orb beneath it (an instrument, not a link), two elven archways (Roster & Chain of Command; Gallery & Hall of Honors), Ancarion, the Scroll Rack, the lectern between two animated torches with its pinned note, and the sealed door to the Solar (the future map and clerk's desk: a button that can be tried, never a link, until it is built). On any landscape screen 1024px or wider the room is exactly one screen, wall to wall: every object is sized in `--u`, a hundredth of the height the grid may have (room.css "One screen"), and the slack is spread between the furniture rather than left at the edges; portrait screens and phones keep the scrolling stack. Objects that lead to existing pages navigate there; the room's own surfaces open over it as Bruma-style takeovers with their own URLs. The old hero is `/gallery`, cut down to the Embassy's name, "Gallery", and the pictures (portrait, film, gallery), with the Dominion's name in its bar leading home; the consultation register sits at the room's foot. The room is built on the Bruma Joint Archives' room; until the Librarian backend lands, `/api/room/*` answers a JSON 404 and the board and lectern show their empty states. Every other page's first control is "Return to the Embassy". `PortraitGate` is a shared lazy presentation layer for `/archives/informants` and `/reports`; it submits only to the respective existing server-verified gate and is not a second authentication mechanism. Ancarion's performance lives in `web/src/components/useAncarion.tsx` (his pure rules in `ancarion-script.ts`), so the room's Scroll Rack directs the same performer: it submits to the existing Reports gate, and instead of his door it is the rack's doors that swing.

Production is served from `https://thalmor-archives.com`. The root Pages middleware permanently redirects only `thalmor-archives.pages.dev`, preserving the path and query; branch-preview hostnames remain reachable so each feature can be tested before release.

The same root middleware applies the browser-security header set in `functions/lib/security.ts` to static, API, and redirect responses. `public/_headers` mirrors that policy for Pages static handling and gives immutable caching only to Vite-fingerprinted `/assets/*` files. Route-owned cache headers are never replaced.

## Runtime boundaries

| Boundary | Owns | Cannot do |
|---|---|---|
| Browser (`web/`) | Reading experience and presentation | Access secrets or sealed text |
| Pages Functions (`functions/`) | Same-origin API, Sheets reads, gate, register read/write | Write the community sheet or run cron jobs |
| Shared (`shared/`) | Pure contracts and transformations | Depend on browser or Cloudflare-only APIs |
| Server (`server/`) | Google Sheets transport | Write Sheets |
| Chronicler (`chronicler/`) | Scheduled Discord collection into KV | Publish to Discord or compose the Chronicle |

## Archive content

The registry combines sheet-backed `VOLUMES` (now the Roster, the Chain of Command and the Hall of Honors; the Ledger, the Registry and the Calendar were retired 2026-10-20), repository-held `KEPT` volumes, and server-served `SEALED` volumes. Treat this classification as a security and deployment decision, not a display detail.

## Diagram trace

The supplied dossier diagram is preserved as [dossierdiagram.png](dossierdiagram.png) and represented in [CODEX.md](../CODEX.md) as a Mermaid topology. Its client/App/router/volume shelf nodes correspond to `web/src`; its volume route/data route/sheet reader nodes correspond to `functions/`, `server/`, and `shared/`; its Chronicle reader/gate/KV/nightly collector nodes correspond to `functions/api/chronicle/` and `chronicler/`.

# Add the Embassy Room

## Intent

Replace the scrolling hero at `/` with a single "room" of objects, modelled on
the Bruma Joint Archives room and re-themed in the Embassy's black and gold:
bookshelf, bulletin board (Bruma's whole board, bounties included), the
in-game clock and a brass orb, two starlit archways, Ancarion in the centre,
the Scroll Rack he guards, the Lectern with its pinned note, and a signpost to
the Solar (a later page). The old hero moves to `/gallery`.

Approved plan: `C:\Users\Salazar\.claude\plans\massive-rehaul-to-the-frolicking-acorn.md`.
This change is **Phase 1**. Phase 2 (the Librarian backend: codes, filings,
clerk, board posting, shelved books) is a separate change,
`add-librarian-backend`.

## Scope and invariants

- **No Sheets, D1 or KV change. No new secrets. No new write endpoint.**
  Member data is rendered exactly as before; the room only links to the
  existing volumes.
- **Gates.** The Scroll Rack opens on the existing Reports writ through the
  existing `POST /api/reports/gate`; the server side is unchanged. `/reports`,
  `/reports/:id` and `/archives/informants` keep their full PortraitGate.
  Ancarion becomes a shared performer (`useAncarion`), never a shared writ:
  each gate keeps its own adapter and cookie.
- **Entry chunk.** The room, the orb (anime.js), Ancarion's media, the books
  and every takeover are lazy chunks; the entry chunk stays under the
  ceilings in `test/bundle.test.ts`.
- **anime.js** stays confined to the calendar's instruments, which now include
  the room's orb, in its own lazy chunk.
- **Optional infrastructure degrades quietly.** Until Phase 2, the board and
  the lectern ask `/api/room/*` and receive a JSON 404, and show their empty
  states. An unknown `/api/*` path answering `index.html` with 200 would be
  misread as data, so the root middleware now answers it with a JSON 404.
- **Assets.** Bruma's race sketch portraits and SVG textures are the same
  owner's work, copied with provenance recorded in the Decision Log.

## Out of scope

Phase 2 (Librarian backend and the Bruma-side forwarder), the Solar page,
painted art for the room's image slots, committing, pushing and deploying.

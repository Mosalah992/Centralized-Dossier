# Tasks — Embassy Room (Phase 1)

Status: complete — Phase 1 plus revision 2 (no frame, no rail, no covers, Calendar/Ledger/Registry retired, elven arches) built, tested (420/420) and verified by the interactive session (2026-10-20 02:45 +03:00). Not committed or deployed. See report.md.

Baseline (2026-10-19, before changes): 409 tests pass; entry chunk
`index-*.js` 254,938 B raw / 89,939 B gzip (ceilings 265,000 / 92,000).

## 0. Baseline
- [x] Branch `room-rehaul`; `npm run verify` green; record entry size
- [x] OpenSpec change (proposal, requirements, tasks)

## 1. Ancarion performer
- [x] `web/src/components/useAncarion.tsx`: portrait state machine, clips, idle rotation, doze/wake, voice, aura, media JSX; `preload: 'eager' | 'deferred'`; `warm()`
- [x] `PortraitGate.tsx` uses the hook; gate behaviour unchanged
- [x] Move media rules to `web/src/styles/ancarion.css` (class names unchanged)
- [x] Update `test/archive-interactions.test.ts` to read gate + performer

## 2. Routing and the Gallery
- [x] `router.ts`: `room` (open/sub), `gallery`; takeover-aware navigate
- [x] `web/src/views/Gallery.tsx` (moved from `components/Shelf.tsx`, minus Register); `gallery.css` from `shelf.css`
- [x] `App.tsx`: lazy Room with prefetch, lazy Gallery, skeleton, titles; keep `support-seal` / `site-footer`
- [x] `main.tsx`: drop `shelf.css` / `register.css`

## 3. The room
- [x] `web/src/room/Room.tsx` (RoomObject inline), `nav.tsx`, `ImageSlot.tsx`, `art.tsx`, `room.css`
- [x] `Archway.tsx` (starlight + aurora, two plaques)
- [x] Pinned note and Solar signpost (inline in `Room.tsx`)
- [x] Register in the room footer

## 4. Rack, clock, orb
- [x] `RoomPortrait.tsx` (performer handle) and `ScrollRack.tsx` (slip, reactions, doors, `/reports`)
- [x] `RoomClock.tsx` + `clock-format.ts`
- [x] `RoomOrb.tsx` (wraps the calendar Orrery, lazily, so anime.js stays in its own chunk) + `orb.css`

## 5. Takeovers
- [x] `Takeover.tsx` + `takeover.css`
- [x] Bookshelf (volumes, Penal Code, White-Gold Concordat) + `BookReader` + `paginate`
- [x] `scripts/emit-books.mjs`, `content/books/sources/white-gold-concordat.md`, `web/src/books/*`, `shared/books.ts`, `shared/document.ts`
- [x] Bruma's Board: sections, notice cards, wanted posters (`Poster.tsx`), race portraits in `public/art/portraits/`, `board-seen.ts`
- [x] Lectern shell ("awaits its consecration")
- [x] `shared/room.ts`, `web/src/room/room-api.ts`

## 6. Server guard, tests, docs
- [x] Unknown `/api/*` → JSON 404 (`functions/_middleware.ts`, `functions/lib/assets.ts`)
- [x] Update `test/site-hardening`, `test/bundle`, `test/asset-fallback`; new `room`, `board-seen`, `clock-format`, `books` tests
- [x] Docs: CODEX.md, knowledge/Architecture, Invariants #7, Integration Contracts, Decision Log

## 7. Verify and report
- [x] `npm run typecheck`; `npm run verify`; entry 243,432 B raw / 85,716 B gzip
- [x] Preview at 1600/1440/1024/375; keyboard; deep links (screenshots inspected in-session, not saved)
- [x] Rack flow on `reports-local` (refusals, acceptance, writ)
- [x] `report.md`

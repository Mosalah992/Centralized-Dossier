# Requirements — Embassy Room

## The room is the first screen
- `/` renders the room inside a gold frame. Objects: Bookshelf, Bulletin
  Board, Clock and Orb, left Archway (Troops Roster, Chain of Command),
  Ancarion, right Archway (Gallery, Hall of Honors), Scroll Rack, Lectern,
  pinned note, Solar signpost.
- Every object is reachable and operable by keyboard, has a visible name, and
  has a reduced-motion rendering with no looping animation.
- At phone widths the room stacks into two columns without horizontal scroll.

## Objects that lead to existing pages navigate
- Spines → `/archives/*` and `/penalcode`; arch plaques → the two pages each
  arch names; the orb → `/archives/calendar`; the rack → `/reports`.

## The room's own surfaces open over it
- `/bookshelf`, `/bookshelf/:slug`, `/board`, `/board/:section`, `/lectern`
  open as takeovers over an inert room; Escape, the close seal and Back close
  them; a deep link opens the takeover directly.

## Ancarion performs for the Scroll Rack
- Choosing the rack without a Reports writ asks for the Reports passphrase.
  A wrong word plays the gate's escalating refusals (narrowed eyes, head-shake,
  sigh); the right word plays the acceptance, then the rack's doors open and
  the reader enters `/reports`. With a valid writ the doors open at once after
  a brief acknowledgement. Reaction clips are not downloaded before the reader
  approaches the rack.

## The board is Bruma's board
- Six sections (bounties, new laws, figures of interest, Embassy agenda, bread
  and circus, news); bounties render as wanted posters. Notices the reader has
  not seen are marked new, per browser. With no backend the board is empty and
  says so.

## Old hero content is kept at `/gallery`
- Mission, embassy portrait, film, gallery, recruitment; the Register of
  Consultation sits in the room's footer.

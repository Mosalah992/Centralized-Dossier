# Nirn sky behind the Reports gate, and a centred portrait gate

## Outcome

The portrait gate is reduced to the essential: Ancarion's portrait centred,
with the passphrase field, its button and a status line beneath it. The
title, description and spoken line beside the portrait are removed (kept for
screen readers), leaving the background open. Behind the **Reports** gate a
live Nirn sky — Nirn, Masser and Secunda — rises and turns, with a still plate
for phones, reduced-motion readers and browsers without WebGL2. The
Chronicles gate gets the same centred layout without the sky.

Added during implementation at the owner's request: Masser and Secunda orbit
Nirn; Magnus and the eight Divine planets (the orrery's sprites) stand on the
left, the Divines slowly orbiting Magnus; a denser, mostly faint starfield.

## Why

The two-column gate split attention between a text panel and the portrait,
and left no room for the setting. The handoff (`HANDOFF.md`,
`nirn-sky-handoff/`) supplies a tested sky for the Reports gate.

## Scope and boundaries

- **Gate:** presentation only. The gate adapters, `/api/*/gate` endpoints,
  passphrase checks, writs, throttles and cookies are untouched.
- **Sheets, member data, KV/D1:** not touched.
- **New dependency:** `three@0.186.1` (exact), reached only through a dynamic
  `import('../sky/nirnScene')` in `NirnSky`, so it ships in its own chunk and
  only to readers who reach the Reports gate. This reverses the recorded
  "no Three.js" decision for this one surface; `test/bundle.test.ts` asserts the
  entry chunk carries none of it.

## Invariants at risk

- *Entry chunk stays lean* — three only behind a dynamic import; bundle test.
- *Gate accessibility* — the removed copy stays available to assistive
  technology: the collection name as a visually hidden `h1`, the label as a
  visually hidden `<label>`, and Ancarion's line in a polite live region.
- *Reduced motion* — the still plate replaces the live scene.

## Verification

`npm run verify` and `npm run typecheck`; in a browser: the live sky on a
desktop GPU, the still plate when WebGL is unavailable, no sky below 721px,
both gates centred with the field under the portrait, no WebGL context
warnings after opening and leaving Reports repeatedly.

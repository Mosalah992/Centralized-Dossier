# Tasks

- [x] Install `three@0.186.1` and `@types/three@0.186.0`, pinned exactly.
- [x] Apply the handoff patch; carry the `Reports.tsx` `sky` prop by hand.
- [x] Centre the gate: single column, field/button/status under the portrait, copy visually hidden but accessible.
- [x] Adjust tests for the centred gate; keep the three.js and bundle assertions.
- [x] `npm run verify` and `npm run typecheck`.
- [x] Verify in a browser: live sky, fallback, no sky below 721px, both gates centred, no WebGL context warnings on repeat visits; record what was verified.

- [x] Moons orbit Nirn; Magnus and the eight Divines on the left, orbiting Magnus; denser starfield; brighter disabled button.

## Verified locally (2026-10-06)

- Live WebGL2 sky renders behind the centred Reports gate at 1440px; Nirn, moons and the Magnus system stay clear of the portrait and field.
- Moons and Divine planets visibly advance along their orbits over 10 s.
- Below 721px: no sky and no canvas; gate centred; no horizontal overflow.
- Chronicles gate: centred, no sky.
- Four round trips into and out of Reports leave one canvas and no WebGL context warnings.
- `npm run verify` (403 tests, bundle test included) and `npm run typecheck` pass. three ships in its own 142 KB gzip chunk.
- Not exercised: the still plate on a reduced-motion or touch device (covered by the mode tests; CSS and assets checked).

## Verified against production (2026-10-06)

- New entry script, `nirnScene` and `PortraitGate` chunks served as JavaScript from the deployment URL and from thalmor-archives.com.
- `/reports` on thalmor-archives.com: title "Third Aldmeri Dominion / High Command Reports", live Nirn sky ready, centred gate, no console errors.
- `/api/reports`, `/api/reports/summary` (401) and `/api/chronicle` (403) keep `Cache-Control: private, no-store` and `Vary: Cookie`.

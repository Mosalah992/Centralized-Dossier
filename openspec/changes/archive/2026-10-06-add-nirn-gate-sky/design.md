# Design

- **Sky:** applied from `nirn-sky-handoff/nirn-sky.patch` (authored against
  `53d2384`): `web/src/sky/nirnScene.ts`, `web/src/sky/skyMode.ts`,
  `web/src/components/NirnSky.tsx`, `web/src/styles/nirn-sky.css`, an opt-in
  `sky` prop on `PortraitGate`, and its tests. The `Reports.tsx` hunk is applied
  by hand, since that file was rewritten after `53d2384`.
- **Composition:** the handoff's "beside the portrait" view is kept — Nirn
  right of centre, Masser upper left, Secunda above. With the copy panel gone
  the planet stands in open space to the right of the portrait.
- **Centred gate:** `portrait-gate.css` becomes a single centred column. The
  copy block keeps its DOM (status line, form, skip control) but the eyebrow,
  description and dialogue become visually hidden, and the `h1` is visually
  hidden. The handoff's dark panel behind the copy is dropped — there is no copy
  to back.

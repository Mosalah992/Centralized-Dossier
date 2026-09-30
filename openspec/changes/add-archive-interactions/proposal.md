# Proposal: Archive interaction systems

## Intent

Add a persistent collapsible archive navigation rail, restrained expandable dossier cards, and an animated circular Archive Seal on the Reports gate. The work extends the existing cabinet, volume, and Reports surfaces; it does not introduce a dashboard or replace the archive's ceremonial visual language.

## Boundaries

- Browser presentation only. This change does not alter the Sheets scope, Pages APIs, D1, collector, member-data fields, or either gate's server-side behavior.
- Navigation is generated from the existing `SHELF` registry and existing routes. The sidebar's search filters destinations; it does not claim to search unloaded private records.
- The Reports seal remains a presentation layer over the existing server-verified passphrase form.
- GSAP remains the general motion system. anime.js stays calendar-only, and Three.js is not added.
- Reduced motion keeps every interaction functional without ambient or staged movement.

## Verification

Verify keyboard operation, touch disclosure, current-route state, persisted desktop preference, mobile Escape/backdrop/scroll-lock behavior, reduced motion, and layouts at 1920, 1440, 1024, 768, 430, and 390 pixels. Run `npm run verify` and inspect a preview deployment before production.

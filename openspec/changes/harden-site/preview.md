# Preview verification — 2026-09-30

Preview: `https://feature-site-hardening.thalmor-archives.pages.dev`

- `/` and `/reports` serve the verified Vite 7 build.
- The entry bundle contains the Ko-fi destination and no retired game identifiers.
- Page, asset, and Function responses carry the policy from `functions/lib/security.ts`.
- Fingerprinted `/assets/*` responses carry `public, max-age=31536000, immutable`; HTML does not.
- Unauthenticated `/api/reports` fails closed in preview because preview secrets are absent and retains `Cache-Control: private, no-store` plus `Vary: Cookie`.
- The build emits no game chunk, spellcraft model, sprites, or game audio.

# Architecture

![[dossierdiagram.png]]

## Entry path

`web/src/main.tsx` starts the SPA. `web/src/App.tsx` chooses the shelf, Reports, a lazy volume view, or the dev-only editor. `web/src/router.ts` maps `/archives/:slug`, `/reports`, and development-only `/editor`. The retired mini-game and its route are intentionally absent from production and source.

The archive shell also owns a collapsible navigation rail generated from `shared/volumes.ts`, so it cannot drift into invented destinations. On mobile the same navigation becomes an off-canvas drawer. `PortraitGate` is a shared lazy presentation layer for `/archives/informants` and `/reports`; it submits only to the respective existing server-verified gate and is not a second authentication mechanism.

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

The shelf combines sheet-backed `VOLUMES`, repository-held `KEPT` volumes, and server-served `SEALED` volumes. Treat this classification as a security and deployment decision, not a display detail.

## Diagram trace

The supplied dossier diagram is preserved as [dossierdiagram.png](dossierdiagram.png) and represented in [CODEX.md](../CODEX.md) as a Mermaid topology. Its client/App/router/volume shelf nodes correspond to `web/src`; its volume route/data route/sheet reader nodes correspond to `functions/`, `server/`, and `shared/`; its Chronicle reader/gate/KV/nightly collector nodes correspond to `functions/api/chronicle/` and `chronicler/`.

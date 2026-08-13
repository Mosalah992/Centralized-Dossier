# Centralized Dossier — Thalmor Embassy Archives

Public web archive for the Keizaal Public 2 Server Thalmor Embassy, reading the
live [Corps roster sheet](https://docs.google.com/spreadsheets/d/1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0/edit).
Six volumes on a shelf; opening one renders that tab as an in-world ledger.

Deploys to **thalmor-archives.pages.dev**.

## Architecture

The **Google Sheet is authoritative.** The `thalmor-quartermaster` Worker
([Thalmor-HR-](https://github.com/Mosalah992/Thalmor-HR-)) already writes to it
on Discord commands and Monday crons. This project is a separate repository with
its own deploy and is **read-only**, so it can never race those writes.

```
Discord ──/clockin──▶ thalmor-quartermaster ──writes G,H,J,K──┐
          (separate repo, untouched)                          ▼
                                              ┌───────────────────────────┐
                                              │   Google Sheet            │
                                              │   AUTHORITATIVE           │
                                              └───────────────────────────┘
                                                              ▲
Browser ──▶ Cloudflare Pages ──────────────────────────────── │
            ├─ / …          React + TS + Vite (web/)          │
            └─ /api/* …     Pages Functions (functions/) ──────┘
                              ├─ Cache API: 60s per volume
                              └─ readonly Sheets scope
```

The API is Pages Functions rather than a second Worker, so the site and its API
share one origin: no CORS, one deploy, and phase-2 session cookies stay
same-origin.

| Directory | What it is |
|---|---|
| [shared/](shared/) | Pure parsing and the volume registry. No I/O, used by both halves. |
| [server/](server/) | Sheets client and volume loading. Cloudflare runtime. |
| [functions/](functions/) | HTTP routes — `/api/volumes`, `/api/volumes/:slug`. |
| [web/](web/) | The React archive. |
| [scripts/](scripts/) | Local recon and dev-secret helpers. |

## Volumes

| Volume | Tab |
|---|---|
| Troops Roster | `Roster` |
| Roster Statistics | `Stats` |
| Financial Ledger | `Ledger` |
| Stipends Registry | `Stipends` |
| Hall of Honor | `Hall of Honor` |
| Tamrielic Calendar | `Tamrielic Calendar 4E 226` |

Tabs are resolved **by title, not gid** — see
[docs/sheet-schema.md](docs/sheet-schema.md) for why, and for the parser
contract of every tab. A volume whose tab has been renamed or deleted stays on
the shelf marked withdrawn rather than breaking the page.

## Running it

Pinned to **Node 18.20.7** (see [.nvmrc](.nvmrc)) so the clock-in bot's
toolchain is untouched — hence Vite 5 and wrangler 3.

```bash
npm install
cp .env.example .env          # then point it at the service-account key
node scripts/make-dev-vars.mjs # writes .dev.vars for wrangler

npm run build && npm run pages:dev   # whole site + API on :8788
```

For UI work, run both and let Vite proxy the API:

```bash
npm run pages:dev   # API on :8788
npm run dev         # UI on :5173, proxies /api to :8788
```

```bash
npm test        # 53 unit tests
npm run typecheck  # both tsconfigs — browser half and Workers half
npm run dump    # re-dump every tab to tmp/ after a sheet change
```

## Deploying

```bash
npx wrangler pages secret put GOOGLE_SERVICE_ACCOUNT_JSON
npm run build && npm run pages:deploy
```

`SHEET_ID` is a plain var in [wrangler.toml](wrangler.toml); the service-account
key is the only secret. The key, `.env`, `.dev.vars` and `tmp/` are git-ignored —
`tmp/` holds real member data.

## Status

Phase 1 (read-only archive) is built. Phase 2 — Discord OAuth, guild-role
authorization, an audit log and write-back — is designed but not started.

# Centralized Dossier — Thalmor Embassy Archives

Public web archive for the Keizaal Public 2 Server Thalmor Embassy, reading the
live [Corps roster sheet](https://docs.google.com/spreadsheets/d/1KS__WJoqI_o3esXxO3Ei3L6SlJwJnOXQrjEr-FCPEZ0/edit).
Six volumes on a shelf; opening one renders that tab as an in-world ledger.

## Architecture

The **Google Sheet is authoritative.** The `thalmor-quartermaster` Worker
([Thalmor-HR-](https://github.com/Mosalah992/Thalmor-HR-)) already writes to it
on Discord commands and Monday crons; this site is a second, independent reader
so a deploy here can never disturb that.

```
Discord ──/clockin──▶ thalmor-quartermaster ──writes G,H,J,K──┐
                                                              ▼
                                              ┌───────────────────────────┐
Browser ──▶ Cloudflare Pages                  │   Google Sheet            │
            (React + TS + Vite)               │   AUTHORITATIVE           │
                 │                            └───────────────────────────┘
                 └─ /api/* ──▶ archives Worker ──reads──────────┘
                                  ├─ Cache API: 60s per tab
                                  └─ D1: audit log (phase 2)
```

Phase 1 is **read-only** — the Worker issues GET requests only. Phase 2 adds
Discord OAuth, guild-role authorization, an audit log, and write-back.

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
contract of every tab.

## Scripts

```bash
node scripts/dump-tabs.mjs   # re-dump every tab to tmp/tabs/ after a sheet change
```

Needs `.env` (copy [.env.example](.env.example)) pointing at the service-account
key. The key, `.env`, and `tmp/` are git-ignored — `tmp/` holds real member data.

# Agent Operating Manual

This repository is **Thalmor Embassy Archives**: a public, read-only archive over a roleplay-community Google Sheet. It is a Vite + React SPA, deployed with Cloudflare Pages Functions, plus a separate scheduled Cloudflare Worker for Discord filings.

Start every task with [CODEX.md](CODEX.md), then open only the linked note(s) in [knowledge/](knowledge/README.md) that cover the subsystem being changed. This is the project’s durable, Markdown-first agent memory; Obsidian is the optional local navigator, not a second source of truth.

## Non-negotiable boundaries

- The spreadsheet is authoritative. `server/` and `functions/api/volumes/` only read it. The separate `Thalmor-HR-` bot owns Roster columns G, H, J and K.
- Public means anyone with the link can read the regular volumes. `noindex` is not access control.
- `chronicle` is the sole word-protected volume. Its server response must retain `Cache-Control: private, no-store` and `Vary: Cookie`; its text must never enter the browser bundle.
- `CHRONICLE_FILINGS` is written only by `chronicler/` and read only by Pages Functions. The collector reads Discord; it never posts to Discord.
- The consultation register is intentionally minimal: country totals only, with atomic D1 increments. Do not turn it into visitor tracking.
- Never commit secrets, private chronicle/enforcement source, sheet dumps, or unlicensed assets. `.env`, `.dev.vars`, `credentials/`, `tmp/`, and the ignored content files are sensitive.

## Change routing

| If the task changes… | Begin with… | Preserve… |
|---|---|---|
| Shelf, routing, a view, or styles | `web/src/App.tsx`, `router.ts`, the relevant view and CSS | Lazy chunks, reduced motion, bespoke CSS and Fluent controls only |
| A sheet-backed volume | `shared/volumes.ts`, parser, `server/gsheets.ts`, API route | Title-based tab lookup, read-only Sheets scope, withdrawn-on-missing-tab behavior |
| Chronicle, enforcement, session, or cache | `functions/api/chronicle/`, `functions/lib/session.ts` | Per-volume seal, private/no-store response, no secret/client-text leakage |
| Discord filings | `chronicler/src/index.ts`, `shared/filings.ts`, `functions/api/chronicle/index.ts` | Shared KV ID, redaction, bounded subrequests, graceful absence |
| Assets, covers, flags, or audio | Matching `scripts/prepare-*.mjs` and generated output | Reproducible script + committed output; verify licensing first |
| Data/schema assumptions | `docs/sheet-schema.md` and the corresponding tests | Sheet is rendered as recorded; do not silently reconcile contradictions |

## Working protocol

1. Read `CODEX.md` and the narrowest linked knowledge notes before editing. Search before asking where a behavior lives.
2. State whether the task touches member data, Sheets scope, the Chronicle gate, KV/D1, or public assets. If it does, cite the relevant invariant in the implementation note or PR.
3. Make the smallest coherent change. Comments explain irreversible reasoning and tradeoffs, not line-by-line mechanics.
4. Run `npm run typecheck` and `npm test`; use `npm run build` for browser-bundle or routing work. For deploys, validate the served site/API, not only a successful upload.
5. Update `CODEX.md` when a system boundary, public endpoint, deployment topology, or invariant changes. Update the relevant `knowledge/` note when a decision, contract, or dependency changes. Add a dated entry to `knowledge/Decision Log.md` for non-obvious choices.

## Documentation ownership

- `AGENTS.md` is the concise operating contract for any coding agent.
- `CODEX.md` is the architecture index and source-of-truth map.
- `knowledge/` is the linked long-term memory: contracts, decisions, change intake, and automation specification.
- `CLAUDE.md` remains a compatibility entry point only; it must point agents to this memory layer rather than compete with it.

When documentation and code disagree, code plus tests are the immediate truth. Correct the memory in the same change or record an explicit follow-up.

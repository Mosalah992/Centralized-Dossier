# Thalmor Embassy Archives

A gated, read-only web archive that renders a Google Sheet as in-world ceremonial
registers for a Skyrim roleplay community. Anyone with the link and the shared passphrase
can read it; it is deliberately `noindex, nofollow` because it carries about a hundred real
people's Discord handles, ranks and activity.

Live: **https://thalmor-archives.pages.dev** — Cloudflare Pages project `thalmor-archives`.

It works in tandem with a **separate** project, the clock-in bot
([Thalmor-HR-](https://github.com/Mosalah992/Thalmor-HR-)), which writes to the same
spreadsheet. That bot owns Roster columns G/H/J/K. This site only ever reads.

---

## Stack

Vite 5 · React 18 · TypeScript · Cloudflare Pages + Pages Functions. No CSS framework —
the styling is hand-written and deliberately bespoke.

**One carve-out, and only one.** Fluent UI React v9 (`@fluentui/react-components`) supplies
the *interactive controls* — the search box, the dropdowns, the tooltips, the toast — and
nothing else. It is not a skin and it is not a design system here: the shelf, the seal, the
parchment pages, the tables and the turning leaf are hand-written CSS and stay that way.
Fluent styles with Griffel, so Griffel is permitted **inside `web/src/fluent/` and nowhere
else**; a view that needs styling gets a component from that folder, not a `makeStyles`
call of its own. The `.css` files remain authoritative for all presentation.

**Motion is GSAP, and `web/src/motion.ts` is the only place it is configured.** Four
named curves, five durations, three staggers — none invented; they were already the
numbers on disk, as anonymous literals in three files. `test/motion-language.test.ts`
fails if the TypeScript copy and the `base.css` tokens ever disagree, because GSAP
cannot read a custom property and CSS may not be written from JS.

Two rules there are worth knowing before touching any of it. **No `back`, `elastic`
or `bounce`, anywhere** — everything in this archive is heavy and hinged, and heavy
hinged things do not recoil. And **every entrance that blanks its target must carry a
`failsafe()`**: GSAP finishes on rAF, a document the browser is not rendering produces
no frames, and the blanking is otherwise permanent. That is not theoretical — it put
nine volumes at `opacity: 0` on a shelf nobody could read.

`seal-invite` in `Gate.css` is the last CSS animation in the archive and stays CSS.
It is the login affordance — its own comment records that readers could not find the
door until it was added — and a CSS keyframe cannot fail to parse.

```
web/src/          The SPA
  components/     Gate, Shelf, Book, Page, Ambience, Notice, ErrorBoundary
  views/          Personnel, Finance, Honors, History, Informants  (lazy-loaded)
  motion.ts       THE motion language: curves, durations, staggers, `staged()`
                  (reduced motion), `revealOnEnter`, `failsafe`
  styles/         base.css (tokens) · shelf.css (hall) · ledger.css (volume pages)
                  chronicle.css (the sealed volume's parchment + turning leaf)
  assets/         Build-pipeline assets: covers, portraits, fonts, sprites
  theme.ts        Per-volume binding colours
  covers.ts       slug -> cover image
  router.ts       ~40-line history-API router; no dependency
  api.ts          Fetch hooks + GATE_SEALED_EVENT

chronicler/       A SEPARATE Worker. Cron Triggers need a scheduled() handler and
                  Pages Functions have none, so the nightly pull of new informant
                  reports cannot live in functions/. Runs 04:00 UTC, writes the
                  Latest Filings to KV; the archive reads the same namespace.

functions/        Cloudflare Pages Functions -> /api/*
  api/_middleware.ts    The gate. Guards everything except /api/gate
  api/gate.ts           POST word -> writ cookie; GET status; DELETE clears
  api/volumes/          index.ts (shelf) · [slug].ts (one volume)
  lib/session.ts        HMAC writ signing/verification
  lib/swr.ts            Stale-while-revalidate over the Worker's own cache

server/           gsheets.ts (readonly Sheets client) · archive.ts (load + parse)
shared/           volumes.ts (THE registry) · types.ts · text.ts · parsers/
scripts/          Asset prep + sheet tooling (all committed, outputs committed)
Assets/           Source art in, as delivered
public/           Served verbatim: music/, seal.webp, _redirects, robots.txt
docs/             Research notes, incl. the transcribed press history
test/             Vitest; parsers.test.ts is the real suite
```

Two TypeScript projects — the browser half and the Workers half.
`npm run typecheck` runs **both**; `npm run build` only runs the first.

---

## Invariants — do not break these

**1. Gated responses must stay uncacheable by shared caches.**
`functions/api/_middleware.ts` rewrites every gated response to `private, no-store` +
`Vary: Cookie`. Never add `s-maxage` or `stale-while-revalidate` to a *client* response:
that is the shared-cache directive, and behind a gate it lets Cloudflare's edge hand a
cached roster to a request carrying no cookie.
Cache **server-side** instead, under the synthetic `https://archive.cache.internal/...`
key that no external request can forge. `functions/lib/swr.ts` is the pattern to copy.

**2. Sheets access is readonly-scoped.** `server/gsheets.ts` mints its token with
`spreadsheets.readonly`. There is no write helper and there should not be one — the
clock-in bot owns columns in this sheet, and a bug here must not be able to touch them.

**3. `VOLUMES` is sheet-backed only.** The Worker iterates `VOLUMES`
(`shared/volumes.ts`) to resolve tab titles. A volume listed there without a real tab is
reported *withdrawn* on every request. Volumes the Embassy writes itself live in `KEPT`
(currently `history`), and the Worker never sees them. Use `ALL_SLUGS` for routing,
`VOLUMES` for anything that talks to the sheet, and `isKept()` to tell them apart.

**4. The gate's failure modes are deliberate, and they differ.**
- Missing `GATE_SECRET`/`GATE_PASSPHRASE` -> **fails closed** (503, archive sealed).
- Missing `GATE_ATTEMPTS` KV -> **fails open**: `if (!env.GATE_ATTEMPTS) return false`
  silently disables brute-force throttling. The namespace is bound in `wrangler.toml`;
  if you remove it, the limiter stops without any error.

- Missing `DISCORD_*` config -> **fails open, and must**. Discord login is a
  *second* door beside the passphrase. The gate hides its button, `/api/auth/login`
  answers 503 for itself alone, and the word carries on working. Sealing the
  archive because an optional door is unconfigured would turn a typo into an
  outage for a hundred people.

Changing any of these is a security decision, not a refactor.

**The boundary lives in `functions/lib/public-paths.ts`**, not in the middleware
that reads it — so `test/middleware.test.ts` can assert it without dragging the
Workers types into the browser TypeScript project. A line added to that set
publishes a route to the internet; the test fails when the set changes, on
purpose. Never match it by prefix: `startsWith("/api/auth")` would open every
route anyone later files under that folder.

**5. `--display` must be a tracked Roman capital.** Nearly every label here is
wide-tracked uppercase. A calligraphic face disintegrates into disconnected strokes at
label size — this was tried and reverted. See the note in `web/src/styles/base.css`.

**6. `--cover` must stay dark.** `ledger.css` lays light foil text over it. Hall of
Honor's cover art is ivory, so its token takes the bronze of its own clasps instead.

**7. Fluent never loads at the gate.** `web/src/fluent/Shell.tsx` holds the only
`FluentProvider` in the app, and `App.tsx` reaches it through `React.lazy` from *inside
the volume branch* — never at the root, where a provider would normally go. A reader
stopped at the seal must not download a UI library to render a passphrase box; that is
the same cold-start path the lazy views exist to protect. A static import of anything
under `web/src/fluent/` from `App.tsx`, `Gate.tsx`, `Shelf.tsx` or `main.tsx` silently
undoes this — nothing fails, `index.js` just grows by ~90 KB gzip.

**`test/bundle.test.ts` is that check, and it was proven to fail** before it was
trusted: importing Fluent at the gate for real trips both the Griffel assertion and
the size ceiling. It reads `dist/`, which `npm test` does not build, so it *skips*
unless something built first — use:

```bash
npm run verify
```

The same test keeps framer-motion out (it was 39 KB gzip here, 41% of a sealed
reader's JavaScript, until the animation layer moved to GSAP) and asserts GSAP core
is present, since the seal ceremony cannot wait for a lazy chunk.

---

### The nightly filings

`chronicler/` is a second wrangler project and deploys on its own:

```bash
node node_modules/wrangler/bin/wrangler.js deploy --config chronicler/wrangler.toml
```

Both commands here take `--config` rather than a `cd`, deliberately: this machine's
shell is PowerShell 5.1, where `&&` is a parser error, so `cd chronicler && …`
does not run. See the environment note above.

It reads the Informants category once a night, redacts through
`shared/filings.ts`, and writes at most 60 filings to the `CHRONICLE_FILINGS` KV
namespace. `/api/chronicle` reads that namespace and serves them after the
written months; `Informants.tsx` sets them as **Latest Filings**, marked as
received rather than chronicled. The volume's own prose is never touched by it —
a month is read out of the reports and rewritten, and no cron can do that.

Three things about it are deliberate:

- **It only ever reads Discord.** No write path, for the same reason
  `server/gsheets.ts` is readonly-scoped: an unattended nightly job must not be
  able to post to a channel a hundred people are in.
- **A filing that fails the survivor check is dropped, not flagged.** The export
  script prints `REFUSING TO WRITE` and stops, because a human is at the
  keyboard. At 04:00 there is nobody to read a warning before a hundred people
  read the leak. `test/filings.test.ts` pins that behaviour.
- **Missing token, missing binding and a quiet night render identically** — as
  no section at all. The same shape as invariant 4's optional Discord door: an
  unconfigured accessory must not take down the one volume that already needs
  the Worker up to be read.

**The KV id appears in two files** (`wrangler.toml` and `chronicler/wrangler.toml`)
and they must agree. If they drift, the archive shows an empty filings list and
*nothing anywhere reports an error* — the read simply finds a different, empty
namespace.

The bot token is a Worker secret, separate from the Pages secrets:

```bash
node node_modules/wrangler/bin/wrangler.js secret put DISCORD_BOT_TOKEN --config chronicler/wrangler.toml
```

### The Archives Editor

A local console for the three volumes the Embassy writes itself:

```bash
npm run editor
```

It opens `/editor` on the dev server, behind the same gate as everything else.
Chronicles, the Ledger and History are edited as records; the sheet-backed six
are not editable at all, so a bug here can never reach the columns the clock-in
bot owns.

**It writes `content/*.json`, never a module.** The emitters turn those into
`functions/lib/*.ts` and `web/src/views/history-data.ts`, and they are what
refuse a volume that has lost a third of its entries. Publishing is explicit:

```bash
npm run volumes:publish
```

then a `pages deploy` you run. Nothing typed in the editor reaches a reader on
its own.

**Every save snapshots first**, to `content/.history/<slug>/`, so the state
*before* a bad save survives it. A snapshot taken afterwards would record the
mistake instead.

**IT IS DEV-ONLY BY CONSTRUCTION, NOT BY CONFIGURATION.** The filesystem API is
a Vite plugin marked `apply: 'serve'`; the route and the `React.lazy` import are
both inside `import.meta.env.DEV`, so a production build emits no chunk at all.
That last part was wrong once — guarding the route and the render still shipped
a 12 kB Editor chunk, because `lazy()` holds its dynamic import at module top
level. `test/bundle.test.ts` now greps `dist/` for it.

`--host` is safe. Vite binds to localhost alone by default — it prints
"Network: use `--host` to expose" and means it — and the editor's API refuses
any caller whose socket is not loopback, so exposing the dev server to test the
archive on a phone does not expose a filesystem writer with it. Verified by
running with `--host` and calling the API from the machine's own LAN address:
403, and the volume untouched.

## Commands

```bash
npm run dev          # UI on :5173, proxies /api to :8788
npm run pages:dev    # Functions on :8788 — needs .dev.vars
npm run build        # tsc --noEmit && vite build
npm run typecheck    # both tsconfigs
npm test             # vitest (46 tests; the .live suite is skipped by default)
npm run dump         # re-dump every sheet tab to tmp/ after a schema change
```

Asset prep — each reads from `Assets/` and writes committed output:

```bash
node scripts/prepare-volumes.mjs   # book covers -> web/src/assets/volumes/
node scripts/prepare-candles.mjs   # candle sprites
node scripts/prepare-seal.mjs      # gate wax seal
node scripts/prepare-music.mjs     # ambience tracks -> 96 kbps mono (needs FFMPEG=)
node scripts/make-dev-vars.mjs     # .env -> .dev.vars for wrangler
```

**Deploy is manual.** The Pages project is *not* connected to GitHub, so pushing does
nothing on its own:

```bash
npm run build
node node_modules/wrangler/bin/wrangler.js pages deploy dist --project-name thalmor-archives
```

---

## Environment gotchas

- **PowerShell blocks `npm.ps1` / `npx.ps1`** (execution policy). Use `npx.cmd`, Git Bash,
  or call the binary directly: `node node_modules/wrangler/bin/wrangler.js`.
  **It is PowerShell 5.1, so `&&` is a parser error too** — chain with `;`, or avoid
  chaining altogether by passing `--config` instead of `cd`-ing into a subproject.
  Do **not** advise changing the execution policy — it is a machine-wide security setting
  and the workarounds cost nothing.
- **npm 11 gates native install scripts.** Approvals for `esbuild`, `sharp` and `workerd`
  are recorded in `package.json` under `allowScripts`. A fresh clone that skips them gets
  a broken dev server and image pipeline.
- **wrangler is pinned to 3.x** and Node to 18.20.7 (`.nvmrc`) so the toolchain the
  clock-in bot shares is left alone. wrangler 4 will nag on every command; ignore it.
- **The git remote is pinned to `https://Mosalah992@github.com/...`** because this
  machine's stored credential is a different account. Without the username in the URL,
  pushes 403.

---

## Secrets

| What | Where | Used by |
|---|---|---|
| `SHEET_ID`, `GOOGLE_APPLICATION_CREDENTIALS` | `.env` | `scripts/*.mjs` |
| `GOOGLE_SERVICE_ACCOUNT_JSON`, `GATE_SECRET`, `GATE_PASSPHRASE`, `GATE_EPOCH` | `.dev.vars` | `wrangler pages dev` |
| `CHRONICLE_PASSPHRASE` — the Thalmor Chronicles' own word | `.dev.vars` | the volume's second gate |
| Service-account key | `credentials/` | generated into `.dev.vars` |
| `DISCORD_CLIENT_SECRET` — the second door | Cloudflare secret + `.dev.vars` | `api/auth/callback` |
| All production secrets | Cloudflare Pages secrets | the live site |

`DISCORD_CLIENT_ID` and `DISCORD_GUILD_ID` are plain vars in `wrangler.toml`,
not secrets — the client id is handed to every visitor in the authorize URL.
All three unset is a supported state and is what ships until the Discord
application exists; see invariant 4.

A writ bought with Discord carries the reader's id, name and guild roles, signed
into the same MAC as everything else. **The roles are a snapshot taken at login,
not a live check** — which is why those writs last a day where the passphrase's
last a week. Nothing is gated on them yet; they are carried so the data can be
proven right in production before anything is moved behind it.

`.env`, `.dev.vars` and `credentials/` are gitignored and **must never be staged**.
Production secrets cannot be read back out of Cloudflare — only replaced.

`GATE_PASSPHRASE` opens the archive; `CHRONICLE_PASSPHRASE` opens one volume inside
it. They are separate secrets and the writs are separately scoped, so overwriting
either is a lockout, not a reset — there is no way to read the old value back to
check what you replaced.

Before any commit, scan the staged diff for key material rather than trusting
`.gitignore` alone:

```bash
git diff --cached | grep -Ei "BEGIN PRIVATE KEY|GATE_SECRET=|DISCORD_TOKEN"
```

### Held back from git

The GitHub repository is **public**. Four files are therefore gitignored even
though they are not secrets in the credential sense — they are the substance of the
volumes the gate exists to hold back, and committing them would publish to anyone
browsing GitHub exactly what it withholds.

| File | What it is |
|---|---|
| `functions/lib/chronicle.ts` | The Thalmor Chronicles: 85 entries, the powers, the unresolved |
| `functions/lib/enforcement.ts` | The Ledger of Enforcement: 116 acts, ~200 people named |
| `docs/informant-reports.md` | 650 redacted reports, in filing order |
| `docs/informant-events-ledger.md` | The reading pass over them |

**These are not in git history and cannot be recovered from it.** The deployed
Worker holds the chronicle and the ledger; a local copy is the only other one. Back
them up somewhere outside the repo — a clone plus a `git log -S` will not find them:

```bash
node scripts/backup-held-back.mjs
```

It copies the four files above plus the `tmp/enforce/` working set to a dated
folder under `~/Documents/thalmor-archive-backup` (override with `BACKUP_DIR`),
verifies every copy by reading it back, and writes a MANIFEST with checksums. It
names each file explicitly rather than globbing, and refuses to write inside the
repo — a glob that caught `.env` would put live secrets in a plain folder, which
is worse than the loss it guards against. **Re-run it after any change to the
ledger**, since `tmp/` is ignored and nothing else keeps a second copy.

`docs/informant-reports.md` *is* reproducible: given a fresh export to `tmp/`,
`scripts/build-informant-history.mjs` regenerates it, and it is the only file that
script writes to `docs/` (it also drops a working `_corpus.md` beside the dump).
`docs/informant-events-ledger.md` is NOT regenerated by it — that document is a
reading pass, in the same way the enforcement ledger is, and nothing rebuilds it
from the reports. The chronicle is neither: it was written, not derived.

The ledger sits between the two. It was DERIVED — every act read out of the reports
above — but the reading was a judgement call per report, not a parse, so re-deriving
it means doing that reading again rather than running a script. Its working copy is
`tmp/enforce/records.jsonl` and `tmp/enforce/emit.py` turns that into the module;
`tmp/` is gitignored too, so **that pair is the thing actually worth backing up** —
losing it means the volume can only be rebuilt from the deployed Worker's copy or by
re-reading the reports.

`scripts/audit-enforcement-sieve.py` **is** committed, and should be re-run after any
fresh export. It answers the one question the reading pass cannot answer about
itself — whether the filter that chose which reports to read dropped any that
carried an act. The first sieve was written inline, thrown away, and missed 81
reports; twelve of them held acts. Over-matching there costs a read, under-matching
costs a record, so the net is deliberately far wider than it needs to be.

`functions/lib/chronicle.example.ts` is committed in the real module's place, with
the same exports and placeholder prose, because `api/chronicle/index.ts` imports
from it and a clone missing that import fails `typecheck` and `build` — which reads
as a broken repository rather than a deliberate omission. To make a clone build:

```bash
cp functions/lib/chronicle.example.ts functions/lib/chronicle.ts
```

Restoring the real volume means copying `chronicle.ts` back from wherever you kept
it. Do not commit it.

---

## Conventions

- **Comments explain *why*.** The codebase is unusually densely commented, and the
  comments carry reasoning that is not recoverable from the code — why the gate fails
  closed, why book covers are found from the alpha channel rather than cropped to a grid.
  Match that density. Do not add comments that restate the line below them.
- **Commits**: short in-world subject, body explaining the reasoning and any tradeoff,
  ending with the `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` trailer.
  e.g. *"Bind the KV the gate's throttle has been quietly missing"*.
- **Per-volume colour** flows `theme.ts` -> `bindingVars()` -> `--cover`/`--cover-2`/`--foil`
  -> `ledger.css`, which themes the interior pages. `--lettering` is the same flow's one
  exception: it colours the title the shelf sets over the cover, and Hall of Honor
  overrides it because gold leaf on vellum is a rumour of a title rather than a title.
- **Titles are live type, not painted.** `scripts/prepare-volumes.mjs` clears a lettering
  panel on each cover and writes its geometry to `web/src/assets/volumes/labels.json`;
  `Book.tsx` sets the name from `VOLUMES`/`KEPT`/`SEALED` over it in Cinzel. The panel is
  in a different place on almost every cover and the numbers were measured off the art —
  the `LABEL` table in that script is the one place they are set, and labels.json is
  generated. Renaming a volume is now free; it used to need the cover repainting.
  `node scripts/contact-sheet.mjs` photographs all eight in a real browser
  (`docs/volume-covers.png`) — it needs `npm install --no-save playwright`, which is
  deliberately not a dependency.
- **Fluent's own icons never ship.** `@fluentui/react-components` depends on
  `@fluentui/react-icons` and reaches for it by default — a rounded magnifier in the
  search box, a rounded chevron on the dropdown. Those are Microsoft 365's hand, and
  beside Cinzel capitals on a ruled page they are the one thing in the room drawn by
  someone else. Every icon slot is passed a mark from `web/src/fluent/marks.tsx`
  instead. When adding a Fluent component, find its icon slots first (`contentBefore`,
  `expandIcon`, `dismiss`, `media`) and fill them.
- **Assets**: a committed script plus committed output. Source art stays in `Assets/`.
- **Verify against production**, not the build log. A deploy that uploads is not a deploy
  that works — check the served bundle hash, then exercise the gate.

---

## What I need from you

Things an agent cannot discover from the repo, and should not guess.

**Decisions that are yours, not mine**
- **Licensing of supplied art and fonts.** Static assets are served from public URLs —
  only `/api/*` is behind the gate — so shipping a file here distributes it to anyone with
  the link. A demo font from a commercial foundry nearly went live this way. If you supply
  a font or image, say whether it is licensed for web embedding.
- **Whether invented lore may present as canon.** The archive is careful about the line
  between what was sourced and what was asserted (`docs/skyrim-press-history.md` records
  contradictions rather than smoothing them). Anything fabricated — a constructed language,
  a filled gap in the chronicle — is your call to make, not mine to assume.
- **Anything that changes the gate's security posture**, including the fail-open limiter
  in invariant 4.

**Credentials only you can provide**
- The **gate passphrase**, if you want me to verify a deploy end to end.
- Tokens (Discord bot, API keys) via a **gitignored `.env` file, not pasted in chat** — a
  token in the transcript is a token to rotate.
- **`/mcp` OAuth** is an interactive browser flow. I cannot complete it, so the Cloudflare
  MCP servers stay blocked until you do.
- **`wrangler` is already logged in** on this machine — an OAuth token for
  mosalah.desouki@gmail.com with `pages (write)`, confirmed with
  `wrangler whoami`. Deploys therefore work unattended, so treat
  `pages deploy` as a live production action on a site a hundred people read,
  not as a blocked step: build, check the invariants, and verify the served
  bundle hash afterwards. Re-check `whoami` rather than assuming — the token can
  be revoked.

**Open items carried forward**
- The Discord bot token used for the channel exports was exposed in a transcript and
  should be rotated. Reset it, then immediately
  `wrangler secret put DISCORD_BOT_TOKEN` on the Thalmor-HR worker — the bot's bulletin
  cron and roles lookup break in the gap.
- `cloudflare-observability` and `cloudflare-bindings` MCP servers are configured in
  `.mcp.json` but unauthorised. `cloudflare-docs` works.
- The ambience tracks are re-encoded by `scripts/prepare-music.mjs` — 96 kbps mono, sources
  in `Assets/`, output committed to `public/music/`. **ffmpeg is not a dependency and the
  build never runs it**: pass `FFMPEG=/path/to/ffmpeg.exe` when a track changes, and bump
  the `?v=` on the urls in `App.tsx`, or nobody holding the old file will ever see the new
  one. 12.2 MB -> 5.9 MB across the three.
  The note that stood here predicted ~600 kB for golden-herald and was simply wrong
  arithmetic: 131 seconds at 96 kbps is 1.5 MB and cannot be less. Dropping to 64 kbps
  would take the set to about 3.9 MB, but that is a judgement about the music rather than
  a saving to take for granted.
- The gate's fail-open limiter (invariant 4) is unresolved by design — failing closed
  trades availability for security.
- An Aldmeris UI toggle was planned and stopped: there is no canonical Aldmeris lexicon,
  so it would mean inventing one. Blocked on the fabrication question above.

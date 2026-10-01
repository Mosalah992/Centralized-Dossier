# Codex Cloud task: Ancarion guards BOTH Chronicles and Reports

## Confirmed scope — 2026-10-01

Implement the portrait gate for BOTH the existing Chronicle route and /reports in Mosalah992/Centralized-Dossier. This folder contains the complete extracted starter; no download from a ChatGPT sandbox is required.

Read AGENTS.md, CODEX.md, openspec/config.yaml and the relevant knowledge notes first. Create the required OpenSpec proposal before changing gate behavior. This task touches the gate UI and public art; preserve member data, read-only Sheets scope, KV/D1 ownership, server auth, and private response caching.

Use one shared React-compatible presentation component with two distinct verification adapters. Inspect web/src/api.ts, the Chronicle view, web/src/views/Reports.tsx, functions/api/chronicle/gate.ts, functions/api/reports/gate.ts and their session helpers. Adapt the starter to actual request/response formats rather than rewriting the backend to match the generic demo. Never let Chronicle access unlock Reports or vice versa. Recheck each protected resource server-side. Preserve each cookie scope, epoch, rate limit, expiry and Cache-Control/Vary headers.

Some repository prose says Chronicle is the only protected content, while code also implements Reports. Treat code plus tests as immediate truth and correct relevant stale documentation as part of implementation.

## Required artwork and frame

- Existing Ancarion portrait: web/src/assets/canonreeve.webp (already imported in Honors.tsx).
- User-supplied frame: prototypes/ancarion-gate-starter/assets/portrait-frame.png.
- This is the exact supplied 388 x 572 RGBA frame, with a genuinely transparent central opening. The original source is preserved; do not regenerate, recolor, distort or replace it with a CSS approximation.
- Layer portrait/video behind the frame. Clip artwork to the inside opening; frame is foreground with pointer-events:none and decorative alt text. Start measuring near x=20..367, y=18..548, then inspect at actual output sizes rather than trusting approximate coordinates.
- Maintain the frame aspect ratio 388/572. The source portrait is square: use undistorted cover cropping with configurable object-position, visually retaining the face/circlet. Do not stretch the portrait to fit.
- Move the complete framed painting as ONE hinged object when opening; keep both layers registered. Remove the starter's ornamental CSS border to avoid double framing.
- Keep the input/dialogue accessible outside the painted aperture. Verify mobile fit and keyboard focus.
- Record the supplied frame's provenance as user-provided for this task; do not invent a license. Follow the repository's reproducible asset preparation convention for any optimized derivatives.

## Animation and dependencies

The starter is dependency-free and runs with:
    cd prototypes/ancarion-gate-starter
    node dev-server.mjs
Then open http://127.0.0.1:4173. Its local image picker and mock phrase are demo-only.

The main React/Vite app still needs its EXISTING npm dependencies and the Node version pinned by the repository. Use npm ci with the lockfile; do not replace root package.json with the starter package or add animation packages. Keep existing GSAP/anime.js dependencies and chunk boundaries intact.

No production character-reaction videos are supplied in this folder. A separate composited blink experiment exists in the conversation, but it is NOT an approved performance clip for this task and is intentionally excluded to honor the original no-fake-blink requirement. Default to the real static Ancarion portrait plus dialogue and frame motion. Preserve optional idle/listening/denied/accepted video integration; use only actual matching assets if provided. Do not invent Live2D models or claim model-generated head motion.

## Completion

Implement both gates, not merely an isolated new demo. Retain separate server authorization and existing behavior for returning authenticated visitors. Run npm run typecheck, npm test and npm run build from the project root. Exercise both adapters, failed/network/429 cases, keyboard submission, reduced motion, unmount cleanup and protected resource access with missing/expired/wrong-scope sessions. Report any checks blocked by secrets or unavailable browser tooling honestly. Do not request production secret values in chat or commit them.

Update the relevant knowledge notes and dated decision log. Return changed files, check results, remaining asset/config requirements and reviewable screenshots if browser tooling is available. Do not deploy or merge automatically.

---

## Original starter implementation requirements

# Implement Ancarion's portrait gate in the existing repository

Work in the repository I have open. Use the attached `ancarion-gate-starter` as the prototype reference and source code. Complete implementation and local verification; do not deploy unless separately requested.

## Goal

Create an immersive passphrase gate for a restricted section of the Thalmor Archives. Ancarion's portrait guards it, reacts through dialogue/available video, then the framed painting swings open after successful authorization. Reuse the EXISTING Ancarion portrait asset in this codebase. Do not generate a replacement character or use the generic Justiciar sheet from earlier experiments.

## Inspect first

Read AGENTS.md, package.json, lockfile, routing, styles, auth/session code and hosting config. Locate Ancarion's existing image by searching filenames and references for `Ancarion`, `Saelthar`, portrait, character and relevant assets; inspect candidate images. Report the chosen path. If multiple genuinely different Ancarion portraits remain ambiguous, ask me to choose rather than guess. Do not invent asset paths or assume React/Cloudflare without inspecting.

## Implementation

1. Integrate with the app's current framework and design tokens. The starter is framework-independent; an optional React wrapper exists. Keep existing dependencies/lockfile. Add no Three.js, GSAP, Anime.js, Live2D, Python, CUDA or PyTorch to the web app for this feature.
2. Build it on an isolated preview route first if the target restricted route is not clear. Match the dark institutional Thalmor style, parchment typography, restrained gold frame and the existing Ancarion portrait. Respect the image's aspect ratio and avoid double-framing it.
3. Implement states locked, checking, denied, error, accepted, opening, unlocked. Use an async verifier. Disable repeated submission during verification. Support Enter, clear status text, request timeout, a skip-opening button, reduced motion, mobile layout and unmount cleanup.
4. Animation: native CSS hinged frame; optional muted inline HTML video for genuine character reactions. Use idle/listening/denied/accepted clips only if real matching files exist. Otherwise keep the character static and make that limitation explicit. No animated sprite sheets, crossfading facial cutouts, fake blinks, background colour shifts or rubbery whole-image warping. Do not claim an animation model/clip has been generated when it hasn't.
5. Keep demo phrase validation confined to an explicitly labeled local demo. Production uses existing backend/session auth via the adapter contract. Do not commit a real phrase or client-side phrase comparison. A successful UI animation is not authorization.
6. If existing auth is available, wire to it. If production gating is required and there is no backend, implement the minimal backend consistent with the inspected platform and docs/BACKEND_CONTRACT.md. Keep secrets server-side, rate-limit attempts, issue/validate secure sessions and protect direct access to data/files. Identify required secrets/config without inventing values. Reuse existing rank permissions. Do not put protected records into public assets/imports.
7. Preserve current site behavior. Returning authorized visitors can bypass the challenge based on a SERVER session check. Navigate/load protected data after success and focus the destination heading. Server-side logout must revoke sessions; visual reset is not logout.

## Verify and report

Run the project's relevant checks. Exercise wrong/right input, Enter, empty input, repeated submit, timeout/network error, 429, reduced motion, video unavailable/autoplay denied, mobile layout and unmount during a request. Check protected endpoints directly without/with/after expiry of a session if backend changes are included. Do not broaden testing without a concrete reason.

Return: files changed; selected Ancarion asset path; actual dependencies added (ideally none); local run commands; verification performed; any required secret/config; and whether portrait motion is still-only or backed by actual video. Do not deploy automatically.

# Ancarion portrait gate starter

A portable implementation of the Thalmor Archives passphrase-gate prototype. Use Ancarion's existing portrait from your repository. The prototype has no framework dependency, no CDN, no required AI service, and no npm packages to download.

## Start here

1. Extract this folder beside your existing repository (or into a temporary prototype directory).
2. Give Codex `CODEX_HANDOFF.md` and this folder. Codex should inspect the actual repository before choosing paths or auth architecture.
3. For a standalone demo, install Node.js if missing, then run:

```powershell
cd "C:\path\to\ancarion-gate-starter"
node dev-server.mjs
```

Open **http://127.0.0.1:4173**. Pick the existing Ancarion portrait using the file chooser. Files selected this way remain local in the browser; nothing is uploaded. Test phrase: **Auri-El**. Reset demo remounts the UI; it is not server logout.

Alternatively use `npm.cmd run dev` on Windows PowerShell if npm.ps1 is blocked. No `npm install` is needed. Use your existing supported Node version; the starter uses built-in Node APIs and targets Node 18+ syntax. For new installations use a currently supported LTS release from https://nodejs.org/.

## Dependencies and downloads

| Item | Required? | Purpose |
|---|---|---|
| Node.js | For bundled local server only | Serves ES modules on localhost |
| Browser | Yes | Runs the component and native HTML video |
| npm packages | None | Runtime is plain JS + CSS |
| Existing Ancarion image | For final appearance | Reuse the repo asset; do not regenerate |
| React | Only if your app already uses it | Optional wrapper in integrations/ |
| MP4/WebM reaction clips | Optional | Actual character motion |
| FFmpeg | Optional, when preparing clips | Encoding, trimming, consistent dimensions |
| LivePortrait, PyTorch, CUDA | Optional asset-production tools | Not website dependencies; not installed by this starter |
| GSAP, Three.js, Anime.js, Live2D | Not needed for this prototype | Do not add them just for the hinged frame |

## What is included

- `src/portrait-gate.js`: mounted, disposable gate UI; input, async verification, reactions, accepted hold, hinged reveal, skip, cleanup.
- `src/portrait-gate.css`: scoped responsive dark-gold styling, keyboard focus, reduced-motion support.
- `src/http-verifier.js`: same-origin POST adapter for the host's backend.
- `demo/`: clearly labeled mock verification, local image/video pickers, offline/rate-limit scenarios.
- `integrations/PortraitGate.jsx`: optional React integration, including unmount cleanup.
- `docs/BACKEND_CONTRACT.md`: server responsibilities and response formats.
- `docs/ANIMATION_ASSETS.md`: clip requirements and the next animation-production step.

## What is not included

This is a prototype starter, not a production authentication system. No backend, passphrase database, Cloudflare deployment, compiled Live2D model, or generated LivePortrait video is included. The earlier hosted LivePortrait test failed at the GPU-allocation gate; do not describe clips as already produced.

With only the existing image, the portrait is static: dialogue and the frame animate, but facial motion is not fabricated. Supply real matching clips to animate Ancarion himself. This avoids the drifting colour/background and melting-face problems of the previous sprite-sheet attempts.

## Use in any app

Import the CSS through your bundler (or link it from HTML) and mount:

```js
import {mountPortraitGate} from './src/portrait-gate.js';
import {createHttpVerifier} from './src/http-verifier.js';

const gate = mountPortraitGate(document.querySelector('#gate'), {
  portraitUrl: EXISTING_ANCARION_ASSET_URL,
  portraitIncludesFrame: false, // true if the image already has a painted frame
  // Default is 2/3. Match the real source to avoid accidental cropping:
  aspectRatio: '2 / 3',
  portraitPosition: '50% 50%',
  clips: {}, // add idle/listening/denied/accepted URLs when real clips exist
  verifyPhrase: createHttpVerifier('/api/gate/unlock'),
  onGranted() {
    // Navigate using your existing router. Protected data still requires server auth.
  }
});
// On route unmount:
gate.destroy();
```

Prefer a bundler import for a source asset, e.g. `import ancarionPortrait from '../assets/actual-name.webp'`. Public-directory assets use the app's correct base-aware URL. The actual asset path and framework are unknown in this handoff; Codex must discover them.

## Behavior

`locked -> checking -> denied/error` or `checking -> accepted -> opening -> unlocked`.

- Double submission is ignored while checking/opening.
- A request timeout fails closed and aborts the request; late responses are ignored after destroy.
- No session or passphrase goes into localStorage.
- Network errors do not unlock the gate.
- HTTP 429 displays the server retry delay. The UI cooldown is convenience, not a security limit.
- Reduced-motion uses a static portrait and skips the opening sequence.
- Optional video is muted/inline; playback errors fall back to the still image.
- Video pauses while the document is hidden. Motion has a pause button.
- Unmount aborts requests, clears timers, removes listeners and stops media.
- Once unlocked, the host owns navigation and should focus the destination heading.
- Existing sessions should be checked by the host before mounting; returning authorized visitors need not re-enter a phrase.

## Verification before merging

Run `npm.cmd run check` or `node --check src/portrait-gate.js`. In the browser test: blank input, wrong phrase, success, Enter key, repeated clicks, failure mode, rate limiting, reset/unmount during checking, missing image, missing/blocked video, pause, reduced motion and mobile layout. For real auth, test direct route/API access without a cookie, expired sessions and logout separately.

The starter was syntax-checked and its DOM behavior exercised in a simulated DOM. No claim is made that optional real clips were visually validated; they do not exist yet.

## References

- Browser play() behavior: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
- Autoplay/inline media: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- Cloudflare middleware: https://developers.cloudflare.com/pages/functions/middleware/
- LivePortrait official source: https://github.com/KlingAIResearch/LivePortrait
- Cinesite's original portrait-effects breakdown: https://cinesite.com/the-magic-continues/

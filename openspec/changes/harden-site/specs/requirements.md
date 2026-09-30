# Requirements

## Support link

- The Ko-fi destination shall remain available on every archive route.
- It shall use the archive palette and adapt to the sidebar/mobile drawer without obscuring navigation.
- A new tab shall not receive opener access or the archive referrer.

## Retired mini-game

- `/slaytheheretic` shall resolve as a missing route.
- No game runtime, domain model, stylesheet, tests, preparation script, or game assets shall remain in the tracked repository or production bundle.

## Performance and motion

- CSS used only by lazy routes shall load with those routes rather than the entry module.
- Continuous calendar renderers shall pause outside the viewport and remain static under reduced motion.
- Motion shall continue to prefer transforms and opacity and retain existing visual behavior when visible.

## Browser security

- Static and Function responses shall share one restrictive policy with no wildcard source, inline script, eval, framing, plugin objects, or arbitrary base URLs.
- Security middleware shall preserve route-owned status, body, cache, cookie, and `Vary` headers.
- Only fingerprinted `/assets/*` responses may receive long-lived immutable caching.

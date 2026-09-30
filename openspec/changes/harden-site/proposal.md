# Site hardening and cleanup

## Why

The public archive should retain its supported Ko-fi link, remove the retired mini-game completely, avoid loading route-only presentation work on the shelf, and expose one consistent browser-security policy across static and Function responses.

## What changes

- Move the Ko-fi link into the themed React shell with safe external-link semantics.
- Remove the mini-game route, runtime, model, tests, preparation script, and source/generated assets.
- Split route-owned CSS from the entry module and suspend continuous calendar rendering when hidden or reduced motion is requested.
- Tighten CSP defaults, add cross-origin/privacy headers at the root middleware, mirror them for static assets, and cache only fingerprinted assets immutably.

## Boundaries

This change does not alter member data, Sheets scope, Chronicle/Reports authentication, KV, or D1. Root security middleware must preserve every route's existing cache and `Vary` headers, especially `private, no-store` on sealed APIs.

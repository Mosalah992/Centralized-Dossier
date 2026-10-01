# Backend contract: production work for the host repository

The provided adapter does not implement a backend. Reuse existing auth/session infrastructure. If the target is Cloudflare Pages, inspect its current functions/worker routing before adding handlers. Do not move protected content into a public SPA bundle.

## Request

POST /api/gate/unlock
Content-Type: application/json

```json
{"phrase":"user supplied value"}
```

The client sends exact input; normalization policy belongs to the server. The demo's case-insensitive check is not a production policy.

## Responses

- Success: 200, `{"ok":true}`; server establishes a signed or opaque session cookie.
- Wrong phrase: 401 or 403, `{"ok":false}`; do not reveal sensitive authorization details.
- Rate limited: 429 with `Retry-After: <seconds or HTTP date>`.
- Failure: 5xx, never interpreted as permission to enter.
- All auth responses: `Cache-Control: no-store`.

Cookie: HttpOnly, Secure, appropriate SameSite, finite expiry, and a Path that covers protected APIs and routes (often `/`). Verify every protected request on the server; a client flag is never proof of authorization. Host authorization decisions must govern role-specific records.

## Server requirements

1. Enforce body size and input length/type limits; validate request Origin for browser state-changing endpoints.
2. Store credentials server-side using an appropriate password-hashing approach; keep secrets out of frontend environment variables and logs.
3. Apply server-side rate limiting. UI cooldowns cannot stop direct API requests.
4. Issue/validate sessions with expiry and revocation appropriate to the application. Prefer existing infrastructure over hand-rolled cryptography.
5. Protect data, attachments, exported files and alternative URLs, not just the visible route.
6. Keep public build artifacts free of confidential records. Avoid shared caching of personalized content; configure routing to fail closed.
7. Implement session check and server logout/revocation in the host if not already present.
8. Test unauthenticated direct requests, bad/expired cookies, role mismatches, missing config and service failures.

A shared RP phrase is shared access. It does not identify a member or prove their rank. Keep existing individual identity/rank checks where required.

No production secret or real passphrase should be placed in the demo, handoff prompt, commit or public settings file.

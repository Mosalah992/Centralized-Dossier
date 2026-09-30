# Security model

Thalmor Embassy Archives is a public-by-link, read-only archive. Regular sheet-backed volumes are intentionally public; `noindex` is a privacy signal, not authorization. The Chronicle and High Command Reports are separate protected resources and must pass their own server-side gates on every data request.

## Trust boundaries

- The browser contains presentation code only. It receives no Cloudflare, Discord, Google service-account, Chronicle, or Reports secret.
- Pages Functions read Google Sheets and protected storage. Sheets access is read-only.
- The Chronicler writes only its KV namespace; the Reporter writes only the Reports D1 database.
- Secrets belong in Cloudflare secrets or ignored local environment files, never Git.
- Protected responses retain `Cache-Control: private, no-store` and `Vary: Cookie`.

## OWASP Top 10 control map

| Risk area | Project control |
|---|---|
| Broken access control | Chronicle and Reports validate scoped, signed, epoch-bound cookies server-side on every request. Direct unauthenticated API access returns no protected data. Public volumes are documented as intentionally public. |
| Cryptographic failures | Writs use Web Crypto HMAC verification, constant-time digest comparison, host-only `HttpOnly; Secure; SameSite` cookies, and independently rotatable epochs. HSTS forces HTTPS after first contact. |
| Injection | React escapes rendered text; D1 uses bound parameters; report filters and pagination values are allowlisted; user input is never evaluated as code; CSP forbids inline script, eval, plugins, and arbitrary origins. |
| Insecure design | Runtime ownership is explicit: Pages reads, collectors write, and optional infrastructure fails closed or degrades without widening access. The consultation register stores aggregates rather than visitor records. |
| Security misconfiguration | One root middleware applies the policy in `functions/lib/security.ts`; `public/_headers` mirrors it for static handling. Framing, MIME sniffing, external referrers, unnecessary browser capabilities, and cross-origin resource use are denied. |
| Vulnerable components | `package-lock.json` fixes the resolved graph. Run `npm run security:audit`; the release gate also runs type checks, build, and tests. Development servers must remain local and must never be exposed as production. |
| Authentication failures | The two gates have independent secrets, cookie names, scopes, epochs, and rate-limit prefixes. Passphrases are compared through fixed-width digests and absent secrets fail closed. |
| Software/data integrity failures | The site loads no third-party scripts, self-hosts fonts and assets, uses a restrictive CSP, and deploys only verified Git commits. Collectors deduplicate source messages before writing. |
| Logging/monitoring failures | Collectors report operational counts and gaps without publishing tokens or protected bodies. Cloudflare owns request-level operational logs; the application does not add visitor tracking. |
| SSRF | Browser-controlled URLs are never fetched server-side. External requests target fixed Google or Discord endpoints using configured IDs, and public API filters cannot select an outbound host. |

## Release checks

Run:

```text
npm run typecheck
npm run verify
npm run security:audit
```

After deployment, verify the canonical page receives the CSP and security headers, unauthenticated protected APIs return `401` with `private, no-store`, and the legacy Pages hostname redirects without weakening those headers.

No checklist proves an application invulnerable. New routes, dependencies, external origins, storage bindings, or authentication behavior require a fresh threat review and corresponding tests.

# Security policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's
**Security → Report a vulnerability** on this repository. Do not open a public
issue, and do not access, alter or retain other people's data while
investigating.

Include what you found, where, and the steps to reproduce it. You can expect an
acknowledgement, and a note when it is resolved.

## Scope

In scope: the site at `thalmor-archives.com` and the code in this repository.

Out of scope: denial-of-service and volumetric testing, social engineering,
findings in third-party platforms the site is hosted on, and reports that only
note a missing best-practice header without a demonstrated impact.

## Principles

- **Least privilege.** The archive reads its records and has no means to change
  them. Each part of the system holds only the access it needs.
- **No secrets in the repository or the browser.** Credentials live in the
  hosting platform's secret store. Restricted content is never shipped to the
  browser or committed here.
- **Server-side enforcement.** Any restricted content is checked on the server
  for every request, and fails closed when configuration is missing.
- **Hardened delivery.** A strict Content Security Policy, HTTPS everywhere, no
  third-party scripts, fonts or trackers, and self-hosted assets.
- **Maintained dependencies.** The dependency graph is locked, and every change
  is type-checked, tested, built and audited in CI before release.

## For maintainers

Before a release:

```text
npm run typecheck
npm run verify
npm run security:audit
```

New routes, dependencies, external origins, storage, or authentication behavior
need a fresh threat review and tests. The detailed invariants are in
[AGENTS.md](AGENTS.md) and the `knowledge/` notes.

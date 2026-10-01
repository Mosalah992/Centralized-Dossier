# Import Ancarion Portrait Gate

## Cloud task reference

This local task tracks the cloud task **"Set Ancarion before the sealed
archives"**, reported as commit `c3fdf0f` (`Set Ancarion before the sealed
archives`). The cloud implementation adds Ancarion's portrait gate to both
Chronicles and Reports, using the supplied portrait frame and
`web/src/assets/canonreeve.webp`.

## Intent

Review the cloud change, bring it into this checkout through the normal review
workflow, and verify its protected-route behavior before any merge or deploy.

## Scope and invariants

- This task touches the Chronicle and Reports gates, member-data presentation,
  and Reports D1 / Chronicle KV-adjacent request paths; it does not change
  Sheets scope, KV ownership, D1 ownership, or member data.
- Preserve separate Chronicle and Reports authentication. A successful check
  for one route must not authorize the other.
- Preserve Chronicle's route-local protection: responses remain
  `Cache-Control: private, no-store` and `Vary: Cookie`, and Chronicle text
  remains server-only.
- Preserve the existing Reports-only session contract and the read-only Sheets
  boundary.
- The supplied portrait frame remains user-provided; do not infer a broader
  asset license from its inclusion.

## Out of scope

Merging or deploying the cloud work. Those require separate review and release
authorization.

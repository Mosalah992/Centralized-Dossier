# Tasks

- [x] Obtain and review cloud task **"Set Ancarion before the sealed archives"**
  (reported commit `c3fdf0f`) against this branch.
- [x] Verify the supplied frame is byte-identical to the reviewed asset and
  record its user-provided provenance.
- [x] Verify separate Chronicle and Reports gate adapters, including rejection,
  rate-limit, network-failure, and abort paths.
- [x] Run `npm run typecheck`, `npm test`, and `npm run build`; document any
  failures caused by intentionally absent private source separately from
  regressions.
- [ ] On an authorized branch preview, verify Chronicle headers remain
  `Cache-Control: private, no-store` and `Vary: Cookie`, then review the
  responsive and reduced-motion gate behavior.
- [ ] Request review. Do not merge or deploy this task.

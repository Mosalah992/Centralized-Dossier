# Feature Intake

Before proposing a feature, record:

1. User-visible outcome and affected volume/route.
2. Data source and whether it includes member data, secrets, or public assets.
3. Runtime boundary: browser, Pages Function, shared, server, Chronicler, or a new Worker.
4. Volume class: sheet-backed, kept, or sealed.
5. Invariants and integration contracts affected.
6. Test/verification plan, including live-site validation if deployment changes.
7. Memory updates required: `CODEX.md`, a knowledge note, and/or Decision Log.

Use this checklist to select focused files; do not reread the entire repository unless a cross-cutting invariant requires it.

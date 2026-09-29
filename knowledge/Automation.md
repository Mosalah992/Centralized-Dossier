# Memory Consolidator — Specification

## Goal

Run a scheduled agent that turns repository changes into a reviewable update to the Markdown memory layer. It supports consolidation; it is not an authority on architecture.

## Runtime and schedule

- Deploy as a distinct Cloudflare Worker, separate from Pages and `chronicler/`.
- Run weekly on Monday at 05:00 UTC, plus an authenticated manual trigger for maintainers.
- Maintain a KV cursor containing the last successfully reviewed default-branch commit. A failed run does not advance the cursor.

## Inputs and outputs

- Read: the default-branch GitHub comparison since the cursor, changed source/tests/config/docs, and the current `AGENTS.md`, `CODEX.md`, and `knowledge/` notes.
- Model call: an API secret held only in the Worker. Prompt it to cite changed paths and preserve facts; it must emit a structured documentation patch proposal, not executable application changes.
- Write: create or update one GitHub pull request on a `memory/consolidate-<date>` branch. The diff may alter only `AGENTS.md`, `CODEX.md`, `CLAUDE.md`, and `knowledge/**/*.md`.
- Report: PR URL, base/head commits, files considered, and skipped/uncertain facts in Worker logs and the PR body.

## Safety controls

- GitHub credential is limited to contents and pull-request write access for this repository; no workflow, secret, deployment, or administration scopes.
- Reject generated diffs outside the documentation allowlist, changes containing secret-like values, ungrounded public endpoints, or attempts to change production configuration.
- Never auto-merge, deploy, write Sheets, write the archive KV/D1, call Discord, or modify `chronicler/`.
- If evidence conflicts or the model cannot cite a changed path, open no PR; log a review-needed report and keep the cursor unchanged.

## Acceptance checks

- A source/config/API change produces a docs-only PR with path citations and no non-Markdown changes.
- A no-change run produces no PR and advances no cursor.
- A rejected patch produces no branch update and records why.
- Human approval/merge alone advances the cursor on the next successful scan.

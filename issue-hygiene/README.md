# issue-hygiene

Composite GitHub Action that enforces issue-hygiene rules across every repo in
the `0k-software` org. Runs nightly from a private companion repo that mints a
GitHub App token.

## Inputs

| Input   | Required | Description                                            |
| ------- | -------- | ------------------------------------------------------ |
| `token` | Yes      | GitHub App token with org-wide read/write issue access |

## Prerequisites

- A GitHub App installed org-wide with issues read/write and projects
  read/write permissions. Store `ISSUE_HYGIENE_APP_ID` and
  `ISSUE_HYGIENE_APP_PRIVATE_KEY` as org-level secrets in the private caller
  repo.
- Labels `clean` and `dirty` must exist in each target repo.

## Project naming conventions

- **Triage project:** `<prefix> [<repo>] Triage` — one per repo.
- **Roadmap project:** `<prefix> [<repo>] Roadmap` — one per repo (Pitches
  only).

## Rules

| Rule | Check                  | Auto-fix                         |
| ---- | ---------------------- | -------------------------------- |
| 1    | Project membership cap | Remove from Triage when over cap |

Non-Pitch issues may belong to at most 1 project. Pitches may belong to at
most 2. When an issue exceeds its cap and one of the projects is a Triage
project, the action removes it from Triage automatically. Remaining violations
are flagged in a sticky comment.

## Labels

`clean` — all rules pass (or auto-fixes resolved every violation). `dirty` —
one or more violations remain after auto-fixes.

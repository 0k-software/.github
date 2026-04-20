# Plan: Add hide-addressed-reviews reusable composite action

**Issue:** https://github.com/0k-software/.github/issues/83

## Summary

Extract the "hide LGTM-style bot reviews once all their threads are resolved"
logic that currently lives inline in `0k-software/kingdone`'s
`.github/workflows/check.yml` into a reusable composite action hosted in this
repo, so any 0k-software project can consume it via
`uses: 0k-software/.github/hide-addressed-reviews@v1`.

## Approach

Create the composite action at `hide-addressed-reviews/action.yml` (one
subdirectory per action — leaves room for future siblings like the
`Check PR diff size` cleanup step). Port the shell + embedded GraphQL from
kingdone's `check.yml` verbatim, expose two inputs (`body-match-pattern`,
`classifier`), and document the action so consumers can adopt it. Publish the
`v1` GitHub Release after merge via the project's standard release process so
the floating `v1` tag exists for consumers to pin.

## Steps

- [x] [Step 1: Create the hide-addressed-reviews composite action](#step-1-create-the-hide-addressed-reviews-composite-action)
- [x] [Step 2: Document the composite action](#step-2-document-the-composite-action)
- [x] [Step 3: Advertise composite actions in the repo README](#step-3-advertise-composite-actions-in-the-repo-readme)
- [x] [Step 4: Publish the v1 GitHub Release](#step-4-publish-the-v1-github-release)

---

## Step 1: Create the hide-addressed-reviews composite action

Create `hide-addressed-reviews/action.yml` as a composite action implementing
the behavior described in the issue: match reviews whose body matches an
LGTM-style pattern, resolve every review thread each matching review opened,
and minimize the review itself via `minimizeComment`.

**Deviation from plan:** The intended "port verbatim from
`0k-software/kingdone`'s `.github/workflows/check.yml`" was not possible — that
repo is private and not reachable from this session, and this repo's MCP scope
is restricted to `0k-software/.github`. The action was implemented from scratch
against the issue's behavioral spec instead. The consuming PR in kingdone
should verify parity (query shape, pagination, edge cases) before swapping its
inline step for this action.

Metadata:

- `name`: `Hide addressed reviews`
- `description`: one-line summary of the behavior.
- `branding`: `icon: eye-off`, `color: purple`.

Inputs:

- `body-match-pattern` — case-insensitive extended regex matched via `grep -iE`
  against each review body. Default: `^\s*lgtm\s*$`.
- `classifier` — the `minimizeComment` classifier to use when hiding the
  review. Default: `RESOLVED`.
- `pr-number` — pull request number to operate on. Default:
  `${{ github.event.pull_request.number }}`, so the action works out of the box
  inside `pull_request*` workflows and stays overridable otherwise.
- `github-token` — token used to call the GraphQL API. Default:
  `${{ github.token }}`. Needed because composite actions do not inherit
  `secrets` from the calling workflow.

Implementation notes:

- Uses `runs.using: composite` with a single `run:` step (bash) that embeds the
  GraphQL queries via `-f query='...'` on `gh api graphql`.
- Paginates both `reviews` and `reviewThreads` (100 at a time) to avoid the
  same bug the sibling "Check PR diff size" step had to fix.
- Links each thread to the review that opened it via the first comment's
  `pullRequestReview.id` — this is how `reviewThreads` exposes ownership.
- Wires `GH_TOKEN` from `inputs.github-token` into the step's `env:` so `gh`
  picks it up.
- Fails fast if `pr-number` is empty (e.g. if the action is invoked outside a
  PR context without an explicit `pr-number` input), with a clear `::error::`
  message.

This step is self-contained — it leaves the action fully functional end-to-end
so reviewers can evaluate behavior in one commit.

---

## Step 2: Document the composite action

Create `hide-addressed-reviews/README.md` covering:

- What the action does and when to use it.
- A copy-paste `uses:` snippet pinned at `@v1`, shown in the context of a
  realistic `pull_request` or `pull_request_review` workflow.
- An inputs table (name, description, default) matching the `action.yml`.
- Required permissions on the calling workflow (`pull-requests: write` at
  minimum) and any required events.
- A short note linking back to this repo's release process so consumers know
  how versions are cut.

Keep it terse — this is a single-purpose action, not a framework.

---

## Step 3: Advertise composite actions in the repo README

Update the repo-level `README.md` to introduce a new "Composite Actions"
section alongside the existing "Issue Templates" and "0k Plugin" sections.

The section should:

- Briefly explain that this repo also hosts shared GitHub composite actions
  under top-level subdirectories (one dir per action).
- Include a table listing the available actions with their `uses:` path and a
  one-line purpose — currently just `hide-addressed-reviews`, with room to grow
  as follow-ups land.
- Link to each action's own `README.md` for details.

Also add a short line to `CLAUDE.md` / `AGENTS.md` noting the new top-level
directory convention so future AI sessions know where composite actions live.

---

## Step 4: Publish the v1 GitHub Release

Post-merge runbook — executed by whoever merges this PR, not by the
implementation branch itself:

1. Check out `main` and pull the merge commit.
2. Create a GitHub Release tagged `v1` on that commit using
   `gh release create v1 --title "hide-addressed-reviews v1" --notes "..."` (or
   the repo UI). The release notes should link to #83 and the action's
   `README.md`.
3. `uses: ...@v1` resolves to a moving tag, so the release creates the `v1` tag
   automatically — no manual `git tag` push. Advance it when future compatible
   versions ship.
4. Verify the action is consumable by referencing `@v1` from a scratch workflow
   in another repo (or a dry-run branch in kingdone) before closing the issue.

The runbook is also captured in `hide-addressed-reviews/README.md` (under
"Versioning & releases") and in the PR description, so it survives deletion of
this PLAN.md at the end of execution.

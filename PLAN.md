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

- [ ] [Step 1: Create the hide-addressed-reviews composite action](#step-1-create-the-hide-addressed-reviews-composite-action)
- [ ] [Step 2: Document the composite action](#step-2-document-the-composite-action)
- [ ] [Step 3: Advertise composite actions in the repo README](#step-3-advertise-composite-actions-in-the-repo-readme)
- [ ] [Step 4: Publish the v1 GitHub Release](#step-4-publish-the-v1-github-release)

---

## Step 1: Create the hide-addressed-reviews composite action

Create `hide-addressed-reviews/action.yml` as a composite action. Port the
shell script and embedded GraphQL from the "Hide addressed reviews" step of
`0k-software/kingdone`'s `.github/workflows/check.yml` verbatim — including the
recent pagination fix applied to the sibling "Check PR diff size" step, if it
also applies here.

Metadata:

- `name`: `Hide addressed reviews`
- `description`: one-line summary of the behavior (minimize LGTM-style bot
  reviews whose threads are all resolved).
- `branding`: a reasonable `icon`/`color` pair so the action shows up nicely in
  the GitHub Actions marketplace listing.

Inputs:

- `body-match-pattern` — regex matched against review body to decide whether
  the review is an LGTM-style review. Default: `^\s*lgtm\s*$`.
- `classifier` — the `minimizeComment` classifier to use when hiding the
  review. Default: `RESOLVED`.
- `github-token` — token used to call the GraphQL API. Default:
  `${{ github.token }}`. Needed because composite actions do not inherit
  `secrets` from the calling workflow.

Implementation notes:

- Use `runs.using: composite` with a single `run:` step (bash) that embeds the
  GraphQL queries via heredocs and calls `gh api graphql`.
- Reference inputs via `${{ inputs.* }}` inside the `run:` block.
- Wire `GH_TOKEN` from `inputs.github-token` into the step's `env:` so `gh`
  picks it up.
- The step must also set `shell: bash`.

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

After the PR from the previous steps is merged to `main`:

1. Check out `main` and pull the merge commit.
2. Create a GitHub Release tagged `v1` on that commit using
   `gh release create v1 --title "hide-addressed-reviews v1" --notes "..."` (or
   the repo UI). The release notes should link to the issue and the action's
   `README.md`.
3. Because `uses: ...@v1` resolves to a moving tag, the release creates the
   `v1` tag automatically — no manual `git tag` push. This tag will be advanced
   when future compatible versions ship.
4. Verify the action is consumable by referencing `@v1` from a scratch workflow
   in another repo (or a dry-run branch in kingdone) before closing the issue.

This step is intentionally separated from the implementation PR because release
creation happens after merge, not within it.

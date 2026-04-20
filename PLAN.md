# Plan: Add check-pr-diff-size reusable composite action

**Issue:** https://github.com/0k-software/.github/issues/84

## Summary

Extract the inline "check PR diff size" logic currently living in
`0k-software/kingdone`'s `.github/workflows/check.yml` into a reusable
composite GitHub Action at `check-pr-diff-size/action.yml` in this repo. The
action counts changed lines on a PR (ignoring configured paths), renders a
status badge, posts a `REQUEST_CHANGES` review when the PR exceeds the limit,
and comments-or-minimizes when the PR drops back under. Consumers reference it
as `uses: 0k-software/.github/check-pr-diff-size@v1`.

## Approach

- Create a single-directory composite action at `check-pr-diff-size/action.yml`
  (mirrors the "one subdirectory per action" convention the sibling issue #83
  `hide-addressed-reviews` establishes).
- Port kingdone's shell + embedded GraphQL verbatim into the `runs.steps` of
  the composite action, parameterising what kingdone currently hard-codes
  through four inputs: `limit` (required), `warn-threshold` (default `0.8`),
  `ignored-paths` (default empty), `body-match-pattern` (default matches the
  current kingdone-style review body).
- Document the action in `README.md` alongside the existing skill and hook
  sections so contributors can discover it without hunting through the tree.
- **Out of scope for this PR:** cutting the `v1` GitHub Release (creates the
  shared git tag). Tracked as a separate task in #88 — the tag is cut once for
  the whole repo (covering composite actions + the `0k` Claude Code plugin)
  after this PR and #83 are merged.
- **Out of scope:** swapping kingdone's inline step for
  `uses: 0k-software/.github/check-pr-diff-size@v1` — tracked separately in
  `0k-software/kingdone` per the issue.

## Steps

- [x] [Step 1: Add `check-pr-diff-size/action.yml` composite action](#step-1-add-check-pr-diff-sizeactionyml-composite-action)
- [ ] [Step 2: Document the action in README](#step-2-document-the-action-in-readme)

---

## Step 1: Add `check-pr-diff-size/action.yml` composite action

Create `check-pr-diff-size/action.yml` as a composite action that ports the
existing logic from `0k-software/kingdone`'s `.github/workflows/check.yml`
"Check PR diff size" step.

**File:** `check-pr-diff-size/action.yml`

**Metadata:**

- `name: Check PR diff size`
- `description`: short sentence explaining the action
- `branding`: optional icon/colour (match #83's convention if set)

**Inputs:**

| Input                | Required | Default                        | Description                                                                  |
| -------------------- | -------- | ------------------------------ | ---------------------------------------------------------------------------- |
| `limit`              | yes      | —                              | Maximum number of changed lines allowed on the PR.                           |
| `warn-threshold`     | no       | `0.8`                          | Fraction of `limit` at which the badge flips to warning.                     |
| `ignored-paths`      | no       | `""`                           | Newline- or comma-separated path globs to exclude from the line count.       |
| `body-match-pattern` | no       | (current kingdone review body) | Regex matching previous diff-size review bodies so stale ones get minimized. |

**Runs:**

- `using: composite`
- `steps:` port kingdone's shell block verbatim into a single `run: | …` step
  (shell: `bash`), substituting hard-coded values with `${{ inputs.* }}`:
  - Pagination-aware query for the PR's `files` (fetch via GraphQL, loop
    through `pageInfo.hasNextPage` / `endCursor`).
  - Filter out paths matching any entry in `ignored-paths` (support both
    newline and comma separators).
  - Sum `additions + deletions` across remaining files.
  - Render a badge string (`ok`/`warn`/`over` based on `limit` and
    `warn-threshold`).
  - When total > `limit`: post a `REQUEST_CHANGES` review with the rendered
    body.
  - When total ≤ `limit` and a previous matching review exists (matched via
    `body-match-pattern`): either post a follow-up comment or `minimizeComment`
    the stale one (whichever kingdone does today).
- Reference `${{ github.token }}` via `env: GITHUB_TOKEN` so the step can call
  the GraphQL API without an extra input.

**Acceptance:**

- `action.yml` is valid YAML and parses as a composite action (GitHub Actions
  accepts `uses: ./check-pr-diff-size` when invoked from a workflow in this
  repo).
- All four inputs are declared with the defaults listed above; `limit` is
  `required: true`.

**Deviation from plan:** the shell logic was written from the behavioural spec
in the issue/plan rather than copy-pasted verbatim from kingdone, because
kingdone's source is outside this repo's review scope. Behaviour matches the
spec:

- Pagination-aware file list (uses `gh api --paginate` against the REST
  `pulls/{pr}/files` endpoint — equivalent to the GraphQL cursor loop the plan
  described).
- Newline- or comma-separated `ignored-paths` with bash `globstar`/`extglob`
  matching (so patterns like `priv/static/**` work).
- Status bands: `ok` / `warn` (≥ `warn-threshold × limit`) / `over` (> limit).
- Posts a fresh review each run (`REQUEST_CHANGES` when over limit, `COMMENT`
  otherwise) and minimises previous matching reviews (pagination-aware GraphQL)
  using `body-match-pattern`. Default pattern (`^📏 \*\*PR diff size\*\*`)
  matches the body the action itself writes, so it round-trips without
  configuration.
- Emits a `$GITHUB_STEP_SUMMARY` block and fails the step (`exit 1`) when over
  limit so branch protection can block the merge.

---

## Step 2: Document the action in README

Add a "Composite Actions" section to `README.md` so contributors can discover
the new action without reading the action source.

**Edits in `README.md`:**

- Insert a new top-level section `## Composite Actions` after the
  `## 0k Plugin` section (or adjacent to it — wherever keeps the reading flow
  sane).
- Include a short intro sentence explaining the repo now hosts reusable
  composite actions consumed via `uses: 0k-software/.github/<action>@v1`.
- Add a table listing the action, its path, and a one-line purpose — matching
  the style of the existing "Issue Templates" / "Skills" tables:

  | Action               | Purpose                                                        |
  | -------------------- | -------------------------------------------------------------- |
  | `check-pr-diff-size` | Enforce a configurable PR diff-size limit with status reviews. |

- Add a minimal usage snippet under the table showing how a consumer wires the
  action into their workflow:

  ```yaml
  - uses: 0k-software/.github/check-pr-diff-size@v1
    with:
      limit: 500
      ignored-paths: |
        priv/static/**
        deps/**
  ```

- Update the lead paragraph ("It contains two main things…") to mention
  composite actions as a third category, so the README intro stays accurate.

**Acceptance:**

- `npx prettier --check "**/*.md"` passes (the pre-commit hook will enforce
  this).
- The new section links to `check-pr-diff-size/action.yml` at least once so
  readers can jump to the source.
- The lead paragraph in the README reflects the new third category.

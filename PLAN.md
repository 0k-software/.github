# Plan: Add canonical Copilot instructions and a reusable sync action

**Issue:** https://github.com/0k-software/.github/issues/132

## Summary

Add a canonical org-wide Copilot instructions file (`copilot-instructions.md`)
to the repo root, plus a reusable composite action
(`sync-copilot-instructions/`) that propagates the canonical content into every
target repo's `.github/copilot-instructions.md` between HTML-comment markers.
The action takes a pre-minted `github-token`, iterates either over a single
`target-repo` or every repo the token can reach, computes the desired file
contents (handling missing file, drift, markers-only, markers + repo content,
and no-markers cases), and opens or refreshes a PR on a stable branch
(`chore/sync-copilot-instructions`) with `--force-with-lease`. Two pure shell
units (`extract-org-section.sh`, `compute-desired.sh`) are unit-tested with
`bats` over markdown fixtures, run by a new `.github/workflows/test.yml`. The
sibling cron + manual `workflow_dispatch:` workflow that calls this action
lives in `0k-software/.github-private` and is out of scope for this PR.

## Approach

Build bottom-up, in the order a reviewer would naturally read it: drop the
canonical content first so reviewers can react to the actual wording, then add
each pure helper alongside its tests (so the test suite proves the helper
before any caller depends on it), then wire the composite action that
orchestrates the helpers, and finally expose it through documentation. Each
step is a self-contained commit that passes the repo's pre-commit hook
(Prettier on `**/*.md`).

The action is a composite shell action — matching `hide-addressed-reviews/` and
`check-pr-size/` precedent — using only `gh`, `git`, and `jq` (already on
`ubuntu-latest`). Per-repo errors are recorded and iteration continues; the run
exits non-zero at the end if any repo errored. Run-level fatals (canonical file
missing, can't list installations, single-`target-repo` unreachable) hard-fail
before iteration. Section markers are namespaced HTML comments
(`<!-- 0k:org-instructions:begin --> ... <!-- 0k:org-instructions:end -->`) so
they're invisible when rendered and easy to grep/sed.

This repo isn't seeded with its own `.github/copilot-instructions.md` as part
of this PR — that's the manual smoke test (workflow_dispatch with
`target-repo: 0k-software/.github`) that follows after merge, exercising the
same end-to-end path every other org repo will use.

## Steps

- [x] [Step 1: Add canonical `copilot-instructions.md` v1](#step-1-add-canonical-copilot-instructionsmd-v1)
- [ ] [Step 2: Add `extract-org-section.sh` helper with bats tests and CI workflow](#step-2-add-extract-org-sectionsh-helper-with-bats-tests-and-ci-workflow)
- [ ] [Step 3: Add `compute-desired.sh` helper with bats tests](#step-3-add-compute-desiredsh-helper-with-bats-tests)
- [ ] [Step 4: Add `sync-copilot-instructions/action.yml` composite action](#step-4-add-sync-copilot-instructionsactionyml-composite-action)
- [ ] [Step 5: Document the action and update root `README.md`](#step-5-document-the-action-and-update-root-readmemd)

---

## Step 1: Add canonical `copilot-instructions.md` v1

Create `copilot-instructions.md` at the repo root. Plain markdown, no markers
(it _is_ the canonical content; markers only appear in the per-repo applied
copies). v1 scope is the `PLAN.md` / draft-PR guidance only — framed positively
("review `PLAN.md` as a plan, not as code") rather than defensively.

Contents to include, paraphrased from the issue:

- A short intro sentence stating these are org-wide GitHub Copilot
  instructions.
- A "Draft PRs containing only `PLAN.md`" section explaining:
  - The PR is intentional, not incomplete; `PLAN.md` is the implementation plan
    for the spec in the linked issue and is committed on purpose.
  - Don't flag the PR as incomplete or suggest removing the file.
- A "Reviewing `PLAN.md`" section explaining what _useful_ feedback looks like:
  - Does the plan correctly implement the spec from the linked issue?
  - Are the steps coherent, complete, and in a sensible order?
  - Are there missing edge cases or risks worth flagging?
- A short "What not to flag" closer: skip code-review heuristics (formatting,
  linting, "shouldn't be committed", etc.) — they don't apply to `PLAN.md`.

Keep it tight (≈25–40 lines). Run
`npx prettier --write copilot-instructions.md` before committing so the
pre-commit hook passes.

No code changes elsewhere in this step.

---

## Step 2: Add `extract-org-section.sh` helper with bats tests and CI workflow

Create the first pure shell unit and stand up the test harness that step 3 will
reuse.

**`sync-copilot-instructions/extract-org-section.sh`** — pure shell helper that
takes a markdown file path as its only argument and prints the content between
`<!-- 0k:org-instructions:begin -->` and `<!-- 0k:org-instructions:end -->`
(markers themselves excluded). Behaviour:

- File missing or unreadable → exit non-zero with an error to stderr.
- File present but lacks markers → exit 0 with empty output (treated by callers
  as "nothing to compare against; full replacement needed").
- Begin marker without matching end marker (or vice versa) → exit non-zero with
  a clear error message.
- Markers nested or duplicated → use the first begin marker and the next end
  marker after it; ignore subsequent occurrences.

Implementation: `awk` with state flags is the simplest approach — toggle on the
begin marker, print lines while inside, toggle off on the end marker.
`set -euo pipefail` at the top; no dependencies beyond POSIX `awk`.

**`sync-copilot-instructions/test/extract-org-section.bats`** — bats suite
covering the cases the issue calls out: markers only, markers + repo content
(above and below), no markers, empty file, malformed/unclosed markers, markers
at unusual positions (start of file, end of file, immediately adjacent). Each
case has its own fixture file under
`sync-copilot-instructions/test/fixtures/extract-org-section/`. Tests
`chmod +x` the script as part of the suite setup or rely on `bash <script>` to
side-step file-mode requirements.

**`.github/workflows/test.yml`** — new workflow runs on `pull_request` and on
`push` to `main`. Single Ubuntu job that installs `bats` (apt), then runs
`bats sync-copilot-instructions/test/`. Concurrency group keyed on
`github.head_ref || github.ref` with `cancel-in-progress: true`, matching the
existing `check.yml` style. No secrets needed.

Verify locally with `bats sync-copilot-instructions/test/` before committing.

---

## Step 3: Add `compute-desired.sh` helper with bats tests

Second pure shell unit, exercised by the same workflow added in step 2.

**`sync-copilot-instructions/compute-desired.sh`** — given two file paths
(`CANONICAL` and `EXISTING`, the latter possibly `/dev/null` to model the 404
case), prints to stdout the DESIRED contents of the target repo's
`.github/copilot-instructions.md`. Logic:

| `EXISTING` state                         | DESIRED output                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| Missing (path is `/dev/null` or absent)  | Begin marker + newline + `CANONICAL` body + newline + end marker                    |
| Present, no markers                      | Markers + `CANONICAL` prepended above the existing content (existing untouched)     |
| Present, markers wrapping `CANONICAL`    | Existing file unchanged (idempotent — caller compares output to existing for drift) |
| Present, markers wrapping different body | Existing file with the marker section's body replaced by `CANONICAL`                |

Implementation reuses `extract-org-section.sh` for the "is the marker section
already in sync?" detection, and a sibling helper (or inline `awk`) to
substitute the marker-section body. Keep the substitution in pure `awk`/`sed`
to stay dependency-free.

Caller contract: the action computes DESIRED, byte-compares it to EXISTING, and
treats equality as "in-sync" (no PR needed). This script does _not_ perform
that comparison; it only emits the canonical-correct file contents.

**`sync-copilot-instructions/test/compute-desired.bats`** — bats suite covering
the cases the issue lists: 404 (existing = `/dev/null`), no markers + content
(markers prepended, content preserved verbatim below), markers wrapping
identical content (DESIRED == EXISTING — drift = false at the caller level),
markers wrapping different content + repo content below, markers with repo
content above and below. Fixtures live under
`sync-copilot-instructions/test/fixtures/compute-desired/`, structured as
triplets: `<case>.canonical.md`, `<case>.existing.md`, `<case>.desired.md`.
Each test computes the actual output and `diff`s against the `.desired.md`
expected file.

No workflow change needed — `bats sync-copilot-instructions/test/` from step 2
already discovers the new tests.

---

## Step 4: Add `sync-copilot-instructions/action.yml` composite action

Wire the composite action that orchestrates the helpers from steps 2 and 3.

**`sync-copilot-instructions/action.yml`** — composite action. Inputs match the
table in the issue body:

| Input           | Required | Default                             |
| --------------- | -------- | ----------------------------------- |
| `github-token`  | no       | `${{ github.token }}`               |
| `target-repo`   | no       | `""`                                |
| `canonical-ref` | no       | `"main"`                            |
| `branch-name`   | no       | `"chore/sync-copilot-instructions"` |

Single composite step (or a small handful of steps) running bash. Logic:

1. **Read canonical content** from `0k-software/.github` at `canonical-ref` via
   `gh api repos/0k-software/.github/contents/copilot-instructions.md?ref=…`
   (base64-decode). Hard-fail if it's missing.
2. **Resolve target list:**
   - If `target-repo` non-empty: `[target-repo]`. Hard-fail if unreachable.
   - Else: paginate `GET /installation/repositories` via `gh api --paginate`,
     filtering out archived repos. Hard-fail if the listing call itself errors.
3. **For each target (sequential), wrapped in a per-repo `||` so failures don't
   abort the loop:**
   - Open a `::group::` log group named after the repo.
   - Fetch `.github/copilot-instructions.md` (404 → use `/dev/null` for
     EXISTING).
   - Run `compute-desired.sh` to produce DESIRED.
   - Byte-compare DESIRED to EXISTING. Equal → log `in-sync`, close the group,
     continue.
   - Otherwise: shallow `git clone` of the target,
     `git checkout -B <branch-name>`, write DESIRED into place, `git add` +
     `git commit`, `git push --force-with-lease origin <branch-name>`.
   - If no PR is open on `<branch-name>`: open one (title/body templated from a
     heredoc — title `chore: sync Copilot instructions`, body links back to the
     canonical file and explains it's automated).
   - Status string for the summary: `pr-opened (created)` (file was missing),
     `pr-opened (drift)`, `pr-opened (markers-added)` (no markers in EXISTING),
     `pr-updated` (existing PR refreshed via force-push), `in-sync`, or
     `skipped (archived)`.
   - Per-repo errors (403, 5xx, push failure, etc.): log expected vs. remote
     diff if it's a push collision; record the repo in an error array and
     continue. Retry once on `Retry-After` (429) and on transient 5xx with
     short backoff, per the issue's error-handling table.
4. **Aggregate and exit:** print one summary line per repo (inside a closing
   `::group::Summary` block) and a one-line headline (e.g.
   `Synced 14 repos: 12 in-sync, 1 pr-opened, 1 error`). `exit 1` if the error
   array is non-empty, `exit 0` otherwise.

Helpers (`extract-org-section.sh`, `compute-desired.sh`) are invoked via
`${{ github.action_path }}/...` so the action is self-contained when consumed
via `uses: 0k-software/.github/sync-copilot-instructions@v1`.

Permissions documented in the README (step 5): `contents: write`,
`pull-requests: write`, `metadata: read` on each target, plus access to
`/installation/repositories`.

No CI wiring change in this step — the action is invoked manually via
`workflow_dispatch:` from `.github-private` (out of scope), and the self-test
path is the manual smoke described in the issue. Bats tests from steps 2 and 3
stay green.

---

## Step 5: Document the action and update root `README.md`

Final step: documentation, no behaviour changes.

**`sync-copilot-instructions/README.md`** — match the format of
`hide-addressed-reviews/README.md` and `check-pr-size/README.md`:

- Short summary of what the action does and where it fits (canonical content in
  this repo, sync workflow in `.github-private`).
- Usage example: a minimal `workflow_dispatch:` workflow snippet showing
  `actions/create-github-app-token` minting a token and passing it to
  `0k-software/.github/sync-copilot-instructions@v1`.
- Inputs table: `github-token`, `target-repo`, `canonical-ref`, `branch-name`.
- Permissions block: list the App permissions the token must carry
  (`contents: write`, `pull-requests: write`, `metadata: read`, plus access to
  `/installation/repositories`).
- "How it works" section: one paragraph each on canonical fetch, target
  resolution, per-repo loop, marker handling, and error aggregation.
- "Versioning & releases" closer pointing at the moving major tag, copying the
  existing pattern.

**`README.md` (repo root)** — add a row to the Composite Actions table:

| Action                                                               | `uses:` path                                    | Purpose                                                                        |
| -------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| [`sync-copilot-instructions`](./sync-copilot-instructions/README.md) | `0k-software/.github/sync-copilot-instructions` | Sync the org-wide canonical Copilot instructions into every repo's `.github/`. |

Run `npx prettier --write "**/*.md"` before committing so the pre-commit hook
passes.

# Plan: Restructure project board statuses and add `to-review` label across all projects

**Issue:** https://github.com/0k-software/.github/issues/75

## Summary

Write an idempotent `bin/setup-project-boards` Bash script that restructures
all non-Roadmap GitHub org project boards to a consistent 6-column layout
(`Backlog → Refining → Ready → Planning → Coding → Done`), migrates items from
`In Review` / `Reviewing *` columns to `Coding` with a `to-review` label
applied, and creates the `to-review` label in the `.github` repo (org default)
and in every source repo that has items in an affected project. The script
accepts `--dry-run` (default), `--apply`, and `--project <id>` flags for safe
staged rollout.

## Approach

Implement the script first, then follow a staged rollout: test on a temporary
copy of `[TEMPLATE] Triage`, get human sign-off, run full rollout across all
non-Roadmap projects, and clean up. Each GraphQL/REST call in the script is
self-contained so Claude can execute them individually via Bash if `gh` is not
authenticated in a remote session.

## Steps

- [ ] [Step 1: Write `bin/setup-project-boards`](#step-1-write-binsetup-project-boards)
- [ ] [Step 2: Staged rollout on temp project](#step-2-staged-rollout-on-temp-project)
- [ ] [Step 3: Full rollout after sign-off](#step-3-full-rollout-after-sign-off)
- [ ] [Step 4: Cleanup and verification](#step-4-cleanup-and-verification)

---

## Step 1: Write `bin/setup-project-boards`

Create `bin/setup-project-boards` as an executable Bash script with the
following behaviour:

**Flags**

- `--dry-run` (default): print every action that would be taken without making
  any changes.
- `--apply`: execute all mutations.
- `--project <id>`: restrict execution to a single project; skip discovery of
  others.

**Discovery**

- Query all org projects via GraphQL (`gh api graphql`).
- Filter out any project whose name contains `"Roadmap"`.
- If `--project` is given, use only that project and skip the filter.

**Label creation (before any item migration)**

- Create the `to-review` label (colour `#0075ca`, description
  `"Waiting for code review"`) in the `.github` repo (org default for future
  repos).
- Collect all source repos from items across all targeted projects.
- Create the same label in each source repo — idempotent, skip if already
  present.
- Labels must be created before items are migrated so the apply step can attach
  them immediately.

**Per-project restructure** For each targeted project:

1. Rename `In progress` → `Coding` (PATCH the option name via GraphQL).
2. Find all items in `In Review` or any `Reviewing *` column.
3. For each such item: move its status field to `Coding`; apply the `to-review`
   label to the underlying issue in its source repo.
4. Delete `In Review` / `Reviewing *` status options.
5. Create any status options missing from the required set: `Backlog`,
   `Refining`, `Ready`, `Planning`, `Coding`, `Done`.
6. Reorder status options to:
   `Backlog → Refining → Ready → Planning → Coding → Done`.

**Output**

- In `--dry-run` mode: prefix each line with `[dry-run]` and list the action,
  target, and expected mutation.
- In `--apply` mode: print `[applied]` with the result of each mutation.

**Exit codes**: `0` on success, `1` on any unrecoverable error.

Make the script executable (`chmod +x bin/setup-project-boards`).

---

## Step 2: Staged rollout on temp project

1. On GitHub, create a temporary copy of the `[TEMPLATE] Triage` project (via
   the project duplication UI or `gh api graphql`). Note its project node ID.
2. Run the script against it:
   ```
   bin/setup-project-boards --apply --project <temp-project-id>
   ```
3. Open the temp project on GitHub and inspect:
   - Columns are in the correct order:
     `Backlog → Refining → Ready → Planning → Coding → Done`.
   - No `In Review` / `Reviewing *` / `In progress` columns remain.
   - Any migrated items are in `Coding` with the `to-review` label.
   - `to-review` label exists in the `.github` repo and in each source repo
     that had items.
4. Report findings to the user and wait for explicit sign-off before proceeding
   to Step 3.

---

## Step 3: Full rollout after sign-off

After the user approves the temp-project result:

1. Run the script across all non-Roadmap projects:
   ```
   bin/setup-project-boards --dry-run
   ```
   Review the dry-run output to confirm the scope looks correct.
2. Run with `--apply`:
   ```
   bin/setup-project-boards --apply
   ```
3. Monitor output for any errors; report a summary of applied changes to the
   user.

---

## Step 4: Cleanup and verification

1. Delete the temporary project created in Step 2 (via GitHub UI or
   `gh api graphql`).
2. For each affected project, verify:
   - Status columns are exactly `Backlog`, `Refining`, `Ready`, `Planning`,
     `Coding`, `Done` in that order.
   - No `In Review`, `Reviewing *`, or `In progress` columns exist.
   - `to-review` label exists in the `.github` repo and in all source repos
     that had items.
3. Confirm with the user that the board structure looks correct before closing
   the issue.

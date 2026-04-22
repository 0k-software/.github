# Plan: Replace priority labels with a Priority project field

**Issue:** https://github.com/0k-software/.github/issues/99

## Summary

Replace the org-wide `priority-low` / `priority-medium` / `priority-high` label
convention with a **Priority** single-select field (`p-low`, `p-medium`,
`p-high`) on every GitHub Project, then remove the old labels from every repo
in the org.

## Approach

A single Bash script `scripts/one-time/20260422-setup-priority-field` runs
three sequential phases — add field, backfill values from labels, remove labels
— controlled by `--dry-run` (default) / `--apply` flags. Uses `gh api graphql`
for all API calls, idempotent throughout.

## Steps

- [ ] [Step 1: Script scaffold + Phase 1 (add Priority field to all projects)](#step-1-script-scaffold--phase-1-add-priority-field-to-all-projects)
- [ ] [Step 2: Phase 2 — backfill project items from priority labels](#step-2-phase-2--backfill-project-items-from-priority-labels)
- [ ] [Step 3: Phase 3 — remove priority labels from all repos](#step-3-phase-3--remove-priority-labels-from-all-repos)

---

## Step 1: Script scaffold + Phase 1 (add Priority field to all projects)

Create `scripts/one-time/20260422-setup-priority-field` with:

- Shebang `#!/usr/bin/env bash`, `set -euo pipefail`
- Argument parsing: `--dry-run` (default) / `--apply`; unknown flags print
  usage and exit 1
- Helper `run` that prints the command in dry-run mode and executes it in apply
  mode (mirrors the pattern in `scripts/setup-project-boards`)
- Phase 1: query all org ProjectsV2 via GraphQL
  (`organization(login: "0k-software") { projectsV2(first: 50) { ... } }`). For
  each project, check if a single-select field named "Priority" already exists.
  If not, create it via `addProjectV2SingleSelectField` mutation with options
  `p-low`, `p-medium`, `p-high` (in that order). Skip projects that already
  have the field.

Also create `scripts/one-time/` directory (with a `.gitkeep` if it would
otherwise be empty before the script is added).

---

## Step 2: Phase 2 — backfill project items from priority labels

Add Phase 2 to the script:

For each project, paginate through all items using
`projectV2(id: ...) { items(first: 100, after: $cursor) { ... } }`. For each
item whose linked issue carries one of the three priority labels, resolve the
mapping (`priority-low` → `p-low`, `priority-medium` → `p-medium`,
`priority-high` → `p-high`) and call `updateProjectV2ItemFieldValue` to set the
Priority field on that project item. Items in multiple projects are handled
naturally — each project's iteration sets the field on its own item. Issues
with a priority label but not in any project are silently skipped.

---

## Step 3: Phase 3 — remove priority labels from all repos

Add Phase 3 to the script:

Paginate through all org repos via
`organization(login: "0k-software") { repositories(first: 100, after: $cursor) { ... } }`.
For each repo, attempt to delete `priority-low`, `priority-medium`, and
`priority-high` via `DELETE /repos/{owner}/{repo}/labels/{name}`. A 404
response means the label doesn't exist — skip without error. `.github` is
included since it's returned as a regular org repo.

After Phase 3, print a summary: projects updated, items backfilled, labels
removed.

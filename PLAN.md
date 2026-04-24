# Plan: Add `in progress` and `to review` labels applied by skills

**Issue:** https://github.com/0k-software/.github/issues/81

## Summary

Create two GitHub labels (`in progress` and `to review`) and update four skills
(`refine`, `plan-init`, `plan-execute`, `fix`) to apply them at the right
moments. A one-time migration script provisions the labels org-wide. Document
the label lifecycle in `CLAUDE.md`.

## Approach

Each skill gets two label operations added: add `in progress` at its start,
swap to `to review` at its end (both silently skip if the label doesn't exist
in the target repo). The migration script creates the labels at the org level
and in every existing repo, supports `--dry-run`, and uses `curl` with
`GITHUB_TOKEN` throughout. Label operations in skills use `curl` with
`GITHUB_TOKEN` directly, as agreed for compatibility with issue #78.

## Steps

- [ ] [Step 1: Create migration script](#step-1-create-migration-script)
- [ ] [Step 2: Run migration script](#step-2-run-migration-script)
- [ ] [Step 3: Update `refine` skill](#step-3-update-refine-skill)
- [ ] [Step 4: Update `plan-init` skill](#step-4-update-plan-init-skill)
- [ ] [Step 5: Update `plan-execute` skill](#step-5-update-plan-execute-skill)
- [ ] [Step 6: Update `fix` skill](#step-6-update-fix-skill)
- [ ] [Step 7: Document label lifecycle in CLAUDE.md](#step-7-document-label-lifecycle-in-claudemd)

---

## Step 1: Create migration script

Create `scripts/one-time/2026-04-22-create-labels` as an executable shell
script (`chmod +x`). The file has no extension (consistent with `bin/`
convention).

The script must:

- Accept a `--dry-run` flag: when present, print what would happen without
  making any API calls.
- Require `GITHUB_TOKEN` to be set.

**Structure:**

```bash
#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=false
for arg in "$@"; do [[ "$arg" == "--dry-run" ]] && DRY_RUN=true; done

: "${GITHUB_TOKEN:?GITHUB_TOKEN must be set}"
```

**Create labels at org level** (print a manual-step warning on failure):

```bash
create_org_label() {
  local name="$1" color="$2" description="$3"
  if $DRY_RUN; then echo "[dry-run] org-level: '$name'"; return; fi
  curl -sf -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/orgs/0k-software/labels" \
    -d "{\"name\":\"$name\",\"color\":\"$color\",\"description\":\"$description\"}" \
    > /dev/null \
    || echo "⚠️  Could not create org-level label '$name' — create it manually at https://github.com/organizations/0k-software/settings/labels"
}

create_org_label "in progress" "0075ca" "An AI assistant is actively working on this"
create_org_label "to review"   "D93F0B" "Ready for human review"
```

**Create labels in each repo** (POST then PATCH on conflict makes it
idempotent):

```bash
create_repo_label() {
  local repo="$1" name="$2" color="$3" description="$4"
  local encoded_name
  encoded_name=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$name")
  if $DRY_RUN; then echo "[dry-run] $repo: '$name'"; return; fi
  curl -sf -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$repo/labels" \
    -d "{\"name\":\"$name\",\"color\":\"$color\",\"description\":\"$description\"}" \
    > /dev/null 2>&1 \
  || curl -sf -X PATCH \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$repo/labels/$encoded_name" \
    -d "{\"name\":\"$name\",\"color\":\"$color\",\"description\":\"$description\"}" \
    > /dev/null 2>&1 || true
}

repos=$(curl -sf \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/orgs/0k-software/repos?per_page=100" \
  | python3 -c "import json,sys; [print(r['full_name']) for r in json.load(sys.stdin)]")

while IFS= read -r repo; do
  echo "→ $repo"
  create_repo_label "$repo" "in progress" "0075ca" "An AI assistant is actively working on this"
  create_repo_label "$repo" "to review"   "D93F0B" "Ready for human review"
done <<< "$repos"
```

---

## Step 2: Run migration script

First do a dry run to preview what will happen:

```bash
bash scripts/one-time/2026-04-22-create-labels --dry-run
```

Then run for real to provision labels in the org and all existing repos:

```bash
bash scripts/one-time/2026-04-22-create-labels
```

`GITHUB_TOKEN` must be set before running. Verify that the `in progress` and
`to review` labels appear in at least one org repo before continuing.

---

## Step 3: Update `refine` skill

Edit `0k/skills/refine/SKILL.md`.

All label calls use `curl` with `GITHUB_TOKEN` directly (no `gh` CLI) for
compatibility with remote sessions and issue #78.

**Add `in progress`** — insert in the "Understanding the idea" block, after the
issue is fetched and `{issue-number}` and `{owner}/{repo}` are known:

````
After fetching the issue, apply the `in progress` label:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{issue-number}/labels" \
  -d '{"labels":["in progress"]}' > /dev/null 2>&1 || true
```
````

**Swap labels** — in the "User Review Gate" section, after updating the issue
body and before the waiting instruction:

````
Remove `in progress` and apply `to review` to signal the handoff:

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{issue-number}/labels/in%20progress" \
  > /dev/null 2>&1 || true
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{issue-number}/labels" \
  -d '{"labels":["to review"]}' > /dev/null 2>&1 || true
```
````

---

## Step 4: Update `plan-init` skill

Edit `0k/skills/plan-init/SKILL.md`.

**Add `in progress`** — at the end of Step 1 (Fetch the issue), once the issue
number is confirmed:

````
Apply the `in progress` label:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{issue-number}/labels" \
  -d '{"labels":["in progress"]}' > /dev/null 2>&1 || true
```
````

**Swap labels** — in Step 5 (Finalize), after `/0k:create-pr draft` and before
the Copilot review request:

````
Remove `in progress` and apply `to review`:

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{issue-number}/labels/in%20progress" \
  > /dev/null 2>&1 || true
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{issue-number}/labels" \
  -d '{"labels":["to review"]}' > /dev/null 2>&1 || true
```
````

---

## Step 5: Update `plan-execute` skill

Edit `0k/skills/plan-execute/SKILL.md`.

The issue number is always derivable from the branch name (leading digits, e.g.
`42-some-feature` → `42`). The owner/repo is derived from the git remote.

**Add `in progress`** — at the start of step 1 (before reading PLAN.md):

````
Derive the issue number and repo, then apply `in progress`:

```bash
issue_number=$(git branch --show-current | grep -oP '^\d+')
owner_repo=$(git remote get-url origin | grep -oP '[\w-]+/[\w.-]+(?=\.git|$)')
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/$issue_number/labels" \
  -d '{"labels":["in progress"]}' > /dev/null 2>&1 || true
```
````

**Swap labels** — in the "After all steps are complete" section, after step 5
(`gh pr edit --add-reviewer "@copilot"`):

````
Remove `in progress` and apply `to review`:

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/$issue_number/labels/in%20progress" \
  > /dev/null 2>&1 || true
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/$issue_number/labels" \
  -d '{"labels":["to review"]}' > /dev/null 2>&1 || true
```
````

---

## Step 6: Update `fix` skill

Edit `0k/skills/fix/SKILL.md`. GitHub PRs share the `/issues/{number}/labels`
endpoint, so the same `curl` pattern applies to both issues and PRs.

### Part A (PR target)

**Add `in progress`** — at the end of step A1 (after owner/repo and pr-number
are known):

````
Apply `in progress` to the PR:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{pr-number}/labels" \
  -d '{"labels":["in progress"]}' > /dev/null 2>&1 || true
```
````

**Swap labels** — at the end of step A5 (after reacting ✅ to all threads):

````
Remove `in progress` and apply `to review`:

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{pr-number}/labels/in%20progress" \
  > /dev/null 2>&1 || true
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{pr-number}/labels" \
  -d '{"labels":["to review"]}' > /dev/null 2>&1 || true
```
````

### Part B (issue target)

**Add `in progress`** — at the end of step B1 (after fetching issue details):

````
Apply `in progress` to the issue:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{issue-number}/labels" \
  -d '{"labels":["in progress"]}' > /dev/null 2>&1 || true
```
````

**Swap labels** — at the end of step B5 (after reacting ✅ to all comments):

````
Remove `in progress` and apply `to review`:

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{issue-number}/labels/in%20progress" \
  > /dev/null 2>&1 || true
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{issue-number}/labels" \
  -d '{"labels":["to review"]}' > /dev/null 2>&1 || true
```
````

---

## Step 7: Document label lifecycle in CLAUDE.md

Add a new `## Label Conventions` section to `CLAUDE.md` (and therefore
`AGENTS.md` via its symlink) after the existing `## Editing Guidelines`
section:

```markdown
## Label Conventions

Two labels track the AI work lifecycle across issues and PRs:

| Label         | Color      | Meaning                                     |
| ------------- | ---------- | ------------------------------------------- |
| `in progress` | blue       | An AI assistant is actively working on this |
| `to review`   | orange-red | The AI has finished; human review is needed |

**Lifecycle:** `in progress` → `to review` → human clears `to review`

Skills manage these labels automatically:

- Add `in progress` when a skill starts working on an issue or PR.
- Swap to `to review` when the skill hands off (end of `refine`, `plan-init`,
  `plan-execute`, and `fix`).

Do not manually set `in progress` during an active AI session. If either label
is absent from a repo, skill operations on it are silently skipped — run
`scripts/one-time/2026-04-22-create-labels` to provision the labels.
```

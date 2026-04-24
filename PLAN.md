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
and in every existing repo. CLAUDE.md gets a short section explaining the
lifecycle.

## Steps

- [ ] [Step 1: Create migration script](#step-1-create-migration-script)
- [ ] [Step 2: Update `refine` skill](#step-2-update-refine-skill)
- [ ] [Step 3: Update `plan-init` skill](#step-3-update-plan-init-skill)
- [ ] [Step 4: Update `plan-execute` skill](#step-4-update-plan-execute-skill)
- [ ] [Step 5: Update `fix` skill](#step-5-update-fix-skill)
- [ ] [Step 6: Document label lifecycle in CLAUDE.md](#step-6-document-label-lifecycle-in-claudemd)

---

## Step 1: Create migration script

Create `scripts/one-time/2026-04-22-create-labels` as an executable shell
script. The file has no extension (consistent with `bin/` convention).

The script must:

1. Attempt to create both labels at the **org level** via the GitHub API. Print
   a manual-step warning if this fails (e.g. insufficient permissions):

   ```bash
   gh api /orgs/0k-software/labels \
     -X POST \
     -f name="in progress" \
     -f color="0075ca" \
     -f description="An AI assistant is actively working on this" \
     2>/dev/null \
     || echo "⚠️  Could not create org-level label 'in progress' — create it manually at https://github.com/organizations/0k-software/settings/labels"

   gh api /orgs/0k-software/labels \
     -X POST \
     -f name="to review" \
     -f color="D93F0B" \
     -f description="Ready for human review" \
     2>/dev/null \
     || echo "⚠️  Could not create org-level label 'to review' — create it manually at https://github.com/organizations/0k-software/settings/labels"
   ```

2. List all repos in the org and create both labels in each. The `--force` flag
   updates the label if it already exists, making the script idempotent:

   ```bash
   gh repo list 0k-software --limit 100 --json nameWithOwner \
     --jq '.[].nameWithOwner' \
   | while read -r repo; do
       echo "→ $repo"
       gh label create "in progress" \
         --color "0075ca" \
         --description "An AI assistant is actively working on this" \
         --repo "$repo" --force 2>/dev/null || true
       gh label create "to review" \
         --color "D93F0B" \
         --description "Ready for human review" \
         --repo "$repo" --force 2>/dev/null || true
     done
   ```

Make the script executable (`chmod +x`).

---

## Step 2: Update `refine` skill

Edit `0k/skills/refine/SKILL.md`.

**Add `in progress`** — insert after the "Fetch issue and explore context"
checklist item description (i.e. once the issue number is known), as a new
labelled instruction block in the process section. The exact location is after
the "Understanding the idea" block opens with "Fetch the issue" steps. Add:

````
After fetching the issue, apply the `in progress` label:

​```bash
gh issue edit {issue-number} --repo {owner}/{repo} \
  --add-label "in progress" 2>/dev/null || true
​```
````

**Swap labels** — in the "User Review Gate" section, after updating the issue
body on GitHub and before the waiting instruction, add:

````
Remove `in progress` and apply `to review` to signal the handoff:

​```bash
gh issue edit {issue-number} --repo {owner}/{repo} \
  --remove-label "in progress" --add-label "to review" 2>/dev/null || true
​```
````

---

## Step 3: Update `plan-init` skill

Edit `0k/skills/plan-init/SKILL.md`.

**Add `in progress`** — at the end of Step 1 (Fetch the issue), once the issue
number is confirmed, add:

````
Apply the `in progress` label:

​```bash
gh issue edit {issue-number} --repo {owner}/{repo} \
  --add-label "in progress" 2>/dev/null || true
​```
````

**Swap labels** — in Step 5 (Finalize), after step 2 (`/0k:create-pr draft`)
and before step 3 (Copilot review request), add:

````
Remove `in progress` and apply `to review`:

​```bash
gh issue edit {issue-number} --repo {owner}/{repo} \
  --remove-label "in progress" --add-label "to review" 2>/dev/null || true
​```
````

---

## Step 4: Update `plan-execute` skill

Edit `0k/skills/plan-execute/SKILL.md`.

The issue number is always derivable from the branch name (leading digits, e.g.
`42-some-feature` → `42`). The owner/repo comes from
`git remote get-url origin`.

**Add `in progress`** — at the start of step 1 (before reading PLAN.md), add:

````
Derive the issue number from the branch name and apply `in progress`:

​```bash
issue_number=$(git branch --show-current | grep -oP '^\d+')
owner_repo=$(git remote get-url origin | grep -oP '[\w-]+/[\w.-]+(?=\.git|$)')
gh issue edit "$issue_number" --repo "$owner_repo" \
  --add-label "in progress" 2>/dev/null || true
​```
````

**Swap labels** — in the "After all steps are complete" section, after step 5
(`gh pr edit --add-reviewer "@copilot"`), add:

````
Remove `in progress` and apply `to review`:

​```bash
gh issue edit "$issue_number" --repo "$owner_repo" \
  --remove-label "in progress" --add-label "to review" 2>/dev/null || true
​```
````

---

## Step 5: Update `fix` skill

Edit `0k/skills/fix/SKILL.md`.

### Part A (PR target)

**Add `in progress`** — at the end of step A1 (after the owner/repo and
pr-number are known), add:

````
Apply `in progress` to the PR:

​```bash
gh pr edit {pr-number} --repo {owner}/{repo} \
  --add-label "in progress" 2>/dev/null || true
​```
````

**Swap labels** — at the end of step A5 (after reacting ✅ to all threads),
add:

````
Remove `in progress` and apply `to review`:

​```bash
gh pr edit {pr-number} --repo {owner}/{repo} \
  --remove-label "in progress" --add-label "to review" 2>/dev/null || true
​```
````

### Part B (issue target)

**Add `in progress`** — at the end of step B1 (after fetching the issue
details), add:

````
Apply `in progress` to the issue:

​```bash
gh issue edit {issue-number} --repo {owner}/{repo} \
  --add-label "in progress" 2>/dev/null || true
​```
````

**Swap labels** — at the end of step B5 (after reacting ✅ to all comments),
add:

````
Remove `in progress` and apply `to review`:

​```bash
gh issue edit {issue-number} --repo {owner}/{repo} \
  --remove-label "in progress" --add-label "to review" 2>/dev/null || true
​```
````

---

## Step 6: Document label lifecycle in CLAUDE.md

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

---
name: plan-init
description:
  Create an implementation plan (PLAN.md) from a GitHub issue — fetch issue
  details, design steps, commit, and open a draft PR
---

Before proceeding, read the shared format definition at
`0k/references/PLAN_FORMAT.md` (relative to the plugin root). Use the `Read`
tool on that file to learn the PLAN.md structure.

---

`$ARGUMENTS` is an issue number or URL. If empty, try to infer the issue number
from the current branch name — if the branch name starts with digits (e.g.
`42-some-feature`), use that number. If no number can be inferred, ask the user
which issue to plan.

## Step 1 — Fetch the issue

Fetch the issue details at `$ARGUMENTS`. You'll need the title, body, and
comments to write the plan. Apply the `in progress` label:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{issue-number}/labels" \
  -d '{"labels":["in progress"]}' > /dev/null 2>&1 || true
```

## Step 2 — Set up the branch

Check the current branch and prepare the remote origin branch for the push and
PR that will follow.

```
git branch --show-current
```

**Already on a correctly-named branch** (starts with `{number}-`, e.g.
`42-some-feature`): the branch is already set up. Skip the rest of this section
and proceed to Step 3. The issue number is the leading digits of the branch
name.

Otherwise, derive the target branch name as `{issue-number}-{slug}` where
`{slug}` is the issue title lowercased, spaces replaced with hyphens, special
characters stripped, and kept to **≤ 20 characters** — pick 2–3 words that
capture the area or context (the issue number already provides full
traceability).

**On `main`/`master` (local session):** create and check out the branch:

```
gh issue develop {issue-number} --name {branch-name}
git fetch origin {branch-name} && git checkout {branch-name}
```

`gh issue develop` creates the remote branch and links it to the issue on
GitHub. `git fetch` + `git checkout` then checks out the branch locally.

**On any other branch** (e.g. `claude/*` remote/web session): the session
already has its own branch but doesn't follow the naming convention. Push it to
the standard-named branch and rename the local branch to match:

```
git push -u origin HEAD:{branch-name}
git branch -m {branch-name}
```

This maps the session branch to the `{issue-number}-{slug}` convention on
GitHub and renames the local branch to match, so subsequent commands (including
`create-pr`) use the correct name.

## Step 3 — Create PLAN.md

Create PLAN.md following the format defined in `PLAN_FORMAT.md`. Include the
link, a summary of the issue, the overall approach, a TOC checklist with anchor
links, and a detailed section for each step describing what to implement and
how.

## Step 4 — Scope check

Count the unchecked steps in the TOC (lines matching `- [ ]`). Each step maps
to roughly one commit; use this to predict PR size:

| Step count | Estimated PR size | Action                       |
| ---------- | ----------------- | ---------------------------- |
| ≤ 6        | ≤ ~500 lines      | Single PR — proceed normally |
| ≥ 7        | > ~500 lines      | Scope down required          |

**When the step count is ≥ 7**, the plan is too large for a single reviewable
PR. Present the two options and ask the user to choose:

- **A — Scope down (recommended):** Keep only the first deliverable group here
  and extract the rest into follow-up GitHub issues. Preserves the 1-issue →
  1-PR ratio and avoids planning work prematurely.
- **B — Continue as-is:** Keep the full plan in a single PR.

**If the user chooses A**, first perform the scope-down steps before
finalizing:

1. **Propose a grouping.** Identify the first logical deliverable group (≤ 6
   steps). Group the remaining steps into follow-up batches. Show the proposed
   grouping and ask the user to confirm or adjust.
2. **Trim PLAN.md** to contain only the first group's steps.
3. **Create a follow-up GitHub issue** for each remaining group using
   `/0k:create-issue`. Include enough context for a future implementer and link
   back to the original issue. If a group depends on a previous group being
   complete, set the "Blocked by" relation in GitHub to the preceding issue so
   implementation order is clear.
4. **Update the original issue** to reflect its now-smaller scope:
   - Edit the issue body so it describes only what this first group covers.
   - Leave a comment on the issue listing the extracted follow-up issues with
     links, e.g.: "Extracted to: #X (group 2 title), #Y (group 3 title)."

## Step 5 — Finalize

Whether the step count was ≤ 6, or the user chose A (after the scope-down steps
above), or the user chose B:

1. Run `/0k:commit ! plan: {issue title}` to commit PLAN.md.
2. Invoke `/0k:create-pr draft {issue-number}` to push the branch and open a
   draft PR linking to the issue.
3. Remove `in progress` and apply `to review`:

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

4. Run `gh pr edit --add-reviewer "@copilot"` to request a Copilot review.

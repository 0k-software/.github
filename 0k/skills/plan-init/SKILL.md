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

Plan the GH issue at `$ARGUMENTS`. Fetch the issue details, then create PLAN.md
following the format defined in `PLAN_FORMAT.md`. Include the link, a summary
of the issue, the overall approach, a TOC checklist with anchor links, and a
detailed section for each step describing what to implement and how.

**Before creating PLAN.md**, check the current branch:

```
git branch --show-current
```

If the current branch is `main` or `master`, create a new branch derived from
the issue. Build the branch name as `{issue-number}-{slug}` where `{slug}` is
the issue title lowercased, spaces replaced with hyphens, special characters
stripped, and kept to **≤ 20 characters** — pick 2–3 words that capture the
area or context (the issue number already provides full traceability). Then
run:

```
gh issue develop {issue-number} --name {branch-name}
wt switch {branch-name}
```

`gh issue develop` creates the branch and links it to the issue on GitHub.
`wt switch` switches to it via a worktree.

After creating PLAN.md, perform a **scope check** before committing:

## Scope Check

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

**If the user chooses A:**

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
5. Run `/0k:commit ! plan: {issue title}` to commit the scoped-down PLAN.md.
6. Invoke `/0k:create-pr draft {issue-number}` to push and open the draft PR.
7. Run `gh pr edit --add-reviewer "copilot"` to request a Copilot review.

**If the user chooses B:**

1. Run `/0k:commit ! plan: {issue title}` to commit the full PLAN.md.
2. Invoke `/0k:create-pr draft {issue-number}` to push and open the draft PR.
3. Run `gh pr edit --add-reviewer "copilot"` to request a Copilot review.

**When the step count is ≤ 6**, continue with the normal flow:

1. Run `/0k:commit ! plan: {issue title}` to commit it.
2. Invoke `/0k:create-pr draft {issue-number}` to push the branch and open a
   draft PR linking to the issue.
3. Run `gh pr edit --add-reviewer "copilot"` to request a Copilot review.

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

After creating PLAN.md:

1. Run `/0k:commit ! plan: {issue title}` to commit it.
2. Invoke `/0k:create-pr draft {issue-number}` to push the branch and open a
   draft PR linking to the issue.

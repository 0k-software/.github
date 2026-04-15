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

| Step count | Estimated PR size | Recommendation               |
| ---------- | ----------------- | ---------------------------- |
| ≤ 6        | ≤ ~500 lines      | Single PR — proceed normally |
| 7–9        | ~500–750 lines    | Warn, ask whether to split   |
| ≥ 10       | > 750 lines       | Strongly recommend splitting |

**When the step count is ≥ 7**, display this warning before committing:

> ⚠️ This plan has {N} steps. At ~80 lines per commit, that's roughly {N × 80}
> changed lines — likely over the 500-line reviewability threshold. Consider
> splitting into stacked PRs now rather than using `/split-branch` later.
>
> Split into multiple PRs? [Y/n]

**If the user declines** (or step count is ≤ 6), continue with the normal flow:

1. Run `/0k:commit ! plan: {issue title}` to commit it.
2. Invoke `/0k:create-pr draft {issue-number}` to push the branch and open a
   draft PR linking to the issue.

**If the user agrees** (or does not explicitly decline when count ≥ 10):

1. **Propose a grouping.** Partition the steps into batches of ≤ 6 steps,
   keeping logically related steps together (e.g. migration with its schema, a
   feature with its tests). Present the proposed grouping:

   ```
   Proposed split into {M} plans:

     Plan 1 — "{theme}" ({N} steps)
       • Step 1: …
       • Step 2: …

     Plan 2 — "{theme}" ({N} steps)
       • Step 3: …
       …
   ```

   Ask the user to confirm or adjust before writing any files.

2. **Create one file per batch**: `PLAN-1.md`, `PLAN-2.md`, … `PLAN-{M}.md`.
   Each file follows the standard PLAN_FORMAT.md structure (renumber steps from
   1 within each file). Add a one-line preamble after the Summary:
   - `PLAN-1.md`: `> Part 1 of {M} — next: PLAN-2.md`
   - `PLAN-N.md` (N > 1): `> Part {N} of {M} — previous: PLAN-{N-1}.md`

   Do **not** create a `PLAN.md`.

3. Run `/0k:commit ! plan: {issue title} (split into {M} parts)` to commit all
   PLAN files together.

4. Invoke `/0k:create-pr draft {issue-number}` to push and open the first draft
   PR.

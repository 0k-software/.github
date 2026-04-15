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
> changed lines — likely over the 500-line reviewability threshold. How would
> you like to handle this?
>
> **A (recommended):** Scope this plan down to the first deliverable group and
> create new GitHub issues for the remaining work. Keeps a clean 1-issue → 1-PR
> ratio and avoids planning work you don't need yet.
>
> **B:** Split the full plan into stacked PRs linked to the same issue. Creates
> `PLAN-1.md`, `PLAN-2.md`, … and opens a PR chain.
>
> **C:** Continue with the full plan in a single PR.

**Option A — Scope down + defer (recommended):**

1. **Propose a grouping.** Identify the first logical deliverable group (≤ 6
   steps). Group the remaining steps into follow-up batches. Show the proposed
   grouping and ask the user to confirm or adjust.
2. **Trim PLAN.md** to contain only the first group's steps.
3. **Create a follow-up GitHub issue** for each remaining group using
   `/0k:create-issue`. Include enough context for a future implementer and link
   back to the original issue.
4. Run `/0k:commit ! plan: {issue title}` to commit the scoped-down PLAN.md.
5. Invoke `/0k:create-pr draft {issue-number}` to push and open the draft PR.

**Option B — Stacked PRs:**

1. **Propose a grouping.** Partition all steps into batches of ≤ 6, keeping
   logically related steps together. Show the proposed split and ask to
   confirm:

   ```
   Proposed split into {M} plans:

     Plan 1 — "{theme}" ({N} steps)
       • Step 1: …

     Plan 2 — "{theme}" ({N} steps)
       • Step 3: …
   ```

2. **Create one file per batch**: `PLAN-1.md`, `PLAN-2.md`, … `PLAN-{M}.md`.
   Each follows the standard PLAN_FORMAT.md structure (steps renumbered from
   1). Add a one-line preamble after the Summary:
   - `PLAN-1.md`: `> Part 1 of {M} — next: PLAN-2.md`
   - `PLAN-N.md` (N > 1): `> Part {N} of {M} — previous: PLAN-{N-1}.md`

   Do **not** create a `PLAN.md`.

3. Run `/0k:commit ! plan: {issue title} (split into {M} parts)` to commit all
   PLAN files together.
4. Invoke `/0k:create-pr draft {issue-number}` to push and open the first draft
   PR.

**Option C — Proceed as-is:**

1. Run `/0k:commit ! plan: {issue title}` to commit it.
2. Invoke `/0k:create-pr draft {issue-number}` to push and open the draft PR.

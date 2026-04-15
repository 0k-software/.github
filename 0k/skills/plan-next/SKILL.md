---
name: plan-next
description:
  Implement the next unchecked step in PLAN.md — code the change, mark the step
  done, and commit
---

Before proceeding, read the shared format definition at
`0k/references/PLAN_FORMAT.md` (relative to the plugin root). Use the `Read`
tool on that file to learn the PLAN.md structure.

---

**Resolve the active plan file** before doing anything else:

1. If `PLAN.md` exists in the working directory, use it.
2. Otherwise, look for `PLAN-*.md` files. Use the lowest-numbered one that
   still has unchecked steps (`- [ ]`).
3. If no plan file is found, stop and tell the user there is no active plan.

Read the resolved plan file and implement the next unchecked step. Once done,
mark the step as done (`- [x]`) in the plan file's TOC and invoke the
`/0k:commit` skill with the `!` flag, passing the step title/description as
context.

If the implementation required any deviation from the original step description
(different approach, scope change, discovered constraints), update the step's
section in the plan file to reflect what was actually done. Also review the
remaining unchecked steps — if the deviation affects them, carefully update
their descriptions to stay accurate and consistent with the current state of
the codebase.

**If all steps in the active plan file are now checked off**, and the file is a
`PLAN-N.md` (not `PLAN.md`), check whether a `PLAN-{N+1}.md` exists:

- If it does, notify the user:
  > Part {N} complete. Next: implement `PLAN-{N+1}.md`. Create a new stacked
  > branch targeting the current one, then run `/0k:plan-execute` or
  > `/0k:plan-next` to continue.
- If it doesn't, the full plan is done — follow the normal plan-complete
  cleanup (remove the plan file, commit, mark the PR ready).

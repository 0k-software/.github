---
name: plan-execute
description:
  Run all remaining steps in PLAN.md autonomously — implement, commit, and
  repeat until the plan is complete
---

Before proceeding, read the shared format definition at
`0k/references/PLAN_FORMAT.md` (relative to the plugin root). Use the `Read`
tool on that file to learn the PLAN.md structure.

---

Run every remaining step in PLAN.md, one after another, until none are left.

**Procedure:**

1. Read PLAN.md and collect **all** unchecked (`- [ ]`) steps.
2. If no unchecked steps exist → stop and report "Plan complete."
3. Use `TodoWrite` to create **one task per unchecked step** (in order), so the
   full work queue is visible upfront before any execution begins.
4. For each task in the `TodoWrite` list (in order):
   - Execute the step exactly as `/0k:plan-next` would (implement, mark the
     step done in PLAN.md, commit, update plan if needed).
   - Mark the corresponding `TodoWrite` task as completed.
   - Continue immediately to the next task.
5. Once every `TodoWrite` task is marked done, report "Plan complete."

**Important:** Do NOT stop after a single step. The `TodoWrite` list is the
complete work queue — keep going until every task is checked off. Only stop on
an unrecoverable error (in which case, explain what blocked you and which steps
remain).

**After all steps are complete:**

1. Run `git rm PLAN.md` to remove the working artifact.
2. Commit the removal using `/0k:commit`.
3. Run `gh pr ready` to mark the current branch's PR as ready for review.
4. Push the final commit.

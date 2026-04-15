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

Run every remaining step in all plan files, one after another, until none are
left.

## Resolve the plan file(s)

Before building the work queue, determine which plan file(s) are in play:

- If `PLAN.md` exists, **single-plan mode**: only `PLAN.md` is used.
- Otherwise, collect all `PLAN-N.md` files sorted numerically. This is
  **multi-plan mode**.

If no plan file is found, stop and report "No active plan found."

## Procedure

1. Collect **all** unchecked (`- [ ]`) steps across the active plan file(s), in
   order (within each file, then across files in numerical order).
2. If no unchecked steps exist → stop and report "Plan complete."
3. Use `TodoWrite` to create **one task per unchecked step** (in order), so the
   full work queue is visible upfront before any execution begins. Prefix each
   task with its source file when in multi-plan mode (e.g.
   `[PLAN-1] Step 1: …`).
4. For each task in the `TodoWrite` list (in order):
   - Execute the step exactly as `/0k:plan-next` would (implement, mark the
     step done in the plan file, commit, update plan if needed).
   - Mark the corresponding `TodoWrite` task as completed.
   - Continue immediately to the next task.
5. Once every `TodoWrite` task is marked done, report "Plan complete."

**Important:** Do NOT stop after a single step. The `TodoWrite` list is the
complete work queue — keep going until every task is checked off. Only stop on
an unrecoverable error (in which case, explain what blocked you and which steps
remain).

## After all steps in a plan file are complete (multi-plan mode)

When the last step of `PLAN-N.md` is committed and `PLAN-{N+1}.md` exists:

1. Run `git rm PLAN-{N}.md` and commit the removal using `/0k:commit`.
2. Mark the current PR as ready for review.
3. Ask the user to create a new stacked branch targeting the current one for
   `PLAN-{N+1}.md`, then continue execution there.

## After all steps are complete

**Single-plan mode (`PLAN.md`):**

1. Run `git rm PLAN.md` to remove the working artifact.
2. Commit the removal using `/0k:commit`.
3. Mark the current branch's PR as ready for review.
4. Push the final commit.

**Multi-plan mode (last `PLAN-N.md`):**

Follow the same cleanup as single-plan mode, using the last `PLAN-N.md`
filename.

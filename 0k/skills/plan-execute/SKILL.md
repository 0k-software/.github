---
name: plan-execute
description:
  Run all remaining steps in PLAN.md autonomously — implement, commit, and
  repeat until the plan is complete
---

Before proceeding, read the shared format definition at
`0k/skills/plan/PLAN_FORMAT.md` (relative to the plugin root). Use the `Read`
tool on that file to learn the PLAN.md structure.

---

Run every remaining step in PLAN.md, one after another, until none are left.

**Procedure — loop until done:**

1. Read PLAN.md and find the first unchecked (`- [ ]`) step.
2. If no unchecked step exists → stop and report "Plan complete."
3. Otherwise, execute that step exactly as `/0k:plan-next` would (implement,
   mark done, commit, update plan if needed).
4. Go back to step 1.

**Important:** Do NOT stop after a single step. The whole point of `execute` is
to finish the entire plan autonomously. Keep going until every step is checked
off or an unrecoverable error forces you to stop (in which case, explain what
blocked you and which steps remain).

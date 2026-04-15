---
name: plan-next
description:
  Implement the next unchecked step in PLAN.md — code the change, mark the step
  done, and commit
---

Before proceeding, read the shared format definition at
`0k/skills/plan/PLAN_FORMAT.md` (relative to the plugin root). Use the `Read`
tool on that file to learn the PLAN.md structure.

---

Read PLAN.md and implement the next unchecked step. Once done, mark the step as
done (`- [x]`) in the PLAN.md TOC and invoke the `/0k:commit` skill with the
`!` flag, passing the step title/description as context.

If the implementation required any deviation from the original step description
(different approach, scope change, discovered constraints), update the step's
section in PLAN.md to reflect what was actually done. Also review the remaining
unchecked steps — if the deviation affects them, carefully update their
descriptions to stay accurate and consistent with the current state of the
codebase.

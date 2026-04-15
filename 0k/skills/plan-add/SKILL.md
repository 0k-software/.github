---
name: plan-add
description: Add a new step to an existing PLAN.md
---

Before proceeding, read the shared format definition at
`0k/references/PLAN_FORMAT.md` (relative to the plugin root). Use the `Read`
tool on that file to learn the PLAN.md structure.

---

Read PLAN.md to understand the existing step format and numbering. Insert a new
step following the same format at the position requested in `$ARGUMENTS` (if no
position is given, assume it should be appended at the end). The step should be
atomic and clearly describe what will be committed. Use `$ARGUMENTS` as the
basis for the step content.

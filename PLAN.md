# Plan: Merge `plan-next` into `plan-execute`

**Issue:** https://github.com/0k-software/.github/issues/49

## Summary

The `plan-next` skill implements a single PLAN.md step at a time, while
`plan-execute` runs the full plan autonomously by delegating each step "exactly
as `/0k:plan-next` would." The step-by-step strategy is no longer used in
practice, so keeping `plan-next` as a separate skill is pure indirection. This
plan inlines the step-execution logic directly into `plan-execute`, deletes the
`plan-next` skill, and removes external references to it.

## Approach

1. Inline the `plan-next` per-step procedure into `plan-execute/SKILL.md`,
   replacing the "exactly as `/0k:plan-next` would" delegation with the
   concrete steps.
2. Delete the `0k/skills/plan-next/` directory entirely.
3. Remove the `plan-next` row from the skills table in `README.md`. Leave
   `CHANGELOG.md` untouched since its `plan-next` reference is a historical
   entry.

## Steps

- [ ] [Step 1: Inline plan-next procedure into plan-execute](#step-1-inline-plan-next-procedure-into-plan-execute)
- [ ] [Step 2: Delete the plan-next skill](#step-2-delete-the-plan-next-skill)
- [ ] [Step 3: Remove plan-next from README skills table](#step-3-remove-plan-next-from-readme-skills-table)

---

## Step 1: Inline plan-next procedure into plan-execute

Edit `0k/skills/plan-execute/SKILL.md`. In the "For each task" bullet list,
replace the single sub-bullet that currently reads:

> - Execute the step exactly as `/0k:plan-next` would (implement, mark the step
>   done in PLAN.md, commit, update plan if needed).

with the full `plan-next` procedure expanded inline — implement the change,
mark the step `- [x]` in the PLAN.md TOC, invoke `/0k:commit !` with the step
title/description as context, and if the implementation deviated from the
original step description (different approach, scope change, discovered
constraints) update that step's section plus any affected later steps so the
plan stays consistent.

Preserve the surrounding structure of `plan-execute`: the upfront `TodoWrite`
queue, the "mark the corresponding TodoWrite task as completed" sub-bullet, the
"Important: do not stop after a single step" note, and the post-plan cleanup
block (`git rm PLAN.md`, `/0k:commit`, `gh pr ready`, push, Copilot re-review).

---

## Step 2: Delete the plan-next skill

Remove the `0k/skills/plan-next/` directory (contains only `SKILL.md`):

```
git rm -r 0k/skills/plan-next
```

After this step `plan-execute` fully covers the per-step behaviour, so the
standalone skill is no longer referenced by any other skill.

---

## Step 3: Remove plan-next from README skills table

Edit `README.md` and delete the table row:

```
| `plan-next`      | `/0k:plan-next`      | Implement the next unchecked step in PLAN.md         |
```

Keep the surrounding rows intact and verify the Markdown table still aligns. Do
**not** edit `CHANGELOG.md` — its `plan-next` mention is a historical entry
describing when the skill was originally added and must remain accurate as
history.

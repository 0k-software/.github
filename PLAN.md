# Plan: Split `plan` skill into individual `plan-*` skills

**Issue:** https://github.com/0k-software/.github/issues/30

## Summary

Split the monolithic `plan` skill into four dedicated skills (`plan-init`,
`plan-next`, `plan-add`, `plan-execute`) and extract the shared PLAN.md format
definition into a common file that each skill reads at runtime.

## Approach

Extract the PLAN.md format spec into `0k/skills/plan/PLAN_FORMAT.md`, create
four new skill directories each with a focused `SKILL.md` that references the
shared format file, then remove the original monolithic skill. Update any
cross-references in other skills.

## Steps

- [x] [Step 1: Extract PLAN_FORMAT.md](#step-1-extract-planformatmd)
- [x] [Step 2: Create plan-init skill](#step-2-create-plan-init-skill)
- [x] [Step 3: Create plan-next skill](#step-3-create-plan-next-skill)
- [x] [Step 4: Create plan-add skill](#step-4-create-plan-add-skill)
- [x] [Step 5: Create plan-execute skill](#step-5-create-plan-execute-skill)
- [x] [Step 6: Remove original plan skill and update references](#step-6-remove-original-plan-skill-and-update-references)

---

## Step 1: Extract PLAN_FORMAT.md

Create `0k/skills/plan/PLAN_FORMAT.md` containing the PLAN.md format definition
(lines 8-44 of the current `SKILL.md`): the template structure, field
descriptions, and the rules about atomic commits and checklist conventions.
This file becomes the single source of truth that all `plan-*` skills will read
at runtime.

---

## Step 2: Create plan-init skill

Create `0k/skills/plan-init/SKILL.md` with:

- Frontmatter: `name: plan-init`, description about initializing a plan from a
  GH issue
- An instruction to read `../plan/PLAN_FORMAT.md` before proceeding
- The `init` command content from the current plan skill (lines 52-67)
- References to `/0k:commit` and `/0k:create-pr` remain as-is

---

## Step 3: Create plan-next skill

Create `0k/skills/plan-next/SKILL.md` with:

- Frontmatter: `name: plan-next`, description about implementing the next
  unchecked step
- An instruction to read `../plan/PLAN_FORMAT.md` before proceeding
- The `next` command content from the current plan skill (lines 69-80)

---

## Step 4: Create plan-add skill

Create `0k/skills/plan-add/SKILL.md` with:

- Frontmatter: `name: plan-add`, description about adding a new step to the
  plan
- An instruction to read `../plan/PLAN_FORMAT.md` before proceeding
- The `add` command content from the current plan skill (lines 82-88)

---

## Step 5: Create plan-execute skill

Create `0k/skills/plan-execute/SKILL.md` with:

- Frontmatter: `name: plan-execute`, description about running all remaining
  plan steps
- An instruction to read `../plan/PLAN_FORMAT.md` before proceeding
- The `execute` command content from the current plan skill (lines 90-107),
  with the self-reference updated from `/0k:plan next` to `/0k:plan-next`

---

## Step 6: Remove original plan skill and update references

Delete `0k/skills/plan/SKILL.md` (the shared `PLAN_FORMAT.md` stays in the
`plan/` directory). Grep across the repo for any remaining `/0k:plan`
references and update them to point to the appropriate new skill.

---

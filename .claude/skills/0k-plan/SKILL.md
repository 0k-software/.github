---
name: 0k-plan
description:
  Manage a GH issue implementation plan — `init <url>`, `next`, `add <desc>`,
  `execute`
---

## PLAN.md format

```
# Plan: <issue title>

**Issue:** <url>

## Summary
<brief description of what the issue is about>

## Approach
<overall implementation strategy>

## Steps

- [ ] [Step 1: <title>](#step-1-title)
- [ ] [Step 2: <title>](#step-2-title)
- ...

---

## Step 1: <title>

<detailed description of what to implement and how>

---

## Step 2: <title>

<detailed description of what to implement and how>
```

Each step is an atomic commit — the smallest change that passes the project's
git pre-commit hooks.

Completed steps have `- [x]` in the TOC checklist.

---

## Commands

Based on `$ARGUMENTS`, run one of the following:

### `init <gh-url>`

Plan the GH issue at `<gh-url>`. Fetch the issue details, then create PLAN.md
following the format above. Include the link, a summary of the issue, the
overall approach, a TOC checklist with anchor links, and a detailed section for
each step describing what to implement and how.

### `next`

Read PLAN.md and implement the next unchecked step. Once done, mark the step as
done (`- [x]`) in the PLAN.md TOC and run `/0k-commit` with the step
title/description as context.

If the implementation required any deviation from the original step description
(different approach, scope change, discovered constraints), update the step's
section in PLAN.md to reflect what was actually done. Also review the remaining
unchecked steps — if the deviation affects them, carefully update their
descriptions to stay accurate and consistent with the current state of the
codebase.

### `add <description>`

Read PLAN.md to understand the existing step format and numbering. Insert a new
step following the same format at the position requested in the `<description>`
(if no position is given, assume it should be appended at the end). The step
should be atomic and clearly describe what will be committed. Use
`<description>` as the basis for the step content.

### `execute`

Run every remaining step in PLAN.md, one after another, until none are left.

**Procedure — loop until done:**

1. Read PLAN.md and find the first unchecked (`- [ ]`) step.
2. If no unchecked step exists → stop and report "Plan complete."
3. Otherwise, execute that step exactly as `/0k-plan next` would (implement,
   mark done, commit, update plan if needed).
4. Go back to step 1.

**Important:** Do NOT stop after a single step. The whole point of `execute` is
to finish the entire plan autonomously. Keep going until every step is checked
off or an unrecoverable error forces you to stop (in which case, explain what
blocked you and which steps remain).

---

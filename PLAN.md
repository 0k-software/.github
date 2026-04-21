# Plan: /refine: update issue title alongside spec body

**Issue:** https://github.com/0k-software/.github/issues/90

## Summary

The `/refine` skill currently updates the issue body when writing the spec doc
but leaves the title untouched. This means the issue title may still reflect a
vague placeholder after refinement. This change makes `/refine` update the
title alongside the body, with guidance on what makes a good title, and
announces the change in the user review gate message.

## Approach

Three targeted edits to `0k/skills/refine/SKILL.md`: update the checklist item,
add a title-update instruction with quality guidance in the Documentation
section, and update the User Review Gate template message to announce the title
change.

## Steps

- [x] [Step 1: Update SKILL.md with title-update instruction](#step-1-update-skillmd-with-title-update-instruction)

---

## Step 1: Update SKILL.md with title-update instruction

Three edits to `0k/skills/refine/SKILL.md`:

**1. Checklist item 6** — change "post as issue body" to "update issue title
and body":

```
6. **Write design doc** — update issue title and body, filling all template sections
```

**2. Documentation section** — after the sentence "Post the spec as the updated
issue body on GitHub…", add:

> Also update the issue title to reflect the refined purpose. A good title is
> specific (captures what was actually discovered in refinement, not the
> original placeholder), concise (readable in the issue list without
> truncation), and written as a short noun phrase or imperative verb phrase.

**3. User Review Gate template** — update the example message from "Spec posted
to the issue body…" to "Updated the title to `{new title}` and posted the spec
to the issue body…":

```
> "Updated the title to `{new title}` and posted the spec to the issue body. Please review at <issue-url> and let me know if you want any changes before we create the implementation plan. If you leave comments on the issue, run `/fix` to address them."
```

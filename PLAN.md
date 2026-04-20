# Plan: Slim `create-issue` skill: populate fields from $ARGUMENTS context, keep template defaults for empty fields

**Issue:** https://github.com/0k-software/.github/issues/74

## Summary

The `create-issue` skill currently asks the user for any field it cannot infer
from the description — a friction-heavy flow. This change makes creation
low-friction: the title is always taken from `$ARGUMENTS`, other fields are
populated with whatever context fits from `$ARGUMENTS`, and any field that
cannot be filled retains the template's default `value` placeholder text as a
scaffold for a later `refine-issue` pass.

## Approach

All changes are confined to `0k/skills/create-issue/SKILL.md`. Two focused
edits:

1. Replace the "ask for missing fields" instruction with a best-effort
   populate-from-`$ARGUMENTS` strategy, with title always sourced from
   `$ARGUMENTS`.
2. Update the template-to-markdown conversion rules and Important Rules so that
   unfilled fields carry over the template `value` (placeholder text) rather
   than being cleared or triggering a question.

## Steps

- [x] [Step 1: Update field-gathering logic to best-effort populate from $ARGUMENTS](#step-1-update-field-gathering-logic-to-best-effort-populate-from-arguments)
- [x] [Step 2: Update conversion rules and Important Rules to allow scaffold placeholder text](#step-2-update-conversion-rules-and-important-rules-to-allow-scaffold-placeholder-text)

---

## Step 1: Update field-gathering logic to best-effort populate from $ARGUMENTS

In `0k/skills/create-issue/SKILL.md`, update step 5 of the Instructions
section:

**Current behaviour (step 5):**

> Gather the required fields for that template. Fill in every field you can
> infer from the user's description. For fields you cannot infer, ask the user
> — do NOT leave template placeholders or italic prompt text in the final
> issue.

**New behaviour:**

- The **title** is always sourced verbatim (or lightly cleaned) from
  `$ARGUMENTS`.
- For all other fields, populate whichever ones best fit the context provided
  in `$ARGUMENTS` — no specific field is required to be filled.
- For fields where `$ARGUMENTS` provides no useful information, **do not ask
  the user**; instead retain the template's default `value` placeholder text so
  it acts as a scaffold for a later `refine-issue` pass.
- Do not invent content that wasn't provided or clearly implied by the user.

Also remove the sentence "Fields with `required: true` must be filled — ask the
user if you cannot infer." from the "Converting Template Fields to Markdown"
section since there are no required fields in these templates and the
ask-the-user behaviour is being replaced.

---

## Step 2: Update conversion rules and Important Rules to allow scaffold placeholder text

In `0k/skills/create-issue/SKILL.md`:

**Converting Template Fields to Markdown** — update the `textarea` bullet to
clarify what happens when no content is available:

- When content is available (inferred from `$ARGUMENTS`): use it.
- When no content is available: use the template `value` verbatim as the field
  content so it remains as a reference scaffold.

**Important Rules** — replace the prohibition on leaving placeholder text with
guidance that aligns with the new behaviour:

- Remove: "Never leave placeholder/prompt text (like `_Why do we need this?_`)
  in the final body — replace with real content or ask the user."
- Add: "Fields not populated from `$ARGUMENTS` retain the template's default
  `value` placeholder text — this is intentional, acting as a scaffold for a
  `refine-issue` pass. Do not clear them and do not ask the user to fill them
  during creation."

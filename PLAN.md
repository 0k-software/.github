# Plan: Replace <angle-bracket> placeholders with {curly-brace} in skill templates

**Issue:** https://github.com/0k-software/.github/issues/28

## Summary

Skill templates use `<placeholder>` style placeholders in shell examples (e.g.
`<repo>`, `<owner>`, `<comment-id>`). These can be confused with XML tags by
the LLM, leading to misinterpretation. Replace all such placeholders with
`{placeholder}` across all affected skill files.

## Approach

Work through each affected skill file one at a time, replacing angle-bracket
placeholders with curly-brace equivalents. Each file is an atomic commit. Only
replace placeholders in shell examples and instructional text — leave actual
HTML/XML tags, YAML front matter, and markdown formatting untouched.

**Rules for replacement:**

- `<placeholder>` → `{placeholder}` (e.g. `<owner>` → `{owner}`)
- Only replace tokens that are clearly placeholders, not real XML/HTML tags
- Preserve surrounding formatting and indentation

## Steps

- [x] [Step 1: Replace placeholders in fix-pr skill](#step-1-replace-placeholders-in-fix-pr-skill)
- [ ] [Step 2: Replace placeholders in refine-issue skill](#step-2-replace-placeholders-in-refine-issue-skill)
- [ ] [Step 3: Replace placeholders in cleanup-branch skill](#step-3-replace-placeholders-in-cleanup-branch-skill)
- [ ] [Step 4: Replace placeholders in split-branch skill](#step-4-replace-placeholders-in-split-branch-skill)
- [ ] [Step 5: Replace placeholders in rebase skill](#step-5-replace-placeholders-in-rebase-skill)
- [ ] [Step 6: Replace placeholders in kitty skill](#step-6-replace-placeholders-in-kitty-skill)
- [ ] [Step 7: Replace placeholders in create-issue skill](#step-7-replace-placeholders-in-create-issue-skill)

---

## Step 1: Replace placeholders in fix-pr skill

**File:** `0k/skills/fix-pr/SKILL.md`

Replace all angle-bracket placeholders with curly-brace equivalents:

- `<owner>` → `{owner}`, `<repo>` → `{repo}`, `<pr-number>` → `{pr-number}`
- `<comment-id>` → `{comment-id}`, `<answer>` → `{answer}`, `<reply>` →
  `{reply}`
- `<branch-name>` → `{branch-name}`, `<sha>` → `{sha}`, `<databaseId>` →
  `{databaseId}`

---

## Step 2: Replace placeholders in refine-issue skill

**File:** `0k/skills/refine-issue/SKILL.md`

Replace all angle-bracket placeholders:

- `<owner>` → `{owner}`, `<repo>` → `{repo}`, `<number>` → `{number}`
- `<comment-id>` → `{comment-id}`, `<new title>` → `{new title}`, `<new body>`
  → `{new body}`
- `<reply>` → `{reply}`

---

## Step 3: Replace placeholders in cleanup-branch skill

**File:** `0k/skills/cleanup-branch/SKILL.md`

Replace all angle-bracket placeholders:

- `<base-ref>` → `{base-ref}`, `<file1>` → `{file1}`, `<file2>` → `{file2}`
- `<message>` → `{message}`, `<original-HEAD-sha>` → `{original-HEAD-sha}`
- `<branch-name>` → `{branch-name}`

---

## Step 4: Replace placeholders in split-branch skill

**File:** `0k/skills/split-branch/SKILL.md`

Replace all angle-bracket placeholders:

- `<commit>` → `{commit}`, `<current-branch>` → `{current-branch}`, `<N>` →
  `{N}`
- `<branch-name>` → `{branch-name}`, `<sha>` → `{sha}`

---

## Step 5: Replace placeholders in rebase skill

**File:** `0k/skills/rebase/SKILL.md`

Replace all angle-bracket placeholders:

- `<target>` → `{target}`

---

## Step 6: Replace placeholders in kitty skill

**File:** `0k/skills/kitty/SKILL.md`

Replace all angle-bracket placeholders:

- `<window-id>` → `{window-id}`, `<session-cwd>` → `{session-cwd}`
- `<basename of cwd>` → `{basename of cwd}`

---

## Step 7: Replace placeholders in create-issue skill

**File:** `0k/skills/create-issue/SKILL.md`

Replace all angle-bracket placeholders:

- `<repo>` → `{repo}`, `<repo_node_id>` → `{repo_node_id}`
- `<title>` → `{title}`, `<body>` → `{body}`, `<issue_type_id>` →
  `{issue_type_id}`

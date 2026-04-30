---
name: commit
description:
  Stage all changes (staged, unstaged, and untracked) and generate a
  Conventional Commit message — use `!` prefix to auto-fix errors instead of
  aborting
---

Stage everything and generate a git commit message, then commit.

## Argument parsing

`$ARGUMENTS` may start with `!` (e.g. `! fixed the bug`). Strip the leading `!`
and whitespace to obtain the **context text**. If `!` is present, the skill
runs in **auto-fix mode** (see Step 6).

If `$ARGUMENTS` does not start with `!`, the entire string is the context text
and the skill runs in **interactive mode**.

If the context text is non-empty, treat it as the reason/motivation behind the
changes and use it to write the commit body.

## Steps

1. Run `git add .` to stage all changes (staged, unstaged, and untracked).
2. Run `git diff --no-ext-diff --staged` to get the diff to be committed.
3. Write a commit message following `Commit message` instructions in
   `AGENTS.md`/`CLAUDE.md`. If none, base yourself from
   `git log -1 --pretty=%B`.
   - **NEVER ADD** `Co-Authored-By` footer note, as you're actually helping me
     generate the commit message, not writing the code yourself.
4. Display the generated commit message with a horizontal rule (`\n\n---\n\n`)
   before and after it so it stands out clearly.
5. Run `git commit -m "..."` using a heredoc to preserve formatting.
6. **On error:**
   - **Interactive mode** (no `!`): display the error and abort. Do **not**
     attempt to fix it yourself.
   - **Auto-fix mode** (`!`): diagnose the failure (e.g. pre-commit hook
     lint/format errors), fix the issue, re-stage with `git add .`, and retry
     the commit. If the fix attempt also fails, report the error, clearly state
     that **no commit was created**, and return control to the caller as a
     handled error. Do **not** fabricate or report a commit SHA, and do **not**
     claim success for commit-dependent workflows.

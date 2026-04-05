---
name: 0k-commit
description: Generate a Conventional Commit message from staged changes
---

Generate a git commit message for the staged changes, then open the editor for
the user to review and confirm.

Here's the context provided by the user: "$ARGUMENTS". If provided, treat it as
the reason/motivation behind the changes and use it to write the commit body.

1. Run `git add .` to stage all changes.
2. Run `git diff --no-ext-diff --staged` to get the diff to be commited.
3. Write a commit message following `Commit message` instructions in
   `AGENTS.md`/`CLAUDE.md`. If none, base yourself from
   `git log -1 --pretty=%B`.
   - **NEVER ADD** `Co-Authored-By` footer note, as you're actually helping me
     generate the commit message, not writing the code yourself.
4. Display the generated commit message with a horizontal rule (`\n\n---\n\n`)
   before and after it so it stands out clearly.
5. Run `git commit -m "..."` using a heredoc to preserve formatting. Do not
   push.
6. If any error occurs during the commit process, display an error message and
   abort, **do not attempt to fix it yourself**.

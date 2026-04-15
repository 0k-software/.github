---
name: create-pr
description:
  Create a GitHub pull request for the current branch, linking the related
  issue and using consistent formatting.
argument-hint: <description or special flags like "draft">
---

# Create Pull Request

You are helping the user create a GitHub pull request from the current branch.

## Instructions

1. **Parse the user request from:** $ARGUMENTS
2. **Determine draft status.** If the user mentions "draft" anywhere in
   `$ARGUMENTS`, create the PR as a draft (`--draft` flag). Otherwise create a
   regular PR.
3. **Identify the related issue.** Try these in order:
   - If `$ARGUMENTS` contains an issue number or URL, use that.
   - If the branch name starts with digits (e.g. `42-some-feature`), use that
     number as the issue.
   - Otherwise, ask the user which issue this PR resolves (or whether it
     resolves one at all).
4. **Fetch issue details.** If an issue was identified, fetch its title and URL
   with `gh issue view`. If the issue doesn't exist or the fetch fails, ask the
   user to confirm.
5. **Ensure the branch is pushed.** Run:
   ```
   git push -u origin HEAD
   ```
   If the push fails due to hook errors or conflicts, report the error and
   stop.
6. **Build the PR title and body.**
   - **Title:** `[#{issue-number}] {issue title}` — if there is a linked issue.
     Otherwise, derive a concise title from the branch name or `$ARGUMENTS`.
   - **Body:** If there is a linked issue, include `Closes {issue-url}` as the
     body. If there is no linked issue, write a brief summary based on the
     branch's commits (`git log main..HEAD --oneline`).
7. **Create the PR** using `gh pr create`. Write the body to a temporary file
   first, then:
   ```
   gh pr create \
     [--draft] \
     --title "{title}" \
     --body-file /tmp/pr-body.md \
     --head "$(git branch --show-current)"
   ```
8. **Show the user the PR URL** returned by `gh pr create`.

## Important Rules

- **Always try to link an issue.** Issue traceability is important — only skip
  the `Closes #N` reference if no issue can be identified and the user confirms
  there isn't one.
- **Keep the title concise** — under 80 characters.
- **Do not force-push** or modify commits. This skill only creates the PR.
- If a PR already exists for the current branch, tell the user and show the
  existing PR URL instead of creating a duplicate.

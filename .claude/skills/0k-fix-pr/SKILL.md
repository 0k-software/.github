---
name: 0k-fix-pr
description:
  Address unresolved PR review comments — answer questions or implement
  requested changes
---

Address all **unresolved** review comments on a pull request.

`$ARGUMENTS` is a PR number or URL. If empty, detect the PR for the current
branch with `gh pr view --json number -q .number`.

---

## Step 1 — Gather comments

1. Derive `<owner>/<repo>` and `<pr-number>` from the argument or current
   branch.
2. Fetch **all** comments:
   ```
   gh api --paginate "repos/<owner>/<repo>/pulls/<pr-number>/reviews"
   ```
   and
   ```
   gh api --paginate "repos/<owner>/<repo>/pulls/<pr-number>/comments"
   ```
3. **Discard** every comment whose review thread is resolved (check the
   `gh api "repos/<owner>/<repo>/pulls/<pr-number>/comments"` field
   `"resolved"` or query the GraphQL API if needed). Keep only unresolved
   threads.
4. For each remaining comment, record: `id`, `path`, `line`/`start_line`,
   `body`, `in_reply_to_id` (to group threads), and `diff_hunk` for context.

## Step 2 — Classify and group

Classify every unresolved thread into one of two categories:

| Category           | Criteria                                                         | Action                                                  |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------- |
| **Question**       | The reviewer is asking something, no code change implied         | Answer on GitHub, then **stop and wait** for user input |
| **Change request** | The reviewer asks for a code change, refactor, rename, fix, etc. | Implement the change                                    |

Group related change requests that touch the same area or are logically
connected — these will share a single commit.

## Step 3 — Handle questions

For every question thread:

1. Read the relevant code to understand the context.
2. Draft a clear, concise answer.
3. Post the reply using:
   ```
   gh api "repos/<owner>/<repo>/pulls/<pr-number>/comments/<comment-id>/replies" \
     -f body="<answer>"
   ```
4. Display each question and the answer you posted so the user can review.

After posting all question replies, if there are no change requests, stop and
tell the user you answered the questions and are waiting for further feedback.

## Step 4 — Implement change requests

For each group of related change requests:

1. Read the files involved to understand the full context.
2. Implement the requested change(s).
3. Run the project checks configured in `CLAUDE.md`/`AGENTS.md` (tests,
   linters, type checks) and fix any failures.
4. Stage only the affected files and commit following the commit conventions in
   `CLAUDE.md`/`AGENTS.md`. If none exist, base yourself on
   `git log -1 --pretty=%B`.
   - **NEVER ADD** `Co-Authored-By` footer note.
   - Keep commits as small as possible: one commit per logically independent
     change. Multiple related comments may share one commit.
5. Push the branch:
   ```
   git push
   ```
6. Get the commit URL from the push output or via:
   ```
   gh api "repos/<owner>/<repo>/commits/<sha>" --jq .html_url
   ```
7. Reply to **each** addressed comment on GitHub with a link to the commit and
   a short explanation of what was done:
   ```
   gh api "repos/<owner>/<repo>/pulls/<pr-number>/comments/<comment-id>/replies" \
     -f body="<reply>"
   ```

## Step 5 — Report

After all comments are handled, display a summary:

- How many questions were answered
- How many change requests were addressed (with commit links)
- Any comments you skipped and why

---

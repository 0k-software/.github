---
name: fix
description:
  Address unresolved feedback — review comments on a PR, or issue comments on a
  GitHub issue — and implement or reply to each item
argument-hint: { PR or issue number or URL }
---

Address all **unresolved** feedback on a pull request or GitHub issue.

`$ARGUMENTS` is a PR number, issue number, PR URL, or issue URL.

- If the argument contains `/pull/` or is a PR number on the current branch →
  treat as a **PR** and address review comments.
- If the argument contains `/issues/` or is explicitly an issue number (and no
  open PR exists for the current branch) → treat as an **issue** and address
  issue comments.
- If empty → find the open PR for the current branch
  (`gh pr view --json number -q .number`) and treat as a PR.

---

## Part A — Fixing a Pull Request

Follow this part when the target is a PR.

### A1 — Gather review comments

1. Derive `{owner}/{repo}` and `{pr-number}` from the argument or current
   branch.
2. Fetch **all** review threads using the `gh` CLI with the GraphQL API to get
   `isResolved`:
   ```
   gh api graphql -f query='
     query($owner:String!, $repo:String!, $pr:Int!) {
       repository(owner:$owner, name:$repo) {
         pullRequest(number:$pr) {
           reviewThreads(first:100) {
             nodes {
               isResolved
               comments(first:100) {
                 nodes { id databaseId path line side body author { login } }
               }
             }
           }
         }
       }
     }' -f owner="{owner}" -f repo="{repo}" -F pr="{pr-number}"
   ```
3. **Discard** every thread where `isResolved` is `true`. Keep only unresolved
   threads.
4. For each remaining thread, check whether its **first comment** (using its
   `databaseId` — not the opaque GraphQL `id`) has a 👀 (`eyes`) reaction from
   the authenticated user:

   ```
   viewer="$(gh api user --jq .login)"
   gh api --paginate "repos/{owner}/{repo}/pulls/comments/{databaseId}/reactions" \
     --jq --arg viewer "$viewer" '[.[] | select(.content == "eyes" and .user.login == $viewer)]'
   ```

   Threads already marked with 👀 have been addressed in a previous run. Keep
   them as **context** (they may inform code changes) but do **not**
   re-classify, re-implement, or reply to them again.

   **Important:** All REST API calls under `pulls/comments/` expect the numeric
   `databaseId` from the GraphQL response, not the opaque `id`.

5. For each remaining thread, record all comments in order. The **last comment
   in the thread** takes precedence — if a later reply changes or overrides the
   original request, follow the latest instruction.

### A2 — Classify and group

Classify every unresolved thread into one of two categories:

| Category           | Criteria                                                         | Action                                                  |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------- |
| **Question**       | The reviewer is asking something, no code change implied         | Answer on GitHub, then **stop and wait** for user input |
| **Change request** | The reviewer asks for a code change, refactor, rename, fix, etc. | Implement the change                                    |

**Default: one commit per thread.** Only merge two threads into the same commit
when their changes are truly inseparable (e.g. renaming a symbol that must be
updated in multiple files atomically). When in doubt, keep them separate. Never
batch unrelated changes just because they are small.

### A3 — Handle questions

For every question thread:

1. Read the relevant code to understand the context.
2. Draft a clear, concise answer.
3. Append the AI attribution footer (see below) to the reply.
4. Post the reply using the `gh` CLI:
   ```
   gh api "repos/{owner}/{repo}/pulls/{pr-number}/comments" \
     -f body="{answer}" -F in_reply_to={comment-id}
   ```
5. Display each question and the answer you posted so the user can review.

After posting all question replies, if there are no change requests, stop and
tell the user you answered the questions and are waiting for further feedback.

### A4 — Implement change requests

Each group of related change requests gets its own commit. Complete **all**
groups (implement + commit) before pushing or replying. Do **not** accumulate
multiple groups into one commit.

**4a — Commit loop (repeat for every group)**

Before starting this loop, use `TodoWrite` to create **one task per group** (in
order), so the full work queue is visible upfront. This queue must be fully
completed before moving on to step 4b.

For each group of related change requests, in order:

1. Read the files involved to understand the full context.
2. Implement the requested change(s) — and **only** those changes.
3. Invoke the `/0k:commit` skill with the `!` flag, passing the change request
   context as the argument.
4. Record the resulting commit SHA alongside the group (you will need it in
   step 4c). Mark the corresponding `TodoWrite` task as completed. Then
   **immediately continue to the next group** — do not push yet.

**4b — Push once**

After **all** groups have been committed, push the branch a single time:

```
git push -u origin {branch-name}
```

**4c — Reply to every thread**

For each group (now that the commit SHA is known), reply to **every** comment
in the thread on GitHub, appending the AI attribution footer (see below):

```
gh api "repos/{owner}/{repo}/pulls/{pr-number}/comments" \
  -f body="{reply}" -F in_reply_to={comment-id}
```

Include a link to the committed change in the reply, anchored at the exact
commented line. Build the link from data already available in the thread (no
extra API calls needed — `path` and `line` come from the GraphQL query in Step
1):

1. **Base URL** — PR-scoped changes view for this specific commit:

   ```
   https://github.com/{owner}/{repo}/pull/{pr-number}/changes/{commit_sha}
   ```

   Use `/changes/` (not `/files/`): `/changes/` shows only that commit's diff,
   while `/files/` shows all changes to each file from BASE up to the commit.

2. **File anchor** — SHA-256 of the comment's `path`:

   ```
   printf '%s' "{path}" | sha256sum | awk '{print $1}'
   ```

   Use the full hex digest as `{hash}` — GitHub's diff fragments use the full
   SHA-256, not a prefix.

3. **Line anchor** — append the line anchor using `line` and `side` from the
   GraphQL response. Use `R{line}` when `side` is `RIGHT` (the new side of the
   diff — additions and unchanged context viewed from HEAD) and `L{line}` when
   `side` is `LEFT` (the previous side — deletions and unchanged context viewed
   from the base). If `line` is `null` (file-level comment), omit the line
   anchor entirely; the `#diff-{hash}` fragment alone still jumps to the right
   file.

4. **Full URL** — pick the form that matches the reply's scope:
   - **Line comment** (`path` and `line` both present) — anchor at the exact
     line:

     ```
     https://github.com/{owner}/{repo}/pull/{pr-number}/changes/{commit_sha}#diff-{hash}{R|L}{line}
     ```

   - **File-level comment** (`path` present, `line` is `null`) — anchor at the
     file only:

     ```
     https://github.com/{owner}/{repo}/pull/{pr-number}/changes/{commit_sha}#diff-{hash}
     ```

   - **File irrelevant to the reply** (the reply doesn't discuss any specific
     file's diff — e.g., a general answer that doesn't need to point the reader
     at a particular file) — drop the `#diff-{hash}` fragment and link to the
     commit's changes view:

     ```
     https://github.com/{owner}/{repo}/pull/{pr-number}/changes/{commit_sha}
     ```

5. **Format the link manually** in the reply body as a markdown link with the
   short SHA as the visible text:

   ```
   [`{short_sha}`]({full_url})
   ```

   where `{short_sha}` is the first 7 characters of `{commit_sha}`. Do **not**
   paste the bare URL — GitHub auto-detects commit URL patterns and replaces
   them with its own rendering, which strips the line anchor.

All comments in the same review thread share the same `path`/`line`, so use the
thread's first comment when constructing the link.

### A5 — Mark threads as addressed

After posting all replies and pushing, react with 👀 (`eyes`) to the **first
comment** of every thread that was addressed in this run (both questions and
change requests). This prevents future runs from re-addressing the same
feedback.

```
gh api "repos/{owner}/{repo}/pulls/comments/{databaseId}/reactions" \
  -X POST -f content="eyes"
```

### A6 — Report

Display a summary:

- How many questions were answered
- How many change requests were addressed (with commit links)
- Any comments you skipped and why

---

## Part B — Fixing an Issue

Follow this part when the target is a GitHub issue.

### B1 — Fetch the issue

1. Derive `{owner}/{repo}` from the current working directory's git remote. If
   `$ARGUMENTS` is a full URL, extract the owner/repo/number from it instead.
2. Fetch the issue details (title, body, labels):
   ```
   gh issue view {number} --repo {owner}/{repo} \
     --json title,body,labels,number,url,state
   ```
3. Fetch **all** comments on the issue:
   ```
   gh api "repos/{owner}/{repo}/issues/{number}/comments" --paginate \
     --jq '.[] | {id, author: .user.login, body}'
   ```
   For each comment, fetch its reactions to check for the 👀 (`eyes`) marker:
   ```
   viewer="$(gh api user --jq .login)"
   gh api "repos/{owner}/{repo}/issues/comments/{comment-id}/reactions" \
     --jq --arg viewer "$viewer" \
     '[.[] | select(.content == "eyes" and .user.login == $viewer)]'
   ```
4. **Skip already-addressed comments.** Any comment that has a 👀 (`eyes`)
   reaction from the authenticated user has already been handled in a previous
   run. Keep these comments as **context** but do **not** re-address them or
   reply to them again.

### B2 — Analyse feedback

Review the issue description and every comment. Identify all actionable
feedback — suggestions, questions, corrections, requests for clarification, or
proposed changes to the issue's scope, description, or title.

Group the feedback into:

| Category               | Criteria                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| **Description change** | Comment suggests edits to the issue body (wording, scope, structure)  |
| **Title change**       | Comment suggests a better or more accurate title                      |
| **Question**           | Comment asks a question that can be answered from context or codebase |
| **Acknowledgement**    | Comment that needs a short acknowledgement reply (e.g. "good point")  |
| **No action needed**   | Resolved discussion, bot comments, or already-addressed feedback      |

Proceed directly — do **not** ask the user for confirmation. Apply your best
judgement to address all feedback.

### B3 — Update the issue

If any description or title changes were identified:

1. Draft the updated title and/or body incorporating all feedback.
2. Write the updated body to a temporary file, then apply the update:
   ```
   gh issue edit {number} --repo {owner}/{repo} --body-file /tmp/issue-body.md
   ```
   Include `--title "{new title}"` only if the title changed.

### B4 — Reply to comments

For each comment that warrants a reply (questions, acknowledgements, or
explanation of changes made), draft a concise reply. Post a **single** comment
that addresses all feedback points, referencing each commenter by `@username`.
Append the AI attribution footer (see below).

```
gh issue comment {number} --repo {owner}/{repo} --body-file /tmp/issue-comment.md
```

### B5 — Mark comments as addressed

After posting the reply, react with 👀 (`eyes`) to every comment that was
addressed in this run:

```
gh api "repos/{owner}/{repo}/issues/comments/{comment-id}/reactions" \
  -f content="eyes"
```

### B6 — Report

Display a summary:

- Whether the title was updated (old → new)
- Whether the description was updated (brief summary of changes)
- How many comments were addressed
- Any comments skipped and why

---

## AI Attribution Footer

Always append the following to every reply posted on GitHub (questions and
change-request replies alike), separated by a blank line:

```
---
*Generated by Claude Code*
```

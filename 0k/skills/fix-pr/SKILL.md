---
name: fix-pr
description:
  Address unresolved PR review comments — answer questions or implement
  requested changes
---

Address all **unresolved** review comments on a pull request.

`$ARGUMENTS` is a PR number or URL. If empty, find the open PR for the current
branch (`gh pr view --json number -q .number`).

---

## Step 1 — Gather comments

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
   `databaseId` — not the opaque GraphQL `id`) has an `eyes` (👀) reaction from
   the authenticated user:

   ```
   viewer="$(gh api user --jq .login)"
   gh api --paginate "repos/{owner}/{repo}/pulls/comments/{databaseId}/reactions" \
     --jq --arg viewer "$viewer" '[.[] | select(.content == "eyes" and .user.login == $viewer)]'
   ```

   Threads already marked with `eyes` have been addressed in a previous run.
   Keep them as **context** (they may inform code changes) but do **not**
   re-classify, re-implement, or reply to them again.

   **Important:** All REST API calls under `pulls/comments/` expect the numeric
   `databaseId` from the GraphQL response, not the opaque `id`.

5. For each remaining thread, record all comments in order. The **last comment
   in the thread** takes precedence — if a later reply changes or overrides the
   original request, follow the latest instruction.

## Step 2 — Classify and group

Classify every unresolved thread into one of two categories:

| Category           | Criteria                                                         | Action                                                  |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------- |
| **Question**       | The reviewer is asking something, no code change implied         | Answer on GitHub, then **stop and wait** for user input |
| **Change request** | The reviewer asks for a code change, refactor, rename, fix, etc. | Implement the change                                    |

**Default: one commit per thread.** Only merge two threads into the same commit
when their changes are truly inseparable (e.g. renaming a symbol that must be
updated in multiple files atomically). When in doubt, keep them separate. Never
batch unrelated changes just because they are small.

## Step 3 — Handle questions

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

## Step 4 — Implement change requests

Each group of related change requests (as classified in Step 2) gets its own
commit. Complete **all** groups (implement + commit) before pushing or
replying. Do **not** accumulate multiple groups into one commit.

### 4a — Commit loop (repeat for every group)

Before starting this loop, use `TodoWrite` to create **one task per group** (in
order), so the full work queue is visible upfront. This queue must be fully
completed before moving on to Step 4b.

For each group of related change requests, in order:

1. Read the files involved to understand the full context.
2. Implement the requested change(s) — and **only** those changes.
3. Invoke the `/0k:commit` skill with the `!` flag, passing the change request
   context as the argument.
4. Record the resulting commit SHA alongside the group (you will need it in
   Step 4c). Mark the corresponding `TodoWrite` task as completed. Then
   **immediately continue to the next group** — do not push yet.

### 4b — Push once

After **all** groups have been committed, push the branch a single time:

```
git push -u origin {branch-name}
```

### 4c — Reply to every thread

For each group (now that the commit SHA is known), reply to **every** comment
in the thread on GitHub using the `gh` CLI, appending the AI attribution footer
(see below):

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

## Step 5 — Mark threads as addressed

After posting all replies and pushing, react with `eyes` (👀) to the **first
comment** of every thread that was addressed in this run (both questions and
change requests). This prevents future runs from re-addressing the same
feedback.

```
gh api "repos/{owner}/{repo}/pulls/comments/{databaseId}/reactions" \
  -X POST -f content="eyes"
```

## Step 6 — Report

After all comments are handled, display a summary:

- How many questions were answered
- How many change requests were addressed (with commit links)
- Any comments you skipped and why

---

## AI Attribution Footer

Always append the following to every reply posted on GitHub (questions and
change-request replies alike), separated by a blank line:

```
---
*Generated by Claude Code*
```

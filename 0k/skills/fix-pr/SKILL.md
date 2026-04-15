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
                 nodes { id databaseId path line body author { login } }
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

For each group of related change requests, in order:

1. Read the files involved to understand the full context.
2. Implement the requested change(s) — and **only** those changes.
3. Invoke the `/0k:commit` skill with the `!` flag, passing the change request
   context as the argument.
4. Record the resulting commit SHA alongside the group (you will need it in
   Step 4c). Then **immediately continue to the next group** — do not push yet.

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

Include the commit URL in the reply. Derive it from the SHA:

```
gh api "repos/{owner}/{repo}/commits/{sha}" --jq .html_url
```

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

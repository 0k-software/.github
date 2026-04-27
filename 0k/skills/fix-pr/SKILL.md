---
name: fix-pr
description:
  Address unresolved review comments on a pull request — verify before
  implementing, push back when technically wrong, route commits through
  /0k:commit
argument-hint: "{ PR number or URL }"
---

# Code Review Reception

## Overview

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical
correctness over social comfort.

## The Response Pattern

```
WHEN receiving code review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

## Forbidden Responses

**NEVER:**

- "You're absolutely right!" (overly affirming; verify first)
- "Great point!" / "Excellent feedback!" (performative)
- "Let me implement that now" (before verification)

**INSTEAD:**

- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working (actions > words)

## Handling Unclear Feedback

```
IF any item is unclear:
  POST a question in that item's review thread (see A3) — do not ask
  in the local Claude Code session
  STOP — do not implement anything until all items are understood
```

**Example:**

```
Reviewer: "Fix 1-6"
You understand 1,2,3,6. Unclear on 4,5.

❌ WRONG: Ask locally in the Claude Code session
✅ RIGHT: Post questions about items 4 and 5 in their review threads, then wait
```

## Reviewing All Feedback

Apply these checks before implementing **any** suggestion — from human partners
or external reviewers alike:

```
BEFORE implementing:
  1. Check: Technically correct for THIS codebase?
  2. Check: Breaks existing functionality?
  3. Check: Reason for current implementation?
  4. Check: Works on all platforms/versions?
  5. Check: Does reviewer understand full context?

IF suggestion seems wrong:
  Push back with technical reasoning

IF can't easily verify:
  Post a question in the review thread (see A3)

IF conflicts with prior architectural decisions:
  Post a question in the review thread before implementing
```

**No performative agreement.** Skip to action or technical acknowledgment.

**Rule:** Be skeptical of all suggestions — verify, check carefully, then
implement.

## YAGNI Check for "Professional" Features

```
IF reviewer suggests "implementing properly":
  grep codebase for actual usage

  IF unused: "This endpoint isn't called. Remove it (YAGNI)?"
  IF used: Then implement properly
```

**Rule:** If a feature isn't being used, don't implement it — regardless of who
suggests it.

## Implementation Order

```
FOR multi-item feedback:
  1. Clarify anything unclear FIRST
  2. Then implement in this order:
     - Blocking issues (breaks, security)
     - Simple fixes (typos, imports)
     - Complex fixes (refactoring, logic)
  3. Test each fix individually
  4. Verify no regressions
```

## When To Push Back

Push back when:

- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist
- Conflicts with prior architectural decisions

**How to push back:**

- Use technical reasoning, not defensiveness
- Ask specific questions
- Reference working tests/code
- Escalate to the PR author if architectural

**Signal if uncomfortable pushing back out loud:** "Strange things are afoot at
the Circle K"

## Acknowledging Correct Feedback

When feedback IS correct:

```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch - [specific issue]. Fixed in [location]."
✅ [Just fix it and show in the code]

❌ "You're absolutely right!"
❌ "Great point!"
❌ "Thanks for catching that!"
❌ "Thanks for [anything]"
❌ ANY gratitude expression
```

**Why no thanks:** Actions speak. Just fix it. The code itself shows you heard
the feedback.

**If you catch yourself about to write "Thanks":** DELETE IT. State the fix
instead.

## Gracefully Correcting Your Pushback

If you pushed back and were wrong:

```
✅ "You were right - I checked [X] and it does [Y]. Implementing now."
✅ "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."

❌ Long apology
❌ Defending why you pushed back
❌ Over-explaining
```

State the correction factually and move on.

## Common Mistakes

| Mistake                      | Fix                                 |
| ---------------------------- | ----------------------------------- |
| Performative agreement       | State requirement or just act       |
| Blind implementation         | Verify against codebase first       |
| Batch without testing        | One at a time, test each            |
| Assuming reviewer is right   | Check if breaks things              |
| Avoiding pushback            | Technical correctness > comfort     |
| Partial implementation       | Clarify all items first             |
| Can't verify, proceed anyway | State limitation, ask for direction |

## Real Examples

**Performative Agreement (Bad):**

```
Reviewer: "Remove legacy code"
❌ "You're absolutely right! Let me remove that..."
```

**Technical Verification (Good):**

```
Reviewer: "Remove legacy code"
✅ "Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat. Current impl has wrong bundle ID - fix it or drop pre-13 support?"
```

**YAGNI (Good):**

```
Reviewer: "Implement proper metrics tracking with database, date filters, CSV export"
✅ "Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)? Or is there usage I'm missing?"
```

**Unclear Item (Good):**

```
Reviewer: "Fix items 1-6"
You understand 1,2,3,6. Unclear on 4,5.
✅ Post questions about 4 and 5 in their review threads, then address 1,2,3,6.
```

## GitHub Thread Replies

`/fix-pr` is **non-stop and async**: every question, clarification request, and
answer is posted as a reply in the relevant review thread — never as a local
stop awaiting input. This keeps all context in the PR where it belongs and
allows the reviewer to respond asynchronously.

When replying to inline review comments on GitHub, reply in the comment thread,
not as a top-level PR comment. The detailed mechanics for fetching threads and
posting replies are in A1–A4 below.

## The Bottom Line

**External feedback = suggestions to evaluate, not orders to follow.**

Verify. Question. Then implement.

No performative agreement. Technical rigor always.

---

## Workflow

The sections above govern **how to think** about each piece of feedback. The
sections below govern **how to execute** — fetching threads, classifying,
committing, replying, and marking done. The mindset applies throughout,
especially at A2 (classification), A3 (question replies), and A4 (evaluating
what to implement).

### A1 — Gather review comments

1. Derive `{owner}/{repo}` and `{pr-number}` from `$ARGUMENTS` or the current
   branch.
2. Fetch **all** review threads using the GitHub GraphQL API to get
   `isResolved`:

   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   cat > /tmp/gh-query.json <<'EOF'
   {
     "query": "query($owner:String!, $repo:String!, $pr:Int!) { repository(owner:$owner, name:$repo) { pullRequest(number:$pr) { reviewThreads(first:100) { nodes { isResolved comments(first:100) { nodes { id databaseId path line side body author { login } } } } } } } }",
     "variables": {"owner": "{owner}", "repo": "{repo}", "pr": {pr-number}}
   }
   EOF
   curl -s -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     https://api.github.com/graphql \
     -d @/tmp/gh-query.json | jq '.data.repository.pullRequest.reviewThreads.nodes'
   ```

3. **Discard** every thread where `isResolved` is `true`. Keep only unresolved
   threads.
4. For each remaining thread, iterate over **every** comment `databaseId` in
   that thread and check whether any of them has a 👀 (`eyes`) reaction from
   the authenticated user. Check all comments — not just the first — because
   any comment in the thread may have been marked in a previous run:

   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   viewer="$(curl -s -H "Authorization: Bearer $TOKEN" \
     https://api.github.com/user | jq -r '.login')"
   already_marked=false
   for databaseId in {all databaseIds from this thread's comments}; do
     has_eyes="$(curl -s \
       -H "Authorization: Bearer $TOKEN" \
       "https://api.github.com/repos/{owner}/{repo}/pulls/comments/${databaseId}/reactions?per_page=100" \
       | jq --arg viewer "$viewer" 'any(.[]; .content == "eyes" and .user.login == $viewer)')"
     if [ "$has_eyes" = "true" ]; then
       already_marked=true
       break
     fi
   done
   ```

   If `already_marked=true`, the thread has been addressed in a previous run.
   Keep it as **context** (it may inform code changes) but do **not**
   re-classify, re-implement, or reply to it again.

   **Important:** All REST API calls under `pulls/comments/` expect the numeric
   `databaseId` from the GraphQL response, not the opaque `id`.

5. For each remaining thread, record all comments in order. The **last comment
   in the thread** takes precedence — if a later reply changes or overrides the
   original request, follow the latest instruction.

Apply `in progress` to the PR:

```bash
remote_url=$(git remote get-url origin)
remote_url=${remote_url%.git}
owner_repo=$(echo "$remote_url" | sed 's|\.git$||; s|.*[:/]\([^/]*/[^/]*\)$|\1|')
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{pr-number}/labels" \
  -d '{"labels":["in progress"]}' | jq .
```

If the label call fails, warn the user and continue — label management is
non-blocking.

### A2 — Classify and group

Apply the source-specific handling and YAGNI check from the mindset sections
above before classifying. Then classify every unresolved thread into one of two
categories:

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
2. Draft a clear, concise answer — no performative openers, no gratitude.
   Append the AI attribution footer (see below).
3. Post the reply in the thread:

   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   curl -s -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     https://api.github.com/repos/{owner}/{repo}/pulls/{pr-number}/comments \
     -d "$(jq -n --arg body '{answer}' --argjson in_reply_to {comment-id} \
       '{body: $body, in_reply_to: $in_reply_to}')" \
     | jq '.id'
   ```

4. Display each question and the answer you posted so the user can review.

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
2. Verify the suggestion is technically correct for this codebase (see mindset
   sections above). Push back if warranted — do not blindly implement.
3. Implement the requested change(s) — and **only** those changes.
4. Invoke the `/0k:commit` skill with the `!` flag, passing the change request
   context as the argument.
5. Record the resulting commit SHA alongside the group (you will need it in
   step 4c). Mark the corresponding `TodoWrite` task as completed. Then
   **immediately continue to the next group** — do not push yet.

**4b — Push once**

After **all** groups have been committed, push the branch a single time:

```
git push -u origin {branch-name}
```

**4c — Reply to every thread**

For each group (now that the commit SHA is known), reply to **every** comment
in the thread on GitHub:

```bash
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/{owner}/{repo}/pulls/{pr-number}/comments \
  -d "$(jq -n --arg body '{reply}' --argjson in_reply_to {comment-id} \
    '{body: $body, in_reply_to: $in_reply_to}')" \
  | jq '.id'
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
     file's diff) — drop the `#diff-{hash}` fragment and link to the commit's
     changes view:

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

Append the AI attribution footer (see below).

### A5 — Mark threads as addressed

After posting all replies and pushing, react with 👀 (`eyes`) to **every
comment** in every thread that was addressed in this run (both questions and
change requests). This prevents future runs from re-addressing the same
feedback.

For each addressed thread, iterate over every comment `databaseId` and mark
each one individually — do not skip any:

```bash
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
for databaseId in {all databaseIds from this thread's comments}; do
  curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.github.com/repos/{owner}/{repo}/pulls/comments/${databaseId}/reactions" \
    -d '{"content": "eyes"}' | jq '.id'
done
```

Repeat this loop for every addressed thread.

Remove `in progress` and apply `to review`:

```bash
remote_url=$(git remote get-url origin)
remote_url=${remote_url%.git}
owner_repo=$(echo "$remote_url" | sed 's|\.git$||; s|.*[:/]\([^/]*/[^/]*\)$|\1|')
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{pr-number}/labels/in%20progress" | jq .
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{pr-number}/labels" \
  -d '{"labels":["to review"]}' | jq .
```

If either label call fails, warn the user and continue — label management is
non-blocking.

### A6 — Report

Display a summary:

- How many questions were answered
- How many change requests were addressed (with commit links)
- Any comments you skipped and why

---

## AI Attribution Footer

Always append the following to every reply posted on GitHub, separated by a
blank line:

```
---
*Generated by Claude Code*
```

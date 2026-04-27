---
name: fix-issue
description:
  Address unresolved comments on a GitHub issue — update description, reply to
  feedback, mark addressed with 👀
argument-hint: "{ issue number or URL }"
---

Address all **unresolved** feedback on a GitHub issue.

`$ARGUMENTS` is an issue number or issue URL. If `$ARGUMENTS` is a full URL,
extract `owner`, `repo`, and number from it directly. Otherwise, derive
`{owner}/{repo}` from the git remote:

```bash
remote_url=$(git remote get-url origin | sed 's|\.git$||')
owner_repo=$(echo "$remote_url" | sed 's|.*[:/]\([^/]*/[^/]*\)$|\1|')
```

## B1 — Fetch the issue

1. Fetch the issue details (title, body, labels):

   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   curl -s \
     -H "Authorization: Bearer $TOKEN" \
     https://api.github.com/repos/{owner}/{repo}/issues/{number} \
     | jq '{title: .title, body: .body, labels: [.labels[].name], number: .number, url: .html_url, state: .state}'
   ```

2. Fetch **all** comments on the issue:

   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   curl -s \
     -H "Authorization: Bearer $TOKEN" \
     "https://api.github.com/repos/{owner}/{repo}/issues/{number}/comments?per_page=100" \
     | jq '[.[] | {id: .id, author: .user.login, body: .body}]'
   ```

   For each comment, fetch its reactions to check for the 👀 (`eyes`) marker:

   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   viewer="$(curl -s -H "Authorization: Bearer $TOKEN" \
     https://api.github.com/user | jq -r '.login')"
   curl -s \
     -H "Authorization: Bearer $TOKEN" \
     "https://api.github.com/repos/{owner}/{repo}/issues/comments/{comment-id}/reactions?per_page=100" \
     | jq --arg viewer "$viewer" \
     '[.[] | select(.content == "eyes" and .user.login == $viewer)]'
   ```

3. **Skip already-addressed comments.** Any comment that has a 👀 (`eyes`)
   reaction from the authenticated user has already been handled in a previous
   run. Keep these comments as **context** but do **not** re-address them or
   reply to them again.

Apply `in progress` to the issue:

```bash
remote_url=$(git remote get-url origin)
remote_url=${remote_url%.git}
owner_repo=$(echo "$remote_url" | sed 's|\.git$||; s|.*[:/]\([^/]*/[^/]*\)$|\1|')
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{issue-number}/labels" \
  -d '{"labels":["in progress"]}' | jq .
```

If the label call fails, warn the user and continue — label management is
non-blocking.

## B2 — Analyse feedback

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

## B3 — Update the issue

If any description or title changes were identified:

1. Draft the updated title and/or body incorporating all feedback.
2. Write the updated body to `/tmp/issue-body.md`, then apply the update via
   the GitHub REST API:

   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   jq -n \
     --arg title "{new title}" \
     --rawfile body /tmp/issue-body.md \
     '{title: $title, body: $body}' \
     > /tmp/issue-patch.json
   curl -s -X PATCH \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     https://api.github.com/repos/{owner}/{repo}/issues/{number} \
     -d @/tmp/issue-patch.json | jq '{number: .number, title: .title}'
   ```

   Omit `--arg title` and the `title` key from the payload if only the body
   changed.

## B4 — Reply to comments

For each comment that warrants a reply (questions, acknowledgements, or
explanation of changes made), draft a concise reply. Post a **single** comment
that addresses all feedback points, referencing each commenter by `@username`.
Append the AI attribution footer (see below).

```bash
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/{owner}/{repo}/issues/{number}/comments \
  -d "$(jq -n --rawfile body /tmp/issue-comment.md '{body: $body}')" | jq '.id'
```

## B5 — Mark comments as addressed

After posting the reply, react with 👀 (`eyes`) to every comment that was
addressed in this run:

```bash
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/{owner}/{repo}/issues/comments/{comment-id}/reactions \
  -d '{"content": "eyes"}' | jq '.id'
```

Remove `in progress` and apply `to review`:

```bash
remote_url=$(git remote get-url origin)
remote_url=${remote_url%.git}
owner_repo=$(echo "$remote_url" | sed 's|\.git$||; s|.*[:/]\([^/]*/[^/]*\)$|\1|')
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{issue-number}/labels/in%20progress" | jq .
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{issue-number}/labels" \
  -d '{"labels":["to review"]}' | jq .
```

If either label call fails, warn the user and continue — label management is
non-blocking.

## B6 — Report

Display a summary:

- Whether the title was updated (old → new)
- Whether the description was updated (brief summary of changes)
- How many comments were addressed
- Any comments skipped and why

---

## AI Attribution Footer

Always append the following to every reply posted on GitHub, separated by a
blank line:

```
---
*Generated by Claude Code*
```

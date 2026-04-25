---
name: fix-issue
description:
  Address unresolved comments on a GitHub issue — update description, reply to
  feedback, mark addressed with 👀
argument-hint: "{ issue number or URL }"
---

Address all **unresolved** feedback on a GitHub issue.

`$ARGUMENTS` is an issue number or issue URL. Derive `{owner}/{repo}` from the
current working directory's git remote. If `$ARGUMENTS` is a full URL, extract
the owner/repo/number from it instead.

## B1 — Fetch the issue

1. Fetch the issue details (title, body, labels):
   ```
   gh issue view {number} --repo {owner}/{repo} \
     --json title,body,labels,number,url,state
   ```
2. Fetch **all** comments on the issue:
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
3. **Skip already-addressed comments.** Any comment that has a 👀 (`eyes`)
   reaction from the authenticated user has already been handled in a previous
   run. Keep these comments as **context** but do **not** re-address them or
   reply to them again.

Apply `in progress` to the issue:

```bash
remote_url=$(git remote get-url origin)
remote_url=${remote_url%.git}
owner_repo=$(echo "$remote_url" | sed 's|.*github\.com[/:]||')
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{issue-number}/labels" \
  -d '{"labels":["in progress"]}' > /dev/null 2>&1 || true
```

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
2. Write the updated body to a temporary file, then apply the update:
   ```
   gh issue edit {number} --repo {owner}/{repo} --body-file /tmp/issue-body.md
   ```
   Include `--title "{new title}"` only if the title changed.

## B4 — Reply to comments

For each comment that warrants a reply (questions, acknowledgements, or
explanation of changes made), draft a concise reply. Post a **single** comment
that addresses all feedback points, referencing each commenter by `@username`.
Append the AI attribution footer (see below).

```
gh issue comment {number} --repo {owner}/{repo} --body-file /tmp/issue-comment.md
```

## B5 — Mark comments as addressed

After posting the reply, react with 👀 (`eyes`) to every comment that was
addressed in this run:

```
gh api "repos/{owner}/{repo}/issues/comments/{comment-id}/reactions" \
  -f content="eyes"
```

Remove `in progress` and apply `to review`:

```bash
remote_url=$(git remote get-url origin)
remote_url=${remote_url%.git}
owner_repo=$(echo "$remote_url" | sed 's|.*github\.com[/:]||')
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -s -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{issue-number}/labels/in%20progress" \
  > /dev/null 2>&1 || true
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{issue-number}/labels" \
  -d '{"labels":["to review"]}' > /dev/null 2>&1 || true
```

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

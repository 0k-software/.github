# Plan: Replace gh CLI calls in skills with direct GitHub API curl

**Issue:** https://github.com/0k-software/.github/issues/78

## Summary

Five skill files (`create-issue`, `create-pr`, `plan-init`, `fix-pr`,
`fix-issue`) currently use the `gh` CLI for all GitHub interactions. `gh` is
unavailable in remote/web Claude Code sessions. This plan replaces every `gh`
call with a direct `curl` call to the GitHub REST or GraphQL API, making skills
work in any environment.

## Approach

Each skill is updated in its own commit. Within each skill:

1. Add the token resolver at the top of every GitHub operation block:
   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   ```
2. Replace `gh api graphql -f query='...' -f owner=... -F pr=...` with a
   GraphQL curl call. Complex queries are written to `/tmp/gh-query.json` first
   to avoid shell-quoting issues.
3. Replace `gh api <rest-path>`, `gh issue view/edit/comment`, and
   `gh pr create/view` with REST curl calls.
4. Replace `--jq` response filtering with `| jq '...'`.
5. Replace `gh api --paginate` with `?per_page=100`.

No new files are created. No shared helpers. Each skill is self-contained.

## Steps

- [x] [Step 1: Update create-issue](#step-1-update-create-issue)
- [ ] [Step 2: Update create-pr](#step-2-update-create-pr)
- [ ] [Step 3: Update plan-init](#step-3-update-plan-init)
- [ ] [Step 4: Update fix-pr](#step-4-update-fix-pr)
- [ ] [Step 5: Update fix-issue](#step-5-update-fix-issue)

---

## Step 1: Update create-issue

**File:** `0k/skills/create-issue/SKILL.md`

Two `gh api graphql` calls need replacing:

**Step 1a — Query repo ID and issue type IDs** (currently Step 1 in "Creating
the Issue"):

```bash
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
cat > /tmp/gh-query.json <<'EOF'
{
  "query": "query($owner:String!, $repo:String!) { repository(owner:$owner, name:$repo) { id issueTypes(first:10) { nodes { id name } } } }",
  "variables": {"owner": "0k-software", "repo": "{repo}"}
}
EOF
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/graphql \
  -d @/tmp/gh-query.json | jq '.'
```

**Step 1b — Create the issue** (currently Step 2):

```bash
cat > /tmp/gh-query.json <<'EOF'
{
  "query": "mutation($repoId:ID!, $title:String!, $body:String!, $typeId:ID!) { createIssue(input: {repositoryId:$repoId, title:$title, body:$body, issueTypeId:$typeId}) { issue { number url } } }",
  "variables": {
    "repoId": "{repo_node_id}",
    "title": "{title}",
    "body": "{body}",
    "typeId": "{issue_type_id}"
  }
}
EOF
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/graphql \
  -d @/tmp/gh-query.json | jq '.data.createIssue.issue'
```

Remove the old `gh api graphql` examples from the "Step 1" and "Step 2"
subsections and replace them with the curl equivalents above. Update the
introductory prose in "Creating the Issue" to drop any mention of `gh`.

---

## Step 2: Update create-pr

**File:** `0k/skills/create-pr/SKILL.md`

Three `gh` calls to replace:

**Fetch issue details** (step 4 in the skill — `gh issue view`):

```bash
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://api.github.com/repos/{owner}/{repo}/issues/{number} | jq '{title: .title, url: .html_url}'
```

**Check for existing PR** (step implicit in "if a PR already exists" rule —
`gh pr view`):

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/{owner}/{repo}/pulls?head={owner}:{branch}&state=open" \
  | jq '.[0] | {number: .number, url: .html_url}'
```

**Create the PR** (step 7 — `gh pr create`):

```bash
jq -n \
  --arg title "{title}" \
  --arg head "{branch}" \
  --arg base "main" \
  --argjson draft {true|false} \
  --rawfile body /tmp/pr-body.md \
  '{title: $title, body: $body, head: $head, base: $base, draft: $draft}' \
  > /tmp/pr-body.json
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/{owner}/{repo}/pulls \
  -d @/tmp/pr-body.json | jq '{number: .number, url: .html_url}'
```

Note: the body file (`/tmp/pr-body.md`) is already written by the skill before
the create step; use `jq -n --rawfile` to build the full JSON payload so the
body is properly escaped regardless of content.

Update the skill's instructions to use these curl calls in place of the `gh`
equivalents. Remove the `--body-file` reference since the body is now embedded
in the JSON payload.

---

## Step 3: Update plan-init

**File:** `0k/skills/plan-init/SKILL.md`

Two `gh` calls to replace:

**`gh issue develop` (Step 2 — on `main`/`master` case):**

Replace the entire `gh issue develop` + `git fetch` + `git checkout` sequence
with plain git:

```bash
git checkout -b {branch-name}
git push -u origin {branch-name}
```

The GitHub "Development" panel link that `gh issue develop` created is dropped.
The PR's `Closes #N` body reference provides equivalent traceability. Update
the prose in Step 2 to explain this change.

**`gh pr edit --add-reviewer "@copilot"` (Step 5, item 3):**

```bash
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
PR_NUMBER=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/{owner}/{repo}/pulls?head={owner}:{branch}&state=open" \
  | jq -r '.[0].number')
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/{owner}/{repo}/pulls/$PR_NUMBER/requested_reviewers \
  -d '{"reviewers": ["copilot"]}' | jq '.requested_reviewers[].login'
```

Note: the `{owner}/{repo}` values are derived from the git remote, same as
other skills.

---

## Step 4: Update fix-pr

**File:** `0k/skills/fix-pr/SKILL.md`

Replace each `gh` call in order:

**A1 — Fetch review threads (GraphQL):**

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

**A1 — Get authenticated user login:**

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.github.com/user | jq -r '.login'
```

**A1 — Fetch reactions on every comment in a thread (replaces `--paginate`
loop):**

The skill checks ALL comment `databaseId`s in each thread. Replace the
per-comment reaction fetch (used to detect if a thread was already addressed
with 👀):

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/{owner}/{repo}/pulls/comments/{databaseId}/reactions?per_page=100" \
  | jq --arg viewer "$viewer" 'any(.[]; .content == "eyes" and .user.login == $viewer)'
```

Run this for each `databaseId` in the thread; stop as soon as any returns
`true`.

**A3 — Post reply to PR review comment:**

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/{owner}/{repo}/pulls/{pr-number}/comments \
  -d "$(jq -n --arg body '{answer}' --argjson in_reply_to {comment-id} '{body: $body, in_reply_to: $in_reply_to}')" \
  | jq '.id'
```

**A5 — Mark every comment in a thread with 👀 (replaces `gh api` loop):**

The skill iterates over all `databaseId`s in the thread. Replace the
per-comment reaction post:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/{owner}/{repo}/pulls/comments/{databaseId}/reactions \
  -d '{"content": "eyes"}' | jq '.id'
```

Run this for each `databaseId` in the addressed thread.

Update the surrounding prose to remove `gh`-specific language (references to
`--jq`, `-f`, `-F`, `--paginate`).

---

## Step 5: Update fix-issue

**File:** `0k/skills/fix-issue/SKILL.md`

Replace each `gh` call in order:

**B1 — Fetch issue details:**

```bash
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://api.github.com/repos/{owner}/{repo}/issues/{number} \
  | jq '{title: .title, body: .body, labels: [.labels[].name], number: .number, url: .html_url, state: .state}'
```

**B1 — Fetch issue comments (replaces `--paginate`):**

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/{owner}/{repo}/issues/{number}/comments?per_page=100" \
  | jq '[.[] | {id: .id, author: .user.login, body: .body}]'
```

**B1 — Fetch reactions on an issue comment (replaces `--paginate`):**

```bash
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/{owner}/{repo}/issues/comments/{comment-id}/reactions?per_page=100" \
  | jq --arg viewer "$viewer" '[.[] | select(.content == "eyes" and .user.login == $viewer)]'
```

**B3 — Update issue body and/or title:**

```bash
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

**B4 — Post issue comment:**

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/{owner}/{repo}/issues/{number}/comments \
  -d "$(jq -n --rawfile body /tmp/issue-comment.md '{body: $body}')" | jq '.id'
```

**B5 — Mark addressed comments with 👀:**

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/{owner}/{repo}/issues/comments/{comment-id}/reactions \
  -d '{"content": "eyes"}' | jq '.id'
```

Update the surrounding prose to remove `gh`-specific language (references to
`--jq`, `-f`, `-F`, `--paginate`). The body and comment files
(`/tmp/issue-body.md`, `/tmp/issue-comment.md`) are still written as temp files
before posting — use `jq -n --rawfile` to build JSON payloads so all content is
safely escaped regardless of quotes or newlines.

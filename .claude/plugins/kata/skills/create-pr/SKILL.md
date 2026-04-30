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
   via the GitHub REST API. If the issue doesn't exist or the fetch fails, ask
   the user to confirm.

   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   remote_url=$(git remote get-url origin)
   remote_url=${remote_url%.git}
   owner_repo=$(echo "$remote_url" | sed 's|\.git$||; s|.*[:/]\([^/]*/[^/]*\)$|\1|')
   owner=${owner_repo%/*}
   repo=${owner_repo#*/}
   branch=$(git branch --show-current)
   curl \
     -H "Authorization: Bearer $TOKEN" \
     https://api.github.com/repos/$owner/$repo/issues/{number} \
     | jq 'if .title then {title: .title, url: .html_url} else error("GitHub API error: \(.message // "unknown")") end'
   ```

   If the fetch fails, stop and report — the PR cannot be created without the
   issue title.

5. **Check for an existing PR.** Before creating, verify no open PR exists for
   the current branch:

   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   remote_url=$(git remote get-url origin)
   remote_url=${remote_url%.git}
   owner_repo=$(echo "$remote_url" | sed 's|\.git$||; s|.*[:/]\([^/]*/[^/]*\)$|\1|')
   owner=${owner_repo%/*}
   repo=${owner_repo#*/}
   branch=$(git branch --show-current)
   curl \
     -H "Authorization: Bearer $TOKEN" \
     "https://api.github.com/repos/$owner/$repo/pulls?head=$owner:$branch&state=open" \
     | jq 'if type == "array" then (if length > 0 then .[0] | {number: .number, url: .html_url} else null end) else error("GitHub API error: \(.message // "non-array response")") end'
   ```

   If the curl fails, stop and report.

   If a PR is found, show its URL and stop.

6. **Ensure the branch is pushed.** Run:
   ```
   git push -u origin HEAD
   ```
   If the push fails due to hook errors or conflicts, report the error and
   stop.
7. **Build the PR title and body.**
   - **Title:** `[#{issue-number}] {issue title}` — if there is a linked issue.
     Otherwise, derive a concise title from the branch name or `$ARGUMENTS`.
   - **Body:** If there is a linked issue, include `Closes {issue-url}` as the
     body. Write it to `/tmp/pr-body.md`. If there is no linked issue, write a
     brief summary based on the branch's commits
     (`git log $base..HEAD --oneline`).
8. **Create the PR** via the GitHub REST API:

   ```bash
   TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
   remote_url=$(git remote get-url origin)
   remote_url=${remote_url%.git}
   owner_repo=$(echo "$remote_url" | sed 's|\.git$||; s|.*[:/]\([^/]*/[^/]*\)$|\1|')
   owner=${owner_repo%/*}
   repo=${owner_repo#*/}
   branch=$(git branch --show-current)
   base=$(git rev-parse --abbrev-ref origin/HEAD | sed 's|origin/||')
   jq -n \
     --arg title "{title}" \
     --arg head "$branch" \
     --arg base "$base" \
     --argjson draft {true|false} \
     --rawfile body /tmp/pr-body.md \
     '{title: $title, body: $body, head: $head, base: $base, draft: $draft}' \
     > /tmp/pr-body.json
   curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     https://api.github.com/repos/$owner/$repo/pulls \
     -d @/tmp/pr-body.json \
     | jq -e 'if .number then {number: .number, url: .html_url} else ({number: .number, url: .html_url, message: .message, errors: .errors} | halt_error(1)) end'
   ```

   If the command exits non-zero (`.number` was null), stop and report the
   `message`/`errors` in the output — do not assume the PR was created.

9. **Show the user the PR URL** returned by the API.

## Important Rules

- **Always try to link an issue.** Issue traceability is important — only skip
  the `Closes #N` reference if no issue can be identified and the user confirms
  there isn't one.
- **Keep the title concise** — under 80 characters.
- **Do not force-push** or modify commits. This skill only creates the PR.
- If a PR already exists for the current branch (detected in step 5), tell the
  user and show the existing PR URL instead of creating a duplicate.

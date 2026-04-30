---
name: fix
description:
  Address unresolved feedback on a pull request or GitHub issue — routes to
  /fix-pr or /fix-issue
argument-hint: "{ PR or issue number or URL }"
---

Address all **unresolved** feedback on a pull request or GitHub issue.

`$ARGUMENTS` is a PR number, issue number, PR URL, or issue URL.

- If the argument contains `/pull/` → read `skills/fix-pr/SKILL.md` and follow
  it, using `$ARGUMENTS` as the input.
- If the argument contains `/issues/` → read `skills/fix-issue/SKILL.md` and
  follow it, using `$ARGUMENTS` as the input.
- If the argument is a **bare number** → check whether it identifies a pull
  request:

  ```bash
  TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
  remote_url=$(git remote get-url origin)
  remote_url=${remote_url%.git}
  owner_repo=$(echo "$remote_url" | sed 's|\.git$||; s|.*[:/]\([^/]*/[^/]*\)$|\1|')
  curl -H "Authorization: Bearer $TOKEN" \
    "https://api.github.com/repos/$owner_repo/pulls/$ARGUMENTS" \
    | jq '{number: .number, message: .message}'
  ```

  If `.number` is non-null → read `skills/fix-pr/SKILL.md` and follow it. If
  `.number` is null, report the `message` from the response and ask the user to
  specify whether the argument is a PR or an issue number.

- If the argument is **empty**:
  1. Find the open PR for the current branch:

     ```bash
     TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
     remote_url=$(git remote get-url origin)
     remote_url=${remote_url%.git}
     owner_repo=$(echo "$remote_url" | sed 's|\.git$||; s|.*[:/]\([^/]*/[^/]*\)$|\1|')
     owner=${owner_repo%/*}
     branch=$(git branch --show-current)
     curl -H "Authorization: Bearer $TOKEN" \
       "https://api.github.com/repos/$owner_repo/pulls?head=$owner:$branch&state=open" \
       | jq -r '.[0].number // empty'
     ```

     If the curl fails, fall back to inferring from the current conversation
     context or ask the user.

     If a PR number is returned, read `skills/fix-pr/SKILL.md` and follow it.

  2. Otherwise, try to infer the relevant issue from the current conversation
     context — if an issue was recently refined, discussed, or is the explicit
     subject of this session, use that issue number and read
     `skills/fix-issue/SKILL.md`.
  3. If nothing can be inferred, ask the user to provide an issue number or
     URL.

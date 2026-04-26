# Plan: Skill curl commands fail silently with proxied git remote

**Issue:** https://github.com/0k-software/.github/issues/121

## Summary

Skills use inline bash blocks that construct GitHub API URLs from the git
remote via `sed 's|.*github\.com[/:]||'`. When the remote is a local proxy (no
`github.com` in the URL), the `sed` produces a wrong path and every curl call
fails silently behind a stack of `-s`, `> /dev/null 2>&1`, and `|| true`
suppressors. Three changes are needed across seven skill files: fix the `sed`
pattern, strip all error suppression, and add explicit failure-handling
guidance in the surrounding prose.

## Approach

File by file: in each affected SKILL.md, replace the broken `sed` with a
last-two-segments extractor, drop all error-silencing flags, and add prose
directing Claude to warn-and-continue on label failures and stop-and-report on
critical failures. Plan and execute skills are grouped together since their
changes are nearly identical.

## Steps

- [x] [Step 1: Fix refine/SKILL.md](#step-1-fix-refineskillmd)
- [x] [Step 2: Fix plan-init/SKILL.md and plan-execute/SKILL.md](#step-2-fix-plan-initskillmd-and-plan-executeskillmd)
- [ ] [Step 3: Fix fix-issue/SKILL.md](#step-3-fix-fix-issueskillmd)
- [ ] [Step 4: Fix fix-pr/SKILL.md](#step-4-fix-fix-prskillmd)
- [ ] [Step 5: Fix fix/SKILL.md and create-pr/SKILL.md](#step-5-fix-fixskillmd-and-create-prskillmd)

---

## Step 1: Fix refine/SKILL.md

Two label management bash blocks. In both, apply the sed fix and strip all
suppression.

**The sed fix** (same pattern for every block across all files):

```bash
# Before
owner_repo=$(echo "$remote_url" | sed 's|.*github\.com[/:]||')
# After
owner_repo=$(echo "$remote_url" | sed 's|\.git$||; s|.*[:/]\([^/]*/[^/]*\)$|\1|')
```

The first substitution strips any trailing `.git` suffix (defensive — the
surrounding code already does `remote_url=${remote_url%.git}`, but baking it in
makes the sed self-contained). The second extracts the last two `/`-separated
path segments, which is always `owner/repo` regardless of URL format — real
GitHub HTTPS, SSH `git@`, or local proxy.

**`in progress` block**: Remove `-s` from the curl flags; remove
`> /dev/null 2>&1 || true` from the end; pipe to `| jq .` to surface the API
response. Add a sentence directly after the block:

> If the label call fails, warn the user and continue — label management is
> non-blocking.

**`to review` block (DELETE + POST)**: Same treatment on both curl calls.
Remove `-s` and all trailing suppression; pipe each to `| jq .`.

---

## Step 2: Fix plan-init/SKILL.md and plan-execute/SKILL.md

### plan-init/SKILL.md — two blocks

**`in progress` block (Step 1 of the skill)**: sed fix + remove suppression +
`| jq .` + warn-and-continue prose after the block. This block runs at the
start of the skill and cannot share variables with anything in Step 5.

**Merged Step 5 block**: The current skill has two separate bash blocks in Step
5 — one for the label swap and one for the Copilot review — that both define
`remote_url`, `owner_repo`, `TOKEN`, and related variables. Merge them into a
single block that defines each variable once:

```bash
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
remote_url=$(git remote get-url origin | sed 's|\.git$||')
owner_repo=$(echo "$remote_url" | sed 's|.*[:/]\([^/]*/[^/]*\)$|\1|')
owner=${owner_repo%/*}
repo=${owner_repo#*/}
branch=$(git branch --show-current)

# Swap lifecycle labels
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{issue-number}/labels/in%20progress" | jq .
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$owner_repo/issues/{issue-number}/labels" \
  -d '{"labels":["to review"]}' | jq .

# Request Copilot review
PR_NUMBER=$(curl \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$owner/$repo/pulls?head=$owner:$branch&state=open" \
  | jq -r '.[0].number')
if [ -n "$PR_NUMBER" ]; then
  curl -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.github.com/repos/$owner/$repo/pulls/$PR_NUMBER/requested_reviewers" \
    -d '{"reviewers": ["copilot"]}' | jq '.requested_reviewers[].login'
else
  echo "Warning: no open PR found for this branch — skipping Copilot review request"
fi
```

### plan-execute/SKILL.md — two blocks

Same as `refine`: two label blocks, sed fix, remove suppression, `| jq .`,
warn-and-continue prose after each.

---

## Step 3: Fix fix-issue/SKILL.md

Three changes in this file:

**`in progress` block**: sed fix + remove suppression + `| jq .` +
warn-and-continue prose after the block.

**`to review` block**: sed fix; remove suppression from DELETE and POST; pipe
each to `| jq .`.

**Owner/repo derivation prose (introduction)**: The skill currently says:

> Derive `{owner}/{repo}` from the current working directory's git remote.

Update to:

> If `$ARGUMENTS` is a full URL, extract `owner`, `repo`, and number from it
> directly. Otherwise, derive `{owner}/{repo}` from the git remote:
>
> ```bash
> remote_url=$(git remote get-url origin | sed 's|\.git$||')
> owner_repo=$(echo "$remote_url" | sed 's|.*[:/]\([^/]*/[^/]*\)$|\1|')
> ```

---

## Step 4: Fix fix-pr/SKILL.md

Two label blocks:

**`in progress` block (end of A1)**: sed fix + remove suppression + `| jq .`

- warn-and-continue prose after the block.

**`to review` block (end of A5)**: sed fix; remove suppression from DELETE and
POST; pipe each to `| jq .`.

Note: the other curl calls in fix-pr (GraphQL review threads at A1, viewer
login, reaction checks, PR comment replies, eye reactions at A3/A4c/A5) use
`{owner}` and `{repo}` derived from `$ARGUMENTS` or GraphQL responses — they do
not parse the git remote and are out of scope.

---

## Step 5: Fix fix/SKILL.md and create-pr/SKILL.md

### fix/SKILL.md — two PR lookup blocks

The `fix` router curls GitHub to tell PRs and issues apart and to find the PR
for the current branch.

**Bare-number check** (`GET /repos/$owner_repo/pulls/$ARGUMENTS`): sed fix;
remove `-s`; the `| jq '.number'` is already there, keep it. Add prose: "If the
curl fails or returns an error body, report it and ask the user to specify
whether the argument is a PR or an issue number."

**Empty-argument branch lookup** (`GET /repos/$owner_repo/pulls?head=...`): sed
fix; remove `-s`; `| jq -r '.[0].number // empty'` is already there, keep it.
Add prose: "If the curl fails, fall back to inferring from the current
conversation context or ask the user."

### create-pr/SKILL.md — three blocks

All three blocks in `create-pr` parse the git remote. Apply the sed fix to the
shared `owner_repo` derivation at the top of step 4, which flows into all three
curls.

**Issue details fetch** (`GET /issues/{number}`): Remove `-s`;
`| jq '{title: .title, url: .html_url}'` is already there, keep it. Add: "If
the fetch fails, stop and report — the PR cannot be created without the issue
title."

**Existing PR check** (`GET /pulls?head=...&state=open`): Remove `-s`;
`| jq '.[0] | ...'` is already there, keep it. Add: "If the curl fails, stop
and report."

**PR creation** (`POST /pulls`): Remove `-s`;
`| jq '{number: .number, url: .html_url}'` is already there, keep it. Add: "If
the curl returns an error (non-`number` response), stop and report — do not
assume the PR was created."

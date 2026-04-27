---
name: plan-execute
description:
  Run all remaining steps in PLAN.md autonomously — implement, commit, and
  repeat until the plan is complete
---

Before proceeding, read the shared format definition at
`0k/references/PLAN_FORMAT.md` (relative to the plugin root). Use the `Read`
tool on that file to learn the PLAN.md structure.

---

Run every remaining step in PLAN.md, one after another, until none are left.

**Procedure:**

1. Infer the issue number from `$ARGUMENTS` if provided (bare number or URL),
   or from the current branch name if it starts with digits (e.g.
   `42-some-feature`), or ask the user. Then apply `in progress`:

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

   Then read PLAN.md and collect **all** unchecked (`- [ ]`) steps.

2. If no unchecked steps exist → stop and report "Plan complete."
3. Use `TodoWrite` to create **one task per unchecked step** (in order), so the
   full work queue is visible upfront before any execution begins.
4. For each task in the `TodoWrite` list (in order):
   - Implement the step.
   - Mark the step as done (`- [x]`) in the PLAN.md TOC.
   - Invoke the `/0k:commit` skill with the `!` flag, passing the step
     title/description as context.
   - If the implementation required any deviation from the original step
     description (different approach, scope change, discovered constraints),
     update the step's section in PLAN.md to reflect what was actually done.
     Also review the remaining unchecked steps — if the deviation affects them,
     carefully update their descriptions to stay accurate and consistent with
     the current state of the codebase.
   - Mark the corresponding `TodoWrite` task as completed.
   - Continue immediately to the next task.
5. Once every `TodoWrite` task is marked done, report "Plan complete."

**Important:** Do NOT stop after a single step. The `TodoWrite` list is the
complete work queue — keep going until every task is checked off. Only stop on
an unrecoverable error (in which case, explain what blocked you and which steps
remain).

**After all steps are complete:**

1. Run `git rm PLAN.md` to remove the working artifact.
2. Commit the removal using `/0k:commit`.
3. Run `gh pr ready` to mark the current branch's PR as ready for review.
4. Push the final commit.
5. Run `gh pr edit --add-reviewer "@copilot"` to request a fresh Copilot review
   (always request, even if one was previously done on this PR).
6. Remove `in progress` and apply `to review`:

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

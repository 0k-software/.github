# Plan: Replace `wt switch` with `git checkout` in plan-init skill

**Issue:** https://github.com/0k-software/.github/issues/65

## Summary

The `plan-init` skill currently uses `wt switch {branch-name}` to switch to a
newly created branch, which relies on a worktree helper that breaks in remote
(Claude Code web) sessions. The fix introduces two distinct code paths:

- **On `main`/`master`**: after `gh issue develop`, use
  `git fetch origin {branch-name} && git checkout {branch-name}` instead of
  `wt switch`.
- **Not on `main`/`master`** (remote/web session with its own auto-generated
  branch): push the session branch to the standard-named branch with
  `git push -u origin HEAD:{branch-name}`, establishing upstream tracking
  without needing a local switch.

## Approach

Edit `0k/skills/plan-init/SKILL.md` to replace the `wt switch` call and add the
not-on-main/master handling. No other skills are affected (`wt switch` only
appears in plan-init).

## Steps

- [x] [Step 1: Replace `wt switch` with `git checkout` on the main/master path](#step-1-replace-wt-switch-with-git-checkout-on-the-mainmaster-path)
- [x] [Step 2: Add `git push` handling for non-main/master sessions](#step-2-add-git-push-handling-for-non-mainmaster-sessions)
- [x] [Step 3: Update prose to describe both code paths accurately](#step-3-update-prose-to-describe-both-code-paths-accurately)

---

## Step 1: Replace `wt switch` with `git checkout` on the main/master path

In `0k/skills/plan-init/SKILL.md`, replace the command block:

```
gh issue develop {issue-number} --name {branch-name}
wt switch {branch-name}
```

with:

```
gh issue develop {issue-number} --name {branch-name}
git fetch origin {branch-name} && git checkout {branch-name}
```

Also update the line immediately after that block — currently:

> `` `wt switch` switches to it via a worktree. ``

Change it to accurately describe the new sequence:

> `` `gh issue develop` creates the remote branch and links it to the issue on GitHub. `git fetch` + `git checkout` then checks out the branch locally. ``

---

## Step 2: Add `git push` handling for non-main/master sessions

After the if-on-main/master block, add an `else` / "otherwise" section that
describes what to do when the current branch is **not** `main` or `master`
(i.e. a remote Claude Code web session that already has its own auto-generated
branch):

```
Otherwise (not on `main`/`master`), push the current session branch to the
standard-named branch so the GitHub naming convention is followed:

git push -u origin HEAD:{branch-name}
```

This establishes upstream tracking to the properly-named branch without
requiring a local branch switch.

---

## Step 3: Update prose to describe both code paths accurately

Review the surrounding prose in the branch-setup section to ensure the full
flow is clear:

1. The section heading / intro should note that branch handling differs by
   context (local vs. remote session).
2. The on-main/master path should clearly show the two-command sequence:
   `gh issue develop` (remote branch + issue link) then `git fetch` +
   `git checkout` (local checkout).
3. The not-on-main/master path should clearly show
   `git push -u origin HEAD:{branch-name}` and explain that it maps the session
   branch to the standard name on GitHub without switching locally.
4. Remove any remaining references to `wt switch` or worktrees.

---
name: 0k-cleanup-branch
description:
  Clean up a branch's commit history by squashing back-and-forth commits into a
  meaningful, reviewable set — without changing what ends up in the codebase
---

Analyse the current branch's commit history and rewrite it into a clean,
logical sequence — removing WIP commits, fixups, reversals, and other noise
that obscures what the branch actually does. The final diff against `master` is
preserved exactly; only the commit structure changes.

Here's the context provided by the user: "$ARGUMENTS". If provided, treat it as
hints about how to group commits (e.g. "one commit per context" or "keep
migrations separate").

---

## Step 1 — Prepare

1. Verify the working tree is clean (`git status --porcelain`). If dirty, abort
   and tell the user to commit or stash first.
2. The base branch is always `master`. Enforce that the current branch is
   already rebased on top of it — run:
   ```
   git fetch origin master
   git merge-base --is-ancestor origin/master HEAD
   ```
   If the check fails, abort and tell the user:
   > "Your branch is not rebased on top of `master`. Run `/0k-rebase master`
   > first, then try again."
3. Get the current branch name: `git rev-parse --abbrev-ref HEAD`.
4. List all commits:
   ```
   git log --oneline origin/master..HEAD
   ```
   If there are no commits, abort with "Nothing to clean up — branch is up to
   date with `master`."

## Step 2 — Understand what changed

Get the full picture:

```
git log --oneline origin/master..HEAD
git diff --stat origin/master..HEAD
```

Read through every commit subject. Look for signals of noise:

- "fix", "fixup", "oops", "wip", "tmp", "revert", "undo", "typo", "tweak",
  "cleanup" in the subject
- Multiple commits touching the same file back and forth
- Commits that partially revert an earlier commit on the same branch

Display a summary of what you found before proposing anything:

```
Current history (7 commits):
  abc1234  feat: add user auth
  def5678  wip: still broken
  789abcd  fix: actually fix auth
  012ef34  feat: add admin panel
  345gh67  oops revert wrong thing
  678ij90  re-add the right thing
  901kl23  fix typo in admin panel

Net diff: 430 lines across 5 files
```

## Step 3 — Propose a clean commit structure

Based on the net diff and the groupings you identified, propose a clean commit
sequence. Each proposed commit should:

- Represent one coherent logical unit (a feature, a migration, a refactor)
- Have a clear, conventional commit message
- Contain only the files relevant to that unit

Format the proposal clearly:

```
Proposed clean history (3 commits):

  Commit 1: "feat: add user authentication"
    • lib/my_app/accounts/user.ex
    • lib/my_app/accounts/auth.ex
    • test/my_app/accounts/user_test.ex

  Commit 2: "feat: add admin panel"
    • lib/my_app/admin/panel.ex
    • lib/my_app/admin/users.ex
    • test/my_app/admin/panel_test.ex

  Commit 3: "chore: add admin panel migration"
    • priv/repo/migrations/20240101_add_admin.exs

This replaces 7 noisy commits. The final diff is unchanged.
Proceed? [y/N]
```

If the user says no or wants adjustments, help them rework the grouping before
proceeding.

## Step 4 — Rewrite the history

Use a soft reset to collapse all commits back into the working tree, then
recommit in the proposed groups:

1. Record the current HEAD for reference:

   ```
   git rev-parse HEAD
   ```

2. Soft-reset to master (all changes remain staged):

   ```
   git reset --soft origin/master
   ```

3. For each proposed commit (in order): a. Unstage everything first:

   ```
   git restore --staged .
   ```

   b. Stage only the files for this commit:

   ```
   git add <file1> <file2> ...
   ```

   c. Commit with the proposed message:

   ```
   git commit -m "<message>"
   ```

4. After all commits are done, verify the net diff is unchanged:
   ```
   git diff origin/master..HEAD
   ```
   It must be **identical** to what it was before the rewrite. If it differs,
   abort immediately:
   > "Something went wrong — the net diff changed. Restoring original HEAD."
   > Then run: `git reset --hard <original-HEAD-sha>`

## Step 5 — Confirm and suggest next steps

Show the final clean history:

```
git log --oneline origin/master..HEAD
```

Confirm the cleanup is done:

```
Done. Rewrote 7 commits → 3 clean commits.
Net diff is unchanged (430 lines across 5 files).

If this branch is too large for a single PR, run:
  /0k-split-branch
```

If the branch has already been pushed, remind the user that they'll need to
force-push:

```
git push --force-with-lease origin <branch-name>
```

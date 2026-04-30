---
name: cleanup-branch
description:
  Clean up a branch's commit history by squashing back-and-forth commits into a
  meaningful, reviewable set — without changing what ends up in the codebase
---

Analyse the current branch's commit history and rewrite it into a clean,
logical sequence — removing WIP commits, fixups, reversals, and other noise
that obscures what the branch actually does. The final diff against the base
branch is preserved exactly; only the commit structure changes.

Here's the context provided by the user: "$ARGUMENTS". If provided, treat it as
hints about how to group commits (e.g. "one commit per context" or "keep
migrations separate").

---

## Step 1 — Prepare

1. Verify the working tree is clean (`git status --porcelain`). If dirty, abort
   and tell the user to commit or stash first.
2. Get the current branch name: `git rev-parse --abbrev-ref HEAD`.
3. Detect the base branch — the ref this branch diverged from:
   ```
   git rev-parse --abbrev-ref --symbolic-full-name @{upstream} 2>/dev/null
   ```
   If that returns a ref (e.g. `origin/master`, `origin/main`,
   `origin/my-feature`), use it as `{base-ref}`. If it returns nothing (no
   tracking branch), fall back to finding the nearest decorated ancestor:
   ```
   git log --simplify-by-decoration --pretty=%D HEAD \
     | grep -m1 -o 'origin/[^,)]*'
   ```
   If still nothing is found, ask the user: _"Which branch is this based on?"_
4. List all commits since the base:
   ```
   git log --oneline {base-ref}..HEAD
   ```
   If there are no commits, abort with "Nothing to clean up — branch is already
   up to date with `{base-ref}`."

## Step 2 — Understand what changed

Get the full picture of the branch as a whole:

```
git log --oneline {base-ref}..HEAD
git diff --stat {base-ref}..HEAD
```

Then read the **actual diff of every individual commit** (oldest to newest):

```
git log --reverse -p {base-ref}..HEAD
```

Look for noise at two levels:

**Commit subject signals** — titles that hint at intermediate work:

- "fix", "fixup", "oops", "wip", "tmp", "revert", "undo", "typo", "tweak",
  "cleanup" in the subject

**Content signals** — lines or files that cancel out across commits:

- A file introduced in one commit and deleted in a later one (net effect: never
  existed — both commits are pure noise for that file)
- Lines added in one commit and removed in a later one (those lines never need
  to appear in any clean commit)
- A function or block written, then rewritten from scratch (only the final
  version matters)
- Multiple commits touching the same lines of the same file (only the last
  state is meaningful)

The goal is to understand **what the branch actually does in its final state**,
ignoring everything that was tried and thrown away along the way.

Display a summary of what you found before proposing anything:

```
Current history (7 commits):
  abc1234  feat: add user auth
  def5678  wip: still broken        ← content later overwritten in 789abcd
  789abcd  fix: actually fix auth
  012ef34  feat: add admin panel
  345gh67  oops revert wrong thing  ← net-zero: changes cancelled by 678ij90
  678ij90  re-add the right thing
  901kl23  fix typo in admin panel  ← folds into 012ef34

Net diff: 430 lines across 5 files (vs 680 lines across all 7 commits)
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

2. Soft-reset to the base (all changes remain staged):

   ```
   git reset --soft {base-ref}
   ```

3. For each proposed commit (in order): a. Unstage everything first:

   ```
   git restore --staged .
   ```

   b. Stage only the files for this commit:

   ```
   git add {file1} {file2} ...
   ```

   c. Commit with the proposed message:

   ```
   git commit -m "{message}"
   ```

4. After all commits are done, verify the net diff is unchanged:
   ```
   git diff {base-ref}..HEAD
   ```
   It must be **identical** to what it was before the rewrite. If it differs,
   abort immediately:
   > "Something went wrong — the net diff changed. Restoring original HEAD."
   > Then run: `git reset --hard {original-HEAD-sha}`

## Step 5 — Confirm and suggest next steps

Show the final clean history:

```
git log --oneline {base-ref}..HEAD
```

Confirm the cleanup is done:

```
Done. Rewrote 7 commits → 3 clean commits.
Net diff is unchanged (430 lines across 5 files).

If this branch is too large for a single PR, run:
  /kata:split-branch
```

If the branch has already been pushed, remind the user that they'll need to
force-push:

```
git push --force-with-lease origin {branch-name}
```

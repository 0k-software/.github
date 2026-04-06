---
name: 0k-split-branches
description:
  Split a large branch into smaller stacked branches — each under 500 changed
  lines — to make PRs easier to review
---

Split the commits on the current branch into multiple smaller stacked branches,
each staying under 500 changed lines (additions + deletions).

Here's the context provided by the user: "$ARGUMENTS". If provided, treat it as
hints about how to group the commits (e.g. "split by feature area" or "keep
migrations together").

---

## Step 1 — Gather information

1. Verify the working tree is clean (`git status --porcelain`). If dirty, abort
   and tell the user to commit or stash first.
2. Detect the base branch:
   ```
   git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'
   ```
   Fall back to `main` if the command fails.
3. Fetch the base branch: `git fetch origin <base>`.
4. Get the current branch name: `git rev-parse --abbrev-ref HEAD`.
5. List all commits to be split:
   ```
   git log --oneline origin/<base>..HEAD
   ```
   If there are no commits, abort with "Nothing to split — branch is up to date
   with `<base>`."

## Step 2 — Measure each commit

For every commit (oldest to newest), count its changed lines:

```
git diff --shortstat <commit>^ <commit>
```

Record each commit as: `{ sha, subject, additions, deletions, total_lines }`.

Display a table so the user can see the breakdown before proceeding:

```
SHA      Lines  Subject
-------- -----  -------
abc1234    120  feat: add user authentication
def5678    340  feat: add admin panel
...
```

Also show the **total changed lines** across the whole branch.

If the total is under 500, inform the user that the branch is already small
enough and exit unless they explicitly want to split anyway (check `$ARGUMENTS`
for a `--force` flag).

## Step 3 — Plan the splits

Group commits into buckets so that each bucket's total lines stays **under
500**. Rules:

1. Process commits in chronological order (oldest first).
2. Start a new bucket whenever adding the next commit would push the running
   total to 500 or above.
3. A single commit that exceeds 500 lines on its own goes into its own bucket
   with a warning.
4. If the user supplied grouping hints in `$ARGUMENTS`, use them to keep
   related commits together even if that means a bucket is slightly under the
   limit.

Display the proposed split plan and **ask the user to confirm** before creating
any branches:

```
Proposed split (3 branches from `feature/my-big-feature`):

  Branch 1: feature/my-big-feature-1  (2 commits, 420 lines)
    • abc1234 feat: add user authentication
    • def5678 feat: add login form

  Branch 2: feature/my-big-feature-2  (1 commit, 340 lines)
    • 789abcd feat: add admin panel

  Branch 3: feature/my-big-feature-3  (2 commits, 290 lines)
    • 012ef34 feat: add admin user management
    • 345gh67 feat: add audit log

Each branch builds on top of the previous one (stacked PRs).
Proceed? [y/N]
```

Wait for confirmation. If the user says no or wants adjustments, help them
tweak the grouping.

## Step 4 — Create the branches

For each bucket (1 through N):

1. Determine the branch name: `<current-branch>-<N>` (e.g.
   `feature/my-big-feature-1`).
2. Check out the correct starting point:
   - Bucket 1 starts from `origin/<base>`.
   - Bucket N (N > 1) starts from the tip of bucket N-1's branch.
3. Create and check out the new branch:
   ```
   git checkout -b <branch-name>
   ```
4. Cherry-pick each commit in the bucket:

   ```
   git cherry-pick <sha>
   ```

   If cherry-pick produces a conflict, stop and report:
   - Which commit conflicted
   - Which files are conflicting Ask the user to resolve the conflict, stage
     the files, and run `git cherry-pick --continue`, then tell you when done
     so you can proceed.

5. After all commits in the bucket are applied, verify line count:
   ```
   git diff --shortstat origin/<base-for-this-branch>..HEAD
   ```
   Report the actual line count for the branch.

After all buckets are done, check out the **last branch** created.

## Step 5 — Report

Display a summary:

```
Split complete — 3 branches created from `feature/my-big-feature`:

  feature/my-big-feature-1  (420 lines)  ← base: main
  feature/my-big-feature-2  (340 lines)  ← base: feature/my-big-feature-1
  feature/my-big-feature-3  (290 lines)  ← base: feature/my-big-feature-2

Currently on: feature/my-big-feature-3

Next steps:
  1. Push and open a PR for feature/my-big-feature-1 targeting `main`.
  2. Push and open a PR for feature/my-big-feature-2 targeting
     `feature/my-big-feature-1`.
  3. Push and open a PR for feature/my-big-feature-3 targeting
     `feature/my-big-feature-2`.
  4. Merge in order, rebasing later branches as earlier ones land.
```

Do **not** push any branch unless the user explicitly asks.

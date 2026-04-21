# Plan: Split `/fix` into `/fix-pr` + `/fix-issue` + router, adapting `/fix-pr` from `receiving-code-review`

**Issue:** https://github.com/0k-software/.github/issues/72

## Summary

The current `/fix` skill handles GitHub mechanics well (thread fetching,
idempotency, commit links) but lacks the evaluation mindset from
`obra/superpowers`' `receiving-code-review`: verify before implementing, push
back on technically wrong suggestions, stop and clarify unclear feedback, apply
skepticism to external reviewers.

This plan splits `/fix` into three skills — `/fix-pr` (PR review addressing,
combining `receiving-code-review` mindset with current mechanics), `/fix-issue`
(issue comment addressing, extracted verbatim), and a thin `/fix` router — plus
`/address-pr` and `/address-issue` aliases. Implementation follows the "copy →
evolve → split" pattern used for `/0k:refine`.

## Steps

- [x] [Step 1: Copy `receiving-code-review` verbatim into `fix-pr/`](#step-1-copy-receiving-code-review-verbatim-into-fix-pr)
- [ ] [Step 2: Evolve `fix-pr/SKILL.md` — merge in all `/fix` PR mechanics and 0k additions](#step-2-evolve-fix-prskillmd--merge-in-all-fix-pr-mechanics-and-0k-additions)
- [ ] [Step 3: Split — extract `fix-issue`, rewrite router, add aliases, update issues #80 and #63](#step-3-split--extract-fix-issue-rewrite-router-add-aliases-update-issues-80-and-63)

---

## Step 1: Copy `receiving-code-review` verbatim into `fix-pr/`

Create `0k/skills/fix-pr/SKILL.md` with the exact content of
`obra/superpowers`' `receiving-code-review` skill as-is — no edits. Also create
`0k/skills/fix-pr/README.md` with upstream attribution (source repo URL, SHA of
the commit copied from, date).

**Files to create:**

- `0k/skills/fix-pr/SKILL.md` — verbatim copy of
  `https://raw.githubusercontent.com/obra/superpowers/main/skills/receiving-code-review/SKILL.md`
- `0k/skills/fix-pr/README.md` — attribution note:

  ```
  # fix-pr

  Adapted from [`obra/superpowers`](https://github.com/obra/superpowers) —
  `skills/receiving-code-review/SKILL.md` @ {SHA} ({date}).

  The upstream skill was copied verbatim and then evolved to merge in the
  GitHub mechanics from the previous `0k/skills/fix/` PR path.
  ```

  (Fill in actual SHA and date at implementation time by running
  `git ls-remote https://github.com/obra/superpowers refs/heads/main`.)

- `0k/skills/refine/README.md` — attribution note for the existing `/refine`
  skill (same commit, same upstream, same SHA):

  ```
  # refine

  Adapted from [`obra/superpowers`](https://github.com/obra/superpowers) —
  `skills/brainstorming/SKILL.md` @ {SHA} ({date}).

  The upstream skill was copied verbatim and then evolved to match 0k
  conventions: fetch the GitHub issue as starting context, write the approved
  design back to the issue body, and route all commits through `/0k:commit`.
  ```

  Use the same SHA as for `fix-pr/README.md` — both skills were adapted from
  `obra/superpowers` and the SHA documents the upstream state at the time of
  the copy.

The SKILL.md frontmatter should be updated to match our skill conventions:

```yaml
---
name: fix-pr
description:
  Address unresolved review comments on a pull request — verify before
  implementing, push back when technically wrong, route commits through
  /0k:commit
argument-hint: "{ PR number or URL }"
---
```

---

## Step 2: Evolve `fix-pr/SKILL.md` — merge in all `/fix` PR mechanics and 0k additions

Working directly in `0k/skills/fix-pr/SKILL.md`, merge the full content of the
current `/fix` Part A into the `receiving-code-review` base. The result is the
complete `/fix-pr` skill with both the evaluation mindset and the GitHub
mechanics.

**Evaluation mindset to preserve from `receiving-code-review`** — keep
**everything** from the upstream skill unless it directly conflicts with the
GitHub mechanics being merged in. When in doubt, keep it:

- Core principle, response pattern, forbidden responses
- Handling unclear feedback (stop and clarify all items before implementing
  anything)
- Source-specific trust (human partner = trusted; external reviewer = evaluate
  skeptically — codebase fit, YAGNI, breaking changes, missing context)
- When/how to push back; gracefully correcting a wrong pushback
- All examples, tables, and "Common Mistakes" sections
- Any other section present in the verbatim copy from Step 1

Only remove or replace a section if it directly contradicts a mechanic from
`/fix` Part A (e.g. a generic "commit the fix" instruction that conflicts with
the `/0k:commit` routing requirement). Everything else stays.

**GitHub mechanics to add from current `/fix` Part A:**

- **A1 — Gather review comments**: GraphQL query for all review threads with
  `isResolved`; discard resolved threads; idempotency check — skip any thread
  where **any** comment has a 👀 (`eyes`) reaction from the authenticated
  viewer (check all comments, not just the first); last comment in thread takes
  precedence
- **A2 — Classify and group**: Question vs Change request taxonomy; one commit
  per thread by default, only merge truly inseparable changes
- **A3 — Handle questions**: post reply with attribution footer, then stop and
  wait for user input before proceeding
- **A4 — Implement change requests**: TodoWrite task queue (one task per group,
  created upfront before any work); commit loop via `/0k:commit` with `!` flag;
  push **once** after all groups are committed; reply to every thread with a
  commit link
- **Commit link construction**: changes view URL (`/pull/{pr}/changes/{sha}`),
  SHA-256 file anchor (`printf '%s' "{path}" | sha256sum | awk '{print $1}'`),
  `R{line}`/`L{line}` side encoding, formatted as ``[`{short_sha}`]({url})``
- **A5 — Mark as addressed**: react 👀 on **all** comments of every addressed
  thread (not just first comment)
- **A6 — Report**: summary of questions answered, changes addressed, skips

**0k-specific additions to add:**

- All commits routed through `/0k:commit` with `!` flag (never raw
  `git commit`)
- Every reply posted to GitHub ends with:
  ```
  ---
  *Generated by Claude Code*
  ```

The integration approach: position the `receiving-code-review` mindset sections
as a preamble/philosophy section (they establish _how to think_), then follow
with the lettered A1–A6 workflow sections (they establish _how to execute_).
The mindset applies throughout — especially in A2 (classification), A3
(question replies), and A4 (change request evaluation).

---

## Step 3: Split — extract `fix-issue`, rewrite router, add aliases, update issues #80 and #63

Create the remaining skill files and update the two dependent issues.

**Files to create:**

`0k/skills/fix-issue/SKILL.md` — exact verbatim copy of the current `/fix` Part
B (everything from `## Part B — Fixing an Issue` through the end of the file,
plus the shared AI Attribution Footer section). Update the frontmatter:

```yaml
---
name: fix-issue
description:
  Address unresolved comments on a GitHub issue — update description, reply to
  feedback, mark addressed with 👀
argument-hint: "{ issue number or URL }"
---
```

`0k/skills/fix/SKILL.md` — rewrite as a thin router:

```yaml
---
name: fix
description:
  Address unresolved feedback on a pull request or GitHub issue — routes to
  /fix-pr or /fix-issue
argument-hint: "{ PR or issue number or URL }"
---
```

Router logic:

- Argument contains `/pull/` or is a PR number → invoke `/fix-pr`
- Argument is empty → run `gh pr view --json number -q .number`; if an open PR
  exists invoke `/fix-pr`, otherwise invoke `/fix-issue`
- Argument contains `/issues/` or is an issue number with no open PR → invoke
  `/fix-issue`

`0k/skills/address-pr/SKILL.md` — alias:

```yaml
---
name: address-pr
description:
  Address unresolved review comments on a pull request — alias for /fix-pr
argument-hint: "{ PR number or URL }"
---
Alias for `/fix-pr`. Read `0k/skills/fix-pr/SKILL.md` and follow it exactly,
using `$ARGUMENTS` as the input.
```

`0k/skills/address-issue/SKILL.md` — alias:

```yaml
---
name: address-issue
description:
  Address unresolved comments on a GitHub issue — alias for /fix-issue
argument-hint: "{ issue number or URL }"
---
Alias for `/fix-issue`. Read `0k/skills/fix-issue/SKILL.md` and follow it
exactly, using `$ARGUMENTS` as the input.
```

**Update GitHub issues:**

After all files are committed, add a "blocked by #72" relation to issues #80
and #63:

- Post a comment on #80: "Blocked by #72 — `fix-pr/SKILL.md` is created there.
  Implement after #72 merges."
- Post a comment on #63: "Blocked by #72 — `fix-pr/SKILL.md` is created there.
  Implement after #72 merges."

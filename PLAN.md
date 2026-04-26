# Plan: Align `/0k:create-issue` heading level with GitHub Issue Forms (`###`)

**Issue:** https://github.com/0k-software/.github/issues/100

## Summary

The `/0k:create-issue` skill emits `## {label}` for every template field, but
GitHub's native Issue Forms UI emits `### {label}`. This mismatch means issues
created by the skill look different from those created through GitHub's UI, and
it complicates section-boundary parsing in downstream tooling (issue-hygiene
check #97, which currently tolerates both levels to work around the gap).

## Approach

Two targeted text changes across two files:

1. Replace both `## {label}` occurrences in `SKILL.md`'s conversion rules with
   `### {label}`.
2. Add a `### Changed` bullet to the `## [Unreleased]` section of
   `CHANGELOG.md`.

## Steps

- [ ] [Step 1: Change `## {label}` to `### {label}` in `create-issue/SKILL.md`](#step-1-change--label-to--label-in-create-issueskillmd)
- [ ] [Step 2: Add CHANGELOG entry](#step-2-add-changelog-entry)

---

## Step 1: Change `## {label}` to `### {label}` in `create-issue/SKILL.md`

In `0k/skills/create-issue/SKILL.md`, the "Converting Template Fields to
Markdown" section contains two rules that instruct the skill to emit
`## {label}`. Replace both with `### {label}`:

- Line 55: `render "## {label}"` → `render "### {label}"`
- Line 58: `render "## {label}"` → `render "### {label}"`

These are the only two occurrences of the `## {label}` pattern in the file.

After editing, manually smoke-test the change: invoke `/0k:create-issue` on a
scratch repo and confirm the resulting issue body uses `###` headings
throughout.

---

## Step 2: Add CHANGELOG entry

In `CHANGELOG.md`, add a bullet under `## [Unreleased]` → `### Changed`:

```
- `/0k:create-issue` now emits `### {label}` headings to match GitHub's native Issue Forms output.
```

If a `### Changed` subsection does not yet exist under `## [Unreleased]`,
create it. Commit this change together with Step 1 or as a standalone commit —
either is fine since it's a documentation-only change.

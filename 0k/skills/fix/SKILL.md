---
name: fix
description:
  Address unresolved feedback on a pull request or GitHub issue — routes to
  /fix-pr or /fix-issue
argument-hint: "{ PR or issue number or URL }"
---

Address all **unresolved** feedback on a pull request or GitHub issue.

`$ARGUMENTS` is a PR number, issue number, PR URL, or issue URL.

- If the argument contains `/pull/` → read `0k/skills/fix-pr/SKILL.md` and
  follow it, using `$ARGUMENTS` as the input.
- If the argument contains `/issues/` → read `0k/skills/fix-issue/SKILL.md` and
  follow it, using `$ARGUMENTS` as the input.
- If the argument is a **bare number** → run `gh pr view "$ARGUMENTS"` (or the
  MCP equivalent) to check whether it identifies a pull request. If that
  succeeds, read `0k/skills/fix-pr/SKILL.md` and follow it. If it fails (not a
  PR), read `0k/skills/fix-issue/SKILL.md` and follow it.
- If the argument is **empty**:
  1. Run `gh pr view --json number -q .number` to find an open PR for the
     current branch. If one is found, read `0k/skills/fix-pr/SKILL.md` and
     follow it.
  2. Otherwise, try to infer the relevant issue from the current conversation
     context — if an issue was recently refined, discussed, or is the explicit
     subject of this session, use that issue number and read
     `0k/skills/fix-issue/SKILL.md`.
  3. If nothing can be inferred, ask the user to provide an issue number or
     URL.

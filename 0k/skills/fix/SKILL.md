---
name: fix
description:
  Address unresolved feedback on a pull request or GitHub issue — routes to
  /fix-pr or /fix-issue
argument-hint: "{ PR or issue number or URL }"
---

Address all **unresolved** feedback on a pull request or GitHub issue.

`$ARGUMENTS` is a PR number, issue number, PR URL, or issue URL.

- If the argument contains `/pull/` or is a PR number → read
  `0k/skills/fix-pr/SKILL.md` and follow it, using `$ARGUMENTS` as the input.
- If the argument is empty → run `gh pr view --json number -q .number` to find
  an open PR for the current branch. If one is found, read
  `0k/skills/fix-pr/SKILL.md` and follow it. If no PR is found, read
  `0k/skills/fix-issue/SKILL.md` and follow it.
- If the argument contains `/issues/` or is an issue number → read
  `0k/skills/fix-issue/SKILL.md` and follow it, using `$ARGUMENTS` as the
  input.

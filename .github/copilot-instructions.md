# GitHub Copilot instructions

Guidance for GitHub Copilot when working in this repository.

<!-- 0k:org-instructions:begin -->
## Org-wide instructions

This section is automatically synced from
[`copilot-instructions.md`](https://github.com/0k-software/.github/blob/main/copilot-instructions.md)
in `0k-software/.github`. Any changes between the
`<!-- 0k:org-instructions:begin -->` / `<!-- 0k:org-instructions:end -->`
markers will be overwritten on the next sync run — edit the canonical source
instead.

### Draft PRs containing only `PLAN.md`

Some draft PRs intentionally contain only a `PLAN.md` file and no other
changes. This is expected, not incomplete.

`PLAN.md` is the implementation plan for the spec described in the linked
issue. It is committed on purpose so reviewers can react to the plan before any
implementation work happens. Do not flag the PR as incomplete or suggest
removing the file.

### Reviewing `PLAN.md`

Review `PLAN.md` as a plan, not as code. Useful feedback answers:

- Does the plan correctly implement the spec from the linked issue?
- Are the steps coherent, complete, and in a sensible order?
- Are there missing edge cases, risks, or assumptions worth flagging?

### What not to flag on `PLAN.md`

Skip code-review heuristics on `PLAN.md` — they don't apply to a planning
document. In particular, do not flag formatting nits, linting concerns, or
suggest that the file shouldn't be committed.
<!-- 0k:org-instructions:end -->

## Repo-specific instructions

**Insert here instructions specific to this repo**

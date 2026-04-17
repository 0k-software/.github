# Plan: refine-issue skill uses invalid `issueType` JSON field with `gh issue view`

**Issue:** https://github.com/0k-software/.github/issues/62

## Summary

The `refine-issue` skill's Step 1 fetches issue details with
`gh issue view ... --json title,body,labels,number,url,state,issueType`.
`issueType` is not a valid JSON field for `gh issue view`, so the command fails
with `Unknown JSON field: "issueType"` and the entire workflow halts. Issue
type is only exposed via the GraphQL API — the `create-issue` skill already
uses it correctly.

## Approach

Fix `0k/skills/refine-issue/SKILL.md`:

1. Drop `issueType` from the `gh issue view --json` field list so the command
   stops failing.
2. Add a small GraphQL call to fetch the issue type (mirroring the pattern used
   in `create-issue`), so the skill still has the type available as context for
   its "Analyse feedback" step.

Single atomic commit — this is a documentation-only fix to one skill file.

## Steps

- [ ] [Step 1: Fix `gh issue view` call and fetch issue type via GraphQL](#step-1-fix-gh-issue-view-call-and-fetch-issue-type-via-graphql)

---

## Step 1: Fix `gh issue view` call and fetch issue type via GraphQL

**File:** `0k/skills/refine-issue/SKILL.md`

In Step 1 ("Fetch the issue"), change the `gh issue view` invocation to drop
the invalid `issueType` field:

```
gh issue view {number} --repo {owner}/{repo} --json title,body,labels,number,url,state
```

Then add a follow-up sub-step that fetches the issue type via GraphQL, matching
the pattern used by `create-issue`:

```
gh api graphql -f query='
  query {
    repository(owner: "{owner}", name: "{repo}") {
      issue(number: {number}) {
        issueType { name }
      }
    }
  }
'
```

Keep the surrounding prose tight: mention that the issue type is fetched
separately because `gh issue view --json` does not expose it, and that the type
is used as context when analysing feedback. Do not restructure the rest of the
skill — the bug only affects the fetch command in Step 1.

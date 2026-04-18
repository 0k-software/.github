# Plan: refine-issue skill uses invalid `issueType` JSON field with `gh issue view`

**Issue:** https://github.com/0k-software/.github/issues/62

## Summary

The `refine-issue` skill's Step 1 fetches issue details with
`gh issue view ... --json title,body,labels,number,url,state,issueType`.
`issueType` is not a valid JSON field for `gh issue view`, so the command fails
with `Unknown JSON field: "issueType"` and the entire workflow halts. The rest
of the skill never uses the issue type, so the simplest fix is to drop it from
the fetch — no replacement query needed.

## Approach

Fix `0k/skills/refine-issue/SKILL.md` by dropping `issueType` from the
`gh issue view --json` field list in Step 1. The field is unused downstream, so
no GraphQL fallback is added. Single atomic commit — this is a
documentation-only fix to one skill file.

## Steps

- [ ] [Step 1: Drop `issueType` from the `gh issue view` call](#step-1-drop-issuetype-from-the-gh-issue-view-call)

---

## Step 1: Drop `issueType` from the `gh issue view` call

**File:** `0k/skills/refine-issue/SKILL.md`

In Step 1 ("Fetch the issue"), change the `gh issue view` invocation to drop
the invalid `issueType` field:

```
gh issue view {number} --repo {owner}/{repo} --json title,body,labels,number,url,state
```

Leave the rest of the skill untouched — the bug only affects this one command,
and no downstream step reads the issue type.

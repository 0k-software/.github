## PLAN.md format

```
# Plan: {issue title}

**Issue:** {url}

## Summary
{brief description of what the issue is about}

## Approach
{overall implementation strategy}

## Steps

- [ ] [Step 1: {title}](#step-1-title)
- [ ] [Step 2: {title}](#step-2-title)
- ...

---

## Step 1: {title}

{detailed description of what to implement and how}

---

## Step 2: {title}

{detailed description of what to implement and how}
```

Each step is an atomic commit — the smallest change that passes the project's
git pre-commit hooks.

Completed steps have `- [x]` in the TOC checklist.

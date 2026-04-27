# Plan: Create 0K App and .github-private for org-wide automation

**Issue:** https://github.com/0k-software/.github/issues/125

## Summary

Set up the foundational org-wide automation infrastructure: a `0K App` GitHub
App and a private `.github-private` repo. The org-admin steps (creating the
app, installing it, storing secrets) are manual — the only code deliverable is
documenting both artifacts in `README.md`.

## Approach

Add a new `## Org Infrastructure` section to `README.md`, inserted after
`## 0k Plugin` and before `## Git Hooks`. Two subsections: `### 0K App`
(permissions and org secrets) and `### .github-private` (purpose and
convention). Reference facts only — no usage snippets.

The PR stays open until the manual org-admin steps are completed. The issue
closes only after both the README is merged and the org-admin steps are done.

## Steps

- [x] [Step 1: Add Org Infrastructure section to README.md](#step-1-add-org-infrastructure-section-to-readmemd)

---

## Step 1: Add Org Infrastructure section to README.md

Insert a new `## Org Infrastructure` section in `README.md` between the
`## 0k Plugin` section and the `## Git Hooks` section.

The section has two subsections:

**`### 0K App`** — describes the shared GitHub App used for all org
automations:
- What it is and why a single shared app was chosen over per-feature apps
- The five permissions it holds: Organization projects R/W, Issues R/W,
  Contents R/W, Pull requests R/W, Metadata R
- The two org secrets workflows use to authenticate: `OK_APP_ID` and
  `OK_APP_PRIVATE_KEY`, consumed via `actions/create-github-app-token`

**`### .github-private`** — describes the private repo hosting sensitive
workflows:
- What it is: a private org repo so workflow logs don't expose private repo
  names to unauthorized users
- The convention: any workflow that touches or lists private repos belongs here
  (e.g. Copilot instructions sync, issue-hygiene)

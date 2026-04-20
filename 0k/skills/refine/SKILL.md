---
name: refine
description:
  Refine a GitHub issue interactively — brainstorm through each template
  section with the user one at a time, then update the issue on approval
argument-hint: { issue number or URL }
---

# Refine Issue

**Core principle:** Do NOT update the GitHub issue until you have presented the
complete refined body and the user has explicitly approved it.

Refine a GitHub issue by working through its template sections as a design
document — fetching the current content, clarifying intent if needed, drafting
each section with the user's input, self-reviewing for completeness, and
writing back only on final approval.

`$ARGUMENTS` is an issue number or URL. If empty, try to infer the issue number
from the current branch name — if the branch name starts with digits (e.g.
`42-some-feature`), use that number. If no number can be inferred, ask the user
which issue to refine.

---

## Step 1 — Fetch context

1. Derive `{owner}/{repo}` from the current working directory's git remote. If
   `$ARGUMENTS` is a full URL, extract the owner/repo/number from it instead.
2. Fetch the issue details (title, body, issue type, labels) using `gh`:
   ```
   gh issue view {number} --repo {owner}/{repo} \
     --json title,body,labels,number,url,state,issueType
   ```
3. Fetch **all** comments on the issue:
   ```
   gh api "repos/{owner}/{repo}/issues/{number}/comments" --paginate \
     --jq '.[] | {id, author: .user.login, body}'
   ```
   Then, for each comment, fetch its reactions to check for the ✅
   (`white_check_mark`) marker:
   ```
   viewer="$(gh api user --jq .login)"
   gh api "repos/{owner}/{repo}/issues/comments/{comment-id}/reactions" \
     --jq --arg viewer "$viewer" \
     '[.[] | select(.content == "white_check_mark" and .user.login == $viewer)]'
   ```
4. **Read all comments as context.** For comments already marked ✅ by the
   authenticated user, skip re-executing them in this run — but still read
   their content and factor it into the brainstorming. Only suppress
   re-execution; never ignore content. ✅ reactions from other users do **not**
   suppress re-execution.

## Step 2 — Detect issue type and load template sections

1. Identify the issue type from the `issueType` field (e.g. "Feature",
   "Enhancement", "Bug", "Task", "Pitch", "Kickoff"). Fall back to scanning
   labels if `issueType` is empty. If the type still cannot be determined, ask
   the user to pick one before continuing.
2. Map the type to the corresponding template file in
   `0k/references/templates/`:

   | Issue type  | Template file                               |
   | ----------- | ------------------------------------------- |
   | Pitch       | `0k/references/templates/1-pitch.yml`       |
   | Feature     | `0k/references/templates/2-feature.yml`     |
   | Task        | `0k/references/templates/3-task.yml`        |
   | Bug         | `0k/references/templates/4-bug.yml`         |
   | Enhancement | `0k/references/templates/5-enhancement.yml` |
   | Kickoff     | `0k/references/templates/6-kickoff.yml`     |

3. Read the template file and collect all non-`markdown` input fields —
   `textarea`, `dropdown`, `checkboxes`, and `input` — in order. Their `label`
   values become the brainstorming agenda.

## Step 3 — Ask clarifying questions

Before brainstorming through the sections, check whether the issue's overall
purpose, scope, or constraints are unclear. **Ask one question at a time** —
never pose multiple questions in a single message. Do not ask what is already
answered clearly in the issue body or comments.

Stop asking when the context is sufficient to write well-structured content for
every template section.

## Step 4 — Brainstorm through each section

Work through the brainstorming agenda (template sections in order). For each
section:

1. **Show** the section name and its current content from the issue body. Note
   if it is missing or still contains placeholder text.
2. **Analyse** what a complete, well-written version should contain, anchored
   to the issue's purpose and any clarifications from Step 3.
3. **If the section requires a decision** (e.g. alternative approaches, scope
   trade-offs, severity choice), propose 2–3 options with their trade-offs and
   ask the user to choose. Present as a single focused question. Wait for the
   response before drafting.
4. **Draft** the section incorporating the user's input (or your best judgement
   if no choice was needed). Present the draft with an explicit approval
   checkpoint:

   > Does this look right for **{Section Name}**, or would you like changes?

   Wait for the user to approve or request changes before moving to the next
   section.

## Step 5 — Self-review

After drafting all sections, review the complete body before presenting it:

- Remove any remaining placeholder text
- Check for contradictions between sections
- Fill obvious gaps silently

## Step 6 — Write back on approval

Present the complete self-reviewed body and ask for final approval:

> Here's the complete refined issue. Approve to update GitHub, or let me know
> what to change.

If the user approves:

1. Write the body to a temp file and update the issue. Include `--title` only
   if the title changed:

   ```
   gh issue edit {number} --repo {owner}/{repo} --body-file /tmp/issue-body.md
   ```

   If the title changed, add: `--title "{new title}"`

2. If any comments raised questions or feedback incorporated into the refined
   body, post a **single** reply comment addressing all of them. Reference each
   commenter by `@username`. Append the AI attribution footer (see below).

   ```
   gh issue comment {number} --repo {owner}/{repo} --body-file /tmp/issue-reply.md
   ```

3. React with ✅ (`white_check_mark`) to every comment addressed in this run:
   ```
   gh api "repos/{owner}/{repo}/issues/comments/{comment-id}/reactions" \
     -X POST -f content="white_check_mark"
   ```

## Step 7 — Report

Display a summary:

- Whether the title changed (old → new)
- Which sections were updated (brief description per section)
- How many comments were addressed
- Any items skipped and why

---

## AI Attribution Footer

Always append the following to every comment posted on GitHub, separated by a
blank line:

```
---
*Generated by Claude Code*
```

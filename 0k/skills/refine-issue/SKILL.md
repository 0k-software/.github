# Adapted from obra/superpowers @ — skills/brainstorming/SKILL.md

---

name: refine-issue description: Refine a GitHub issue interactively —
brainstorm through each template section with the user one at a time, then
update the issue on approval argument-hint: { issue number or URL }

---

# Refine Issue

Refine a GitHub issue by brainstorming through each of its template sections
interactively — analysing the current content, proposing improvements, asking
the user for decisions where choices are needed, and writing back the approved
result.

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
3. Fetch **all** comments on the issue including their reactions:
   ```
   gh api "repos/{owner}/{repo}/issues/{number}/comments" --paginate \
     --jq '.[] | {id, author: .user.login, body}'
   ```
   For each comment, fetch its reactions to check for the ✅
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
   labels if `issueType` is empty.
2. Map the type to the corresponding template file:

   | Issue type  | Template file                                        |
   | ----------- | ---------------------------------------------------- |
   | Pitch       | `0k/skills/create-issue/templates/1-pitch.yml`       |
   | Feature     | `0k/skills/create-issue/templates/2-feature.yml`     |
   | Task        | `0k/skills/create-issue/templates/3-task.yml`        |
   | Bug         | `0k/skills/create-issue/templates/4-bug.yml`         |
   | Enhancement | `0k/skills/create-issue/templates/5-enhancement.yml` |
   | Kickoff     | `0k/skills/create-issue/templates/6-kickoff.yml`     |

   If the type cannot be determined, ask the user to pick one before
   continuing.

3. Read the template file and collect all non-`markdown` input fields —
   `textarea`, `dropdown`, `checkboxes`, and `input` — in order. Their `label`
   values become the brainstorming agenda.

## Step 3 — Run the brainstorming rhythm

Work through the template sections one at a time. **Never ask more than one
question in a single message** — the user should never feel overwhelmed.

For each section in the brainstorming agenda (in template order):

1. **Show** the section name and its current content from the issue body. Note
   if the section is missing or still contains the placeholder default text.
2. **Analyse** what a well-written version should contain, anchored to the
   issue's specific goal and context.
3. **If the section involves a choice** (e.g. alternative approaches, severity
   level, which option to take), propose 2–3 options with their trade-offs and
   ask the user to decide. Wait for the response before drafting. Present the
   decision as a single focused question.
4. **Draft** the section incorporating the user's input (or your best judgement
   if no choice was needed). Present the draft with an explicit approval
   checkpoint:

   > Does this look right for **{Section Name}**, or would you like any
   > changes?

   Wait for the user to approve or request changes before moving on to the next
   section.

After drafting all sections, **self-review** the complete body:

- Remove any remaining placeholder text
- Check for contradictions between sections
- Fill obvious gaps silently

Present the self-reviewed draft in full before moving to Step 4.

## Step 4 — Write back on approval

Ask the user for final approval of the complete draft:

> Here's the complete refined issue. Approve to update GitHub, or let me know
> what to change.

If the user approves:

1. Write the approved body to a temporary file. Update the issue, including
   `--title` only if the title changed:

   ```
   gh issue edit {number} --repo {owner}/{repo} --body-file /tmp/issue-body.md
   ```

   If the title changed, add: `--title "{new title}"`

2. If any comments raised questions or feedback that was incorporated into the
   refined body, post a **single** reply comment on the issue (not one per
   comment) addressing all of them. Reference each commenter by `@username`.
   Append the AI attribution footer (see below).

   ```
   gh issue comment {number} --repo {owner}/{repo} --body-file /tmp/issue-reply.md
   ```

3. React with ✅ (`white_check_mark`) to every comment that was addressed or
   incorporated in this run:
   ```
   gh api "repos/{owner}/{repo}/issues/comments/{comment-id}/reactions" \
     -X POST -f content="white_check_mark"
   ```

## Step 5 — Report

Display a summary:

- Whether the title changed (old → new)
- Which sections were updated (brief description of changes per section)
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

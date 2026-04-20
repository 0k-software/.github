---
name: refine
description:
  Refine a GitHub issue interactively — brainstorm through each template
  section with the user one at a time, then update the issue on approval
argument-hint: { issue number or URL }
---

> **HARD GATE — Do NOT update the GitHub issue until you have presented the
> complete refined body and the user has explicitly approved it.**

Turn a GitHub issue into a fully refined, well-structured description through
natural collaborative dialogue. Work through the issue's template sections one
at a time, propose alternatives where meaningful choices exist, and only write
back once the user has signed off on the complete result.

`$ARGUMENTS` is an issue number or URL. If empty, try to infer the issue number
from the current branch name — if the branch name starts with digits (e.g.
`42-some-feature`), use that number. If no number can be inferred, ask the user
which issue to refine.

---

## Issue Context

Before starting the brainstorming process, fetch the GitHub issue and load the
relevant template.

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
5. Identify the issue type from the `issueType` field (e.g. "Feature",
   "Enhancement", "Bug", "Task", "Pitch", "Kickoff"). Fall back to scanning
   labels if `issueType` is empty. If the type still cannot be determined, ask
   the user to pick one before continuing.
6. Map the type to the corresponding template file in
   `0k/references/templates/` and read it. Collect all non-`markdown` input
   fields — `textarea`, `dropdown`, `checkboxes`, and `input` — in order. Their
   `label` values become the **brainstorming agenda**.

   | Issue type  | Template file                               |
   | ----------- | ------------------------------------------- |
   | Pitch       | `0k/references/templates/1-pitch.yml`       |
   | Feature     | `0k/references/templates/2-feature.yml`     |
   | Task        | `0k/references/templates/3-task.yml`        |
   | Bug         | `0k/references/templates/4-bug.yml`         |
   | Enhancement | `0k/references/templates/5-enhancement.yml` |
   | Kickoff     | `0k/references/templates/6-kickoff.yml`     |

---

## Step 1 — Explore context

Explore the issue title, body, and comments to understand the full context: the
problem it addresses, who is affected, and what a successful outcome looks
like. If the issue references code or existing behaviour, read the relevant
files.

Present your understanding to the user — 2–3 sentences summarising what this
issue is trying to achieve. If your reading of the intent is wrong, the user
will correct it before you proceed.

## Step 2 — Offer visual companion

If the issue involves UI, architecture, or anything where a diagram would help
clarify design options, offer the visual companion as a **separate message**:

> Would a diagram or mockup help clarify any aspect of this issue? I can open
> an interactive canvas for sketching out the design.

Do **not** include this offer in the same message as a question or design
proposal — it must be its own message so the user can decline without
disrupting the design flow. Skip this step entirely when no visual content
would be useful.

## Step 3 — Ask clarifying questions

Before brainstorming through the sections, check whether the issue's purpose,
scope, or constraints are unclear. **Ask one question at a time** — never pose
multiple questions in a single message. Prefer multiple-choice format where
options can be listed. Do not ask what is already answered clearly in the issue
body or comments.

Stop asking when the context is sufficient to write well-structured content for
every template section.

## Step 4 — Propose alternatives

Before drilling into individual sections, identify any high-level design
choices where multiple approaches are reasonable (e.g. implementation strategy,
scope boundaries, breaking vs. backwards-compatible change). For each, propose
**2–3 options with explicit trade-offs** and ask the user to choose.

Never skip this step for issues with non-trivial design choices — the "this is
too simple to need options" shortcut is an anti-pattern.

## Step 5 — Present design sections

Work through the brainstorming agenda (template sections in order). For each
section:

1. **Show** the section name and its current content from the issue body. Note
   if it is missing or still contains placeholder text.
2. **Analyse** what a complete, well-written version should contain, anchored
   to the issue's purpose and clarifications from Steps 3–4.
3. **If the section requires a decision** (not already resolved in Step 4),
   propose 2–3 options with their trade-offs and ask the user to choose.
   Present as a single focused question. Wait for the response before drafting.
4. **Draft** the section incorporating the user's input (or your best judgement
   if no choice was needed). Present the draft with an explicit approval
   checkpoint:

   > Does this look right for **{Section Name}**, or would you like changes?

   Wait for the user to approve or request changes before moving to the next
   section.

## Step 6 — Write the refined body

After all sections are drafted and approved, assemble the complete refined
issue body in markdown. Use `## {label}` headings for each template section.
Hold the result in context — do not write to GitHub yet.

## Step 7 — Self-review

Review the complete body before showing it to the user:

- Remove any remaining placeholder text
- Check for contradictions between sections
- Verify scope alignment with what was agreed in Steps 3–5
- Fill obvious gaps silently

## Step 8 — Request user review

Present the complete self-reviewed body and ask for final approval:

> Here's the complete refined issue. Approve to update GitHub, or let me know
> what to change.

Wait for explicit approval before making any changes to GitHub.

## Step 9 — Write back to GitHub

Once approved, update the issue and address any open comments:

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

## Step 10 — Report

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

---
name: 0k-create-issue
description: Create a GitHub issue in an 0k-software org repo using the standardized issue templates (pitch, feature, task, bug, enhancement, kickoff).
argument-hint: <repo> <description of the issue>
---

# Create Issue from Template

You are helping the user create a GitHub issue in an **0k-software** organization
repository. All issues MUST use one of the organization's standardized templates.
Do NOT create free-form issues.

## Instructions

1. **Parse the user request from:** $ARGUMENTS
2. **Identify the target repo.** If the user specified a repo name, use it
   (prepend `0k-software/` if not fully qualified). If no repo is specified,
   check if the current working directory is inside a git repo that belongs to
   `0k-software` and use that. Otherwise, ask the user which repo.
3. **Determine the issue type** from the description using the table below.
   If ambiguous, present the user with the options and ask them to pick.
4. **Read the corresponding template file** from `${CLAUDE_SKILL_DIR}/templates/`
   to understand the exact fields and structure required for that issue type.
5. **Gather the required fields** for that template. Fill in every field you can
   infer from the user's description. For fields you cannot infer, ask the
   user — do NOT leave template placeholders or italic prompt text in the
   final issue.
6. **Create the issue** using the GitHub MCP tools (preferred) or `gh` CLI.
   - Apply the correct issue type from the template's `type` field value.
   - Construct a clear, concise title (do NOT include emoji prefixes — GitHub
     adds the template icon automatically).
   - Build the markdown body by converting the template's form fields into
     markdown sections (see conversion rules below).

## Template Types

Match the user's intent to one of these types:

| Type            | Template file       | When to use                                                      |
| --------------- | ------------------- | ---------------------------------------------------------------- |
| **Pitch**       | `1-pitch.yml`       | User wants to propose a new project or big idea                  |
| **Feature**     | `2-feature.yml`     | User wants a new feature, capability, or functionality           |
| **Task**        | `3-task.yml`        | Infra work, migrations, setup, config, or concrete work          |
| **Bug**         | `4-bug.yml`         | Something is broken, unexpected behavior, or an error            |
| **Enhancement** | `5-enhancement.yml` | Refactor, DevX improvement, performance boost, non-critical fix  |
| **Kickoff**     | `6-kickoff.yml`     | Pre-flight checklist before starting a project                   |

## Converting Template Fields to Markdown

The template `.yml` files are GitHub Issue Form definitions. Convert them to a
markdown issue body as follows:

- **`textarea`** fields → `## {label}` heading followed by the content.
  The `value` in the template is placeholder/prompt text — replace it with
  real content, never include it verbatim.
- **`dropdown`** fields → `## {label}` heading followed by the selected value.
- **`checkboxes`** fields → `## {label}` heading followed by the checkbox list.
- **`markdown`** fields → skip (these are instructions, not issue content).
- **`input`** fields → `## {label}` heading followed by the value.

Fields with `required: true` must be filled — ask the user if you cannot infer.

## Creating the Issue

Use GitHub MCP tools if available (search for tools matching `mcp__github`).
Otherwise fall back to the `gh` CLI:

```
gh issue create --repo 0k-software/<repo> \
  --title "<title>" \
  --body "<body>" \
  --type "<Type>"
```

Where `--type` matches the template's `type` field value: `Pitch`, `Feature`,
`Task`, `Bug`, or `Enhancement`.

## Important Rules

- **Never create a free-form issue.** Always use a template structure.
- **Never leave placeholder/prompt text** (like `_Why do we need this?_`) in
  the final body — replace with real content or ask the user.
- **Ask rather than guess** when information is insufficient for required
  fields.
- **Keep the title concise** — under 80 characters, no emoji prefix.
- After creating the issue, **show the user the issue URL**.

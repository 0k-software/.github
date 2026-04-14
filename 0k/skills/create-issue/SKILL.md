---
name: create-issue
description:
  Create a GitHub issue in an 0k-software org repo using the standardized issue
  templates (pitch, feature, task, bug, enhancement, kickoff).
argument-hint: <description of the issue>
---

# Create Issue from Template

You are helping the user create a GitHub issue in an **0k-software**
organization repository. All issues MUST use one of the organization's
standardized templates. Do NOT create free-form issues.

## Instructions

1. **Parse the user request from:** $ARGUMENTS
2. **Identify the target repo.** Derive it from the current working directory's
   git remote (look for an `0k-software/` remote). If the current directory is
   not an 0k-software repo, ask the user which repo to use.
3. **Determine the issue type** from the description. Read all template files
   in `${CLAUDE_SKILL_DIR}/templates/` — each file's `name` and `description`
   fields describe the issue type it covers. Match the user's intent to the
   best fitting template. If ambiguous, present the user with the options and
   ask them to pick.
4. **Read the chosen template file** to understand the exact fields and
   structure required for that issue type.
5. **Gather the required fields** for that template. Fill in every field you
   can infer from the user's description. For fields you cannot infer, ask the
   user — do NOT leave template placeholders or italic prompt text in the final
   issue.
6. **Create the issue** using the GitHub MCP tools (preferred) or `gh` CLI.
   - Use the `type` property from the chosen template file as the issue type.
   - Construct a clear, concise title (do NOT include emoji prefixes — GitHub
     adds the template icon automatically).
   - Build the markdown body by converting the template's form fields into
     markdown sections (see conversion rules below).
   - **Append the AI attribution footer** (see below).

## Converting Template Fields to Markdown

The template `.yml` files are GitHub Issue Form definitions. Convert them to a
markdown issue body as follows:

- **`textarea`** fields → `## {label}` heading followed by the content. The
  `value` in the template is placeholder/prompt text — replace it with real
  content, never include it verbatim.
- **`dropdown`** fields → `## {label}` heading followed by the selected value.
- **`checkboxes`** fields → `## {label}` heading followed by the checkbox list.
- **`markdown`** fields → skip (these are instructions, not issue content).
- **`input`** fields → `## {label}` heading followed by the value.

Fields with `required: true` must be filled — ask the user if you cannot infer.

## Creating the Issue

Use GitHub MCP tools if available (search for tools matching `mcp__github`).
Otherwise fall back to the `gh` CLI using the two-step process below.

**IMPORTANT: `gh issue create` does NOT have a `--type` flag. Never use
`--type`. Never use `--label` as a substitute for setting the issue type.
Follow the two-step process below exactly.**

### Step 1 — Create the issue

```
gh issue create --repo 0k-software/<repo> \
  --title "<title>" \
  --body "<body>"
```

Capture the issue URL from the output (e.g.,
`https://github.com/0k-software/<repo>/issues/123`).

### Step 2 — Set the issue type

Use the `type` field value from the chosen template's YAML frontmatter (e.g.,
`"Bug"`, `"Task"`, `"Feature"`) to find the matching issue type ID:

```
gh api graphql -f query='
  query {
    repository(owner: "0k-software", name: "<repo>") {
      issueTypes(first: 10) {
        nodes { id name }
      }
    }
  }
'
```

Get the newly created issue's node ID:

```
gh issue view <number> --repo 0k-software/<repo> --json id --jq .id
```

Set the issue type:

```
gh api graphql -f query='
  mutation {
    updateIssueIssueType(input: {
      issueId: "<issue_node_id>",
      issueTypeId: "<issue_type_id>"
    }) {
      issue { id }
    }
  }
'
```

## AI Attribution Footer

Always append the following line at the very end of the issue body, separated
by a blank line:

```
---
> Created with AI — descriptions may be inaccurate, please verify.
```

## Important Rules

- **Never create a free-form issue.** Always use a template structure.
- **Never leave placeholder/prompt text** (like `_Why do we need this?_`) in
  the final body — replace with real content or ask the user.
- **Ask rather than guess** when information is insufficient for required
  fields.
- **Keep the title concise** — under 80 characters, no emoji prefix.
- After creating the issue, **show the user the issue URL**.

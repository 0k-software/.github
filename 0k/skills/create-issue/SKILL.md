---
name: create-issue
description:
  Create a GitHub issue in an 0k-software org repo using the standardized issue
  templates (pitch, feature, task, bug, enhancement, kickoff).
argument-hint: { description of the issue }
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
5. **Populate fields** from the user's description (`$ARGUMENTS`):
   - The **title** is always sourced from `$ARGUMENTS` (verbatim or lightly
     cleaned for conciseness).
   - For all other fields, populate whichever ones best fit the context
     provided in `$ARGUMENTS` — no specific field is required to be filled.
   - For fields where `$ARGUMENTS` provides no useful information, **do not ask
     the user** — retain the template's default `value` placeholder text as a
     scaffold for a later `refine-issue` pass.
   - Do not invent content that wasn't provided or clearly implied by the user.
6. **Create the issue** using the `gh` CLI (see "Creating the Issue" below).
   - Use the `type` property from the chosen template file as the issue type.
   - Construct a clear, concise title (do NOT include emoji prefixes — GitHub
     adds the template icon automatically).
   - Build the markdown body by converting the template's form fields into
     markdown sections (see conversion rules below).
   - **Append the AI attribution footer** (see below).

## Converting Template Fields to Markdown

The template `.yml` files are GitHub Issue Form definitions. Convert them to a
markdown issue body as follows:

- **`textarea`** fields → `## {label}` heading followed by the content.
  - If content can be inferred from `$ARGUMENTS`, use it.
  - If no content is available, use the template `value` verbatim so it remains
    as a reference scaffold for a later `refine-issue` pass.
- **`dropdown`** fields → `## {label}` heading followed by the selected value.
- **`checkboxes`** fields → `## {label}` heading followed by the checkbox list.
- **`markdown`** fields → skip (these are instructions, not issue content).
- **`input`** fields → `## {label}` heading followed by the value.

## Creating the Issue

**IMPORTANT: `gh issue create` does NOT have a `--type` flag. Never use
`--type`. Never use `--label` as a substitute for setting the issue type.**

Use the GraphQL `createIssue` mutation to create the issue with its type set in
a single request.

### Step 1 — Look up repository and issue type IDs

Query the repository's node ID and available issue types. Use the `type` field
value from the chosen template's YAML frontmatter (e.g., `"Bug"`, `"Task"`,
`"Feature"`) to find the matching issue type ID:

```
gh api graphql -f query='
  query {
    repository(owner: "0k-software", name: "{repo}") {
      id
      issueTypes(first: 10) {
        nodes { id name }
      }
    }
  }
'
```

### Step 2 — Create the issue

```
gh api graphql -f query='
  mutation {
    createIssue(input: {
      repositoryId: "{repo_node_id}",
      title: "{title}",
      body: "{body}",
      issueTypeId: "{issue_type_id}"
    }) {
      issue { number url }
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
- **Fields not populated from `$ARGUMENTS`** retain the template's default
  `value` placeholder text — this is intentional, acting as a scaffold for a
  `refine-issue` pass. Do not clear them and do not ask the user to fill them
  during creation.
- **Keep the title concise** — under 50 characters, no emoji prefix.
- After creating the issue, **show the user the issue URL**.

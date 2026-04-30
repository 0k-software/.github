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
   in `references/templates/` — each file's `name` and `description` fields
   describe the issue type it covers. Match the user's intent to the best
   fitting template. If ambiguous, present the user with the options and ask
   them to pick.
4. **Read the chosen template file** to understand the exact fields and
   structure required for that issue type.
5. **Populate fields** from the user's description (`$ARGUMENTS`):
   - The **title** is always sourced from `$ARGUMENTS` (verbatim or lightly
     cleaned for conciseness).
   - For all other fields, populate whichever ones best fit the context
     provided in `$ARGUMENTS`.
   - For fields marked `validations.required: true`: try to infer a value; if
     you cannot, ask the user a concise follow-up before creating the issue.
   - For optional fields where `$ARGUMENTS` provides no useful information,
     **do not ask the user** — retain the template's default `value`
     placeholder text as a scaffold for a later `refine-issue` pass.
   - Do not invent content that wasn't provided or clearly implied by the user.
6. **Create the issue** using the GitHub GraphQL API (see "Creating the Issue"
   below).
   - Use the `type` property from the chosen template file as the issue type.
   - Construct a clear, concise title (do NOT include emoji prefixes — GitHub
     adds the template icon automatically).
   - Build the markdown body by converting the template's form fields into
     markdown sections (see conversion rules below).
   - **Append the AI attribution footer** (see below).

## Converting Template Fields to Markdown

The template `.yml` files are GitHub Issue Form definitions. Convert them to a
markdown issue body as follows:

For every field (except `markdown`):

- **If content can be inferred from `$ARGUMENTS`**: render `### {label}`
  followed by the inferred value. For `checkboxes`, check only the inferred
  items and leave the rest unchecked.
- **If no content is available**: render `### {label}` followed by the template
  `value` verbatim (fall back to `attributes.description` if absent) so it
  remains as a scaffold. For `dropdown`, list all options; for `checkboxes`,
  render all options unchecked.

**`markdown`** fields → skip (instructions only, not issue content).

## Creating the Issue

Use the GitHub GraphQL API with `curl`. Resolve the auth token first:

```bash
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-$(gh auth token 2>/dev/null || true)}}"
```

### Step 1 — Look up repository and issue type IDs

Query the repository's node ID and available issue types. Use the `type` field
value from the chosen template's YAML frontmatter (e.g., `"Bug"`, `"Task"`,
`"Feature"`) to find the matching issue type ID:

```bash
cat > /tmp/gh-query.json <<'EOF'
{
  "query": "query($owner:String!, $repo:String!) { repository(owner:$owner, name:$repo) { id issueTypes(first:10) { nodes { id name } } } }",
  "variables": {"owner": "0k-software", "repo": "{repo}"}
}
EOF
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/graphql \
  -d @/tmp/gh-query.json | jq '.data.repository'
```

### Step 2 — Create the issue

```bash
cat > /tmp/gh-query.json <<'EOF'
{
  "query": "mutation($repoId:ID!, $title:String!, $body:String!, $typeId:ID!) { createIssue(input: {repositoryId:$repoId, title:$title, body:$body, issueTypeId:$typeId}) { issue { number url } } }",
  "variables": {
    "repoId": "{repo_node_id}",
    "title": "{title}",
    "body": "{body}",
    "typeId": "{issue_type_id}"
  }
}
EOF
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/graphql \
  -d @/tmp/gh-query.json | jq '.data.createIssue.issue'
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

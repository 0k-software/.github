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
3. **Determine the issue type** from the description using the guide below.
   If ambiguous, present the user with the options and ask them to pick.
4. **Gather the required fields** for that template type. Fill in every field
   you can infer from the user's description. For fields you cannot infer,
   ask the user — do NOT leave template placeholders or italic prompt text
   in the final issue.
5. **Create the issue** using the GitHub MCP tools (preferred) or `gh` CLI.
   - Apply the correct issue type from the template (`type` field value).
   - Construct a clear, concise title (do NOT include emoji prefixes — GitHub
     adds the template icon automatically).
   - Build the markdown body following the exact section structure shown below
     for the chosen template.

## Template Types

Match the user's intent to one of these types:

| Type | When to use |
|------|-------------|
| **Pitch** | User wants to propose a new project or big idea |
| **Feature** | User wants a new feature, capability, or functionality |
| **Task** | User wants infra work, migrations, setup, config, or other concrete work with little product discussion |
| **Bug** | User is reporting something broken, unexpected behavior, or an error |
| **Enhancement** | User wants a refactor, DevX improvement, performance boost, or non-critical improvement |
| **Kickoff** | User wants to create a pre-flight checklist before starting a project |

## Template Structures

### Pitch (type: "Pitch")

Sections (use as `## Heading` in the body):

- **The Problem** (required) — The raw idea or problem to solve, not the
  solution. Why is it important? What pain does it solve?
- **The Appetite** (required) — Max time/effort: one of `1 week`, `2 weeks`,
  `3 weeks`, `4 weeks`, `5 weeks`. Present as a line like
  `**Appetite:** 2 weeks`
- **The Solution** — Core elements of the solution at a high level.
- **The Rabbit Holes** — Potential tricky parts that could consume time.
  Bulleted list.
- **The No-Gos** — What is explicitly excluded to prevent scope creep.
  Bulleted list.
- **The Delivery** — How will this ship? Complexity, migrations, rollout plan.
- **The Validation** — How to validate the solution worked. Metrics and
  observability.
- **The To-Dos** — Broken-down task checklist. Always starts with
  `- [ ] Kickoff the project`.

### Feature (type: "Feature")

Sections:

- **Motivation** — Why is this feature needed? What problem does it solve?
- **Proposal** — How it could work at a high level.
- **Alternatives** — Other solutions considered.
- **Impact** — Who benefits and how.
- **Pre-flight checklist** — Include this checklist verbatim, checking off
  items that apply based on context:
  ```
  - [ ] **Boundary & context** — belongs in an existing context, or a new one
        created following the _How to add a new Phoenix context_ steps in
        `CLAUDE.md`
  - [ ] **Database migration** — new tables/columns generated with
        `mix ecto.gen.migration` using `binary_id` keys
  - [ ] **Authentication** — correct router scope chosen
        (`:require_authenticated_user`, `:require_kingdom`, or public)
  - [ ] **Authorisation** — does this affect existing actions or introduce new
        ones? Who can perform them?
  - [ ] **Admin pages** — Backpex config updated in `/admin` with any new
        resources or fields added to existing resources
  - [ ] **Feature flag** — rolls out gradually behind a
        `KingdoneCore.FeatureFlags` flag enabled via `/dev/flags`; or noted in
        the PR description why a flag is not needed
  - [ ] **Background jobs** — deferred/retried work uses an Oban worker
  - [ ] **Tests** — LiveView integration tests with `PhoenixTest`; context
        unit tests; both flag states covered if feature-flagged
  - [ ] **IEx helpers** — `.iex.exs` updated for any new schemas
  - [ ] **CLAUDE.md** — new patterns or conventions documented
  ```

### Task (type: "Task")

Sections:

- **Summary** — What is the task to be completed?
- **Steps / Plan** — Broken-down checklist of what needs to be done.
- **Dependencies** — Other tasks/issues this depends on. Bulleted list.

### Bug (type: "Bug")

Sections:

- **Severity** (required) — One of:
  - `🔴 Critical (blocks work, crashes, data loss)`
  - `🟠 Major (big impact, but workaround exists)`
  - `🟡 Minor (annoyance, cosmetic issue)`
- **Summary** — What's happening that shouldn't?
- **Steps to Reproduce** — Numbered list of exact steps.
- **Actual Behavior** — What actually happens.
- **Expected Behavior** — What should happen instead.

### Enhancement (type: "Enhancement")

Sections:

- **Summary** — What improvement is being suggested?
- **Rationale** — Why is it worth doing? What pain does it reduce?
- **Approach** — How could this be achieved technically?
- **Scope / Impact** — Does this affect users, developers, performance, or
  maintainability?

### Kickoff (type: "Task")

Title should be: `Project Kickoff Checklist` (or similar).

Body should include the pre-flight checklist:

```
- [ ] 1. **Feature flag plan** - Will this ship behind a flag or toggle?
- [ ] 2. **Observability** - Logging, metrics, tracing defined?
- [ ] 3. **Testing** - Unit, integration, end-to-end test strategy decided?
- [ ] 4. **Rollout strategy** - Phased release, canary, or big-bang?
- [ ] 5. **Data migrations** - Any schema changes required? How will rollback in case necessary?
- [ ] 6. **Dependencies** - Any services, APIs, or teams to coordinate with?
- [ ] 7. **Security & permissions** - Are secrets, tokens, and access scopes reviewed?
- [ ] 8. **Documentation** - Does this need new or updated docs?
- [ ] 9. **Performance considerations** - Any known hotspots or load risks?
- [ ] 10. **Failure scenarios** - What happens if this goes wrong? Is there an alert or fallback?
- [ ] 11. **Tech debt** - Any refactors or cleanup bundled into this effort?
- [ ] 12. **UX/UI review** - Mockups, flows, or acceptance criteria validated?
- [ ] 13. **Localization / Accessibility** - Any requirements to cover?
- [ ] 14. **Compliance / Legal** - GDPR, data retention, or license implications?
- [ ] 15. **Validation** - Anything to make the validation possible/easier?
- [ ] 16. **Follow-up** - Anything post delivery needed from devs? Monitoring, things to revisit, future improvements?
```

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

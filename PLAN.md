# Plan: Add CI check to enforce issue hygiene

**Issue:** https://github.com/0k-software/.github/issues/97

## Summary

Build a composite GitHub Action (`issue-hygiene/`) that enforces issue-hygiene
rules across every repo in the `0k-software` org. A nightly cron job (in a
private companion repo) mints a GitHub App token and runs the action, which
evaluates 6 rules per open issue, applies auto-fixes where possible, posts
sticky comments listing violations/fixes, and toggles `clean`/`dirty` labels.

## Approach

JavaScript composite action (Node 20, TypeScript, `@octokit/graphql`,
`@vercel/ncc`), following the existing `hide-addressed-reviews/` pattern. Rules
are pure functions over fetched data; side-effects are batched in a separate
orchestration layer. Unit-tested with vitest. Cron caller lives in a new
private repo `0k-software/.github-private` to keep workflow logs private.

## Steps

- [ ] [Step 1: Scaffold `issue-hygiene/` action directory](#step-1-scaffold-issue-hygiene-action-directory)
- [ ] [Step 2: Implement `safeLog` and privacy-safe detail type](#step-2-implement-safelog-and-privacy-safe-detail-type)
- [ ] [Step 3: Implement GraphQL helpers with bounded retry](#step-3-implement-graphql-helpers-with-bounded-retry)
- [ ] [Step 4: Implement template parser](#step-4-implement-template-parser)
- [ ] [Step 5: Implement rules 1–6 as pure functions with unit tests](#step-5-implement-rules-16-as-pure-functions-with-unit-tests)
- [ ] [Step 6: Implement sticky-comment and label state machines with unit tests](#step-6-implement-sticky-comment-and-label-state-machines-with-unit-tests)
- [ ] [Step 7: Implement mutation orchestration and step-summary aggregation](#step-7-implement-mutation-orchestration-and-step-summary-aggregation)
- [ ] [Step 8: Build `dist/` with ncc and wire CI freshness check](#step-8-build-dist-with-ncc-and-wire-ci-freshness-check)
- [ ] [Step 9: Write docs — action README and update repo README](#step-9-write-docs--action-readme-and-update-repo-readme)
- [ ] [Step 10: One-off script to create `clean`/`dirty` labels org-wide](#step-10-one-off-script-to-create-cleandirty-labels-org-wide)
- [ ] [Step 11: Create `.github-private` repo and cron workflow](#step-11-create-github-private-repo-and-cron-workflow)
- [ ] [Step 12: Org-admin setup, smoke test, and tag `v1`](#step-12-org-admin-setup-smoke-test-and-tag-v1)

---

## Step 1: Scaffold `issue-hygiene/` action directory

Create the skeleton under `issue-hygiene/` (sibling to
`hide-addressed-reviews/`):

- `action.yml` — composite action metadata. Inputs: `token` (required). Steps:
  `uses: actions/setup-node@v4` with `node-version: '20'`, then
  `run: node ${{ github.action_path }}/dist/index.js`.
- `package.json` — dependencies: `@octokit/graphql`, `@actions/core`. Dev
  dependencies: `typescript`, `@vercel/ncc`, `vitest`, `@types/node`,
  `@typescript-eslint/eslint-plugin`, `eslint`. Scripts: `build`
  (`ncc build src/index.ts -o dist`), `test` (`vitest run`), `lint`
  (`eslint src`).
- `tsconfig.json` — `target: ES2020`, `module: NodeNext`,
  `moduleResolution: NodeNext`, `strict: true`, `outDir: dist`.
- `src/index.ts` — empty stub that just calls
  `core.info('issue-hygiene: starting')`.
- `.eslintrc.yml` — extends `@typescript-eslint/recommended`, adds
  `no-console: error` rule (enforces `safeLog` usage).
- `dist/index.js` — initial compiled output (run `npm run build` and commit).

The CI workflow (`check-skill-templates.yml` is already in place; add a new
`.github/workflows/issue-hygiene-ci.yml`) that on pull requests touching
`issue-hygiene/**`: installs deps, runs `npm run lint`, `npm test`,
`npm run build`, and then `git diff --exit-code dist/` to enforce `dist/`
freshness.

---

## Step 2: Implement `safeLog` and privacy-safe detail type

In `src/safe-log.ts`:

```ts
type IssueRef = { repo: string; number: number };
type LogEvent =
  | "rule:type-missing"
  | "rule:no-project"
  | "rule:multi-project"
  | "rule:heading-missing"
  | "rule:priority-missing"
  | "rule:no-assignee"
  | "auto-fix:heading-inserted"
  | "auto-fix:triage-added"
  | "auto-fix:triage-removed"
  | "action:comment-posted"
  | "action:comment-minimized"
  | "action:label-applied"
  | "warn:no-triage-project";

// Detail type structurally forbids strings (no issue content can leak)
type SafeDetail = Record<string, number | boolean | null>;

export function safeLog(
  ref: IssueRef,
  event: LogEvent,
  detail?: SafeDetail,
): void {
  core.info(
    `${ref.repo}#${ref.number} ${event}${detail ? " " + JSON.stringify(detail) : ""}`,
  );
}
```

Add the ESLint `no-console: error` rule to `.eslintrc.yml`. Add a unit test
verifying the type constraints compile and the output format.

---

## Step 3: Implement GraphQL helpers with bounded retry

In `src/graphql.ts`, implement:

**Bounded retry wrapper:**

```ts
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T>;
```

Backoffs: 1s, 2s, 4s. Retries on 429, secondary-rate-limit (status 403 +
`Retry-After` header), and 5xx. After exhaustion, re-throws (caller
soft-fails).

**`queryOrgProjects(octokit, org)`** — GraphQL query fetching all
`organization.projectsV2` nodes: `id`, `title`, `fields` (single-select options
for `Status` and `Priority`). Returns a `Map<string, OrgProject[]>` keyed by
repo name (parsed from Triage-project title regex
`^[^\s]+ \[(?<repo>[^\]]+)\] Triage$`). Also returns the raw project list for
the Roadmap tie-breaker.

**`queryRepoIssues(octokit, owner, repo)`** — paginated GraphQL fetching all
open issues (filter `__typename == 'Issue'`, `state == 'OPEN'`). Per issue:
`number`, `title` (never logged), `body`, `issueType { name }`,
`assignees { totalCount }`, `labels { nodes { name } }`,
`projectItems { nodes { project { id title }, fieldValues { … Status, Priority } } }`,
`comments(last: 100) { nodes { body, minimizedReason, viewerDidAuthor } }`.

Unit tests: retry logic (mock 429 → success on 3rd attempt; exhaustion throws),
project-map building from fixture data, Triage-title regex parsing.

---

## Step 4: Implement template parser

In `src/template-parser.ts`:

**`parseTemplates(octokit, owner, repo)`** — fetches the 6 YAML files from
`0k-software/.github/.github/ISSUE_TEMPLATE/` via the GitHub contents API (once
per run, cached). For each template, reads `name` (→ issue type name), and for
each field where `type ∈ {textarea, input, dropdown, checkboxes}`, extracts:

- `label` — the heading text to match in the issue body
- `defaultValue` — `attributes.value ?? attributes.description ?? ''`

Returns `Map<string, RequiredHeading[]>` keyed by type name.

**Heading match helper:** `hasHeading(body: string, label: string): boolean` —
returns true if the body contains a line matching `/^(##|###)\s+<label>\s*$/m`.
Accepts both `##` and `###` (Rule 2 accepts both levels).

Unit tests: parse fixture YAML files from `test/fixtures/`, verify heading
extraction and default-value fallback logic.

---

## Step 5: Implement rules 1–6 as pure functions with unit tests

In `src/rules.ts`, each rule is a pure function:

```ts
type RuleResult = { violations: string[]; autoFixes: AutoFix[] };
type AutoFix =
  | {
      kind: "remove-from-project";
      projectId: string;
      itemId: string;
      projectTitle: string;
    }
  | { kind: "add-to-project"; projectId: string; projectTitle: string }
  | {
      kind: "insert-headings";
      headings: { label: string; defaultValue: string }[];
    };
```

**`evaluateRule1(issue, triageProject)`** — project membership count.

- Non-Pitch: cap ≤ 1. Pitch: cap ≤ 2.
- Auto-fix: if cap exceeded AND one project is Triage → return
  `remove-from-project` fix.
- Flag-only fallback: if still over cap after potential Triage removal, return
  violation message.

**`resolvePrimaryProject(issue, orgProjects, repoName)`** — deterministic
tie-breaker. Pitches: Roadmap regex wins → repo-prefixed non-Triage
alphabetically → Triage → first alphabetically. Non-Pitches: repo-prefixed
non-Triage alphabetically → Triage → first alphabetically.

**`evaluateRule2(issue, primaryProject, templateHeadings)`** — heading
compliance. Applies when status ∈ `{Refining, Ready, Planning, Coding, Done}`
and issue has a type. Returns `insert-headings` auto-fix for each missing
heading.

**`evaluateRule3(issue)`** — type is set. Violation:
`"No issue type set. Pick one of: Pitch, Feature, Task, Bug, Enhancement."`

**`evaluateRule4(issue, triageProject)`** — project membership. Auto-fix:
`add-to-project` with Triage. If no Triage project found, flag-only.

**`evaluateRule5(issue, primaryProject)`** — priority set when status ∈
`{Ready, Planning, Coding, Done}`. Checks the project item's `Priority`
single-select field value ∈ `{p-low, p-medium, p-high}`.

**`evaluateRule6(issue, primaryProject)`** — assignee when status ∈
`{Planning, Coding, Done}`. Checks `assignees.totalCount >= 1`.

Unit tests: every rule function, every auto-fix path, the
`resolvePrimaryProject` tie-breaker (Pitch Roadmap wins, non-Pitch non-Triage
wins, Triage fallback), boundary conditions (no projects, null type, etc.).

---

## Step 6: Implement sticky-comment and label state machines with unit tests

In `src/comment-lifecycle.ts` and `src/label-lifecycle.ts`:

**Comment lifecycle (`computeCommentActions`):**

```ts
function computeCommentActions(
  hasViolations: boolean,
  hasAutoFixes: boolean,
  existingBotComments: BotComment[],
): CommentAction[];
```

Returns a list of actions: `minimize(id, 'OUTDATED' | 'RESOLVED')` and/or
`create(body)`. Implements the state-machine table from the spec:

- violations OR auto-fixes → minimize all visible as `OUTDATED`, post new
  comment
- neither, no bot comments → no-op
- neither, visible bot comments → minimize all as `RESOLVED`
- neither, all already minimized → no-op

Bot comments identified by `<!-- issue-hygiene-bot -->` marker in body.

**Comment body builder (`buildCommentBody`):** Assembles the markdown comment
with optional "Please fix:" and "Auto-fixed in this run:" sections, plus the
footer line.

**Label lifecycle (`computeLabelActions`):**

```ts
function computeLabelActions(
  hasViolations: boolean,
  currentLabels: string[],
): LabelAction[];
```

Returns `add('clean' | 'dirty')` and/or `remove('clean' | 'dirty')` actions.
`dirty` when any violations remain post-fix; `clean` otherwise (auto-fixes
alone do not cause `dirty`).

Unit tests: all four comment state-machine branches, comment body rendering
(both sections, one section, neither), label state transitions.

---

## Step 7: Implement mutation orchestration and step-summary aggregation

In `src/orchestrate.ts`, the main per-issue loop:

```ts
async function processIssue(
  octokit,
  issue,
  orgProjects,
  templateMap,
  repoTriageProject,
): Promise<IssueStats>;
```

Execution order per issue:

1. Evaluate Rule 1 → apply auto-fix mutations immediately (remove from Triage).
2. Resolve primary project from the now-reduced project set.
3. Evaluate Rules 2–6 using the resolved primary project.
4. Collect all auto-fix mutations (heading inserts, Triage add).
5. Apply mutations via GraphQL: `updateProjectV2ItemFieldValue`,
   `addProjectV2ItemById`, `removeProjectV2ItemFromProject`, `updateIssue`
   (body patch for headings).
6. Compute `hasViolations`, `hasAutoFixes`.
7. Apply comment actions (minimize then create).
8. Apply label actions (remove wrong label, add correct label).
9. Log each action via `safeLog`.
10. Return `IssueStats` for aggregation.

**Error handling:** Each mutation is wrapped in try/catch. On error: `safeLog`
with event, mark `softFailed = true`, continue to next issue. The `withRetry`
wrapper is used for all API calls.

**Step summary (`src/summary.ts`):** After all repos/issues processed, call
`core.summary.addTable([...])` with aggregate counts: issues checked,
violations found, auto-fixes applied, comments posted, labels toggled, soft
failures. No issue content in the summary.

In `src/index.ts`, wire the full flow: mint no extra token (token passed as
input), call `queryOrgProjects`, iterate repos and issues, call `processIssue`,
write summary. Exit with error if any soft failures occurred.

---

## Step 8: Build `dist/` with ncc and wire CI freshness check

- Run `npm run build` in `issue-hygiene/` to produce `dist/index.js`.
- Commit `dist/index.js` alongside the source.
- The CI workflow (from Step 1) already runs `git diff --exit-code dist/` after
  `npm run build` to enforce freshness. Verify this catches a deliberate diff.

---

## Step 9: Write docs — action README and update repo README

**`issue-hygiene/README.md`:** Document:

- What it does (one paragraph)
- Inputs (`token`)
- Org-admin prerequisites: GitHub App creation, permission set
  (`Organization projects: R/W`, `Issues: R/W`, `Metadata: R`), secrets
  `ISSUE_HYGIENE_APP_ID` + `ISSUE_HYGIENE_APP_PRIVATE_KEY` stored at org level
- Triage-project naming convention: `❤️‍🩹 [<repo>] Triage`
- Roadmap-project naming convention: `🗺️ [<repo>] Roadmap` (for Pitch
  tie-breaker)
- `clean`/`dirty` label prerequisite (point to label-creation script)
- Fallback note: switch to twice-daily cron if 24h lag on Rule 4 becomes
  annoying

**Update `README.md`** (repo root): add `issue-hygiene` row to the Composite
Actions table with description "Enforces issue-hygiene rules org-wide (type,
project, headings, priority, assignee)."

---

## Step 10: One-off script to create `clean`/`dirty` labels org-wide

Create `bin/create-hygiene-labels` (executable shell script or Node script,
matching style of existing `bin/` scripts if any):

- Accepts a GitHub token via `GITHUB_TOKEN` env var.
- Lists all repos in the `0k-software` org.
- For each repo (including `.github`): idempotently creates `clean` label
  (color `#0e8a16`, green) and `dirty` label (color `#e4e669`, yellow) if they
  don't exist; skips if already present (idempotent).
- Prints a summary line per repo.

Document usage in `issue-hygiene/README.md` under "Label prerequisites."

---

## Step 11: Create `.github-private` repo and cron workflow

This step is documented as a manual action (org-admin) but the workflow file
content is committed here so it's reviewable:

Create `bin/github-private-workflow.yml` as the canonical source for the cron
workflow to be committed in `0k-software/.github-private`:

```yaml
name: Issue Hygiene
on:
  schedule:
    - cron: "0 6 * * *"
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/create-github-app-token@v1
        id: token
        with:
          app-id: ${{ secrets.ISSUE_HYGIENE_APP_ID }}
          private-key: ${{ secrets.ISSUE_HYGIENE_APP_PRIVATE_KEY }}
          owner: 0k-software
      - uses: 0k-software/.github/issue-hygiene@v1
        with:
          token: ${{ steps.token.outputs.token }}
```

Document in `issue-hygiene/README.md`: how to create `.github-private`, where
to commit this file, and how to trigger `workflow_dispatch` for the smoke test.

---

## Step 12: Org-admin setup, smoke test, and tag `v1`

Manual steps documented in `issue-hygiene/README.md` (no code changes):

1. Org-admin creates `Issue Hygiene Bot` GitHub App with permissions
   `Organization projects: R/W`, `Issues: R/W`, `Metadata: R`. Installs on org.
   Stores `ISSUE_HYGIENE_APP_ID` + `ISSUE_HYGIENE_APP_PRIVATE_KEY` as org
   secrets.
2. Org-admin creates `0k-software/.github-private` private repo, commits
   `bin/github-private-workflow.yml` as `.github/workflows/issue-hygiene.yml`.
3. Trigger `workflow_dispatch`; review step summary and 2–3 resulting sticky
   comments.
4. Tag `v1` on `0k-software/.github`; update cron caller's `uses:` reference
   from `@<sha>` to `@v1`.

These steps are prerequisites gated on the GitHub App existing, so they are
documented rather than automated.

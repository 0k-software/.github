# Plan: Add CI check to enforce issue hygiene

**Issue:** https://github.com/0k-software/.github/issues/114

## Summary

Build a composite GitHub Action (`issue-hygiene/`) that enforces issue-hygiene
rules across every repo in the `0k-software` org. A nightly cron job (in a
private companion repo) mints a GitHub App token and runs the action, which
evaluates 6 rules per open issue, applies auto-fixes where possible, posts
sticky comments listing violations/fixes, and toggles `clean`/`dirty` labels.

This first PR implements **Rule 1 end-to-end**: project membership count with
Triage auto-remove. It establishes the shared infrastructure (scaffold,
logging, GraphQL helpers, comment/label state machines) that subsequent rules
build on.

## Approach

JavaScript composite action (Node 20, TypeScript, `@octokit/graphql`,
`@vercel/ncc`), following the existing `hide-addressed-reviews/` pattern. Rules
are pure functions over fetched data; side-effects are batched in a separate
orchestration layer. Unit-tested with vitest. Cron caller lives in a new
private repo `0k-software/.github-private` to keep workflow logs private.

## Steps

- [ ] [Step 1: Scaffold `issue-hygiene/` action directory](#step-1-scaffold-issue-hygiene-action-directory)
- [ ] [Step 2: Implement `safeLog` and privacy-safe detail type](#step-2-implement-safelog-and-privacy-safe-detail-type)
- [ ] [Step 3: Implement GraphQL org-project discovery with bounded retry](#step-3-implement-graphql-org-project-discovery-with-bounded-retry)
- [ ] [Step 4: Implement Rule 1 and primary-project tie-breaker as pure functions with unit tests](#step-4-implement-rule-1-and-primary-project-tie-breaker-as-pure-functions-with-unit-tests)
- [ ] [Step 5: Implement sticky-comment and label state machines with unit tests](#step-5-implement-sticky-comment-and-label-state-machines-with-unit-tests)
- [ ] [Step 6: Wire Rule 1 into orchestration, build `dist/`, and verify CI freshness check](#step-6-wire-rule-1-into-orchestration-build-dist-and-verify-ci-freshness-check)

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
- `README.md` — action summary, inputs, prerequisites (GitHub App, labels),
  Triage/Roadmap project naming conventions.

Rename `.github/workflows/check-skill-templates.yml` → `check.yml`; rename the
job to `Check`. Add an issue-hygiene step within the same job: install deps,
`npm run lint`, `npm test`, `npm run build`, `git diff --exit-code dist/`. Use
a `paths` filter on that step's condition so it only runs when
`issue-hygiene/**` changes. Consolidating both checks in one job shares the
runner startup cost and avoids paying for two separate per-minute billing
slots.

---

## Step 2: Implement `safeLog` and privacy-safe detail type

In `src/safe-log.ts`:

```ts
type IssueRef = { repo: string; number: number };
type LogEvent =
  | "check:type-missing"
  | "check:no-project"
  | "check:multi-project"
  | "check:heading-missing"
  | "check:priority-missing"
  | "check:no-assignee"
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

Update `README.md`: document the privacy-safe logging approach (`safeLog`,
`SafeDetail` type constraints).

---

## Step 3: Implement GraphQL org-project discovery with bounded retry

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

**`queryRepoIssues(octokit, owner, repo)`** — minimal fields for Rule 1 only:
`number`, `issueType { name }`,
`projectItems { nodes { id, project { id, title } } }`,
`labels { nodes { name } }`,
`comments(last: 100) { nodes { body, minimizedReason } }`. No `body`, no
`fieldValues` (those are added by Rule 2 in the follow-up PR).

Unit tests: retry logic (mock 429 → success on 3rd attempt; exhaustion throws),
project-map building from fixture data, Triage-title regex parsing,
`queryRepoIssues` field mapping from fixture response.

Update `README.md`: document the GraphQL data model and retry policy.

---

## Step 4: Implement Rule 1 and primary-project tie-breaker as pure functions with unit tests

In `src/rules.ts`:

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

**`checkProjectMembership(issue, triageProject)`** — project membership count.

- Non-Pitch: cap ≤ 1. Pitch: cap ≤ 2.
- Auto-fix: if cap exceeded AND one project is Triage → return
  `remove-from-project` fix.
- Flag-only fallback: if still over cap after potential Triage removal, return
  violation message:
  `"This issue is in multiple projects: _A_, _B_. Remove it from all but one (Pitches may be in up to two projects)."`

**`resolvePrimaryProject(issue, orgProjects, repoName)`** — deterministic
tie-breaker after Rule 1 has run. Pitches: Roadmap regex
(`^[^\s]+ \[<repo>\] Roadmap$`) wins → repo-prefixed non-Triage alphabetically
→ Triage → first alphabetically. Non-Pitches: repo-prefixed non-Triage
alphabetically → Triage → first alphabetically.

Unit tests: Rule 1 cap (non-Pitch, Pitch), auto-fix path (Triage present),
flag-only fallback (non-Triage × non-Triage), `resolvePrimaryProject`
tie-breaker (Pitch Roadmap wins, non-Pitch non-Triage wins, Triage fallback,
no-projects case).

Update `README.md`: document Rule 1 semantics (project-count caps, Triage
auto-remove, primary-project tie-breaker).

---

## Step 5: Implement sticky-comment and label state machines with unit tests

In `src/comment-lifecycle.ts` and `src/label-lifecycle.ts`:

**Comment lifecycle (`computeCommentActions`):**

```ts
function computeCommentActions(
  hasViolations: boolean,
  hasAutoFixes: boolean,
  existingBotComments: BotComment[],
): CommentAction[];
```

Returns `minimize(id, 'OUTDATED' | 'RESOLVED')` and/or `create(body)`.
State-machine table:

- violations OR auto-fixes → minimize all visible as `OUTDATED`, post new
  comment
- neither, no bot comments → no-op
- neither, visible bot comments → minimize all as `RESOLVED`
- neither, all already minimized → no-op

Bot comments identified by `<!-- issue-hygiene-bot -->` marker in body.

**`buildCommentBody(violations, autoFixDescriptions)`** — assembles the
markdown comment with optional "Please fix:" and "Auto-fixed in this run:"
sections plus footer.

**Label lifecycle (`computeLabelActions`):**

```ts
function computeLabelActions(
  hasViolations: boolean,
  currentLabels: string[],
): LabelAction[];
```

Returns `add('clean' | 'dirty')` and/or `remove('clean' | 'dirty')` actions.
`dirty` when violations remain post-fix; `clean` otherwise (auto-fixes alone do
not cause `dirty`).

Unit tests: all four comment state-machine branches, comment body rendering
(both sections, one section, neither), label state transitions (clean→dirty,
dirty→clean, no-op).

Update `README.md`: document sticky-comment lifecycle and `clean`/`dirty` label
behaviour.

---

## Step 6: Wire Rule 1 into orchestration, build `dist/`, and verify CI freshness check

**`src/orchestrate.ts` — per-issue loop (Rule 1 only):**

```ts
async function processIssue(
  octokit,
  issue,
  orgProjects,
  repoTriageProject,
): Promise<IssueStats>;
```

Execution order:

1. Evaluate Rule 1 → apply `remove-from-project` mutation immediately if
   auto-fix triggered (`removeProjectV2ItemFromProject`).
2. Resolve primary project from the now-reduced project set.
3. Collect remaining Rule 1 violations (flag-only cases).
4. Compute `hasViolations`, `hasAutoFixes`.
5. Apply comment actions (minimize then create via `minimizeComment` /
   `addComment`).
6. Apply label actions (`addLabelsToLabelable` / `removeLabelsFromLabelable`).
7. Log each action via `safeLog`.
8. Return `IssueStats`.

Each mutation wrapped in try/catch; on error `safeLog` + `softFailed = true` +
continue.

**`src/index.ts`** — wire the full flow: accept `token` input, init octokit,
call `queryOrgProjects`, enumerate org repos, call `processIssue` per issue,
write step summary (aggregate counts only via `core.summary`), exit non-zero if
any soft failures.

**Build and CI:**

- Run `npm run build` to produce `dist/index.js`; commit alongside source.
- Confirm the CI workflow from Step 1 catches a deliberate `dist/` drift
  (manually introduce a diff, verify the check fails, revert).

Update `README.md`: document the full orchestration flow and the six-step
per-issue execution order.

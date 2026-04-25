import type { OrgProject, RepoIssue } from "./graphql.js";

export type AutoFix =
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

export type RuleResult = { violations: string[]; autoFixes: AutoFix[] };

const PITCH_TYPE = "Pitch";
const TRIAGE_RE = /\] Triage$/;

function isTriage(title: string): boolean {
  return TRIAGE_RE.test(title);
}

export function checkProjectMembership(
  issue: RepoIssue,
  triageProject: OrgProject | null,
): RuleResult {
  const isPitch = issue.issueType?.name === PITCH_TYPE;
  const cap = isPitch ? 2 : 1;
  const items = issue.projectItems.nodes;

  if (items.length <= cap) {
    return { violations: [], autoFixes: [] };
  }

  // Over cap — try auto-fix via Triage removal
  if (triageProject != null) {
    const triageItem = items.find((i) => i.project.id === triageProject.id);
    if (triageItem != null) {
      const fix: AutoFix = {
        kind: "remove-from-project",
        projectId: triageProject.id,
        itemId: triageItem.id,
        projectTitle: triageProject.title,
      };
      // After removing Triage the count drops by 1; re-check
      if (items.length - 1 <= cap) {
        return { violations: [], autoFixes: [fix] };
      }
      // Still over cap even after removing Triage — fix + flag
      const remaining = items
        .filter((i) => i.project.id !== triageProject.id)
        .map((i) => i.project.title);
      return {
        violations: [buildMultiProjectViolation(remaining, isPitch)],
        autoFixes: [fix],
      };
    }
  }

  // No auto-fix available — flag only
  const titles = items.map((i) => i.project.title);
  return {
    violations: [buildMultiProjectViolation(titles, isPitch)],
    autoFixes: [],
  };
}

function buildMultiProjectViolation(titles: string[], isPitch: boolean): string {
  const list = titles.map((t) => `_${t}_`).join(", ");
  return (
    `This issue is in multiple projects: ${list}. ` +
    `Remove it from all but one` +
    (isPitch ? ` (Pitches may be in up to two projects).` : `.`)
  );
}

const ROADMAP_RE = (repo: string) =>
  new RegExp(`^[^\\s]+ \\[${escapeRegex(repo)}\\] Roadmap$`);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function repoPrefix(title: string, repo: string): boolean {
  return title.includes(`[${repo}]`) && !isTriage(title);
}

export function resolvePrimaryProject(
  issue: RepoIssue,
  allProjects: OrgProject[],
  repoName: string,
): OrgProject | null {
  const projectIds = new Set(issue.projectItems.nodes.map((i) => i.project.id));
  const issueProjects = allProjects.filter((p) => projectIds.has(p.id));

  if (issueProjects.length === 0) return null;
  if (issueProjects.length === 1) return issueProjects[0];

  const isPitch = issue.issueType?.name === PITCH_TYPE;

  if (isPitch) {
    const roadmapRe = ROADMAP_RE(repoName);
    const roadmap = issueProjects.find((p) => roadmapRe.test(p.title));
    if (roadmap) return roadmap;
  }

  // Repo-prefixed non-Triage, alphabetically first
  const repoPrefixed = issueProjects
    .filter((p) => repoPrefix(p.title, repoName))
    .sort((a, b) => a.title.localeCompare(b.title));
  if (repoPrefixed.length > 0) return repoPrefixed[0];

  // Triage
  const triage = issueProjects.find((p) => isTriage(p.title));
  if (triage) return triage;

  // First alphabetically
  return issueProjects.sort((a, b) => a.title.localeCompare(b.title))[0];
}

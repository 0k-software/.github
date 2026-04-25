import { describe, it, expect } from "vitest";
import { checkProjectMembership, resolvePrimaryProject } from "../rules.js";
import type { OrgProject, RepoIssue } from "../graphql.js";

const makeIssue = (
  overrides: Partial<RepoIssue> & { projectTitles?: string[] },
): RepoIssue => {
  const { projectTitles = [], ...rest } = overrides;
  return {
    number: 1,
    issueType: null,
    projectItems: {
      nodes: projectTitles.map((title, i) => ({
        id: `item${i}`,
        project: { id: `proj${i}`, title },
      })),
    },
    labels: { nodes: [] },
    comments: { nodes: [] },
    ...rest,
  };
};

const triageProject: OrgProject = {
  id: "proj0",
  title: "0k [my-repo] Triage",
};

// --- checkProjectMembership ---

describe("checkProjectMembership", () => {
  it("no violation when non-Pitch has 1 project", () => {
    const issue = makeIssue({ projectTitles: ["0k [my-repo] Roadmap"] });
    const result = checkProjectMembership(issue, triageProject);
    expect(result.violations).toHaveLength(0);
    expect(result.autoFixes).toHaveLength(0);
  });

  it("no violation when Pitch has 2 projects", () => {
    const issue = makeIssue({
      issueType: { name: "Pitch" },
      projectTitles: ["0k [my-repo] Triage", "0k [my-repo] Roadmap"],
    });
    const result = checkProjectMembership(issue, triageProject);
    expect(result.violations).toHaveLength(0);
    expect(result.autoFixes).toHaveLength(0);
  });

  it("auto-fix: removes Triage when non-Pitch is in 2 projects and one is Triage", () => {
    const issue = makeIssue({
      projectTitles: ["0k [my-repo] Triage", "0k [my-repo] Roadmap"],
    });
    const result = checkProjectMembership(issue, triageProject);
    expect(result.violations).toHaveLength(0);
    expect(result.autoFixes).toHaveLength(1);
    expect(result.autoFixes[0].kind).toBe("remove-from-project");
    if (result.autoFixes[0].kind === "remove-from-project") {
      expect(result.autoFixes[0].projectId).toBe("proj0");
      expect(result.autoFixes[0].projectTitle).toContain("Triage");
    }
  });

  it("flag-only: violation when non-Pitch is in 2 non-Triage projects", () => {
    const issue = makeIssue({
      projectTitles: ["0k [my-repo] Roadmap", "Some Other Board"],
    });
    const result = checkProjectMembership(issue, null);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("multiple projects");
    expect(result.autoFixes).toHaveLength(0);
  });

  it("flag-only: violation message does not mention Pitch cap for non-Pitch", () => {
    const issue = makeIssue({
      projectTitles: ["Board A", "Board B"],
    });
    const result = checkProjectMembership(issue, null);
    expect(result.violations[0]).not.toContain("Pitches");
  });

  it("flag-only: violation message mentions Pitch cap for Pitch type", () => {
    const issue = makeIssue({
      issueType: { name: "Pitch" },
      projectTitles: ["Board A", "Board B", "Board C"],
    });
    const result = checkProjectMembership(issue, null);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("Pitches");
  });
});

// --- resolvePrimaryProject ---

const p = (id: string, title: string): OrgProject => ({ id, title });

describe("resolvePrimaryProject", () => {
  it("returns null when issue has no projects", () => {
    const issue = makeIssue({});
    expect(resolvePrimaryProject(issue, [], "my-repo")).toBeNull();
  });

  it("returns the single project when only one", () => {
    const proj = p("p1", "0k [my-repo] Roadmap");
    const issue = makeIssue({ projectTitles: ["0k [my-repo] Roadmap"] });
    // Patch ids to match
    issue.projectItems.nodes[0].project.id = "p1";
    expect(resolvePrimaryProject(issue, [proj], "my-repo")).toEqual(proj);
  });

  it("Pitch: Roadmap wins over repo-prefixed non-Triage", () => {
    const roadmap = p("p1", "0k [my-repo] Roadmap");
    const triage = p("p2", "0k [my-repo] Triage");
    const issue = makeIssue({
      issueType: { name: "Pitch" },
      projectTitles: ["0k [my-repo] Triage", "0k [my-repo] Roadmap"],
    });
    issue.projectItems.nodes[0].project.id = "p2";
    issue.projectItems.nodes[1].project.id = "p1";
    expect(resolvePrimaryProject(issue, [roadmap, triage], "my-repo")).toEqual(
      roadmap,
    );
  });

  it("non-Pitch: repo-prefixed non-Triage wins over Triage", () => {
    const roadmap = p("p1", "0k [my-repo] Roadmap");
    const triage = p("p2", "0k [my-repo] Triage");
    const issue = makeIssue({
      projectTitles: ["0k [my-repo] Triage", "0k [my-repo] Roadmap"],
    });
    issue.projectItems.nodes[0].project.id = "p2";
    issue.projectItems.nodes[1].project.id = "p1";
    expect(resolvePrimaryProject(issue, [roadmap, triage], "my-repo")).toEqual(
      roadmap,
    );
  });

  it("Triage fallback when no repo-prefixed non-Triage exists", () => {
    const triage = p("p2", "0k [my-repo] Triage");
    const other = p("p3", "Unrelated Board");
    const issue = makeIssue({
      projectTitles: ["0k [my-repo] Triage", "Unrelated Board"],
    });
    issue.projectItems.nodes[0].project.id = "p2";
    issue.projectItems.nodes[1].project.id = "p3";
    expect(
      resolvePrimaryProject(issue, [triage, other], "my-repo"),
    ).toEqual(triage);
  });

  it("first alphabetically when no repo-prefixed or Triage", () => {
    const b = p("p1", "Beta Board");
    const a = p("p2", "Alpha Board");
    const issue = makeIssue({ projectTitles: ["Beta Board", "Alpha Board"] });
    issue.projectItems.nodes[0].project.id = "p1";
    issue.projectItems.nodes[1].project.id = "p2";
    expect(resolvePrimaryProject(issue, [b, a], "my-repo")).toEqual(a);
  });
});

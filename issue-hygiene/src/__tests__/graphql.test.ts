import { describe, it, expect, vi } from "vitest";
import { withRetry, queryOrgProjects, queryRepoIssues } from "../graphql.js";

// --- withRetry ---

describe("withRetry", () => {
  it("returns immediately on success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds on 3rd attempt", async () => {
    const err429 = Object.assign(new Error("rate limited"), { status: 429 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err429)
      .mockRejectedValueOnce(err429)
      .mockResolvedValue("done");
    vi.useFakeTimers();
    const p = withRetry(fn, 3);
    await vi.runAllTimersAsync();
    await expect(p).resolves.toBe("done");
    expect(fn).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("throws after exhausting all attempts", async () => {
    const err = Object.assign(new Error("server error"), { status: 503 });
    const fn = vi.fn().mockRejectedValue(err);
    vi.useFakeTimers();
    const p = withRetry(fn, 3);
    // Attach rejection handler before advancing timers to prevent unhandled rejection
    const assertion = expect(p).rejects.toThrow("server error");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("does not retry on non-retryable errors", async () => {
    const err = Object.assign(new Error("not found"), { status: 404 });
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn)).rejects.toThrow("not found");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 403 with Retry-After header", async () => {
    const err = Object.assign(new Error("secondary rate"), {
      status: 403,
      response: { headers: { "retry-after": "1" } },
    });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValue("ok");
    vi.useFakeTimers();
    const p = withRetry(fn, 3);
    await vi.runAllTimersAsync();
    await expect(p).resolves.toBe("ok");
    vi.useRealTimers();
  });
});

// --- queryOrgProjects ---

const makeClient = (result: unknown) => ({
  graphql: vi.fn().mockResolvedValue(result),
});

describe("queryOrgProjects", () => {
  it("builds projectsByRepo map from Triage-titled projects", async () => {
    const client = makeClient({
      organization: {
        projectsV2: {
          nodes: [
            { id: "p1", title: "0k [my-repo] Triage" },
            { id: "p2", title: "0k [my-repo] Roadmap" },
            { id: "p3", title: "0k [other-repo] Triage" },
            { id: "p4", title: "Unrelated Board" },
          ],
        },
      },
    });
    const { projectsByRepo, allProjects } = await queryOrgProjects(
      client,
      "0k-software",
    );
    expect(projectsByRepo.get("my-repo")).toEqual([{ id: "p1", title: "0k [my-repo] Triage" }]);
    expect(projectsByRepo.get("other-repo")).toEqual([{ id: "p3", title: "0k [other-repo] Triage" }]);
    expect(projectsByRepo.has("Unrelated Board")).toBe(false);
    expect(allProjects).toHaveLength(4);
  });

  it("parses Triage title regex correctly", async () => {
    const cases = [
      { title: "0k [repo-name] Triage", repo: "repo-name" },
      { title: "prefix [repo.with.dots] Triage", repo: "repo.with.dots" },
    ];
    for (const { title, repo } of cases) {
      const client = makeClient({
        organization: { projectsV2: { nodes: [{ id: "x", title }] } },
      });
      const { projectsByRepo } = await queryOrgProjects(client, "org");
      expect(projectsByRepo.has(repo)).toBe(true);
    }
  });

  it("does not match non-Triage projects in projectsByRepo", async () => {
    const client = makeClient({
      organization: {
        projectsV2: {
          nodes: [{ id: "r1", title: "0k [repo] Roadmap" }],
        },
      },
    });
    const { projectsByRepo } = await queryOrgProjects(client, "org");
    expect(projectsByRepo.size).toBe(0);
  });
});

// --- queryRepoIssues ---

describe("queryRepoIssues", () => {
  it("returns mapped issue fields from fixture response", async () => {
    const fixture = {
      repository: {
        issues: {
          nodes: [
            {
              number: 5,
              issueType: { name: "Feature" },
              projectItems: {
                nodes: [{ id: "item1", project: { id: "proj1", title: "0k [repo] Triage" } }],
              },
              labels: { nodes: [{ name: "clean" }] },
              comments: {
                nodes: [
                  { body: "<!-- issue-hygiene-bot -->", minimizedReason: null },
                ],
              },
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    };
    const client = makeClient(fixture);
    const issues = await queryRepoIssues(client, "0k-software", "my-repo");
    expect(issues).toHaveLength(1);
    const issue = issues[0];
    expect(issue.number).toBe(5);
    expect(issue.issueType?.name).toBe("Feature");
    expect(issue.projectItems.nodes[0].id).toBe("item1");
    expect(issue.labels.nodes[0].name).toBe("clean");
    expect(issue.comments.nodes[0].body).toBe("<!-- issue-hygiene-bot -->");
  });
});

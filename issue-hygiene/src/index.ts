import * as core from "@actions/core";
import { graphql as graphqlFn } from "@octokit/graphql";
import { queryOrgProjects, queryRepoIssues } from "./graphql.js";
import type { GraphqlClient } from "./graphql.js";
import { processIssue } from "./orchestrate.js";

async function run(): Promise<void> {
  core.info("issue-hygiene: starting");

  const token = core.getInput("token", { required: true });
  const client: GraphqlClient = {
    graphql: graphqlFn.defaults({
      headers: { authorization: `token ${token}` },
    }) as GraphqlClient["graphql"],
  };

  const org = "0k-software";
  const { projectsByRepo, allProjects } = await queryOrgProjects(client, org);

  const repos = Array.from(projectsByRepo.keys());
  if (repos.length === 0) {
    core.warning("No Triage projects found — nothing to process.");
    return;
  }

  let totalViolations = 0;
  let totalAutoFixes = 0;
  let totalSoftFailed = 0;
  let totalIssues = 0;

  for (const repo of repos) {
    const triageProjects = projectsByRepo.get(repo) ?? [];
    const triageProject = triageProjects[0] ?? null;

    let issues: Awaited<ReturnType<typeof queryRepoIssues>>;
    try {
      issues = await queryRepoIssues(client, org, repo);
    } catch (err) {
      core.warning(`Failed to fetch issues for ${repo}: ${String(err)}`);
      totalSoftFailed++;
      continue;
    }

    for (const issue of issues) {
      const stats = await processIssue(
        client,
        repo,
        issue,
        allProjects,
        triageProject,
      );
      totalViolations += stats.violations;
      totalAutoFixes += stats.autoFixes;
      if (stats.softFailed) totalSoftFailed++;
      totalIssues++;
    }
  }

  await core.summary
    .addHeading("Issue Hygiene Summary")
    .addTable([
      [
        { data: "Metric", header: true },
        { data: "Count", header: true },
      ],
      ["Issues processed", String(totalIssues)],
      ["Violations found", String(totalViolations)],
      ["Auto-fixes applied", String(totalAutoFixes)],
      ["Soft failures", String(totalSoftFailed)],
    ])
    .write();

  if (totalSoftFailed > 0) {
    core.setFailed(`${totalSoftFailed} soft failure(s) — check warnings above.`);
  }
}

run().catch((err: unknown) => {
  core.setFailed(String(err));
});

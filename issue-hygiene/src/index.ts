import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { graphql as graphqlFn } from "@octokit/graphql";
import { queryOrgProjects, queryRepoIssues, queryRepoLabels } from "./graphql.js";
import type { GraphqlClient } from "./graphql.js";
import { processIssue } from "./orchestrate.js";

async function run(): Promise<void> {
  core.info("issue-hygiene: starting");

  const runStartedAt = new Date().toISOString();
  const token = core.getInput("token", { required: true });
  const client: GraphqlClient = {
    graphql: graphqlFn.defaults({
      headers: { authorization: `token ${token}` },
    }) as GraphqlClient["graphql"],
  };

  const org = "0k-software";
  const runId = process.env["GITHUB_RUN_ID"] ?? Date.now().toString();
  const cacheDir = process.env["RUNNER_TEMP"] ?? os.tmpdir();
  const cachePath = path.join(cacheDir, "issue-hygiene-last-run.json");
  const cacheKey = `issue-hygiene-${org}-${runId}`;
  const cacheRestoreKey = `issue-hygiene-${org}-`;

  let lastRunAt: string | undefined;
  try {
    const hit = await cache.restoreCache([cachePath], cacheKey, [cacheRestoreKey]);
    if (hit) {
      const data = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as { lastRunAt?: string };
      lastRunAt = data.lastRunAt;
      core.info(`Cache restored: skipping issues not updated since ${lastRunAt}`);
    }
  } catch (err) {
    core.warning(`Failed to restore cache: ${String(err)}`);
  }

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
    let labelIds: Map<string, string>;
    try {
      [issues, labelIds] = await Promise.all([
        queryRepoIssues(client, org, repo, lastRunAt),
        queryRepoLabels(client, org, repo),
      ]);
    } catch (err) {
      core.warning(`Failed to fetch data for ${repo}: ${String(err)}`);
      totalSoftFailed++;
      continue;
    }

    for (const issue of issues) {
      const stats = await processIssue(
        client,
        org,
        repo,
        issue,
        allProjects,
        triageProject,
        labelIds,
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

  try {
    fs.writeFileSync(cachePath, JSON.stringify({ lastRunAt: runStartedAt }));
    await cache.saveCache([cachePath], cacheKey);
  } catch (err) {
    core.warning(`Failed to save cache: ${String(err)}`);
  }

  if (totalSoftFailed > 0) {
    core.setFailed(`${totalSoftFailed} soft failure(s) — check warnings above.`);
  }
}

run().catch((err: unknown) => {
  core.setFailed(String(err));
});

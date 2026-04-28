import * as core from "@actions/core";
import type { OrgProject, RepoIssue, GraphqlClient } from "./graphql.js";
import { checkProjectMembership, resolvePrimaryProject } from "./rules.js";
import {
  computeCommentActions,
  buildCommentBody,
  BOT_MARKER,
} from "./comment-lifecycle.js";
import { computeLabelActions } from "./label-lifecycle.js";
import { safeLog, issueUrl } from "./safe-log.js";
import type { IssueRef } from "./safe-log.js";

export type IssueStats = {
  repo: string;
  number: number;
  violations: number;
  autoFixes: number;
  softFailed: boolean;
  primaryProject: OrgProject | null;
};

export async function processIssue(
  client: GraphqlClient,
  org: string,
  owner: string,
  issue: RepoIssue,
  allProjects: OrgProject[],
  repoTriageProject: OrgProject | null,
  labelIds: Map<string, string>,
): Promise<IssueStats> {
  const ref: IssueRef = { org, repo: owner, number: issue.number };
  let softFailed = false;
  let autoFixCount = 0;

  // Step 1: evaluate Rule 1
  const ruleResult = checkProjectMembership(issue, repoTriageProject);

  // Step 2: apply auto-fixes
  const appliedFixes: string[] = [];
  for (const fix of ruleResult.autoFixes) {
    if (fix.kind === "remove-from-project") {
      try {
        await client.graphql(
          `mutation($projectId: ID!, $itemId: ID!) {
            deleteProjectV2Item(input: { projectId: $projectId, itemId: $itemId }) {
              deletedItemId
            }
          }`,
          { projectId: fix.projectId, itemId: fix.itemId },
        );
        safeLog(ref, "auto-fix:triage-removed", { projectId: null });
        appliedFixes.push(`Removed from project: _${fix.projectTitle}_`);
        autoFixCount++;
      } catch (err) {
        safeLog(ref, "warn:auto-fix-remove-project-failed");
        core.warning(`${issueUrl(ref)} — Failed to remove from project: ${String(err)}`);
        softFailed = true;
      }
    }
  }

  // Step 3: resolve primary project from current (post-fix) project set
  const primaryProject = resolvePrimaryProject(issue, allProjects, owner);

  // Step 4: collect remaining violations
  const violations = ruleResult.violations;

  const hasViolations = violations.length > 0;

  // Step 5: compute and apply comment actions
  const existingBotComments = issue.comments.nodes
    .filter((c) => c.body.includes(BOT_MARKER))
    .map((c) => ({
      id: c.id,
      body: c.body,
      minimizedReason: c.minimizedReason,
    }));

  const proposedBody = buildCommentBody(violations, appliedFixes);
  const commentActions = computeCommentActions(proposedBody, existingBotComments);

  for (const action of commentActions) {
    if (action.kind === "minimize") {
      try {
        await client.graphql(
          `mutation($id: ID!, $reason: ReportedContentClassifiers!) {
            minimizeComment(input: { subjectId: $id, classifier: $reason }) {
              minimizedComment { isMinimized }
            }
          }`,
          { id: action.id, reason: action.reason },
        );
        safeLog(ref, "action:comment-minimized");
      } catch (err) {
        core.warning(`${issueUrl(ref)} — Failed to minimize comment: ${String(err)}`);
        softFailed = true;
      }
    } else if (action.kind === "create") {
      try {
        await client.graphql(
          `mutation($issueId: ID!, $body: String!) {
            addComment(input: { subjectId: $issueId, body: $body }) {
              commentEdge { node { id } }
            }
          }`,
          { issueId: issue.id, body: proposedBody },
        );
        safeLog(ref, "action:comment-posted");
      } catch (err) {
        core.warning(`${issueUrl(ref)} — Failed to post comment: ${String(err)}`);
        softFailed = true;
      }
    }
  }

  // Step 6: compute and apply label actions
  const currentLabels = issue.labels.nodes.map((l) => l.name);
  const labelActions = computeLabelActions(hasViolations, currentLabels);

  for (const action of labelActions) {
    const labelId = labelIds.get(action.label);
    if (labelId == null) {
      core.warning(`${issueUrl(ref)} — Label "${action.label}" not found in repo — skipping.`);
      continue;
    }
    try {
      if (action.kind === "add") {
        await client.graphql(
          `mutation($issueId: ID!, $labelIds: [ID!]!) {
            addLabelsToLabelable(input: { labelableId: $issueId, labelIds: $labelIds }) {
              labelable { __typename }
            }
          }`,
          { issueId: issue.id, labelIds: [labelId] },
        );
      } else {
        await client.graphql(
          `mutation($issueId: ID!, $labelIds: [ID!]!) {
            removeLabelsFromLabelable(input: { labelableId: $issueId, labelIds: $labelIds }) {
              labelable { __typename }
            }
          }`,
          { issueId: issue.id, labelIds: [labelId] },
        );
      }
      safeLog(ref, "action:label-applied", { add: action.kind === "add" });
    } catch (err) {
      core.warning(`${issueUrl(ref)} — Failed to update label "${action.label}": ${String(err)}`);
      softFailed = true;
    }
  }

  if (hasViolations) {
    safeLog(ref, "check:multi-project", { count: violations.length });
  } else if (autoFixCount === 0) {
    safeLog(ref, "check:ok");
  }

  return {
    repo: owner,
    number: issue.number,
    violations: violations.length,
    autoFixes: autoFixCount,
    softFailed,
    primaryProject,
  };
}

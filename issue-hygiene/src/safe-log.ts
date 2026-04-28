import * as core from "@actions/core";

export type IssueRef = { org: string; repo: string; number: number };

export function issueUrl(ref: IssueRef): string {
  return `https://github.com/${ref.org}/${ref.repo}/issues/${ref.number}`;
}

export type LogEvent =
  | "check:type-missing"
  | "check:no-project"
  | "check:multi-project"
  | "check:heading-missing"
  | "check:priority-missing"
  | "check:no-assignee"
  | "check:ok"
  | "auto-fix:heading-inserted"
  | "auto-fix:triage-added"
  | "auto-fix:triage-removed"
  | "action:comment-posted"
  | "action:comment-minimized"
  | "action:label-applied"
  | "warn:auto-fix-remove-project-failed";

// Structurally forbids strings — no issue content can leak into logs
export type SafeDetail = Record<string, number | boolean | null>;

export function safeLog(
  ref: IssueRef,
  event: LogEvent,
  detail?: SafeDetail,
): void {
  core.info(
    `${issueUrl(ref)} ${event}${detail ? " " + JSON.stringify(detail) : ""}`,
  );
}

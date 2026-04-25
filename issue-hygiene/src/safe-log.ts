import * as core from "@actions/core";

export type IssueRef = { repo: string; number: number };

export type LogEvent =
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
  | "warn:auto-fix-remove-project-failed";

// Structurally forbids strings — no issue content can leak into logs
export type SafeDetail = Record<string, number | boolean | null>;

export function safeLog(
  ref: IssueRef,
  event: LogEvent,
  detail?: SafeDetail,
): void {
  core.info(
    `${ref.repo}#${ref.number} ${event}${detail ? " " + JSON.stringify(detail) : ""}`,
  );
}

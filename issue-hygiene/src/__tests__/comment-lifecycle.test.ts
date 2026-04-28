import { describe, it, expect } from "vitest";
import {
  computeCommentActions,
  buildCommentBody,
  BOT_MARKER,
} from "../comment-lifecycle.js";
import type { BotComment } from "../comment-lifecycle.js";

const visible = (body: string): BotComment => ({ id: "c1", body, minimizedReason: null });
const minimized = (body: string): BotComment => ({ id: "c1", body, minimizedReason: "OUTDATED" });

const violationBody = buildCommentBody(["Missing assignee"], []);
const autoFixBody = buildCommentBody([], ["Removed from Triage"]);
const cleanBody = buildCommentBody([], []);
const differentViolationBody = buildCommentBody(["Missing assignee", "No project"], []);

// --- computeCommentActions ---

describe("computeCommentActions", () => {
  it("no existing comments: creates new comment", () => {
    const actions = computeCommentActions(violationBody, []);
    expect(actions).toEqual([{ kind: "create" }]);
  });

  it("existing comment matches proposed state: no-op", () => {
    const actions = computeCommentActions(violationBody, [visible(violationBody)]);
    expect(actions).toHaveLength(0);
  });

  it("clean comment already posted: no-op", () => {
    const actions = computeCommentActions(cleanBody, [visible(cleanBody)]);
    expect(actions).toHaveLength(0);
  });

  it("violations changed: minimizes old as OUTDATED and creates new", () => {
    const actions = computeCommentActions(differentViolationBody, [visible(violationBody)]);
    expect(actions).toContainEqual({ kind: "minimize", id: "c1", reason: "OUTDATED" });
    expect(actions.some((a) => a.kind === "create")).toBe(true);
  });

  it("transitioning to clean: minimizes violation comment as RESOLVED and creates clean", () => {
    const actions = computeCommentActions(cleanBody, [visible(violationBody)]);
    expect(actions).toContainEqual({ kind: "minimize", id: "c1", reason: "RESOLVED" });
    expect(actions.some((a) => a.kind === "create")).toBe(true);
  });

  it("transitioning to clean from auto-fix comment: minimizes as OUTDATED (no violations to resolve)", () => {
    const actions = computeCommentActions(cleanBody, [visible(autoFixBody)]);
    expect(actions).toContainEqual({ kind: "minimize", id: "c1", reason: "OUTDATED" });
    expect(actions.some((a) => a.kind === "create")).toBe(true);
  });

  it("violations appear after clean comment: minimizes clean as OUTDATED and creates violation", () => {
    const actions = computeCommentActions(violationBody, [visible(cleanBody)]);
    expect(actions).toContainEqual({ kind: "minimize", id: "c1", reason: "OUTDATED" });
    expect(actions.some((a) => a.kind === "create")).toBe(true);
  });

  it("already-minimized comments are ignored in state comparison", () => {
    const actions = computeCommentActions(violationBody, [minimized(violationBody)]);
    // minimized comment shouldn't count as "already current"
    expect(actions.some((a) => a.kind === "create")).toBe(true);
  });
});

// --- buildCommentBody ---

describe("buildCommentBody", () => {
  it("includes both sections when violations and auto-fixes present", () => {
    const body = buildCommentBody(["Fix the title"], ["Removed from Triage"]);
    expect(body).toContain(BOT_MARKER);
    expect(body).toContain("**Please fix:**");
    expect(body).toContain("Fix the title");
    expect(body).toContain("**Auto-fixed in this run:**");
    expect(body).toContain("Removed from Triage");
  });

  it("includes only violations section when no auto-fixes", () => {
    const body = buildCommentBody(["Missing assignee"], []);
    expect(body).toContain("**Please fix:**");
    expect(body).not.toContain("**Auto-fixed");
  });

  it("includes only auto-fixes section when no violations", () => {
    const body = buildCommentBody([], ["Removed from Triage"]);
    expect(body).not.toContain("**Please fix:**");
    expect(body).toContain("**Auto-fixed in this run:**");
  });

  it("returns clean message when both arrays are empty", () => {
    const body = buildCommentBody([], []);
    expect(body).toContain(BOT_MARKER);
    expect(body).toContain("Issue hygiene checks passed");
    expect(body).toContain("_Issue hygiene bot_");
  });

  it("embeds machine-readable metadata as HTML comment", () => {
    const body = buildCommentBody(["Missing assignee"], ["Removed from Triage"]);
    expect(body).toContain("<!-- issue-hygiene-meta:");
    expect(body).toContain('"violations":["Missing assignee"]');
    expect(body).toContain('"autoFixes":["Removed from Triage"]');
  });
});

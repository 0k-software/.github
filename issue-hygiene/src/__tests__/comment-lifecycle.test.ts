import { describe, it, expect } from "vitest";
import {
  computeCommentActions,
  buildCommentBody,
  BOT_MARKER,
} from "../comment-lifecycle.js";
import type { BotComment } from "../comment-lifecycle.js";

const violation = (id: string): BotComment => ({
  id,
  body: `${BOT_MARKER}\n\n**Please fix:**\n- Missing assignee`,
  minimizedReason: null,
});
const clean = (id: string): BotComment => ({
  id,
  body: `${BOT_MARKER}\n\nAll previously flagged issues have been resolved. This issue is now **clean**.`,
  minimizedReason: null,
});
const minimized = (id: string): BotComment => ({
  id,
  body: `${BOT_MARKER}\n\n**Please fix:**\n- Missing assignee`,
  minimizedReason: "OUTDATED",
});

// --- computeCommentActions ---

describe("computeCommentActions", () => {
  it("violations present: minimizes visible as OUTDATED and creates new comment", () => {
    const actions = computeCommentActions(true, false, [
      violation("c1"),
      violation("c2"),
    ]);
    expect(actions).toContainEqual({
      kind: "minimize",
      id: "c1",
      reason: "OUTDATED",
    });
    expect(actions).toContainEqual({
      kind: "minimize",
      id: "c2",
      reason: "OUTDATED",
    });
    expect(actions.some((a) => a.kind === "create")).toBe(true);
  });

  it("auto-fixes only (no violations): still minimizes visible and creates new comment", () => {
    const actions = computeCommentActions(false, true, [violation("c1")]);
    expect(actions).toContainEqual({
      kind: "minimize",
      id: "c1",
      reason: "OUTDATED",
    });
    expect(actions.some((a) => a.kind === "create")).toBe(true);
  });

  it("no violations, no auto-fixes, no bot comments: no-op", () => {
    const actions = computeCommentActions(false, false, []);
    expect(actions).toHaveLength(0);
  });

  it("no violations, no auto-fixes, visible violation comments: minimizes as RESOLVED and creates clean comment", () => {
    const actions = computeCommentActions(false, false, [
      violation("c1"),
      violation("c2"),
    ]);
    expect(actions).toContainEqual({
      kind: "minimize",
      id: "c1",
      reason: "RESOLVED",
    });
    expect(actions).toContainEqual({
      kind: "minimize",
      id: "c2",
      reason: "RESOLVED",
    });
    expect(actions.some((a) => a.kind === "create")).toBe(true);
  });

  it("no violations, no auto-fixes, only already-minimized comments: no-op", () => {
    const actions = computeCommentActions(false, false, [
      minimized("c1"),
      minimized("c2"),
    ]);
    expect(actions).toHaveLength(0);
  });

  it("no violations, no auto-fixes, visible clean comment: no-op (avoids re-triggering)", () => {
    const actions = computeCommentActions(false, false, [clean("c1")]);
    expect(actions).toHaveLength(0);
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
    expect(body).toContain("All previously flagged issues have been resolved");
    expect(body).toContain("**clean**");
    expect(body).toContain("_Issue hygiene bot_");
  });
});

import { describe, it, expect } from "vitest";
import {
  computeCommentActions,
  buildCommentBody,
  BOT_MARKER,
} from "../comment-lifecycle.js";
import type { BotComment } from "../comment-lifecycle.js";

const visible = (id: string): BotComment => ({
  id,
  body: `${BOT_MARKER}\n\nsome content`,
  minimizedReason: null,
});
const minimized = (id: string): BotComment => ({
  id,
  body: `${BOT_MARKER}\n\nsome content`,
  minimizedReason: "OUTDATED",
});

// --- computeCommentActions ---

describe("computeCommentActions", () => {
  it("violations present: minimizes visible as OUTDATED and creates new comment", () => {
    const actions = computeCommentActions(true, false, [
      visible("c1"),
      visible("c2"),
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
    const actions = computeCommentActions(false, true, [visible("c1")]);
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

  it("no violations, no auto-fixes, visible bot comments: minimizes as RESOLVED", () => {
    const actions = computeCommentActions(false, false, [
      visible("c1"),
      visible("c2"),
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
    expect(actions.some((a) => a.kind === "create")).toBe(false);
  });

  it("no violations, no auto-fixes, all already minimized: no-op", () => {
    const actions = computeCommentActions(false, false, [
      minimized("c1"),
      minimized("c2"),
    ]);
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

  it("always includes bot marker and footer", () => {
    const body = buildCommentBody([], []);
    expect(body).toContain(BOT_MARKER);
    expect(body).toContain("_Issue hygiene bot_");
  });
});

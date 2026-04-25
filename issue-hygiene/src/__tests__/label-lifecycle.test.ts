import { describe, it, expect } from "vitest";
import { computeLabelActions } from "../label-lifecycle.js";

describe("computeLabelActions", () => {
  it("adds dirty and removes clean when violations exist", () => {
    const actions = computeLabelActions(true, ["clean"]);
    expect(actions).toContainEqual({ kind: "add", label: "dirty" });
    expect(actions).toContainEqual({ kind: "remove", label: "clean" });
  });

  it("adds dirty only when neither label is present and violations exist", () => {
    const actions = computeLabelActions(true, []);
    expect(actions).toContainEqual({ kind: "add", label: "dirty" });
    expect(actions.some((a) => a.kind === "remove")).toBe(false);
  });

  it("adds clean and removes dirty when no violations", () => {
    const actions = computeLabelActions(false, ["dirty"]);
    expect(actions).toContainEqual({ kind: "add", label: "clean" });
    expect(actions).toContainEqual({ kind: "remove", label: "dirty" });
  });

  it("adds clean only when neither label is present and no violations", () => {
    const actions = computeLabelActions(false, []);
    expect(actions).toContainEqual({ kind: "add", label: "clean" });
    expect(actions.some((a) => a.kind === "remove")).toBe(false);
  });

  it("no-op when violations present and dirty already set", () => {
    const actions = computeLabelActions(true, ["dirty"]);
    expect(actions.some((a) => a.label === "dirty")).toBe(false);
    expect(actions.some((a) => a.label === "clean")).toBe(false);
  });

  it("no-op when no violations and clean already set", () => {
    const actions = computeLabelActions(false, ["clean"]);
    expect(actions).toHaveLength(0);
  });
});

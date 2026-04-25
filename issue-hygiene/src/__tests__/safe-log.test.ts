import { describe, it, expect, vi, beforeEach } from "vitest";
import * as core from "@actions/core";
import { safeLog } from "../safe-log.js";
import type { IssueRef, SafeDetail } from "../safe-log.js";

vi.mock("@actions/core");

describe("safeLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats output as repo#number event", () => {
    const ref: IssueRef = { repo: "my-repo", number: 42 };
    safeLog(ref, "check:no-project");
    expect(core.info).toHaveBeenCalledWith("my-repo#42 check:no-project");
  });

  it("appends JSON-serialised detail when provided", () => {
    const ref: IssueRef = { repo: "acme", number: 7 };
    const detail: SafeDetail = { count: 3, fixed: true };
    safeLog(ref, "check:multi-project", detail);
    expect(core.info).toHaveBeenCalledWith(
      'acme#7 check:multi-project {"count":3,"fixed":true}',
    );
  });

  it("omits detail section when detail is undefined", () => {
    const ref: IssueRef = { repo: "repo", number: 1 };
    safeLog(ref, "action:label-applied");
    const call = vi.mocked(core.info).mock.calls[0][0];
    expect(call).not.toContain("{");
  });

  it("SafeDetail accepts numbers, booleans, and null", () => {
    // Type-level test: this must compile without errors
    const detail: SafeDetail = { n: 0, b: false, x: null };
    expect(detail).toBeDefined();
  });
});

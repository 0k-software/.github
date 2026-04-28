export const BOT_MARKER = "<!-- issue-hygiene-bot -->";

const META_PREFIX = "<!-- issue-hygiene-meta: ";
const META_SUFFIX = " -->";
const VIOLATIONS_MARKER = "**Please fix:**";

type CommentMeta = { violations: string[] };

function parseMeta(body: string): CommentMeta | null {
  const start = body.indexOf(META_PREFIX);
  if (start === -1) return null;
  const jsonStart = start + META_PREFIX.length;
  const end = body.indexOf(META_SUFFIX, jsonStart);
  if (end === -1) return null;
  try {
    return JSON.parse(body.slice(jsonStart, end)) as CommentMeta;
  } catch {
    return null;
  }
}

function metaEquals(a: CommentMeta, b: CommentMeta): boolean {
  const sig = (arr: string[]) => JSON.stringify(arr.slice().sort());
  return sig(a.violations) === sig(b.violations);
}

export type BotComment = {
  id: string;
  body: string;
  minimizedReason: string | null;
};

export type CommentAction =
  | { kind: "minimize"; id: string; reason: "OUTDATED" | "RESOLVED" }
  | { kind: "create" };

export function computeCommentActions(
  proposedBody: string,
  existingBotComments: BotComment[],
  hasAutoFixes = false,
): CommentAction[] {
  const proposedMeta = parseMeta(proposedBody);
  const visibleComments = existingBotComments.filter((c) => c.minimizedReason === null);

  // Auto-fixes always produce a new comment so the run's actions are visible.
  // Otherwise skip if a visible comment already carries the same violation state.
  if (
    !hasAutoFixes &&
    proposedMeta !== null &&
    visibleComments.some((c) => {
      const m = parseMeta(c.body);
      return m !== null && metaEquals(m, proposedMeta);
    })
  ) {
    return [];
  }

  const goingClean = proposedMeta !== null && proposedMeta.violations.length === 0;

  const actions: CommentAction[] = visibleComments.map((c) => {
    const prevMeta = parseMeta(c.body);
    const prevHadViolations =
      prevMeta != null ? prevMeta.violations.length > 0 : c.body.includes(VIOLATIONS_MARKER);
    return {
      kind: "minimize" as const,
      id: c.id,
      reason: goingClean && prevHadViolations ? ("RESOLVED" as const) : ("OUTDATED" as const),
    };
  });

  actions.push({ kind: "create" as const });
  return actions;
}

const CLEAN_LINE = "Issue hygiene checks passed — this issue is marked as **clean**.";

export function buildCommentBody(
  violations: string[],
  autoFixes: string[],
): string {
  const meta = `${META_PREFIX}${JSON.stringify({ violations })}${META_SUFFIX}`;

  if (violations.length === 0 && autoFixes.length === 0) {
    return `${BOT_MARKER}\n${meta}\n\nNo issues found. ${CLEAN_LINE}\n\n---\n_Issue hygiene bot_`;
  }

  const sections: string[] = [];

  if (violations.length > 0) {
    sections.push(
      `**Please fix:**\n${violations.map((v) => `- ${v}`).join("\n")}`,
    );
  }

  if (autoFixes.length > 0) {
    sections.push(
      `**Auto-fixed in this run:**\n${autoFixes.map((d) => `- ${d}`).join("\n")}`,
    );
  }

  if (violations.length === 0) {
    sections.push(CLEAN_LINE);
  }

  return `${BOT_MARKER}\n${meta}\n\n${sections.join("\n\n")}\n\n---\n_Issue hygiene bot_`;
}

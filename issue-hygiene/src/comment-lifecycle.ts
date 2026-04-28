export const BOT_MARKER = "<!-- issue-hygiene-bot -->";

// Matches the "**Please fix:**" section header written by buildCommentBody
const VIOLATIONS_MARKER = "**Please fix:**";

export type BotComment = {
  id: string;
  body: string;
  minimizedReason: string | null;
};

export type CommentAction =
  | { kind: "minimize"; id: string; reason: "OUTDATED" | "RESOLVED" }
  | { kind: "create" };

export function computeCommentActions(
  hasViolations: boolean,
  hasAutoFixes: boolean,
  existingBotComments: BotComment[],
): CommentAction[] {
  const visibleComments = existingBotComments.filter(
    (c) => c.minimizedReason === null,
  );

  if (hasViolations || hasAutoFixes) {
    const actions: CommentAction[] = visibleComments.map((c) => ({
      kind: "minimize" as const,
      id: c.id,
      reason: "OUTDATED" as const,
    }));
    actions.push({ kind: "create" });
    return actions;
  }

  // No violations and no auto-fixes — resolve any open violation comments.
  // We only look at comments that contain the violations section marker so that
  // a previously-posted "clean" comment doesn't re-trigger this on the next run.
  const violationComments = visibleComments.filter((c) =>
    c.body.includes(VIOLATIONS_MARKER),
  );

  if (violationComments.length === 0) {
    return [];
  }

  return [
    ...violationComments.map((c) => ({
      kind: "minimize" as const,
      id: c.id,
      reason: "RESOLVED" as const,
    })),
    { kind: "create" as const },
  ];
}

export function buildCommentBody(
  violations: string[],
  autoFixDescriptions: string[],
): string {
  if (violations.length === 0 && autoFixDescriptions.length === 0) {
    return `${BOT_MARKER}\n\nAll previously flagged issues have been resolved. This issue is now **clean**.\n\n---\n_Issue hygiene bot_`;
  }

  const sections: string[] = [];

  if (violations.length > 0) {
    sections.push(
      `**Please fix:**\n${violations.map((v) => `- ${v}`).join("\n")}`,
    );
  }

  if (autoFixDescriptions.length > 0) {
    sections.push(
      `**Auto-fixed in this run:**\n${autoFixDescriptions.map((d) => `- ${d}`).join("\n")}`,
    );
  }

  const body = sections.join("\n\n");
  return `${BOT_MARKER}\n\n${body}\n\n---\n_Issue hygiene bot_`;
}

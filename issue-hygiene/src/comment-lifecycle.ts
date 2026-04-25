export const BOT_MARKER = "<!-- issue-hygiene-bot -->";

export type BotComment = {
  id: string;
  body: string;
  minimizedReason: string | null;
};

export type CommentAction =
  | { kind: "minimize"; id: string; reason: "OUTDATED" | "RESOLVED" }
  | { kind: "create"; body: string };

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
    actions.push({ kind: "create", body: "" }); // body filled by caller via buildCommentBody
    return actions;
  }

  if (visibleComments.length === 0) {
    return [];
  }

  return visibleComments.map((c) => ({
    kind: "minimize" as const,
    id: c.id,
    reason: "RESOLVED" as const,
  }));
}

export function buildCommentBody(
  violations: string[],
  autoFixDescriptions: string[],
): string {
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

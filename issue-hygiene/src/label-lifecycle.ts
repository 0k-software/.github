export type LabelAction =
  | { kind: "add"; label: "clean" | "dirty" }
  | { kind: "remove"; label: "clean" | "dirty" };

export function computeLabelActions(
  hasViolations: boolean,
  currentLabels: string[],
): LabelAction[] {
  const hasClean = currentLabels.includes("clean");
  const hasDirty = currentLabels.includes("dirty");
  const actions: LabelAction[] = [];

  if (hasViolations) {
    if (!hasDirty) actions.push({ kind: "add", label: "dirty" });
    if (hasClean) actions.push({ kind: "remove", label: "clean" });
  } else {
    if (!hasClean) actions.push({ kind: "add", label: "clean" });
    if (hasDirty) actions.push({ kind: "remove", label: "dirty" });
  }

  return actions;
}

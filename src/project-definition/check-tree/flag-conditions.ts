import type { CheckFlagCondition } from "../../check/check.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "../../data-boundary/closed-values.ts";

const FLAG_CONDITION_MAX_DEPTH = 16;
const FLAG_CONDITION_MAX_NODES = 256;

/** Parses and snapshots one bounded recursive flag condition while retaining child order and multiplicity. */
export function parseFlagCondition(value: unknown): CheckFlagCondition | undefined {
  return parseBoundedFlagCondition(value, 1, { nodes: 0 });
}

/** Checks that a closed record has no author-supplied keys outside this grammar fragment. */
export function hasOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[]
): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function parseBoundedFlagCondition(
  value: unknown,
  depth: number,
  state: { nodes: number }
): CheckFlagCondition | undefined {
  if (exceedsFlagConditionBounds(depth, state)) return undefined;
  if (isNonEmptyIdentifier(value)) return value;
  const condition = snapshotClosedRecord(value);
  const kind = condition?.kind;
  if (condition === undefined || typeof kind !== "string") return undefined;
  return kind === "not"
    ? parseFlagNegationCondition(condition, depth, state)
    : parseFlagConditionSet(condition, kind, depth, state);
}

function exceedsFlagConditionBounds(depth: number, state: { nodes: number }): boolean {
  state.nodes += 1;
  return depth > FLAG_CONDITION_MAX_DEPTH || state.nodes > FLAG_CONDITION_MAX_NODES;
}

function parseFlagNegationCondition(
  condition: Readonly<Record<string, unknown>>,
  depth: number,
  state: { nodes: number }
): CheckFlagCondition | undefined {
  if (!hasOnlyKeys(condition, ["condition", "kind"]) || !Object.hasOwn(condition, "condition")) {
    return undefined;
  }
  const child = parseBoundedFlagCondition(condition.condition, depth + 1, state);
  return child === undefined ? undefined : Object.freeze({ condition: child, kind: "not" });
}

function parseFlagConditionSet(
  condition: Readonly<Record<string, unknown>>,
  kind: string,
  depth: number,
  state: { nodes: number }
): CheckFlagCondition | undefined {
  if (!isFlagConditionSetKind(kind)) return undefined;
  const conditions = parseFlagConditionChildren(condition, depth, state);
  return conditions === undefined ? undefined : Object.freeze({ kind, conditions });
}

function parseFlagConditionChildren(
  condition: Readonly<Record<string, unknown>>,
  depth: number,
  state: { nodes: number }
): readonly [CheckFlagCondition, ...CheckFlagCondition[]] | undefined {
  if (!hasOnlyKeys(condition, ["conditions", "kind"]) || !Object.hasOwn(condition, "conditions")) {
    return undefined;
  }
  const children = snapshotClosedArray(condition.conditions);
  if (children === undefined || children.length === 0) return undefined;
  const normalized: CheckFlagCondition[] = [];
  for (const child of children) {
    const parsed = parseBoundedFlagCondition(child, depth + 1, state);
    if (parsed === undefined) return undefined;
    normalized.push(parsed);
  }
  const [firstCondition, ...remainingConditions] = normalized;
  return firstCondition === undefined
    ? undefined
    : Object.freeze([firstCondition, ...remainingConditions]);
}

function isNonEmptyIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFlagConditionSetKind(
  value: string
): value is "all" | "any" | "none" | "not-all" | "exactly-one" {
  return (
    value === "all" ||
    value === "any" ||
    value === "none" ||
    value === "not-all" ||
    value === "exactly-one"
  );
}

import type { CheckDefinition } from "../check-definition.ts";
import type { CheckExecution } from "../custom-check.ts";
import {
  parseCheckTreeAuthoring,
  type MeaninglessCheckWarning,
  type ParsedCheck,
  type ParsedCheckCollection
} from "./authoring.ts";

export type { Check, InheritableCheckCollection } from "../custom-check.ts";

export interface ResolvedCheckTreeLeaf {
  readonly definition: CheckDefinition;
  readonly dependsOn: readonly string[];
  readonly execution: CheckExecution<object>;
  readonly maxParallel: number;
  readonly mutex: readonly string[];
  readonly options: object;
}

export interface ResolvedCheckTree {
  readonly leaves: readonly ResolvedCheckTreeLeaf[];
  readonly warnings: readonly MeaninglessCheckWarning[];
}

interface InheritedScheduling {
  readonly dependsOn: readonly string[];
  readonly maxParallel: number;
  readonly mutex: readonly string[];
}

/**
 * Traverses the recursive authoring tree. Containment only passes scheduling
 * values to descendants; it never creates an execution dependency or output
 * hierarchy.
 */
export function resolveCheckTree(value: unknown, rootMaxParallel: number): ResolvedCheckTree | undefined {
  if (!Number.isSafeInteger(rootMaxParallel) || rootMaxParallel <= 0) return undefined;
  const parsed = parseCheckTreeAuthoring(value);
  if (parsed === undefined) return undefined;
  const leaves: ResolvedCheckTreeLeaf[] = [];
  const root: InheritedScheduling = Object.freeze({
    dependsOn: Object.freeze([]),
    maxParallel: rootMaxParallel,
    mutex: Object.freeze([])
  });
  for (const check of parsed.checks) flattenCheck(check, root, leaves);
  return Object.freeze({ leaves: Object.freeze(leaves), warnings: parsed.warnings });
}

function flattenCheck(
  check: ParsedCheck,
  inherited: InheritedScheduling,
  leaves: ResolvedCheckTreeLeaf[]
): void {
  const scheduling: InheritedScheduling = Object.freeze({
    dependsOn: resolveCollection(inherited.dependsOn, check.dependsOn),
    maxParallel: check.maxParallel ?? inherited.maxParallel,
    mutex: resolveCollection(inherited.mutex, check.mutex)
  });
  if (check.execution !== null && check.definition !== null && check.options !== null) {
    leaves.push(Object.freeze({
      definition: check.definition,
      dependsOn: scheduling.dependsOn,
      execution: check.execution,
      maxParallel: scheduling.maxParallel,
      mutex: scheduling.mutex,
      options: check.options
    }));
  }
  for (const child of check.checks) flattenCheck(child, scheduling, leaves);
}

function resolveCollection(
  inherited: readonly string[],
  authored: ParsedCheckCollection | undefined
): readonly string[] {
  if (authored === undefined) return inherited;
  if (authored.kind === "exact") return canonicalize(authored.values);
  const removed = new Set(authored.remove);
  return canonicalize([...inherited.filter((value) => !removed.has(value)), ...authored.add]);
}

function canonicalize(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

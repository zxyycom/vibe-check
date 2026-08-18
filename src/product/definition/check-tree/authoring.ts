import { validateDefaultCheckOptions } from "../built-ins.ts";
import type { CheckDefinition } from "../check-definition.ts";
import {
  inherit,
  isInheritedCheckCollection,
  snapshotInheritedCheckCollection,
  type Check,
  type CheckExecution,
  type InheritableCheckCollection,
  type InheritedCheckCollection
} from "../custom-check.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../../quality-core/check-record/plain-record-values.ts";
import { validateCheckDefinition } from "../../quality-core/check-record/validation.ts";
import { isCheckTreeReferenceId } from "./identity.ts";

export type ParsedCheckCollection = Readonly<
  | { readonly kind: "exact"; readonly values: readonly string[] }
  | {
      readonly kind: "inherit";
      readonly add: readonly string[];
      readonly remove: readonly string[];
    }
>;

export interface ParsedCheck {
  readonly checkId: string;
  readonly checks: readonly ParsedCheck[];
  readonly definition: CheckDefinition | null;
  readonly dependsOn: ParsedCheckCollection | undefined;
  readonly displayName: string;
  readonly execution: CheckExecution | null;
  readonly maxParallel: number | undefined;
  readonly mutex: ParsedCheckCollection | undefined;
  readonly options: object | null;
  readonly path: string;
}

export interface ParsedCheckTree {
  readonly checks: readonly ParsedCheck[];
  readonly warnings: readonly MeaninglessCheckWarning[];
}

export interface MeaninglessCheckWarning {
  readonly code: "meaningless-check";
  readonly path: string;
  readonly checkId: string;
}

interface ParseState {
  readonly warnings: MeaninglessCheckWarning[];
}

const CHECK_KEYS = [
  "checkId",
  "checks",
  "dependsOn",
  "displayName",
  "execution",
  "maxParallel",
  "mutex",
  "options",
  "recordTypes"
] as const;

/**
 * Parses only the closed recursive authoring grammar. Execution callbacks are
 * trusted project code, while every declarative field is copied and validated.
 */
export function parseCheckTreeAuthoring(value: unknown): ParsedCheckTree | undefined {
  const roots = snapshotClosedArray(value);
  if (roots === undefined) return undefined;
  const state: ParseState = { warnings: [] };
  const checks: ParsedCheck[] = [];
  for (let index = 0; index < roots.length; index += 1) {
    const check = parseCheck(roots[index], `definition.checks[${index}]`, state);
    if (check === undefined) return undefined;
    checks.push(check);
  }
  return Object.freeze({
    checks: Object.freeze(checks),
    warnings: Object.freeze(state.warnings)
  });
}

function parseCheck(value: unknown, path: string, state: ParseState): ParsedCheck | undefined {
  const data = snapshotClosedRecord(value);
  if (
    data === undefined ||
    !hasOnlyCheckKeys(data) ||
    typeof data.checkId !== "string" ||
    !isCheckTreeReferenceId(data.checkId) ||
    typeof data.displayName !== "string" ||
    data.displayName.length === 0
  ) {
    return undefined;
  }

  const execution = parseExecution(data);
  if (execution === undefined) return undefined;
  const checks = parseChildren(data, path, state);
  if (checks === undefined) return undefined;
  const scheduling = parseScheduling(data);
  if (scheduling === undefined) return undefined;
  if (
    execution === null &&
    (Object.hasOwn(data, "options") || Object.hasOwn(data, "recordTypes"))
  ) {
    return undefined;
  }

  const definition = execution === null ? null : parseDefinition(data);
  const options = execution === null ? null : parseOptions(data);
  if (execution !== null) {
    if (
      definition === null ||
      definition === undefined ||
      options === null ||
      options === undefined ||
      !validateDefaultCheckOptions(definition.checkId, options)
    )
      return undefined;
  }
  if (execution === null && checks.length === 0) {
    state.warnings.push(Object.freeze({ code: "meaningless-check", path, checkId: data.checkId }));
  }

  return Object.freeze({
    checkId: data.checkId,
    checks,
    definition: definition ?? null,
    dependsOn: scheduling.dependsOn,
    displayName: data.displayName,
    execution,
    maxParallel: scheduling.maxParallel,
    mutex: scheduling.mutex,
    options: options ?? null,
    path
  });
}

function hasOnlyCheckKeys(data: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(data).every((key) => CHECK_KEYS.some((checkKey) => checkKey === key));
}

function parseExecution(
  data: Readonly<Record<string, unknown>>
): CheckExecution | null | undefined {
  if (!Object.hasOwn(data, "execution")) return null;
  return isCheckExecution(data.execution) ? data.execution : undefined;
}

function isCheckExecution(value: unknown): value is CheckExecution {
  return typeof value === "function";
}

function parseChildren(
  data: Readonly<Record<string, unknown>>,
  path: string,
  state: ParseState
): readonly ParsedCheck[] | undefined {
  if (!Object.hasOwn(data, "checks")) return Object.freeze([]);
  const values = snapshotClosedArray(data.checks);
  if (values === undefined) return undefined;
  const checks: ParsedCheck[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const check = parseCheck(values[index], `${path}.checks[${index}]`, state);
    if (check === undefined) return undefined;
    checks.push(check);
  }
  return Object.freeze(checks);
}

function parseDefinition(data: Readonly<Record<string, unknown>>): CheckDefinition | undefined {
  const definition = validateCheckDefinition({
    checkId: data.checkId,
    displayName: data.displayName,
    recordTypes: data.recordTypes ?? []
  });
  return definition.ok ? definition.value : undefined;
}

function parseOptions(data: Readonly<Record<string, unknown>>): object | undefined {
  if (!Object.hasOwn(data, "options")) return Object.freeze({});
  const options = snapshotClosedRecord(data.options);
  if (options === undefined) return undefined;
  const snapshot = snapshotJson(options, new Set<object>());
  return snapshot !== null && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? snapshot
    : undefined;
}

function snapshotJson(
  value: unknown,
  ancestors: Set<object>
): object | readonly unknown[] | string | number | boolean | null | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "object" || ancestors.has(value)) return undefined;

  const items = snapshotClosedArray(value);
  if (items !== undefined) {
    ancestors.add(value);
    const snapshot: unknown[] = [];
    for (const item of items) {
      const parsed = snapshotJson(item, ancestors);
      if (parsed === undefined) return undefined;
      snapshot.push(parsed);
    }
    ancestors.delete(value);
    return Object.freeze(snapshot);
  }

  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  ancestors.add(value);
  const snapshot: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(data)) {
    const parsed = snapshotJson(item, ancestors);
    if (parsed === undefined) return undefined;
    snapshot[key] = parsed;
  }
  ancestors.delete(value);
  return Object.freeze(snapshot);
}

function parseScheduling(data: Readonly<Record<string, unknown>>):
  | Readonly<{
      readonly dependsOn: ParsedCheckCollection | undefined;
      readonly maxParallel: number | undefined;
      readonly mutex: ParsedCheckCollection | undefined;
    }>
  | undefined {
  const dependsOn = parseCollection(data, "dependsOn");
  const mutex = parseCollection(data, "mutex");
  const maxParallel = data.maxParallel;
  if (
    dependsOn === null ||
    mutex === null ||
    (maxParallel !== undefined &&
      (typeof maxParallel !== "number" || !Number.isSafeInteger(maxParallel) || maxParallel <= 0))
  )
    return undefined;
  return Object.freeze({
    dependsOn: dependsOn ?? undefined,
    maxParallel,
    mutex: mutex ?? undefined
  });
}

function parseCollection(
  data: Readonly<Record<string, unknown>>,
  field: "dependsOn" | "mutex"
): ParsedCheckCollection | null | undefined {
  if (!Object.hasOwn(data, field)) return undefined;
  const value = data[field];
  if (isInheritedCheckCollection(value)) return parseInheritedCollection(value, field);
  const values = parseCollectionItems(value, field);
  return values === undefined ? null : Object.freeze({ kind: "exact", values });
}

function parseInheritedCollection(
  value: InheritedCheckCollection<unknown>,
  field: "dependsOn" | "mutex"
): ParsedCheckCollection | null {
  const data = snapshotInheritedCheckCollection(value);
  if (data === undefined || !hasExactInheritedKeys(data)) return null;
  const add = data.add === undefined ? Object.freeze([]) : parseCollectionItems(data.add, field);
  const remove =
    data.remove === undefined ? Object.freeze([]) : parseCollectionItems(data.remove, field);
  if (add === undefined || remove === undefined) return null;
  return Object.freeze({ kind: "inherit", add, remove });
}

function hasExactInheritedKeys(data: Readonly<Record<string, unknown>>): boolean {
  const keys = Object.keys(data);
  return keys.length > 0 && keys.every((key) => key === "add" || key === "remove");
}

function parseCollectionItems(
  value: unknown,
  field: "dependsOn" | "mutex"
): readonly string[] | undefined {
  const items = snapshotClosedArray(value);
  if (items === undefined) return undefined;
  const values: string[] = [];
  for (const item of items) {
    const valid =
      typeof item === "string" &&
      (field === "dependsOn" ? isCheckTreeReferenceId(item) : item.length > 0);
    if (!valid) return undefined;
    if (!values.includes(item)) values.push(item);
  }
  return Object.freeze(values);
}

/** Rebuilds the validated public authoring shape without retaining untyped input. */
export function materializeCheckTreeAuthoring(parsed: ParsedCheckTree): readonly Check[] {
  return materializeChecks(parsed.checks);
}

function materializeChecks(checks: readonly ParsedCheck[]): readonly Check[] {
  return Object.freeze(checks.map((check) => materializeCheck(check)));
}

function materializeCheck(check: ParsedCheck): Check {
  const checks = materializeChecks(check.checks);
  const dependsOn = materializeCollection(check.dependsOn);
  const mutex = materializeCollection(check.mutex);
  const scheduling = {
    ...(dependsOn === undefined ? {} : { dependsOn }),
    ...(check.maxParallel === undefined ? {} : { maxParallel: check.maxParallel }),
    ...(mutex === undefined ? {} : { mutex })
  };
  if (check.definition === null || check.execution === null || check.options === null) {
    return Object.freeze({
      checkId: check.checkId,
      checks,
      displayName: check.displayName,
      ...scheduling
    });
  }
  return Object.freeze({
    checkId: check.checkId,
    checks,
    displayName: check.displayName,
    execution: check.execution,
    options: check.options,
    recordTypes: check.definition.recordTypes,
    ...scheduling
  });
}

function materializeCollection(
  collection: ParsedCheckCollection | undefined
): InheritableCheckCollection<string> | undefined {
  if (collection === undefined) return undefined;
  if (collection.kind === "exact") return collection.values;
  return inherit({ add: collection.add, remove: collection.remove });
}

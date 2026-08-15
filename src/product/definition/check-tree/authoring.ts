import { isCheckTreeReferenceId } from "./identity.ts";
import {
  parseBuiltInCheckData,
  type BuiltInCheckData
} from "../built-ins.ts";
import type {
  CheckApplicabilityBinding,
  CustomCheckBinding
} from "./index.ts";
import type {
  CheckExecutionBinding,
  CheckTaskPlanFactory
} from "../../quality-core/check-record/catalog.ts";
import type { CheckDefinition } from "../../quality-core/check-record/model.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../../quality-core/check-record/plain-record-values.ts";
import { validateCheckDefinition } from "../../quality-core/check-record/validation.ts";

export interface ParsedHeader {
  readonly dependsOn: readonly string[];
  readonly maxParallel: number | undefined;
  readonly mutex: readonly string[];
}

export interface ParsedGroup extends ParsedHeader {
  readonly kind: "group";
  readonly id: string;
  readonly checks: readonly ParsedNode[];
}

export type ParsedBuiltIn = ParsedHeader & BuiltInCheckData;

export interface ParsedCustom extends ParsedHeader {
  readonly kind: "custom";
  readonly definition: CheckDefinition;
  readonly applicability: CheckApplicabilityBinding;
  readonly binding: CustomCheckBinding;
}

export type ParsedNode = ParsedGroup | ParsedBuiltIn | ParsedCustom;

interface ParseState {
  readonly ids: Set<string>;
}

export function parseCheckTreeAuthoring(value: unknown): readonly ParsedNode[] | undefined {
  const rootsData = snapshotClosedArray(value);
  if (rootsData === undefined) return undefined;
  const state: ParseState = { ids: new Set() };
  const roots: ParsedNode[] = [];
  for (const raw of rootsData) {
    const node = parseNode(raw, state);
    if (node === undefined) return undefined;
    roots.push(node);
  }
  return Object.freeze(roots);
}

function exactData(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = []
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  return hasExactKeys(data, requiredKeys, optionalKeys) ? data : undefined;
}

function exactNodeData(
  data: Readonly<Record<string, unknown>>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = []
): Readonly<Record<string, unknown>> | undefined {
  return hasExactKeys(data, requiredKeys, optionalKeys) ? data : undefined;
}

function hasExactKeys(
  data: Readonly<Record<string, unknown>>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[]
): boolean {
  const keys = Object.keys(data);
  return requiredKeys.every((key) => keys.includes(key))
    && keys.every((key) => requiredKeys.includes(key) || optionalKeys.includes(key));
}

function parseSchedulingList(value: unknown, kind: "dependsOn" | "mutex"): readonly string[] | undefined {
  const items = typeof value === "string" ? [value] : snapshotClosedArray(value);
  if (items === undefined || items.length === 0) return undefined;
  const values: string[] = [];
  for (const item of items) {
    const valid = typeof item === "string" && (kind === "mutex" ? item.length > 0 : isCheckTreeReferenceId(item));
    if (!valid) return undefined;
    if (!values.includes(item)) values.push(item);
  }
  return values.length === 0 ? undefined : Object.freeze(values);
}

function parseHeader(data: Readonly<Record<string, unknown>>): ParsedHeader | undefined {
  const dependsOn = data.dependsOn === undefined
    ? Object.freeze([])
    : parseSchedulingList(data.dependsOn, "dependsOn");
  const mutex = data.mutex === undefined
    ? Object.freeze([])
    : parseSchedulingList(data.mutex, "mutex");
  const maxParallel = data.maxParallel;
  if (dependsOn === undefined || mutex === undefined || (maxParallel !== undefined && (
    typeof maxParallel !== "number" || !Number.isSafeInteger(maxParallel) || maxParallel <= 0
  ))) return undefined;
  return Object.freeze({ dependsOn, maxParallel, mutex });
}

function parseGroup(data: Readonly<Record<string, unknown>>, state: ParseState): ParsedGroup | undefined {
  const group = exactNodeData(data, ["id", "checks"], ["dependsOn", "maxParallel", "mutex"]);
  const checks = group === undefined ? undefined : snapshotClosedArray(group.checks);
  if (group === undefined || typeof group.id !== "string" || !registerId(group.id, state)
    || checks === undefined || checks.length === 0) return undefined;
  const header = parseHeader(group);
  if (header === undefined) return undefined;
  const parsedChecks: ParsedNode[] = [];
  for (const child of checks) {
    const parsed = parseNode(child, state);
    if (parsed === undefined) return undefined;
    parsedChecks.push(parsed);
  }
  return Object.freeze({ ...header, kind: "group", id: group.id, checks: Object.freeze(parsedChecks) });
}

function parseBuiltIn(data: Readonly<Record<string, unknown>>, state: ParseState): ParsedBuiltIn | undefined {
  const builtIn = parseBuiltInCheckData(data);
  if (builtIn === undefined || !registerId(builtIn.checkId, state)) return undefined;
  const header = parseHeader(data);
  if (header === undefined) return undefined;
  if (builtIn.checkId === "duplicate-detection") {
    return Object.freeze({ ...header, kind: "built-in", checkId: builtIn.checkId, options: builtIn.options });
  }
  if (builtIn.checkId === "file-metrics") {
    return Object.freeze({ ...header, kind: "built-in", checkId: builtIn.checkId, options: builtIn.options });
  }
  return Object.freeze({ ...header, kind: "built-in", checkId: builtIn.checkId, options: builtIn.options });
}

function parseCustom(data: Readonly<Record<string, unknown>>, state: ParseState): ParsedCustom | undefined {
  const custom = exactNodeData(data, [
    "kind",
    "checkId",
    "displayName",
    "recordTypes",
    "applicability",
    "binding"
  ], ["dependsOn", "maxParallel", "mutex"]);
  if (custom?.kind !== "custom" || typeof custom.checkId !== "string" || !registerId(custom.checkId, state)) {
    return undefined;
  }
  const header = parseHeader(custom);
  const definition = validateCheckDefinition({
    checkId: custom.checkId,
    displayName: custom.displayName,
    recordTypes: custom.recordTypes
  });
  const binding = parseCustomBinding(custom.binding);
  return header === undefined || !definition.ok || typeof custom.applicability !== "function" || binding === undefined
    ? undefined
    : Object.freeze({
      ...header,
      kind: "custom",
      definition: definition.value,
      applicability: custom.applicability as CheckApplicabilityBinding,
      binding
    });
}

function parseCustomBinding(value: unknown): CustomCheckBinding | undefined {
  const direct = exactData(value, ["kind", "execute"]);
  if (direct?.kind === "direct" && typeof direct.execute === "function") {
    return Object.freeze({ kind: "direct", execute: direct.execute as CheckExecutionBinding });
  }
  const taskPlan = exactData(value, ["kind", "createTaskPlan"]);
  return taskPlan?.kind === "task-plan" && typeof taskPlan.createTaskPlan === "function"
    ? Object.freeze({ kind: "task-plan", createTaskPlan: taskPlan.createTaskPlan as CheckTaskPlanFactory })
    : undefined;
}

function parseNode(value: unknown, state: ParseState): ParsedNode | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  return Object.hasOwn(data, "checks")
    ? parseGroup(data, state)
    : data.kind === "built-in"
      ? parseBuiltIn(data, state)
      : parseCustom(data, state);
}

function registerId(id: string, state: ParseState): boolean {
  if (!isCheckTreeReferenceId(id) || state.ids.has(id)) return false;
  state.ids.add(id);
  return true;
}

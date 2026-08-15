import { isCheckTreeReferenceId } from "./identity.ts";
import {
  builtInDefinition,
  isBuiltInCheckId,
  materializeBuiltInDescriptor,
  type BuiltInCheckId,
  type BuiltInCheckOptions
} from "../built-ins.ts";
import { parseBuiltInCheckOptions } from "../built-in-options.ts";
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

export interface ParsedBuiltIn extends ParsedHeader {
  readonly kind: "built-in";
  readonly checkId: BuiltInCheckId;
  readonly options: BuiltInCheckOptions;
}

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
  const keys = Object.keys(data);
  return requiredKeys.every((key) => keys.includes(key))
    && keys.every((key) => requiredKeys.includes(key) || optionalKeys.includes(key))
    ? data
    : undefined;
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

function parseGroup(value: unknown, state: ParseState): ParsedGroup | undefined {
  const data = exactData(value, ["id", "checks"], ["dependsOn", "maxParallel", "mutex"]);
  const checks = data === undefined ? undefined : snapshotClosedArray(data.checks);
  if (data === undefined || typeof data.id !== "string" || !registerId(data.id, state)
    || checks === undefined || checks.length === 0) return undefined;
  const header = parseHeader(data);
  if (header === undefined) return undefined;
  const parsedChecks: ParsedNode[] = [];
  for (const child of checks) {
    const parsed = parseNode(child, state);
    if (parsed === undefined) return undefined;
    parsedChecks.push(parsed);
  }
  return Object.freeze({ ...header, kind: "group", id: data.id, checks: Object.freeze(parsedChecks) });
}

function parseBuiltIn(value: unknown, state: ParseState): ParsedBuiltIn | undefined {
  const data = exactData(materializeBuiltInDescriptor(value), ["kind", "checkId", "displayName", "recordTypes", "options"], ["dependsOn", "maxParallel", "mutex"]);
  if (data?.kind !== "built-in" || typeof data.checkId !== "string" || !isBuiltInCheckId(data.checkId)
    || !registerId(data.checkId, state) || !canonicalMetadataMatches(data, data.checkId)) return undefined;
  const header = parseHeader(data);
  const options = parseBuiltInCheckOptions(data.checkId, data.options);
  return header === undefined || options === undefined
    ? undefined
    : Object.freeze({ ...header, kind: "built-in", checkId: data.checkId, options });
}

function parseCustom(value: unknown, state: ParseState): ParsedCustom | undefined {
  const data = exactData(value, [
    "kind",
    "checkId",
    "displayName",
    "recordTypes",
    "applicability",
    "binding"
  ], ["dependsOn", "maxParallel", "mutex"]);
  if (data?.kind !== "custom" || typeof data.checkId !== "string" || !registerId(data.checkId, state)) {
    return undefined;
  }
  const header = parseHeader(data);
  const definition = validateCheckDefinition({
    checkId: data.checkId,
    displayName: data.displayName,
    recordTypes: data.recordTypes
  });
  const binding = parseCustomBinding(data.binding);
  return header === undefined || !definition.ok || typeof data.applicability !== "function" || binding === undefined
    ? undefined
    : Object.freeze({
      ...header,
      kind: "custom",
      definition: definition.value,
      applicability: data.applicability as CheckApplicabilityBinding,
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
  const data = snapshotClosedRecord(materializeBuiltInDescriptor(value));
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

function canonicalMetadataMatches(
  candidate: Readonly<Record<string, unknown>>,
  checkId: BuiltInCheckId
): boolean {
  const candidateDefinition = validateCheckDefinition({
    checkId,
    displayName: candidate.displayName,
    recordTypes: candidate.recordTypes
  });
  if (!candidateDefinition.ok) return false;
  const definition = builtInDefinition(checkId);
  return candidateDefinition.value.displayName === definition.displayName
    && stableJson(candidateDefinition.value.recordTypes) === stableJson(definition.recordTypes);
}

function stableJson(value: unknown): string {
  const array = snapshotClosedArray(value);
  if (array !== undefined) return `[${array.map(stableJson).join(",")}]`;
  const data = snapshotClosedRecord(value);
  if (data !== undefined) {
    return `{${Object.keys(data).sort().map((key) => `${JSON.stringify(key)}:${stableJson(data[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

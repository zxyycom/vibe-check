import type { CheckDescriptor } from "../../check/descriptor.ts";
import {
  isInheritedCheckCollection,
  snapshotInheritedCheckCollection,
  type CheckVisibility,
  type CheckExecution,
  type CheckPreflight,
  type InheritedCheckCollection
} from "../../check/check.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { validateCheckDescriptor } from "../../check/descriptor-validation.ts";
import { snapshotJsonObject } from "../../check/options-snapshot.ts";

type TrustedDataParser = (this: void, ...parameters: never[]) => unknown;
type TrustedCheckPreflight = CheckPreflight;

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
  readonly definition: CheckDescriptor | null;
  readonly dependsOn: ParsedCheckCollection | undefined;
  readonly displayName: string;
  readonly execution: CheckExecution | null;
  readonly maxParallel: number | undefined;
  readonly mutex: ParsedCheckCollection | undefined;
  readonly options: object | null;
  readonly path: string;
  readonly parseData: TrustedDataParser | null;
  readonly preflight: TrustedCheckPreflight | null;
  readonly visibility: CheckVisibility | null;
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

interface CheckAuthoringData extends Readonly<Record<string, unknown>> {
  readonly checkId: string;
  readonly displayName: string;
}

interface ParsedCheckFields {
  readonly definition: CheckDescriptor | null;
  readonly execution: CheckExecution | null;
  readonly options: object | null;
  readonly parseData: TrustedDataParser | null;
  readonly preflight: TrustedCheckPreflight | null;
  readonly visibility: CheckVisibility | null;
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
  "parseData",
  "preflight",
  "visibility"
] as const;

const CONTAINER_CHECK_FIELDS: ParsedCheckFields = Object.freeze({
  definition: null,
  execution: null,
  options: null,
  parseData: null,
  preflight: null,
  visibility: null
});

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
  const data = parseCheckData(value);
  if (data === undefined) return undefined;
  const execution = parseExecution(data);
  if (execution === undefined) return undefined;
  const parseData = parseDataParser(data);
  if (parseData === undefined) return undefined;
  const preflight = parsePreflight(data);
  if (preflight === undefined) return undefined;
  const checks = parseChildren(data, path, state);
  if (checks === undefined) return undefined;
  const scheduling = parseScheduling(data);
  if (scheduling === undefined) return undefined;
  const fields = parseCheckFields(data, execution, parseData, preflight);
  if (fields === undefined) return undefined;
  warnForMeaninglessCheck(data, checks, fields, path, state);

  return Object.freeze({
    checkId: data.checkId,
    checks,
    definition: fields.definition,
    dependsOn: scheduling.dependsOn,
    displayName: data.displayName,
    execution: fields.execution,
    maxParallel: scheduling.maxParallel,
    mutex: scheduling.mutex,
    options: fields.options,
    path,
    parseData: fields.parseData,
    preflight: fields.preflight,
    visibility: fields.visibility
  });
}

function parseCheckData(value: unknown): CheckAuthoringData | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  return hasValidCheckIdentity(data) ? data : undefined;
}

function hasValidCheckIdentity(
  data: Readonly<Record<string, unknown>>
): data is CheckAuthoringData {
  return (
    hasOnlyCheckKeys(data) &&
    typeof data.checkId === "string" &&
    data.checkId.length > 0 &&
    typeof data.displayName === "string" &&
    data.displayName.length > 0
  );
}

function hasOnlyCheckKeys(data: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(data).every((key) => CHECK_KEYS.some((checkKey) => checkKey === key));
}

function parseExecution(data: CheckAuthoringData): CheckExecution | null | undefined {
  if (!Object.hasOwn(data, "execution")) return null;
  return isCheckExecution(data.execution) ? data.execution : undefined;
}

function isCheckExecution(value: unknown): value is CheckExecution {
  return typeof value === "function";
}

function parseDataParser(data: CheckAuthoringData): TrustedDataParser | null | undefined {
  if (!Object.hasOwn(data, "parseData") || data.parseData === undefined) return null;
  return isTrustedDataParser(data.parseData) ? data.parseData : undefined;
}

function isTrustedDataParser(value: unknown): value is TrustedDataParser {
  return typeof value === "function";
}

function parsePreflight(data: CheckAuthoringData): TrustedCheckPreflight | null | undefined {
  if (!Object.hasOwn(data, "preflight")) return null;
  return isTrustedCheckPreflight(data.preflight) ? data.preflight : undefined;
}

function isTrustedCheckPreflight(value: unknown): value is TrustedCheckPreflight {
  return typeof value === "function";
}

function parseChildren(
  data: CheckAuthoringData,
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

function parseDefinition(data: CheckAuthoringData): CheckDescriptor | undefined {
  const definition = validateCheckDescriptor({
    checkId: data.checkId,
    displayName: data.displayName
  });
  return definition.ok ? definition.value : undefined;
}

function parseOptions(data: CheckAuthoringData): object | undefined {
  if (!Object.hasOwn(data, "options")) return Object.freeze({});
  const options = snapshotClosedRecord(data.options);
  if (options === undefined) return undefined;
  return snapshotJsonObject(options);
}

function parseCheckFields(
  data: CheckAuthoringData,
  execution: CheckExecution | null,
  parseData: TrustedDataParser | null,
  preflight: TrustedCheckPreflight | null
): ParsedCheckFields | undefined {
  if (execution === null) {
    return Object.hasOwn(data, "options") ||
      Object.hasOwn(data, "visibility") ||
      parseData !== null ||
      preflight !== null
      ? undefined
      : CONTAINER_CHECK_FIELDS;
  }
  const definition = parseDefinition(data);
  if (definition === undefined) return undefined;
  const options = parseOptions(data);
  if (options === undefined) return undefined;
  const visibility = parseVisibility(data);
  if (visibility === undefined) return undefined;
  return Object.freeze({
    definition,
    execution,
    options,
    parseData,
    preflight,
    visibility
  });
}

function parseVisibility(data: CheckAuthoringData): CheckVisibility | undefined {
  if (!Object.hasOwn(data, "visibility")) return "always";
  const visibility = data.visibility;
  return visibility === undefined || visibility === "always" || visibility === "attention"
    ? (visibility ?? "always")
    : undefined;
}

function warnForMeaninglessCheck(
  data: CheckAuthoringData,
  checks: readonly ParsedCheck[],
  fields: ParsedCheckFields,
  path: string,
  state: ParseState
): void {
  if (fields.execution !== null || checks.length > 0) return;
  state.warnings.push(Object.freeze({ code: "meaningless-check", path, checkId: data.checkId }));
}

function parseScheduling(data: CheckAuthoringData):
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
  data: CheckAuthoringData,
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
  _field: "dependsOn" | "mutex"
): readonly string[] | undefined {
  const items = snapshotClosedArray(value);
  if (items === undefined) return undefined;
  const values: string[] = [];
  for (const item of items) {
    const valid = typeof item === "string" && item.length > 0;
    if (!valid) return undefined;
    if (!values.includes(item)) values.push(item);
  }
  return Object.freeze(values);
}

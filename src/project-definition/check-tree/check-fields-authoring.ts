import type { CheckDescriptor } from "../../check/descriptor.ts";
import {
  type CheckVisibility,
  type CheckFlagEnablement,
  type CheckFlagEnablementMode,
  type Check,
  type CheckPreflight
} from "../../check/check.ts";
import type { HandoffProviderIdentity } from "../../check/handoff-provider-identity.ts";
import { validateCheckDescriptor } from "../../check/descriptor-validation.ts";
import { snapshotJsonObject } from "../../check/options-snapshot.ts";
import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { parseUniqueIdentifiers } from "./collection-authoring.ts";

export type TrustedDataParser = (this: void, ...parameters: never[]) => unknown;

export interface CheckAuthoringData extends Readonly<Record<string, unknown>> {
  readonly checkId: string;
  readonly displayName: string;
}

export interface ParsedCheckFields {
  readonly definition: CheckDescriptor | null;
  readonly enabledByFlags: CheckFlagEnablement | null;
  readonly execution: NonNullable<Check["execution"]> | null;
  readonly handoff: HandoffProviderIdentity | null;
  readonly options: object | null;
  readonly parseData: TrustedDataParser | null;
  readonly preflight: CheckPreflight | null;
  readonly visibility: CheckVisibility | null;
}

export interface ParsedCheckFieldPrelude {
  readonly enabledByFlags: CheckFlagEnablement | null;
  readonly execution: NonNullable<Check["execution"]> | null;
  readonly handoff: HandoffProviderIdentity | null;
  readonly parseData: TrustedDataParser | null;
  readonly preflight: CheckPreflight | null;
}

interface ParsedFlagEnablementControl extends Readonly<Record<string, unknown>> {
  readonly flags: unknown;
  readonly mode: CheckFlagEnablementMode;
  readonly propagateDependsOn?: true;
}

const CHECK_KEYS = [
  "admissionPriority",
  "checkId",
  "checks",
  "dependsOn",
  "displayName",
  "enabledByFlags",
  "execution",
  "handoff",
  "maxParallel",
  "mutex",
  "options",
  "observes",
  "parseData",
  "preflight",
  "resourceClaims",
  "visibility"
] as const;
const FLAG_ENABLEMENT_KEYS = ["flags", "mode", "propagateDependsOn"] as const;

const CONTAINER_CHECK_FIELDS: ParsedCheckFields = Object.freeze({
  definition: null,
  enabledByFlags: null,
  execution: null,
  handoff: null,
  options: null,
  parseData: null,
  preflight: null,
  visibility: null
});

export function parseCheckAuthoringData(value: unknown): CheckAuthoringData | undefined {
  const data = snapshotClosedRecord(value);
  return data !== undefined && hasValidCheckIdentity(data) ? data : undefined;
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

export function parseCheckFieldPrelude(
  data: CheckAuthoringData,
  handoffProviderIdentity: HandoffProviderIdentity | undefined
): ParsedCheckFieldPrelude | undefined {
  const execution = parseExecution(data);
  if (execution === undefined) return undefined;
  const handoff = parseHandoff(data, handoffProviderIdentity);
  if (handoff === undefined) return undefined;
  const parseData = parseDataParser(data);
  if (parseData === undefined) return undefined;
  const preflight = parsePreflight(data);
  if (preflight === undefined) return undefined;
  const enabledByFlags = parseEnabledByFlags(data);
  return enabledByFlags === undefined
    ? undefined
    : Object.freeze({ enabledByFlags, execution, handoff, parseData, preflight });
}

export function parseCheckFields(
  data: CheckAuthoringData,
  prelude: ParsedCheckFieldPrelude
): ParsedCheckFields | undefined {
  if (prelude.execution === null) {
    return containerHasExecutableFields(data, prelude) ? undefined : CONTAINER_CHECK_FIELDS;
  }
  return parseExecutableCheckFields(data, prelude);
}

/** Container nodes cannot carry values that only an executable callback can consume. */
function containerHasExecutableFields(
  data: CheckAuthoringData,
  prelude: ParsedCheckFieldPrelude
): boolean {
  return (
    Object.hasOwn(data, "options") ||
    Object.hasOwn(data, "enabledByFlags") ||
    prelude.handoff !== null ||
    Object.hasOwn(data, "visibility") ||
    prelude.parseData !== null ||
    prelude.preflight !== null
  );
}

/** Parses the callback-owned fields that form one executable Check definition. */
function parseExecutableCheckFields(
  data: CheckAuthoringData,
  prelude: ParsedCheckFieldPrelude
): ParsedCheckFields | undefined {
  const definition = parseDefinition(data);
  if (definition === undefined) return undefined;
  const options = parseOptions(data);
  if (options === undefined) return undefined;
  const visibility = parseVisibility(data);
  if (visibility === undefined) return undefined;
  return Object.freeze({
    definition,
    enabledByFlags: prelude.enabledByFlags,
    execution: prelude.execution,
    handoff: prelude.handoff,
    options,
    parseData: prelude.parseData,
    preflight: prelude.preflight,
    visibility
  });
}

function hasOnlyCheckKeys(data: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(data).every((key) => CHECK_KEYS.some((checkKey) => checkKey === key));
}

function parseExecution(
  data: CheckAuthoringData
): NonNullable<Check["execution"]> | null | undefined {
  if (!Object.hasOwn(data, "execution")) return null;
  return isTrustedFunction<NonNullable<Check["execution"]>>(data.execution)
    ? data.execution
    : undefined;
}

function parseHandoff(
  data: CheckAuthoringData,
  handoffProviderIdentity: HandoffProviderIdentity | undefined
): HandoffProviderIdentity | null | undefined {
  if (!Object.hasOwn(data, "handoff")) return null;
  return data.handoff === true && handoffProviderIdentity !== undefined
    ? handoffProviderIdentity
    : undefined;
}

function parseDataParser(data: CheckAuthoringData): TrustedDataParser | null | undefined {
  if (!Object.hasOwn(data, "parseData") || data.parseData === undefined) return null;
  return isTrustedFunction<TrustedDataParser>(data.parseData) ? data.parseData : undefined;
}

function parsePreflight(data: CheckAuthoringData): CheckPreflight | null | undefined {
  if (!Object.hasOwn(data, "preflight")) return null;
  return isTrustedFunction<CheckPreflight>(data.preflight) ? data.preflight : undefined;
}

function isTrustedFunction<FunctionType extends (...parameters: never[]) => unknown>(
  value: unknown
): value is FunctionType {
  return typeof value === "function";
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

function parseEnabledByFlags(data: CheckAuthoringData): CheckFlagEnablement | null | undefined {
  if (!Object.hasOwn(data, "enabledByFlags")) return null;
  const control = parseFlagEnablementControl(data.enabledByFlags);
  if (control === undefined) return undefined;
  const flags = parseUniqueIdentifiers(control.flags);
  return flags === undefined ? undefined : canonicalFlagEnablement(control, flags);
}

function parseFlagEnablementControl(value: unknown): ParsedFlagEnablementControl | undefined {
  const control = snapshotClosedRecord(value);
  if (control === undefined || !hasOnlyFlagEnablementKeys(control)) return undefined;
  return hasFlagEnablementFields(control) ? control : undefined;
}

function hasFlagEnablementFields(
  control: Readonly<Record<string, unknown>>
): control is ParsedFlagEnablementControl {
  if (!Object.hasOwn(control, "flags") || !Object.hasOwn(control, "mode")) return false;
  if (!isCheckFlagEnablementMode(control.mode)) return false;
  return !Object.hasOwn(control, "propagateDependsOn") || control.propagateDependsOn === true;
}

function canonicalFlagEnablement(
  control: ParsedFlagEnablementControl,
  flags: readonly string[]
): CheckFlagEnablement | undefined {
  const [firstFlag, ...remainingFlags] = [...flags].sort();
  if (firstFlag === undefined) return undefined;
  const canonicalFlags: [string, ...string[]] = [firstFlag, ...remainingFlags];
  return Object.freeze({
    flags: Object.freeze(canonicalFlags),
    mode: control.mode,
    ...(control.propagateDependsOn === true ? { propagateDependsOn: true as const } : {})
  });
}

function hasOnlyFlagEnablementKeys(control: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(control).every((key) =>
    FLAG_ENABLEMENT_KEYS.some((allowed) => allowed === key)
  );
}

function isCheckFlagEnablementMode(value: unknown): value is CheckFlagEnablementMode {
  return value === "all" || value === "any" || value === "none" || value === "not-all";
}

function parseVisibility(data: CheckAuthoringData): CheckVisibility | undefined {
  if (!Object.hasOwn(data, "visibility")) return "always";
  const visibility = data.visibility;
  return visibility === undefined || visibility === "always" || visibility === "attention"
    ? (visibility ?? "always")
    : undefined;
}

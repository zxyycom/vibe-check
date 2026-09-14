import type { CheckDescriptor } from "../../check/descriptor.ts";
import { type Check, type CheckFlagEnablement, type CheckPreparation } from "../../check/check.ts";
import type { HandoffProviderIdentity } from "../../check/handoff-provider-identity.ts";
import { validateCheckDescriptor } from "../../check/descriptor-validation.ts";
import { snapshotJsonObject } from "../../check/options-snapshot.ts";
import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { hasOnlyKeys, parseFlagCondition } from "./flag-conditions.ts";

export type TrustedDataParser = (this: void, ...parameters: never[]) => unknown;

export interface CheckAuthoringData extends Readonly<Record<string, unknown>> {
  readonly checkId: string;
  readonly displayName: string;
}

export interface ParsedCheckFields {
  readonly definition: CheckDescriptor | null;
  readonly enabledByFlags: CheckFlagEnablement | null;
  readonly execute: NonNullable<Check["execute"]> | null;
  readonly handoff: HandoffProviderIdentity | null;
  readonly options: object | null;
  readonly parseData: TrustedDataParser | null;
  readonly prepare: CheckPreparation | null;
  readonly omitQuietPassedRow: boolean | null;
}

export interface ParsedCheckFieldPrelude {
  readonly enabledByFlags: CheckFlagEnablement | null;
  readonly execute: NonNullable<Check["execute"]> | null;
  readonly handoff: HandoffProviderIdentity | null;
  readonly parseData: TrustedDataParser | null;
  readonly prepare: CheckPreparation | null;
}

const CHECK_KEYS = [
  "admissionPriority",
  "checkId",
  "checks",
  "dependsOn",
  "displayName",
  "enabledByFlags",
  "execute",
  "handoff",
  "maxParallel",
  "mutex",
  "options",
  "observes",
  "parseData",
  "prepare",
  "resourceClaims",
  "omitQuietPassedRow"
] as const;
const FLAG_ENABLEMENT_EXPRESSION_KEYS = ["when", "propagateDependsOn"] as const;

const CONTAINER_CHECK_FIELDS: ParsedCheckFields = Object.freeze({
  definition: null,
  enabledByFlags: null,
  execute: null,
  handoff: null,
  options: null,
  parseData: null,
  prepare: null,
  omitQuietPassedRow: null
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
  const preparation = parsePreparation(data);
  if (preparation === undefined) return undefined;
  const enabledByFlags = parseEnabledByFlags(data);
  return enabledByFlags === undefined
    ? undefined
    : Object.freeze({
        enabledByFlags,
        execute: execution,
        handoff,
        parseData,
        prepare: preparation
      });
}

export function parseCheckFields(
  data: CheckAuthoringData,
  prelude: ParsedCheckFieldPrelude
): ParsedCheckFields | undefined {
  if (prelude.execute === null) {
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
    Object.hasOwn(data, "omitQuietPassedRow") ||
    prelude.parseData !== null ||
    prelude.prepare !== null
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
  const omitQuietPassedRow = parseOmitQuietPassedRow(data);
  if (omitQuietPassedRow === undefined) return undefined;
  return Object.freeze({
    definition,
    enabledByFlags: prelude.enabledByFlags,
    execute: prelude.execute,
    handoff: prelude.handoff,
    options,
    parseData: prelude.parseData,
    prepare: prelude.prepare,
    omitQuietPassedRow
  });
}

function hasOnlyCheckKeys(data: Readonly<Record<string, unknown>>): boolean {
  return Object.keys(data).every((key) => CHECK_KEYS.some((checkKey) => checkKey === key));
}

function parseExecution(
  data: CheckAuthoringData
): NonNullable<Check["execute"]> | null | undefined {
  if (!Object.hasOwn(data, "execute")) return null;
  return isTrustedFunction<NonNullable<Check["execute"]>>(data.execute) ? data.execute : undefined;
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

function parsePreparation(data: CheckAuthoringData): CheckPreparation | null | undefined {
  if (!Object.hasOwn(data, "prepare")) return null;
  return isTrustedFunction<CheckPreparation>(data.prepare) ? data.prepare : undefined;
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
  return parseFlagEnablementControl(data.enabledByFlags);
}

function parseFlagEnablementControl(value: unknown): CheckFlagEnablement | undefined {
  const control = snapshotClosedRecord(value);
  if (
    control === undefined ||
    !hasOnlyKeys(control, FLAG_ENABLEMENT_EXPRESSION_KEYS) ||
    !Object.hasOwn(control, "when")
  ) {
    return undefined;
  }
  const when = parseFlagCondition(control.when);
  const propagateDependsOn = parsePropagation(control);
  return when === undefined || propagateDependsOn === undefined
    ? undefined
    : Object.freeze({
        when,
        ...(propagateDependsOn ? { propagateDependsOn: true as const } : {})
      });
}

function parsePropagation(control: Readonly<Record<string, unknown>>): boolean | undefined {
  if (!Object.hasOwn(control, "propagateDependsOn")) return false;
  return control.propagateDependsOn === true ? true : undefined;
}

function parseOmitQuietPassedRow(data: CheckAuthoringData): boolean | undefined {
  if (!Object.hasOwn(data, "omitQuietPassedRow")) return false;
  return data.omitQuietPassedRow === undefined || data.omitQuietPassedRow === true
    ? (data.omitQuietPassedRow ?? false)
    : undefined;
}

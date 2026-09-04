import type { CheckDescriptor } from "../../check/descriptor.ts";
import { snapshotClosedArray } from "../../data-boundary/closed-values.ts";
import {
  parseCheckAuthoringData,
  parseCheckFieldPrelude,
  parseCheckFields,
  type CheckAuthoringData,
  type ParsedCheckFields,
  type ParsedCheckFieldPrelude,
  type TrustedDataParser
} from "./check-fields-authoring.ts";
import { parseCheckScheduling, type ParsedCheckCollection } from "./scheduling-authoring.ts";

export type { ParsedCheckCollection } from "./scheduling-authoring.ts";

export interface ParsedCheck {
  readonly admissionPriority: number | undefined;
  readonly checkId: string;
  readonly checks: readonly ParsedCheck[];
  readonly definition: CheckDescriptor | null;
  readonly dependsOn: ParsedCheckCollection | undefined;
  readonly displayName: string;
  readonly enabledByFlags: ParsedCheckFieldPrelude["enabledByFlags"];
  readonly execution: ParsedCheckFieldPrelude["execution"];
  readonly maxParallel: number | undefined;
  readonly mutex: ParsedCheckCollection | undefined;
  readonly observes: ParsedCheckCollection | undefined;
  readonly options: object | null;
  readonly path: string;
  readonly parseData: TrustedDataParser | null;
  readonly preflight: ParsedCheckFieldPrelude["preflight"];
  readonly visibility: ParsedCheckFields["visibility"];
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
  const data = parseCheckAuthoringData(value);
  if (data === undefined) return undefined;
  const prelude = parseCheckFieldPrelude(data);
  if (prelude === undefined) return undefined;
  const checks = parseChildren(data, path, state);
  if (checks === undefined) return undefined;
  const scheduling = parseCheckScheduling(data);
  if (scheduling === undefined) return undefined;
  const fields = parseCheckFields(data, prelude);
  if (fields === undefined) return undefined;
  warnForMeaninglessCheck(data, checks, fields, path, state);
  return Object.freeze({
    admissionPriority: scheduling.admissionPriority,
    checkId: data.checkId,
    checks,
    definition: fields.definition,
    dependsOn: scheduling.dependsOn,
    displayName: data.displayName,
    enabledByFlags: fields.enabledByFlags,
    execution: fields.execution,
    maxParallel: scheduling.maxParallel,
    mutex: scheduling.mutex,
    observes: scheduling.observes,
    options: fields.options,
    path,
    parseData: fields.parseData,
    preflight: fields.preflight,
    visibility: fields.visibility
  });
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

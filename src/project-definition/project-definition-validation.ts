import { resolveParsedCheckTree } from "./check-tree/resolution.ts";
import { parseCheckTreeAuthoring } from "./check-tree/authoring.ts";
import { materializeCheckTreeAuthoring } from "./check-tree/materialization.ts";
import { parseOutputs } from "./output-validation.ts";
import {
  type ProjectDefinitionDiagnostic,
  type ProjectDefinitionValidationResult,
  type AdmissionPolicy,
  type SchedulerPolicy
} from "./project-definition.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "../data-boundary/closed-values.ts";

type DefinitionValidationResult<T> = Readonly<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ProjectDefinitionDiagnostic }
>;

const PROJECT_DEFINITION_KEYS = ["apiVersion", "checks", "outputs", "scheduler"] as const;

/**
 * Validates one closed Definition before Run can invoke any project callback.
 * Successful validation carries information-only Check warnings separately.
 */
export function validateProjectDefinition(value: unknown): ProjectDefinitionValidationResult {
  try {
    return validateProjectDefinitionValue(value);
  } catch {
    return invalidDefinition("definition");
  }
}

function validateProjectDefinitionValue(value: unknown): ProjectDefinitionValidationResult {
  const data = exactProjectDefinition(value);
  if (!data.ok) return data;
  return parseProjectDefinitionFields(data.value);
}

function parseProjectDefinitionFields(
  data: Readonly<Record<string, unknown>>
): ProjectDefinitionValidationResult {
  const scheduler = parseScheduler(data.scheduler);
  if (scheduler === undefined) return invalidDefinition("definition.scheduler");
  const checks = snapshotClosedArray(data.checks);
  if (checks === undefined) return invalidDefinition("definition.checks");
  const parsedChecks = parseCheckTreeAuthoring(checks);
  if (parsedChecks === undefined) return invalidDefinition("definition.checks");
  const tree = resolveParsedCheckTree(parsedChecks, scheduler.maxParallel);
  if (tree === undefined) return invalidDefinition("definition.checks");
  const outputs = parseOutputs(data.outputs);
  if (outputs === undefined) return invalidDefinition("definition.outputs");
  return Object.freeze({
    ok: true,
    value: {
      apiVersion: "1" as const,
      checks: materializeCheckTreeAuthoring(parsedChecks),
      outputs,
      scheduler
    },
    warnings: tree.warnings
  });
}

function exactProjectDefinition(
  value: unknown
): DefinitionValidationResult<Readonly<Record<string, unknown>>> {
  const data = exactRecord(
    value,
    PROJECT_DEFINITION_KEYS,
    "invalid-project-definition",
    "definition"
  );
  if (!data.ok) return data;
  return data.value.apiVersion === "1"
    ? data
    : invalid("invalid-project-definition", "definition.apiVersion", "invalid-value");
}

function exactRecord(
  value: unknown,
  allowedKeys: readonly string[],
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string
): DefinitionValidationResult<Readonly<Record<string, unknown>>> {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return invalid(kind, path, "invalid-value");
  const unknownKey = Object.keys(data).find((key) => !allowedKeys.includes(key));
  if (unknownKey !== undefined) return invalid(kind, `${path}.${unknownKey}`, "unknown-key");
  return Object.freeze({ ok: true, value: data });
}

function parseScheduler(value: unknown): SchedulerPolicy | undefined {
  const data = snapshotClosedRecord(value);
  if (
    data === undefined ||
    !Object.hasOwn(data, "maxParallel") ||
    Object.keys(data).some((key) => key !== "admissionPolicy" && key !== "maxParallel")
  ) {
    return undefined;
  }
  const admissionPolicy = Object.hasOwn(data, "admissionPolicy")
    ? parseAdmissionPolicy(data.admissionPolicy)
    : Object.freeze({ kind: "static" as const });
  return typeof data.maxParallel === "number" &&
    Number.isSafeInteger(data.maxParallel) &&
    data.maxParallel > 0 &&
    admissionPolicy !== undefined
    ? Object.freeze({ admissionPolicy, maxParallel: data.maxParallel })
    : undefined;
}

function parseAdmissionPolicy(value: unknown): AdmissionPolicy | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined || typeof data.kind !== "string") return undefined;
  if (data.kind === "static") {
    return exactKeys(data, ["kind"]) === undefined ? undefined : Object.freeze({ kind: "static" });
  }
  if (data.kind === "custom") {
    const policy = exactKeys(data, ["kind", "proposeAdmission"]);
    const proposeAdmission = policy?.proposeAdmission;
    if (!isCustomAdmissionCallback(proposeAdmission)) return undefined;
    return Object.freeze({
      kind: "custom",
      proposeAdmission
    });
  }
  return undefined;
}

function isCustomAdmissionCallback(
  value: unknown
): value is Extract<AdmissionPolicy, { readonly kind: "custom" }>["proposeAdmission"] {
  return typeof value === "function";
}

function exactKeys(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  return Object.keys(data).length === keys.length && keys.every((key) => Object.hasOwn(data, key))
    ? data
    : undefined;
}

function invalidDefinition(path: string): ProjectDefinitionValidationResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ kind: "invalid-project-definition", path, reason: "invalid-value" })
  });
}

function invalid(
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string,
  reason: ProjectDefinitionDiagnostic["reason"]
): DefinitionValidationResult<never> {
  return Object.freeze({ ok: false, error: Object.freeze({ kind, path, reason }) });
}

import { resolveParsedCheckTree } from "./check-tree/resolution.ts";
import { parseCheckTreeAuthoring } from "./check-tree/authoring.ts";
import { materializeCheckTreeAuthoring } from "./check-tree/materialization.ts";
import { parseOutputs } from "./output-validation.ts";
import {
  type ProjectDefinitionDiagnostic,
  type ProjectDefinitionValidationResult,
  type AdmissionPolicy,
  type CustomAdmissionStrategy,
  type SchedulerMeasurementHook,
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
    Object.keys(data).some(
      (key) => key !== "admissionPolicy" && key !== "maxParallel" && key !== "measurementHooks"
    )
  ) {
    return undefined;
  }
  const admissionPolicy = Object.hasOwn(data, "admissionPolicy")
    ? parseAdmissionPolicy(data.admissionPolicy)
    : Object.freeze({ kind: "static" as const });
  const measurementHooks = parseMeasurementHooks(data.measurementHooks);
  return typeof data.maxParallel === "number" &&
    Number.isSafeInteger(data.maxParallel) &&
    data.maxParallel > 0 &&
    admissionPolicy !== undefined &&
    measurementHooks !== undefined
    ? Object.freeze({
        admissionPolicy,
        maxParallel: data.maxParallel,
        measurementHooks
      })
    : undefined;
}

function parseMeasurementHooks(value: unknown): readonly SchedulerMeasurementHook[] | undefined {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) return undefined;
  const hooks: SchedulerMeasurementHook[] = [];
  for (const hook of value) {
    if (!isMeasurementHook(hook)) return undefined;
    hooks.push(hook);
  }
  return Object.freeze(hooks);
}

function isMeasurementHook(value: unknown): value is SchedulerMeasurementHook {
  return typeof value === "function";
}

function parseAdmissionPolicy(value: unknown): AdmissionPolicy | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined || typeof data.kind !== "string") return undefined;
  switch (data.kind) {
    case "static":
      return parseStaticAdmissionPolicy(data);
    case "custom":
      return parseCustomAdmissionPolicy(data);
    case "learned-critical-path":
      return parseLearnedCriticalPathAdmissionPolicy(data);
  }
  return undefined;
}

function parseStaticAdmissionPolicy(
  policy: Readonly<Record<string, unknown>>
): Extract<AdmissionPolicy, { readonly kind: "static" }> | undefined {
  return hasExactKeys(policy, ["kind"]) ? Object.freeze({ kind: "static" }) : undefined;
}

function parseCustomAdmissionPolicy(
  policy: Readonly<Record<string, unknown>>
): Extract<AdmissionPolicy, { readonly kind: "custom" }> | undefined {
  if (!hasExactKeys(policy, ["kind", "strategy"])) return undefined;
  const strategy = parseCustomAdmissionStrategy(policy.strategy);
  return strategy === undefined ? undefined : Object.freeze({ kind: "custom", strategy });
}

function parseLearnedCriticalPathAdmissionPolicy(
  policy: Readonly<Record<string, unknown>>
): Extract<AdmissionPolicy, { readonly kind: "learned-critical-path" }> | undefined {
  if (!hasExactKeys(policy, ["kind", "stateDirectory"])) return undefined;
  const stateDirectory = policy.stateDirectory;
  if (
    typeof stateDirectory !== "string" ||
    stateDirectory.length === 0 ||
    stateDirectory.includes("\0")
  ) {
    return undefined;
  }
  return Object.freeze({ kind: "learned-critical-path" as const, stateDirectory });
}

function parseCustomAdmissionStrategy(value: unknown): CustomAdmissionStrategy | undefined {
  const strategy = snapshotClosedRecord(value);
  if (strategy === undefined || typeof strategy.kind !== "string") return undefined;
  if (strategy.kind === "simple") {
    if (!hasExactKeys(strategy, ["kind", "decide"])) return undefined;
    if (!isSimpleCustomDecision(strategy.decide)) return undefined;
    return Object.freeze({ kind: "simple" as const, decide: strategy.decide });
  }
  if (strategy.kind === "prepared") {
    if (!hasExactKeys(strategy, ["kind", "prepare"])) return undefined;
    if (!isPreparedCustomPreparation(strategy.prepare)) return undefined;
    return Object.freeze({ kind: "prepared" as const, prepare: strategy.prepare });
  }
  return undefined;
}

function isSimpleCustomDecision(
  value: unknown
): value is Extract<CustomAdmissionStrategy, { readonly kind: "simple" }>["decide"] {
  return typeof value === "function";
}

function isPreparedCustomPreparation(
  value: unknown
): value is Extract<CustomAdmissionStrategy, { readonly kind: "prepared" }>["prepare"] {
  return typeof value === "function";
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

function invalidDefinition(path: string): ProjectDefinitionValidationResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      kind: "invalid-project-definition",
      path,
      reason: "invalid-value"
    })
  });
}

function invalid(
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string,
  reason: ProjectDefinitionDiagnostic["reason"]
): DefinitionValidationResult<never> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ kind, path, reason })
  });
}

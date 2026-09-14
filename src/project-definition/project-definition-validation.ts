import { resolveParsedCheckTree } from "./check-tree/resolution.ts";
import { parseCheckTreeAuthoring } from "./check-tree/authoring.ts";
import { materializeCheckTreeAuthoring } from "./check-tree/materialization.ts";
import { parseOutputs } from "./output-validation.ts";
import {
  type ProjectDefinitionDiagnostic,
  type ProjectDefinitionValidationResult,
  type AdmissionPolicy,
  type CustomAdmissionStrategy,
  type NormalizedCheck,
  type SchedulerTerminalEffect,
  type SchedulerPolicy
} from "./project-definition.ts";
import {
  snapshotClosedArray,
  snapshotClosedPolicyRecord,
  snapshotClosedRecord
} from "../data-boundary/closed-values.ts";
import { snapshotResourceUnitMapping } from "./resource-unit-mapping.ts";
import { parseProjectChangesConfiguration } from "./project-changes.ts";

type DefinitionValidationResult<T> = Readonly<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ProjectDefinitionDiagnostic }
>;

const PROJECT_DEFINITION_KEYS = [
  "apiVersion",
  "changes",
  "checks",
  "outputs",
  "scheduler"
] as const;

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
  const changes = Object.hasOwn(data, "changes")
    ? parseProjectChangesConfiguration(data.changes)
    : undefined;
  if (Object.hasOwn(data, "changes") && changes === undefined) {
    return invalidDefinition("definition.changes");
  }
  const checks = snapshotClosedArray(data.checks);
  if (checks === undefined) return invalidDefinition("definition.checks");
  const parsedChecks = parseCheckTreeAuthoring(checks);
  if (parsedChecks === undefined) return invalidDefinition("definition.checks");
  const tree = resolveParsedCheckTree(
    parsedChecks,
    scheduler.maxParallel,
    scheduler.resourceCapacities
  );
  if (tree === undefined) return invalidDefinition("definition.checks");
  if (!hasOnlyKnownChangeFlagReferences(tree.leaves, changes)) {
    return invalidDefinition("definition.checks");
  }
  const outputs = parseOutputs(data.outputs);
  if (outputs === undefined) return invalidDefinition("definition.outputs");
  return Object.freeze({
    ok: true,
    value: {
      apiVersion: "1" as const,
      checks: materializeCheckTreeAuthoring(parsedChecks),
      ...(changes === undefined ? {} : { changes }),
      outputs,
      scheduler
    },
    warnings: tree.warnings
  });
}

function hasOnlyKnownChangeFlagReferences(
  checks: readonly NormalizedCheck[],
  changes: ReturnType<typeof parseProjectChangesConfiguration>
): boolean {
  return checks.every(
    (check) =>
      check.enabledByFlags === undefined ||
      hasOnlyKnownChangeFlagConditionReferences(check.enabledByFlags.when, changes)
  );
}

function hasOnlyKnownChangeFlagConditionReferences(
  condition: import("../check/check.ts").CheckFlagCondition,
  changes: ReturnType<typeof parseProjectChangesConfiguration>
): boolean {
  if (typeof condition === "string") {
    const prefix = "vibe-check:change:";
    return (
      !condition.startsWith(prefix) ||
      (changes !== undefined && Object.hasOwn(changes.flags, condition.slice(prefix.length)))
    );
  }
  if (condition.kind === "not") {
    return hasOnlyKnownChangeFlagConditionReferences(condition.condition, changes);
  }
  return condition.conditions.every((child) =>
    hasOnlyKnownChangeFlagConditionReferences(child, changes)
  );
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
  const data = snapshotClosedPolicyRecord(value, {
    optional: ["admissionPolicy", "terminalEffects", "resourceCapacities"],
    required: ["maxParallel"]
  });
  if (data === undefined) return undefined;
  const admissionPolicy = Object.hasOwn(data, "admissionPolicy")
    ? parseAdmissionPolicy(data.admissionPolicy)
    : Object.freeze({ kind: "static" as const });
  if (admissionPolicy === undefined) return undefined;
  const terminalEffects = parseTerminalEffects(data.terminalEffects);
  if (terminalEffects === undefined) return undefined;
  const resourceCapacities = snapshotResourceUnitMapping(
    Object.hasOwn(data, "resourceCapacities") ? data.resourceCapacities : {}
  );
  if (resourceCapacities === undefined) return undefined;
  const maxParallel = positiveSafeInteger(data.maxParallel);
  if (maxParallel === undefined) return undefined;
  return Object.freeze({ admissionPolicy, maxParallel, terminalEffects, resourceCapacities });
}

function positiveSafeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function parseTerminalEffects(value: unknown): readonly SchedulerTerminalEffect[] | undefined {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) return undefined;
  const hooks: SchedulerTerminalEffect[] = [];
  for (const hook of value) {
    if (!isTerminalEffect(hook)) return undefined;
    hooks.push(hook);
  }
  return Object.freeze(hooks);
}

function isTerminalEffect(value: unknown): value is SchedulerTerminalEffect {
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

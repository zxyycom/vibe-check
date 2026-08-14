import { createHash } from "node:crypto";

import { isNonArrayRecord, isStringArray, isUnknownArray } from "./foundation/src/type-guards.ts";
import { parseQualityConfiguration } from "./quality-configuration.ts";
import { parseEffects } from "./project-effect-validation.ts";
import { parseOperationalDependencies } from "./scanner-dependencies.ts";
import type { CheckExecutionBinding, CheckTaskPlanFactory } from "./quality-core/src/check-record/catalog.ts";
import type { CheckDefinition } from "./quality-core/src/check-record/model.ts";
import { createCatalogFingerprint } from "./quality-core/src/check-record/identity.ts";
import type { DecisionPolicy } from "./quality-core/src/check-record/policy-model.ts";
import { validatePolicyResolution } from "./quality-core/src/check-record/policy-validation.ts";
import {
  resolveCheckSchedules,
  resolveCheckSelection
} from "./quality-core/src/check-record/check-schedule.ts";
import type { SchedulerPolicy } from "./quality-core/src/check-record/task-orchestrator.ts";
import { validateCheckDefinition } from "./quality-core/src/check-record/validation.ts";
import {
  BUILT_IN_CHECK_DEFINITIONS,
  type BuiltInCheckId,
  type CheckApplicabilityBinding,
  type CustomCheckDeclaration,
  type ProjectChecks,
  type ProjectDefinition,
  type ProjectDefinitionDiagnostic,
  type ValidationResult
} from "./project-definition.ts";

const PROJECT_DEFINITION_KEYS = [
  "apiVersion",
  "checks",
  "effects",
  "operationalDependencies",
  "policies",
  "quality",
  "scheduler",
  "selectedPolicy"
] as const;

type PolicyReferenceIdentity = Readonly<{
  readonly referenceId: string;
  readonly referenceName: string;
}>;

export function validateProjectDefinition(value: unknown): ValidationResult<ProjectDefinition> {
  try {
    return validateProjectDefinitionValue(value);
  } catch {
    return invalidDefinition("definition");
  }
}

function validateProjectDefinitionValue(value: unknown): ValidationResult<ProjectDefinition> {
  const data = exactProjectDefinition(value);
  if (!data.ok) return data;
  const quality = parseQualityConfiguration(data.value.quality);
  if (quality === undefined) return invalidDefinition("definition.quality");
  const checks = parseProjectChecks(data.value.checks);
  if (checks === undefined) return invalidDefinition("definition.checks");
  const definitions = [
    ...checks.builtIn.map((checkId) => BUILT_IN_CHECK_DEFINITIONS[checkId]),
    ...checks.custom.map((custom) => custom.definition)
  ];
  const effects = parseEffects(data.value.effects);
  if (effects === undefined) return invalidDefinition("definition.effects");
  const dependencies = parseOperationalDependencies(data.value.operationalDependencies);
  if (dependencies === undefined) return invalidDefinition("definition.operationalDependencies");
  const policies = parsePolicies(data.value.policies, definitions);
  if (policies === undefined) return invalidDefinition("definition.policies");
  const scheduler = parseScheduler(data.value.scheduler);
  if (scheduler === undefined) return invalidDefinition("definition.scheduler");
  const selectedPolicy = data.value.selectedPolicy;
  if (!isSelectedPolicy(selectedPolicy, policies)) {
    return invalidDefinition("definition.selectedPolicy");
  }
  const apiVersion: ProjectDefinition["apiVersion"] = "1";
  return Object.freeze({
    ok: true,
    value: {
      apiVersion,
      checks,
      effects,
      operationalDependencies: dependencies,
      policies,
      quality,
      scheduler,
      selectedPolicy
    }
  });
}

function exactProjectDefinition(value: unknown): ValidationResult<Readonly<Record<string, unknown>>> {
  const data = exactRecord(value, PROJECT_DEFINITION_KEYS, "invalid-project-definition", "definition");
  if (!data.ok) return data;
  return data.value.apiVersion === "1"
    ? data
    : invalidDefinition("definition.apiVersion");
}

function exactRecord(
  value: unknown,
  allowedKeys: readonly string[],
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string
): ValidationResult<Readonly<Record<string, unknown>>> {
  if (!isNonArrayRecord(value)) return invalid(kind, path, "invalid-value");
  const unknownKey = Object.keys(value).find((key) => !allowedKeys.includes(key));
  if (unknownKey !== undefined) return invalid(kind, `${path}.${unknownKey}`, "unknown-key");
  return Object.freeze({ ok: true, value });
}

function parseProjectChecks(value: unknown): ProjectChecks | undefined {
  const data = exactKeys(value, ["builtIn", "custom", "schedules", "selected"]);
  if (data === undefined) return undefined;
  const arrays = parseCheckArrays(data);
  if (arrays === undefined) return undefined;
  const builtIn = parseBuiltInCheckIds(arrays.builtIn);
  if (builtIn === undefined) return undefined;
  const custom = parseCustomChecks(arrays.custom);
  if (custom === undefined) return undefined;
  const definitions = [
    ...builtIn.map((checkId) => BUILT_IN_CHECK_DEFINITIONS[checkId]),
    ...custom.map((item) => item.definition)
  ];
  if (new Set(definitions.map((definition) => definition.checkId)).size !== definitions.length) return undefined;
  const scheduleMap = resolveCheckSchedules(arrays.schedules, definitions);
  if (scheduleMap === undefined) return undefined;
  if (resolveCheckSelection(arrays.selected, definitions, scheduleMap) === undefined) return undefined;
  const schedules = Object.freeze(definitions.map((definition) => Object.freeze({
    checkId: definition.checkId,
    requiresChecks: scheduleMap.get(definition.checkId) ?? Object.freeze([])
  })));
  return Object.freeze({
    builtIn: Object.freeze(builtIn),
    custom: Object.freeze(custom),
    schedules,
    selected: Object.freeze([...arrays.selected])
  });
}

function parseCheckArrays(data: Readonly<Record<string, unknown>>) {
  if (!isUnknownArray(data.builtIn) || !isUnknownArray(data.custom)) return undefined;
  if (!isUnknownArray(data.schedules) || !isStringArray(data.selected)) return undefined;
  return Object.freeze({
    builtIn: data.builtIn,
    custom: data.custom,
    schedules: data.schedules,
    selected: data.selected
  });
}

function parseCustomChecks(value: readonly unknown[]): readonly CustomCheckDeclaration[] | undefined {
  const custom: CustomCheckDeclaration[] = [];
  for (const candidate of value) {
    const definition = parseCustomCheck(candidate);
    if (definition === undefined) return undefined;
    custom.push(definition);
  }
  return Object.freeze(custom);
}

function parseBuiltInCheckIds(value: unknown): readonly BuiltInCheckId[] | undefined {
  if (!isStringArray(value)) return undefined;
  const seen = new Set<string>();
  const builtIn: BuiltInCheckId[] = [];
  for (const checkId of value) {
    if (!isBuiltInCheckId(checkId) || seen.has(checkId)) {
      return undefined;
    }
    seen.add(checkId);
    builtIn.push(checkId);
  }
  return Object.freeze(builtIn);
}

function parseCheckDefinition(value: unknown): CheckDefinition | undefined {
  const validated = validateCheckDefinition(value);
  return validated.ok ? validated.value : undefined;
}

function parseCustomCheck(value: unknown): CustomCheckDeclaration | undefined {
  const data = exactKeys(value, ["applicability", "binding", "definition"]);
  const definition = data === undefined ? undefined : parseCheckDefinition(data.definition);
  const applicability = data === undefined || !isCheckApplicabilityBinding(data.applicability)
    ? undefined
    : data.applicability;
  const binding = data === undefined ? undefined : parseBinding(data.binding);
  return definition === undefined || applicability === undefined || binding === undefined
    ? undefined
    : Object.freeze({ definition, applicability, binding });
}

function parseBinding(value: unknown): CustomCheckDeclaration["binding"] | undefined {
  const direct = exactKeys(value, ["execute", "kind"]);
  if (direct?.kind === "direct" && isCheckExecutionBinding(direct.execute)) {
    return Object.freeze({ kind: "direct", execute: direct.execute });
  }
  const taskPlan = exactKeys(value, ["createTaskPlan", "kind"]);
  if (taskPlan?.kind === "task-plan" && isCheckTaskPlanFactory(taskPlan.createTaskPlan)) {
    return Object.freeze({ kind: "task-plan", createTaskPlan: taskPlan.createTaskPlan });
  }
  return undefined;
}

function parsePolicies(
  value: unknown,
  definitions: readonly CheckDefinition[]
): Readonly<Record<string, DecisionPolicy>> | undefined {
  if (!isNonArrayRecord(value)) return undefined;
  const catalog = Object.freeze({
    catalogFingerprint: createCatalogFingerprint(definitions).catalogFingerprint,
    definitions
  });
  const policies: Record<string, DecisionPolicy> = {};
  for (const [name, policy] of Object.entries(value)) {
    const references = policyReferences(policy);
    if (references === undefined) return undefined;
    const validated = validatePolicyResolution({ policy, references }, catalog);
    if (!validated.ok || validated.value.policy === null) return undefined;
    policies[name] = validated.value.policy;
  }
  return Object.freeze(policies);
}

function policyReferences(
  policy: unknown
): readonly PolicyReferenceIdentity[] | undefined {
  if (!isNonArrayRecord(policy) || typeof policy.policyId !== "string" || !isUnknownArray(policy.references)) {
    return undefined;
  }
  const policyId = policy.policyId;
  const referenceNames: string[] = [];
  for (const reference of policy.references) {
    if (!isNonArrayRecord(reference) || typeof reference.referenceName !== "string") return undefined;
    referenceNames.push(reference.referenceName);
  }
  return hasSingleReferenceName(referenceNames)
    ? Object.freeze(referenceNames.map((referenceName) => policyReference(policyId, referenceName)))
    : undefined;
}

function hasSingleReferenceName(referenceNames: readonly string[]): boolean {
  return new Set(referenceNames).size <= 1;
}

function policyReference(policyId: string, referenceName: string): PolicyReferenceIdentity {
  return Object.freeze({
    referenceId: `reference/v1/sha256:${createHash("sha256")
      .update(`${policyId}\u0000${referenceName}`).digest("hex")}`,
    referenceName
  });
}

function parseScheduler(value: unknown): SchedulerPolicy | undefined {
  const data = exactKeys(value, ["maxParallel"]);
  return typeof data?.maxParallel === "number" && Number.isSafeInteger(data.maxParallel)
    && data.maxParallel > 0
    ? Object.freeze({ maxParallel: data.maxParallel })
    : undefined;
}

function isBuiltInCheckId(value: string): value is BuiltInCheckId {
  return Object.hasOwn(BUILT_IN_CHECK_DEFINITIONS, value);
}

function isCheckApplicabilityBinding(value: unknown): value is CheckApplicabilityBinding {
  return typeof value === "function";
}

function isCheckExecutionBinding(value: unknown): value is CheckExecutionBinding {
  return typeof value === "function";
}

function isCheckTaskPlanFactory(value: unknown): value is CheckTaskPlanFactory {
  return typeof value === "function";
}

function isSelectedPolicy(
  selectedPolicy: unknown,
  policies: Readonly<Record<string, DecisionPolicy>>
): selectedPolicy is string | null {
  return selectedPolicy === null || (typeof selectedPolicy === "string" && Object.hasOwn(policies, selectedPolicy));
}

function exactKeys(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> | undefined {
  if (!isNonArrayRecord(value)) return undefined;
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
    ? value
    : undefined;
}

function invalidDefinition(path: string): ValidationResult<never> {
  return invalid("invalid-project-definition", path, "invalid-value");
}

function invalid(
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string,
  reason: ProjectDefinitionDiagnostic["reason"]
): ValidationResult<never> {
  return Object.freeze({ ok: false, error: Object.freeze({ kind, path, reason }) });
}

import { createHash } from "node:crypto";

import { CURRENT_PUBLIC_CONTRACT, type OperationalDependencyId } from "./current-public-contract.ts";
import { isNonArrayRecord, isStringArray, isUnknownArray } from "./foundation/src/type-guards.ts";
import {
  parseQualityConfiguration,
  type ProjectQualityConfiguration
} from "./quality-configuration.ts";
import {
  parseEffects,
  parseEffectsOverride
} from "./project-effect-validation.ts";
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
  type OperationalDependencies,
  type OperationalDependencyBinding,
  type ProjectChecks,
  type ProjectDefinition,
  type ProjectDefinitionDiagnostic,
  type RunControls,
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

const RUN_CONTROL_KEYS = [
  "changedFiles",
  "comparison",
  "effects",
  "operationalDependencies",
  "projectRoot",
  "signal"
] as const;

export function validateProjectDefinition(value: unknown): ValidationResult<ProjectDefinition> {
  try {
    return validateProjectDefinitionValue(value);
  } catch {
    return invalidDefinition("definition");
  }
}

function validateProjectDefinitionValue(value: unknown): ValidationResult<ProjectDefinition> {
  const data = exactRecord(value, PROJECT_DEFINITION_KEYS, "invalid-project-definition", "definition");
  if (!data.ok) return data;
  if (data.value.apiVersion !== "1") return invalidDefinition("definition.apiVersion");
  const quality = parseQuality(data.value.quality);
  if (quality === undefined) return invalidDefinition("definition.quality");
  const checks = parseProjectChecks(data.value.checks);
  if (checks === undefined) return invalidDefinition("definition.checks");
  const effects = parseEffects(data.value.effects);
  if (effects === undefined) return invalidDefinition("definition.effects");
  const dependencies = parseDependencies(data.value.operationalDependencies);
  if (dependencies === undefined) return invalidDefinition("definition.operationalDependencies");
  const policies = parsePolicies(data.value.policies);
  if (policies === undefined) return invalidDefinition("definition.policies");
  const definitions = [
    ...checks.builtIn.map((checkId) => BUILT_IN_CHECK_DEFINITIONS[checkId]),
    ...checks.custom.map((custom) => custom.definition)
  ];
  if (!validPolicyCatalog(policies, definitions)) {
    return invalidDefinition("definition.policies");
  }
  const scheduler = parseScheduler(data.value.scheduler);
  if (scheduler === undefined) return invalidDefinition("definition.scheduler");
  const selectedPolicy = data.value.selectedPolicy;
  if (selectedPolicy !== null && (typeof selectedPolicy !== "string" || !Object.hasOwn(policies, selectedPolicy))) {
    return invalidDefinition("definition.selectedPolicy");
  }
  return Object.freeze({
    ok: true,
    value: {
      apiVersion: "1" as const,
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

export function validateRunControls(value: unknown = {}): ValidationResult<RunControls> {
  try {
    return validateRunControlsValue(value);
  } catch {
    return invalidControls("controls");
  }
}

function validateRunControlsValue(value: unknown = {}): ValidationResult<RunControls> {
  const data = exactRecord(value, RUN_CONTROL_KEYS, "invalid-run-controls", "controls");
  if (!data.ok) return data;
  if (data.value.projectRoot !== undefined && typeof data.value.projectRoot !== "string") {
    return invalidControls("controls.projectRoot");
  }
  if (data.value.changedFiles !== undefined && !isStringArray(data.value.changedFiles)) {
    return invalidControls("controls.changedFiles");
  }
  const comparison = parseComparison(data.value.comparison);
  if (data.value.comparison !== undefined && comparison === undefined) return invalidControls("controls.comparison");
  const effects = parseEffectsOverride(data.value.effects);
  if (data.value.effects !== undefined && effects === undefined) return invalidControls("controls.effects");
  const dependencies = parseDependencies(data.value.operationalDependencies);
  if (data.value.operationalDependencies !== undefined && dependencies === undefined) {
    return invalidControls("controls.operationalDependencies");
  }
  if (data.value.signal !== undefined && !isAbortSignal(data.value.signal)) {
    return invalidControls("controls.signal");
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      ...(data.value.changedFiles === undefined ? {} : { changedFiles: Object.freeze([...data.value.changedFiles]) }),
      ...(comparison === undefined ? {} : { comparison }),
      ...(effects === undefined ? {} : { effects }),
      ...(dependencies === undefined ? {} : { operationalDependencies: dependencies }),
      ...(data.value.projectRoot === undefined ? {} : { projectRoot: data.value.projectRoot }),
      ...(data.value.signal === undefined ? {} : { signal: data.value.signal as AbortSignal })
    })
  });
}

function exactRecord<T extends readonly string[]>(
  value: unknown,
  allowedKeys: T,
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string
): ValidationResult<Readonly<Record<T[number], unknown>>> {
  if (!isNonArrayRecord(value)) return invalid(kind, path, "invalid-value");
  const unknownKey = Object.keys(value).find((key) => !allowedKeys.includes(key));
  if (unknownKey !== undefined) return invalid(kind, `${path}.${unknownKey}`, "unknown-key");
  return Object.freeze({ ok: true, value: value as Readonly<Record<T[number], unknown>> });
}

function parseQuality(value: unknown): ProjectQualityConfiguration | undefined {
  return parseQualityConfiguration(value);
}

function parseProjectChecks(value: unknown): ProjectChecks | undefined {
  const data = exactKeys(value, ["builtIn", "custom", "schedules", "selected"]);
  if (data === undefined || !isUnknownArray(data.builtIn) || !isUnknownArray(data.custom)
    || !isUnknownArray(data.schedules) || !isStringArray(data.selected)) return undefined;
  const builtIn = parseBuiltInCheckIds(data.builtIn);
  if (builtIn === undefined) return undefined;
  const custom: CustomCheckDeclaration[] = [];
  for (const candidate of data.custom) {
    const definition = parseCustomCheck(candidate);
    if (definition === undefined) return undefined;
    custom.push(definition);
  }
  const definitions = [
    ...builtIn.map((checkId) => BUILT_IN_CHECK_DEFINITIONS[checkId]),
    ...custom.map((item) => item.definition)
  ];
  if (new Set(definitions.map((definition) => definition.checkId)).size !== definitions.length) return undefined;
  const scheduleMap = resolveCheckSchedules(data.schedules, definitions);
  const selection = scheduleMap === undefined
    ? undefined
    : resolveCheckSelection(data.selected, definitions, scheduleMap);
  if (scheduleMap === undefined || selection === undefined) return undefined;
  const schedules = Object.freeze(definitions.map((definition) => Object.freeze({
    checkId: definition.checkId,
    requiresChecks: scheduleMap.get(definition.checkId) ?? Object.freeze([])
  })));
  return Object.freeze({
    builtIn: Object.freeze(builtIn),
    custom: Object.freeze(custom),
    schedules,
    selected: Object.freeze([...data.selected])
  });
}

function parseBuiltInCheckIds(value: unknown): readonly BuiltInCheckId[] | undefined {
  if (!isStringArray(value)) return undefined;
  const seen = new Set<string>();
  const builtIn: BuiltInCheckId[] = [];
  for (const checkId of value) {
    if (!Object.hasOwn(BUILT_IN_CHECK_DEFINITIONS, checkId) || seen.has(checkId)) {
      return undefined;
    }
    seen.add(checkId);
    builtIn.push(checkId as BuiltInCheckId);
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
  const applicability = data === undefined || typeof data.applicability !== "function"
    ? undefined
    : data.applicability as CheckApplicabilityBinding;
  const binding = data === undefined ? undefined : parseBinding(data.binding);
  return definition === undefined || applicability === undefined || binding === undefined
    ? undefined
    : Object.freeze({ definition, applicability, binding });
}

function parseBinding(value: unknown): CustomCheckDeclaration["binding"] | undefined {
  const direct = exactKeys(value, ["execute", "kind"]);
  if (direct?.kind === "direct" && typeof direct.execute === "function") {
    return Object.freeze({ kind: "direct", execute: direct.execute as CheckExecutionBinding });
  }
  const taskPlan = exactKeys(value, ["createTaskPlan", "kind"]);
  if (taskPlan?.kind === "task-plan" && typeof taskPlan.createTaskPlan === "function") {
    return Object.freeze({ kind: "task-plan", createTaskPlan: taskPlan.createTaskPlan as CheckTaskPlanFactory });
  }
  return undefined;
}

function parseDependencies(value: unknown): OperationalDependencies | undefined {
  if (!isNonArrayRecord(value)) return undefined;
  const identifiers = Object.keys(CURRENT_PUBLIC_CONTRACT.operationalDependencies);
  if (Object.keys(value).some((key) => !identifiers.includes(key))) return undefined;
  const resolved: Partial<Record<OperationalDependencyId, OperationalDependencyBinding>> = {};
  for (const identifier of identifiers as OperationalDependencyId[]) {
    const binding = value[identifier];
    if (binding === undefined) continue;
    const data = exactKeys(binding, ["executable"]);
    if (typeof data?.executable !== "string") return undefined;
    resolved[identifier] = Object.freeze({ executable: data.executable });
  }
  return Object.freeze(resolved);
}

function parsePolicies(value: unknown): Readonly<Record<string, DecisionPolicy>> | undefined {
  if (!isNonArrayRecord(value)) return undefined;
  if (Object.values(value).some((policy) => !isNonArrayRecord(policy))) return undefined;
  return Object.freeze({ ...value }) as Readonly<Record<string, DecisionPolicy>>;
}

function validPolicyCatalog(
  policies: Readonly<Record<string, DecisionPolicy>>,
  definitions: readonly CheckDefinition[]
): boolean {
  const catalog = Object.freeze({
    catalogFingerprint: createCatalogFingerprint(definitions).catalogFingerprint,
    definitions
  });
  for (const policy of Object.values(policies)) {
    const referenceNames = new Set(
      policy.references?.map((reference) => reference.referenceName) ?? []
    );
    if (referenceNames.size > 1) return false;
    const references = policy.references?.map((reference) => Object.freeze({
      referenceId: `reference/v1/sha256:${createHash("sha256")
        .update(`${policy.policyId}\u0000${reference.referenceName}`).digest("hex")}`,
      referenceName: reference.referenceName
    })) ?? [];
    if (!validatePolicyResolution({ policy, references }, catalog).ok) return false;
  }
  return true;
}

function parseScheduler(value: unknown): SchedulerPolicy | undefined {
  const data = exactKeys(value, ["maxParallel"]);
  return typeof data?.maxParallel === "number" && Number.isSafeInteger(data.maxParallel)
    && data.maxParallel > 0
    ? Object.freeze({ maxParallel: data.maxParallel })
    : undefined;
}

function parseComparison(value: unknown): RunControls["comparison"] | undefined {
  const data = exactKeys(value, ["referenceName", "revision"]);
  return typeof data?.referenceName === "string" && typeof data.revision === "string"
    ? Object.freeze({ referenceName: data.referenceName, revision: data.revision })
    : undefined;
}

function isAbortSignal(value: unknown): boolean {
  return isNonArrayRecord(value) && typeof value.aborted === "boolean"
    && typeof value.addEventListener === "function";
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

function invalidControls(path: string): ValidationResult<never> {
  return invalid("invalid-run-controls", path, "invalid-value");
}

function invalid(
  kind: ProjectDefinitionDiagnostic["kind"],
  path: string,
  reason: ProjectDefinitionDiagnostic["reason"]
): ValidationResult<never> {
  return Object.freeze({ ok: false, error: Object.freeze({ kind, path, reason }) });
}

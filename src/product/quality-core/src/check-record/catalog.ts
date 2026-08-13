import { createCatalogFingerprint, createDeterministicCheckRunId } from "./identity.ts";
import type { CheckDefinition, QualityRecordCandidate, RecordTypeDefinition } from "./model.ts";
import { validateCheckDefinition } from "./validation.ts";
import { resolveCheckSchedules, resolveCheckSelection } from "./check-schedule.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "./plain-record-values.ts";

const WORK_HANDLE_PATTERN = /^work-handle\/v1:[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface CheckExecutionPorts {
  readonly workHandles: readonly string[];
  readonly acknowledge: (workHandle: string) => "accepted" | "duplicate" | "rejected";
  readonly submitRecord: (
    candidate: QualityRecordCandidate
  ) => "committed" | "replayed" | "conflicted" | "rejected";
}

export type CheckExecutionBinding = (
  ports: CheckExecutionPorts
) => unknown | Promise<unknown>;

export interface TaskExecutionPorts {
  readonly workHandles: readonly string[];
  readonly submitRecord: CheckExecutionPorts["submitRecord"];
}

export interface CheckTaskPlanningInput {
  readonly definition: CheckDefinition;
  readonly checkRunId: string;
  readonly workHandles: readonly string[];
}

export type CheckTaskPlanFactory = (input: CheckTaskPlanningInput) => unknown;

export type ResolvedCheckBinding = Readonly<
  | { kind: "direct"; execute: CheckExecutionBinding }
  | { kind: "task-plan"; createTaskPlan: CheckTaskPlanFactory }
>;

export interface ResolvedCheck {
  readonly definition: CheckDefinition;
  readonly binding: ResolvedCheckBinding;
  readonly checkRunId: string;
  readonly requiresChecks: readonly string[];
  readonly selection: "selected" | "unselected";
  readonly applicability: "applicable" | "not-applicable" | null;
  readonly workHandles: readonly string[];
}

export interface ResolvedCheckCatalog {
  readonly catalogFingerprint: string;
  readonly definitions: readonly CheckDefinition[];
  readonly checks: readonly ResolvedCheck[];
}

export type CatalogResolutionStage =
  | "catalog"
  | "bindings"
  | "schedule"
  | "selection"
  | "applicability";

export type CatalogResolutionResult = Readonly<
  | { ok: true; value: ResolvedCheckCatalog }
  | {
    ok: false;
    error: Readonly<{
      kind: "catalog-resolution-failed";
      stage: CatalogResolutionStage;
    }>;
  }
>;

function failed(stage: CatalogResolutionStage): CatalogResolutionResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ kind: "catalog-resolution-failed", stage })
  });
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function ownData(
  value: unknown,
  expectedKeys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  const keys = Object.keys(data);
  return keys.length === expectedKeys.length && keys.every((key) => expectedKeys.includes(key))
    ? data
    : undefined;
}

function resolveDefinitions(value: unknown): readonly CheckDefinition[] | undefined {
  const candidates = snapshotClosedArray(value);
  if (candidates === undefined) return undefined;
  const definitions: CheckDefinition[] = [];
  const checkIds = new Set<string>();
  for (const candidate of candidates) {
    let validated: ReturnType<typeof validateCheckDefinition>;
    try {
      validated = validateCheckDefinition(candidate);
    } catch {
      return undefined;
    }
    if (!validated.ok || checkIds.has(validated.value.checkId)) {
      return undefined;
    }
    checkIds.add(validated.value.checkId);
    definitions.push(validated.value);
  }
  definitions.sort((left, right) => compareText(left.checkId, right.checkId));
  return Object.freeze(definitions);
}

function resolveBindingEntry(
  candidate: unknown,
  knownCheckIds: ReadonlySet<string>
): readonly [string, ResolvedCheckBinding] | undefined {
  const direct = ownData(candidate, ["checkId", "execute"]);
  if (typeof direct?.checkId === "string" && knownCheckIds.has(direct.checkId)
    && typeof direct.execute === "function") {
    return [direct.checkId, Object.freeze({
      kind: "direct",
      execute: direct.execute as CheckExecutionBinding
    })];
  }
  const taskPlan = ownData(candidate, ["checkId", "createTaskPlan"]);
  if (typeof taskPlan?.checkId !== "string" || !knownCheckIds.has(taskPlan.checkId)
    || typeof taskPlan.createTaskPlan !== "function") return undefined;
  return [taskPlan.checkId, Object.freeze({
    kind: "task-plan",
    createTaskPlan: taskPlan.createTaskPlan as CheckTaskPlanFactory
  })];
}

function resolveBindings(
  value: unknown,
  definitions: readonly CheckDefinition[]
): ReadonlyMap<string, ResolvedCheckBinding> | undefined {
  const candidates = snapshotClosedArray(value);
  if (candidates === undefined) return undefined;
  const knownCheckIds = new Set(definitions.map((definition) => definition.checkId));
  const bindings = new Map<string, ResolvedCheckBinding>();
  for (const candidate of candidates) {
    const entry = resolveBindingEntry(candidate, knownCheckIds);
    if (entry === undefined || bindings.has(entry[0])) return undefined;
    bindings.set(...entry);
  }
  return bindings.size === definitions.length ? bindings : undefined;
}

function resolveApplicability(value: unknown): Readonly<{
  applicability: "applicable" | "not-applicable";
  workHandles: readonly string[];
}> | undefined {
  const notApplicable = ownData(value, ["status"]);
  if (notApplicable?.status === "not-applicable") {
    return Object.freeze({ applicability: "not-applicable", workHandles: Object.freeze([]) });
  }
  const applicable = ownData(value, ["status", "workHandles"]);
  const handleItems = applicable === undefined
    ? undefined
    : snapshotClosedArray(applicable.workHandles);
  if (applicable?.status !== "applicable" || handleItems === undefined) {
    return undefined;
  }
  const workHandles: string[] = [];
  const seen = new Set<string>();
  for (const workHandle of handleItems) {
    if (typeof workHandle !== "string" || !WORK_HANDLE_PATTERN.test(workHandle)
      || seen.has(workHandle)) {
      return undefined;
    }
    seen.add(workHandle);
    workHandles.push(workHandle);
  }
  workHandles.sort();
  return Object.freeze({
    applicability: "applicable",
    workHandles: Object.freeze(workHandles)
  });
}

function requiredChecksFor(
  schedules: ReadonlyMap<string, readonly string[]>,
  checkId: string
): readonly string[] {
  const requiredChecks = schedules.get(checkId);
  if (requiredChecks === undefined) {
    throw new TypeError(`Resolved Check schedule is missing: ${checkId}`);
  }
  return requiredChecks;
}

export function resolveCheckCatalog(input: Readonly<{
  invocationKey: string;
  definitions: unknown;
  bindings: unknown;
  schedules: unknown;
  selectedCheckIds: unknown;
  resolveApplicability: (definition: CheckDefinition) => unknown;
}>): CatalogResolutionResult {
  const definitions = resolveDefinitions(input.definitions);
  if (definitions === undefined || typeof input.invocationKey !== "string"
    || input.invocationKey.length === 0) {
    return failed("catalog");
  }
  const bindings = resolveBindings(input.bindings, definitions);
  if (bindings === undefined) {
    return failed("bindings");
  }
  const schedules = resolveCheckSchedules(input.schedules, definitions);
  if (schedules === undefined) {
    return failed("schedule");
  }
  const selectedCheckIds = resolveCheckSelection(input.selectedCheckIds, definitions, schedules);
  if (selectedCheckIds === undefined || typeof input.resolveApplicability !== "function") {
    return failed("selection");
  }

  const ownedWorkHandles = new Set<string>();
  const checks: ResolvedCheck[] = [];
  for (const definition of definitions) {
    const binding = bindings.get(definition.checkId);
    if (binding === undefined) {
      return failed("bindings");
    }
    const checkRunId = createDeterministicCheckRunId({
      invocationKey: input.invocationKey,
      checkId: definition.checkId
    });
    if (!selectedCheckIds.has(definition.checkId)) {
      checks.push(Object.freeze({
        definition,
        binding,
        checkRunId,
        requiresChecks: requiredChecksFor(schedules, definition.checkId),
        selection: "unselected",
        applicability: null,
        workHandles: Object.freeze([])
      }));
      continue;
    }

    let applicability: ReturnType<typeof resolveApplicability>;
    try {
      applicability = resolveApplicability(input.resolveApplicability(definition));
    } catch {
      return failed("applicability");
    }
    if (applicability === undefined
      || applicability.workHandles.some((workHandle) => ownedWorkHandles.has(workHandle))) {
      return failed("applicability");
    }
    for (const workHandle of applicability.workHandles) {
      ownedWorkHandles.add(workHandle);
    }
    checks.push(Object.freeze({
      definition,
      binding,
      checkRunId,
      requiresChecks: requiredChecksFor(schedules, definition.checkId),
      selection: "selected",
      applicability: applicability.applicability,
      workHandles: applicability.workHandles
    }));
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      catalogFingerprint: createCatalogFingerprint(definitions).catalogFingerprint,
      definitions,
      checks: Object.freeze(checks)
    })
  });
}

export function resolveRecordTypeDefinition(
  catalog: ResolvedCheckCatalog,
  checkId: string,
  recordTypeId: string
): RecordTypeDefinition | undefined {
  return catalog.definitions
    .find((definition) => definition.checkId === checkId)
    ?.recordTypes.find((recordType) => recordType.recordTypeId === recordTypeId);
}

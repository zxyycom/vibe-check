import { createCatalogFingerprint, createDeterministicCheckRunId } from "./identity.ts";
import type { CheckDefinition, QualityRecordCandidate, RecordTypeDefinition } from "./model.ts";
import { validateCheckDefinition } from "./validation.ts";

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

export interface ResolvedCheck {
  readonly definition: CheckDefinition;
  readonly binding: CheckExecutionBinding;
  readonly checkRunId: string;
  readonly selection: "selected" | "unselected";
  readonly applicability: "applicable" | "not-applicable" | null;
  readonly workHandles: readonly string[];
}

export interface ResolvedCheckCatalog {
  readonly catalogFingerprint: string;
  readonly definitions: readonly CheckDefinition[];
  readonly checks: readonly ResolvedCheck[];
}

type CatalogResolutionStage = "catalog" | "bindings" | "selection" | "applicability";

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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function ownData(
  value: unknown,
  expectedKeys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  try {
    if (!isPlainRecord(value)) {
      return undefined;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Readonly<
      Record<string, PropertyDescriptor>
    >;
    if (Object.values(descriptors).some((descriptor) => (
      descriptor.get !== undefined || descriptor.set !== undefined
    ))) {
      return undefined;
    }
    const keys = Object.keys(descriptors).filter((key) => descriptors[key]!.enumerable === true);
    if (keys.length !== expectedKeys.length || keys.some((key) => !expectedKeys.includes(key))) {
      return undefined;
    }
    return Object.fromEntries(keys.map((key) => [key, descriptors[key]!.value as unknown]));
  } catch {
    return undefined;
  }
}

function resolveDefinitions(value: unknown): readonly CheckDefinition[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const definitions: CheckDefinition[] = [];
  const checkIds = new Set<string>();
  for (const candidate of value as readonly unknown[]) {
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

function resolveBindings(
  value: unknown,
  definitions: readonly CheckDefinition[]
): ReadonlyMap<string, CheckExecutionBinding> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const knownCheckIds = new Set(definitions.map((definition) => definition.checkId));
  const bindings = new Map<string, CheckExecutionBinding>();
  for (const candidate of value as readonly unknown[]) {
    const data = ownData(candidate, ["checkId", "execute"]);
    if (data === undefined || typeof data.checkId !== "string"
      || !knownCheckIds.has(data.checkId) || typeof data.execute !== "function"
      || bindings.has(data.checkId)) {
      return undefined;
    }
    bindings.set(data.checkId, data.execute as CheckExecutionBinding);
  }
  return bindings.size === definitions.length ? bindings : undefined;
}

function resolveSelection(
  value: unknown,
  definitions: readonly CheckDefinition[]
): ReadonlySet<string> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const knownCheckIds = new Set(definitions.map((definition) => definition.checkId));
  const selectedCheckIds = new Set<string>();
  for (const checkId of value as readonly unknown[]) {
    if (typeof checkId !== "string" || !knownCheckIds.has(checkId)
      || selectedCheckIds.has(checkId)) {
      return undefined;
    }
    selectedCheckIds.add(checkId);
  }
  return selectedCheckIds;
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
  if (applicable?.status !== "applicable" || !Array.isArray(applicable.workHandles)) {
    return undefined;
  }
  const workHandles: string[] = [];
  const seen = new Set<string>();
  for (const workHandle of applicable.workHandles as readonly unknown[]) {
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

export function resolveCheckCatalog(input: Readonly<{
  invocationKey: string;
  definitions: unknown;
  bindings: unknown;
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
  const selectedCheckIds = resolveSelection(input.selectedCheckIds, definitions);
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

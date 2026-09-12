import type { CheckDescriptor } from "../../check/descriptor.ts";
import type {
  Check,
  CheckFlagEnablement,
  CheckPreflight,
  CheckVisibility
} from "../../check/check.ts";
import type { HandoffProviderIdentity } from "../../check/handoff-provider-identity.ts";
import {
  parseCheckTreeAuthoring,
  type MeaninglessCheckWarning,
  type ParsedCheck,
  type ParsedCheckCollection,
  type ParsedCheckTree
} from "./authoring.ts";
import { EMPTY_RESOURCE_UNIT_MAPPING, type ResourceUnitMapping } from "../resource-unit-mapping.ts";

export type { Check, InheritableCheckCollection } from "../../check/check.ts";

export interface ResolvedCheckTreeLeaf {
  readonly admissionPriority: number;
  readonly definition: CheckDescriptor;
  readonly dependsOn: readonly string[];
  readonly enabledByFlags?: CheckFlagEnablement;
  readonly execution: NonNullable<Check["execution"]>;
  readonly handoff?: HandoffProviderIdentity;
  readonly maxParallel: number;
  readonly mutex: readonly string[];
  readonly observes: readonly string[];
  readonly options: object;
  readonly preflight?: CheckPreflight;
  readonly resourceClaims: ResourceUnitMapping;
  readonly visibility: CheckVisibility;
}

export interface ResolvedCheckTree {
  readonly leaves: readonly ResolvedCheckTreeLeaf[];
  readonly warnings: readonly MeaninglessCheckWarning[];
}

interface InheritedScheduling {
  readonly admissionPriority: number;
  readonly dependsOn: readonly string[];
  readonly maxParallel: number;
  readonly mutex: readonly string[];
  readonly observes: readonly string[];
  readonly resourceClaims: ResourceUnitMapping;
}

/**
 * Traverses the recursive authoring tree. Containment only passes scheduling
 * values to descendants; it never creates an execution dependency or output
 * hierarchy.
 */
export function resolveCheckTree(
  value: unknown,
  rootMaxParallel: number,
  resourceCapacities: ResourceUnitMapping = EMPTY_RESOURCE_UNIT_MAPPING
): ResolvedCheckTree | undefined {
  const parsed = parseCheckTreeAuthoring(value);
  return parsed === undefined
    ? undefined
    : resolveParsedCheckTree(parsed, rootMaxParallel, resourceCapacities);
}

export function resolveParsedCheckTree(
  parsed: ParsedCheckTree,
  rootMaxParallel: number,
  resourceCapacities: ResourceUnitMapping = EMPTY_RESOURCE_UNIT_MAPPING
): ResolvedCheckTree | undefined {
  if (!Number.isSafeInteger(rootMaxParallel) || rootMaxParallel <= 0) return undefined;
  const leaves: ResolvedCheckTreeLeaf[] = [];
  const root: InheritedScheduling = Object.freeze({
    admissionPriority: 0,
    dependsOn: Object.freeze([]),
    maxParallel: rootMaxParallel,
    mutex: Object.freeze([]),
    observes: Object.freeze([]),
    resourceClaims: EMPTY_RESOURCE_UNIT_MAPPING
  });
  for (const check of parsed.checks) {
    if (!flattenCheck(check, root, resourceCapacities, leaves)) return undefined;
  }
  return Object.freeze({ leaves: Object.freeze(leaves), warnings: parsed.warnings });
}

function flattenCheck(
  check: ParsedCheck,
  inherited: InheritedScheduling,
  resourceCapacities: ResourceUnitMapping,
  leaves: ResolvedCheckTreeLeaf[]
): boolean {
  const scheduling = resolveScheduling(check, inherited);
  if (!claimsFitCapacities(scheduling.resourceClaims, resourceCapacities)) return false;
  const leaf = resolvedLeafFor(check, scheduling);
  if (leaf !== undefined) leaves.push(leaf);
  for (const child of check.checks) {
    if (!flattenCheck(child, scheduling, resourceCapacities, leaves)) return false;
  }
  return true;
}

function resolveScheduling(
  check: ParsedCheck,
  inherited: InheritedScheduling
): InheritedScheduling {
  return Object.freeze({
    admissionPriority: check.admissionPriority ?? inherited.admissionPriority,
    dependsOn: resolveCollection(inherited.dependsOn, check.dependsOn),
    maxParallel: check.maxParallel ?? inherited.maxParallel,
    mutex: resolveCollection(inherited.mutex, check.mutex),
    observes: resolveCollection(inherited.observes, check.observes),
    resourceClaims: check.resourceClaims ?? inherited.resourceClaims
  });
}

function resolvedLeafFor(
  check: ParsedCheck,
  scheduling: InheritedScheduling
): ResolvedCheckTreeLeaf | undefined {
  const visibility = check.visibility;
  if (
    check.execution !== null &&
    check.definition !== null &&
    check.options !== null &&
    visibility !== null
  ) {
    return Object.freeze({
      admissionPriority: scheduling.admissionPriority,
      definition: check.definition,
      dependsOn: scheduling.dependsOn,
      ...(check.enabledByFlags === null ? {} : { enabledByFlags: check.enabledByFlags }),
      execution: check.execution,
      ...(check.handoff === null ? {} : { handoff: check.handoff }),
      maxParallel: scheduling.maxParallel,
      mutex: scheduling.mutex,
      observes: scheduling.observes,
      options: check.options,
      ...(check.preflight === null ? {} : { preflight: check.preflight }),
      resourceClaims: scheduling.resourceClaims,
      visibility
    });
  }
  return undefined;
}

function claimsFitCapacities(
  claims: ResourceUnitMapping,
  capacities: ResourceUnitMapping
): boolean {
  return Object.entries(claims).every(
    ([resourceId, units]) =>
      Object.hasOwn(capacities, resourceId) && units <= (capacities[resourceId] ?? 0)
  );
}

function resolveCollection(
  inherited: readonly string[],
  authored: ParsedCheckCollection | undefined
): readonly string[] {
  if (authored === undefined) return inherited;
  if (authored.kind === "exact") return canonicalize(authored.values);
  const removed = new Set(authored.remove);
  return canonicalize([...inherited.filter((value) => !removed.has(value)), ...authored.add]);
}

function canonicalize(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

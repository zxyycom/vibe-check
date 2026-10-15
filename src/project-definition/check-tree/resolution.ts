import type { CheckDescriptor } from "../../check/descriptor.ts";
import type { Check, CheckPreparation, CheckFlagEnablement } from "../../check/check.ts";
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
  readonly execute: NonNullable<Check["execute"]>;
  readonly handoff?: HandoffProviderIdentity;
  readonly maxParallel: number;
  readonly mutex: readonly string[];
  readonly observes: readonly string[];
  readonly options: object;
  readonly prepare?: CheckPreparation;
  readonly resourceClaims: ResourceUnitMapping;
  readonly omitQuietPassedRow: boolean;
}

export interface ResolvedCheckTree {
  readonly leaves: readonly ResolvedCheckTreeLeaf[];
  readonly warnings: readonly MeaninglessCheckWarning[];
}

interface InheritedScheduling {
  readonly admissionPriority: number;
  readonly maxParallel: number;
  readonly resourceClaims: ResourceUnitMapping;
}

interface SchedulingCollections {
  readonly dependsOn: ScopedCollection;
  readonly mutex: ScopedCollection;
  readonly observes: ScopedCollection;
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
  const collections: SchedulingCollections = {
    dependsOn: new ScopedCollection(),
    mutex: new ScopedCollection(),
    observes: new ScopedCollection()
  };
  const root: InheritedScheduling = Object.freeze({
    admissionPriority: 0,
    maxParallel: rootMaxParallel,
    resourceClaims: EMPTY_RESOURCE_UNIT_MAPPING
  });
  for (const check of parsed.checks) {
    if (!flattenCheck(check, root, collections, resourceCapacities, leaves)) return undefined;
  }
  return Object.freeze({ leaves: Object.freeze(leaves), warnings: parsed.warnings });
}

function flattenCheck(
  check: ParsedCheck,
  inherited: InheritedScheduling,
  collections: SchedulingCollections,
  resourceCapacities: ResourceUnitMapping,
  leaves: ResolvedCheckTreeLeaf[]
): boolean {
  const scheduling = resolveScheduling(check, inherited);
  if (!claimsFitCapacities(scheduling.resourceClaims, resourceCapacities)) return false;
  const restoreDependsOn = collections.dependsOn.enter(check.dependsOn);
  const restoreMutex = collections.mutex.enter(check.mutex);
  const restoreObserves = collections.observes.enter(check.observes);
  try {
    const leaf = resolvedLeafFor(check, scheduling, collections);
    if (leaf !== undefined) leaves.push(leaf);
    for (const child of check.checks) {
      if (!flattenCheck(child, scheduling, collections, resourceCapacities, leaves)) return false;
    }
    return true;
  } finally {
    restoreObserves?.();
    restoreMutex?.();
    restoreDependsOn?.();
  }
}

function resolveScheduling(
  check: ParsedCheck,
  inherited: InheritedScheduling
): InheritedScheduling {
  return Object.freeze({
    admissionPriority: check.admissionPriority ?? inherited.admissionPriority,
    maxParallel: check.maxParallel ?? inherited.maxParallel,
    resourceClaims: check.resourceClaims ?? inherited.resourceClaims
  });
}

function resolvedLeafFor(
  check: ParsedCheck,
  scheduling: InheritedScheduling,
  collections: SchedulingCollections
): ResolvedCheckTreeLeaf | undefined {
  const omitQuietPassedRow = check.omitQuietPassedRow;
  if (
    check.execute !== null &&
    check.definition !== null &&
    check.options !== null &&
    omitQuietPassedRow !== null
  ) {
    return Object.freeze({
      admissionPriority: scheduling.admissionPriority,
      definition: check.definition,
      dependsOn: collections.dependsOn.snapshot(),
      ...(check.enabledByFlags === null ? {} : { enabledByFlags: check.enabledByFlags }),
      execute: check.execute,
      ...(check.handoff === null ? {} : { handoff: check.handoff }),
      maxParallel: scheduling.maxParallel,
      mutex: collections.mutex.snapshot(),
      observes: collections.observes.snapshot(),
      options: check.options,
      ...(check.prepare === null ? {} : { prepare: check.prepare }),
      resourceClaims: scheduling.resourceClaims,
      omitQuietPassedRow
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

/** One traversal owns mutations; exiting a node restores the exact parent scope. */
class ScopedCollection {
  #values = new Set<string>();
  #snapshot: readonly string[] | undefined;

  snapshot(): readonly string[] {
    this.#snapshot ??= Object.freeze([...this.#values].sort());
    return this.#snapshot;
  }

  enter(authored: ParsedCheckCollection | undefined): (() => void) | undefined {
    if (authored === undefined) return undefined;
    const previousSnapshot = this.#snapshot;
    if (authored.kind === "exact") {
      const previousValues = this.#values;
      this.#values = new Set(authored.values);
      this.#snapshot = undefined;
      return () => {
        this.#values = previousValues;
        this.#snapshot = previousSnapshot;
      };
    }
    const removed: string[] = [];
    const added: string[] = [];
    for (const value of authored.remove) {
      if (this.#values.delete(value)) removed.push(value);
    }
    for (const value of authored.add) {
      if (!this.#values.has(value)) {
        this.#values.add(value);
        added.push(value);
      }
    }
    if (removed.length === 0 && added.length === 0) return undefined;
    this.#snapshot = undefined;
    return () => {
      for (const value of added) this.#values.delete(value);
      for (const value of removed) this.#values.add(value);
      this.#snapshot = previousSnapshot;
    };
  }
}

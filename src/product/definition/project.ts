import { createHash } from "node:crypto";

import {
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  type BuiltInCheck,
  type BuiltInCheckId,
  type BuiltInCheckOptions,
  type BuiltInCheckOptionsById
} from "./built-ins.ts";
import { append, replace } from "./adjustments.ts";
import {
  resolveCheckTree,
  type CheckApplicabilityBinding,
  type CheckGroup,
  type CheckNode,
  type CheckScheduling,
  type CustomCheck,
  type CustomCheckBinding,
  type ResolvedCheckTree
} from "./check-tree/index.ts";
import {
  CURRENT_PUBLIC_CONTRACT,
  OPERATIONAL_DEPENDENCY_IDS,
  type OperationalDependencyId
} from "../public-contract/current.ts";
import { isNonArrayRecord } from "../foundation/type-guards.ts";
import type { CheckDefinition } from "../quality-core/check-record/model.ts";
import type { DecisionPolicy } from "../quality-core/check-record/policy-model.ts";
import type { SchedulerPolicy } from "../quality-core/check-record/task-orchestrator.ts";
import {
  NEUTRAL_QUALITY_CONFIGURATION,
  type ProjectQualityConfiguration
} from "./quality.ts";

export {
  append,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  replace,
  type BuiltInCheck,
  type CheckApplicabilityBinding,
  type CheckGroup,
  type CheckNode,
  type CheckScheduling,
  type CustomCheck,
  type CustomCheckBinding
};

export type { BuiltInCheckId };

export interface CheckSchedule {
  readonly checkId: string;
  readonly requiresChecks: readonly string[];
}

export interface ProjectEffects {
  readonly cache: Readonly<{ readonly directory: string; readonly enabled: boolean }>;
  readonly logs: Readonly<{ readonly enabled: boolean }>;
  readonly output: Readonly<{ readonly directory: string; readonly enabled: boolean }>;
  readonly progress: Readonly<{ readonly enabled: boolean }>;
}

export interface OperationalDependencyBinding {
  readonly executable?: string;
}

export type OperationalDependencies = Readonly<
  Partial<Record<OperationalDependencyId, OperationalDependencyBinding>>
>;

export interface ProjectDefinition {
  readonly apiVersion: "1";
  readonly checks: readonly CheckNode[];
  readonly effects: ProjectEffects;
  readonly operationalDependencies: OperationalDependencies;
  readonly policies: Readonly<Record<string, DecisionPolicy>>;
  readonly quality: ProjectQualityConfiguration;
  readonly scheduler: SchedulerPolicy;
  readonly selectedPolicy: string | null;
}

type ProjectDefinitionInput = Readonly<{
  apiVersion?: "1";
  checks?: readonly CheckNode[];
  effects?: Partial<{
    cache: Partial<ProjectEffects["cache"]>;
    logs: Partial<ProjectEffects["logs"]>;
    output: Partial<ProjectEffects["output"]>;
    progress: Partial<ProjectEffects["progress"]>;
  }>;
  operationalDependencies?: OperationalDependencies;
  policies?: Readonly<Record<string, DecisionPolicy>>;
  quality?: ProjectQualityConfiguration;
  scheduler?: Partial<SchedulerPolicy>;
  selectedPolicy?: string | null;
}>;

export interface RunControls {
  readonly changedFiles?: readonly string[];
  readonly comparison?: Readonly<{ readonly referenceName: string; readonly revision: string }>;
  readonly effects?: Partial<{
    cache: Partial<ProjectEffects["cache"]>;
    logs: Partial<ProjectEffects["logs"]>;
    output: Partial<ProjectEffects["output"]>;
    progress: Partial<ProjectEffects["progress"]>;
  }>;
  readonly operationalDependencies?: OperationalDependencies;
  readonly projectRoot?: string;
  readonly signal?: AbortSignal;
}

export interface ProjectDefinitionDiagnostic {
  readonly kind: "invalid-project-definition" | "invalid-run-controls"
    | "invalid-scanner-operational-input";
  readonly path: string;
  readonly reason: "invalid-value" | "unknown-key";
}

export type ValidationResult<T> = Readonly<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ProjectDefinitionDiagnostic }
>;

export interface DeclarativeProjectSnapshot {
  readonly apiVersion: "1";
  readonly checks: Readonly<{
    readonly definitions: readonly CheckDefinition[];
    readonly maxParallel: readonly Readonly<{ readonly checkId: string; readonly maxParallel: number }>[];
    readonly mutexes: readonly Readonly<{ readonly checkId: string; readonly mutex: readonly string[] }>[];
    readonly options: readonly Readonly<{ readonly checkId: BuiltInCheckId; readonly options: BuiltInCheckOptions }>[];
    readonly schedules: readonly CheckSchedule[];
    readonly selected: readonly string[];
  }>;
  readonly effects: ProjectEffects;
  readonly operationalDependencyIds: readonly OperationalDependencyId[];
  readonly policyNames: readonly string[];
  readonly quality: ProjectQualityConfiguration;
  readonly scheduler: SchedulerPolicy;
  readonly selectedPolicy: string | null;
}

export interface CustomCheckExecutionBinding {
  readonly applicability: CheckApplicabilityBinding;
  readonly binding: CustomCheckBinding;
}

export interface ProjectExecutionBindings {
  readonly customChecks: ReadonlyMap<string, CustomCheckExecutionBinding>;
}

export interface NormalizedProjectDefinition {
  readonly builtInOptions: Readonly<Partial<BuiltInCheckOptionsById>>;
  readonly checkMaxParallelById: Readonly<Record<string, number>>;
  readonly declarative: DeclarativeProjectSnapshot;
  readonly bindings: ProjectExecutionBindings;
}

/**
 * Defines a plain Project Definition. Defaults are authoring conveniences only;
 * Package Run validates the closed tree before any project function can run.
 */
export function defineConfig<const T extends ProjectDefinitionInput>(
  value: T & Record<Exclude<keyof T, keyof ProjectDefinitionInput>, never>
): ProjectDefinition {
  return {
    apiVersion: value.apiVersion ?? "1",
    checks: value.checks ?? [],
    effects: {
      cache: {
        directory: value.effects?.cache?.directory
          ?? CURRENT_PUBLIC_CONTRACT.effectDefaults.cache.directory,
        enabled: value.effects?.cache?.enabled
          ?? CURRENT_PUBLIC_CONTRACT.effectDefaults.cache.enabled
      },
      logs: {
        enabled: value.effects?.logs?.enabled
          ?? CURRENT_PUBLIC_CONTRACT.effectDefaults.logs.enabled
      },
      output: {
        directory: value.effects?.output?.directory
          ?? CURRENT_PUBLIC_CONTRACT.effectDefaults.output.directory,
        enabled: value.effects?.output?.enabled
          ?? CURRENT_PUBLIC_CONTRACT.effectDefaults.output.enabled
      },
      progress: {
        enabled: value.effects?.progress?.enabled
          ?? CURRENT_PUBLIC_CONTRACT.effectDefaults.progress.enabled
      }
    },
    operationalDependencies: value.operationalDependencies ?? {},
    policies: value.policies ?? {},
    quality: value.quality ?? NEUTRAL_QUALITY_CONFIGURATION,
    scheduler: { maxParallel: value.scheduler?.maxParallel ?? 4 },
    selectedPolicy: value.selectedPolicy ?? null
  };
}

export function normalizeProjectDefinition(
  definition: ProjectDefinition
): NormalizedProjectDefinition {
  const tree = resolveCheckTree(definition.checks, definition.scheduler.maxParallel);
  if (tree === undefined) throw new TypeError("Project Definition Check tree failed closed normalization");
  return normalizeResolvedTree(definition, tree);
}

function normalizeResolvedTree(
  definition: ProjectDefinition,
  tree: ResolvedCheckTree
): NormalizedProjectDefinition {
  const customChecks = new Map<string, CustomCheckExecutionBinding>(tree.customBindings);
  const checkMaxParallelById = Object.freeze(Object.fromEntries(tree.leaves.map((leaf) => (
    [leaf.definition.checkId, leaf.maxParallel] as const
  ))));
  const builtInOptions: { -readonly [Id in keyof BuiltInCheckOptionsById]?: BuiltInCheckOptionsById[Id] } = {};
  for (const leaf of tree.leaves) {
    const builtIn = leaf.builtIn;
    if (builtIn?.checkId === "duplicate-detection") {
      builtInOptions[builtIn.checkId] = builtIn.options;
    } else if (builtIn?.checkId === "file-metrics") {
      builtInOptions[builtIn.checkId] = builtIn.options;
    } else if (builtIn?.checkId === "function-metrics") {
      builtInOptions[builtIn.checkId] = builtIn.options;
    }
  }
  return Object.freeze({
    bindings: Object.freeze({ customChecks }),
    builtInOptions: Object.freeze(builtInOptions),
    checkMaxParallelById,
    declarative: freezeDeclarativeSnapshot(definition, tree)
  });
}

export function createDeclarativeFingerprint(snapshot: DeclarativeProjectSnapshot): string {
  return createHash("sha256").update(stableJson(snapshot)).digest("hex");
}

function freezeDeclarativeSnapshot(
  definition: ProjectDefinition,
  tree: ResolvedCheckTree
): DeclarativeProjectSnapshot {
  const leaves = [...tree.leaves].sort((left, right) => (
    compareText(left.definition.checkId, right.definition.checkId)
  ));
  return deepFreeze({
    apiVersion: definition.apiVersion,
    checks: {
      definitions: leaves.map((leaf) => leaf.definition),
      maxParallel: leaves.map((leaf) => ({
        checkId: leaf.definition.checkId,
        maxParallel: leaf.maxParallel
      })),
      mutexes: leaves.map((leaf) => ({
        checkId: leaf.definition.checkId,
        mutex: [...leaf.mutex].sort()
      })),
      options: leaves.flatMap((leaf) => leaf.builtIn === null
        ? []
        : [{ checkId: leaf.builtIn.checkId, options: leaf.builtIn.options }]),
      schedules: leaves.map((leaf) => ({
        checkId: leaf.definition.checkId,
        requiresChecks: [...leaf.dependsOn].sort()
      })),
      selected: leaves.map((leaf) => leaf.definition.checkId)
    },
    effects: definition.effects,
    operationalDependencyIds: Object.freeze(OPERATIONAL_DEPENDENCY_IDS.filter(
      (dependencyId) => definition.operationalDependencies[dependencyId] !== undefined
    )),
    policyNames: Object.freeze(Object.keys(definition.policies).sort()),
    quality: definition.quality,
    scheduler: definition.scheduler,
    selectedPolicy: definition.selectedPolicy
  });
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isNonArrayRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

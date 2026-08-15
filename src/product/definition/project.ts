import { createHash } from "node:crypto";

import {
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  type BuiltInCheck,
  type BuiltInCheckId,
  type BuiltInCheckOptions
} from "./built-ins.ts";
import { append, replace } from "./adjustments.ts";
import {
  resolveCheckTree,
  type CheckGroup,
  type CheckNode,
  type CheckScheduling,
  type CustomCheck,
  type ResolvedCheckTree
} from "./check-tree/index.ts";
import type { CheckDefinition } from "./check-definition.ts";
import type {
  CheckApplicabilityBinding,
  CheckPlanningContext,
  CheckResult,
  CustomCheckBinding,
  QualityRecordCandidate,
  TaskPlan
} from "./custom-check.ts";
import {
  CURRENT_PUBLIC_CONTRACT,
  OPERATIONAL_DEPENDENCY_IDS,
  type OperationalDependencyId
} from "../public-contract/current.ts";
import { isNonArrayRecord } from "../foundation/type-guards.ts";
import type { DecisionPolicy } from "../quality-core/check-record/policy-model.ts";
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
  type CheckDefinition,
  type CheckApplicabilityBinding,
  type CheckGroup,
  type CheckNode,
  type CheckScheduling,
  type CustomCheck,
  type CustomCheckBinding,
  type CheckPlanningContext,
  type CheckResult,
  type QualityRecordCandidate,
  type TaskPlan
};

export type { BuiltInCheckId };

export interface ProjectEffects {
  readonly cache: Readonly<{ readonly directory: string; readonly enabled: boolean }>;
  readonly logs: Readonly<{ readonly enabled: boolean }>;
  readonly output: Readonly<{ readonly directory: string; readonly enabled: boolean }>;
  readonly progress: Readonly<{ readonly enabled: boolean }>;
}

export interface OperationalDependencyBinding {
  readonly executable?: string;
}

/** Invocation-wide authoring budget; Task engine representation remains private. */
export interface SchedulerPolicy {
  readonly maxParallel: number;
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
  /** Canonically ordered selected leaves; this is the only declarative Check collection. */
  readonly checks: readonly NormalizedCheck[];
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

interface NormalizedCheckBase {
  readonly definition: CheckDefinition;
  readonly dependsOn: readonly string[];
  readonly maxParallel: number;
  readonly mutex: readonly string[];
}

export type NormalizedCheck = Readonly<
  | (NormalizedCheckBase & {
    readonly kind: "built-in";
    readonly options: BuiltInCheckOptions;
  })
  | (NormalizedCheckBase & { readonly kind: "custom" })
>;

export interface NormalizedProjectDefinition {
  readonly declarative: DeclarativeProjectSnapshot;
  /** Non-serializable custom functions, consumed only by Package Run pre-work. */
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
  return Object.freeze({
    bindings: Object.freeze({ customChecks }),
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
    checks: leaves.map((leaf): NormalizedCheck => leaf.builtIn === null
      ? {
        kind: "custom",
        definition: leaf.definition,
        dependsOn: [...leaf.dependsOn].sort(),
        maxParallel: leaf.maxParallel,
        mutex: [...leaf.mutex].sort()
      }
      : {
        kind: "built-in",
        definition: leaf.definition,
        dependsOn: [...leaf.dependsOn].sort(),
        maxParallel: leaf.maxParallel,
        mutex: [...leaf.mutex].sort(),
        options: leaf.builtIn.options
      }),
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
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
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

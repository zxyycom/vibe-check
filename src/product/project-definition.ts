import { createHash } from "node:crypto";

import { CURRENT_PUBLIC_CONTRACT, type OperationalDependencyId } from "./current-public-contract.ts";
import { isNonArrayRecord } from "./foundation/src/type-guards.ts";
import type {
  CheckExecutionBinding,
  CheckTaskPlanFactory
} from "./quality-core/src/check-record/catalog.ts";
import type { CheckDefinition } from "./quality-core/src/check-record/model.ts";
import type { DecisionPolicy } from "./quality-core/src/check-record/policy-model.ts";
import type { SchedulerPolicy } from "./quality-core/src/check-record/task-orchestrator.ts";
import { DUPLICATE_DETECTION_CHECK_DEFINITION } from "./quality-core/src/check-record/builtins/duplicate-detection.ts";
import { FILE_METRICS_CHECK_DEFINITION } from "./quality-core/src/check-record/builtins/file-metrics.ts";
import { FUNCTION_METRICS_CHECK_DEFINITION } from "./quality-core/src/check-record/builtins/function-metrics.ts";
import {
  NEUTRAL_QUALITY_CONFIGURATION,
  type ProjectQualityConfiguration,
} from "./quality-configuration.ts";

export interface CheckSchedule {
  readonly checkId: string;
  readonly requiresChecks: readonly string[];
}

/** Product-owned Check identities. Project definitions select these identities;
 * they never reproduce the internal CheckDefinition data. */
export const BUILT_IN_CHECK_DEFINITIONS = Object.freeze({
  "duplicate-detection": DUPLICATE_DETECTION_CHECK_DEFINITION,
  "file-metrics": FILE_METRICS_CHECK_DEFINITION,
  "function-metrics": FUNCTION_METRICS_CHECK_DEFINITION
} as const satisfies Readonly<Record<string, CheckDefinition>>);

export type BuiltInCheckId = keyof typeof BUILT_IN_CHECK_DEFINITIONS;

export type CheckApplicabilityBinding = (definition: CheckDefinition) => unknown;

export interface CustomCheckDeclaration {
  readonly definition: CheckDefinition;
  readonly applicability: CheckApplicabilityBinding;
  readonly binding: Readonly<
    | { readonly kind: "direct"; readonly execute: CheckExecutionBinding }
    | { readonly kind: "task-plan"; readonly createTaskPlan: CheckTaskPlanFactory }
  >;
}

export interface ProjectChecks {
  readonly builtIn: readonly BuiltInCheckId[];
  readonly custom: readonly CustomCheckDeclaration[];
  readonly schedules: readonly CheckSchedule[];
  readonly selected: readonly string[];
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
  readonly checks: ProjectChecks;
  readonly effects: ProjectEffects;
  readonly operationalDependencies: OperationalDependencies;
  readonly policies: Readonly<Record<string, DecisionPolicy>>;
  readonly quality: ProjectQualityConfiguration;
  readonly scheduler: SchedulerPolicy;
  readonly selectedPolicy: string | null;
}

type ProjectDefinitionInput = Readonly<{
  apiVersion?: "1";
  checks?: Partial<ProjectChecks>;
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
    readonly builtIn: readonly CheckDefinition[];
    readonly custom: readonly CheckDefinition[];
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
  readonly binding: CustomCheckDeclaration["binding"];
}

export interface ProjectExecutionBindings {
  readonly customChecks: ReadonlyMap<string, CustomCheckExecutionBinding>;
}

export interface NormalizedProjectDefinition {
  readonly declarative: DeclarativeProjectSnapshot;
  readonly bindings: ProjectExecutionBindings;
}

/**
 * Defines a plain Project Definition. Defaults are authoring conveniences only;
 * the Package Run boundary still validates unknown values before doing work.
 */
export function defineConfig<const T extends ProjectDefinitionInput>(
  value: T & Record<Exclude<keyof T, keyof ProjectDefinitionInput>, never>
): ProjectDefinition {
  return {
    apiVersion: value.apiVersion ?? "1",
    checks: {
      builtIn: value.checks?.builtIn ?? [],
      custom: value.checks?.custom ?? [],
      schedules: value.checks?.schedules ?? [],
      selected: value.checks?.selected ?? []
    },
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
  const customChecks = new Map<string, CustomCheckExecutionBinding>();
  for (const custom of definition.checks.custom) {
    customChecks.set(custom.definition.checkId, Object.freeze({
      applicability: custom.applicability,
      binding: custom.binding
    }));
  }
  return Object.freeze({
    bindings: Object.freeze({ customChecks }),
    declarative: freezeDeclarativeSnapshot(definition)
  });
}

export function createDeclarativeFingerprint(snapshot: DeclarativeProjectSnapshot): string {
  return createHash("sha256").update(stableJson(snapshot)).digest("hex");
}

function freezeDeclarativeSnapshot(definition: ProjectDefinition): DeclarativeProjectSnapshot {
  return deepFreeze({
    apiVersion: definition.apiVersion,
    checks: {
      builtIn: definition.checks.builtIn.map((checkId) => BUILT_IN_CHECK_DEFINITIONS[checkId]),
      custom: definition.checks.custom.map((check) => check.definition),
      schedules: definition.checks.schedules,
      selected: definition.checks.selected
    },
    effects: definition.effects,
    operationalDependencyIds: Object.freeze(
      Object.keys(definition.operationalDependencies).sort() as OperationalDependencyId[]
    ),
    policyNames: Object.freeze(Object.keys(definition.policies).sort()),
    quality: definition.quality,
    scheduler: definition.scheduler,
    selectedPolicy: definition.selectedPolicy
  });
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

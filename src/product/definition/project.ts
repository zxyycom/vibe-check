import { createHash } from "node:crypto";

import {
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  type DuplicateDetectionOptions,
  type FileMetricsOptions,
  type FunctionMetricsOptions
} from "./built-ins.ts";
import { resolveCheckTree, type ResolvedCheckTreeLeaf } from "./check-tree/index.ts";
import type { MeaninglessCheckWarning } from "./check-tree/authoring.ts";
import type { CheckDefinition } from "./check-definition.ts";
import {
  defineCheck,
  inherit,
  type Check,
  type CheckExecution,
  type CheckExecutionContext,
  type CheckOutcome,
  type CheckResult,
  type CheckUnavailableReason,
  type CheckVisibility,
  type InheritableCheckCollection
} from "./custom-check.ts";
import { CURRENT_PUBLIC_CONTRACT } from "../public-contract/current.ts";
import { isNonArrayRecord } from "../foundation/type-guards.ts";
import { NEUTRAL_QUALITY_CONFIGURATION, type ProjectQualityConfiguration } from "./quality.ts";

export {
  defineCheck,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  inherit,
  type Check,
  type CheckExecution,
  type CheckExecutionContext,
  type CheckOutcome,
  type CheckResult,
  type CheckUnavailableReason,
  type DuplicateDetectionOptions,
  type FileMetricsOptions,
  type InheritableCheckCollection,
  type FunctionMetricsOptions,
  type ProjectQualityConfiguration
};

export interface ProjectEffects {
  readonly cache: Readonly<{ readonly directory: string; readonly enabled: boolean }>;
  readonly output: Readonly<{ readonly directory: string; readonly enabled: boolean }>;
  readonly progress: Readonly<{ readonly enabled: boolean }>;
}

/** Invocation-wide authoring budget; scheduler scopes stay private to Run. */
export interface SchedulerPolicy {
  readonly maxParallel: number;
}

export interface ProjectDefinition {
  readonly apiVersion: "1";
  readonly checks: readonly Check[];
  readonly effects: ProjectEffects;
  readonly quality: ProjectQualityConfiguration;
  readonly scheduler: SchedulerPolicy;
}

type ProjectDefinitionInput = Readonly<{
  apiVersion?: "1";
  checks?: readonly Check[];
  effects?: Partial<{
    cache: Partial<ProjectEffects["cache"]>;
    output: Partial<ProjectEffects["output"]>;
    progress: Partial<ProjectEffects["progress"]>;
  }>;
  quality?: ProjectQualityConfiguration;
  scheduler?: Partial<SchedulerPolicy>;
}>;

export interface RunControls {
  readonly checkAggregation?: CheckAggregation;
  readonly changedFiles?: readonly string[];
  readonly effects?: Partial<{
    cache: Partial<ProjectEffects["cache"]>;
    output: Partial<ProjectEffects["output"]>;
    progress: Partial<ProjectEffects["progress"]>;
  }>;
  readonly flags?: readonly string[];
  readonly projectRoot?: string;
  readonly signal?: AbortSignal;
}

export interface CheckAggregation {
  readonly checks: "all" | readonly string[];
  readonly mode: "all" | "any";
  readonly unavailable: "propagate" | "fail" | "exclude";
  readonly notApplicable: "exclude" | "pass" | "fail";
  readonly empty: "passed" | "failed" | "not-applicable";
}

export type CheckAggregate = "passed" | "failed" | "not-applicable" | "unavailable";

export interface ProjectDefinitionDiagnostic {
  readonly kind: "invalid-project-definition" | "invalid-run-controls";
  readonly path: string;
  readonly reason: "invalid-value" | "unknown-key";
}

export type DefinitionWarning = MeaninglessCheckWarning;

export type ValidationResult<T> = Readonly<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ProjectDefinitionDiagnostic }
>;

export type ProjectDefinitionValidationResult = Readonly<
  | {
      readonly ok: true;
      readonly value: ProjectDefinition;
      readonly warnings: readonly DefinitionWarning[];
    }
  | { readonly ok: false; readonly error: ProjectDefinitionDiagnostic }
>;

export interface NormalizedCheckDeclaration {
  readonly definition: CheckDefinition;
  readonly dependsOn: readonly string[];
  readonly maxParallel: number;
  readonly mutex: readonly string[];
  /** Definition-validated JSON data that contributes to the fingerprint only. */
  readonly options: object;
  readonly visibility: CheckVisibility;
}

export interface NormalizedCheck extends NormalizedCheckDeclaration {
  /** Trusted project code; deliberately excluded from `declarative`. */
  readonly execution: CheckExecution;
}

export interface DeclarativeProjectSnapshot {
  readonly apiVersion: "1";
  /** Canonically ordered executable Check declarations. */
  readonly checks: readonly NormalizedCheckDeclaration[];
  readonly effects: ProjectEffects;
  readonly quality: ProjectQualityConfiguration;
  readonly scheduler: SchedulerPolicy;
}

export interface NormalizedProjectDefinition {
  readonly checks: readonly NormalizedCheck[];
  readonly declarative: DeclarativeProjectSnapshot;
  readonly definitionWarnings: readonly DefinitionWarning[];
}

/**
 * Creates a plain Project Definition. Runtime validation remains the only
 * place that closes the tree and validates its declarative data.
 */
export function defineConfig<const T extends ProjectDefinitionInput>(
  value: T & Record<Exclude<keyof T, keyof ProjectDefinitionInput>, never>
): ProjectDefinition {
  return {
    apiVersion: value.apiVersion ?? "1",
    checks: value.checks ?? [],
    effects: {
      cache: {
        directory:
          value.effects?.cache?.directory ?? CURRENT_PUBLIC_CONTRACT.effectDefaults.cache.directory,
        enabled:
          value.effects?.cache?.enabled ?? CURRENT_PUBLIC_CONTRACT.effectDefaults.cache.enabled
      },
      output: {
        directory:
          value.effects?.output?.directory ??
          CURRENT_PUBLIC_CONTRACT.effectDefaults.output.directory,
        enabled:
          value.effects?.output?.enabled ?? CURRENT_PUBLIC_CONTRACT.effectDefaults.output.enabled
      },
      progress: {
        enabled:
          value.effects?.progress?.enabled ??
          CURRENT_PUBLIC_CONTRACT.effectDefaults.progress.enabled
      }
    },
    quality: value.quality ?? NEUTRAL_QUALITY_CONFIGURATION,
    scheduler: { maxParallel: value.scheduler?.maxParallel ?? 4 }
  };
}

export function normalizeProjectDefinition(
  definition: ProjectDefinition
): NormalizedProjectDefinition {
  const tree = resolveCheckTree(definition.checks, definition.scheduler.maxParallel);
  if (tree === undefined)
    throw new TypeError("Project Definition Check tree failed closed normalization");
  const checks = Object.freeze(tree.leaves.map(normalizeCheck));
  return Object.freeze({
    checks,
    declarative: freezeDeclarativeSnapshot(definition, checks),
    definitionWarnings: tree.warnings
  });
}

function normalizeCheck(leaf: ResolvedCheckTreeLeaf): NormalizedCheck {
  return Object.freeze({
    definition: leaf.definition,
    dependsOn: leaf.dependsOn,
    execution: leaf.execution,
    maxParallel: leaf.maxParallel,
    mutex: leaf.mutex,
    options: leaf.options,
    visibility: leaf.visibility
  });
}

export function createDeclarativeFingerprint(snapshot: DeclarativeProjectSnapshot): string {
  return createHash("sha256").update(stableJson(snapshot)).digest("hex");
}

function freezeDeclarativeSnapshot(
  definition: ProjectDefinition,
  checks: readonly NormalizedCheck[]
): DeclarativeProjectSnapshot {
  const declarations = checks
    .map(({ execution: _execution, ...declaration }) => declaration)
    .sort((left, right) => compareText(left.definition.checkId, right.definition.checkId));
  return deepFreeze({
    apiVersion: definition.apiVersion,
    checks: declarations,
    effects: definition.effects,
    quality: definition.quality,
    scheduler: definition.scheduler
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
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

import { createHash } from "node:crypto";

import { resolveCheckTree, type ResolvedCheckTreeLeaf } from "./check-tree/resolution.ts";
import type { MeaninglessCheckWarning } from "./check-tree/authoring.ts";
import type { CheckDescriptor } from "../check/descriptor.ts";
import type {
  Check,
  CheckExecution,
  CheckFlagEnablement,
  CheckPreflight,
  CheckVisibility
} from "../check/check.ts";
import { DEFAULT_PROJECT_OUTPUTS } from "./output-defaults.ts";
import { isNonArrayRecord } from "../data-boundary/value-shapes.ts";

/** 一次 Project Run 的明确输出配置。 */
export interface ProjectOutputs {
  /** `run.json` 与 `records.ndjson` publication。 */
  readonly machinePublication: Readonly<{
    /** 相对目录从 project root 解析；绝对目录直接作为 target，默认 `artifacts/vibe-check`。 */
    readonly directory: string;
    /** `false` 时本次 Run 不发布 machine output。 */
    readonly enabled: boolean;
  }>;
  /** 人读 progress rendering。 */
  readonly progressRendering: Readonly<{
    /** `false` 时不构造或写入 progress writer。 */
    readonly enabled: boolean;
  }>;
  /** 仅供维护者读取的一次 invocation diagnostic log。 */
  readonly diagnosticLogging: Readonly<{
    /** 相对目录从 project root 解析；绝对目录直接作为 target，默认 `.log/vibe-check`。 */
    readonly directory: string;
    /** `false` 时不创建 diagnostic writer 或 file。 */
    readonly enabled: boolean;
  }>;
}

export type {
  AdmissionPolicy,
  AdmissionPolicyContext,
  AdmissionPolicyMeasurement,
  AdmissionProposal,
  SchedulerDecisionMeasurementCumulative,
  SchedulerGraphSnapshot,
  SchedulerMeasurementActionObservation,
  SchedulerMeasurementActionObservationInterval,
  SchedulerMeasurementAdmission,
  SchedulerMeasurementContext,
  SchedulerMeasurementEffect,
  SchedulerMeasurementHook,
  SchedulerMeasurementIntervalContribution,
  SchedulerMeasurementPeakCounts,
  SchedulerMeasurementTiming,
  SchedulerMeasurementTimingFacts,
  SchedulerMeasurementTimingUnavailableReason,
  SchedulerPolicy,
  SchedulerRawMeasurement
} from "./scheduler-policy.ts";
import type {
  AdmissionPolicy,
  DeclarativeSchedulerPolicy,
  SchedulerPolicy
} from "./scheduler-policy.ts";

/** 已补齐默认 outputs、可交给 run 执行的项目定义。 */
export interface ProjectDefinition {
  readonly apiVersion: "1";
  readonly checks: readonly Check[];
  readonly outputs: ProjectOutputs;
  readonly scheduler: SchedulerPolicy;
}
type ProjectDefinitionInput = Readonly<{
  apiVersion?: "1";
  checks?: readonly Check[];
  outputs?: Partial<{
    machinePublication: Partial<ProjectOutputs["machinePublication"]>;
    progressRendering: Partial<ProjectOutputs["progressRendering"]>;
    diagnosticLogging: Partial<ProjectOutputs["diagnosticLogging"]>;
  }>;
  scheduler?: Partial<SchedulerPolicy>;
}>;
export interface ProjectDefinitionDiagnostic {
  readonly kind: "invalid-project-definition";
  readonly path: string;
  readonly reason: "invalid-value" | "unknown-key";
}
export type DefinitionWarning = MeaninglessCheckWarning;
export type ProjectDefinitionValidationResult = Readonly<
  | {
      readonly ok: true;
      readonly value: ProjectDefinition;
      readonly warnings: readonly DefinitionWarning[];
    }
  | { readonly ok: false; readonly error: ProjectDefinitionDiagnostic }
>;
export interface NormalizedCheckDeclaration {
  readonly admissionPriority: number;
  readonly definition: CheckDescriptor;
  readonly dependsOn: readonly string[];
  readonly enabledByFlags?: CheckFlagEnablement;
  readonly maxParallel: number;
  readonly mutex: readonly string[];
  readonly observes: readonly string[];
  readonly options: object;
  readonly visibility: CheckVisibility;
}
export interface NormalizedCheck extends NormalizedCheckDeclaration {
  readonly execution: CheckExecution;
  readonly preflight?: CheckPreflight;
}
export interface DeclarativeProjectSnapshot {
  readonly apiVersion: "1";
  readonly checks: readonly NormalizedCheckDeclaration[];
  readonly outputs: ProjectOutputs;
  readonly scheduler: DeclarativeSchedulerPolicy;
}
export interface NormalizedProjectDefinition {
  readonly checks: readonly NormalizedCheck[];
  readonly declarative: DeclarativeProjectSnapshot;
  readonly definitionWarnings: readonly DefinitionWarning[];
  /** Runtime scheduler policy；custom callback 保留在此处，不进入 declarative snapshot。 */
  readonly scheduler: SchedulerPolicy;
}
const STATIC_ADMISSION_POLICY: AdmissionPolicy = Object.freeze({
  kind: "static"
});
type ExactAdmissionPolicy<T extends AdmissionPolicy> =
  T extends Readonly<{ readonly kind: "static" }>
    ? T & Record<Exclude<keyof T, "kind">, never>
    : T extends Readonly<{ readonly kind: "custom" }>
      ? T & Record<Exclude<keyof T, "kind" | "proposeAdmission">, never>
      : never;

/**
 * 为 custom admission policy 保留 callback/context 的 TypeScript inference，不创建额外运行语义。
 *
 * @remarks inline `{ kind: "custom", proposeAdmission }` 与此 helper 的结果完全等价；callback 会在
 * Run 中以调用方 closure 同步调用，重叠 Run 的可重入性由调用方负责。
 */
export function defineAdmissionPolicy<const T extends AdmissionPolicy>(
  policy: ExactAdmissionPolicy<T>
): T {
  return policy;
}

/** 使用 Product 默认输出创建普通 Project Definition。 */
export function defineConfig<const T extends ProjectDefinitionInput>(
  value: T & Record<Exclude<keyof T, keyof ProjectDefinitionInput>, never>
): ProjectDefinition {
  return {
    apiVersion: value.apiVersion ?? "1",
    checks: value.checks ?? [],
    outputs: {
      machinePublication: {
        directory:
          value.outputs?.machinePublication?.directory ??
          DEFAULT_PROJECT_OUTPUTS.machinePublication.directory,
        enabled:
          value.outputs?.machinePublication?.enabled ??
          DEFAULT_PROJECT_OUTPUTS.machinePublication.enabled
      },
      progressRendering: {
        enabled:
          value.outputs?.progressRendering?.enabled ??
          DEFAULT_PROJECT_OUTPUTS.progressRendering.enabled
      },
      diagnosticLogging: {
        directory:
          value.outputs?.diagnosticLogging?.directory ??
          DEFAULT_PROJECT_OUTPUTS.diagnosticLogging.directory,
        enabled:
          value.outputs?.diagnosticLogging?.enabled ??
          DEFAULT_PROJECT_OUTPUTS.diagnosticLogging.enabled
      }
    },
    scheduler: {
      admissionPolicy: value.scheduler?.admissionPolicy ?? STATIC_ADMISSION_POLICY,
      maxParallel: value.scheduler?.maxParallel ?? 4,
      measurementHooks: value.scheduler?.measurementHooks ?? []
    }
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
    definitionWarnings: tree.warnings,
    scheduler: normalizeSchedulerPolicy(definition.scheduler)
  });
}
function normalizeCheck(leaf: ResolvedCheckTreeLeaf): NormalizedCheck {
  return Object.freeze({
    admissionPriority: leaf.admissionPriority,
    definition: leaf.definition,
    dependsOn: leaf.dependsOn,
    ...(leaf.enabledByFlags === undefined ? {} : { enabledByFlags: leaf.enabledByFlags }),
    execution: leaf.execution,
    maxParallel: leaf.maxParallel,
    mutex: leaf.mutex,
    observes: leaf.observes,
    options: leaf.options,
    ...(leaf.preflight === undefined ? {} : { preflight: leaf.preflight }),
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
    .map(({ execution: _execution, preflight: _preflight, ...declaration }) => declaration)
    .sort((left, right) => compareText(left.definition.checkId, right.definition.checkId));
  return deepFreeze({
    apiVersion: definition.apiVersion,
    checks: declarations,
    outputs: definition.outputs,
    scheduler: Object.freeze({
      admissionPolicy: Object.freeze({
        kind: definition.scheduler.admissionPolicy.kind
      }),
      maxParallel: definition.scheduler.maxParallel
    })
  });
}
function normalizeSchedulerPolicy(policy: SchedulerPolicy): SchedulerPolicy {
  const admissionPolicy =
    policy.admissionPolicy.kind === "static"
      ? STATIC_ADMISSION_POLICY
      : Object.freeze({
          kind: "custom" as const,
          proposeAdmission: policy.admissionPolicy.proposeAdmission
        });
  return Object.freeze({
    admissionPolicy,
    maxParallel: policy.maxParallel,
    measurementHooks: Object.freeze([...policy.measurementHooks])
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
  if (isNonArrayRecord(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

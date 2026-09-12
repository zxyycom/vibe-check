import { resolveCheckTree, type ResolvedCheckTreeLeaf } from "./check-tree/resolution.ts";
import type { MeaninglessCheckWarning } from "./check-tree/authoring.ts";
import type { CheckDescriptor } from "../check/descriptor.ts";
import type {
  Check,
  CheckFlagEnablement,
  CheckPreflight,
  CheckResourceClaims,
  CheckVisibility
} from "../check/check.ts";
import type { HandoffProviderIdentity } from "../check/handoff-provider-identity.ts";
import { DEFAULT_PROJECT_OUTPUTS, resolveProgressRenderingOutput } from "./output-defaults.ts";
import type {
  ProgressRenderingOutput,
  ResolvedProgressRenderingOutput
} from "./progress-rendering-output.ts";
import { createDeclarativeProjectSnapshot } from "./declarative-snapshot.ts";
import {
  EMPTY_RESOURCE_UNIT_MAPPING,
  snapshotResourceUnitMapping
} from "./resource-unit-mapping.ts";
export { createDeclarativeFingerprint } from "./declarative-snapshot.ts";

/** 一次 Project Run 的明确输出配置。 */
export interface ProjectOutputs {
  /** `run.json` 与 `records.ndjson` publication。 */
  readonly machinePublication: Readonly<{
    /** 相对目录从 project root 解析；绝对目录直接作为 target，默认 `artifacts/vibe-check`。 */
    readonly directory: string;
    /** `false` 时本次 Run 不发布 machine output。 */
    readonly enabled: boolean;
  }>;
  /** 人读 progress lifecycle 与 preview 配置。 */
  readonly progressRendering: ProgressRenderingOutput;
  /** 仅供维护者读取的一次 invocation diagnostic log。 */
  readonly diagnosticLogging: Readonly<{
    /** 相对目录从 project root 解析；绝对目录直接作为 target，默认 `.log/vibe-check`。 */
    readonly directory: string;
    /** `false` 时不创建 diagnostic writer 或 file。 */
    readonly enabled: boolean;
  }>;
}

export type {
  ProgressPreviewFormatter,
  ProgressRenderingOutput,
  ResolvedProgressRenderingOutput
} from "./progress-rendering-output.ts";

/** 已解析的 Run outputs；只在 Product invocation 内部使用。 */
export interface ResolvedProjectOutputs extends Omit<ProjectOutputs, "progressRendering"> {
  readonly progressRendering: ResolvedProgressRenderingOutput;
}

/** callback-free Definition output 投影；仅供 declarative fingerprint 使用。 */
export interface DeclarativeProjectOutputs extends Omit<ProjectOutputs, "progressRendering"> {
  readonly progressRendering: Readonly<{
    readonly enabled: boolean;
    readonly formatter: "custom" | "default";
    readonly messagePreviewLimit: number;
    readonly recordPreviewLimit: number;
    readonly textPreviewCodePointLimit: number;
  }>;
}

export type {
  AdmissionPolicy,
  AdmissionPolicyContext,
  AdmissionPolicyMeasurement,
  AdmissionProposal,
  AdmissionCatalog,
  AdmissionGraph,
  AdmissionGraphInput,
  AdmissionInspection,
  AdmissionNonSelectableTask,
  AdmissionRejectionReason,
  AdmissionScopeLifecycle,
  AdmissionSelectionRejectionReason,
  AdmissionSelectionValidation,
  AdmissionSelectionValidationRejectionReason,
  AdmissionSettlementOutcome,
  AdmissionSettledTask,
  AdmissionState,
  AdmissionTransitionResult,
  CustomAdmissionPreparationContext,
  CustomAdmissionStrategy,
  PreparedCustomAdmissionStrategy,
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

/**
 * `defineConfig(...)` 形成的可重复运行项目定义：声明检查内容、调度方式与默认输出。
 *
 * 本次 root、flags、signal、Check 产物与日志目标以及显式 aggregation 交给 `run` 的第二个参数；
 * 其中的 output overrides 只改变当前调用，不修改这里的默认值。
 */
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
  readonly resourceClaims: CheckResourceClaims;
  readonly visibility: CheckVisibility;
}
export interface NormalizedCheck extends NormalizedCheckDeclaration {
  readonly execution: NonNullable<Check["execution"]>;
  readonly handoff?: HandoffProviderIdentity;
  readonly preflight?: CheckPreflight;
}
export interface DeclarativeProjectSnapshot {
  readonly apiVersion: "1";
  readonly checks: readonly NormalizedCheckDeclaration[];
  readonly outputs: DeclarativeProjectOutputs;
  readonly scheduler: DeclarativeSchedulerPolicy;
}
export interface NormalizedProjectDefinition {
  readonly checks: readonly NormalizedCheck[];
  readonly declarative: DeclarativeProjectSnapshot;
  readonly definitionWarnings: readonly DefinitionWarning[];
  /** Runtime scheduler policy；custom callback 保留在此处。 */
  readonly scheduler: SchedulerPolicy;
}
const STATIC_ADMISSION_POLICY: AdmissionPolicy = Object.freeze({
  kind: "static"
});
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
      progressRendering: resolveProgressRenderingOutput(value.outputs?.progressRendering ?? {}),
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
      measurementHooks: value.scheduler?.measurementHooks ?? [],
      resourceCapacities: value.scheduler?.resourceCapacities ?? EMPTY_RESOURCE_UNIT_MAPPING
    }
  };
}
export function normalizeProjectDefinition(
  definition: ProjectDefinition
): NormalizedProjectDefinition {
  const scheduler = normalizeSchedulerPolicy(definition.scheduler);
  const tree = resolveCheckTree(
    definition.checks,
    scheduler.maxParallel,
    scheduler.resourceCapacities
  );
  if (tree === undefined)
    throw new TypeError("Project Definition Check tree failed closed normalization");
  const checks = Object.freeze(tree.leaves.map(normalizeCheck));
  return Object.freeze({
    checks,
    declarative: createDeclarativeProjectSnapshot(
      Object.freeze({ ...definition, scheduler }),
      checks
    ),
    definitionWarnings: tree.warnings,
    scheduler
  });
}
function normalizeCheck(leaf: ResolvedCheckTreeLeaf): NormalizedCheck {
  return Object.freeze({
    admissionPriority: leaf.admissionPriority,
    definition: leaf.definition,
    dependsOn: leaf.dependsOn,
    ...(leaf.enabledByFlags === undefined ? {} : { enabledByFlags: leaf.enabledByFlags }),
    execution: leaf.execution,
    ...(leaf.handoff === undefined ? {} : { handoff: leaf.handoff }),
    maxParallel: leaf.maxParallel,
    mutex: leaf.mutex,
    observes: leaf.observes,
    options: leaf.options,
    ...(leaf.preflight === undefined ? {} : { preflight: leaf.preflight }),
    resourceClaims: leaf.resourceClaims,
    visibility: leaf.visibility
  });
}
function normalizeSchedulerPolicy(policy: SchedulerPolicy): SchedulerPolicy {
  const resourceCapacities = snapshotResourceUnitMapping(policy.resourceCapacities);
  if (resourceCapacities === undefined) {
    throw new TypeError("Project Definition scheduler resource capacities failed normalization");
  }
  let admissionPolicy: AdmissionPolicy;
  if (policy.admissionPolicy.kind === "static") {
    admissionPolicy = STATIC_ADMISSION_POLICY;
  } else {
    admissionPolicy = Object.freeze({
      kind: "custom" as const,
      strategy: Object.freeze({ ...policy.admissionPolicy.strategy })
    });
  }
  return Object.freeze({
    admissionPolicy,
    maxParallel: policy.maxParallel,
    measurementHooks: Object.freeze([...policy.measurementHooks]),
    resourceCapacities
  });
}

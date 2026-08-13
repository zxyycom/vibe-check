import type { ScannerDependencySnapshot } from "../../../scanner-dependencies.ts";
import type { ResolvedQualityConfig } from "../model/schema.ts";
import {
  DUPLICATE_DETECTION_CHECK_DEFINITION,
  resolveDuplicateDetectionApplicability
} from "./builtins/duplicate-detection.ts";
import {
  FILE_METRICS_CHECK_DEFINITION,
  resolveFileMetricsApplicability
} from "./builtins/file-metrics.ts";
import {
  FUNCTION_METRICS_CHECK_DEFINITION,
  resolveFunctionMetricsApplicability
} from "./builtins/function-metrics.ts";
import { resolveCheckCatalog } from "./catalog.ts";
import { coordinateCheckRecords } from "./coordinator.ts";
import type { SchedulerPolicy } from "./task-orchestrator.ts";
import {
  resolveCurrentObservation,
  resolveCurrentPolicy,
  type CurrentGateRequest
} from "./current-adapter.ts";
import {
  createCurrentRuntimes,
  resolveDuplicateDetectionInput,
  type CurrentCompositionExactInputs,
  type CurrentCompositionReferenceInputs,
  type CurrentRuntimes
} from "./current-runtime-bindings.ts";
import { projectHumanStatus, type HumanStatusProjection } from "./human-status.ts";
import type { FinalCoreSnapshot } from "./model.ts";
import {
  evaluateDecisionPolicy,
  evaluateRecordObservation
} from "./policy-evaluator.ts";
import type {
  DecisionEvidence,
  ReferenceFacts
} from "./policy-model.ts";
import { validateReferenceFacts } from "./policy-validation.ts";

export type {
  CurrentCompositionExactInputs,
  CurrentCompositionReferenceInputs
} from "./current-runtime-bindings.ts";

export type CurrentBuiltinCheckId =
  | "duplicate-detection"
  | "file-metrics"
  | "function-metrics";

export interface CurrentCompositionResult {
  readonly snapshot: FinalCoreSnapshot;
  readonly referenceFacts: ReferenceFacts;
  readonly decision: DecisionEvidence;
  readonly humanStatus: HumanStatusProjection;
}

const CURRENT_CHECK_DEFINITIONS = Object.freeze([
  DUPLICATE_DETECTION_CHECK_DEFINITION,
  FILE_METRICS_CHECK_DEFINITION,
  FUNCTION_METRICS_CHECK_DEFINITION
]);

const CURRENT_CHECK_SCHEDULER_POLICY: SchedulerPolicy = Object.freeze({ maxParallel: 4 });

type CurrentCompositionInput = Readonly<{
  baseline: CurrentCompositionReferenceInputs | null;
  changedFiles: readonly string[];
  config: ResolvedQualityConfig;
  current: CurrentCompositionExactInputs;
  dependencies: ScannerDependencySnapshot;
  gate: CurrentGateRequest;
  invocationKey: string;
  selectedCheckIds: readonly CurrentBuiltinCheckId[];
  verificationOutput: boolean;
}>;

export async function composeCurrentCheckRecords(
  input: CurrentCompositionInput
): Promise<CurrentCompositionResult> {
  const reference = input.gate === "changed" || input.gate === "regressions"
    ? input.baseline
    : null;
  const runtimes = createCurrentRuntimes(input, reference);
  const catalog = resolveCurrentCatalog(input, runtimes);
  const { observation, policy } = resolveCurrentPolicies(input, catalog, reference);
  const snapshot = await coordinateCheckRecords(catalog, {
    schedulerPolicy: CURRENT_CHECK_SCHEDULER_POLICY
  });
  const referenceFacts = resolveReferenceFacts(input, reference, runtimes, snapshot, policy);
  const gateDecision = evaluateDecisionPolicy(policy, snapshot, referenceFacts);
  const decision = gateDecision.gate.status === "disabled"
    ? disabledDecisionWithObservation(gateDecision, observation, snapshot, referenceFacts)
    : gateDecision;
  return Object.freeze({
    snapshot,
    referenceFacts,
    decision,
    humanStatus: projectHumanStatus({ decision, snapshot, verificationOutput: input.verificationOutput })
  });
}

function resolveCurrentCatalog(input: CurrentCompositionInput, runtimes: CurrentRuntimes) {
  const catalogResult = resolveCheckCatalog({
    invocationKey: input.invocationKey,
    definitions: CURRENT_CHECK_DEFINITIONS,
    bindings: [{
      checkId: "duplicate-detection",
      execute: runtimes.duplicateDetection.binding
    }, {
      checkId: "file-metrics",
      execute: runtimes.fileMetrics.binding
    }, {
      checkId: "function-metrics",
      execute: runtimes.functionMetrics.binding
    }],
    schedules: CURRENT_CHECK_DEFINITIONS.map(({ checkId }) => ({
      checkId,
      requiresChecks: []
    })),
    selectedCheckIds: input.selectedCheckIds,
    resolveApplicability: (definition) => {
      if (definition.checkId === "duplicate-detection") {
        return resolveDuplicateDetectionApplicability(
          resolveDuplicateDetectionInput(input.current.duplicateDetection, input.config).areas
        );
      }
      if (definition.checkId === "file-metrics") {
        return resolveFileMetricsApplicability(input.current.fileMetrics.approvedExactPaths);
      }
      return resolveFunctionMetricsApplicability(
        input.current.functionMetrics.approvedExactPaths
      );
    }
  });
  if (!catalogResult.ok) {
    throw new TypeError(`Current Check catalog resolution failed at ${catalogResult.error.stage}`);
  }
  return catalogResult.value;
}

function resolveCurrentPolicies(
  input: CurrentCompositionInput,
  catalog: ReturnType<typeof resolveCurrentCatalog>,
  reference: CurrentCompositionReferenceInputs | null
) {
  const policyResult = resolveCurrentPolicy({
    acceptedWarnings: input.config.acceptedWarnings,
    baseline: reference?.identity ?? null,
    catalog,
    gate: input.gate
  });
  const observationResult = resolveCurrentObservation({
    acceptedWarnings: input.config.acceptedWarnings,
    catalog
  });
  if (!policyResult.ok) {
    throw new TypeError(`Current policy resolution failed: ${policyResult.error.reason}`);
  }
  if (!observationResult.ok) {
    throw new TypeError(`Current policy resolution failed: ${observationResult.error.reason}`);
  }
  return { observation: observationResult.value, policy: policyResult.value };
}

function resolveReferenceFacts(
  input: CurrentCompositionInput,
  reference: CurrentCompositionReferenceInputs | null,
  runtimes: CurrentRuntimes,
  snapshot: FinalCoreSnapshot,
  policy: Parameters<typeof evaluateDecisionPolicy>[0]
): ReferenceFacts {
  const requiredReferenceCheckIds = new Set(
    policy.policy?.references.flatMap((requirement) => requirement.checkIds) ?? []
  );
  const referenceCheckIds = input.selectedCheckIds.filter((checkId) => (
    requiredReferenceCheckIds.has(checkId)
  ));
  const rawReferenceFacts = mergeReferenceFacts(
    referenceCheckIds,
    runtimes,
    snapshot,
    reference?.status === "unavailable" ? reference.identity.referenceName : null
  );
  const factsResult = validateReferenceFacts(rawReferenceFacts, policy, snapshot);
  if (!factsResult.ok) {
    throw new TypeError("Current reference facts failed validation");
  }
  return factsResult.value;
}

function mergeReferenceFacts(
  referenceCheckIds: readonly CurrentBuiltinCheckId[],
  runtimes: CurrentRuntimes,
  snapshot: FinalCoreSnapshot,
  unavailableReferenceName: string | null
): ReferenceFacts {
  const selected = new Set(referenceCheckIds);
  if (unavailableReferenceName !== null) {
    return Object.freeze({
      evidence: Object.freeze(referenceCheckIds.map((checkId) => Object.freeze({
        checkId,
        referenceName: unavailableReferenceName,
        status: "unavailable" as const
      }))),
      relations: Object.freeze([])
    });
  }
  const facts = [
    ...(selected.has("duplicate-detection")
      ? [runtimes.duplicateDetection.referenceFacts(snapshot)]
      : []),
    ...(selected.has("file-metrics") ? [runtimes.fileMetrics.referenceFacts(snapshot)] : []),
    ...(selected.has("function-metrics")
      ? [runtimes.functionMetrics.referenceFacts(snapshot)]
      : [])
  ];
  return Object.freeze({
    evidence: Object.freeze(facts.flatMap((fact) => fact.evidence)),
    relations: Object.freeze(facts.flatMap((fact) => fact.relations))
  });
}

function disabledDecisionWithObservation(
  gateDecision: DecisionEvidence,
  observation: Parameters<typeof evaluateRecordObservation>[0],
  snapshot: FinalCoreSnapshot,
  referenceFacts: ReferenceFacts
): DecisionEvidence {
  const evidence = evaluateRecordObservation(
    observation,
    snapshot,
    referenceFacts
  );
  return Object.freeze({
    ...gateDecision,
    acceptance: evidence.acceptance,
    views: evidence.views
  });
}

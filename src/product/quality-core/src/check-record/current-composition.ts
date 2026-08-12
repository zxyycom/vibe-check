import type { ScannerDependencySnapshot } from "../../../scanner-dependencies.ts";
import type { ResolvedQualityConfig } from "../model/schema.ts";
import {
  createDuplicateDetectionBinding,
  DUPLICATE_DETECTION_CHECK_DEFINITION,
  type DuplicateDetectionAreaInput,
  type DuplicateDetectionExactInputSet,
  resolveDuplicateDetectionApplicability
} from "./builtins/duplicate-detection.ts";
import {
  createFileMetricsBinding,
  FILE_METRICS_CHECK_DEFINITION,
  type FileMetricsExactInputSet,
  resolveFileMetricsApplicability
} from "./builtins/file-metrics.ts";
import {
  createFunctionMetricsBinding,
  FUNCTION_METRICS_CHECK_DEFINITION,
  type FunctionMetricsExactInputSet,
  resolveFunctionMetricsApplicability
} from "./builtins/function-metrics.ts";
import { resolveCheckCatalog } from "./catalog.ts";
import { coordinateCheckRecords } from "./coordinator.ts";
import {
  resolveCurrentObservation,
  resolveCurrentPolicy,
  type CurrentGateRequest
} from "./current-adapter.ts";
import { projectHumanStatus, type HumanStatusProjection } from "./human-status.ts";
import type { FinalCoreSnapshot } from "./model.ts";
import {
  evaluateDecisionPolicy,
  evaluateRecordObservation
} from "./policy-evaluator.ts";
import type {
  DecisionEvidence,
  NamedReferenceIdentity,
  ReferenceFacts
} from "./policy-model.ts";
import { validateReferenceFacts } from "./policy-validation.ts";

export type CurrentBuiltinCheckId =
  | "duplicate-detection"
  | "file-metrics"
  | "function-metrics";

type DuplicateAreaExactInput = Readonly<
  Omit<DuplicateDetectionAreaInput, "minimumTokens">
>;

export interface CurrentCompositionExactInputs {
  readonly duplicateDetection: Readonly<{
    areas: readonly DuplicateAreaExactInput[];
    cacheRootDir: string;
    commitSha: string;
    rootDir: string;
  }>;
  readonly fileMetrics: FileMetricsExactInputSet;
  readonly functionMetrics: FunctionMetricsExactInputSet;
}

export interface CurrentCompositionReferenceInputs extends CurrentCompositionExactInputs {
  readonly identity: NamedReferenceIdentity;
  readonly status?: "available" | "unavailable";
}

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

export async function composeCurrentCheckRecords(input: Readonly<{
  baseline: CurrentCompositionReferenceInputs | null;
  changedFiles: readonly string[];
  config: ResolvedQualityConfig;
  current: CurrentCompositionExactInputs;
  dependencies: ScannerDependencySnapshot;
  gate: CurrentGateRequest;
  invocationKey: string;
  selectedCheckIds: readonly CurrentBuiltinCheckId[];
  verificationOutput: boolean;
}>): Promise<CurrentCompositionResult> {
  const reference = input.gate === "changed" || input.gate === "regressions"
    ? input.baseline
    : null;
  const measurementReference = reference?.status === "unavailable" ? null : reference;
  const fileMetrics = createFileMetricsBinding({
    changedFiles: input.changedFiles,
    current: input.current.fileMetrics,
    dependency: input.dependencies.file,
    reference: measurementReference === null ? null : {
      ...measurementReference.fileMetrics,
      referenceName: measurementReference.identity.referenceName
    },
    semantics: {
      codeAreas: input.config.codeAreas,
      generatedFiles: input.config.generatedFiles,
      codeLines: input.config.checks.files.codeLines
    }
  });
  const functionMetrics = createFunctionMetricsBinding({
    changedFiles: input.changedFiles,
    current: input.current.functionMetrics,
    dependency: input.dependencies.function,
    reference: measurementReference === null ? null : {
      ...measurementReference.functionMetrics,
      referenceName: measurementReference.identity.referenceName
    },
    semantics: {
      codeAreas: input.config.codeAreas,
      generatedFiles: input.config.generatedFiles,
      functions: input.config.checks.functions
    }
  });
  const duplicateDetection = createDuplicateDetectionBinding({
    changedFiles: input.changedFiles,
    current: duplicateInput(input.current.duplicateDetection, input.config),
    dependency: input.dependencies.duplication,
    reference: measurementReference === null ? null : {
      ...duplicateInput(measurementReference.duplicateDetection, input.config),
      referenceName: measurementReference.identity.referenceName
    },
    semantics: {
      changedDelta: input.config.checks.duplication.fragments.changedDelta,
      codeAreas: input.config.codeAreas,
      configVersion: input.config.version
    }
  });
  const runtimes = Object.freeze({ duplicateDetection, fileMetrics, functionMetrics });
  const catalogResult = resolveCheckCatalog({
    invocationKey: input.invocationKey,
    definitions: CURRENT_CHECK_DEFINITIONS,
    bindings: [{
      checkId: "duplicate-detection",
      execute: duplicateDetection.binding
    }, {
      checkId: "file-metrics",
      execute: fileMetrics.binding
    }, {
      checkId: "function-metrics",
      execute: functionMetrics.binding
    }],
    selectedCheckIds: input.selectedCheckIds,
    resolveApplicability: (definition) => {
      if (definition.checkId === "duplicate-detection") {
        return resolveDuplicateDetectionApplicability(
          duplicateInput(input.current.duplicateDetection, input.config).areas
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
  const catalog = catalogResult.value;
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

  const snapshot = await coordinateCheckRecords(catalog);
  const requiredReferenceCheckIds = new Set(
    policyResult.value.policy?.references.flatMap((requirement) => requirement.checkIds) ?? []
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
  const factsResult = validateReferenceFacts(rawReferenceFacts, policyResult.value, snapshot);
  if (!factsResult.ok) {
    throw new TypeError("Current reference facts failed validation");
  }
  const referenceFacts = factsResult.value;
  const gateDecision = evaluateDecisionPolicy(policyResult.value, snapshot, referenceFacts);
  const decision = gateDecision.gate.status === "disabled"
    ? disabledDecisionWithObservation(
      gateDecision,
      observationResult.value,
      snapshot,
      referenceFacts
    )
    : gateDecision;
  return Object.freeze({
    snapshot,
    referenceFacts,
    decision,
    humanStatus: projectHumanStatus({
      decision,
      snapshot,
      verificationOutput: input.verificationOutput
    })
  });
}

function duplicateInput(
  input: CurrentCompositionExactInputs["duplicateDetection"],
  config: ResolvedQualityConfig
): DuplicateDetectionExactInputSet {
  return Object.freeze({
    cacheRootDir: input.cacheRootDir,
    commitSha: input.commitSha,
    rootDir: input.rootDir,
    areas: Object.freeze(input.areas.map((area) => Object.freeze({
      ...area,
      minimumTokens: config.checks.duplication.minimumTokensByCodeArea[area.codeArea]
        ?? config.checks.duplication.defaultMinimumTokens
    })))
  });
}

function mergeReferenceFacts(
  referenceCheckIds: readonly CurrentBuiltinCheckId[],
  runtimes: Readonly<{
    duplicateDetection: ReturnType<typeof createDuplicateDetectionBinding>;
    fileMetrics: ReturnType<typeof createFileMetricsBinding>;
    functionMetrics: ReturnType<typeof createFunctionMetricsBinding>;
  }>,
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

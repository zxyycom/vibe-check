import { resolve } from "node:path";

import type {
  AdmissionPolicy,
  NormalizedCheck,
  SchedulerGraphSnapshot,
  SchedulerMeasurementContext
} from "../../project-definition/project-definition.ts";
import {
  canonicalizeJsonObject,
  canonicalizeJsonValue
} from "../../data-boundary/canonical-data.ts";
import { diagnosticTags, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";
import { prepareSchedulerDurationModel } from "../scheduler-duration-model/preparation.ts";
import {
  predictionForTask,
  type SchedulerPredictionInput,
  type SchedulerPredictionSnapshot
} from "../scheduler-duration-model/prediction.ts";
import {
  criticalPathScoreForTask,
  type SchedulerCriticalPathSnapshot
} from "../task-scheduler/critical-path-ranking.ts";
import { admissionSelectionPolicyFor } from "../task-scheduler/custom-admission-policy.ts";
import {
  createLearnedCriticalPathAdmission,
  type LearnedCriticalPathAdmission
} from "../task-scheduler/learned-critical-path-admission-policy.ts";
import {
  staticAdmissionSelectionPolicy,
  type AdmissionSelectionPolicy
} from "../task-scheduler/admission-selection-policy.ts";

export interface AdmissionStrategyCompleteContext {
  readonly terminalMeasurement: SchedulerMeasurementContext;
}

export interface PreparedAdmissionStrategy {
  /** The complete frozen policy handoff consumed by resolved Check execution and Scheduler. */
  readonly admissionPolicy: AdmissionSelectionPolicy;
  /** Closed provider demand merged with output and policy measurement requirements by invocation. */
  readonly requiresTerminalMeasurement: boolean;
  /** Provider-private learned admission observation, kept out of Scheduler policy input. */
  readonly observeAdmittedTask: ((taskId: string) => void) | undefined;
  readonly complete: (context: AdmissionStrategyCompleteContext) => Promise<void>;
}

export interface PrivateAdmissionStrategyProvider {
  prepare: () => Promise<PreparedAdmissionStrategy>;
}

export interface AdmissionStrategyProviderInput {
  readonly admissionPolicy: AdmissionPolicy;
  readonly checks: readonly NormalizedCheck[];
  readonly flags: unknown;
  readonly graph: SchedulerGraphSnapshot;
  readonly projectRoot: string;
  readonly observeDiagnostic: (observation: Parameters<DiagnosticLogger["observe"]>[0]) => void;
}

/** Product-private construction seam; production always uses the closed default resolver below. */
export type AdmissionStrategyProviderFactory = (
  input: AdmissionStrategyProviderInput
) => PrivateAdmissionStrategyProvider;

/** Resolves the closed Product policy union to one invocation-scoped prepared strategy. */
export function createAdmissionStrategyProvider(
  input: AdmissionStrategyProviderInput
): PrivateAdmissionStrategyProvider {
  return Object.freeze({
    prepare: async () => {
      switch (input.admissionPolicy.kind) {
        case "static":
          return staticPreparedStrategy(false);
        case "custom":
          return customPreparedStrategy(input.admissionPolicy);
        case "learned-critical-path":
          return prepareLearnedCriticalPathStrategy({
            ...input,
            admissionPolicy: input.admissionPolicy
          });
      }
    }
  });
}

function staticPreparedStrategy(requiresTerminalMeasurement: boolean): PreparedAdmissionStrategy {
  return Object.freeze({
    admissionPolicy: staticAdmissionSelectionPolicy,
    complete: async () => undefined,
    observeAdmittedTask: undefined,
    requiresTerminalMeasurement
  });
}

function customPreparedStrategy(
  policy: Extract<AdmissionPolicy, { readonly kind: "custom" }>
): PreparedAdmissionStrategy {
  return Object.freeze({
    admissionPolicy: admissionSelectionPolicyFor(policy),
    complete: async () => undefined,
    observeAdmittedTask: undefined,
    requiresTerminalMeasurement: true
  });
}

async function prepareLearnedCriticalPathStrategy(
  input: AdmissionStrategyProviderInput &
    Readonly<{
      readonly admissionPolicy: Extract<
        AdmissionPolicy,
        { readonly kind: "learned-critical-path" }
      >;
    }>
): Promise<PreparedAdmissionStrategy> {
  const predictionInputs = predictionInputsFor(input.checks, input.flags);
  if (predictionInputs === undefined) {
    observePredictionUnavailable(input, "canonical-input-unavailable");
    return staticPreparedStrategy(true);
  }

  const durationModel = await prepareSchedulerDurationModel({
    predictionInputs,
    stateDirectory: resolve(input.projectRoot, input.admissionPolicy.stateDirectory)
  });
  if (durationModel.kind === "static-fallback") {
    observePredictionUnavailable(input, "history-setup-failed");
    return staticPreparedStrategy(true);
  }

  let learnedAdmission: LearnedCriticalPathAdmission;
  try {
    learnedAdmission = createLearnedCriticalPathAdmission(input.graph, durationModel.prediction);
  } catch {
    observePredictionUnavailable(input, "history-setup-failed");
    return staticPreparedStrategy(true);
  }

  observeDiagnostic(input, {
    event: "scheduler.history.read",
    tags: diagnosticTags(
      "SCHEDULER",
      "HISTORY",
      "READ",
      durationModel.readObservation.toUpperCase()
    ),
    details: Object.freeze({
      modelVersion: durationModel.prediction.modelVersion,
      predictionDigest: durationModel.prediction.digest,
      retainedSeriesCount: durationModel.retainedSeriesCount
    })
  });
  return Object.freeze({
    admissionPolicy: learnedAdmission.admissionPolicy,
    complete: async (context: AdmissionStrategyCompleteContext) => {
      const recorded = await durationModel.record(context.terminalMeasurement);
      if (recorded.kind === "failed") {
        observeRecordingUnavailable(input, "history-recording-failed");
        return;
      }
      observeDiagnostic(input, {
        event: "scheduler.history.recorded",
        tags: diagnosticTags(
          "SCHEDULER",
          "HISTORY",
          "RECORDED",
          recorded.recording.status.toUpperCase()
        ),
        details: Object.freeze({
          acceptedSampleCount: recorded.recording.acceptedSampleCount,
          retainedSeriesCount: recorded.recording.retainedSeriesCount
        })
      });
      observeDiagnostic(input, {
        event: "scheduler.history.write",
        tags: diagnosticTags(
          "SCHEDULER",
          "HISTORY",
          "WRITE",
          recorded.writeObservation.toUpperCase()
        ),
        details: Object.freeze({ retainedSeriesCount: recorded.recording.retainedSeriesCount })
      });
    },
    observeAdmittedTask: (taskId: string) =>
      observeLearnedAdmission(
        input,
        durationModel.prediction,
        learnedAdmission.criticalPath,
        taskId
      ),
    requiresTerminalMeasurement: true
  });
}

function predictionInputsFor(
  checks: readonly NormalizedCheck[],
  flags: unknown
): readonly SchedulerPredictionInput[] | undefined {
  const canonicalFlags = canonicalizeJsonValue(flags);
  if (canonicalFlags === undefined) return undefined;

  const inputs: SchedulerPredictionInput[] = [];
  for (const check of checks) {
    const authoredOptions = canonicalizeJsonObject(check.options);
    if (authoredOptions === undefined) return undefined;
    inputs.push(
      Object.freeze({
        authoredOptions,
        checkId: check.definition.checkId,
        flags: canonicalFlags,
        taskId: check.definition.checkId
      })
    );
  }
  return Object.freeze(inputs);
}

function observeLearnedAdmission(
  input: AdmissionStrategyProviderInput,
  prediction: SchedulerPredictionSnapshot,
  criticalPath: SchedulerCriticalPathSnapshot,
  taskId: string
): void {
  const taskPrediction = predictionForTask(prediction, taskId);
  const score = criticalPathScoreForTask(criticalPath, taskId);
  if (taskPrediction === undefined || score === undefined) return;
  observeDiagnostic(input, {
    event: "scheduler.learned-admission",
    tags: diagnosticTags("SCHEDULER", "LEARNED", "ADMISSION", `TASK:${taskId}`),
    details: Object.freeze({
      criticalPathScore: score,
      estimatedDurationMs: taskPrediction.estimatedDurationMs,
      sampleCount: taskPrediction.sampleCount,
      source: taskPrediction.source
    })
  });
}

function observePredictionUnavailable(
  input: AdmissionStrategyProviderInput,
  reason: "canonical-input-unavailable" | "history-setup-failed"
): void {
  observeDiagnostic(input, {
    event: "scheduler.history.prediction-unavailable",
    tags: diagnosticTags("SCHEDULER", "HISTORY", "PREDICTION_UNAVAILABLE"),
    details: Object.freeze({ reason })
  });
}

function observeRecordingUnavailable(
  input: AdmissionStrategyProviderInput,
  reason: "history-recording-failed"
): void {
  observeDiagnostic(input, {
    event: "scheduler.history.recording-unavailable",
    tags: diagnosticTags("SCHEDULER", "HISTORY", "RECORDING_UNAVAILABLE"),
    details: Object.freeze({ reason })
  });
}

function observeDiagnostic(
  input: AdmissionStrategyProviderInput,
  observation: Parameters<DiagnosticLogger["observe"]>[0]
): void {
  try {
    input.observeDiagnostic(observation);
  } catch {
    // Optimization diagnostics cannot revise lifecycle or quality facts.
  }
}

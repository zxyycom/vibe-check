import { isAbsolute } from "node:path";

import { canonicalizeJsonValue, type CanonicalJsonValue } from "../data-boundary/canonical-data.ts";
import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  CustomAdmissionStrategy,
  SchedulerGraphSnapshot,
  SchedulerMeasurementContext
} from "../project-definition/project-definition.ts";
import { prepareSchedulerDurationModel } from "./duration-model/preparation.ts";
import { learnedSelectionLayers } from "./selection-layers.ts";
import { staticDecision } from "./static-decision.ts";
import {
  predictionForTask,
  type SchedulerPredictionInput,
  type SchedulerPredictionSnapshot
} from "./duration-model/prediction.ts";
import {
  createSchedulerCriticalPathSnapshot,
  criticalPathScoreForTask,
  type SchedulerCriticalPathSnapshot
} from "../project-run/task-scheduler/critical-path-ranking.ts";

/** 公开 learned critical-path prepared strategy 的调用方配置。 */
export interface LearnedCriticalPathStrategyOptions {
  /** 调用方拥有的可丢弃 learned duration history 本地目录；必须是绝对路径。 */
  readonly stateDirectory: string;
  /** 为每个公开 Task 提供 canonical-JSON-compatible 的调用方 identity projection。 */
  readonly identityForTask: (task: SchedulerGraphSnapshot["tasks"][number]) => unknown;
  /** 单个 identity 最多保留的样本数；默认 32。 */
  readonly sampleWindow?: number;
  /** 最多保留的 identity 数；默认 4096。 */
  readonly maxHistorySeries?: number;
  /** 正的 cold-start duration 权重（毫秒）；默认 1。 */
  readonly coldStartDurationMs?: number;
  /** 可选调用方 observation sink；observer fault 不改变 scheduling 或 Run facts。 */
  readonly observe?: (event: LearnedCriticalPathObservation) => void | Promise<void>;
}

/** 调用方可选 observer 收到的有界 learned strategy 事件；selection-proposed 不表示 Scheduler 已接受 admission。 */
export type LearnedCriticalPathObservation =
  | Readonly<{
      readonly kind: "history-unavailable";
      readonly reason: "identity-invalid" | "setup-failed";
    }>
  | Readonly<{
      readonly kind: "selection-proposed";
      readonly taskId: string;
      readonly estimatedDurationMs: number;
      readonly criticalPathScore: number;
      readonly sampleCount: number;
      readonly source: "learned" | "project-prior" | "cold-start";
    }>
  | Readonly<{ readonly kind: "recording-unavailable" }>;

/**
 * 构造普通公开 prepared strategy。调用方拥有 history location 与 identity projection；
 * Product 只按同一 custom strategy lifecycle 调用它，不为该 helper 增加特权。
 */
export function createLearnedCriticalPathStrategy(
  options: LearnedCriticalPathStrategyOptions
): CustomAdmissionStrategy {
  if (typeof options.stateDirectory !== "string" || !isAbsolute(options.stateDirectory)) {
    throw new TypeError("learned critical-path stateDirectory must be an absolute path");
  }
  const model = modelOptions(options);
  return Object.freeze({
    kind: "prepared" as const,
    prepare: async ({ graph }) => {
      const predictionInputs = predictionInputsFor(graph, options.identityForTask, model);
      if (predictionInputs === undefined) {
        observe(options, { kind: "history-unavailable", reason: "identity-invalid" });
        return Object.freeze({ decide: staticDecision });
      }
      const durationModel = await prepareSchedulerDurationModel({
        predictionInputs,
        stateDirectory: options.stateDirectory,
        coldStartDurationMs: model.coldStartDurationMs,
        maxSamplesPerSeries: model.sampleWindow,
        maxSeries: model.maxHistorySeries
      });
      if (durationModel.kind === "static-fallback") {
        observe(options, { kind: "history-unavailable", reason: "setup-failed" });
        return Object.freeze({ decide: staticDecision });
      }
      let criticalPath: SchedulerCriticalPathSnapshot;
      try {
        criticalPath = createSchedulerCriticalPathSnapshot(graph, durationModel.prediction);
      } catch {
        observe(options, { kind: "history-unavailable", reason: "setup-failed" });
        return Object.freeze({ decide: staticDecision });
      }
      return Object.freeze({
        decide: (context: AdmissionPolicyContext) =>
          learnedDecision(context, durationModel.prediction, criticalPath, options),
        complete: async (context: SchedulerMeasurementContext) => {
          const recorded = await durationModel.record(context);
          if (recorded.kind === "failed" || recorded.writeObservation === "failed") {
            observe(options, { kind: "recording-unavailable" });
          }
        }
      });
    }
  });
}

function modelOptions(options: LearnedCriticalPathStrategyOptions): Readonly<{
  readonly coldStartDurationMs: number;
  readonly maxHistorySeries: number;
  readonly sampleWindow: number;
}> {
  const coldStartDurationMs = options.coldStartDurationMs ?? 1;
  const maxHistorySeries = options.maxHistorySeries ?? 4_096;
  const sampleWindow = options.sampleWindow ?? 32;
  validatePositiveFinite(coldStartDurationMs, "coldStartDurationMs");
  validateBoundedInteger(maxHistorySeries, "maxHistorySeries", 4_096);
  validateBoundedInteger(sampleWindow, "sampleWindow", 32);
  return Object.freeze({ coldStartDurationMs, maxHistorySeries, sampleWindow });
}

function validatePositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0)
    throw new TypeError(`learned critical-path ${name} must be positive and finite`);
}

function validateBoundedInteger(value: number, name: string, maximum: number): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum)
    throw new TypeError(`learned critical-path ${name} must be a positive safe integer`);
}

function predictionInputsFor(
  graph: SchedulerGraphSnapshot,
  identityForTask: LearnedCriticalPathStrategyOptions["identityForTask"],
  model: Readonly<{
    readonly coldStartDurationMs: number;
    readonly maxHistorySeries: number;
    readonly sampleWindow: number;
  }>
): readonly SchedulerPredictionInput[] | undefined {
  const inputs: SchedulerPredictionInput[] = [];
  for (const task of graph.tasks) {
    let identity: CanonicalJsonValue | undefined;
    try {
      identity = canonicalizeJsonValue({ historyKey: identityForTask(task), model });
    } catch {
      return undefined;
    }
    if (identity === undefined) return undefined;
    inputs.push(
      Object.freeze({
        authoredOptions: identity,
        checkId: task.taskId,
        flags: null,
        taskId: task.taskId
      })
    );
  }
  return Object.freeze(inputs);
}

function learnedDecision(
  context: AdmissionPolicyContext,
  prediction: SchedulerPredictionSnapshot,
  criticalPath: SchedulerCriticalPathSnapshot,
  options: LearnedCriticalPathStrategyOptions
): AdmissionProposal {
  const selected = selectLearnedCandidate(context, criticalPath);
  if (!selected.canAdmit) return Object.freeze({ kind: "wait" });
  const taskPrediction = predictionForTask(prediction, selected.taskId);
  const score = criticalPathScoreForTask(criticalPath, selected.taskId);
  if (taskPrediction !== undefined && score !== undefined) {
    observe(
      options,
      Object.freeze({
        kind: "selection-proposed",
        taskId: selected.taskId,
        criticalPathScore: score,
        estimatedDurationMs: taskPrediction.estimatedDurationMs,
        sampleCount: taskPrediction.sampleCount,
        source: taskPrediction.source
      })
    );
  }
  return Object.freeze({ kind: "select", taskId: selected.taskId });
}

function selectLearnedCandidate(
  context: AdmissionPolicyContext,
  criticalPath: SchedulerCriticalPathSnapshot
): AdmissionPolicyContext["candidates"][number] {
  const layers = learnedSelectionLayers(context);
  if (layers.tightening.length > 0)
    return requiredFirst(
      sortConstrained(layers.tightening, layers.taskById, layers.scopeById, criticalPath)
    );
  if (layers.continuation.length > 0)
    return requiredFirst(
      sortConstrained(layers.continuation, layers.taskById, layers.scopeById, criticalPath)
    );
  return requiredFirst(
    [...context.candidates].sort(learnedCandidateComparator(layers.taskById, criticalPath))
  );
}

function learnedCandidateComparator(
  taskById: ReadonlyMap<string, SchedulerGraphSnapshot["tasks"][number]>,
  criticalPath: SchedulerCriticalPathSnapshot
): (
  left: AdmissionPolicyContext["candidates"][number],
  right: AdmissionPolicyContext["candidates"][number]
) => number {
  return (left, right) => compareLearnedTasks(taskById, criticalPath, left.taskId, right.taskId);
}

function sortConstrained(
  candidates: readonly AdmissionPolicyContext["candidates"][number][],
  taskById: ReadonlyMap<string, SchedulerGraphSnapshot["tasks"][number]>,
  scopeById: ReadonlyMap<string, SchedulerGraphSnapshot["scopes"][number]>,
  criticalPath: SchedulerCriticalPathSnapshot
): AdmissionPolicyContext["candidates"][number][] {
  return [...candidates].sort(learnedConstrainedComparator(taskById, scopeById, criticalPath));
}

function learnedConstrainedComparator(
  taskById: ReadonlyMap<string, SchedulerGraphSnapshot["tasks"][number]>,
  scopeById: ReadonlyMap<string, SchedulerGraphSnapshot["scopes"][number]>,
  criticalPath: SchedulerCriticalPathSnapshot
): (
  left: AdmissionPolicyContext["candidates"][number],
  right: AdmissionPolicyContext["candidates"][number]
) => number {
  return (left, right) => {
    const leftScope = requiredLearnedScope(left, taskById, scopeById);
    const rightScope = requiredLearnedScope(right, taskById, scopeById);
    return (
      leftScope.maxParallel - rightScope.maxParallel ||
      compareLearnedTasks(taskById, criticalPath, left.taskId, right.taskId) ||
      compareText(leftScope.id, rightScope.id) ||
      compareText(left.taskId, right.taskId)
    );
  };
}

function requiredLearnedScope(
  candidate: AdmissionPolicyContext["candidates"][number],
  taskById: ReadonlyMap<string, SchedulerGraphSnapshot["tasks"][number]>,
  scopeById: ReadonlyMap<string, SchedulerGraphSnapshot["scopes"][number]>
): SchedulerGraphSnapshot["scopes"][number] {
  const task = taskById.get(candidate.taskId);
  const scope =
    task?.scopeId === null || task === undefined ? undefined : scopeById.get(task.scopeId);
  if (scope === undefined) throw new Error("constrained task is missing a scope");
  return scope;
}
function compareLearnedTasks(
  taskById: ReadonlyMap<string, SchedulerGraphSnapshot["tasks"][number]>,
  criticalPath: SchedulerCriticalPathSnapshot,
  leftId: string,
  rightId: string
): number {
  const left = taskById.get(leftId);
  const right = taskById.get(rightId);
  if (left === undefined || right === undefined)
    throw new Error("learned candidate is missing from graph");
  const leftScore = criticalPathScoreForTask(criticalPath, leftId);
  const rightScore = criticalPathScoreForTask(criticalPath, rightId);
  if (leftScore === undefined || rightScore === undefined)
    throw new Error("learned scheduler score is missing");
  return (
    rightScore - leftScore ||
    right.admissionPriority - left.admissionPriority ||
    compareText(leftId, rightId)
  );
}

function observe(
  options: LearnedCriticalPathStrategyOptions,
  event: LearnedCriticalPathObservation
): void {
  try {
    const observed = options.observe?.(event);
    if (observed !== undefined) void Promise.resolve(observed).catch(() => undefined);
  } catch {
    // Caller observation is contained.
  }
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function requiredFirst<T>(values: readonly T[]): T {
  const first = values[0];
  if (first === undefined) throw new Error("learned strategy requires a candidate");
  return first;
}

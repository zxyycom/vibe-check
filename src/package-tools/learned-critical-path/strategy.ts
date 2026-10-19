import { defineContextCallback } from "../context-callback/define-context-callback.ts";
import { isAbsolute } from "node:path";

import {
  canonicalizeJsonValue,
  type CanonicalJsonValue
} from "../../data-boundary/canonical-data.ts";
import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  SchedulerGraphSnapshot
} from "../../project-definition/project-definition.ts";
import { prepareSchedulerDurationModel } from "./duration-model/preparation.ts";
import {
  createLearnedSelectionGraph,
  firstCandidateBy,
  learnedSelectionLayers,
  type LearnedSelectionGraph
} from "./selection-layers.ts";
import { createStaticDecision } from "./static-decision.ts";
import {
  type SchedulerPredictionInput,
  type SchedulerPredictionSnapshot,
  type SchedulerTaskPrediction
} from "./duration-model/prediction.ts";
import {
  createSchedulerCriticalPathSnapshot,
  type SchedulerCriticalPathSnapshot
} from "./critical-path-ranking.ts";

import type {
  LearnedDecisionContext,
  LearnedCriticalPathObservation,
  LearnedCriticalPathStrategy,
  LearnedCriticalPathStrategyOptions
} from "./strategy-contract.ts";
export type {
  LearnedCriticalPathObservation,
  LearnedCriticalPathStrategyOptions
} from "./strategy-contract.ts";

/**
 * 基于本地时长历史构造 critical-path prepared strategy。
 * 调用方提供 history 目录与任务 identity；返回值遵循公开的 custom strategy lifecycle。
 * `stateDirectory` 非绝对路径或 model 数值配置非法时，factory 直接抛出 `TypeError`，不属于 Run 内的 history 退化。
 *
 * @see [配置 history 与任务 identity](../../../docs/guides/learned-scheduling.md#配置-history-与任务-identity)
 * @see [退化与观察](../../../docs/guides/learned-scheduling.md#退化与观察)
 */
export function createLearnedCriticalPathStrategy(
  options: LearnedCriticalPathStrategyOptions
): LearnedCriticalPathStrategy {
  if (typeof options.stateDirectory !== "string" || !isAbsolute(options.stateDirectory)) {
    throw new TypeError("learned critical-path stateDirectory must be an absolute path");
  }
  const model = modelOptions(options);
  return Object.freeze({
    kind: "prepared" as const,
    prepare: defineContextCallback("scheduler.prepare", {
      contextNeeds: ["graph"],
      callback: async ({ graph }) => {
        const predictionInputs = predictionInputsFor(graph, options.identityForTask, model);
        if (predictionInputs === undefined) {
          observe(options, { kind: "history-unavailable", reason: "identity-invalid" });
          return Object.freeze({ decide: createStaticDecision(graph) });
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
          return Object.freeze({ decide: createStaticDecision(graph) });
        }
        let decisionIndexes: LearnedDecisionIndexes;
        try {
          const criticalPath = createSchedulerCriticalPathSnapshot(graph, durationModel.prediction);
          decisionIndexes = createLearnedDecisionIndexes(
            graph,
            durationModel.prediction,
            criticalPath
          );
        } catch {
          observe(options, { kind: "history-unavailable", reason: "setup-failed" });
          return Object.freeze({ decide: createStaticDecision(graph) });
        }
        return Object.freeze({
          decide: defineContextCallback("scheduler.decide", {
            contextNeeds: ["activeScopeIds", "candidates", "capacity"],
            callback: (context) => learnedDecision(context, decisionIndexes, options)
          }),
          terminalEffect: defineContextCallback("scheduler.terminal", {
            contextNeeds: ["execution", "taskTimings"],
            callback: async (context) => {
              const recorded = await durationModel.record(context);
              if (recorded.kind === "failed" || recorded.writeObservation === "failed") {
                observe(options, { kind: "recording-unavailable" });
              }
            }
          })
        });
      }
    })
  });
}

interface LearnedDecisionIndexes {
  readonly graph: LearnedSelectionGraph;
  readonly predictionByTaskId: ReadonlyMap<string, SchedulerTaskPrediction>;
  readonly scoreByTaskId: ReadonlyMap<string, number>;
}

function createLearnedDecisionIndexes(
  graph: SchedulerGraphSnapshot,
  prediction: SchedulerPredictionSnapshot,
  criticalPath: SchedulerCriticalPathSnapshot
): LearnedDecisionIndexes {
  const predictionByTaskId = new Map<string, SchedulerTaskPrediction>();
  for (const taskPrediction of prediction.predictions) {
    if (!predictionByTaskId.has(taskPrediction.taskId)) {
      predictionByTaskId.set(taskPrediction.taskId, taskPrediction);
    }
  }
  const scoreByTaskId = new Map<string, number>();
  for (const score of criticalPath.scores) {
    if (!scoreByTaskId.has(score.taskId)) scoreByTaskId.set(score.taskId, score.criticalPathScore);
  }
  return Object.freeze({
    graph: createLearnedSelectionGraph(graph),
    predictionByTaskId,
    scoreByTaskId
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
  context: LearnedDecisionContext,
  indexes: LearnedDecisionIndexes,
  options: LearnedCriticalPathStrategyOptions
): AdmissionProposal {
  const selected = selectLearnedCandidate(context, indexes);
  if (!selected.canAdmit) return Object.freeze({ kind: "wait" });
  const taskPrediction = indexes.predictionByTaskId.get(selected.taskId);
  const score = indexes.scoreByTaskId.get(selected.taskId);
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
  context: LearnedDecisionContext,
  indexes: LearnedDecisionIndexes
): AdmissionPolicyContext["candidates"][number] {
  const layers = learnedSelectionLayers(context, indexes.graph);
  if (layers.tightening.length > 0)
    return requiredCandidate(
      firstCandidateBy(
        layers.tightening,
        learnedConstrainedComparator(layers.taskById, layers.scopeById, indexes.scoreByTaskId)
      )
    );
  if (layers.continuation.length > 0)
    return requiredCandidate(
      firstCandidateBy(
        layers.continuation,
        learnedConstrainedComparator(layers.taskById, layers.scopeById, indexes.scoreByTaskId)
      )
    );
  return requiredCandidate(
    firstCandidateBy(context.candidates, (left, right) =>
      compareLearnedTasks(layers.taskById, indexes.scoreByTaskId, left.taskId, right.taskId)
    )
  );
}

function learnedConstrainedComparator(
  taskById: ReadonlyMap<string, SchedulerGraphSnapshot["tasks"][number]>,
  scopeById: ReadonlyMap<string, SchedulerGraphSnapshot["scopes"][number]>,
  scoreByTaskId: ReadonlyMap<string, number>
): (
  left: AdmissionPolicyContext["candidates"][number],
  right: AdmissionPolicyContext["candidates"][number]
) => number {
  return (left, right) => {
    const leftScope = requiredLearnedScope(left, taskById, scopeById);
    const rightScope = requiredLearnedScope(right, taskById, scopeById);
    return (
      leftScope.maxParallel - rightScope.maxParallel ||
      compareLearnedTasks(taskById, scoreByTaskId, left.taskId, right.taskId) ||
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
  scoreByTaskId: ReadonlyMap<string, number>,
  leftId: string,
  rightId: string
): number {
  const left = taskById.get(leftId);
  const right = taskById.get(rightId);
  if (left === undefined || right === undefined)
    throw new Error("learned candidate is missing from graph");
  const leftScore = scoreByTaskId.get(leftId);
  const rightScore = scoreByTaskId.get(rightId);
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

function requiredCandidate<T>(first: T | undefined): T {
  if (first === undefined) throw new Error("learned strategy requires a candidate");
  return first;
}

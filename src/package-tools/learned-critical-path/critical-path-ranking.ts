import type { SchedulerGraphSnapshot } from "../../project-definition/project-definition.ts";

/** The pure ranking algorithm only needs immutable estimated durations keyed by Task ID. */
export interface SchedulerCriticalPathPredictionSnapshot {
  readonly predictions: readonly Readonly<{
    readonly estimatedDurationMs: number;
    readonly taskId: string;
  }>[];
}

export interface SchedulerCriticalPathScore {
  readonly criticalPathScore: number;
  readonly taskId: string;
}

/** A graph-derived immutable score table; it retains no dependency or authored-input payload. */
export interface SchedulerCriticalPathSnapshot {
  readonly scores: readonly SchedulerCriticalPathScore[];
}

/** Computes directed dependsOn + observes downstream scores once before Scheduler admission. */
export function createSchedulerCriticalPathSnapshot(
  graph: SchedulerGraphSnapshot,
  prediction: SchedulerCriticalPathPredictionSnapshot
): SchedulerCriticalPathSnapshot {
  const downstreamByTaskId = new Map<string, Set<string>>();
  for (const task of graph.tasks) downstreamByTaskId.set(task.taskId, new Set<string>());
  for (const task of graph.tasks) {
    for (const upstreamTaskId of [...task.dependsOn, ...task.observes]) {
      const downstream = downstreamByTaskId.get(upstreamTaskId);
      if (downstream === undefined) {
        throw new TypeError(`critical path graph has unknown task ${upstreamTaskId}`);
      }
      downstream.add(task.taskId);
    }
  }

  const scoreByTaskId = new Map<string, number>();
  const visitingTaskIds = new Set<string>();
  const scoreFor = (taskId: string): number => {
    const existing = scoreByTaskId.get(taskId);
    if (existing !== undefined) return existing;
    if (visitingTaskIds.has(taskId)) throw new TypeError("critical path graph must be acyclic");
    const taskPrediction = prediction.predictions.find((entry) => entry.taskId === taskId);
    if (taskPrediction === undefined)
      throw new TypeError(`critical path prediction missing task ${taskId}`);
    visitingTaskIds.add(taskId);
    let greatestDownstreamScore = 0;
    for (const downstreamTaskId of downstreamByTaskId.get(taskId) ?? []) {
      greatestDownstreamScore = Math.max(greatestDownstreamScore, scoreFor(downstreamTaskId));
    }
    visitingTaskIds.delete(taskId);
    const score = saturatingSum(taskPrediction.estimatedDurationMs, greatestDownstreamScore);
    scoreByTaskId.set(taskId, score);
    return score;
  };

  return Object.freeze({
    scores: Object.freeze(
      graph.tasks.map((task) =>
        Object.freeze({ criticalPathScore: scoreFor(task.taskId), taskId: task.taskId })
      )
    )
  });
}

export function criticalPathScoreForTask(
  snapshot: SchedulerCriticalPathSnapshot,
  taskId: string
): number | undefined {
  return snapshot.scores.find((score) => score.taskId === taskId)?.criticalPathScore;
}

function saturatingSum(left: number, right: number): number {
  return left > Number.MAX_SAFE_INTEGER - right ? Number.MAX_SAFE_INTEGER : left + right;
}

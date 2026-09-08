import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  AdmissionState,
  SchedulerGraphSnapshot,
} from "../../../../scripts/project/node_modules/@zxyycom/vibe-check/types/index.d.ts";

export type CandidatePolicyId =
  "spt-global" | "lpt-global" | "critical-path-global" | "bounded-bnb-global";
export type PredictionMap = Readonly<Record<string, number>>;

export interface BnbCall {
  readonly complete: boolean;
  readonly expanded: number;
  readonly firstAction: AdmissionProposal;
  /** Makespan of the best legal schedule found in the stated prediction model. */
  readonly predictedMakespan: number;
  readonly pruned: number;
}

export interface BnbTotals {
  readonly calls: number;
  readonly completeCalls: number;
  readonly expanded: number;
  readonly pruned: number;
  readonly truncatedCalls: number;
}

export function createCandidatePolicy(
  id: CandidatePolicyId,
  predictions: PredictionMap,
): Readonly<{
  readonly decide: (context: AdmissionPolicyContext) => AdmissionProposal;
  readonly totals: () => BnbTotals | null;
}> {
  if (id === "spt-global")
    return Object.freeze({
      decide: (context) => rank(context, predictions, "short"),
      totals: () => null,
    });
  if (id === "lpt-global")
    return Object.freeze({
      decide: (context) => rank(context, predictions, "long"),
      totals: () => null,
    });
  if (id === "critical-path-global") {
    const score = criticalPathScores; // score is graph-specific and computed from public static graph only.
    return Object.freeze({
      decide: (context) =>
        rank(
          context,
          predictions,
          "critical",
          score(context.graph, predictions),
        ),
      totals: () => null,
    });
  }
  const counters = {
    calls: 0,
    completeCalls: 0,
    expanded: 0,
    pruned: 0,
    truncatedCalls: 0,
  };
  return Object.freeze({
    decide: (context) => {
      const call = solveBnb(context, predictions, 4096, true);
      counters.calls += 1;
      counters.expanded += call.expanded;
      counters.pruned += call.pruned;
      if (call.complete) counters.completeCalls += 1;
      else counters.truncatedCalls += 1;
      return call.firstAction;
    },
    totals: () => Object.freeze({ ...counters }),
  });
}

type RankKind = "short" | "long" | "critical";
function rank(
  context: AdmissionPolicyContext,
  predictions: PredictionMap,
  kind: RankKind,
  scores?: Readonly<Record<string, number>>,
): AdmissionProposal {
  const tasks = new Map(
    context.graph.tasks.map((task) => [task.taskId, task] as const),
  );
  const selected = context.candidates
    .filter(({ canAdmit }) => canAdmit)
    .sort((left, right) => {
      const leftTask = required(tasks.get(left.taskId), left.taskId);
      const rightTask = required(tasks.get(right.taskId), right.taskId);
      const leftScore =
        kind === "critical"
          ? required(scores?.[left.taskId], left.taskId)
          : required(predictions[left.taskId], left.taskId);
      const rightScore =
        kind === "critical"
          ? required(scores?.[right.taskId], right.taskId)
          : required(predictions[right.taskId], right.taskId);
      const byScore =
        kind === "short" ? leftScore - rightScore : rightScore - leftScore;
      return (
        byScore ||
        rightTask.admissionPriority - leftTask.admissionPriority ||
        text(left.taskId, right.taskId)
      );
    })[0];
  return selected === undefined
    ? Object.freeze({ kind: "wait" as const })
    : Object.freeze({ kind: "select" as const, taskId: selected.taskId });
}

/** Static predicted downstream score: both dependency and observation edges contribute. */
export function criticalPathScores(
  graph: SchedulerGraphSnapshot,
  predictions: PredictionMap,
): Readonly<Record<string, number>> {
  const children = new Map(
    graph.tasks.map(({ taskId }) => [taskId, [] as string[]] as const),
  );
  for (const task of graph.tasks)
    for (const predecessor of [...task.dependsOn, ...task.observes])
      required(children.get(predecessor), predecessor).push(task.taskId);
  const visiting = new Set<string>();
  const scores: Record<string, number> = {};
  const visit = (taskId: string): number => {
    const known = scores[taskId];
    if (known !== undefined) return known;
    if (visiting.has(taskId))
      throw new Error(`prediction graph cycle at ${taskId}`);
    visiting.add(taskId);
    const next = required(children.get(taskId), taskId);
    const score =
      required(predictions[taskId], taskId) + Math.max(0, ...next.map(visit));
    visiting.delete(taskId);
    scores[taskId] = score;
    return score;
  };
  for (const task of graph.tasks) visit(task.taskId);
  return Object.freeze(scores);
}

interface Node {
  readonly elapsed: number;
  readonly firstAction: AdmissionProposal | null;
  readonly remaining: ReadonlyMap<string, number>;
  readonly state: AdmissionState;
}

/**
 * Public-state branch and bound. It is exact only for its stated hypothetical model:
 * all-satisfied settlement, no contention slowdown, and a full-duration estimate for each
 * currently running task at the observed boundary. It never consults simulation work.
 */
export function solveBnb(
  context: AdmissionPolicyContext,
  predictions: PredictionMap,
  budget: number,
  prune: boolean,
): BnbCall {
  const startRemaining = new Map(
    context.runningTaskIds.map(
      (taskId) => [taskId, required(predictions[taskId], taskId)] as const,
    ),
  );
  const fallback = greedyCompletion(
    {
      elapsed: 0,
      firstAction: null,
      remaining: startRemaining,
      state: context.admissionState,
    },
    predictions,
  );
  let incumbent = fallback;
  let expanded = 0;
  let pruned = 0;
  let complete = true;
  const pending: Node[] = [
    {
      elapsed: 0,
      firstAction: null,
      remaining: startRemaining,
      state: context.admissionState,
    },
  ];
  while (pending.length > 0) {
    const node = pending.pop();
    if (node === undefined) break;
    if (expanded >= budget) {
      complete = false;
      break;
    }
    expanded += 1;
    if (prune && lowerBound(node, predictions) >= incumbent.elapsed) {
      pruned += 1;
      continue;
    }
    if (node.state.inspection.nextBoundary === "complete") {
      if (node.elapsed < incumbent.elapsed) incumbent = node;
      continue;
    }
    for (const child of branch(node, predictions)) pending.push(child);
  }
  const firstAction =
    incumbent.firstAction ?? fallbackAction(context, predictions);
  return Object.freeze({
    complete,
    expanded,
    firstAction,
    predictedMakespan: incumbent.elapsed,
    pruned,
  });
}

function branch(node: Node, predictions: PredictionMap): readonly Node[] {
  const branches: Node[] = [];
  for (const taskId of node.state.catalog.selectableTaskIds) {
    const selected = node.state.select(taskId);
    if (!selected.accepted)
      throw new Error(`public state rejected candidate ${taskId}`);
    const firstAction =
      node.firstAction ?? Object.freeze({ kind: "select" as const, taskId });
    branches.push({
      elapsed: node.elapsed,
      firstAction,
      remaining: new Map([
        ...node.remaining,
        [taskId, required(predictions[taskId], taskId)],
      ]),
      state: selected.state,
    });
  }
  if (node.state.inspection.runningTaskIds.length > 0)
    branches.push(waitBranch(node));
  return branches;
}

function waitBranch(node: Node): Node {
  const running = node.state.inspection.runningTaskIds;
  const delta = Math.min(
    ...running.map((taskId) => required(node.remaining.get(taskId), taskId)),
  );
  const remaining = new Map(node.remaining);
  let state = node.state;
  for (const taskId of running)
    remaining.set(taskId, required(remaining.get(taskId), taskId) - delta);
  for (const taskId of running
    .filter((taskId) => required(remaining.get(taskId), taskId) <= 0)
    .sort(text)) {
    remaining.delete(taskId);
    const settled = state.settle(taskId, "satisfied");
    if (!settled.accepted)
      throw new Error(`public state rejected predicted settle ${taskId}`);
    state = settled.state;
  }
  return {
    elapsed: node.elapsed + delta,
    firstAction: node.firstAction ?? Object.freeze({ kind: "wait" as const }),
    remaining,
    state,
  };
}

function greedyCompletion(start: Node, predictions: PredictionMap): Node {
  let node = start;
  while (node.state.inspection.nextBoundary !== "complete") {
    const taskId = [...node.state.catalog.selectableTaskIds].sort(
      (left, right) =>
        required(predictions[right], right) -
          required(predictions[left], left) || text(left, right),
    )[0];
    if (taskId === undefined) {
      node = waitBranch(node);
      continue;
    }
    const selected = node.state.select(taskId);
    if (!selected.accepted)
      throw new Error(`public state rejected greedy candidate ${taskId}`);
    node = {
      elapsed: node.elapsed,
      firstAction:
        node.firstAction ?? Object.freeze({ kind: "select" as const, taskId }),
      remaining: new Map([
        ...node.remaining,
        [taskId, required(predictions[taskId], taskId)],
      ]),
      state: selected.state,
    };
  }
  return node;
}

function lowerBound(node: Node, predictions: PredictionMap): number {
  const unsettled = new Set<string>([
    ...node.state.catalog.selectableTaskIds,
    ...node.state.catalog.nonSelectableTasks.map(({ taskId }) => taskId),
    ...node.state.inspection.runningTaskIds,
  ]);
  const total = [...unsettled].reduce(
    (sum, taskId) =>
      sum +
      (node.remaining.get(taskId) ?? required(predictions[taskId], taskId)),
    0,
  );
  const running = Math.max(
    0,
    ...node.state.inspection.runningTaskIds.map((taskId) =>
      required(node.remaining.get(taskId), taskId),
    ),
  );
  return (
    node.elapsed +
    Math.max(running, total / node.state.inspection.capacity.maxParallel)
  );
}

function fallbackAction(
  context: AdmissionPolicyContext,
  predictions: PredictionMap,
): AdmissionProposal {
  return rank(
    context,
    predictions,
    "critical",
    criticalPathScores(context.graph, predictions),
  );
}
function text(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`missing ${label}`);
  return value;
}

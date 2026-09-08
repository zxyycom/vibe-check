import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  AdmissionState
} from "@zxyycom/vibe-check";

import { advanceRunning } from "./simulation-clock.ts";
import {
  closePendingObservation,
  contextFor,
  emptyContribution,
  recordSelection,
  recordWait,
  updatePeaks
} from "./simulation-observations.ts";
import {
  freezeValue,
  messageFor,
  recordCoreEvent,
  type Run,
  SimulationFault
} from "./simulation-types.ts";
import type { DecisionPolicy } from "./policy.ts";
import type { Scenario } from "./scenario.ts";

export function runUntilComplete(run: Run, policy: DecisionPolicy): void {
  while (run.state.inspection.nextBoundary !== "complete") {
    const candidates = candidatesFor(run.scenario, run.state);
    updatePeaks(run, candidates);
    if (candidates.length === 0) {
      if (run.state.inspection.runningTaskIds.length === 0) {
        throw new SimulationFault("no-progress", "no candidates or running work before completion");
      }
      advanceRunning(run);
      run.boundaryIndex += 1;
      continue;
    }
    closePendingObservation(run);
    const proposal = invokePolicy(policy, contextFor(run, candidates));
    if (proposal.kind === "wait") acceptWait(run);
    else acceptSelection(run, proposal.taskId);
    run.boundaryIndex += 1;
  }
}

function candidatesFor(
  scenario: Scenario,
  state: AdmissionState
): AdmissionPolicyContext["candidates"] {
  const selectable = new Set(state.catalog.selectableTaskIds);
  const capacityBlocked = new Set(
    state.catalog.nonSelectableTasks
      .filter(({ reason }) => isCapacityBlock(reason.kind))
      .map(({ taskId }) => taskId)
  );
  const candidates: Array<{ readonly canAdmit: boolean; readonly taskId: string }> = [];
  for (const { taskId } of scenario.graph.graph.tasks) {
    if (selectable.has(taskId)) candidates.push(Object.freeze({ canAdmit: true, taskId }));
    else if (capacityBlocked.has(taskId))
      candidates.push(Object.freeze({ canAdmit: false, taskId }));
  }
  return Object.freeze(candidates);
}

function isCapacityBlock(kind: string): boolean {
  return (
    kind === "root-capacity-reached" ||
    kind === "scope-capacity-reached" ||
    kind === "resource-capacity-insufficient"
  );
}

function invokePolicy(policy: DecisionPolicy, context: AdmissionPolicyContext): AdmissionProposal {
  try {
    const proposal: unknown = policy(context);
    if (!isProposal(proposal)) {
      throw new SimulationFault("policy-rejected", "policy returned a malformed proposal");
    }
    return proposal;
  } catch (error) {
    if (error instanceof SimulationFault) throw error;
    throw new SimulationFault("policy-rejected", messageFor(error, "policy threw"));
  }
}

function isProposal(value: unknown): value is AdmissionProposal {
  if (!isPlainRecord(value) || !("kind" in value)) return false;
  if (value.kind === "wait") return Reflect.ownKeys(value).length === 1;
  return (
    value.kind === "select" &&
    Reflect.ownKeys(value).length === 2 &&
    "taskId" in value &&
    typeof value.taskId === "string"
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Reflect.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function acceptSelection(run: Run, taskId: string): void {
  const selected = run.state.select(taskId);
  if (!selected.accepted) {
    run.trace.push(
      freezeValue({
        atMs: run.virtualTimeMs,
        boundaryIndex: run.boundaryIndex,
        kind: "policy-rejection" as const,
        message: `public select rejected: ${selected.reason.kind}`,
        taskId
      })
    );
    throw new SimulationFault(
      "policy-rejected",
      `public AdmissionState rejected select(${taskId}): ${selected.reason.kind}`
    );
  }
  recordCoreEvent(run);
  run.state = selected.state;
  run.admittedCount += 1;
  run.maxRunning = Math.max(run.maxRunning, run.state.inspection.runningTaskIds.length);
  run.pendingObservation = {
    contribution: emptyContribution(),
    effects: [{ kind: "admitted", taskId }],
    kind: "select",
    sequence: run.admittedCount + run.acceptedWaitCount,
    taskId
  };
  recordSelection(run, taskId);
}

function acceptWait(run: Run): void {
  if (run.state.inspection.runningTaskIds.length === 0) {
    throw new SimulationFault("no-progress", "policy proposed wait without running work");
  }
  run.acceptedWaitCount += 1;
  run.pendingObservation = {
    contribution: emptyContribution(),
    effects: [],
    kind: "wait",
    sequence: run.admittedCount + run.acceptedWaitCount,
    taskId: null
  };
  recordWait(run);
  advanceRunning(run);
}

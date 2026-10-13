import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runTaskGraph } from "./scheduler.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import {
  continuationPriorityGraph,
  createDeferred,
  decisionFor,
  delay,
  noActivationGraph,
  recordedSchedulerDecisions,
  recordingLogger,
  tighteningScopeGraph,
  waitFor
} from "./task-engine.test-support.ts";

describe("static task engine", () => {
  it("keeps a scope cap active through terminal settlement and prioritizes its continuation", async () => {
    const events: string[] = [];
    const observations: DiagnosticObservation[] = [];
    const releaseTerminal = createDeferred<void>();
    const graph = continuationPriorityGraph();

    const running = runTaskGraph({
      graph,
      maxParallel: 3,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        events.push(`start:${task.id}`);
        if (task.id === "limited-terminal") {
          await releaseTerminal.promise;
        }
        events.push(`end:${task.id}`);
        return task.id;
      }
    });

    await waitFor(() => events.includes("start:limited-terminal"));
    const scopeBudgetWait = decisionFor(graph, {
      activeScopeIds: ["limited"],
      maxParallel: 3,
      pendingTaskIds: ["wide-one", "wide-two"],
      runningTaskIds: ["limited-terminal"],
      settledTasks: [{ kind: "completed", taskId: "limited-work" }]
    });
    assert.equal(scopeBudgetWait.kind, "await-running");
    assert.equal(scopeBudgetWait.blockers.scopeCapacity, true);
    assert.equal(events.includes("start:wide-one"), false);
    assert.equal(events.includes("start:wide-two"), false);
    releaseTerminal.resolve();
    await running;
    assert.ok(events.indexOf("end:limited-terminal") < events.indexOf("start:wide-one"));
    recordedSchedulerDecisions(observations);
  });

  it("recomputes tighter-scope selection after capacity becomes available", async () => {
    const events: string[] = [];
    const observations: DiagnosticObservation[] = [];
    const releaseWide = createDeferred<void>();
    const releaseLow = createDeferred<void>();
    const graph = tighteningScopeGraph();

    const running = runTaskGraph({
      graph,
      maxParallel: 2,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        events.push(`start:${task.id}`);
        if (task.id === "gate") {
          await waitFor(() => events.includes("start:wide-one"));
        }
        if (task.id === "wide-one") {
          await releaseWide.promise;
        }
        if (task.id === "low") {
          await releaseLow.promise;
        }
        events.push(`end:${task.id}`);
        return task.id;
      }
    });

    await waitFor(() => events.includes("end:gate"));
    await delay(2);
    const constrainedWait = decisionFor(graph, {
      activeScopeIds: ["wide"],
      maxParallel: 2,
      pendingTaskIds: ["wide-two", "wide-terminal", "low"],
      runningTaskIds: ["wide-one"],
      settledTasks: [{ kind: "completed", taskId: "gate" }]
    });
    assert.equal(constrainedWait.kind, "await-running");

    const recomputedAdmission = decisionFor(graph, {
      activeScopeIds: ["wide"],
      maxParallel: 2,
      pendingTaskIds: ["wide-two", "wide-terminal", "low"],
      settledTasks: [{ kind: "completed", taskId: "gate" }]
    });
    assert.equal(recomputedAdmission.kind, "admit");
    assert.equal(recomputedAdmission.taskId, "low");
    assert.equal(recomputedAdmission.scopeToActivate, "low");
    assert.deepEqual(recomputedAdmission.capacity, {
      effectiveMaxParallel: 2,
      maxParallel: 2,
      running: 0
    });

    const overlappingScopes = decisionFor(graph, {
      activeScopeIds: ["wide", "low"],
      maxParallel: 3,
      pendingTaskIds: ["wide-two", "wide-terminal"],
      runningTaskIds: ["wide-one", "low"],
      settledTasks: [{ kind: "completed", taskId: "gate" }]
    });
    assert.equal(overlappingScopes.kind, "await-running");
    assert.deepEqual(overlappingScopes.capacity, {
      effectiveMaxParallel: 1,
      maxParallel: 3,
      running: 2
    });
    const afterTighterSettlement = decisionFor(graph, {
      activeScopeIds: ["wide"],
      maxParallel: 3,
      pendingTaskIds: ["wide-two", "wide-terminal"],
      runningTaskIds: ["wide-one"],
      settledTasks: [
        { kind: "completed", taskId: "gate" },
        { kind: "completed", taskId: "low" }
      ]
    });
    assert.deepEqual(afterTighterSettlement.capacity, {
      effectiveMaxParallel: 2,
      maxParallel: 3,
      running: 1
    });
    const afterAllScopeSettlements = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: [],
      settledTasks: graph.tasks.map((task) => ({ kind: "completed", taskId: task.id }))
    });
    assert.deepEqual(afterAllScopeSettlements.capacity, {
      effectiveMaxParallel: 3,
      maxParallel: 3,
      running: 0
    });
    assert.equal(overlappingScopes.capacity.effectiveMaxParallel, 1);
    assert.equal(Object.isFrozen(overlappingScopes.capacity), true);

    const scopes = [6, 6, 6, 6, 5, 1].map((maxParallel, index) => ({
      id: `scope-${index}`,
      maxParallel,
      activationTaskIds: [`scoped-task-${index}`],
      terminalTaskId: `scoped-task-${index}`
    }));
    const manyScopesGraph = {
      tasks: scopes.map((scope) => ({ id: scope.terminalTaskId, scopeId: scope.id })),
      scopes
    };
    for (const scenario of [
      { activeCount: 0, effectiveMaxParallel: 8 },
      { activeCount: 4, effectiveMaxParallel: 6 },
      { activeCount: 5, effectiveMaxParallel: 5 }
    ]) {
      const decision = decisionFor(manyScopesGraph, {
        activeScopeIds: manyScopesGraph.scopes
          .slice(0, scenario.activeCount)
          .map((scope) => scope.id),
        maxParallel: 8,
        runningTaskIds: manyScopesGraph.tasks.slice(0, scenario.activeCount).map((task) => task.id),
        pendingTaskIds: manyScopesGraph.tasks.slice(scenario.activeCount).map((task) => task.id)
      });
      assert.equal(decision.capacity.effectiveMaxParallel, scenario.effectiveMaxParallel);
    }
    assert.equal(events.includes("start:wide-two"), false);
    assert.equal(events.includes("start:low"), false);
    releaseWide.resolve();
    await waitFor(() => events.includes("start:low"));
    assert.equal(events.includes("start:wide-two"), false);
    releaseLow.resolve();
    await running;
    assert.ok(events.indexOf("start:low") < events.indexOf("start:wide-two"));
    recordedSchedulerDecisions(observations);
  });

  it("orders constrained selectors by cap then priority without Scheduler policy state", () => {
    const graph = {
      tasks: [
        { id: "ordinary", admissionPriority: 99 },
        { id: "tight-low", admissionPriority: 1, scopeId: "tight-low" },
        { id: "tight-high", admissionPriority: 5, scopeId: "tight-high" },
        { id: "tighter", admissionPriority: -1, scopeId: "tighter" }
      ],
      scopes: [
        {
          id: "tight-low",
          maxParallel: 2,
          activationTaskIds: ["tight-low"],
          terminalTaskId: "tight-low"
        },
        {
          id: "tight-high",
          maxParallel: 2,
          activationTaskIds: ["tight-high"],
          terminalTaskId: "tight-high"
        },
        { id: "tighter", maxParallel: 1, activationTaskIds: ["tighter"], terminalTaskId: "tighter" }
      ]
    };
    const capFirst = decisionFor(graph, { maxParallel: 3 });
    assert.equal(capFirst.kind, "admit");
    assert.equal(capFirst.taskId, "tighter");

    const priorityWithinCap = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: ["ordinary", "tight-low", "tight-high"]
    });
    assert.equal(priorityWithinCap.kind, "admit");
    assert.equal(priorityWithinCap.taskId, "tight-high");

    const preservedTieBreak = decisionFor(
      {
        tasks: [
          { id: "later-task", admissionPriority: 5, scopeId: "later-scope" },
          { id: "earlier-task", admissionPriority: 5, scopeId: "earlier-scope" }
        ],
        scopes: [
          {
            id: "later-scope",
            maxParallel: 2,
            activationTaskIds: ["later-task"],
            terminalTaskId: "later-task"
          },
          {
            id: "earlier-scope",
            maxParallel: 2,
            activationTaskIds: ["earlier-task"],
            terminalTaskId: "earlier-task"
          }
        ]
      },
      { maxParallel: 3 }
    );
    assert.equal(preservedTieBreak.kind, "admit");
    assert.equal(preservedTieBreak.taskId, "earlier-task");

    const continuation = decisionFor(graph, {
      activeScopeIds: ["tight-low", "tight-high"],
      maxParallel: 3,
      pendingTaskIds: ["ordinary", "tight-low", "tight-high"]
    });
    assert.equal(continuation.kind, "admit");
    assert.equal(continuation.taskId, "tight-high");

    const tighteningGraph = tighteningScopeGraph();
    const reserved = decisionFor(
      {
        ...tighteningGraph,
        tasks: [...tighteningGraph.tasks, { id: "urgent", admissionPriority: 99 }]
      },
      {
        activeScopeIds: ["wide"],
        maxParallel: 2,
        pendingTaskIds: ["wide-two", "wide-terminal", "low", "urgent"],
        settledTasks: [{ kind: "completed", taskId: "gate" }]
      }
    );
    assert.equal(reserved.kind, "admit");
    assert.equal(reserved.taskId, "low");
  });

  it("does not activate a cap for a scope with no activation task", async () => {
    const started: string[] = [];
    const release = createDeferred<void>();
    const graph = noActivationGraph();

    const running = runTaskGraph({
      graph,
      maxParallel: 3,
      execute: async (task) => {
        started.push(task.id);
        await release.promise;
        return task.id;
      }
    });

    await waitFor(() => started.length === 3);
    assert.deepEqual([...started].sort(), ["wide-one", "wide-two", "zero-terminal"]);
    release.resolve();
    await running;
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runTaskGraph } from "./scheduler.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import {
  completedValues,
  decisionFor,
  delay,
  recordedSchedulerDecisions,
  recordingLogger,
  rootBudgetGraph
} from "./task-engine.test-support.ts";

describe("static task engine", () => {
  it("respects one root budget for dependency order and named mutex execution", async () => {
    const events: string[] = [];
    const observations: DiagnosticObservation[] = [];
    let active = 0;
    let maxActive = 0;
    const graph = rootBudgetGraph();

    const run = await runTaskGraph<string>({
      graph,
      maxParallel: 3,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        events.push(`start:${task.id}`);
        await delay(task.id === "base" ? 10 : 2);
        events.push(`end:${task.id}`);
        active -= 1;
        return task.id;
      }
    });

    assert.equal(maxActive, 3);
    assert.ok(events.indexOf("end:base") < events.indexOf("start:dependent"));
    assert.ok(events.indexOf("end:mutex-one") < events.indexOf("start:mutex-two"));
    assert.deepEqual(completedValues(run), [
      "base",
      "dependent",
      "mutex-one",
      "mutex-two",
      "independent"
    ]);
    const rootDecisions = recordedSchedulerDecisions(observations);
    const rootAdmission = rootDecisions[0];
    if (rootAdmission?.kind !== "admit") assert.fail("expected initial scheduler admission");
    assert.equal(rootAdmission.trigger.kind, "execution-started");
    assert.equal(rootAdmission.taskId, "base");
    assert.equal(rootAdmission.admissionPriority, 0);
    assert.deepEqual(rootAdmission.capacity, {
      effectiveMaxParallel: 3,
      maxParallel: 3,
      running: 0
    });
    assert.deepEqual(rootAdmission.graphIdentity, {
      scopes: [],
      tasks: [
        {
          admissionPriority: 0,
          dependsOn: [],
          taskId: "base",
          mutex: [],
          observes: [],
          scopeId: null
        },
        {
          admissionPriority: 0,
          dependsOn: ["base"],
          taskId: "dependent",
          mutex: [],
          observes: [],
          scopeId: null
        },
        {
          admissionPriority: 0,
          dependsOn: [],
          taskId: "mutex-one",
          mutex: ["shared"],
          observes: [],
          scopeId: null
        },
        {
          admissionPriority: 0,
          dependsOn: [],
          taskId: "mutex-two",
          mutex: ["shared"],
          observes: [],
          scopeId: null
        },
        {
          admissionPriority: 0,
          dependsOn: [],
          taskId: "independent",
          mutex: [],
          observes: [],
          scopeId: null
        }
      ]
    });
    assert.deepEqual(rootAdmission.candidates, [
      { canAdmit: true, taskId: "base" },
      { canAdmit: true, taskId: "mutex-one" },
      { canAdmit: true, taskId: "mutex-two" },
      { canAdmit: true, taskId: "independent" }
    ]);
    assert.deepEqual(rootAdmission.proposal, { kind: "select", taskId: "base" });
    assert.deepEqual(rootAdmission.hardGuard, {
      canAdmit: true,
      isCandidate: true,
      kind: "select",
      lifecycleOpen: true,
      taskId: "base"
    });
  });

  it("reuses one stable graph identity across scheduler decision evidence", async () => {
    const observations: DiagnosticObservation[] = [];
    await runTaskGraph({
      diagnosticLogger: recordingLogger(observations),
      execute: () => undefined,
      graph: { tasks: [{ id: "first" }, { id: "second" }] },
      maxParallel: 2
    });
    const graphIdentities = observations
      .filter((observation) => observation.event === "scheduler.decision")
      .flatMap((observation) => {
        const details = observation.details;
        return details !== null && typeof details === "object" && "graphIdentity" in details
          ? [details.graphIdentity]
          : [];
      });
    assert.ok(graphIdentities.length > 1);
    assert.equal(new Set(graphIdentities).size, 1);
  });

  it("distinguishes full graph identities with identical Task IDs but different scheduler semantics", () => {
    const baseline = decisionFor(
      {
        tasks: [
          { id: "source", mutex: ["shared"], scopeId: "limited" },
          { admissionPriority: 1, id: "target", observes: ["source"], scopeId: "limited" }
        ],
        scopes: [
          {
            activationTaskIds: ["source"],
            id: "limited",
            maxParallel: 1,
            terminalTaskId: "target"
          }
        ]
      },
      { maxParallel: 2 }
    );
    const changed = decisionFor(
      {
        tasks: [
          { admissionPriority: 3, id: "source", mutex: ["other"], scopeId: "limited" },
          { admissionPriority: 9, dependsOn: ["source"], id: "target", scopeId: "limited" }
        ],
        scopes: [
          {
            activationTaskIds: ["source"],
            id: "limited",
            maxParallel: 2,
            terminalTaskId: "target"
          }
        ]
      },
      { maxParallel: 2 }
    );

    assert.deepEqual(
      baseline.graphIdentity.tasks.map((task) => task.taskId),
      changed.graphIdentity.tasks.map((task) => task.taskId)
    );
    assert.notDeepEqual(baseline.graphIdentity, changed.graphIdentity);
  });

  it("uses priority only among dependency and mutex eligible ordinary ready tasks", () => {
    const graph = {
      tasks: [
        { id: "low", admissionPriority: -1 },
        { id: "high", admissionPriority: 4 },
        { id: "blocked", admissionPriority: 99, dependsOn: ["missing-ready"] },
        { id: "missing-ready" },
        { id: "mutex-blocked", admissionPriority: 98, mutex: ["shared"] }
      ]
    };
    const selected = decisionFor(graph, {
      maxParallel: 2,
      pendingTaskIds: ["low", "high", "blocked"]
    });
    assert.equal(selected.kind, "admit");
    assert.equal(selected.taskId, "high");
    assert.equal(selected.admissionPriority, 4);

    const stableTie = decisionFor(
      {
        tasks: [
          { id: "first", admissionPriority: 3 },
          { id: "second", admissionPriority: 3 }
        ]
      },
      { maxParallel: 2 }
    );
    assert.equal(stableTie.kind, "admit");
    assert.equal(stableTie.taskId, "first");

    const dependencyBlocked = decisionFor(graph, {
      maxParallel: 2,
      pendingTaskIds: ["low", "blocked"],
      settledTasks: []
    });
    assert.equal(dependencyBlocked.kind, "admit");
    assert.equal(dependencyBlocked.taskId, "low");

    const mutexBlocked = decisionFor(graph, {
      maxParallel: 2,
      pendingTaskIds: ["low", "mutex-blocked"],
      runningMutexes: ["shared"],
      runningTaskIds: ["running"]
    });
    assert.equal(mutexBlocked.kind, "admit");
    assert.equal(mutexBlocked.taskId, "low");

    const noPreemption = decisionFor(
      { tasks: [{ id: "running" }, { id: "high", admissionPriority: 4 }] },
      { maxParallel: 1, pendingTaskIds: ["high"], runningTaskIds: ["running"] }
    );
    assert.equal(noPreemption.kind, "await-running");
  });
});

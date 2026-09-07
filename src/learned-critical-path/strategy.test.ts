import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createAdmissionGraph } from "../project-run/task-scheduler/admission-core/core.ts";
import type {
  AdmissionPolicyContext,
  SchedulerGraphSnapshot
} from "../project-definition/project-definition.ts";
import { createLearnedCriticalPathStrategy } from "./strategy.ts";

describe("public learned critical-path strategy", () => {
  it("uses the public scope layers and returns wait for an unavailable learned preference", async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), "vibe-check-public-learned-"));
    try {
      const strategy = createLearnedCriticalPathStrategy({
        identityForTask: (graphTask) => ({ taskId: graphTask.taskId }),
        stateDirectory
      });
      if (strategy.kind !== "prepared") throw new Error("expected prepared strategy");
      const prepared = await strategy.prepare({ graph: graph() });
      const tightening = prepared.decide(
        context([
          { canAdmit: true, taskId: "ordinary" },
          { canAdmit: true, taskId: "activate" }
        ])
      );
      assert.deepEqual(tightening, { kind: "select", taskId: "activate" });
      const wait = prepared.decide(context([{ canAdmit: false, taskId: "ordinary" }]));
      assert.deepEqual(wait, { kind: "wait" });
    } finally {
      await rm(stateDirectory, { force: true, recursive: true });
    }
  });

  it("orders score, priority, canonical IDs, constrained scope caps, continuations, and static fallback through public data", async () => {
    const stateDirectory = await mkdtemp(join(tmpdir(), "vibe-check-public-learned-order-"));
    try {
      const rankedGraph = graphFor([
        task("high-priority", { admissionPriority: 99 }),
        task("critical-source", { dependsOn: ["critical-tail"] }),
        task("critical-tail")
      ]);
      const learned = await preparedStrategy(stateDirectory, rankedGraph);
      assert.deepEqual(
        learned.decide(
          contextFor(rankedGraph, [
            { canAdmit: true, taskId: "high-priority" },
            { canAdmit: true, taskId: "critical-tail" }
          ])
        ),
        { kind: "select", taskId: "critical-tail" }
      );
      const tieGraph = graphFor([
        task("z", { admissionPriority: 2 }),
        task("a", { admissionPriority: 2 })
      ]);
      const tied = await preparedStrategy(stateDirectory, tieGraph);
      assert.deepEqual(
        tied.decide(
          contextFor(tieGraph, [
            { canAdmit: true, taskId: "z" },
            { canAdmit: true, taskId: "a" }
          ])
        ),
        { kind: "select", taskId: "a" }
      );
      const priorityGraph = graphFor([
        task("low-priority", { admissionPriority: 1 }),
        task("high-priority", { admissionPriority: 2 })
      ]);
      const priority = await preparedStrategy(stateDirectory, priorityGraph);
      assert.deepEqual(
        priority.decide(
          contextFor(priorityGraph, [
            { canAdmit: true, taskId: "low-priority" },
            { canAdmit: true, taskId: "high-priority" }
          ])
        ),
        { kind: "select", taskId: "high-priority" }
      );
      const scopes = Object.freeze([
        Object.freeze({
          activationTaskIds: Object.freeze(["cap-one"]),
          id: "one",
          maxParallel: 1,
          terminalTaskId: "cap-one"
        }),
        Object.freeze({
          activationTaskIds: Object.freeze(["cap-two"]),
          id: "two",
          maxParallel: 2,
          terminalTaskId: "cap-two"
        })
      ]);
      const scopedGraph = graphFor(
        [
          task("cap-one", { scopeId: "one" }),
          task("cap-two", { scopeId: "two" }),
          task("longer-critical-source", { dependsOn: ["cap-two"] })
        ],
        scopes
      );
      const scoped = await preparedStrategy(stateDirectory, scopedGraph);
      assert.deepEqual(
        scoped.decide(
          contextFor(scopedGraph, [
            { canAdmit: true, taskId: "cap-two" },
            { canAdmit: true, taskId: "cap-one" }
          ])
        ),
        { kind: "select", taskId: "cap-one" }
      );
      assert.deepEqual(
        scoped.decide(
          contextFor(
            scopedGraph,
            [
              { canAdmit: true, taskId: "cap-two" },
              { canAdmit: true, taskId: "longer-critical-source" }
            ],
            ["two"]
          )
        ),
        { kind: "select", taskId: "cap-two" }
      );
      const fallback = createLearnedCriticalPathStrategy({
        identityForTask: () => () => undefined,
        stateDirectory
      });
      if (fallback.kind !== "prepared") throw new Error("expected prepared strategy");
      const fallbackPrepared = await fallback.prepare({ graph: scopedGraph });
      assert.deepEqual(
        fallbackPrepared.decide(
          contextFor(scopedGraph, [
            { canAdmit: true, taskId: "cap-two" },
            { canAdmit: true, taskId: "cap-one" }
          ])
        ),
        { kind: "select", taskId: "cap-one" }
      );
    } finally {
      await rm(stateDirectory, { force: true, recursive: true });
    }
  });

  it("rejects a non-absolute history path and contains rejected caller observations", async () => {
    assert.throws(
      () =>
        createLearnedCriticalPathStrategy({
          identityForTask: () => ({}),
          stateDirectory: "relative"
        }),
      /absolute path/
    );
    assert.throws(
      () =>
        createLearnedCriticalPathStrategy({
          identityForTask: () => ({}),
          sampleWindow: 33,
          stateDirectory: "/tmp/state"
        }),
      /sampleWindow/
    );
    const stateDirectory = await mkdtemp(join(tmpdir(), "vibe-check-public-learned-observer-"));
    try {
      const strategy = createLearnedCriticalPathStrategy({
        identityForTask: () => ({ key: "invalid-observer" }),
        observe: async () => Promise.reject(new Error("observer failed")),
        stateDirectory
      });
      if (strategy.kind !== "prepared") throw new Error("expected prepared strategy");
      const prepared = await strategy.prepare({ graph: graph() });
      assert.doesNotThrow(() => prepared.decide(context([{ canAdmit: true, taskId: "ordinary" }])));
    } finally {
      await rm(stateDirectory, { force: true, recursive: true });
    }
  });
});

function preparedStrategy(stateDirectory: string, schedulerGraph: SchedulerGraphSnapshot) {
  const strategy = createLearnedCriticalPathStrategy({
    identityForTask: (graphTask) => ({ taskId: graphTask.taskId }),
    stateDirectory
  });
  if (strategy.kind !== "prepared") throw new Error("expected prepared strategy");
  return strategy.prepare({ graph: schedulerGraph });
}

function task(
  taskId: string,
  overrides: Partial<SchedulerGraphSnapshot["tasks"][number]> = {}
): SchedulerGraphSnapshot["tasks"][number] {
  return Object.freeze({
    admissionPriority: 0,
    dependsOn: Object.freeze([]),
    mutex: Object.freeze([]),
    observes: Object.freeze([]),
    resourceClaims: Object.freeze([]),
    scopeId: null,
    taskId,
    ...overrides
  });
}

function graph(): SchedulerGraphSnapshot {
  return graphFor(
    [task("ordinary", { admissionPriority: 99 }), task("activate", { scopeId: "limited" })],
    Object.freeze([
      Object.freeze({
        activationTaskIds: Object.freeze(["activate"]),
        id: "limited",
        maxParallel: 1,
        terminalTaskId: "activate"
      })
    ])
  );
}

function graphFor(
  tasks: readonly SchedulerGraphSnapshot["tasks"][number][],
  scopes: readonly SchedulerGraphSnapshot["scopes"][number][] = Object.freeze([])
): SchedulerGraphSnapshot {
  return Object.freeze({
    resourceCapacities: Object.freeze([]),
    scopes: Object.freeze(scopes),
    tasks: Object.freeze(tasks)
  });
}

function contextFor(
  schedulerGraph: SchedulerGraphSnapshot,
  candidates: readonly { readonly canAdmit: boolean; readonly taskId: string }[],
  activeScopeIds: readonly string[] = []
): AdmissionPolicyContext {
  return {
    activeScopeIds,
    admissionState: createAdmissionGraph({ graph: schedulerGraph, maxParallel: 4 }).initialState(),
    candidates,
    capacity: { effectiveMaxParallel: 4, maxParallel: 4, running: 0 },
    graph: schedulerGraph,
    measurement: emptyMeasurement(),
    runningTaskIds: [],
    runtime: { abortRequested: false, cancelled: false },
    settledTaskIds: []
  };
}

function emptyMeasurement(): AdmissionPolicyContext["measurement"] {
  return Object.freeze({
    cumulative: Object.freeze({
      declarativeFingerprint: "test",
      discrete: Object.freeze({ acceptedWaitCount: 0, admittedCount: 0, maxRunning: 0 }),
      peaks: Object.freeze({
        admissionViablePendingTaskCount: 0,
        admissiblePendingTaskCount: 0,
        capacityBlockedTaskCount: 0,
        mutexBlockedTaskCount: 0
      }),
      timing: Object.freeze({
        availability: "unavailable" as const,
        reason: "clock-threw" as const
      })
    }),
    measurementAt: () => undefined,
    measurementCount: 0
  });
}

function context(
  candidates: readonly { readonly canAdmit: boolean; readonly taskId: string }[],
  activeScopeIds: readonly string[] = []
): AdmissionPolicyContext {
  return contextFor(graph(), candidates, activeScopeIds);
}

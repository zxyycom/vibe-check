import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAdmissionGraph, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

describe("admission workbench shared closure", () => {
  it("drains an admitted real Check while cancellation closes pending work before it starts", async () => {
    const controller = new AbortController();
    const entered = deferred<void>();
    const release = deferred<void>();
    const events: string[] = [];
    let pendingExecutionCount = 0;
    let runCompleted = false;

    const resultPromise = run(
      defineConfig({
        checks: [
          defineCheck({
            checkId: "running-check",
            displayName: "Running Check",
            execution: async ({ signal }) => {
              events.push("running");
              entered.resolve();
              controller.abort();
              assert.equal(signal.aborted, true);
              await release.promise;
              events.push("drained");
              return { status: "passed", data: {} };
            }
          }),
          defineCheck({
            checkId: "pending-check",
            displayName: "Pending Check",
            execution: () => {
              pendingExecutionCount += 1;
              return { status: "passed", data: {} };
            }
          })
        ],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        scheduler: { maxParallel: 1 }
      }),
      { signal: controller.signal }
    ).then((result) => {
      runCompleted = true;
      return result;
    });

    await entered.promise;
    await Promise.resolve();
    assert.equal(runCompleted, false);
    assert.equal(pendingExecutionCount, 0);

    release.resolve();
    const result = await resultPromise;

    assert.deepEqual(events, ["running", "drained"]);
    assert.equal(result.kind, "cancelled");
    if (result.kind !== "cancelled") return;
    assert.equal(result.phase, "execution");
    assert.deepEqual(
      result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
      [
        {
          checkId: "pending-check",
          outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
        },
        {
          checkId: "running-check",
          outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
        }
      ]
    );
    const durations = new Map(
      result.checkDurations.map(({ checkId, durationMs }) => [checkId, durationMs])
    );
    assert.equal(durations.get("pending-check"), null);
    assert.equal(typeof durations.get("running-check"), "number");
  });

  it("keeps virtual unsatisfied settlement separate from real cancellation", () => {
    const graph = createAdmissionGraph({
      graph: {
        resourceCapacities: [],
        scopes: [],
        tasks: [
          task("upstream"),
          task("dependent", { dependsOn: ["upstream"] }),
          task("observer", { observes: ["upstream"] })
        ]
      },
      maxParallel: 1
    });
    const selected = graph.initialState().select("upstream");
    assert.equal(selected.accepted, true);
    if (!selected.accepted) return;

    const settled = selected.state.settle("upstream", "unsatisfied");
    assert.equal(settled.accepted, true);
    if (!settled.accepted) return;

    assert.deepEqual(settled.state.catalog.selectableTaskIds, ["observer"]);
    assert.equal(settled.state.select("dependent").accepted, false);
    assert.equal(settled.state.select("observer").accepted, true);
    assert.equal("cancel" in settled.state, false);
  });
});

function task(
  taskId: string,
  relations: Readonly<{
    readonly dependsOn?: readonly string[];
    readonly observes?: readonly string[];
  }> = {}
) {
  return Object.freeze({
    admissionPriority: 0,
    dependsOn: Object.freeze([...(relations.dependsOn ?? [])]),
    mutex: Object.freeze([]),
    observes: Object.freeze([...(relations.observes ?? [])]),
    resourceClaims: Object.freeze([]),
    scopeId: null,
    taskId
  });
}

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return Object.freeze({ promise, resolve });
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defineConfig,
  type AdmissionProposal
} from "../../project-definition/project-definition.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { run } from "../run.ts";
import { admissionSelectionPolicyFor } from "./custom-admission-policy.ts";
import { runTaskGraph } from "./scheduler.ts";
import { createDeferred, recordingLogger, waitFor } from "./task-engine.test-support.ts";
import {
  malformedWaitProposal,
  runWithCustomProposal,
  thenableWaitProposal
} from "./task-engine.admission-policy.test-support.ts";

describe("task engine admission policy", () => {
  it("preserves the caller closure across overlapping custom Runs without a Scheduler callback lock", async () => {
    let callbackCalls = 0;
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: (context) => {
        callbackCalls += 1;
        const candidate = context.candidates.find((item) => item.canAdmit);
        return candidate === undefined
          ? { kind: "wait" }
          : { kind: "select", taskId: candidate.taskId };
      }
    });
    if (policy === undefined) assert.fail("expected custom policy adapter");

    await Promise.all([
      runTaskGraph({
        admissionPolicy: policy,
        execute: async () => undefined,
        graph: { tasks: [{ id: "first" }] },
        maxParallel: 1
      }),
      runTaskGraph({
        admissionPolicy: policy,
        execute: async () => undefined,
        graph: { tasks: [{ id: "second" }] },
        maxParallel: 1
      })
    ]);

    assert.equal(callbackCalls, 2);
  });

  it("fails custom policy faults without fallback, cancels pending work, and drains admitted work", async () => {
    const started = createDeferred<void>();
    const calls: string[] = [];
    let proposals = 0;
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: () => {
        proposals += 1;
        return proposals === 1 ? { kind: "select", taskId: "started" } : malformedWaitProposal();
      }
    });
    if (policy === undefined) assert.fail("expected custom policy adapter");

    const running = runTaskGraph({
      admissionPolicy: policy,
      execute: async (task) => {
        calls.push(task.id);
        if (task.id === "started") await started.promise;
        return task.id;
      },
      graph: { tasks: [{ id: "started" }, { id: "pending" }] },
      maxParallel: 2
    });
    await waitFor(() => calls.includes("started"));
    started.resolve();
    const graphRun = await running;

    assert.deepEqual(calls, ["started"]);
    assert.equal(graphRun.admissionPolicyFault, "malformed-proposal");
    assert.equal(graphRun.cancelled, true);
    assert.equal(
      graphRun.settlements.find(({ task }) => task.id === "started")?.settlement.kind,
      "completed"
    );
    assert.equal(
      graphRun.settlements.find(({ task }) => task.id === "pending")?.settlement.kind,
      "cancelled-before-start"
    );
  });

  it("classifies every bounded custom fault without exposing callback values", async () => {
    const immediateFaults: readonly Readonly<{
      readonly category:
        | "callback-threw"
        | "thenable-proposal"
        | "malformed-proposal"
        | "non-candidate-select"
        | "undrainable-wait";
      readonly proposeAdmission: () => AdmissionProposal;
    }>[] = [
      {
        category: "callback-threw",
        proposeAdmission: () => {
          throw new Error("secret");
        }
      },
      { category: "thenable-proposal", proposeAdmission: thenableWaitProposal },
      { category: "malformed-proposal", proposeAdmission: malformedWaitProposal },
      {
        category: "non-candidate-select",
        proposeAdmission: () => ({ kind: "select", taskId: "missing" })
      },
      { category: "undrainable-wait", proposeAdmission: () => ({ kind: "wait" }) }
    ];

    for (const fault of immediateFaults) {
      const graphRun = await runWithCustomProposal(fault.proposeAdmission, {
        tasks: [{ id: "pending" }]
      });
      assert.equal(graphRun.admissionPolicyFault, fault.category);
      assert.equal(graphRun.settlements[0]?.settlement.kind, "cancelled-before-start");
    }

    let proposals = 0;
    const capacityRun = await runWithCustomProposal(
      () => {
        proposals += 1;
        return proposals === 1
          ? { kind: "select", taskId: "started" }
          : { kind: "select", taskId: "pending" };
      },
      { tasks: [{ id: "started" }, { id: "pending" }] }
    );
    assert.equal(capacityRun.admissionPolicyFault, "capacity-invalid-select");

    const controller = new AbortController();
    const lifecycleRun = await runWithCustomProposal(
      () => {
        controller.abort();
        return { kind: "select", taskId: "pending" };
      },
      { tasks: [{ id: "pending" }] },
      controller.signal
    );
    assert.equal(lifecycleRun.admissionPolicyFault, "lifecycle-invalid-select");

    const observations: DiagnosticObservation[] = [];
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: () => {
        const proposal: AdmissionProposal = { kind: "wait" };
        Reflect.set(proposal, "raw", { caller: "secret" });
        return proposal;
      }
    });
    if (policy === undefined) assert.fail("expected custom policy adapter");
    await runTaskGraph({
      admissionPolicy: policy,
      diagnosticLogger: recordingLogger(observations),
      execute: () => undefined,
      graph: { tasks: [{ id: "pending" }] },
      maxParallel: 1
    });
    const diagnostic = observations.find(
      (observation) => observation.event === "scheduler.admission-policy-failed"
    );
    assert.deepEqual(diagnostic?.details, { category: "malformed-proposal" });
    assert.equal(JSON.stringify(diagnostic).includes("secret"), false);
  });

  it("drains an admitted public Check before returning an admission policy fault", async () => {
    const started = createDeferred<void>();
    const release = createDeferred<void>();
    const executions: string[] = [];
    let proposals = 0;
    let resolved = false;
    const resultPromise = run(
      defineConfig({
        checks: [
          {
            checkId: "started",
            displayName: "Started",
            execution: async () => {
              executions.push("started");
              started.resolve();
              await release.promise;
              return { status: "passed", data: {} };
            }
          },
          {
            checkId: "pending",
            displayName: "Pending",
            execution: () => {
              executions.push("pending");
              return { status: "passed", data: {} };
            }
          }
        ],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        scheduler: {
          admissionPolicy: {
            kind: "custom",
            proposeAdmission: () => {
              proposals += 1;
              return proposals === 1
                ? { kind: "select", taskId: "started" }
                : malformedWaitProposal();
            }
          },
          maxParallel: 2
        }
      })
    );
    void resultPromise.then(
      () => {
        resolved = true;
      },
      () => undefined
    );

    await started.promise;
    await Promise.resolve();
    assert.equal(resolved, false);
    assert.deepEqual(executions, ["started"]);
    release.resolve();
    const result = await resultPromise;

    assert.equal(result.kind, "execution");
    if (result.kind !== "execution") return;
    assert.deepEqual(result.diagnostic, { code: "admission-policy-failed" });
    assert.deepEqual(executions, ["started"]);
    assert.deepEqual(Object.keys(result).sort(), [
      "declarativeFingerprint",
      "definitionWarnings",
      "diagnostic",
      "kind",
      "outputs"
    ]);
    assert.equal("checkMessages" in result, false);
    assert.equal("checkDurations" in result, false);
    assert.equal("timing" in result, false);
  });

  it("returns the dedicated execution result for a custom callback failure", async () => {
    let executions = 0;
    const result = await run(
      defineConfig({
        checks: [
          {
            checkId: "never-started",
            displayName: "Never started",
            execution: () => {
              executions += 1;
              return { status: "passed", data: {} };
            }
          }
        ],
        outputs: {
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        scheduler: {
          admissionPolicy: {
            kind: "custom",
            proposeAdmission: () => {
              throw new Error("caller detail must not escape");
            }
          },
          maxParallel: 1
        }
      })
    );

    assert.equal(executions, 0);
    assert.equal(result.kind, "execution");
    if (result.kind === "execution") {
      assert.deepEqual(result.diagnostic, { code: "admission-policy-failed" });
    }
  });
});

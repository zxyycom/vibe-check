import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defineContextCallback } from "../../package-tools/context-callback/define-context-callback.ts";
import { admissionSelectionPolicyFor } from "./custom-admission-policy.ts";
import { runTaskGraph } from "./scheduler.ts";

describe("Scheduler context demand", () => {
  it("provides detached candidates/runtime without implicit historical or measurement fields", async () => {
    const contexts: object[] = [];
    const policy = admissionSelectionPolicyFor(
      defineContextCallback("scheduler.decide", {
        contextNeeds: ["candidates", "runtime"],
        callback(context) {
          assert.deepEqual(Object.keys(context).sort(), ["candidates", "runtime"]);
          assert.equal(Object.isFrozen(context), true);
          assert.equal(Object.isFrozen(context.candidates), true);
          contexts.push(context);
          const candidate = context.candidates.find((item) => item.canAdmit);
          return candidate === undefined
            ? { kind: "wait" }
            : { kind: "select", taskId: candidate.taskId };
        }
      })
    );
    assert.equal(policy.requiresMeasurement, undefined);
    const result = await runTaskGraph({
      admissionPolicy: policy,
      execute: () => undefined,
      graph: { tasks: [{ id: "a" }, { id: "b" }] },
      maxParallel: 1
    });
    assert.equal(result.admissionPolicyFault, undefined);
    assert.notEqual(contexts[0], contexts[1]);
    assert.equal(result.terminalContext, undefined);
  });

  it("projects exact graph/execution/none terminal views from one sealed boundary", async () => {
    const contexts: object[] = [];
    const calls: string[] = [];
    let terminalEffectFailures = 0;
    const result = await runTaskGraph({
      onTerminalEffectFailure: () => {
        terminalEffectFailures++;
      },
      execute: () => true,
      graph: { tasks: [{ id: "seed" }, { id: "b" }, { id: "a" }] },
      maxParallel: 1,
      preAdmissionTaskResults: [{ taskId: "seed", value: true }],
      terminalEffects: [
        defineContextCallback("scheduler.terminal", {
          contextNeeds: ["graph"],
          callback(context) {
            contexts.push(context);
            calls.push("graph");
            assert.equal(context.graph.tasks.length, 3);
          }
        }),
        defineContextCallback("scheduler.terminal", {
          contextNeeds: [],
          async callback(context) {
            contexts.push(context);
            calls.push("none");
            throw new Error("contained");
          }
        }),
        defineContextCallback("scheduler.terminal", {
          contextNeeds: ["execution"],
          callback(context) {
            contexts.push(context);
            calls.push("execution");
            assert.deepEqual(context.execution.admittedTaskIds, ["b", "a"]);
            assert.equal(context.execution.settledTasks.length, 3);
          }
        })
      ]
    });
    assert.deepEqual(calls, ["graph", "none", "execution"]);
    assert.equal(terminalEffectFailures, 1);
    assert.notEqual(contexts[0], contexts[1]);
    assert.notEqual(contexts[1], contexts[2]);
    assert.notEqual(contexts[0], result.terminalContext);
    assert.deepEqual(Object.keys(contexts[0] ?? {}), ["graph"]);
    assert.deepEqual(Object.keys(contexts[1] ?? {}), []);
    assert.deepEqual(Object.keys(contexts[2] ?? {}), ["execution"]);
    assert.deepEqual(Object.keys(result.terminalContext ?? {}).sort(), ["execution", "graph"]);
    assert.equal(Object.isFrozen(result.terminalContext), true);
  });

  it("retains none terminal delivery after cancellation or policy fault drains admitted work", async () => {
    for (const mode of ["cancel", "fault"] as const) {
      const controller = new AbortController();
      let proposals = 0;
      let delivered = 0;
      const policy = admissionSelectionPolicyFor(
        defineContextCallback("scheduler.decide", {
          contextNeeds: [],
          callback() {
            proposals++;
            if (proposals === 1) return { kind: "select", taskId: "started" };
            if (mode === "fault") throw new Error("policy");
            return { kind: "wait" };
          }
        })
      );
      const result = await runTaskGraph({
        admissionPolicy: policy,
        graph: { tasks: [{ id: "started" }, { id: "pending" }] },
        maxParallel: 1,
        signal: controller.signal,
        execute: () => {
          controller.abort();
        },
        terminalEffects: [
          defineContextCallback("scheduler.terminal", {
            contextNeeds: [],
            callback(context) {
              assert.deepEqual(Object.keys(context), []);
              delivered++;
            }
          })
        ]
      });
      assert.equal(delivered, 1);
      assert.equal(result.cancelled, true);
      assert.equal(result.admissionPolicyFault, mode === "fault" ? "callback-threw" : undefined);
      assert.equal(result.settlements[1]?.settlement.kind, "cancelled-before-start");
    }
  });
});

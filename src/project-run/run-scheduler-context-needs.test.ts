import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defineConfig } from "../project-definition/project-definition.ts";
import { defineSchedulerContextCallback } from "../package-tools/scheduler-context/define-scheduler-context-callback.ts";
import { run } from "./run.ts";

const OUTPUTS = {
  diagnosticLogging: { enabled: false },
  machinePublication: { enabled: false },
  progressRendering: { enabled: false }
} as const;
const PASSED = { status: "passed", data: {} } as const;

describe("Package Run Scheduler context demand", () => {
  it("shares generic and prepared terminal phase unions while keeping preparation and decision independent", async () => {
    let generic: object | undefined;
    const calls: string[] = [];
    const result = await run(
      defineConfig({
        checks: [{ checkId: "a", displayName: "A", execute: () => PASSED }],
        outputs: OUTPUTS,
        scheduler: {
          admissionPolicy: {
            kind: "custom",
            strategy: {
              kind: "prepared",
              prepare: defineSchedulerContextCallback("preparation", {
                contextNeeds: [],
                callback(preparation) {
                  assert.deepEqual(Object.keys(preparation), []);
                  calls.push("prepare");
                  return {
                    decide: defineSchedulerContextCallback("decision", {
                      contextNeeds: ["candidates"],
                      callback(context) {
                        assert.deepEqual(Object.keys(context), ["candidates"]);
                        const candidate = context.candidates.find((item) => item.canAdmit);
                        return candidate === undefined
                          ? { kind: "wait" }
                          : { kind: "select", taskId: candidate.taskId };
                      }
                    }),
                    terminalEffect: defineSchedulerContextCallback("terminal", {
                      contextNeeds: ["execution"],
                      callback(context) {
                        calls.push("prepared");
                        assert.equal(context, generic);
                        assert.deepEqual(Object.keys(context).sort(), ["execution", "graph"]);
                        assert.deepEqual(context.execution.admittedTaskIds, ["a"]);
                      }
                    })
                  };
                }
              })
            }
          },
          terminalEffects: [
            defineSchedulerContextCallback("terminal", {
              contextNeeds: ["graph"],
              async callback(context) {
                calls.push("generic");
                generic = context;
                assert.equal(context.graph.tasks.length, 1);
              }
            })
          ]
        }
      })
    );
    assert.equal(result.kind, "completed");
    assert.deepEqual(calls, ["prepare", "generic", "prepared"]);
    assert.deepEqual(result.outputs.terminalEffects, { enabled: true, status: "succeeded" });
  });

  it("preserves raw and legacy full terminal consumers when mixed with explicit none", async () => {
    for (const mode of ["raw", "legacy"] as const) {
      const contexts: object[] = [];
      const raw = defineSchedulerContextCallback("terminal", {
        contextNeeds: ["rawMeasurement"],
        callback(context) {
          assert.equal(context.rawMeasurement.discrete.admittedCount, 1);
          contexts.push(context);
        }
      });
      const result = await run(
        defineConfig({
          checks: [{ checkId: "a", displayName: "A", execute: () => PASSED }],
          outputs: OUTPUTS,
          scheduler: {
            terminalEffects: [
              mode === "raw"
                ? raw
                : (context) => {
                    assert.equal(context.rawMeasurement.discrete.admittedCount, 1);
                    assert.equal(context.graph.tasks.length, 1);
                    assert.deepEqual(context.execution.admittedTaskIds, ["a"]);
                    contexts.push(context);
                  },
              defineSchedulerContextCallback("terminal", {
                contextNeeds: [],
                callback(context) {
                  contexts.push(context);
                }
              })
            ]
          }
        })
      );
      assert.equal(result.kind, "completed");
      assert.equal(contexts[0], contexts[1]);
      assert.deepEqual(
        Object.keys(contexts[0] ?? {}).sort(),
        mode === "raw" ? ["rawMeasurement"] : ["execution", "graph", "rawMeasurement"]
      );
    }
  });

  it("rejects malformed prepared-return needs before admission and leaves generic effects not-run", async () => {
    let executions = 0,
      effects = 0;
    const result = await run(
      defineConfig({
        checks: [
          {
            checkId: "a",
            displayName: "A",
            execute: () => {
              executions++;
              return PASSED;
            }
          }
        ],
        outputs: OUTPUTS,
        scheduler: {
          admissionPolicy: {
            kind: "custom",
            strategy: {
              kind: "prepared",
              prepare() {
                const decide = defineSchedulerContextCallback("decision", {
                  contextNeeds: [],
                  callback: () => ({ kind: "wait" })
                });
                Reflect.set(decide, "contextNeeds", ["rawMeasurement"]);
                return { decide };
              }
            }
          },
          terminalEffects: [
            defineSchedulerContextCallback("terminal", {
              contextNeeds: [],
              callback: () => {
                effects++;
              }
            })
          ]
        }
      })
    );
    assert.equal(executions, 0);
    assert.equal(effects, 0);
    assert.equal(result.kind, "execution");
    assert.equal(
      result.kind === "execution" ? result.diagnostic.code : undefined,
      "admission-strategy-preparation-failed"
    );
    assert.deepEqual(result.outputs.terminalEffects, { enabled: true, status: "not-run" });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defineConfig } from "../project-definition/project-definition.ts";
import { defineContextCallback } from "../package-tools/context-callback/define-context-callback.ts";
import { run } from "./run.ts";

const OUTPUTS = {
  diagnosticLogging: { enabled: false },
  machinePublication: { enabled: false },
  progressRendering: { enabled: false }
} as const;
const PASSED = { status: "passed", data: {} } as const;

describe("Package Run Scheduler context demand", () => {
  it("delivers exact generic and prepared terminal views while keeping phases independent", async () => {
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
              prepare: defineContextCallback("scheduler.prepare", {
                contextNeeds: [],
                callback(preparation) {
                  assert.deepEqual(Object.keys(preparation), []);
                  calls.push("prepare");
                  return {
                    decide: defineContextCallback("scheduler.decide", {
                      contextNeeds: ["candidates"],
                      callback(context) {
                        assert.deepEqual(Object.keys(context), ["candidates"]);
                        const candidate = context.candidates.find((item) => item.canAdmit);
                        return candidate === undefined
                          ? { kind: "wait" }
                          : { kind: "select", taskId: candidate.taskId };
                      }
                    }),
                    terminalEffect: defineContextCallback("scheduler.terminal", {
                      contextNeeds: ["execution"],
                      callback(context) {
                        calls.push("prepared");
                        assert.notEqual(context, generic);
                        assert.deepEqual(Object.keys(context), ["execution"]);
                        assert.deepEqual(context.execution.admittedTaskIds, ["a"]);
                      }
                    })
                  };
                }
              })
            }
          },
          terminalEffects: [
            defineContextCallback("scheduler.terminal", {
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

  it("delivers independently declared terminal groups and frozen empty function contexts", async () => {
    const contexts: object[] = [];
    const result = await run(
      defineConfig({
        checks: [{ checkId: "a", displayName: "A", execute: () => PASSED }],
        outputs: OUTPUTS,
        scheduler: {
          terminalEffects: [
            defineContextCallback("scheduler.terminal", {
              contextNeeds: ["runMeasurement"],
              callback(context) {
                assert.deepEqual(Object.keys(context), ["runMeasurement"]);
                assert.equal(context.runMeasurement.discrete.admittedCount, 1);
                assert.equal("admissions" in (context.runMeasurement.timingFacts ?? {}), false);
                contexts.push(context);
              }
            }),
            defineContextCallback("scheduler.terminal", {
              contextNeeds: ["taskTimings"],
              callback(context) {
                assert.deepEqual(Object.keys(context), ["taskTimings"]);
                assert.ok("admissions" in context.taskTimings);
                contexts.push(context);
              }
            }),
            (context) => {
              assert.deepEqual(Object.keys(context), []);
              assert.equal(Object.isFrozen(context), true);
              contexts.push(context);
            }
          ]
        }
      })
    );
    assert.equal(result.kind, "completed");
    assert.equal(contexts.length, 3);
    assert.notEqual(contexts[0], contexts[1]);
    assert.notEqual(contexts[1], contexts[2]);
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
                const decide = defineContextCallback("scheduler.decide", {
                  contextNeeds: [],
                  callback: () => ({ kind: "wait" })
                });
                Reflect.set(decide, "contextNeeds", ["rawMeasurement"]);
                return { decide };
              }
            }
          },
          terminalEffects: [
            defineContextCallback("scheduler.terminal", {
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

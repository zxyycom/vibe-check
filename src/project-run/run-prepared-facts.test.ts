import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defineConfig,
  createDeclarativeFingerprint,
  normalizeProjectDefinition,
  type SchedulerGraphSnapshot,
  type SchedulerMeasurementContext
} from "../project-definition/project-definition.ts";
import type { Check } from "../check/check.ts";
import { run } from "./run.ts";
import { validateProjectDefinition } from "../project-definition/project-definition-validation.ts";

const OUTPUTS = {
  diagnosticLogging: { enabled: false },
  machinePublication: { enabled: false },
  progressRendering: { enabled: false }
} as const;
const PASSED = { status: "passed", data: {} } as const;

describe("Package Run prepared facts", () => {
  it("shares one immutable graph through strategy preparation decision and terminal delivery", async () => {
    let preparedGraph: SchedulerGraphSnapshot | undefined;
    let genericContext: SchedulerMeasurementContext | undefined;
    let decisionCount = 0;
    let executionCount = 0;
    let preparedTerminalCount = 0;
    const result = await run(
      defineConfig({
        checks: [
          {
            checkId: "container",
            displayName: "Container",
            maxParallel: 2,
            resourceClaims: { worker: 1 },
            checks: [
              {
                checkId: "provider",
                displayName: "Provider",
                enabledByFlags: { when: "enabled" },
                execute: () => {
                  throw new Error("unselected provider must not execute");
                }
              },
              {
                checkId: "dependent",
                displayName: "Dependent",
                dependsOn: ["provider"],
                execute: () => {
                  throw new Error("blocked dependent must not execute");
                }
              },
              {
                checkId: "observer",
                displayName: "Observer",
                observes: ["provider"],
                execute: () => {
                  executionCount += 1;
                  return PASSED;
                }
              }
            ]
          }
        ],
        outputs: OUTPUTS,
        scheduler: {
          maxParallel: 3,
          resourceCapacities: { worker: 2 },
          admissionPolicy: {
            kind: "custom",
            strategy: {
              kind: "prepared",
              prepare(context) {
                preparedGraph = context.graph;
                assert.equal(Object.isFrozen(context.graph), true);
                assert.equal(Object.isFrozen(context.graph.tasks), true);
                assert.equal(context.graph.tasks.length, 3);
                assert.equal(context.graph.tasks[0]?.resourceClaims[0]?.units, 1);
                assert.equal(context.graph.scopes[0]?.maxParallel, 2);
                return {
                  decide(decision) {
                    assert.equal(decision.graph, preparedGraph);
                    assert.equal(decision.capacity.maxParallel, 3);
                    decisionCount += 1;
                    const candidate = decision.candidates.find((entry) => entry.canAdmit);
                    return candidate === undefined
                      ? { kind: "wait" }
                      : { kind: "select", taskId: candidate.taskId };
                  },
                  terminalEffect(terminal) {
                    assert.equal(terminal, genericContext);
                    assert.equal(terminal.graph, preparedGraph);
                    preparedTerminalCount += 1;
                  }
                };
              }
            }
          },
          terminalEffects: [
            (context) => {
              assert.equal(context.graph, preparedGraph);
              genericContext = context;
            }
          ]
        }
      })
    );
    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.equal(
      result.snapshot.checks.find((check) => check.checkId === "provider")?.outcome.status,
      "not-applicable"
    );
    assert.equal(
      result.snapshot.checks.find((check) => check.checkId === "dependent")?.outcome.status,
      "unavailable"
    );
    assert.equal(
      result.snapshot.checks.find((check) => check.checkId === "observer")?.outcome.status,
      "passed"
    );
    assert.ok(decisionCount > 0);
    assert.equal(executionCount, 1);
    assert.equal(preparedTerminalCount, 1);
    assert.equal(result.outputs.terminalEffects.status, "succeeded");
  });

  it("revalidates the same mutable authored Definition for each Run without revising earlier facts", async () => {
    const options = { value: 1 };
    const capacities = { worker: 1 };
    const authored: Check = {
      checkId: "first",
      displayName: "First",
      options,
      resourceClaims: { worker: 1 },
      execute(context) {
        assert.equal(Object.isFrozen(context.options), true);
        const value = "value" in context.options ? context.options.value : undefined;
        assert.equal(typeof value, "number");
        return { status: "passed", data: { value } };
      }
    };
    const checks: Check[] = [authored];
    const graphs: SchedulerGraphSnapshot[] = [];
    const definition = defineConfig({
      checks,
      outputs: OUTPUTS,
      scheduler: {
        resourceCapacities: capacities,
        admissionPolicy: {
          kind: "custom",
          strategy: {
            kind: "prepared",
            prepare(context) {
              graphs.push(context.graph);
              return {
                decide(decision) {
                  const candidate = decision.candidates.find((entry) => entry.canAdmit);
                  return candidate === undefined
                    ? { kind: "wait" }
                    : { kind: "select", taskId: candidate.taskId };
                }
              };
            }
          }
        }
      }
    });
    const validated = validateProjectDefinition(definition);
    assert.equal(validated.ok, true);
    const legacyFingerprint = validated.ok
      ? createDeclarativeFingerprint(normalizeProjectDefinition(validated.value).declarative)
      : undefined;
    const first = await run(definition);
    options.value = 2;
    capacities.worker = 2;
    checks[0] = { ...authored, checkId: "second" };
    const second = await run(definition);
    assert.equal(first.kind, "completed");
    assert.equal(second.kind, "completed");
    if (first.kind !== "completed" || second.kind !== "completed") return;
    assert.equal(first.declarativeFingerprint, legacyFingerprint);
    assert.notEqual(first.declarativeFingerprint, second.declarativeFingerprint);
    assert.notEqual(graphs[0], graphs[1]);
    assert.equal(graphs[0]?.tasks[0]?.taskId, "first");
    assert.equal(graphs[0]?.resourceCapacities[0]?.units, 1);
    assert.equal(graphs[1]?.tasks[0]?.taskId, "second");
    assert.equal(graphs[1]?.resourceCapacities[0]?.units, 2);
    const firstOutcome = first.snapshot.checks[0]?.outcome;
    const secondOutcome = second.snapshot.checks[0]?.outcome;
    assert.equal(firstOutcome?.status, "passed");
    assert.equal(secondOutcome?.status, "passed");
    if (firstOutcome?.status === "passed" && secondOutcome?.status === "passed") {
      assert.equal(Reflect.get(firstOutcome.data, "value"), 1);
      assert.equal(Reflect.get(secondOutcome.data, "value"), 2);
    }
  });
});

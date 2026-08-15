import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { coordinateCheckRecords } from "./coordinator.ts";
import { catalog } from "./task-orchestration.test-support.ts";

describe("check-record task orchestration", () => {
  it("plans a closed detached graph before execution and namespaces group leaves with exact work", async () => {
    const calls: string[] = [];
    const mutablePlan = {
      tasks: [{
        id: "group",
        mutex: ["shared"],
        tasks: [{
          id: "first",
          workHandles: [] as string[],
          run: () => { calls.push("first"); return "one"; }
        }, {
          id: "second",
          dependsOn: ["first"],
          workHandles: [] as string[],
          run: () => { calls.push("second"); return "two"; }
        }]
      }],
      complete: (outcomes: Readonly<Record<string, unknown>>) => {
        calls.push(Object.keys(outcomes).join(","));
        assert.deepEqual(outcomes, { first: "one", second: "two" });
        return { verdict: "passed" };
      }
    };
    const taskCatalog = catalog({
      checkIds: ["alpha-check", "beta-check"],
      bindings: ["alpha-check", "beta-check"].map((checkId) => ({
        checkId,
        createTaskPlan: () => mutablePlan
      })),
      work: { "alpha-check": [], "beta-check": [] }
    });
    const running = coordinateCheckRecords(taskCatalog, { schedulerPolicy: { maxParallel: 2 } });
    mutablePlan.tasks[0]!.tasks[0]!.run = () => { calls.push("mutated"); return "wrong"; };
    const snapshot = await running;
    assert.deepEqual(snapshot.runs.map((run) => run.status), ["completed", "completed"]);
    assert.equal(calls.includes("mutated"), false);
    assert.equal(calls.filter((call) => call === "first").length, 2);
    assert.equal(calls.filter((call) => call === "second").length, 2);
  });

  it("rejects cycles ancestor self dependencies open shapes and work partition gaps before user execution", async () => {
    let executionCalls = 0;
    const badPlans = [{
      tasks: [{ id: "a", dependsOn: ["b"], workHandles: [], run: () => { executionCalls += 1; } },
        { id: "b", dependsOn: ["a"], workHandles: [], run: () => undefined }],
      complete: () => ({ verdict: "passed" })
    }, {
      tasks: [{ id: "group", tasks: [{
        id: "leaf", dependsOn: ["group"], workHandles: [], run: () => undefined
      }] }],
      complete: () => ({ verdict: "passed" })
    }, {
      tasks: [{ id: "group", dependsOn: ["leaf"], tasks: [{
        id: "leaf", workHandles: [], run: () => undefined
      }] }],
      complete: () => ({ verdict: "passed" })
    }, {
      tasks: [{ id: "leaf", workHandles: [], run: () => undefined, unknown: true }],
      complete: () => ({ verdict: "passed" })
    }, {
      tasks: [{ id: "leaf", workHandles: [], run: () => undefined }],
      complete: () => ({ verdict: "passed" })
    }];
    Object.defineProperty(badPlans[3]!.tasks[0]!, "hidden", { value: true });
    for (const [index, plan] of badPlans.entries()) {
      const taskCatalog = catalog({
        checkIds: ["task-check"],
        bindings: [{ checkId: "task-check", createTaskPlan: () => plan }],
        work: { "task-check": index === badPlans.length - 1 ? ["work-handle/v1:missing"] : [] }
      });
      await assert.rejects(
        coordinateCheckRecords(taskCatalog, { schedulerPolicy: { maxParallel: 1 } }),
        /TaskPlan failed closed planning/
      );
    }

    const planningCalls: string[] = [];
    const factoryFailureCatalog = catalog({
      checkIds: ["applicable-check", "failing-check", "not-applicable-check", "unselected-check"],
      bindings: [{
        checkId: "applicable-check",
        createTaskPlan: () => {
          planningCalls.push("factory:applicable-check");
          return {
            tasks: [{ id: "leaf", workHandles: [], run: () => { executionCalls += 1; } }],
            complete: () => ({ verdict: "passed" })
          };
        }
      }, {
        checkId: "failing-check",
        createTaskPlan: () => {
          planningCalls.push("factory:failing-check");
          throw new Error("expected factory failure");
        }
      }, {
        checkId: "not-applicable-check",
        createTaskPlan: () => { planningCalls.push("not-applicable"); return undefined; }
      }, {
        checkId: "unselected-check",
        createTaskPlan: () => { planningCalls.push("unselected"); return undefined; }
      }],
      selected: ["failing-check", "applicable-check", "not-applicable-check"],
      work: { "not-applicable-check": "not-applicable" }
    });
    await assert.rejects(
      coordinateCheckRecords(factoryFailureCatalog, { schedulerPolicy: { maxParallel: 2 } }),
      /factory failed during closed planning/
    );
    assert.deepEqual(planningCalls, ["factory:applicable-check", "factory:failing-check"]);
    assert.equal(executionCalls, 0);
  });

  it("runs one zero-leaf completion and blocks dependent leaves plus completion after leaf failure", async () => {
    let zeroCompletionCalls = 0;
    let blockedLeafCalls = 0;
    let failedCompletionCalls = 0;
    const completionCatalog = catalog({
      checkIds: ["failed-task-check", "zero-task-check"],
      bindings: [{
        checkId: "failed-task-check",
        createTaskPlan: () => ({
          tasks: [{ id: "first", workHandles: [], run: () => { throw new Error("expected"); } },
            { id: "second", dependsOn: ["first"], workHandles: [], run: () => {
              blockedLeafCalls += 1;
            } }],
          complete: () => { failedCompletionCalls += 1; return { verdict: "passed" }; }
        })
      }, {
        checkId: "zero-task-check",
        createTaskPlan: () => ({
          tasks: [],
          complete: (outcomes: Readonly<Record<string, unknown>>) => {
            zeroCompletionCalls += 1;
            assert.deepEqual(outcomes, {});
            return { verdict: "passed" };
          }
        })
      }]
    });
    const snapshot = await coordinateCheckRecords(completionCatalog, {
      schedulerPolicy: { maxParallel: 2 }
    });
    assert.equal(blockedLeafCalls, 0);
    assert.equal(failedCompletionCalls, 0);
    assert.equal(zeroCompletionCalls, 1);
    assert.deepEqual(snapshot.runs.map((run) => ({
      checkId: run.checkId,
      status: run.status,
      diagnostic: run.diagnostic?.category ?? null
    })), [{ checkId: "failed-task-check", status: "failed", diagnostic: "execution-failed" },
      { checkId: "zero-task-check", status: "completed", diagnostic: null }]);
  });
});

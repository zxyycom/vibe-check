import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import type { TaskExecutionPorts } from "./catalog.ts";
import { coordinateCheckRecords } from "./coordinator.ts";
import { catalog, finding, waitFor } from "./task-orchestration.test-support.ts";
import { runCheckOrchestration } from "./task-orchestrator.ts";

describe("check-record task orchestration", () => {
  it("treats hidden and symbol unavailable fields as invalid results before dependent execution", async () => {
    const calls: string[] = [];
    const hidden = { status: "unavailable", dependencyId: "scanner" };
    Object.defineProperty(hidden, "hidden", { value: true });
    const symbol = { status: "unavailable", dependencyId: "scanner" };
    Object.defineProperty(symbol, Symbol("hidden"), { value: true });
    for (const returned of [hidden, symbol]) {
      const strictCatalog = catalog({
        checkIds: ["source-check", "dependent-check"],
        bindings: [{ checkId: "source-check", execute: () => returned }, {
          checkId: "dependent-check", execute: () => {
            calls.push("dependent");
            return { verdict: "passed" };
          }
        }],
        requires: { "dependent-check": ["source-check"] }
      });
      const snapshot = await coordinateCheckRecords(strictCatalog, {
        schedulerPolicy: { maxParallel: 1 }
      });
      assert.equal(snapshot.runs[1]?.diagnostic?.category, "invalid-result");
    }
    assert.deepEqual(calls, []);
  });

  it("blocks dependent leaves and completion when a task record submission fails", async () => {
    let dependentCalls = 0;
    let completionCalls = 0;
    const recordCatalog = catalog({
      checkIds: ["record-task-check"],
      bindings: [{
        checkId: "record-task-check",
        createTaskPlan: () => ({
          tasks: [{
            id: "producer",
            workHandles: [],
            run: (ports: TaskExecutionPorts) => {
              assert.equal(ports.submitRecord(finding("retained")), "committed");
              assert.equal(ports.submitRecord({
                ...finding("invalid"),
                fields: { kind: Number.NaN }
              } as never), "rejected");
            }
          }, {
            id: "dependent",
            dependsOn: ["producer"],
            workHandles: [],
            run: () => { dependentCalls += 1; }
          }],
          complete: () => { completionCalls += 1; return { verdict: "passed" }; }
        })
      }]
    });
    const snapshot = await coordinateCheckRecords(recordCatalog, {
      schedulerPolicy: { maxParallel: 2 }
    });
    assert.equal(dependentCalls, 0);
    assert.equal(completionCalls, 0);
    assert.deepEqual(snapshot.records.map((record) => record.semanticSubject), ["src/retained.ts"]);
    assert.equal(snapshot.runs[0]?.diagnostic?.category, "invalid-record");
  });

  it("revokes function-scoped sinks on return and throw while retaining committed records", async () => {
    let retainedSink: TaskExecutionPorts["submitRecord"] | undefined;
    let releaseSibling: () => void = () => undefined;
    const siblingGate = new Promise<void>((resolve) => { releaseSibling = resolve; });
    let firstReturned = false;
    const taskCatalog = catalog({
      checkIds: ["task-check"],
      bindings: [{
        checkId: "task-check",
        createTaskPlan: () => ({
          tasks: [{
            id: "first",
            workHandles: [],
            run: (ports: TaskExecutionPorts) => {
              retainedSink = ports.submitRecord;
              assert.equal(ports.submitRecord(finding("early")), "committed");
              firstReturned = true;
            }
          }, {
            id: "sibling",
            workHandles: [],
            run: () => siblingGate
          }],
          complete: () => ({ verdict: "passed" })
        })
      }]
    });
    const running = coordinateCheckRecords(taskCatalog, { schedulerPolicy: { maxParallel: 2 } });
    await waitFor(() => firstReturned);
    assert.equal(retainedSink?.(finding("late")), "rejected");
    releaseSibling();
    const snapshot = await running;
    assert.deepEqual(snapshot.records.map((record) => record.semanticSubject), ["src/early.ts"]);
    assert.equal(snapshot.integrity.status, "valid");
    assert.equal(snapshot.runs[0]?.status, "completed");

    let throwingSink: TaskExecutionPorts["submitRecord"] | undefined;
    const throwingCatalog = catalog({
      checkIds: ["throwing-check"],
      bindings: [{
        checkId: "throwing-check",
        createTaskPlan: () => ({
          tasks: [{ id: "thrower", workHandles: [], run: (ports: TaskExecutionPorts) => {
            throwingSink = ports.submitRecord;
            throw new Error("expected");
          } }],
          complete: () => { throw new Error("must not execute"); }
        })
      }]
    });
    const throwingSnapshot = await coordinateCheckRecords(throwingCatalog, {
      schedulerPolicy: { maxParallel: 1 }
    });
    assert.equal(throwingSink?.(finding("after-throw")), "rejected");
    assert.equal(throwingSnapshot.runs[0]?.diagnostic?.category, "execution-failed");
  });

  it("drains started wrappers and stops new user calls after a trusted invariant failure", async () => {
    let releaseStarted: () => void = () => undefined;
    const startedGate = new Promise<void>((resolve) => { releaseStarted = resolve; });
    let siblingStarted = false;
    let siblingFinished = false;
    let lateCalled = false;
    const fatalCatalog = catalog({
      checkIds: ["fatal-check", "late-check", "sibling-check"],
      bindings: [{ checkId: "fatal-check", execute: () => ({ verdict: "passed" }) },
        { checkId: "late-check", execute: () => { lateCalled = true; return { verdict: "passed" }; } },
        { checkId: "sibling-check", execute: async () => {
          siblingStarted = true;
          await startedGate;
          siblingFinished = true;
          return { verdict: "passed" };
        } }],
      requires: { "late-check": ["fatal-check"] }
    });
    const contributions = fatalCatalog.checks.map((check) => ({
      check,
      ports: Object.freeze({
        workHandles: Object.freeze([]),
        acknowledge: () => "rejected" as const,
        submitRecord: () => "rejected" as const
      }),
      settle: () => {
        if (check.definition.checkId === "fatal-check") {
          throw new TypeError("injected trusted invariant");
        }
        return Object.freeze({ availability: "available" as const });
      }
    }));
    const running = runCheckOrchestration({
      catalog: fatalCatalog,
      contributions,
      schedulerPolicy: { maxParallel: 2 }
    });
    await waitFor(() => siblingStarted);
    let settled = false;
    void running.finally(() => { settled = true; }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(settled, false);
    assert.equal(lateCalled, false);
    releaseStarted();
    await assert.rejects(running, /Trusted Check orchestration invariant failed/);
    assert.equal(siblingFinished, true);
    assert.equal(lateCalled, false);
  });
});

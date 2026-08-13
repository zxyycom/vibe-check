import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { coordinateCheckRecords } from "./coordinator.ts";
import { catalog, finding } from "./task-orchestration.test-support.ts";

describe("check-record task orchestration", () => {
  it("enforces one global slot budget and mutex across direct leaves and synthetic completion", async () => {
    let active = 0;
    let maxActive = 0;
    const events: string[] = [];
    const body = async (name: string) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      events.push(`start:${name}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      events.push(`end:${name}`);
      active -= 1;
      return name;
    };
    const taskCatalog = catalog({
      checkIds: ["direct-check", "task-check"],
      bindings: [{
        checkId: "direct-check",
        execute: async () => { await body("direct"); return { verdict: "passed" }; }
      }, {
        checkId: "task-check",
        createTaskPlan: () => ({
          tasks: [{ id: "one", mutex: ["exclusive"], workHandles: [], run: () => body("one") },
            { id: "two", mutex: ["exclusive"], workHandles: [], run: () => body("two") }],
          complete: async () => { await body("complete"); return { verdict: "passed" }; }
        })
      }]
    });
    const snapshot = await coordinateCheckRecords(taskCatalog, {
      schedulerPolicy: Object.freeze({ maxParallel: 2 })
    });
    assert.equal(maxActive, 2);
    assert.ok(events.indexOf("end:one") < events.indexOf("start:two"));
    assert.deepEqual(snapshot.runs.map((run) => run.status), ["completed", "completed"]);
  });

  it("isolates ordinary failures blocks transitive dependents and accepts quality failure prerequisites", async () => {
    const calls: string[] = [];
    const failureCatalog = catalog({
      checkIds: ["failed-check", "dependent-check", "transitive-check", "unrelated-check"],
      bindings: [{ checkId: "failed-check", execute: () => { calls.push("failed"); throw new Error("x"); } },
        { checkId: "dependent-check", execute: () => { calls.push("dependent"); return { verdict: "passed" }; } },
        { checkId: "transitive-check", execute: () => { calls.push("transitive"); return { verdict: "passed" }; } },
        { checkId: "unrelated-check", execute: () => { calls.push("unrelated"); return { verdict: "failed" }; } }],
      requires: {
        "dependent-check": ["failed-check"],
        "transitive-check": ["dependent-check"]
      }
    });
    const snapshot = await coordinateCheckRecords(failureCatalog, { schedulerPolicy: { maxParallel: 4 } });
    assert.deepEqual(calls.sort(), ["failed", "unrelated"]);
    assert.deepEqual(snapshot.runs.map((run) => ({
      checkId: run.checkId,
      status: run.status,
      verdict: run.result?.verdict ?? null,
      diagnostic: run.diagnostic?.category ?? null
    })), [{
      checkId: "dependent-check", status: "failed", verdict: null, diagnostic: "unavailable"
    }, {
      checkId: "failed-check", status: "failed", verdict: null, diagnostic: "execution-failed"
    }, {
      checkId: "transitive-check", status: "failed", verdict: null, diagnostic: "unavailable"
    }, {
      checkId: "unrelated-check", status: "completed", verdict: "failed", diagnostic: null
    }]);

    const qualityCalls: string[] = [];
    const qualityCatalog = catalog({
      checkIds: ["quality-check", "dependent-check"],
      bindings: [{
        checkId: "quality-check", execute: () => ({ verdict: "failed" })
      }, {
        checkId: "dependent-check", execute: () => {
          qualityCalls.push("dependent");
          return { verdict: "passed" };
        }
      }],
      requires: { "dependent-check": ["quality-check"] }
    });
    const qualitySnapshot = await coordinateCheckRecords(qualityCatalog, {
      schedulerPolicy: { maxParallel: 1 }
    });
    assert.deepEqual(qualityCalls, ["dependent"]);
    assert.deepEqual(qualitySnapshot.runs.map((run) => run.status), ["completed", "completed"]);

    const notApplicableCalls: string[] = [];
    const notApplicableCatalog = catalog({
      checkIds: ["not-applicable-check", "dependent-check"],
      bindings: [{
        checkId: "not-applicable-check", execute: () => { throw new Error("must not execute"); }
      }, {
        checkId: "dependent-check", execute: () => {
          notApplicableCalls.push("dependent");
          return { verdict: "passed" };
        }
      }],
      requires: { "dependent-check": ["not-applicable-check"] },
      work: { "not-applicable-check": "not-applicable" }
    });
    const notApplicableSnapshot = await coordinateCheckRecords(notApplicableCatalog, {
      schedulerPolicy: { maxParallel: 1 }
    });
    assert.deepEqual(notApplicableCalls, ["dependent"]);
    assert.deepEqual(notApplicableSnapshot.runs.map((run) => ({
      checkId: run.checkId,
      status: run.status,
      verdict: run.result?.verdict ?? null
    })), [{
      checkId: "dependent-check", status: "completed", verdict: "passed"
    }, {
      checkId: "not-applicable-check", status: "completed", verdict: "not-applicable"
    }]);
  });

  it("uses foundation availability for invalid result record and acknowledgement prerequisites", async () => {
    const dependentCalls: string[] = [];
    const availabilityCatalog = catalog({
      checkIds: [
        "invalid-record",
        "invalid-record-dependent",
        "invalid-result",
        "invalid-result-dependent",
        "missing-ack",
        "missing-ack-dependent"
      ],
      bindings: [{
        checkId: "invalid-record",
        execute: (ports) => {
          ports.submitRecord({ ...finding("invalid"), fields: { kind: Number.NaN } } as never);
          return { verdict: "passed" };
        }
      }, {
        checkId: "invalid-record-dependent",
        execute: () => { dependentCalls.push("invalid-record"); return { verdict: "passed" }; }
      }, {
        checkId: "invalid-result",
        execute: () => ({ verdict: "unknown" })
      }, {
        checkId: "invalid-result-dependent",
        execute: () => { dependentCalls.push("invalid-result"); return { verdict: "passed" }; }
      }, {
        checkId: "missing-ack",
        execute: () => ({ verdict: "passed" })
      }, {
        checkId: "missing-ack-dependent",
        execute: () => { dependentCalls.push("missing-ack"); return { verdict: "passed" }; }
      }],
      requires: {
        "invalid-record-dependent": ["invalid-record"],
        "invalid-result-dependent": ["invalid-result"],
        "missing-ack-dependent": ["missing-ack"]
      },
      work: { "missing-ack": ["work-handle/v1:missing"] }
    });
    const snapshot = await coordinateCheckRecords(availabilityCatalog, {
      schedulerPolicy: { maxParallel: 3 }
    });
    assert.deepEqual(dependentCalls, []);
    assert.deepEqual(snapshot.runs.map((run) => ({
      checkId: run.checkId,
      diagnostic: run.diagnostic?.category ?? null
    })), [{ checkId: "invalid-record", diagnostic: "invalid-record" },
      { checkId: "invalid-record-dependent", diagnostic: "unavailable" },
      { checkId: "invalid-result", diagnostic: "invalid-result" },
      { checkId: "invalid-result-dependent", diagnostic: "unavailable" },
      { checkId: "missing-ack", diagnostic: "ack-protocol" },
      { checkId: "missing-ack-dependent", diagnostic: "unavailable" }]);
  });
});

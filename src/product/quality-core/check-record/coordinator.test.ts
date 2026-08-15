import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  resolveCheckCatalog,
  type CheckExecutionBinding,
  type CheckExecutionPorts,
  type ResolvedCheckCatalog
} from "./catalog.ts";
import {
  coordinateCheckRecordsWithTestPolicy
} from "./coordinator-test-support.ts";

function definition(checkId: string) {
  return {
    checkId,
    displayName: checkId,
    recordTypes: [{
      recordTypeId: "finding",
      fields: [{ fieldId: "kind", valueType: "string", required: true }],
      identityFields: ["kind"]
    }]
  } as const;
}

function resolveFixture(input: Readonly<{
  invocationKey?: string;
  checkIds: readonly string[];
  selected?: readonly string[];
  bindings: Readonly<Record<string, CheckExecutionBinding>>;
  work?: Readonly<Record<string, readonly string[] | "not-applicable">>;
}>): ResolvedCheckCatalog {
  const definitions = input.checkIds.map(definition);
  const resolved = resolveCheckCatalog({
    invocationKey: input.invocationKey ?? "coordinator-fixture",
    definitions,
    bindings: definitions.map(({ checkId }) => ({ checkId, execute: input.bindings[checkId]! })),
    schedules: definitions.map(({ checkId }) => ({ checkId, requiresChecks: [] })),
    selectedCheckIds: input.selected ?? input.checkIds,
    resolveApplicability: ({ checkId }) => input.work?.[checkId] === "not-applicable"
      ? { status: "not-applicable" }
      : { status: "applicable", workHandles: input.work?.[checkId] ?? [] }
  });
  if (!resolved.ok) {
    throw new Error(`Unexpected ${resolved.error.stage} fixture failure`);
  }
  return resolved.value;
}

function finding(kind: string, message = kind) {
  return {
    recordTypeId: "finding",
    level: "warning",
    semanticSubject: `src/${kind}.ts`,
    message,
    fields: { kind },
    location: { path: `src/${kind}.ts`, line: 1, column: 1 }
  } as const;
}

describe("check-record contribution coordinator", () => {
  it("produces one canonical integrated snapshot regardless of direct runner completion order", async () => {
    async function snapshot(delays: Readonly<Record<string, number>>) {
      const calls: string[] = [];
      const bindings: Readonly<Record<string, CheckExecutionBinding>> = {
        "file-metrics": async (ports) => {
          await new Promise((resolve) => setTimeout(resolve, delays["file-metrics"]));
          calls.push("file-metrics");
          ports.submitRecord(finding("file"));
          ports.acknowledge("work-handle/v1:file");
          return { verdict: "passed" };
        },
        "function-metrics": async (ports) => {
          await new Promise((resolve) => setTimeout(resolve, delays["function-metrics"]));
          calls.push("function-metrics");
          ports.submitRecord(finding("function"));
          return { verdict: "failed" };
        },
        "not-applicable-check": () => {
          calls.push("not-applicable-check");
          return { verdict: "passed" };
        },
        "skipped-check": () => {
          calls.push("skipped-check");
          return { verdict: "passed" };
        }
      };
      const catalogValue = resolveFixture({
        checkIds: ["skipped-check", "function-metrics", "not-applicable-check", "file-metrics"],
        selected: ["file-metrics", "function-metrics", "not-applicable-check"],
        bindings,
        work: {
          "file-metrics": ["work-handle/v1:file"],
          "function-metrics": [],
          "not-applicable-check": "not-applicable"
        }
      });
      return { snapshot: await coordinateCheckRecordsWithTestPolicy(catalogValue), calls };
    }

    const first = await snapshot({ "file-metrics": 10, "function-metrics": 0 });
    const second = await snapshot({ "file-metrics": 0, "function-metrics": 10 });
    assert.deepEqual(first.snapshot, second.snapshot);
    assert.deepEqual([...first.calls].sort(), ["file-metrics", "function-metrics"]);
    assert.deepEqual(first.snapshot.runs.map((run) => ({
      checkId: run.checkId,
      status: run.status,
      verdict: run.result?.verdict ?? null
    })), [{
      checkId: "file-metrics", status: "completed", verdict: "passed"
    }, {
      checkId: "function-metrics", status: "completed", verdict: "failed"
    }, {
      checkId: "not-applicable-check", status: "completed", verdict: "not-applicable"
    }, {
      checkId: "skipped-check", status: "skipped", verdict: null
    }]);
    assert.deepEqual(first.snapshot.completeness, {
      status: "complete",
      selectedRunCount: 3,
      completedRunCount: 3,
      failedRunCount: 0,
      plannedWorkCount: 1,
      acknowledgedWorkCount: 1
    });
    assert.equal("policy" in first.snapshot, false);
    assert.equal("output" in first.snapshot, false);
  });

  it("normalizes direct returned unavailable throws and rejections into closed terminal run facts", async () => {
    const credential = "https://user:secret-token@example.test/private";
    const catalogValue = resolveFixture({
      checkIds: [
        "async-rejection",
        "execution-throw",
        "illegal-result",
        "invalid-result",
        "quality-failed",
        "quality-passed",
        "unavailable-check"
      ],
      bindings: {
        "async-rejection": async () => { throw new Error(credential); },
        "execution-throw": () => { throw new Error(credential); },
        "illegal-result": () => ({ verdict: "not-applicable" }),
        "invalid-result": () => ({ verdict: "unknown" }),
        "quality-failed": () => ({ verdict: "failed" }),
        "quality-passed": () => ({ verdict: "passed" }),
        "unavailable-check": () => ({ status: "unavailable", dependencyId: "scanner" })
      }
    });
    const snapshot = await coordinateCheckRecordsWithTestPolicy(catalogValue);
    const facts = Object.fromEntries(snapshot.runs.map((run) => [run.checkId, {
      status: run.status,
      result: run.result,
      diagnostic: run.diagnostic?.category ?? null
    }]));

    assert.deepEqual(facts, {
      "async-rejection": { status: "failed", result: null, diagnostic: "execution-failed" },
      "execution-throw": { status: "failed", result: null, diagnostic: "execution-failed" },
      "illegal-result": { status: "failed", result: null, diagnostic: "invalid-result" },
      "invalid-result": { status: "failed", result: null, diagnostic: "invalid-result" },
      "quality-failed": { status: "completed", result: { verdict: "failed" }, diagnostic: null },
      "quality-passed": { status: "completed", result: { verdict: "passed" }, diagnostic: null },
      "unavailable-check": { status: "failed", result: null, diagnostic: "unavailable" }
    });
    assert.equal(JSON.stringify(snapshot).includes("secret-token"), false);

    let releaseBlockingRunner: () => void = () => undefined;
    const blockingRunner = new Promise<void>((resolve) => {
      releaseBlockingRunner = resolve;
    });
    let reportFastRunnerReturned: () => void = () => undefined;
    const fastRunnerReturned = new Promise<void>((resolve) => {
      reportFastRunnerReturned = resolve;
    });
    let retainedPorts: CheckExecutionPorts | undefined;
    const parallelCatalog = resolveFixture({
      checkIds: ["blocking-check", "fast-check"],
      bindings: {
        "blocking-check": async () => {
          await blockingRunner;
          return { verdict: "passed" };
        },
        "fast-check": (ports) => {
          retainedPorts = ports;
          assert.equal(ports.submitRecord(finding("retained-fast")), "committed");
          assert.equal(ports.acknowledge("work-handle/v1:fast"), "accepted");
          reportFastRunnerReturned();
          return { verdict: "passed" };
        }
      },
      work: {
        "blocking-check": [],
        "fast-check": ["work-handle/v1:fast", "work-handle/v1:late"]
      }
    });
    const parallelSnapshotPromise = coordinateCheckRecordsWithTestPolicy(parallelCatalog);
    await fastRunnerReturned;
    await new Promise((resolve) => setTimeout(resolve, 0));

    const latePorts = retainedPorts;
    assert.notEqual(latePorts, undefined);
    const lateRecordResult = latePorts!.submitRecord(finding("late-fast"));
    const lateAcknowledgementResult = latePorts!.acknowledge("work-handle/v1:late");
    releaseBlockingRunner();
    const parallelSnapshot = await parallelSnapshotPromise;

    assert.equal(lateRecordResult, "rejected");
    assert.equal(lateAcknowledgementResult, "rejected");
    assert.deepEqual(parallelSnapshot.records.map((record) => record.semanticSubject), [
      "src/retained-fast.ts"
    ]);
    assert.deepEqual(parallelSnapshot.runs.map((run) => ({
      checkId: run.checkId,
      status: run.status,
      coverage: run.coverage,
      diagnostic: run.diagnostic?.category ?? null
    })), [{
      checkId: "blocking-check",
      status: "completed",
      coverage: { plannedWorkCount: 0, acknowledgedWorkCount: 0 },
      diagnostic: null
    }, {
      checkId: "fast-check",
      status: "failed",
      coverage: { plannedWorkCount: 2, acknowledgedWorkCount: 1 },
      diagnostic: "ack-protocol"
    }]);
    assert.equal(parallelSnapshot.integrity.status, "valid");
    assert.equal(parallelSnapshot.integrity.invalidRecords.length, 0);
  });

  it("preserves records under ranked combined failures", async () => {
    const catalogValue = resolveFixture({
      checkIds: ["alpha-check", "beta-check"],
      bindings: {
        "alpha-check": (ports) => {
          assert.equal(Object.isFrozen(ports), true);
          ports.submitRecord(finding("retained-alpha"));
          ports.submitRecord(finding("conflict", "first body"));
          ports.submitRecord(finding("conflict", "second body"));
          ports.submitRecord({ ...finding("invalid"), fields: { kind: Number.NaN } } as never);
          ports.acknowledge("work-handle/v1:unknown");
          return { verdict: "not-applicable" };
        },
        "beta-check": (ports) => {
          ports.submitRecord(finding("retained-beta"));
          return { verdict: "passed" };
        }
      },
      work: {
        "alpha-check": ["work-handle/v1:alpha"],
        "beta-check": ["work-handle/v1:beta"]
      }
    });
    const snapshot = await coordinateCheckRecordsWithTestPolicy(catalogValue);

    assert.deepEqual(snapshot.runs.map((run) => ({
      checkId: run.checkId,
      status: run.status,
      diagnostic: run.diagnostic?.category ?? null,
      result: run.result
    })), [{
      checkId: "alpha-check",
      status: "failed",
      diagnostic: "record-conflict",
      result: null
    }, {
      checkId: "beta-check",
      status: "failed",
      diagnostic: "ack-protocol",
      result: null
    }]);
    assert.deepEqual(snapshot.records.map((record) => record.semanticSubject), [
      "src/retained-alpha.ts",
      "src/retained-beta.ts"
    ]);
    assert.equal(snapshot.integrity.status, "conflicted");
    assert.equal(snapshot.integrity.invalidRecords.length, 1);
    assert.equal(snapshot.integrity.conflicts.length, 1);
    assert.deepEqual(snapshot.completeness, {
      status: "incomplete",
      selectedRunCount: 2,
      completedRunCount: 0,
      failedRunCount: 2,
      plannedWorkCount: 2,
      acknowledgedWorkCount: 0
    });
    assert.equal(JSON.stringify(snapshot).includes("secret-token"), false);
  });
});

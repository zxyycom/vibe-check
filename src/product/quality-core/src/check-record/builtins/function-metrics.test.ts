import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { coordinateCheckRecords } from "../coordinator.ts";
import { createFunctionMetricsBinding } from "./function-metrics.ts";
import {
  assertAmbiguousFunctionRelations,
  assertFunctionRecordsAndStableIdentity,
  createAmbiguousFunctionFixtures,
  createFunctionFailureFixtures,
  createLizardFixture,
  functionMetricsSemantics as semantics,
  lizardCsv,
  lizardRow,
  resolveFunctionMetricsTestCatalog as resolveRuntimeCatalog
} from "./function-metrics-test-support.ts";

describe("function-metrics built-in Check", () => {
  it("produces three typed records and location-independent IDs from current and reference inputs", async () => {
    const fixture = createLizardFixture({
      currentOutput: lizardCsv([lizardRow({
        path: "src/a.ts", name: "hot", lines: 20, complexity: 12,
        parameters: 7, startLine: 40, endLine: 59
      })]),
      referenceOutput: lizardCsv([lizardRow({
        path: "src/a.ts", name: "hot", lines: 8, complexity: 3,
        parameters: 2, startLine: 1, endLine: 8
      })])
    });
    try {
      const runtime = createFunctionMetricsBinding({
        changedFiles: ["src/a.ts"],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts"]
        },
        semantics
      });
      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
      );

      assertFunctionRecordsAndStableIdentity(snapshot);
      const facts = runtime.referenceFacts(snapshot);
      assert.deepEqual(facts.evidence, [{
        checkId: "function-metrics",
        referenceName: "baseline",
        status: "complete"
      }]);
      assert.equal(facts.relations.length, 3);
      assert.ok(facts.relations.every(({ relationId }) => relationId === "regression"));
    } finally {
      fixture.cleanup();
    }
  });

  it("retains ambiguous function instances as changed without inventing regressions", async () => {
    const { currentRows, fixture, movedFixture } = createAmbiguousFunctionFixtures();
    const changedFiles = ["a.ts"];

    try {
      const runtime = createFunctionMetricsBinding({
        changedFiles,
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts"]
        },
        semantics
      });
      changedFiles.splice(0, changedFiles.length, "src/not-current.ts");

      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
      );
      const facts = runtime.referenceFacts(snapshot);

      assertAmbiguousFunctionRelations(snapshot, facts, currentRows.length);

      const movedRuntime = createFunctionMetricsBinding({
        changedFiles: [],
        current: { rootDir: movedFixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: movedFixture.dependency,
        reference: null,
        semantics
      });
      const movedSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(movedRuntime.binding, ["src/a.ts"])
      );
      assert.deepEqual(
        movedSnapshot.records.map((record) => record.recordId),
        snapshot.records.map((record) => record.recordId)
      );
    } finally {
      fixture.cleanup();
      movedFixture.cleanup();
    }
  });

  it("distinguishes successful zero-function work from no input", async () => {
    const fixture = createLizardFixture({
      currentOutput: lizardCsv([]),
      referenceOutput: lizardCsv([])
    });
    try {
      const runtime = createFunctionMetricsBinding({
        changedFiles: [],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: null,
        semantics
      });
      const zeroSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
      );
      const noInputSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, [])
      );

      assert.deepEqual(zeroSnapshot.runs[0]?.result, { verdict: "passed" });
      assert.deepEqual(zeroSnapshot.records, []);
      assert.equal(noInputSnapshot.runs[0]?.applicability, "not-applicable");
      assert.deepEqual(noInputSnapshot.runs[0]?.result, { verdict: "not-applicable" });
    } finally {
      fixture.cleanup();
    }
  });

  it("fails unavailable execution invalid and out-of-scope current batches without records", async () => {
    const fixtures = createFunctionFailureFixtures();

    try {
      for (const fixture of fixtures) {
        const runtime = createFunctionMetricsBinding({
          changedFiles: [],
          current: { rootDir: fixture.rootDir, approvedExactPaths: ["src/a.ts"] },
          dependency: fixture.dependency,
          reference: null,
          semantics
        });
        const snapshot = await coordinateCheckRecords(
          resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
        );
        assert.equal(snapshot.runs[0]?.status, "failed");
        assert.equal(snapshot.runs[0]?.diagnostic?.category, fixture.expected);
        assert.deepEqual(snapshot.records, []);
      }
    } finally {
      for (const fixture of fixtures) fixture.cleanup();
    }
  });

  it("keeps complete current records when reference scope is incomplete", async () => {
    const fixture = createLizardFixture({
      currentOutput: lizardCsv([lizardRow({
        path: "src/a.ts", name: "hot", lines: 20, complexity: 12,
        parameters: 7, startLine: 1, endLine: 20
      })]),
      referenceOutput: lizardCsv([lizardRow({
        path: "../outside.ts", name: "hot", lines: 8, complexity: 3,
        parameters: 2, startLine: 1, endLine: 8
      })])
    });
    try {
      const runtime = createFunctionMetricsBinding({
        changedFiles: [],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts"]
        },
        semantics
      });
      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
      );

      assert.equal(snapshot.runs[0]?.status, "completed");
      assert.equal(snapshot.records.length, 3);
      assert.deepEqual(runtime.referenceFacts(snapshot), {
        evidence: [{
          checkId: "function-metrics",
          referenceName: "baseline",
          status: "incomplete"
        }],
        relations: []
      });
    } finally {
      fixture.cleanup();
    }
  });
});

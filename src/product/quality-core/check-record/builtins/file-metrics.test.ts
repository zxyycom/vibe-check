import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { coordinateCheckRecordsWithTestPolicy } from "../coordinator-test-support.ts";
import { createRecordId } from "../identity.ts";
import { evaluateDecisionPolicy } from "../policy-evaluator.ts";
import {
  validatePolicyResolution,
  validateReferenceFacts
} from "../policy-validation.ts";
import {
  FILE_METRICS_CHECK_DEFINITION,
  createFileMetricsBinding
} from "./file-metrics.ts";
import {
  assertExpectedFileWarning,
  createSccFailureFixtures,
  createSccFixture,
  fileMetricsSemantics,
  fileRegressionPolicy,
  resolveFileMetricsTestCatalog,
  sccRow
} from "./file-metrics-test-support.ts";

describe("file-metrics built-in Check", () => {
  it("runs controlled current and reference exact inputs into one snapshot and reference policy result", async () => {
    const fixture = createSccFixture({
      currentRows: [sccRow("src/a.ts", 450, 400, 20)],
      referenceRows: [sccRow("src/a.ts", 250, 200, 20)]
    });

    try {
      const runtime = createFileMetricsBinding({
        changedFiles: ["src/a.ts"],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts"]
        },
        semantics: fileMetricsSemantics
      });
      const catalog = resolveFileMetricsTestCatalog(runtime.binding, ["src/a.ts"]);

      const snapshot = await coordinateCheckRecordsWithTestPolicy(catalog);
      assertExpectedFileWarning(snapshot);

      const policy = validatePolicyResolution(fileRegressionPolicy(), catalog);
      assert.equal(policy.ok, true);
      if (!policy.ok) throw new Error("Expected policy to resolve");
      const referenceFacts = validateReferenceFacts(
        runtime.referenceFacts(snapshot),
        policy.value,
        snapshot
      );
      assert.equal(referenceFacts.ok, true);
      if (!referenceFacts.ok) throw new Error("Expected reference facts to validate");
      assert.deepEqual(referenceFacts.value, {
        evidence: [{ checkId: "file-metrics", referenceName: "baseline", status: "complete" }],
        relations: [{
          recordId: snapshot.records[0]?.recordId,
          referenceName: "baseline",
          relationId: "regression"
        }]
      });
      assert.equal(
        evaluateDecisionPolicy(policy.value, snapshot, referenceFacts.value).gate.status,
        "failed"
      );
    } finally {
      fixture.cleanup();
    }
  });

  it("uses the frozen changed-file scope instead of baseline delta to classify changed records", async () => {
    const fixture = createSccFixture({
      currentRows: [
        sccRow("src/a.ts", 450, 400, 20),
        sccRow("src/b.ts", 550, 500, 20)
      ],
      referenceRows: [
        sccRow("src/a.ts", 450, 400, 20),
        sccRow("src/b.ts", 150, 100, 20)
      ]
    });
    const changedFiles = ["a.ts"];

    try {
      const runtime = createFileMetricsBinding({
        changedFiles,
        current: {
          rootDir: fixture.currentRoot,
          approvedExactPaths: ["src/a.ts", "src/b.ts"]
        },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts", "src/b.ts"]
        },
        semantics: fileMetricsSemantics
      });
      changedFiles.splice(0, changedFiles.length, "src/b.ts");

      const snapshot = await coordinateCheckRecordsWithTestPolicy(
        resolveFileMetricsTestCatalog(runtime.binding, ["src/a.ts", "src/b.ts"])
      );
      const facts = runtime.referenceFacts(snapshot);
      const relatedRecords = facts.relations.map((relation) => ({
        path: snapshot.records.find((record) => record.recordId === relation.recordId)?.location?.path,
        relationId: relation.relationId
      }));

      assert.equal(snapshot.records.length, 2);
      assert.deepEqual(relatedRecords, [{ path: "src/a.ts", relationId: "changed" }]);
    } finally {
      fixture.cleanup();
    }
  });

  it("fails current unavailable process CSV and out-of-scope batches without records", async () => {
    const fixtures = createSccFailureFixtures();

    try {
      for (const fixture of fixtures) {
        const runtime = createFileMetricsBinding({
          changedFiles: [],
          current: { rootDir: fixture.rootDir, approvedExactPaths: ["src/a.ts"] },
          dependency: fixture.dependency,
          reference: null,
          semantics: fileMetricsSemantics
        });
        const snapshot = await coordinateCheckRecordsWithTestPolicy(
          resolveFileMetricsTestCatalog(runtime.binding, ["src/a.ts"])
        );
        assert.equal(snapshot.runs[0]?.status, "failed");
        assert.equal(snapshot.runs[0]?.result, null);
        assert.equal(snapshot.runs[0]?.diagnostic?.category, fixture.expectedCategory);
        assert.deepEqual(snapshot.records, []);
      }
    } finally {
      for (const fixture of fixtures) fixture.cleanup();
    }
  });

  it("retains an earlier valid record when a later out-of-scope batch is rejected", async () => {
    const fixture = createSccFixture({
      currentRows: [
        sccRow("src/a.ts", 450, 400, 20),
        sccRow("../outside.ts", 450, 400, 20)
      ],
      referenceRows: []
    });

    try {
      const runtime = createFileMetricsBinding({
        changedFiles: [],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: null,
        semantics: fileMetricsSemantics
      });
      const snapshot = await coordinateCheckRecordsWithTestPolicy(
        resolveFileMetricsTestCatalog(async (ports) => {
          assert.equal(ports.submitRecord({
              recordTypeId: "file-code-lines",
              level: "warning",
              semanticSubject: "src/prior.ts",
              message: "Prior valid record",
              fields: {
                codeArea: "source",
                limit: 300,
                metric: "code-lines",
                value: 350
              },
              location: { path: "src/prior.ts", line: 1, column: 1 }
          }), "committed");
          return runtime.binding(ports);
        }, ["src/a.ts"])
      );

      assert.equal(snapshot.runs[0]?.status, "failed");
      assert.equal(snapshot.runs[0]?.result, null);
      assert.equal(snapshot.runs[0]?.diagnostic?.category, "invalid-result");
      assert.deepEqual(snapshot.records.map((record) => record.semanticSubject), ["src/prior.ts"]);
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps current facts complete when reference scope is incomplete and policy readiness stops evaluation", async () => {
    const fixture = createSccFixture({
      currentRows: [sccRow("src/a.ts", 450, 400, 20)],
      referenceRows: [sccRow("../outside.ts", 250, 200, 20)]
    });

    try {
      const runtime = createFileMetricsBinding({
        changedFiles: [],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts"]
        },
        semantics: fileMetricsSemantics
      });
      const catalog = resolveFileMetricsTestCatalog(runtime.binding, ["src/a.ts"]);
      const snapshot = await coordinateCheckRecordsWithTestPolicy(catalog);
      const policy = validatePolicyResolution(fileRegressionPolicy(), catalog);
      assert.equal(policy.ok, true);
      if (!policy.ok) throw new Error("Expected policy to resolve");
      const facts = validateReferenceFacts(runtime.referenceFacts(snapshot), policy.value, snapshot);
      assert.equal(facts.ok, true);
      if (!facts.ok) throw new Error("Expected incomplete facts to validate");
      const decision = evaluateDecisionPolicy(policy.value, snapshot, facts.value);

      assert.equal(snapshot.runs.length, 1);
      assert.equal(snapshot.runs[0]?.status, "completed");
      assert.deepEqual(snapshot.runs[0]?.result, { verdict: "failed" });
      assert.equal(snapshot.completeness.status, "complete");
      assert.equal(snapshot.records.length, 1);
      assert.deepEqual(facts.value, {
        evidence: [{ checkId: "file-metrics", referenceName: "baseline", status: "incomplete" }],
        relations: []
      });
      assert.equal(decision.gate.status, "not-evaluated");
      if (decision.gate.status !== "not-evaluated") {
        throw new Error("Expected reference readiness to stop evaluation");
      }
      assert.equal(decision.gate.policyId, "file-regressions");
      assert.equal(decision.gate.reason, "comparison-unavailable");
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps file record identity stable when only current location changes", async () => {
    const fixture = createSccFixture({
      currentRows: [sccRow("src/a.ts", 450, 400, 20)],
      referenceRows: []
    });

    try {
      const runtime = createFileMetricsBinding({
        changedFiles: [],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: null,
        semantics: fileMetricsSemantics
      });
      const snapshot = await coordinateCheckRecordsWithTestPolicy(
        resolveFileMetricsTestCatalog(runtime.binding, ["src/a.ts"])
      );
      const record = snapshot.records[0]!;
      const recordType = FILE_METRICS_CHECK_DEFINITION.recordTypes[0];
      const relocatedId = createRecordId({
        ...record,
        location: { path: record.location!.path, line: 99, column: 7 }
      }, recordType).recordId;

      assert.equal(relocatedId, record.recordId);
    } finally {
      fixture.cleanup();
    }
  });
});

import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { coordinateCheckRecordsWithTestPolicy } from "../coordinator-test-support.ts";
import {
  DUPLICATE_DETECTION_CHECK_DEFINITION,
  createDuplicateDetectionBinding
} from "./duplicate-detection.ts";
import {
  createDuplicateOutcomeFixtures,
  createDuplicateTestRuntime as createRuntime,
  createJscpdFixture,
  currentDuplicateInput as currentInput,
  duplicateArea as area,
  duplicateDetectionSemantics as semantics,
  duplicateReport,
  duplicateReports,
  emptyDuplicateInput as emptyInput,
  emptyDuplicateReport as emptyReport,
  referenceDuplicateInput as referenceInput,
  resolveDuplicateTestCatalog as resolveRuntimeCatalog,
  scanInvocationCount
} from "./duplicate-detection-test-support.ts";

describe("duplicate-detection built-in Check", () => {
  it("produces a private cached duplicate record and reference regression fact", async () => {
    const fixture = createJscpdFixture({
      currentReports: { "src/a.ts": duplicateReport("src/a.ts", "src/b.ts", 80, 12) },
      referenceReports: { "src/a.ts": emptyReport() }
    });
    try {
      const runtime = createRuntime(fixture, currentInput(fixture), referenceInput(fixture));
      const snapshot = await coordinateCheckRecordsWithTestPolicy(
        resolveRuntimeCatalog(runtime.binding, currentInput(fixture))
      );

      assert.deepEqual(
        DUPLICATE_DETECTION_CHECK_DEFINITION.recordTypes.map(({ recordTypeId }) => recordTypeId),
        ["duplicate-code"]
      );
      assert.equal(JSON.stringify(DUPLICATE_DETECTION_CHECK_DEFINITION).includes("controlled-jscpd"), false);
      assert.deepEqual(snapshot.runs[0]?.result, { verdict: "failed" });
      assert.equal(snapshot.records.length, 1);
      assert.equal(snapshot.records[0]?.recordTypeId, "duplicate-code");
      assert.deepEqual(runtime.referenceFacts(snapshot), {
        evidence: [{
          checkId: "duplicate-detection",
          referenceName: "baseline",
          status: "complete"
        }],
        relations: [{
          recordId: snapshot.records[0]?.recordId,
          referenceName: "baseline",
          relationId: "regression"
        }]
      });
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps equal-shape fragments distinct and their identities stable across line movement", async () => {
    const currentReport = duplicateReports([
      { firstStart: 10, secondStart: 20 },
      { firstStart: 40, secondStart: 50 }
    ]);
    const movedReport = duplicateReports([
      { firstStart: 110, secondStart: 120 },
      { firstStart: 140, secondStart: 150 }
    ]);
    const fixture = createJscpdFixture({
      currentReports: { "src/a.ts": currentReport },
      referenceReports: { "src/a.ts": movedReport }
    });
    const movedFixture = createJscpdFixture({
      currentReports: { "src/a.ts": movedReport },
      referenceReports: {}
    });
    const changedFiles = ["a.ts"];

    try {
      const runtime = createRuntime(
        fixture,
        currentInput(fixture),
        referenceInput(fixture),
        changedFiles
      );
      changedFiles.splice(0, changedFiles.length, "test/not-current.ts");
      const snapshot = await coordinateCheckRecordsWithTestPolicy(
        resolveRuntimeCatalog(runtime.binding, currentInput(fixture))
      );

      assert.equal(snapshot.records.length, 2);
      assert.equal(new Set(snapshot.records.map((record) => record.recordId)).size, 2);
      assert.deepEqual(
        runtime.referenceFacts(snapshot).relations.map((relation) => relation.relationId),
        ["changed", "changed"]
      );

      const movedRuntime = createRuntime(movedFixture, currentInput(movedFixture), null, []);
      const movedSnapshot = await coordinateCheckRecordsWithTestPolicy(
        resolveRuntimeCatalog(movedRuntime.binding, currentInput(movedFixture))
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

  it("distinguishes zero findings and no input and fails unavailable invalid and out-of-scope batches", async () => {
    const fixtures = createDuplicateOutcomeFixtures();
    try {
      const zeroRuntime = createRuntime(fixtures.zero, currentInput(fixtures.zero), null);
      const zeroSnapshot = await coordinateCheckRecordsWithTestPolicy(
        resolveRuntimeCatalog(zeroRuntime.binding, currentInput(fixtures.zero))
      );
      const noInputSnapshot = await coordinateCheckRecordsWithTestPolicy(
        resolveRuntimeCatalog(zeroRuntime.binding, emptyInput(fixtures.zero))
      );
      assert.deepEqual(zeroSnapshot.runs[0]?.result, { verdict: "passed" });
      assert.equal(noInputSnapshot.runs[0]?.applicability, "not-applicable");

      for (const { expectedCategory, fixture } of fixtures.failures) {
        const runtime = createRuntime(fixture, currentInput(fixture), null);
        const snapshot = await coordinateCheckRecordsWithTestPolicy(
          resolveRuntimeCatalog(runtime.binding, currentInput(fixture))
        );
        assert.equal(snapshot.runs[0]?.status, "failed");
        assert.equal(snapshot.runs[0]?.diagnostic?.category, expectedCategory);
        assert.deepEqual(snapshot.records, []);
      }

      const unavailableSnapshot = await coordinateCheckRecordsWithTestPolicy(
        resolveRuntimeCatalog(fixtures.unavailable.runtime.binding, fixtures.unavailable.input)
      );
      assert.equal(unavailableSnapshot.runs[0]?.diagnostic?.category, "unavailable");
      assert.deepEqual(unavailableSnapshot.records, []);
    } finally {
      fixtures.cleanup();
    }
  });

  it("reuses cache revalidates cached paths and keys backend arguments privately", async () => {
    const disabledFixture = createJscpdFixture({
      currentReports: { "src/a.ts": duplicateReport("src/a.ts", "src/b.ts", 80, 12) },
      referenceReports: {}
    });
    const fixture = createJscpdFixture({
      currentReports: { "src/a.ts": duplicateReport("src/a.ts", "src/b.ts", 80, 12) },
      referenceReports: {}
    });
    try {
      const activities: string[] = [];
      const cacheDisabled = createDuplicateDetectionBinding({
        cache: { enabled: false, onActivity: (activity) => activities.push(activity) },
        changedFiles: [],
        current: currentInput(disabledFixture),
        dependency: disabledFixture.dependency,
        reference: null,
        semantics
      });
      await coordinateCheckRecordsWithTestPolicy(
        resolveRuntimeCatalog(cacheDisabled.binding, currentInput(disabledFixture))
      );
      assert.equal(scanInvocationCount(disabledFixture.capturePath), 1);
      assert.deepEqual(activities, []);
      assert.equal(existsSync(join(disabledFixture.cacheRoot, "quality-scan-cache-v1")), false);

      for (let index = 0; index < 2; index += 1) {
        const runtime = createRuntime(fixture, currentInput(fixture), null);
        await coordinateCheckRecordsWithTestPolicy(resolveRuntimeCatalog(runtime.binding, currentInput(fixture)));
      }
      assert.equal(scanInvocationCount(fixture.capturePath), 1, "second run must use cache");

      const cacheDir = join(fixture.cacheRoot, "quality-scan-cache-v1");
      const cacheFile = readdirSync(cacheDir).find((entry) => entry.endsWith(".json"));
      assert.ok(cacheFile);
      const cachePath = join(cacheDir, cacheFile);
      const cached = JSON.parse(readFileSync(cachePath, "utf8")) as {
        metrics: Array<{ locations: Array<{ path: string }> }>;
      };
      cached.metrics[0]!.locations[0]!.path = "../credential/outside.ts";
      writeFileSync(cachePath, `${JSON.stringify(cached)}\n`, "utf8");

      const revalidating = createRuntime(fixture, currentInput(fixture), null);
      await coordinateCheckRecordsWithTestPolicy(
        resolveRuntimeCatalog(revalidating.binding, currentInput(fixture))
      );
      assert.equal(scanInvocationCount(fixture.capturePath), 2, "out-of-scope cache must rescan");

      const alternateDependency = {
        ...fixture.dependency,
        args: [...fixture.dependency.args, "--backend-variant"]
      };
      const alternate = createDuplicateDetectionBinding({
        changedFiles: [],
        current: currentInput(fixture),
        dependency: alternateDependency,
        reference: null,
        semantics
      });
      await coordinateCheckRecordsWithTestPolicy(resolveRuntimeCatalog(alternate.binding, currentInput(fixture)));
      assert.equal(scanInvocationCount(fixture.capturePath), 3, "backend args must change cache identity");
    } finally {
      disabledFixture.cleanup();
      fixture.cleanup();
    }
  });

  it("retains an earlier record when a later area batch fails and keeps reference failure separate", async () => {
    const fixture = createJscpdFixture({
      currentReports: {
        "src/a.ts": duplicateReport("src/a.ts", "src/b.ts", 80, 12),
        "test/a.ts": duplicateReport("test/a.ts", "../outside.ts", 60, 8)
      },
      referenceReports: {
        "src/a.ts": duplicateReport("src/a.ts", "../outside.ts", 80, 12)
      }
    });
    const twoAreaInput = {
      ...currentInput(fixture),
      areas: [
        currentInput(fixture).areas[0]!,
        area("tests", ["test/a.ts", "test/b.ts"])
      ]
    } as const;
    try {
      const failing = createRuntime(fixture, twoAreaInput, null);
      const retained = await coordinateCheckRecordsWithTestPolicy(
        resolveRuntimeCatalog(async (ports) => {
          assert.equal(ports.submitRecord({
              recordTypeId: "duplicate-code",
              level: "warning",
              semanticSubject: "duplicate:{\"lineCount\":1,\"paths\":[\"prior/a.ts\",\"prior/b.ts\"],\"tokenCount\":1}",
              message: "Prior committed duplicate",
              fields: {
                codeArea: "source",
                lineCount: 1,
                locationCount: 2,
                metric: "duplicate-tokens",
                suggestion: "Extract shared code",
                value: 1
              },
              location: { path: "prior/a.ts", line: 1, column: 1 }
          }), "committed");
          return failing.binding(ports);
        }, twoAreaInput)
      );
      assert.equal(retained.runs[0]?.diagnostic?.category, "invalid-result");
      assert.deepEqual(retained.records.map(({ message }) => message), ["Prior committed duplicate"]);

      const referenceRuntime = createRuntime(
        fixture,
        currentInput(fixture),
        referenceInput(fixture)
      );
      const currentSnapshot = await coordinateCheckRecordsWithTestPolicy(
        resolveRuntimeCatalog(referenceRuntime.binding, currentInput(fixture))
      );
      assert.equal(currentSnapshot.runs[0]?.status, "completed");
      assert.equal(currentSnapshot.records.length, 1);
      assert.deepEqual(referenceRuntime.referenceFacts(currentSnapshot), {
        evidence: [{
          checkId: "duplicate-detection",
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

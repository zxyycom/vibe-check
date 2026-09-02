import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import { duplicateDetection } from "./default-check.ts";
import { executeDuplicateDetection } from "./execution.ts";
import { DUPLICATE_DETAILS } from "./finding-messages.test-support.ts";
import {
  assertInvalidOptionsAreRejected,
  assertSourceAndCacheWriteFailures,
  CODE_AREAS,
  createRealDuplicateRoot,
  createRoot,
  duplicateScannerExecutable,
  execute
} from "./default-check.execution.test-support.ts";
import {
  assertDefaultCheckComposition,
  assertInitialOverlappingAreaResult,
  assertReevaluatedOverlappingPolicies,
  createOverlappingAreaCheck
} from "./default-check.overlap.test-support.ts";

describe("default Check direct callbacks", () => {
  it("executes duplicate detection from Check-owned scanner options with final data and Check-owned cache options", async function executesDuplicateDetectionWithCheckOwnedOptions() {
    assertDefaultCheckComposition();
    const root = createRoot("vibe-check-direct-duplicate-");
    try {
      const executable = duplicateScannerExecutable(root);
      const check = duplicateDetection({
        cache: { directory: ".cache/vibe-check", enabled: true },
        codeAreas: CODE_AREAS,
        scanner: {
          command: { executable, kind: "custom" }
        }
      });
      const options = check.options;
      await assertInvalidOptionsAreRejected(check, options, root, executable);
      const result = await execute(executeDuplicateDetection, options, root);
      assert.deepEqual(result.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 1 },
        messages: [
          {
            code: "non-blocking-findings",
            level: "warning",
            message:
              "1 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
          },
          DUPLICATE_DETAILS.direct
        ]
      });
      assert.equal(result.records.length, 1);
      assert.match(result.records[0]?.identity.id ?? "", /^duplicate-fragment\/v1\/sha256:/);
      assert.deepEqual(result.records[0]?.data, {
        blocking: false,
        codeAreas: ["source"],
        lineCount: 12,
        locations: [
          { endLine: 21, path: "src/a.ts", startLine: 10 },
          { endLine: 31, path: "src/b.ts", startLine: 20 }
        ],
        metric: "duplicate-tokens",
        tokenCount: 80
      });
      await assertSourceAndCacheWriteFailures(options, root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("detects project-relative duplicates through the public Check and fails an explicit all aggregate", async function detectsProjectRelativeDuplicatesThroughPublicCheck() {
    const root = createRealDuplicateRoot();
    try {
      const result = await run(
        defineConfig({
          checks: [
            duplicateDetection({
              codeAreas: { project: { files: {}, minimumLines: 3, minimumTokens: 20 } },
              findingPolicy: "blocking"
            })
          ],
          outputs: {
            diagnosticLogging: { enabled: false },
            machinePublication: { enabled: false },
            progressRendering: { enabled: false }
          }
        }),
        {
          checkAggregation: {
            checks: "all",
            empty: "failed",
            mode: "all",
            notApplicable: "fail",
            unavailable: "fail"
          },
          projectRoot: root
        }
      );
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.aggregate, "failed");
      assert.equal(result.snapshot.checks.length, 1);
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        data: { blockingFindingCount: 1, findingCount: 1 },
        status: "failed"
      });
      assert.equal(result.snapshot.records.length, 1);
      assert.equal(result.snapshot.records[0]?.checkId, "duplicate-detection");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("scans area-owned exact inputs once and applies the strictest overlapping area policy", async function appliesOverlappingAreaPolicyToOneScan() {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-cross-area-duplicate-"));
    const { options, scanCountPath } = createOverlappingAreaCheck(root);
    try {
      await assertInitialOverlappingAreaResult(options, root, scanCountPath);
      await assertReevaluatedOverlappingPolicies(options, root, scanCountPath);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

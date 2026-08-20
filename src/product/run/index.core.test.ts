import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  defineConfig,
  type Check,
  type CheckExecution,
  type QualityRecordCandidate
} from "../definition/project.ts";
import { run } from "./index.ts";

const COMPLETED = Object.freeze({ status: "completed" as const, verdict: "passed" as const });

function check(
  overrides: Readonly<{
    readonly execution?: CheckExecution;
    readonly recordTypes?: Check["recordTypes"];
  }> = {}
): Check {
  return {
    checkId: "custom",
    displayName: "Custom",
    execution: overrides.execution ?? (() => COMPLETED),
    recordTypes: overrides.recordTypes ?? []
  };
}

function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    effects: {
      cache: { enabled: false },
      logs: { enabled: false },
      output: { enabled: false },
      progress: { enabled: false }
    },
    selectedPolicy: null
  });
}

const RECORD_CANDIDATE = Object.freeze({
  recordTypeId: "finding",
  level: "warning",
  semanticSubject: "src/a.ts",
  message: "A direct Check finding",
  fields: Object.freeze({ metric: "score" }),
  location: Object.freeze({ path: "src/a.ts", line: 1, column: 1 })
}) satisfies QualityRecordCandidate;

const RECORD_TYPES = [
  {
    recordTypeId: "finding",
    fields: [{ fieldId: "metric", valueType: "string", required: true }],
    identityFields: ["metric"]
  }
] as const;

describe("Package Run core integration", () => {
  it("contains invalid callback outcomes and record misuse in the Check outcome", async () => {
    const invalidOutcomeCheck = check();
    Object.defineProperty(invalidOutcomeCheck, "execution", {
      value: () => ({ status: "unexpected" })
    });
    const invalidResult = await run(definition([invalidOutcomeCheck]));
    assert.equal(invalidResult.kind, "completed");
    if (invalidResult.kind !== "completed") return;
    assert.deepEqual(invalidResult.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "invalid-execution-result" }
    });

    const invalidRecord = await run(
      definition([
        check({
          recordTypes: RECORD_TYPES,
          execution: (context) => {
            context.records.report({ ...RECORD_CANDIDATE, recordTypeId: "unknown" });
            return COMPLETED;
          }
        })
      ])
    );
    assert.equal(invalidRecord.kind, "completed");
    if (invalidRecord.kind !== "completed") return;
    assert.deepEqual(invalidRecord.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "record-invalid" }
    });

    const contradictoryReference = await run(
      definition([
        check({
          execution: (context) => {
            context.records.reportReference({
              referenceName: "baseline",
              relations: [],
              status: "unavailable"
            });
            return { status: "not-applicable" };
          }
        })
      ])
    );
    assert.equal(contradictoryReference.kind, "completed");
    if (contradictoryReference.kind !== "completed") return;
    assert.deepEqual(contradictoryReference.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "record-invalid" }
    });
  });

  it("commits Check-owned records and closes its reporter when the callback settles", async () => {
    let retainedReporter: Readonly<{ report(candidate: QualityRecordCandidate): void }> | undefined;
    const result = await run(
      definition([
        check({
          recordTypes: RECORD_TYPES,
          execution: (context) => {
            retainedReporter = context.records;
            context.records.report(RECORD_CANDIDATE);
            return COMPLETED;
          }
        })
      ])
    );
    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.equal(result.snapshot.records.length, 1);
    assert.throws(() => retainedReporter?.report(RECORD_CANDIDATE), /reporter is closed/);
  });

  it("publishes the direct Check snapshot without retaining executable callbacks", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-publication-"));
    try {
      const result = await run(definition([check()]), {
        projectRoot: root,
        effects: { output: { enabled: true, directory: "published" } }
      });
      assert.equal(result.kind, "completed");
      assert.equal(existsSync(join(root, "published", "run.json")), true);
      assert.equal(existsSync(join(root, "published", "records.ndjson")), true);
      assert.doesNotMatch(JSON.stringify(result), /"execution"\s*:/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

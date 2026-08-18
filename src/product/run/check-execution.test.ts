import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CheckExecution, CheckProjectContext } from "../definition/custom-check.ts";
import type { NormalizedCheck } from "../definition/project.ts";
import { executeResolvedChecks } from "./check-execution.ts";

const FINDING = Object.freeze({
  recordTypeId: "finding",
  level: "warning",
  semanticSubject: "src/a.ts",
  message: "Direct reference finding",
  fields: Object.freeze({ metric: "score" }),
  location: Object.freeze({ path: "src/a.ts", line: 1, column: 1 })
});

const PROJECT = Object.freeze({
  cache: Object.freeze({ directory: ".cache", enabled: false, reportActivity: () => undefined }),
  changedFiles: Object.freeze([]),
  comparison: Object.freeze({ referenceName: "baseline", revision: "HEAD", root: "/reference" }),
  files: Object.freeze({ codeAreas: {}, excludeDirs: [], generatedFiles: [], include: ["**/*"] }),
  root: "/project"
}) satisfies CheckProjectContext;

function normalized(execution: CheckExecution): NormalizedCheck {
  return {
    definition: {
      checkId: "reference-check",
      displayName: "Reference Check",
      recordTypes: [
        {
          recordTypeId: "finding",
          fields: [{ fieldId: "metric", valueType: "string", required: true }],
          identityFields: ["metric"],
          policy: { operands: [], relations: ["changed"] }
        }
      ]
    },
    dependsOn: [],
    execution,
    maxParallel: 1,
    mutex: [],
    options: {}
  };
}

async function execute(execution: CheckExecution) {
  return executeResolvedChecks({
    checks: [normalized(execution)],
    maxParallel: 1,
    project: PROJECT,
    signal: undefined
  });
}

describe("Package Run direct Check execution", () => {
  it("retains a valid optional comparison candidate when no selected policy requires it", async () => {
    const result = await execute((context) => {
      context.records.reportReference({
        referenceName: "baseline",
        relations: [],
        status: "complete"
      });
      return { status: "completed", verdict: "passed" };
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "completed",
      verdict: "passed"
    });
    assert.deepEqual(result.references, [
      {
        checkId: "reference-check",
        referenceName: "baseline",
        relations: [],
        status: "complete"
      }
    ]);
  });

  it("retains one complete reference candidate by resolving the already committed Record identity", async () => {
    const result = await execute((context) => {
      context.records.report(FINDING);
      context.records.reportReference({
        referenceName: "baseline",
        relations: [
          {
            record: {
              recordTypeId: FINDING.recordTypeId,
              semanticSubject: FINDING.semanticSubject,
              fields: FINDING.fields
            },
            relationId: "changed"
          }
        ],
        status: "complete"
      });
      return { status: "completed", verdict: "passed" };
    });

    assert.equal(result.kind, "completed");
    const recordId = result.snapshot.records[0]?.recordId;
    assert.ok(recordId);
    assert.deepEqual(result.references, [
      {
        checkId: "reference-check",
        referenceName: "baseline",
        relations: [{ recordId, referenceName: "baseline", relationId: "changed" }],
        status: "complete"
      }
    ]);
  });

  it("turns malformed or uncommitted reference relations into the contained reference-invalid outcome", async () => {
    const result = await execute((context) => {
      context.records.reportReference({
        referenceName: "baseline",
        relations: [
          {
            record: {
              recordTypeId: FINDING.recordTypeId,
              semanticSubject: FINDING.semanticSubject,
              fields: FINDING.fields
            },
            relationId: "changed"
          }
        ],
        status: "complete"
      });
      return { status: "completed", verdict: "passed" };
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "reference-invalid" }
    });
    assert.deepEqual(result.references, []);
  });

  it("does not retain a reference candidate from a contradictory not-applicable callback", async () => {
    const result = await execute((context) => {
      context.records.reportReference({
        referenceName: "baseline",
        relations: [],
        status: "unavailable"
      });
      return { status: "not-applicable" };
    });

    assert.equal(result.kind, "completed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      status: "unavailable",
      reason: { code: "record-invalid" }
    });
    assert.deepEqual(result.references, []);
  });
});

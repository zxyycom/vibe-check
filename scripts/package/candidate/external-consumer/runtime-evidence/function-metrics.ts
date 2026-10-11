import assert from "node:assert/strict";
import { isRecord, isUnknownArray } from "./values.ts";

/** Verifies Rust and TypeScript results produced by the installed analyzer Worker. */
export function assertTrustedNonBlockingFunctionMetricsRecord(value: unknown): void {
  if (!isUnknownArray(value))
    throw new TypeError("isolated function-metrics records must be an array");
  assert.equal(value.length, 2);
  const records = value.map((record) => {
    if (!isRecord(record))
      throw new TypeError("isolated function-metrics record must be an object");
    assert.equal(record.checkId, "function-metrics");
    if (!isRecord(record.data))
      throw new TypeError("isolated function-metrics record data must be an object");
    return record.data;
  });
  assert.deepEqual(records, [
    {
      blocking: false,
      codeAreas: ["worker"],
      complexityContributors: [
        { line: 4, token: "=>" },
        { line: 5, token: "=>" }
      ],
      functionName: "workerProof",
      limit: 1,
      metric: "cyclomatic-complexity",
      path: "function-metrics.rs",
      startLine: 1,
      value: 3
    },
    {
      blocking: false,
      codeAreas: ["typescript"],
      complexityContributors: [2, 2, 2, 2].map((line) => ({ line, token: "??" })),
      functionName: "nullishProof",
      limit: 1,
      metric: "cyclomatic-complexity",
      path: "function-metrics.ts",
      startLine: 1,
      value: 5
    }
  ]);
}

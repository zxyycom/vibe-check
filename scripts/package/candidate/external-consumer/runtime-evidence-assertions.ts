import assert from "node:assert/strict";

import { isRecord, isUnknownArray, requiredString } from "./runtime-evidence-values.ts";

export type CandidateFixtureEvidence = Readonly<{
  checkMessages: unknown;
  checkDurations: unknown;
  cacheComputations: unknown;
  changedFilesCalls: unknown;
  blockedChangedFilesConsumer: unknown;
  blockedChangedFilesConsumerCalls: unknown;
  firstCacheRead: unknown;
  secondCacheRead: unknown;
  changedFilesFromMachine: unknown;
  changedFilesFromRun: unknown;
  duplicateData: unknown;
  duplicateOutcome: string | null;
  duplicateRecords: unknown;
  firstChangedFilesConsumer: unknown;
  functionMetricsData: unknown;
  functionMetricsOutcome: string | null;
  functionMetricsRecords: unknown;
  humanOutput: string;
  kind: string;
  jsonSchemaData: unknown;
  jsonSchemaOutcome: string | null;
  markdownLinkData: unknown;
  markdownLinkOutcome: string | null;
  machineSchemaVersion: unknown;
  parserEvidence: unknown;
  secondChangedFilesConsumer: unknown;
}>;

/** Verifies the package behaviors observed from the isolated consumer fixture. */
export function assertCandidateRunEvidence(runEvidence: CandidateFixtureEvidence): void {
  assert.equal(runEvidence.kind, "completed");
  assert.equal(runEvidence.cacheComputations, 1);
  assert.deepEqual(runEvidence.firstCacheRead, {
    read: "miss",
    source: "computed",
    value: { count: 1 },
    write: "stored"
  });
  assert.deepEqual(runEvidence.secondCacheRead, {
    read: "hit",
    source: "cache",
    value: { count: 1 },
    write: "not-attempted"
  });
  assert.equal(runEvidence.duplicateOutcome, "passed");
  assert.deepEqual(runEvidence.duplicateData, { blockingFindingCount: 0, findingCount: 1 });
  assertTrustedNonBlockingDuplicateRecord(runEvidence.duplicateRecords);
  assert.equal(runEvidence.functionMetricsOutcome, "passed");
  assert.deepEqual(runEvidence.functionMetricsData, { blockingFindingCount: 0, findingCount: 1 });
  assertTrustedNonBlockingFunctionMetricsRecord(runEvidence.functionMetricsRecords);
  assert.equal(runEvidence.jsonSchemaOutcome, "passed");
  assert.deepEqual(runEvidence.jsonSchemaData, {
    bindingCount: 1,
    blockedBindingCount: 0,
    invalidBindingCount: 0,
    issueCount: 0,
    issuesTruncated: false,
    reportedIssueCount: 0,
    schemaCount: 1,
    validBindingCount: 1
  });
  assert.equal(runEvidence.markdownLinkOutcome, "passed");
  assert.deepEqual(runEvidence.markdownLinkData, {
    findingCount: 0,
    occurrenceCount: 1,
    rejectedInputCount: 0,
    sourceFileCount: 2,
    targetReadCount: 1
  });
  assert.equal(runEvidence.changedFilesCalls, 1);
  assert.equal(runEvidence.blockedChangedFilesConsumerCalls, 0);
  assert.deepEqual(runEvidence.blockedChangedFilesConsumer, {
    status: "unavailable",
    reason: {
      checkIds: ["failed-changed-files"],
      code: "dependency-not-passed"
    }
  });
  assert.deepEqual(runEvidence.changedFilesFromMachine, {
    files: ["src/duplicate-a.ts", "src/duplicate-b.ts"],
    version: 1
  });
  assert.deepEqual(runEvidence.changedFilesFromRun, runEvidence.changedFilesFromMachine);
  assertParserEvidence(runEvidence.parserEvidence);
  assert.deepEqual(runEvidence.firstChangedFilesConsumer, {
    fileCount: 1,
    observedStatus: "failed"
  });
  assert.deepEqual(runEvidence.secondChangedFilesConsumer, { firstFile: "src/duplicate-a.ts" });
  assert.equal(runEvidence.machineSchemaVersion, "vibe-check.run.v4");
  assertDuplicateAndTerminalMessages(runEvidence.checkMessages);
  assertHumanOutput(runEvidence.humanOutput);
  for (const checkId of [
    "duplicate-detection",
    "function-metrics",
    "json-schema-validation",
    "markdown-link-validation",
    "changed-files",
    "failed-changed-files",
    "first-changed-files-consumer",
    "second-changed-files-consumer",
    "installed-terminal-note"
  ]) {
    assertCanonicalExecutedDuration(runEvidence.checkDurations, checkId);
  }
  assertUnavailableDependencyDuration(runEvidence.checkDurations, "blocked-changed-files-consumer");
}

function assertParserEvidence(value: unknown): void {
  assert.deepEqual(value, {
    attachedJson: {
      invalidFileCount: 0,
      issueCount: 0,
      rejectedInputCount: 0,
      scannedFileCount: 0,
      validFileCount: 0
    },
    duplicate: { blockingFindingCount: 0, findingCount: 0 },
    file: { blockingFindingCount: 0, findingCount: 0 },
    function: { blockingFindingCount: 0, findingCount: 0 },
    json: {
      invalidFileCount: 0,
      issueCount: 0,
      rejectedInputCount: 0,
      scannedFileCount: 0,
      validFileCount: 0
    },
    jsonSchema: {
      bindingCount: 0,
      blockedBindingCount: 0,
      invalidBindingCount: 0,
      issueCount: 0,
      issuesTruncated: false,
      reportedIssueCount: 0,
      schemaCount: 0,
      validBindingCount: 0
    },
    maintenance: { entries: [] },
    markdown: {
      findingCount: 0,
      occurrenceCount: 0,
      rejectedInputCount: 0,
      sourceFileCount: 0,
      targetReadCount: 0
    }
  });
}

function assertHumanOutput(output: string): void {
  assert.match(output, /total\s+11\s+checks/i);
  assert.match(output, /Checks:/);
  assert.match(output, /\[1\/11\].*duplicate detection/i);
  assert.match(output, /\[2\/11\].*Function metrics/i);
  assert.match(output, /\[8\/11\].*Blocked changed-files consumer/i);
  assert.match(output, /\[11\/11\].*Installed terminal note/i);
  assert.match(output, /\[info\] Installed candidate terminal message\./);
  assert.match(output, /Execution summary:/);
  assert.equal(output.includes("\u001B"), false);
}

function assertDuplicateAndTerminalMessages(value: unknown): void {
  if (!isUnknownArray(value)) throw new TypeError("isolated Run checkMessages must be an array");
  assert.equal(value.length, 5);
  assert.deepEqual(
    value.find(
      (message): message is Readonly<Record<string, unknown>> =>
        isRecord(message) &&
        message.checkId === "function-metrics" &&
        message.code === "non-blocking-findings"
    ),
    {
      checkId: "function-metrics",
      code: "non-blocking-findings",
      level: "warning",
      message:
        "1 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
    }
  );
  assert.deepEqual(
    value.find(
      (message): message is Readonly<Record<string, unknown>> =>
        isRecord(message) &&
        message.checkId === "function-metrics" &&
        message.code === "finding-detail"
    ),
    {
      checkId: "function-metrics",
      code: "finding-detail",
      level: "warning",
      message:
        "function-metrics.ts:1 workerProof: cyclomatic-complexity 2 exceeds the 1 limit (areas: worker)."
    }
  );
  assert.deepEqual(
    value.find(
      (message): message is Readonly<Record<string, unknown>> =>
        isRecord(message) &&
        message.checkId === "duplicate-detection" &&
        message.code === "non-blocking-findings"
    ),
    {
      checkId: "duplicate-detection",
      code: "non-blocking-findings",
      level: "warning",
      message:
        "1 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
    }
  );
  assert.deepEqual(
    value.find(
      (message): message is Readonly<Record<string, unknown>> =>
        isRecord(message) &&
        message.checkId === "duplicate-detection" &&
        message.code === "finding-detail"
    ),
    {
      checkId: "duplicate-detection",
      code: "finding-detail",
      level: "warning",
      message:
        "Duplicate fragment contains 80 tokens across 19 lines at duplicate-a.ts:1-19, duplicate-b.ts:1-19."
    }
  );
  assert.deepEqual(
    value.find(
      (message): message is Readonly<Record<string, unknown>> =>
        isRecord(message) && message.checkId === "installed-terminal-note"
    ),
    {
      checkId: "installed-terminal-note",
      code: "installed-terminal-note",
      level: "info",
      message: "Installed candidate terminal message."
    }
  );
}

function assertTrustedNonBlockingDuplicateRecord(value: unknown): void {
  if (!isUnknownArray(value)) throw new TypeError("isolated duplicate records must be an array");
  assert.equal(value.length, 1);
  const record = value[0];
  if (!isRecord(record)) throw new TypeError("isolated duplicate record must be an object");
  assert.equal(record.checkId, "duplicate-detection");
  assert.match(
    requiredString(record.id, "isolated duplicate record id"),
    /^duplicate-fragment\/v1\/sha256:/
  );
  if (!isRecord(record.data)) {
    throw new TypeError("isolated duplicate record data must be an object");
  }
  assert.equal(record.data.blocking, false);
  assert.equal(hasFixtureDuplicateLocations(record.data.locations), true);
}

function assertTrustedNonBlockingFunctionMetricsRecord(value: unknown): void {
  if (!isUnknownArray(value))
    throw new TypeError("isolated function-metrics records must be an array");
  assert.equal(value.length, 1);
  const record = value[0];
  if (!isRecord(record)) throw new TypeError("isolated function-metrics record must be an object");
  assert.equal(record.checkId, "function-metrics");
  if (!isRecord(record.data)) {
    throw new TypeError("isolated function-metrics record data must be an object");
  }
  assert.deepEqual(record.data, {
    blocking: false,
    codeAreas: ["worker"],
    functionName: "workerProof",
    limit: 1,
    metric: "cyclomatic-complexity",
    path: "function-metrics.ts",
    startLine: 1,
    value: 2
  });
}

function hasFixtureDuplicateLocations(value: unknown): boolean {
  if (!isUnknownArray(value) || value.length !== 2) return false;
  if (
    !value.every(
      (location): location is Readonly<{ path: string }> =>
        isRecord(location) && typeof location.path === "string"
    )
  ) {
    return false;
  }
  const paths = value.map((location) => location.path).sort();
  return paths[0] === "duplicate-a.ts" && paths[1] === "duplicate-b.ts";
}

function assertCanonicalExecutedDuration(checkDurations: unknown, checkId: string): void {
  if (!isUnknownArray(checkDurations)) {
    throw new TypeError("isolated Run checkDurations must be an array");
  }
  const duration = checkDurations.find(
    (candidate): candidate is Readonly<Record<string, unknown>> =>
      isRecord(candidate) && candidate.checkId === checkId
  );
  assert.notEqual(duration, undefined, `isolated Run duration is missing for ${checkId}`);
  if (!isRecord(duration)) throw new TypeError("isolated Run duration must be an object");
  assert.equal(duration.checkId, checkId);
  if (typeof duration.durationMs !== "number") {
    throw new TypeError("isolated Run durationMs must be a number");
  }
  assert.equal(Number.isFinite(duration.durationMs), true);
  assert.equal(duration.durationMs >= 0, true);
}

function assertUnavailableDependencyDuration(checkDurations: unknown, checkId: string): void {
  if (!isUnknownArray(checkDurations)) {
    throw new TypeError("isolated Run checkDurations must be an array");
  }
  const duration = checkDurations.find(
    (candidate): candidate is Readonly<Record<string, unknown>> =>
      isRecord(candidate) && candidate.checkId === checkId
  );
  assert.deepEqual(duration, { checkId, durationMs: null });
}

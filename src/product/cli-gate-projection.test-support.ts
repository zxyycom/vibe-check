import { strict as assert } from "node:assert";

import type {
  CommandResult,
  FormalEntryArtifacts,
  MachinePublicationV2
} from "./cli-gate-acceptance.test-support.ts";

type GatePolicy = "all" | "changed" | "regressions";

interface EvaluatedGateExpectation {
  readonly artifacts: FormalEntryArtifacts;
  readonly expectedExit: 0 | 1;
  readonly policy: GatePolicy;
  readonly result: CommandResult;
  readonly status: "passed" | "failed";
}

export function assertEvaluatedGateProjection(
  options: EvaluatedGateExpectation
): void {
  const { artifacts } = options;
  const gate = artifacts.machine.run.decision.gate;
  assert.ok(gate.status === "passed" || gate.status === "failed");
  const blockingRecords = recordsById(
    artifacts.machine,
    gate.blockingRecordIds
  );
  assertGateMachine(options);
  assertGateStdout({
    policy: options.policy,
    recordCount: blockingRecords.length,
    status: options.status,
    stdout: options.result.stdout
  });
  assertGateReport({
    policy: options.policy,
    report: artifacts.report,
    status: options.status
  });
  assertBlockingGateReport({
    blockingRecords,
    report: artifacts.report,
    status: options.status
  });
}

export function assertExactLine(output: string, expectedLine: string): void {
  assert.ok(
    output.split(/\r?\n/).includes(expectedLine),
    `missing exact output line: ${expectedLine}`
  );
}

function assertGateMachine(options: EvaluatedGateExpectation): void {
  const { artifacts, expectedExit, policy, result, status } = options;
  assert.equal(result.status, expectedExit);
  assert.equal(result.stderr, "");
  const gate = artifacts.machine.run.decision.gate;
  assert.equal(gate.status, status);
  assert.equal(gate.policyId, policy);
  assert.ok(gate.status === "passed" || gate.status === "failed");
  assert.deepEqual(
    gate.blockingRecordIds,
    artifacts.machine.run.decision.blockWhen?.blockingRecordIds
  );
}

function assertGateStdout(options: {
  policy: GatePolicy;
  stdout: string;
  recordCount: number;
  status: "passed" | "failed";
}): void {
  const { policy, stdout, recordCount, status } = options;
  const icon = status === "passed" ? "✅" : "❌";
  assertExactLine(stdout, `${icon} Quality gate ${status}.`);
  assertExactLine(stdout, `  Policy: ${policy}`);
  assertExactLine(stdout, `  Status: ${status}`);
  assertExactLine(stdout, `  Blocking records: ${recordCount}`);
}

function assertGateReport(options: {
  report: string;
  policy: GatePolicy;
  status: "passed" | "failed";
}): void {
  const { report, policy, status } = options;
  assertExactLine(report, `- **Gate status**: ${status}`);
  assertExactLine(report, `- **Policy**: ${policy}`);
}

function assertBlockingGateReport(options: {
  report: string;
  blockingRecords: readonly MachinePublicationV2["records"][number][];
  status: "passed" | "failed";
}): void {
  const { report, blockingRecords, status } = options;
  if (status === "failed") {
    for (const record of blockingRecords) {
      assert.ok(report.includes(record.message));
    }
  }
}

function recordsById(
  machine: MachinePublicationV2,
  recordIds: readonly string[]
): MachinePublicationV2["records"][number][] {
  const byId = new Map(machine.records.map((record) => [record.recordId, record]));
  return recordIds.map((recordId) => {
    const record = byId.get(recordId);
    assert.ok(record, `missing blocking record ${recordId}`);
    return record;
  });
}

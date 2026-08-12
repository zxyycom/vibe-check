import { strict as assert } from "node:assert";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import {
  assertCommandSucceeded,
  configuredScannerEnvironment,
  configuredScanArgs,
  configureRaisedWarningFloors,
  createConfiguredProjectFixture,
  findCheckRun,
  readMachinePublication,
  runProductCli,
  writeControlledLizard
} from "./configured-project-test-support.ts";

export function assertZeroFindingQuickScan(): void {
  const fixture = createConfiguredProjectFixture("vibe-check-zero-findings-");

  try {
    const lizardCommand = writeControlledLizard(fixture.projectRoot, "zero");
    configureRaisedWarningFloors(fixture);
    const result = runProductCli(
      configuredScanArgs(fixture.projectRoot, "quick"),
      {
        ...configuredScannerEnvironment(fixture.projectRoot),
        VIBE_CHECK_JSCPD_CMD: join(fixture.projectRoot, "tools", "missing-jscpd"),
        VIBE_CHECK_LIZARD_CMD: lizardCommand
      }
    );

    assertCommandSucceeded(result, "successful zero-finding quick scan");
    assert.equal(result.stderr, "");
    const machine = readMachinePublication(fixture.artifactDir);
    const functionRun = findCheckRun(machine, "function-metrics");
    const duplicateRun = findCheckRun(machine, "duplicate-detection");
    assert.deepEqual(functionRun?.result, { verdict: "passed" });
    assert.equal(duplicateRun?.status, "skipped");
    assert.equal(machine.run.completeness.status, "complete");
    assert.deepEqual(machine.records, []);
    assert.match(result.stdout, /Snapshot completeness: complete/);
    assert.match(result.stdout, /Quality check status: passed/);
    assert.doesNotMatch(result.stdout, /Snapshot completeness: incomplete/);
    assert.doesNotMatch(result.stdout, /jscpd validation failed/);

    const report = readFileSync(join(fixture.artifactDir, "report.md"), "utf8");
    assert.match(report, /Snapshot completeness\*\*: complete/);
    assert.match(report, /function-metrics`: completed \/ passed/);
    assert.match(report, /duplicate-detection`: skipped/);
  } finally {
    rmSync(fixture.tempRoot, { force: true, recursive: true });
  }
}

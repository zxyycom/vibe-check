import { strict as assert } from "node:assert";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import {
  configuredScannerEnvironment,
  configuredScanArgs,
  configureRaisedWarningFloors,
  createConfiguredProjectFixture,
  findCheckRun,
  readMachinePublication,
  runProductCli,
  summarizeCheckStatus
} from "./configured-project-test-support.ts";

export function assertUnavailableMeasurementComponent(): void {
  const fixture = createConfiguredProjectFixture("vibe-check-unavailable-component-");

  try {
    configureRaisedWarningFloors(fixture);
    const result = runProductCli(
      configuredScanArgs(fixture.projectRoot, "quick"),
      {
        ...configuredScannerEnvironment(fixture.projectRoot),
        VIBE_CHECK_SCC_ARGS: "[]",
        VIBE_CHECK_SCC_CMD: join(fixture.projectRoot, "tools", "missing-scc")
      }
    );

    assert.equal(result.status, 2, failureMessage(result));
    assert.doesNotMatch(result.stdout, /✅ Quality scan complete\./);
    const machine = readMachinePublication(fixture.artifactDir);
    assert.equal(machine.run.completeness.status, "incomplete");
    assert.deepEqual(machine.run.runs.map(summarizeCheckStatus), [
      ["duplicate-detection", "skipped"],
      ["file-metrics", "failed"],
      ["function-metrics", "completed"]
    ]);
    const fileRun = findCheckRun(machine, "file-metrics");
    assert.equal(fileRun?.diagnostic?.category, "unavailable");
    assert.match(result.stdout, /Snapshot completeness: incomplete/);
    assert.equal(result.stderr, "");

    const report = readFileSync(join(fixture.artifactDir, "report.md"), "utf8");
    assert.match(report, /Snapshot completeness\*\*: incomplete/);
    assert.match(report, /file-metrics`: failed/);
  } finally {
    rmSync(fixture.tempRoot, { force: true, recursive: true });
  }
}

function failureMessage(result: {
  readonly stderr: string;
  readonly stdout: string;
}): string {
  return `unavailable component did not fail closed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
}

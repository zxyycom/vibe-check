import { strict as assert } from "node:assert";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import {
  assertCommandSucceeded,
  configuredScanArgs,
  configureNoEligibleInput,
  createConfiguredProjectFixture,
  readMachinePublication,
  runProductCli,
  summarizeCheckRun
} from "./configured-project-test-support.ts";

export function assertAllChecksNotApplicable(): void {
  const fixture = createConfiguredProjectFixture("vibe-check-empty-scan-");

  try {
    configureNoEligibleInput(fixture);
    const result = runProductCli(
      configuredScanArgs(fixture.projectRoot, "full"),
      {
        VIBE_CHECK_JSCPD_ARGS: "[]",
        VIBE_CHECK_JSCPD_CMD: join(fixture.projectRoot, "tools", "missing-jscpd"),
        VIBE_CHECK_LIZARD_CMD: join(fixture.projectRoot, "tools", "missing-lizard"),
        VIBE_CHECK_SCC_ARGS: "[]",
        VIBE_CHECK_SCC_CMD: join(fixture.projectRoot, "tools", "missing-scc")
      }
    );

    assertCommandSucceeded(result, "legitimate empty scan");
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /Snapshot completeness: complete/);
    assert.match(result.stdout, /Records: 0/);
    assert.doesNotMatch(result.stdout, /Quality check status: passed/);
    assert.doesNotMatch(result.stdout, /✅ Quality scan complete\./);
    const machine = readMachinePublication(fixture.artifactDir);
    assert.equal(machine.run.completeness.status, "complete");
    assert.deepEqual(machine.records, []);
    assert.deepEqual(machine.run.runs.map(summarizeCheckRun), [
      ["duplicate-detection", "completed", "not-applicable"],
      ["file-metrics", "completed", "not-applicable"],
      ["function-metrics", "completed", "not-applicable"]
    ]);

    const report = readFileSync(join(fixture.artifactDir, "report.md"), "utf8");
    assert.match(report, /Snapshot completeness\*\*: complete/);
    assert.match(report, /file-metrics`: completed \/ not-applicable/);
    assert.match(report, /function-metrics`: completed \/ not-applicable/);
    assert.match(report, /duplicate-detection`: completed \/ not-applicable/);
    assert.match(report, /## Unaccepted records\n\nNone\./);
  } finally {
    rmSync(fixture.tempRoot, { force: true, recursive: true });
  }
}

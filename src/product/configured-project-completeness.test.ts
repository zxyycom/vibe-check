import { strict as assert } from "node:assert";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  configuredScannerEnvironment,
  configuredScanArgs,
  configureNoEligibleInput,
  configureRaisedWarningFloors,
  createConfiguredProjectFixture,
  findCheckRun,
  readMachinePublication,
  runProductCli,
  writeControlledLizard,
  writeOperationalMarker
} from "./configured-project-test-support.ts";
import {
  assertAllChecksNotApplicable
} from "./configured-project-empty-scan.test-support.ts";
import {
  assertUnavailableMeasurementComponent
} from "./configured-project-unavailable.test-support.ts";
import {
  assertZeroFindingQuickScan
} from "./configured-project-zero-scan.test-support.ts";

describe("formal CLI configured scan completeness", () => {
  it("rejects malformed operational input before an empty scan starts", { timeout: 30_000 }, () => {
    const fixture = createConfiguredProjectFixture("vibe-check-empty-preflight-");
    const markerPath = join(fixture.projectRoot, "scanner-started");
    const markerScannerPath = writeOperationalMarker(
      fixture.projectRoot,
      markerPath
    );

    try {
      configureNoEligibleInput(fixture);
      const result = runProductCli(
        configuredScanArgs(fixture.projectRoot, "full"),
        {
          ...configuredScannerEnvironment(fixture.projectRoot),
          VIBE_CHECK_JSCPD_ARGS: JSON.stringify([markerScannerPath]),
          VIBE_CHECK_JSCPD_CMD: process.execPath,
          VIBE_CHECK_SCC_ARGS: "not-json-private-value"
        }
      );

      assert.equal(result.status, 2);
      assert.equal(result.stdout, `Config: explicit ${fixture.configPath}\n`);
      assert.match(result.stderr, /VIBE_CHECK_SCC_ARGS/);
      assert.match(result.stderr, /must be a JSON array of strings/);
      assert.match(result.stderr, /provide a valid array or unset/);
      assert.doesNotMatch(result.stderr, /not-json-private-value/);
      assert.equal(existsSync(markerPath), false);
      assert.equal(existsSync(join(fixture.projectRoot, ".cache/configured-scan")), false);
      assert.equal(existsSync(fixture.artifactDir), false);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });
});

describe("formal CLI configured scan completeness", () => {
  it("returns a warning when all selected Checks are not applicable", { timeout: 30_000 }, () => assertAllChecksNotApplicable());
});

describe("formal CLI configured scan completeness", () => {
  it("treats a successful zero-finding quick scan as complete without resolving jscpd", { timeout: 30_000 }, () => assertZeroFindingQuickScan());
});

describe("formal CLI configured scan completeness", () => {
  it("projects Lizard execution and invalid-result failures consistently", { timeout: 30_000 }, () => {
    const variants = [
      { diagnosticKind: "execution-failed", mode: "execution" },
      { diagnosticKind: "invalid-result", mode: "invalid" }
    ] as const;

    for (const variant of variants) assertLizardFailureVariant(variant);
  });
});

describe("formal CLI configured scan completeness", () => {
  it("fails closed when an eligible current measurement component is unavailable", { timeout: 30_000 }, () => assertUnavailableMeasurementComponent());
});

function assertLizardFailureVariant(variant: {
  readonly diagnosticKind: "execution-failed" | "invalid-result";
  readonly mode: "execution" | "invalid";
}): void {
  const fixture = createConfiguredProjectFixture(`vibe-check-lizard-${variant.mode}-`);

  try {
    const lizardCommand = writeControlledLizard(fixture.projectRoot, variant.mode);
    configureRaisedWarningFloors(fixture);
    const result = runProductCli(
      configuredScanArgs(fixture.projectRoot, "quick"),
      {
        ...configuredScannerEnvironment(fixture.projectRoot),
        VIBE_CHECK_LIZARD_CMD: lizardCommand
      }
    );

    assert.equal(result.status, 2, failureMessage(`${variant.mode} Lizard`, result));
    const machine = readMachinePublication(fixture.artifactDir);
    const functionRun = findCheckRun(machine, "function-metrics");
    assert.equal(functionRun?.status, "failed");
    assert.equal(functionRun?.diagnostic?.category, variant.diagnosticKind);
    assert.equal(machine.run.completeness.status, "incomplete");
    assert.match(result.stdout, /Snapshot completeness: incomplete/);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stdout, /Quality check status: passed/);
    assert.doesNotMatch(result.stdout, /✅ Quality scan complete\./);

    const report = readFileSync(join(fixture.artifactDir, "report.md"), "utf8");
    assert.match(report, /Snapshot completeness\*\*: incomplete/);
    assert.match(report, /function-metrics`: failed/);
  } finally {
    rmSync(fixture.tempRoot, { force: true, recursive: true });
  }
}

function failureMessage(
  label: string,
  result: { readonly stderr: string; readonly stdout: string }
): string {
  return `${label} did not fail closed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
}

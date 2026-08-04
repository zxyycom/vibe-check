import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  type GatePolicy
} from "./quality-core/src/index.ts";
import {
  createFixtureProject,
  readFixtureConfig,
  readFormalEntryArtifacts,
  runFormalGateScan,
  setFixtureCacheDir,
  setFixtureWarningPolicy,
  writeFixtureConfig,
  type CommandResult,
  type FormalEntryArtifacts
} from "./cli-gate-acceptance.test-support.ts";
import { type MachineWarningV1 } from "./machine-output.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");

describe("formal CLI quality gate acceptance", () => {
  it("passes a zero-warning quick all gate while preserving skipped capability evidence", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject(fixtureRoot, "quick-all-zero");

    try {
      const config = readFixtureConfig(fixture.projectRoot);
      raiseWarningFloors(config);
      writeFixtureConfig(fixture.projectRoot, config);
      const artifactDir = join(fixture.projectRoot, "artifacts", "quick-all-zero");
      const result = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile",
        "quick",
        "--gate",
        "all",
        "--artifact-dir",
        "artifacts/quick-all-zero"
      ]);
      const artifacts = readFormalEntryArtifacts(artifactDir);

      assert.equal(artifacts.metrics.scanCompleteness.overall, "complete");
      assert.deepEqual(artifacts.metrics.warnings, {
        all: [],
        changed: [],
        regressions: []
      });
      assert.deepEqual(
        artifacts.metrics.scanCompleteness.capabilities.find(
          ({ capabilityId }) => capabilityId === "duplicate-detection"
        ),
        { capabilityId: "duplicate-detection", status: "skipped" }
      );
      assertEvaluatedGateProjection({
        artifacts,
        evaluatedChannel: "all",
        expectedExit: 0,
        policy: "all",
        result,
        scanProfile: "quick",
        status: "passed"
      });
      assertExactLine(
        result.stdout,
        "    duplicate-detection: skipped"
      );
      assertExactLine(
        artifacts.report,
        "- **duplicate-detection**: `skipped` (profile skipped)"
      );
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("fails an all gate for an all-only warning channel", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject(fixtureRoot, "all-only");

    try {
      const artifactDir = join(fixture.projectRoot, "artifacts", "all-only");
      const result = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile",
        "quick",
        "--gate",
        "all",
        "--artifact-dir",
        "artifacts/all-only"
      ]);
      const artifacts = readFormalEntryArtifacts(artifactDir);

      assert.equal(artifacts.metrics.scanCompleteness.overall, "complete");
      assert.ok(artifacts.metrics.warnings.all.length > 0);
      assert.deepEqual(artifacts.metrics.warnings.changed, []);
      assert.deepEqual(artifacts.metrics.warnings.regressions, []);
      assertEvaluatedGateProjection({
        artifacts,
        evaluatedChannel: "all",
        expectedExit: 1,
        policy: "all",
        result,
        scanProfile: "quick",
        status: "failed"
      });
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("distinguishes input-unchanged, changed non-regression, and regression evidence", { timeout: 60_000 }, () => {
    const fixture = createFixtureProject(fixtureRoot, "comparison");

    try {
      initializeRepository(fixture.projectRoot);
      commitAll(fixture.projectRoot, "baseline fixture");
      const baselineSha = git(fixture.projectRoot, ["rev-parse", "HEAD"]);
      git(fixture.projectRoot, ["branch", "baseline-ref", baselineSha]);

      setFixtureCacheDir(fixture.projectRoot, ".cache/input-unchanged");
      const inputUnchangedArtifactDir = join(
        fixture.projectRoot,
        "artifacts",
        "input-unchanged"
      );
      const inputUnchanged = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile",
        "full",
        "--gate",
        "regressions",
        "--baseline",
        "baseline-ref",
        "--artifact-dir",
        "artifacts/input-unchanged"
      ]);
      assert.equal(
        inputUnchanged.status,
        0,
        `stdout:\n${inputUnchanged.stdout}\nstderr:\n${inputUnchanged.stderr}`
      );
      const inputUnchangedArtifacts = readFormalEntryArtifacts(
        inputUnchangedArtifactDir
      );

      assert.equal(
        inputUnchangedArtifacts.metrics.comparisonStatus,
        "input-unchanged"
      );
      assert.equal(inputUnchangedArtifacts.metrics.baseline.commitSha, baselineSha);
      assert.equal(
        inputUnchangedArtifacts.metrics.baseline.metadata?.commitSha,
        baselineSha
      );
      assert.deepEqual(inputUnchangedArtifacts.metrics.warnings.regressions, []);
      assertEvaluatedGateProjection({
        artifacts: inputUnchangedArtifacts,
        evaluatedChannel: "regressions",
        expectedExit: 0,
        policy: "regressions",
        result: inputUnchanged,
        scanProfile: "full",
        status: "passed"
      });

      appendFixtureSource(
        fixture.projectRoot,
        "export const changedWithoutMetricDelta = true;"
      );
      commitPaths(
        fixture.projectRoot,
        ["src/eligible.ts"],
        "change input without changing controlled metrics"
      );
      setFixtureCacheDir(fixture.projectRoot, ".cache/changed-non-regression");
      setFixtureWarningPolicy(fixture.projectRoot, "watchlist-only");
      const changedArtifactDir = join(
        fixture.projectRoot,
        "artifacts",
        "changed-non-regression"
      );
      const changed = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile",
        "full",
        "--gate",
        "changed",
        "--baseline",
        "baseline-ref",
        "--artifact-dir",
        "artifacts/changed-non-regression"
      ]);
      const changedArtifacts = readFormalEntryArtifacts(changedArtifactDir);

      assert.equal(changedArtifacts.metrics.comparisonStatus, "compared");
      assert.ok(changedArtifacts.metrics.warnings.changed.length > 0);
      assert.deepEqual(changedArtifacts.metrics.warnings.regressions, []);
      assertEvaluatedGateProjection({
        artifacts: changedArtifacts,
        evaluatedChannel: "changed",
        expectedExit: 1,
        policy: "changed",
        result: changed,
        scanProfile: "full",
        status: "failed"
      });

      appendFixtureSource(
        fixture.projectRoot,
        "export const changedWithMetricRegression = true;"
      );
      increaseControlledMetrics(fixture.projectRoot);
      commitPaths(
        fixture.projectRoot,
        ["src/eligible.ts", "tools/controlled-scanner.ts"],
        "increase controlled metrics"
      );
      setFixtureCacheDir(fixture.projectRoot, ".cache/regression");
      const regressionArtifactDir = join(
        fixture.projectRoot,
        "artifacts",
        "regression"
      );
      const regression = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile",
        "full",
        "--gate",
        "regressions",
        "--baseline",
        "baseline-ref",
        "--artifact-dir",
        "artifacts/regression"
      ]);
      const regressionArtifacts = readFormalEntryArtifacts(
        regressionArtifactDir
      );

      assert.equal(regressionArtifacts.metrics.comparisonStatus, "compared");
      assert.ok(regressionArtifacts.metrics.warnings.regressions.length > 0);
      assertEvaluatedGateProjection({
        artifacts: regressionArtifacts,
        evaluatedChannel: "regressions",
        expectedExit: 1,
        policy: "regressions",
        result: regression,
        scanProfile: "full",
        status: "failed"
      });
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("rejects a comparison gate without an explicit baseline before scan work", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject(fixtureRoot, "comparison-unavailable");

    try {
      const artifactDir = join(
        fixture.projectRoot,
        "artifacts",
        "comparison-unavailable"
      );
      const result = runFormalGateScan(repoRoot, fixture.projectRoot, [
        "--profile",
        "full",
        "--gate",
        "regressions",
        "--artifact-dir",
        "artifacts/comparison-unavailable"
      ]);
      assert.equal(result.status, 3);
      assert.equal(result.stdout, "");
      assert.match(
        result.stderr,
        /Fatal error in quality scan: .*--gate regressions.*--baseline <revision>/i
      );
      assert.equal(existsSync(artifactDir), false);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });
});

function assertEvaluatedGateProjection(
  options: {
    artifacts: FormalEntryArtifacts;
    evaluatedChannel: "all" | "changed" | "regressions";
    expectedExit: 0 | 1;
    policy: GatePolicy;
    result: CommandResult;
    scanProfile: "quick" | "full";
    status: "passed" | "failed";
  }
): void {
  const {
    artifacts,
    evaluatedChannel,
    expectedExit,
    policy,
    result,
    scanProfile,
    status
  } = options;
  const selectedWarnings = artifacts.metrics.warnings[evaluatedChannel];
  assertGateMetrics({ artifacts, evaluatedChannel, expectedExit, policy, result, selectedWarnings, status });
  assertGateStdout({ evaluatedChannel, policy, stdout: result.stdout, scanProfile, warningCount: selectedWarnings.length, status });
  assertGateReport({ report: artifacts.report, evaluatedChannel, policy, warningCount: selectedWarnings.length, status });
  assertBlockingGateReport({ report: artifacts.report, selectedWarnings, status });
}

function assertGateMetrics(options: {
  artifacts: FormalEntryArtifacts;
  evaluatedChannel: "all" | "changed" | "regressions";
  expectedExit: 0 | 1;
  policy: GatePolicy;
  result: CommandResult;
  selectedWarnings: readonly MachineWarningV1[];
  status: "passed" | "failed";
}): void {
  const { artifacts, evaluatedChannel, expectedExit, policy, result, selectedWarnings, status } = options;
  assert.equal(result.status, expectedExit);
  assert.equal(result.stderr, "");
  assert.deepEqual(artifacts.metrics.gate, {
    blockingWarningCount: selectedWarnings.length,
    blockingWarnings: selectedWarnings,
    evaluatedChannel,
    evaluatedWarningCount: selectedWarnings.length,
    policy,
    status
  });
}

function assertGateStdout(options: {
  evaluatedChannel: "all" | "changed" | "regressions";
  policy: GatePolicy;
  stdout: string;
  scanProfile: "quick" | "full";
  warningCount: number;
  status: "passed" | "failed";
}): void {
  const { evaluatedChannel, policy, stdout, scanProfile, warningCount, status } = options;
  const profileQualifier = policy === "all"
    ? ` for the resolved ${scanProfile} profile`
    : "";
  const icon = status === "passed" ? "✅" : "❌";
  assertExactLine(
    stdout,
    `${icon} Quality gate ${status}${profileQualifier}.`
  );
  assertExactLine(stdout, `  Policy: ${policy}`);
  assertExactLine(stdout, `  Status: ${status}`);
  assertExactLine(stdout, `  Evaluated channel: ${evaluatedChannel}`);
  assertExactLine(
    stdout,
    `  Evaluated warnings: ${warningCount}`
  );
  assertExactLine(
    stdout,
    `  Blocking warnings: ${warningCount}`
  );
}

function assertGateReport(options: {
  report: string;
  evaluatedChannel: "all" | "changed" | "regressions";
  policy: GatePolicy;
  warningCount: number;
  status: "passed" | "failed";
}): void {
  const { report, evaluatedChannel, policy, warningCount, status } = options;
  assertExactLine(report, "## Quality Gate");
  assertExactLine(report, `- **Policy**: \`${policy}\``);
  assertExactLine(report, `- **Status**: \`${status}\``);
  assertExactLine(
    report,
    `- **Evaluated channel**: \`${evaluatedChannel}\``
  );
  assertExactLine(
    report,
    `- **Evaluated warnings**: ${warningCount}`
  );
  assertExactLine(
    report,
    `- **Blocking warnings**: ${warningCount}`
  );
}

function assertBlockingGateReport(options: {
  report: string;
  selectedWarnings: readonly MachineWarningV1[];
  status: "passed" | "failed";
}): void {
  const { report, selectedWarnings, status } = options;
  if (status === "failed") {
    assertExactLine(report, "### Blocking warnings");
    for (const warning of selectedWarnings) {
      assertExactLine(
        report,
        `- **[${warning.sourceTool}] ${warning.metric}**: ${warning.message}`
      );
    }
  }
}

function assertExactLine(output: string, expectedLine: string): void {
  assert.ok(
    output.split(/\r?\n/).includes(expectedLine),
    `missing exact output line: ${expectedLine}`
  );
}

function initializeRepository(repository: string): void {
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "quality-test@example.invalid"]);
  git(repository, ["config", "user.name", "Quality Test"]);
}

function commitAll(repository: string, message: string): void {
  git(repository, ["add", "."]);
  git(repository, ["commit", "--quiet", "-m", message]);
}

function commitPaths(
  repository: string,
  paths: readonly string[],
  message: string
): void {
  git(repository, ["add", ...paths]);
  git(repository, ["commit", "--quiet", "-m", message]);
}

function git(repository: string, args: readonly string[]): string {
  const result = spawnSync("git", args, {
    cwd: repository,
    encoding: "utf8"
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
  return result.stdout.trim();
}

function appendFixtureSource(projectRoot: string, line: string): void {
  const path = join(projectRoot, "src", "eligible.ts");
  const source = readFileSync(path, "utf8");
  writeFileSync(path, `${source.trimEnd()}\n${line}\n`, "utf8");
}

function increaseControlledMetrics(projectRoot: string): void {
  const path = join(projectRoot, "tools", "controlled-scanner.ts");
  const source = readFileSync(path, "utf8");
  const updated = source
    .replace(
      "eligible.ts,12,10,1,1,6,200,10",
      "eligible.ts,24,20,1,3,12,400,20"
    )
    .replace(
      "12,4,30,1,12,fixture",
      "24,8,60,1,24,fixture"
    );
  assert.notEqual(updated, source);
  writeFileSync(path, updated, "utf8");
}

function raiseWarningFloors(config: Record<string, unknown>): void {
  const checks = config.checks as {
    files: {
      codeLines: {
        absoluteFloor: number;
        lowDecisionTokenAllowance: { codeLineFloor: number };
      };
    };
    functions: {
      codeLines: {
        absoluteFloor: number;
        lowComplexityAllowance: { codeLineFloor: number };
      };
      cyclomaticComplexity: { absoluteFloor: number };
      parameterCount: { absoluteFloor: number };
    };
  };

  checks.functions.cyclomaticComplexity.absoluteFloor = 10_000;
  checks.functions.codeLines.absoluteFloor = 10_000;
  checks.functions.codeLines.lowComplexityAllowance.codeLineFloor = 10_000;
  checks.functions.parameterCount.absoluteFloor = 10_000;
  checks.files.codeLines.absoluteFloor = 10_000;
  checks.files.codeLines.lowDecisionTokenAllowance.codeLineFloor = 10_000;
}

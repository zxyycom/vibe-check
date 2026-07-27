import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  validateMetrics,
  type GatePolicy,
  type QualityMetrics
} from "./quality-core/src/index.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");

describe("formal CLI quality gate acceptance", () => {
  it("passes a zero-warning quick all gate while preserving skipped capability evidence", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("quick-all-zero");

    try {
      const config = readFixtureConfig(fixture.projectRoot);
      raiseWarningFloors(config);
      writeFixtureConfig(fixture.projectRoot, config);
      const artifactDir = join(fixture.projectRoot, "artifacts", "quick-all-zero");
      const result = runFormalGateScan(fixture.projectRoot, [
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
    const fixture = createFixtureProject("all-only");

    try {
      const artifactDir = join(fixture.projectRoot, "artifacts", "all-only");
      const result = runFormalGateScan(fixture.projectRoot, [
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
    const fixture = createFixtureProject("comparison");

    try {
      initializeRepository(fixture.projectRoot);
      commitAll(fixture.projectRoot, "baseline fixture");
      const baselineSha = git(fixture.projectRoot, ["rev-parse", "HEAD"]);

      setFixtureCacheDir(fixture.projectRoot, ".cache/input-unchanged");
      const inputUnchangedArtifactDir = join(
        fixture.projectRoot,
        "artifacts",
        "input-unchanged"
      );
      const inputUnchanged = runFormalGateScan(fixture.projectRoot, [
        "--profile",
        "full",
        "--gate",
        "regressions",
        "--baseline",
        baselineSha,
        "--artifact-dir",
        "artifacts/input-unchanged"
      ]);
      const inputUnchangedArtifacts = readFormalEntryArtifacts(
        inputUnchangedArtifactDir
      );

      assert.equal(
        inputUnchangedArtifacts.metrics.comparisonStatus,
        "input-unchanged"
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
      const changed = runFormalGateScan(fixture.projectRoot, [
        "--profile",
        "full",
        "--gate",
        "changed",
        "--baseline",
        baselineSha,
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
      const regression = runFormalGateScan(fixture.projectRoot, [
        "--profile",
        "full",
        "--gate",
        "regressions",
        "--baseline",
        baselineSha,
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

  it("fails closed when a comparison gate has no baseline evidence", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("comparison-unavailable");

    try {
      const artifactDir = join(
        fixture.projectRoot,
        "artifacts",
        "comparison-unavailable"
      );
      const result = runFormalGateScan(fixture.projectRoot, [
        "--profile",
        "full",
        "--gate",
        "regressions",
        "--artifact-dir",
        "artifacts/comparison-unavailable"
      ]);
      const artifacts = readFormalEntryArtifacts(artifactDir);

      assert.equal(result.status, 2);
      assert.equal(artifacts.metrics.scanCompleteness.overall, "complete");
      assert.equal(artifacts.metrics.comparisonStatus, "baseline-unavailable");
      assert.deepEqual(artifacts.metrics.gate, {
        policy: "regressions",
        reasonCode: "comparison-unavailable",
        status: "not-evaluated"
      });
      assertExactLine(
        result.stderr,
        "❌ Quality gate was not evaluated."
      );
      assertExactLine(result.stderr, "  Policy: regressions");
      assertExactLine(result.stderr, "  Status: not-evaluated");
      assertExactLine(result.stderr, "  Reason code: comparison-unavailable");
      assertExactLine(
        result.stderr,
        `  Action: Resolve baseline status ${artifacts.metrics.baseline.status} so comparison evidence is available, then retry.`
      );
      assertNoEvaluatedGateCompletion(result.stdout);
      assertExactLine(artifacts.report, "## Quality Gate");
      assertExactLine(artifacts.report, "- **Policy**: `regressions`");
      assertExactLine(artifacts.report, "- **Status**: `not-evaluated`");
      assertExactLine(
        artifacts.report,
        "- **Reason code**: `comparison-unavailable`"
      );
      assertExactLine(
        artifacts.report,
        `- **Action**: Make baseline evidence available (current baseline status: \`${artifacts.metrics.baseline.status}\`) and rerun the gate.`
      );
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });
});

interface CommandResult {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

interface FixtureProject {
  readonly projectRoot: string;
  readonly tempRoot: string;
}

interface FormalEntryArtifacts {
  readonly metrics: QualityMetrics;
  readonly report: string;
  readonly warnings: readonly unknown[];
  readonly warningsAll: readonly unknown[];
}

function createFixtureProject(label: string): FixtureProject {
  const tempRoot = mkdtempSync(join(tmpdir(), `vibe-check-gate-${label}-`));
  const projectRoot = join(tempRoot, "configured-project");
  cpSync(fixtureRoot, projectRoot, { recursive: true });
  return { projectRoot, tempRoot };
}

function readFixtureConfig(projectRoot: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(projectRoot, "vibe-check.config.json"), "utf8")
  ) as Record<string, unknown>;
}

function writeFixtureConfig(
  projectRoot: string,
  config: Record<string, unknown>
): void {
  writeFileSync(
    join(projectRoot, "vibe-check.config.json"),
    JSON.stringify(config),
    "utf8"
  );
}

function setFixtureCacheDir(projectRoot: string, cacheDir: string): void {
  const config = readFixtureConfig(projectRoot);
  config.cacheDir = cacheDir;
  writeFixtureConfig(projectRoot, config);
}

function setFixtureWarningPolicy(
  projectRoot: string,
  warningPolicy: string
): void {
  const config = readFixtureConfig(projectRoot);
  const codeAreas = config.codeAreas as Record<
    string,
    { warningPolicy: string }
  >;
  codeAreas["fixture-app"]!.warningPolicy = warningPolicy;
  writeFixtureConfig(projectRoot, config);
}

function runFormalGateScan(
  projectRoot: string,
  args: readonly string[]
): CommandResult {
  assert.equal(args.includes("--gate"), true);
  const result = spawnSync(
    process.execPath,
    [
      "run",
      "--silent",
      "product:cli",
      "--",
      "scan",
      projectRoot,
      "--config",
      "vibe-check.config.json",
      ...args
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        VIBE_CHECK_QUALITY_TIMINGS: "0"
      }
    }
  );

  assert.equal(result.error, undefined);
  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout
  };
}

function readFormalEntryArtifacts(artifactDir: string): FormalEntryArtifacts {
  const metricsInput = JSON.parse(
    readFileSync(join(artifactDir, "metrics.json"), "utf8")
  ) as unknown;
  const validation = validateMetrics(metricsInput);
  assert.deepEqual(validation, { errors: [], valid: true });
  const metrics = metricsInput as QualityMetrics;
  const report = readFileSync(join(artifactDir, "report.md"), "utf8");
  const warnings = readNdjson(join(artifactDir, "warnings.ndjson"));
  const warningsAll = readNdjson(join(artifactDir, "warnings-all.ndjson"));

  assert.deepEqual(warnings, metrics.warnings.changed);
  assert.deepEqual(warningsAll, metrics.warnings.all);
  assert.equal(existsSync(join(artifactDir, "raw")), true);

  return { metrics, report, warnings, warningsAll };
}

function assertEvaluatedGateProjection({
  artifacts,
  evaluatedChannel,
  expectedExit,
  policy,
  result,
  scanProfile,
  status
}: {
  artifacts: FormalEntryArtifacts;
  evaluatedChannel: "all" | "changed" | "regressions";
  expectedExit: 0 | 1;
  policy: GatePolicy;
  result: CommandResult;
  scanProfile: "quick" | "full";
  status: "passed" | "failed";
}): void {
  const selectedWarnings = artifacts.metrics.warnings[evaluatedChannel];
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

  const profileQualifier = policy === "all"
    ? ` for the resolved ${scanProfile} profile`
    : "";
  const icon = status === "passed" ? "✅" : "❌";
  assertExactLine(
    result.stdout,
    `${icon} Quality gate ${status}${profileQualifier}.`
  );
  assertExactLine(result.stdout, `  Policy: ${policy}`);
  assertExactLine(result.stdout, `  Status: ${status}`);
  assertExactLine(result.stdout, `  Evaluated channel: ${evaluatedChannel}`);
  assertExactLine(
    result.stdout,
    `  Evaluated warnings: ${selectedWarnings.length}`
  );
  assertExactLine(
    result.stdout,
    `  Blocking warnings: ${selectedWarnings.length}`
  );

  assertExactLine(artifacts.report, "## Quality Gate");
  assertExactLine(artifacts.report, `- **Policy**: \`${policy}\``);
  assertExactLine(artifacts.report, `- **Status**: \`${status}\``);
  assertExactLine(
    artifacts.report,
    `- **Evaluated channel**: \`${evaluatedChannel}\``
  );
  assertExactLine(
    artifacts.report,
    `- **Evaluated warnings**: ${selectedWarnings.length}`
  );
  assertExactLine(
    artifacts.report,
    `- **Blocking warnings**: ${selectedWarnings.length}`
  );

  if (status === "failed") {
    assertExactLine(artifacts.report, "### Blocking warnings");
    for (const warning of selectedWarnings) {
      assertExactLine(
        artifacts.report,
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

function assertNoEvaluatedGateCompletion(stdout: string): void {
  const evaluatedGateLines = stdout.split(/\r?\n/).filter(
    (line) =>
      line.startsWith("✅ Quality gate") ||
      line.startsWith("❌ Quality gate")
  );
  assert.deepEqual(evaluatedGateLines, []);
}

function readNdjson(path: string): readonly unknown[] {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
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
  const lizard = config.lizard as {
    cyclomaticComplexity: { absoluteFloor: number };
    functionCodeDensity: {
      absoluteFloor: number;
      lowComplexityAllowance: { codeLineFloor: number };
    };
    parameterCount: { absoluteFloor: number };
  };
  const scc = config.scc as {
    fileCodeLines: {
      absoluteFloor: number;
      lowDecisionTokenAllowance: { codeLineFloor: number };
    };
  };

  lizard.cyclomaticComplexity.absoluteFloor = 10_000;
  lizard.functionCodeDensity.absoluteFloor = 10_000;
  lizard.functionCodeDensity.lowComplexityAllowance.codeLineFloor = 10_000;
  lizard.parameterCount.absoluteFloor = 10_000;
  scc.fileCodeLines.absoluteFloor = 10_000;
  scc.fileCodeLines.lowDecisionTokenAllowance.codeLineFloor = 10_000;
}

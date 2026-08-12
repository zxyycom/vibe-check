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
  createFixtureProject,
  readFixtureConfig,
  readFormalEntryArtifacts,
  runFormalGateScan,
  setFixtureCacheDir,
  setFixtureWarningPolicy,
  writeFixtureConfig,
  type CommandResult,
  type FormalEntryArtifacts,
  type MachinePublicationV2
} from "./cli-gate-acceptance.test-support.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");
type GatePolicy = "all" | "changed" | "regressions";

describe("formal CLI quality gate acceptance", () => {
  it("passes a zero-record quick all gate while preserving the skipped Check run", { timeout: 30_000 }, () => {
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

      assert.equal(artifacts.machine.run.completeness.status, "complete");
      assert.deepEqual(artifacts.machine.records, []);
      assert.deepEqual(
        artifacts.machine.run.runs.find(
          ({ checkId }) => checkId === "duplicate-detection"
        ),
        {
          applicability: null,
          checkId: "duplicate-detection",
          checkRunId: artifacts.machine.run.runs[0]?.checkRunId,
          coverage: null,
          diagnostic: null,
          result: null,
          selection: "unselected",
          status: "skipped"
        }
      );
      assertEvaluatedGateProjection({
        artifacts,
        expectedExit: 0,
        policy: "all",
        result,
        status: "passed"
      });
      assertExactLine(
        artifacts.report,
        "- `duplicate-detection`: skipped"
      );
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("fails an all gate when the unaccepted all-current view is non-empty", { timeout: 30_000 }, () => {
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

      assert.equal(artifacts.machine.run.completeness.status, "complete");
      assert.ok(artifacts.machine.records.length > 0);
      assertEvaluatedGateProjection({
        artifacts,
        expectedExit: 1,
        policy: "all",
        result,
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
      const inputUnchangedArtifacts = readFormalEntryArtifacts(
        inputUnchangedArtifactDir
      );

      assert.equal(
        inputUnchanged.status,
        0,
        `references:\n${JSON.stringify(inputUnchangedArtifacts.machine.run.references, null, 2)}\n` +
        `stdout:\n${inputUnchanged.stdout}\nstderr:\n${inputUnchanged.stderr}`
      );
      assert.equal(inputUnchangedArtifacts.machine.run.references.identities.length, 1);
      assert.equal(
        inputUnchangedArtifacts.machine.run.references.evidence.every(
          ({ status }) => status === "complete"
        ),
        true
      );
      assert.deepEqual(inputUnchangedArtifacts.machine.run.references.relations, []);
      assertEvaluatedGateProjection({
        artifacts: inputUnchangedArtifacts,
        expectedExit: 0,
        policy: "regressions",
        result: inputUnchanged,
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

      assert.ok(
        changedArtifacts.machine.run.references.relations.some(
          ({ relationId }) => relationId === "changed"
        )
      );
      assert.equal(
        changedArtifacts.machine.run.references.relations.some(
          ({ relationId }) => relationId === "regression"
        ),
        false
      );
      assertEvaluatedGateProjection({
        artifacts: changedArtifacts,
        expectedExit: 1,
        policy: "changed",
        result: changed,
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

      assert.ok(
        regressionArtifacts.machine.run.references.relations.some(
          ({ relationId }) => relationId === "regression"
        )
      );
      assertEvaluatedGateProjection({
        artifacts: regressionArtifacts,
        expectedExit: 1,
        policy: "regressions",
        result: regression,
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
    expectedExit: 0 | 1;
    policy: GatePolicy;
    result: CommandResult;
    status: "passed" | "failed";
  }
): void {
  const {
    artifacts,
    expectedExit,
    policy,
    result,
    status
  } = options;
  const gate = artifacts.machine.run.decision.gate;
  assert.ok(gate.status === "passed" || gate.status === "failed");
  const blockingRecords = recordsById(artifacts.machine, gate.blockingRecordIds);
  assertGateMachine({ artifacts, expectedExit, policy, result, status });
  assertGateStdout({ policy, stdout: result.stdout, recordCount: blockingRecords.length, status });
  assertGateReport({ report: artifacts.report, policy, status });
  assertBlockingGateReport({ report: artifacts.report, blockingRecords, status });
}

function assertGateMachine(options: {
  artifacts: FormalEntryArtifacts;
  expectedExit: 0 | 1;
  policy: GatePolicy;
  result: CommandResult;
  status: "passed" | "failed";
}): void {
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
  assertExactLine(
    stdout,
    `${icon} Quality gate ${status}.`
  );
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

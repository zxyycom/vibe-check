import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
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
  assertCurrentPublicationBaseline,
  type MachinePublicationV2
} from "./cli-omitted-gate-baseline.test-support.ts";
import { validateMachinePublicationSetV2 } from "./machine-output.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");

describe("formal CLI current projection regression baseline", () => {
  it("records the complete-passed projection and outcome", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("passed");

    try {
      const config = readFixtureConfig(fixture.projectRoot);
      raiseWarningFloors(config);
      writeFixtureConfig(fixture.projectRoot, config);

      const result = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "quick"
      ]);
      const artifacts = readFormalEntryArtifacts(fixture.artifactDir);

      assertCurrentPublicationBaseline(artifacts.machine);
      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
      assert.equal(artifacts.machine.run.completeness.status, "complete");
      assert.deepEqual(artifacts.machine.records, []);
      assert.match(result.stdout, /Snapshot completeness: complete/);
      assert.match(result.stdout, /Quality check status: passed/);
      assert.match(result.stdout, /✅ Quality scan complete\./);
      assert.match(artifacts.report, /Snapshot completeness\*\*: complete/);
      assertOmittedGateObservation(artifacts, result.stdout);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("records the complete-warning projection and outcome", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("warning");

    try {
      const result = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "quick"
      ]);
      const artifacts = readFormalEntryArtifacts(fixture.artifactDir);

      assertCurrentPublicationBaseline(artifacts.machine);
      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
      assert.equal(artifacts.machine.run.completeness.status, "complete");
      assert.ok(artifacts.machine.records.length > 0);
      assert.deepEqual(
        artifacts.machine.records.map(({ recordTypeId }) => recordTypeId).sort(),
        [
          "file-code-lines",
          "function-code-lines",
          "function-cyclomatic-complexity"
        ].sort()
      );
      assert.match(result.stdout, /Snapshot completeness: complete/);
      assert.match(result.stdout, /Quality check status: warning/);
      assert.match(result.stdout, /⚠️ Quality scan complete with warnings\./);
      assert.match(artifacts.report, /Snapshot completeness\*\*: complete/);
      assert.ok(
        artifacts.report.includes(artifacts.machine.records[0]?.message ?? "missing record")
      );
      assertOmittedGateObservation(artifacts, result.stdout);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("records the legitimate-empty projection and outcome", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("empty");

    try {
      const config = readFixtureConfig(fixture.projectRoot);
      config.include = ["missing/**/*.ts"];
      writeFixtureConfig(fixture.projectRoot, config);

      const result = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "full"
      ]);
      const artifacts = readFormalEntryArtifacts(fixture.artifactDir);

      assertCurrentPublicationBaseline(artifacts.machine);
      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
      assert.equal(artifacts.machine.run.completeness.status, "complete");
      assert.deepEqual(artifacts.machine.records, []);
      assert.equal(
        artifacts.machine.run.runs.every(
          (run) => run.result?.verdict === "not-applicable"
        ),
        true
      );
      assert.match(result.stdout, /Snapshot completeness: complete/);
      assert.match(result.stdout, /Quality check status: warning/);
      assert.match(result.stdout, /⚠️ Quality scan complete with warnings\./);
      assert.doesNotMatch(result.stdout, /Quality check status: passed/);
      assert.match(artifacts.report, /Snapshot completeness\*\*: complete/);
      assertOmittedGateObservation(artifacts, result.stdout);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("records the scan-incomplete projection and outcome", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("failed");

    try {
      const result = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "quick"
      ], {
        VIBE_CHECK_SCC_ARGS: "[]",
        VIBE_CHECK_SCC_CMD: join(fixture.projectRoot, "tools", "missing-scc")
      });
      const artifacts = readFormalEntryArtifacts(fixture.artifactDir);
      const failedRun = artifacts.machine.run.runs.find(
        (run) => run.status === "failed"
      );

      assertCurrentPublicationBaseline(artifacts.machine);
      assert.equal(result.status, 2);
      assert.equal(result.stderr, "");
      assert.equal(artifacts.machine.run.completeness.status, "incomplete");
      assert.ok(failedRun?.status === "failed");
      assert.equal(failedRun.diagnostic.category, "unavailable");
      assert.match(result.stdout, /Snapshot completeness: incomplete/);
      assert.match(result.stdout, /❌ Quality scan failed\./);
      assert.doesNotMatch(result.stdout, /Quality check status: (?:passed|warning)/);
      assert.match(artifacts.report, /Snapshot completeness\*\*: incomplete/);
      assert.match(artifacts.report, /file-metrics`: failed/);
      assertOmittedGateObservation(artifacts, result.stdout);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("returns output failure without a partial canonical machine set", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("output-failure");

    try {
      mkdirSync(resolve(fixture.artifactDir, ".."), { recursive: true });
      writeFileSync(fixture.artifactDir, "blocked", "utf8");

      const result = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "quick"
      ]);

      assert.equal(result.status, 2);
      assert.match(result.stdout, /❌ Quality scan failed\./);
      assert.doesNotMatch(result.stdout, /(?:✅|⚠️) Quality scan complete/);
      assert.doesNotMatch(
        result.stdout,
        /(?:run\.json|records\.ndjson|report\.md) →/
      );
      assert.match(result.stderr, /Fatal quality scan issue:/);
      for (const fileName of [
        "run.json",
        "records.ndjson",
        "report.md",
        "metrics.json",
        "warnings.ndjson",
        "warnings-all.ndjson"
      ]) {
        assert.equal(existsSync(join(fixture.artifactDir, fileName)), false);
      }
      assert.equal(readFileSync(fixture.artifactDir, "utf8"), "blocked");
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("--verification-output changes only the warning preview", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("verification-preview");
    const acceptedReason = "Reviewed warning retained in current projection artifacts.";

    try {
      const config = readFixtureConfig(fixture.projectRoot);
      config.acceptedWarnings = [{
        checkId: "file-code-lines",
        reason: acceptedReason,
      }];
      writeFixtureConfig(fixture.projectRoot, config);

      const normalArtifactDir = join(fixture.projectRoot, "artifacts", "normal-preview");
      const verificationArtifactDir = join(
        fixture.projectRoot,
        "artifacts",
        "verification-preview"
      );
      const normal = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "quick",
        "--artifact-dir",
        "artifacts/normal-preview"
      ]);
      const normalArtifacts = readFormalEntryArtifacts(normalArtifactDir);
      const verification = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "quick",
        "--artifact-dir",
        "artifacts/verification-preview",
        "--verification-output"
      ]);
      const verificationArtifacts = readFormalEntryArtifacts(verificationArtifactDir);

      assertCurrentPublicationBaseline(normalArtifacts.machine);
      assertCurrentPublicationBaseline(verificationArtifacts.machine);
      assert.equal(normal.status, 0);
      assert.equal(verification.status, 0);
      assert.equal(normal.stderr, "");
      assert.equal(verification.stderr, "");
      assert.deepEqual(
        stableArtifactEvidence(verificationArtifacts),
        stableArtifactEvidence(normalArtifacts)
      );
      const acceptedRecordIds = new Set(
        normalArtifacts.machine.run.acceptance.map(({ recordId }) => recordId)
      );
      assert.equal(acceptedRecordIds.size, 1);
      assert.ok(normalArtifacts.machine.records.length > acceptedRecordIds.size);

      assert.match(normal.stdout, /Quality check status: warning/);
      assert.ok(normal.stdout.includes(acceptedReason));

      assert.match(verification.stdout, /Quality verification status: warning/);
      assert.doesNotMatch(verification.stdout, /Accepted reason:/);
      assert.doesNotMatch(verification.stdout, /Quality check status:/);

      assert.match(normal.stdout, /⚠️ Quality scan complete with warnings\./);
      assert.match(verification.stdout, /⚠️ Quality scan complete with warnings\./);
      assertOmittedGateObservation(normalArtifacts, normal.stdout);
      assertOmittedGateObservation(verificationArtifacts, verification.stdout);
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
  readonly artifactDir: string;
  readonly projectRoot: string;
  readonly tempRoot: string;
}

interface FormalEntryArtifacts {
  readonly machine: MachinePublicationV2;
  readonly report: string;
}

function createFixtureProject(label: string): FixtureProject {
  const tempRoot = mkdtempSync(join(tmpdir(), `vibe-check-omitted-gate-${label}-`));
  const projectRoot = join(tempRoot, "configured-project");
  cpSync(fixtureRoot, projectRoot, { recursive: true });
  return {
    artifactDir: join(projectRoot, "artifacts", "configured-scan"),
    projectRoot,
    tempRoot
  };
}

function readFixtureConfig(projectRoot: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(projectRoot, ".vibe-check", "config.json"), "utf8")
  ) as Record<string, unknown>;
}

function writeFixtureConfig(
  projectRoot: string,
  config: Record<string, unknown>
): void {
  writeFileSync(
    join(projectRoot, ".vibe-check", "config.json"),
    JSON.stringify(config),
    "utf8"
  );
}

function runOmittedGateScan(
  projectRoot: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv = {}
): CommandResult {
  assert.equal(args.includes("--gate"), false);
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
      ".vibe-check/config.json",
      ...args
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ...configuredScannerEnvironment(),
        VIBE_CHECK_QUALITY_TIMINGS: "0",
        ...environment
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
  const runJson = readFileSync(join(artifactDir, "run.json"));
  const recordsNdjson = readFileSync(join(artifactDir, "records.ndjson"));
  const validation = validateMachinePublicationSetV2({
    recordsNdjson,
    runJson
  });
  if (!validation.ok) assert.fail(JSON.stringify(validation.diagnostic));
  const machine = validation.value;
  assert.equal(runJson.toString("utf8"), JSON.stringify(machine.run, null, 2));
  assert.deepEqual(machine.run.decision.gate, {
    policyId: null,
    status: "disabled"
  });
  const report = readFileSync(join(artifactDir, "report.md"), "utf8");
  assert.doesNotMatch(report, /vibe-check\.(?:metrics|warning)\.v1/);
  assert.equal(
    recordsNdjson.toString("utf8"),
    machine.records.length === 0
      ? ""
      : `${machine.records.map((record) => JSON.stringify(record)).join("\n")}\n`
  );
  assert.equal(existsSync(join(artifactDir, "raw")), true);
  for (const retiredName of [
    "metrics.json",
    "warnings.ndjson",
    "warnings-all.ndjson"
  ]) {
    assert.equal(existsSync(join(artifactDir, retiredName)), false);
  }

  return { machine, report };
}

function stableArtifactEvidence(artifacts: FormalEntryArtifacts): unknown {
  return {
    machine: {
      records: artifacts.machine.records.map(({ checkRunId: _, ...record }) => record),
      run: {
        ...artifacts.machine.run,
        invocation: {
          ...artifacts.machine.run.invocation,
          invocationId: "<invocation>",
          timestamp: "<timestamp>"
        },
        runs: artifacts.machine.run.runs.map(({ checkRunId: _, ...run }) => run)
      }
    },
    report: normalizeReportTimestamp(artifacts.report),
  };
}

function normalizeReportTimestamp(report: string): string {
  return report
    .replace(/^- \*\*Timestamp\*\*: .*$/m, "- **Timestamp**: <timestamp>")
    .replace(/^- \*\*Invocation\*\*: .*$/m, "- **Invocation**: <invocation>")
    .replace(
      /^\*Report generated at .* by (.+)\*$/m,
      "*Report generated at <timestamp> by $1*"
    );
}

function assertOmittedGateObservation(
  artifacts: FormalEntryArtifacts,
  stdout: string
): void {
  assert.deepEqual(artifacts.machine.run.decision.gate, {
    policyId: null,
    status: "disabled"
  });
  assert.doesNotMatch(stdout, /Quality gate|Gate (?:policy|status)/i);
  assert.match(artifacts.report, /- \*\*Gate status\*\*: disabled/);
  assert.match(artifacts.report, /- \*\*Policy\*\*: disabled/);
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

function configuredScannerEnvironment(): NodeJS.ProcessEnv {
  return {
    VIBE_CHECK_JSCPD_ARGS: JSON.stringify(["tools/controlled-scanner.ts", "jscpd"]),
    VIBE_CHECK_JSCPD_CMD: process.execPath,
    VIBE_CHECK_LIZARD_CMD: join(
      "tools",
      process.platform === "win32" ? "controlled-lizard.cmd" : "controlled-lizard"
    ),
    VIBE_CHECK_SCC_ARGS: JSON.stringify(["tools/controlled-scanner.ts", "scc"]),
    VIBE_CHECK_SCC_CMD: process.execPath
  };
}

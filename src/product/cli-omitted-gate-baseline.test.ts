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
  type QualityMetrics
} from "./quality-core/src/index.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");

describe("formal CLI omitted-gate compatibility baseline", () => {
  it("preserves the complete passed exit, artifacts, and human output", { timeout: 30_000 }, () => {
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

      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
      assert.equal(artifacts.metrics.scanCompleteness.overall, "complete");
      assert.deepEqual(artifacts.metrics.warnings, {
        all: [],
        changed: [],
        regressions: []
      });
      assert.match(result.stdout, /Scan completeness: complete/);
      assert.match(result.stdout, /Quality check status: passed/);
      assert.match(result.stdout, /✅ Quality scan complete\./);
      assert.doesNotMatch(result.stdout, /Quality was not evaluated/);
      assert.match(artifacts.report, /Overall.*`complete`/);
      assert.doesNotMatch(artifacts.report, /Quality was not evaluated/);
      assertOmittedGateHumanSilence(result.stdout, artifacts.report);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("preserves the complete warning exit, artifacts, and human output", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("warning");

    try {
      const result = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "quick"
      ]);
      const artifacts = readFormalEntryArtifacts(fixture.artifactDir);

      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
      assert.equal(artifacts.metrics.scanCompleteness.overall, "complete");
      assert.ok(artifacts.metrics.warnings.all.length > 0);
      assert.match(result.stdout, /Scan completeness: complete/);
      assert.match(result.stdout, /Quality check status: warning/);
      assert.match(result.stdout, /Warnings: \d+ total/);
      assert.match(result.stdout, /⚠️ Quality scan complete with warnings\./);
      assert.match(artifacts.report, /Overall.*`complete`/);
      assert.ok(
        artifacts.report.includes(artifacts.metrics.warnings.all[0]?.message ?? "missing warning")
      );
      assertOmittedGateHumanSilence(result.stdout, artifacts.report);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("preserves the legitimate empty warning exit, artifacts, and human output", { timeout: 30_000 }, () => {
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

      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
      assert.equal(artifacts.metrics.scanCompleteness.overall, "empty");
      assert.deepEqual(artifacts.metrics.warnings, {
        all: [],
        changed: [],
        regressions: []
      });
      assert.match(result.stdout, /Scan completeness: empty/);
      assert.match(result.stdout, /Quality check status: warning/);
      assert.match(
        result.stdout,
        /Quality was not evaluated.*no capability had eligible measurement input/
      );
      assert.match(result.stdout, /⚠️ Quality scan complete with warnings\./);
      assert.doesNotMatch(result.stdout, /Quality check status: passed/);
      assert.match(artifacts.report, /Overall.*`empty`/);
      assert.match(
        artifacts.report,
        /Quality was not evaluated.*no capability had eligible measurement input/
      );
      assertOmittedGateHumanSilence(result.stdout, artifacts.report);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("preserves the completeness failed exit, artifacts, and human output", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("failed");

    try {
      const config = readFixtureConfig(fixture.projectRoot);
      const tools = config.tools as Record<string, { args: string[]; command: string }>;
      tools.scc = {
        args: [],
        command: join(fixture.projectRoot, "tools", "missing-scc")
      };
      writeFixtureConfig(fixture.projectRoot, config);

      const result = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "quick"
      ]);
      const artifacts = readFormalEntryArtifacts(fixture.artifactDir);
      const failedCapability = artifacts.metrics.scanCompleteness.capabilities.find(
        (capability) => capability.status === "failed"
      );

      assert.equal(result.status, 2);
      assert.equal(artifacts.metrics.scanCompleteness.overall, "failed");
      assert.ok(failedCapability?.status === "failed");
      assert.match(result.stdout, /Scan completeness: failed/);
      assert.match(result.stdout, /❌ Quality scan failed\./);
      assert.doesNotMatch(result.stdout, /Quality check status: (?:passed|warning)/);
      assert.match(result.stderr, /Incomplete current measurements:/);
      assert.ok(result.stderr.includes(failedCapability.diagnostic.message));
      assert.ok(result.stderr.includes(failedCapability.diagnostic.action));
      assert.doesNotMatch(result.stderr, /Fatal error in quality scan:/);
      assert.match(artifacts.report, /Overall.*`failed`/);
      assert.ok(artifacts.report.includes(failedCapability.diagnostic.message));
      assert.ok(artifacts.report.includes(failedCapability.diagnostic.action));
      assertOmittedGateHumanSilence(result.stdout, artifacts.report);
    } finally {
      rmSync(fixture.tempRoot, { force: true, recursive: true });
    }
  });

  it("--verification-output changes only the warning preview", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("verification-preview");
    const acceptedReason = "Reviewed warning retained in compatibility artifacts.";

    try {
      const config = readFixtureConfig(fixture.projectRoot);
      config.acceptedWarnings = [{
        reason: acceptedReason,
        ruleId: "scc-file-code-lines"
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

      assert.equal(normal.status, 0);
      assert.equal(verification.status, 0);
      assert.equal(normal.stderr, "");
      assert.equal(verification.stderr, "");
      assert.deepEqual(
        stableArtifactEvidence(verificationArtifacts),
        stableArtifactEvidence(normalArtifacts)
      );
      assert.equal(
        stdoutWithoutWarningPreview(
          verification.stdout,
          verificationArtifactDir
        ),
        stdoutWithoutWarningPreview(normal.stdout, normalArtifactDir)
      );

      const acceptedWarnings = normalArtifacts.metrics.warnings.all.filter(
        (warning) => warning.acceptedReason === acceptedReason
      );
      const unacceptedWarningCount = normalArtifacts.metrics.warnings.all.length -
        acceptedWarnings.length;
      assert.equal(acceptedWarnings.length, 1);
      assert.ok(unacceptedWarningCount > 0);

      assert.match(normal.stdout, /Quality check status: warning/);
      assert.match(
        normal.stdout,
        new RegExp(`Warnings: ${normalArtifacts.metrics.warnings.all.length} total`)
      );
      assert.match(normal.stdout, /Showing first \d+ warnings:/);
      assert.ok(normal.stdout.includes(acceptedReason));

      assert.match(verification.stdout, /Quality verification status: warning/);
      assert.match(
        verification.stdout,
        new RegExp(`Warnings without accepted reason: ${unacceptedWarningCount} total`)
      );
      assert.match(
        verification.stdout,
        /Showing first \d+ warnings without accepted reason:/
      );
      assert.doesNotMatch(verification.stdout, /Accepted reason:/);
      assert.doesNotMatch(verification.stdout, /Quality check status:/);

      assert.match(normal.stdout, /⚠️ Quality scan complete with warnings\./);
      assert.match(verification.stdout, /⚠️ Quality scan complete with warnings\./);
      assertOmittedGateHumanSilence(normal.stdout, normalArtifacts.report);
      assertOmittedGateHumanSilence(verification.stdout, verificationArtifacts.report);
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
  readonly metrics: QualityMetrics;
  readonly report: string;
  readonly warnings: readonly unknown[];
  readonly warningsAll: readonly unknown[];
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

function runOmittedGateScan(
  projectRoot: string,
  args: readonly string[]
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
      "vibe-check.config.json",
      "--skip-baseline",
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
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);
  const metrics = metricsInput as QualityMetrics;
  assert.deepEqual(metrics.gate, {
    policy: null,
    status: "disabled"
  });
  const report = readFileSync(join(artifactDir, "report.md"), "utf8");
  const warnings = parseNdjson(
    readFileSync(join(artifactDir, "warnings.ndjson"), "utf8")
  );
  const warningsAll = parseNdjson(
    readFileSync(join(artifactDir, "warnings-all.ndjson"), "utf8")
  );

  assert.deepEqual(warnings, metrics.warnings.changed);
  assert.deepEqual(warningsAll, metrics.warnings.all);
  assert.equal(existsSync(join(artifactDir, "raw")), true);

  return { metrics, report, warnings, warningsAll };
}

function parseNdjson(input: string): readonly unknown[] {
  const lines = input.trim().split("\n").filter((line) => line.length > 0);
  return lines.map((line) => JSON.parse(line) as unknown);
}

function stableArtifactEvidence(artifacts: FormalEntryArtifacts): unknown {
  const metrics = JSON.parse(JSON.stringify(artifacts.metrics)) as QualityMetrics;
  metrics.metadata.timestamp = "<timestamp>";
  return {
    metrics,
    report: normalizeReportTimestamp(artifacts.report),
    warnings: artifacts.warnings,
    warningsAll: artifacts.warningsAll
  };
}

function normalizeReportTimestamp(report: string): string {
  return report
    .replace(/^- \*\*Timestamp\*\*: .*$/m, "- **Timestamp**: <timestamp>")
    .replace(
      /^\*Report generated at .* by (.+)\*$/m,
      "*Report generated at <timestamp> by $1*"
    );
}

function stdoutWithoutWarningPreview(
  stdout: string,
  artifactDir: string
): string {
  const lines = stdout.replaceAll(artifactDir, "<artifact-dir>").split("\n");
  const previewStart = lines.findIndex((line) =>
    /^Quality (?:check|verification) status:/.test(line)
  );
  const previewEnd = lines.findIndex(
    (line, index) =>
      index > previewStart && line.startsWith("Warning records: ")
  );

  assert.notEqual(previewStart, -1);
  assert.notEqual(previewEnd, -1);
  return [...lines.slice(0, previewStart), ...lines.slice(previewEnd + 1)].join(
    "\n"
  );
}

function assertOmittedGateHumanSilence(stdout: string, report: string): void {
  assert.doesNotMatch(stdout, /Quality gate|Gate (?:policy|status)/i);
  assert.doesNotMatch(report, /## (?:CI )?Gate|Gate (?:policy|status)/i);
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

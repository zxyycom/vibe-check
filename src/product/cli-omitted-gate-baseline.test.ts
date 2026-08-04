import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  validateMachineArtifactSetV1,
  type MachineMetricsV1,
  type MachineWarningV1
} from "./machine-output.ts";

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

      assertCurrentProjectionBaseline(artifacts.metrics, fixture.projectRoot);
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

  it("records the complete-warning projection and outcome", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("warning");

    try {
      const result = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "quick"
      ]);
      const artifacts = readFormalEntryArtifacts(fixture.artifactDir);

      assertCurrentProjectionBaseline(artifacts.metrics, fixture.projectRoot);
      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
      assert.equal(artifacts.metrics.scanCompleteness.overall, "complete");
      assert.ok(artifacts.metrics.warnings.all.length > 0);
      assert.deepEqual(
        artifacts.metrics.warnings.all.map(({ ruleId }) => ruleId),
        [
          "lizard-function-code-density",
          "scc-file-code-lines",
          "lizard-cyclomatic-complexity"
        ]
      );
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

      assertCurrentProjectionBaseline(artifacts.metrics, fixture.projectRoot);
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
      const failedCapability = artifacts.metrics.scanCompleteness.capabilities.find(
        (capability) => capability.status === "failed"
      );

      assertCurrentProjectionBaseline(artifacts.metrics, fixture.projectRoot);
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

  it("returns output failure without a partial canonical machine set", { timeout: 30_000 }, () => {
    const fixture = createFixtureProject("output-failure");

    try {
      mkdirSync(join(fixture.artifactDir, "report.md"), { recursive: true });

      const result = runOmittedGateScan(fixture.projectRoot, [
        "--profile",
        "quick"
      ]);

      assert.equal(result.status, 2);
      assert.match(result.stdout, /❌ Quality scan failed\./);
      assert.doesNotMatch(result.stdout, /(?:✅|⚠️) Quality scan complete/);
      assert.doesNotMatch(
        result.stdout,
        /(?:metrics\.json|warnings(?:-all)?\.ndjson) →/
      );
      assert.match(result.stderr, /Fatal quality scan issues:/);
      assert.match(result.stderr, /output write:/);
      assert.equal(existsSync(join(fixture.artifactDir, "raw")), true);
      for (const fileName of [
        "metrics.json",
        "warnings.ndjson",
        "warnings-all.ndjson"
      ]) {
        assert.equal(existsSync(join(fixture.artifactDir, fileName)), false);
      }
      assert.equal(
        readdirSync(fixture.artifactDir).some(
          (fileName) =>
            fileName.startsWith(".vibe-check-machine-") &&
            fileName.endsWith(".tmp")
        ),
        false
      );
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

      assertCurrentProjectionBaseline(normalArtifacts.metrics, fixture.projectRoot);
      assertCurrentProjectionBaseline(
        verificationArtifacts.metrics,
        fixture.projectRoot
      );
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
  readonly metrics: MachineMetricsV1;
  readonly report: string;
  readonly warnings: readonly MachineWarningV1[];
  readonly warningsAll: readonly MachineWarningV1[];
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
  const metricsJson = readFileSync(join(artifactDir, "metrics.json"));
  const warningsNdjson = readFileSync(join(artifactDir, "warnings.ndjson"));
  const warningsAllNdjson = readFileSync(
    join(artifactDir, "warnings-all.ndjson")
  );
  const validation = validateMachineArtifactSetV1({
    metricsJson,
    warningsAllNdjson,
    warningsNdjson
  });
  if (!validation.ok) assert.fail(JSON.stringify(validation.diagnostic));
  const { metrics, warnings, warningsAll } = validation.value;
  assert.equal(metricsJson.toString("utf8"), JSON.stringify(metrics, null, 2));
  assert.deepEqual(metrics.gate, {
    policy: null,
    status: "disabled"
  });
  const report = readFileSync(join(artifactDir, "report.md"), "utf8");
  assert.doesNotMatch(report, /vibe-check\.(?:metrics|warning)\.v1/);
  assertWarningStreamBytes(
    warningsNdjson.toString("utf8"),
    metrics.warnings.changed
  );
  assertWarningStreamBytes(
    warningsAllNdjson.toString("utf8"),
    metrics.warnings.all
  );

  assert.deepEqual(warnings, metrics.warnings.changed);
  assert.deepEqual(warningsAll, metrics.warnings.all);
  assert.equal(existsSync(join(artifactDir, "raw")), true);

  return { metrics, report, warnings, warningsAll };
}

function assertCurrentProjectionBaseline(
  metrics: MachineMetricsV1,
  projectRoot: string
): void {
  assertSerializedFields(
    metrics,
    [
      "aggregates", "baseline", "comparisonStatus", "currentFingerprints",
      "duplicateCode", "fileMetrics", "functionMetrics", "gate", "metadata",
      "scanCompleteness", "trends", "warnings"
    ],
    ["baselineFingerprints"]
  );
  assertSerializedFields(
    metrics.metadata,
    [
      "commitSha", "commitTitle", "configVersion", "repository",
      "schemaVersion", "scope", "timestamp", "tools"
    ],
    ["commitDate"]
  );
  assert.equal(metrics.metadata.schemaVersion, "vibe-check.metrics.v1");
  assert.match(
    metrics.metadata.timestamp,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
  );
  assert.equal(metrics.metadata.repository, resolve(projectRoot));
  assert.equal(isAbsolute(metrics.metadata.repository), true);
  assert.equal(resolve(metrics.metadata.repository), metrics.metadata.repository);
  assertSerializedFields(
    metrics.metadata.scope,
    ["excludeDirs", "generatedFiles", "include"]
  );
  for (const tool of metrics.metadata.tools) {
    assertSerializedFields(tool, ["name", "source", "version"]);
  }

  assertSerializedFields(
    metrics.baseline,
    ["commitDate", "commitSha", "metadata", "status"]
  );
  assert.deepEqual(metrics.baseline, {
    commitDate: null,
    commitSha: null,
    metadata: null,
    status: "baseline-skipped"
  });
  assert.equal(Object.hasOwn(metrics, "baselineFingerprints"), false);
  assert.equal(metrics.comparisonStatus, "baseline-unavailable");

  for (const fingerprint of Object.values(metrics.currentFingerprints)) {
    assertSerializedFields(fingerprint, ["fileCount", "fileList", "fingerprint"]);
    for (const path of fingerprint.fileList) assertProjectRelativePath(path);
  }

  assertSerializedFields(metrics.scanCompleteness, ["capabilities", "overall"]);
  assert.ok(
    ["complete", "empty", "failed"].includes(metrics.scanCompleteness.overall)
  );
  assert.deepEqual(
    metrics.scanCompleteness.capabilities
      .map(({ capabilityId }) => capabilityId)
      .sort(),
    ["duplicate-detection", "file-metrics", "function-metrics"]
  );
  for (const capability of metrics.scanCompleteness.capabilities) {
    assertSerializedFields(
      capability,
      ["capabilityId", "status"],
      capability.status === "failed" ? ["diagnostic"] : []
    );
    assert.ok(
      ["skipped", "no-input", "succeeded", "failed"].includes(capability.status)
    );
    if (capability.status === "failed") {
      assertSerializedFields(capability.diagnostic, ["action", "kind", "message"]);
    }
  }

  assertSerializedFields(
    metrics.aggregates,
    ["byCodeArea", "byLanguage", "overall"]
  );
  for (const aggregate of metrics.aggregates.byLanguage) {
    assertSerializedFields(
      aggregate,
      ["blankLines", "codeLines", "commentLines", "files", "language", "lines"],
      ["comments"]
    );
  }
  for (const aggregate of metrics.aggregates.byCodeArea) {
    assertSerializedFields(
      aggregate,
      ["codeArea", "files", "functions", "lines", "warningPolicy"],
      [
        "codeLines", "cyclomaticComplexity", "duplicateFragments",
        "fileDecisionTokens", "functionLines", "parameterCount"
      ]
    );
  }
  assertSerializedFields(
    metrics.aggregates.overall,
    ["totalCodeLines", "totalFiles", "totalFunctions", "totalLines"],
    [
      "totalDuplicateFragments", "totalFileDecisionTokens",
      "totalFunctionCyclomaticComplexity", "totalFunctionLines",
      "totalFunctionParameters"
    ]
  );

  for (const metric of metrics.fileMetrics) {
    assertSerializedFields(
      metric,
      ["codeArea", "decisionTokens", "isChanged", "language", "lines", "path"],
      ["blankLines", "codeLines", "commentLines"]
    );
    assertSerializedFields(metric.decisionTokens, ["source", "value"]);
    assertProjectRelativePath(metric.path);
  }
  for (const metric of metrics.functionMetrics) {
    assertSerializedFields(
      metric,
      [
        "codeArea", "cyclomaticComplexity", "endLine", "file", "isChanged",
        "lines", "name", "parameterCount", "startLine"
      ]
    );
    assertSerializedFields(metric.cyclomaticComplexity, ["source", "value"]);
    assertProjectRelativePath(metric.file);
  }

  assertSerializedFields(metrics.warnings, ["all", "changed", "regressions"]);
  for (const warning of metrics.warnings.all) {
    assertSerializedFields(
      warning,
      [
        "baselineValue", "codeArea", "comparisonBasis", "deltaValue",
        "isChanged", "level", "line", "message", "metric", "path", "ruleId",
        "schemaVersion", "sourceTool", "value"
      ],
      ["acceptedReason", "suggestion"]
    );
    assert.ok(["info", "warning", "error"].includes(warning.level));
    assert.equal(warning.schemaVersion, "vibe-check.warning.v1");
    assertProjectRelativePath(warning.path);
  }
  assertSerializedFields(metrics.gate, ["policy", "status"]);
}

function assertSerializedFields(
  value: object,
  required: readonly string[],
  optional: readonly string[] = []
): void {
  assert.deepEqual(
    Object.keys(value).filter((field) => !optional.includes(field)).sort(),
    [...required].sort()
  );
}

function assertProjectRelativePath(path: string): void {
  assert.equal(isAbsolute(path), false);
  assert.doesNotMatch(path, /(?:^|\/)\.\.(?:\/|$)/);
  assert.doesNotMatch(path, /\\/);
}

function assertWarningStreamBytes(
  input: string,
  expected: readonly unknown[]
): void {
  assert.equal(
    input,
    expected.length === 0
      ? ""
      : `${expected.map((warning) => JSON.stringify(warning)).join("\n")}\n`
  );
}

function stableArtifactEvidence(artifacts: FormalEntryArtifacts): unknown {
  const metrics = JSON.parse(JSON.stringify(artifacts.metrics)) as MachineMetricsV1;
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

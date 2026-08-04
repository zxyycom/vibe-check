import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
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

import { DEFAULT_CONFIG } from "./config.ts";
import {
  validateMachineArtifactSetV1,
  type MachineMetricsV1
} from "./machine-output.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");
const fixtureArtifactDir = resolve(fixtureRoot, "artifacts/configured-scan");

describe("formal CLI explicit configuration", () => {
  it("scans the checked-in project deterministically with only the configured inputs", { timeout: 30_000 }, () => {
    cleanupFixtureOutput();

    try {
      const first = runConfiguredFixture();
      assertCommandSucceeded(first, "first configured fixture scan");
      const firstMetrics = readFixtureMetrics();

      assert.equal(first.stderr, "");
      assert.match(first.stdout, /Found 1 files in scan scope/);
      assert.match(first.stdout, /Code areas: fixture-app/);
      assert.equal(firstMetrics.metadata.configVersion, "1");
      assert.deepEqual(firstMetrics.metadata.scope.include, [
        "src/**/*.ts",
        "excluded/**/*.ts"
      ]);
      assert.deepEqual(
        firstMetrics.metadata.tools.map((tool) => [tool.name, tool.version]),
        [
          ["lizard", "lizard 1.17.10"],
          ["scc", "scc version 3.7.0"]
        ]
      );
      assert.deepEqual(firstMetrics.scanCompleteness, {
        capabilities: [
          { capabilityId: "file-metrics", status: "succeeded" },
          { capabilityId: "function-metrics", status: "succeeded" },
          { capabilityId: "duplicate-detection", status: "no-input" }
        ],
        overall: "complete"
      });
      assert.deepEqual(firstMetrics.currentFingerprints["fixture-app"]?.fileList, [
        "src/eligible.ts"
      ]);
      assert.deepEqual(
        firstMetrics.fileMetrics.map((metric) => [metric.path, metric.codeArea]),
        [["src/eligible.ts", "fixture-app"]]
      );
      assert.deepEqual(
        firstMetrics.functionMetrics.map((metric) => [metric.file, metric.codeArea]),
        [["src/eligible.ts", "fixture-app"]]
      );
      assert.ok(
        firstMetrics.warnings.all.some(
          (warning) =>
            warning.path === "src/eligible.ts" &&
            warning.ruleId === "scc-file-code-lines"
        )
      );
      assert.doesNotMatch(JSON.stringify(firstMetrics), /ignored\.generated|excluded\/ignored/);

      assert.ok(existsSync(resolve(fixtureArtifactDir, "metrics.json")));
      assert.ok(existsSync(resolve(fixtureArtifactDir, "report.md")));
      assert.ok(existsSync(resolve(fixtureArtifactDir, "warnings-all.ndjson")));
      const firstReport = readFileSync(resolve(fixtureArtifactDir, "report.md"), "utf8");
      assert.match(firstReport, /^# Configured TypeScript Fixture Quality/);
      assert.match(firstReport, /Overall.*`complete`/);
      assert.match(firstReport, /file-metrics.*`succeeded`/);
      assert.match(firstReport, /function-metrics.*`succeeded`/);
      assert.match(firstReport, /duplicate-detection.*`no-input`/);
      assert.match(first.stdout, /Scan completeness: complete/);
      assert.match(first.stdout, /file-metrics: succeeded/);
      assert.match(first.stdout, /function-metrics: succeeded/);
      assert.match(first.stdout, /duplicate-detection: no-input/);
      assert.match(first.stdout, /Quality check status: warning/);

      const stableFirst = stableScanEvidence(firstMetrics);
      cleanupFixtureOutput();
      const second = runConfiguredFixture("../configured-typescript/.vibe-check/config.json");
      assertCommandSucceeded(second, "second configured fixture scan");
      assert.deepEqual(stableScanEvidence(readFixtureMetrics()), stableFirst);

      cleanupFixtureOutput();
      const overridden = runConfiguredFixture(
        resolve(fixtureRoot, ".vibe-check", "config.json"),
        ["--artifact-dir", "artifacts/cli-override", "--top-n", "1"]
      );
      assertCommandSucceeded(overridden, "configured fixture scan with CLI overrides");
      assert.equal(existsSync(fixtureArtifactDir), false);
      const overriddenReport = readFileSync(
        resolve(fixtureRoot, "artifacts/cli-override/report.md"),
        "utf8"
      );
      assert.match(overriddenReport, /## Top 1 函数 \(按圈复杂度\)/);
      assert.doesNotMatch(overriddenReport, /## Top 3 函数 \(按圈复杂度\)/);
    } finally {
      cleanupFixtureOutput();
    }
  });

  it("reports config failures with exit 3 before scanners or artifacts start", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-invalid-config-"));
    const markerPath = join(projectRoot, "scanner-started");
    const scannerPath = join(projectRoot, "scanner.ts");
    const artifactDir = join(projectRoot, "artifacts/should-not-exist");
    const cacheDir = join(projectRoot, ".cache/should-not-exist");
    const configPath = join(projectRoot, "invalid.json");
    const markerEnvironment = {
      VIBE_CHECK_SCC_ARGS: JSON.stringify([scannerPath]),
      VIBE_CHECK_SCC_CMD: process.execPath
    };

    try {
      writeFixtureFile(
        projectRoot,
        "src/eligible.ts",
        "export const eligible = true;\n"
      );
      writeFixtureFile(
        projectRoot,
        "scanner.ts",
        `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(markerPath)}, "started");\n`
      );
      const config = JSON.parse(
        readFileSync(resolve(fixtureRoot, ".vibe-check", "config.json"), "utf8")
      ) as Record<string, unknown>;
      config.artifactDir = "artifacts/should-not-exist";
      config.cacheDir = ".cache/should-not-exist";
      config.unexpected = true;
      writeFileSync(configPath, JSON.stringify(config), "utf8");

      const invalid = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "invalid.json",
        "--skip-baseline"
      ], markerEnvironment);
      assert.equal(invalid.status, 3);
      assert.equal(invalid.stdout, "");
      assert.match(invalid.stderr, /Fatal error in quality scan: failed to load config/);
      assert.ok(invalid.stderr.includes(configPath));
      assert.equal(existsSync(markerPath), false);
      assert.equal(existsSync(cacheDir), false);
      assert.equal(existsSync(artifactDir), false);

      delete config.unexpected;
      (config.report as Record<string, unknown>).timeZone = "UTC";
      config.tools = {
        lizard: { args: ["scanner.ts", "private-argument"], command: process.execPath }
      };
      writeFileSync(configPath, JSON.stringify(config), "utf8");
      const legacy = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "invalid.json",
        "--skip-baseline"
      ], markerEnvironment);
      assert.equal(legacy.status, 3);
      assert.equal(legacy.stdout, "");
      assert.match(legacy.stderr, /version "1"/);
      assert.match(legacy.stderr, /checks\.functions/);
      assert.match(legacy.stderr, /VIBE_CHECK_LIZARD_CMD/);
      assert.doesNotMatch(legacy.stderr, /private-argument/);
      assert.equal(existsSync(markerPath), false);
      assert.equal(existsSync(cacheDir), false);
      assert.equal(existsSync(artifactDir), false);

      delete config.tools;
      (config.report as Record<string, unknown>).timeZone = "Not/A_Real_Zone";
      writeFileSync(configPath, JSON.stringify(config), "utf8");
      const invalidTimeZone = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "invalid.json",
        "--skip-baseline"
      ], markerEnvironment);
      assert.equal(invalidTimeZone.status, 3);
      assert.equal(invalidTimeZone.stdout, "");
      assert.match(invalidTimeZone.stderr, /config\.report\.timeZone must be a valid time zone/);
      assert.equal(existsSync(markerPath), false);
      assert.equal(existsSync(cacheDir), false);
      assert.equal(existsSync(artifactDir), false);

      const missing = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "missing.json"
      ], markerEnvironment);
      assert.equal(missing.status, 3);
      assert.equal(missing.stdout, "");
      assert.ok(missing.stderr.includes(join(projectRoot, "missing.json")));
      assert.equal(existsSync(markerPath), false);
      assert.equal(existsSync(cacheDir), false);
      assert.equal(existsSync(artifactDir), false);
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("does not discover a project config when --config is omitted", { timeout: 30_000 }, () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-omitted-config-"));
    const artifactDir = join(projectRoot, "artifacts/default-scan");

    try {
      writeFixtureFile(projectRoot, "vibe-check.config.json", "{");
      writeFixtureFile(projectRoot, "docs/example.md", "# Default scan\n");

      const result = runProductCli([
        "scan",
        projectRoot,
        "--profile",
        "quick",
        "--artifact-dir",
        "artifacts/default-scan"
      ], {
        VIBE_CHECK_SCC_ARGS: JSON.stringify([
          resolve(fixtureRoot, "tools/controlled-scanner.ts"),
          "scc"
        ]),
        VIBE_CHECK_SCC_CMD: "bun"
      });
      assertCommandSucceeded(result, "scan without --config");
      assert.equal(result.stderr, "");

      const metrics = readMetricsArtifact(artifactDir);
      assert.equal(metrics.metadata.configVersion, DEFAULT_CONFIG.version);
      assert.equal(
        metrics.metadata.tools.find((tool) => tool.name === "scc")?.version,
        "scc version 3.7.0"
      );
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("returns a warning without a quality verdict when no capability has eligible input", { timeout: 30_000 }, () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-empty-scan-"));
    const projectRoot = join(tempRoot, "configured-project");
    const configPath = join(projectRoot, ".vibe-check", "config.json");
    const markerPath = join(projectRoot, "scanner-started");
    const markerScannerPath = join(projectRoot, "tools", "operational-marker.ts");
    const artifactDir = join(projectRoot, "artifacts/configured-scan");
    const cacheDir = join(projectRoot, ".cache/configured-scan");

    try {
      cpSync(fixtureRoot, projectRoot, { recursive: true });
      writeFileSync(
        markerScannerPath,
        `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(markerPath)}, "started");\n`,
        "utf8"
      );
      const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
      config.include = ["missing/**/*.ts"];
      config.acceptedWarnings = [
        {
          checkId: "duplicate-code",
          metric: "duplicate-tokens",
          reason: "stale acceptance should not be evaluated for an empty scan",
          value: 999
        }
      ];
      writeFileSync(configPath, JSON.stringify(config), "utf8");

      const scanArgs = [
        "scan",
        projectRoot,
        "--config",
        ".vibe-check/config.json",
        "--profile",
        "full",
        "--skip-baseline"
      ] as const;
      const invalidOperational = runProductCli(scanArgs, {
        ...configuredScannerEnvironment(projectRoot),
        VIBE_CHECK_JSCPD_ARGS: JSON.stringify([markerScannerPath]),
        VIBE_CHECK_JSCPD_CMD: process.execPath,
        VIBE_CHECK_SCC_ARGS: "not-json-private-value"
      });
      assert.equal(invalidOperational.status, 2);
      assert.equal(invalidOperational.stdout, "");
      assert.match(invalidOperational.stderr, /VIBE_CHECK_SCC_ARGS/);
      assert.match(invalidOperational.stderr, /must be a JSON array of strings/);
      assert.match(invalidOperational.stderr, /provide a valid array or unset/);
      assert.doesNotMatch(invalidOperational.stderr, /not-json-private-value/);
      assert.equal(existsSync(markerPath), false);
      assert.equal(existsSync(cacheDir), false);
      assert.equal(existsSync(artifactDir), false);

      const result = runProductCli(scanArgs, {
        VIBE_CHECK_JSCPD_ARGS: "[]",
        VIBE_CHECK_JSCPD_CMD: join(projectRoot, "tools", "missing-jscpd"),
        VIBE_CHECK_LIZARD_CMD: join(projectRoot, "tools", "missing-lizard"),
        VIBE_CHECK_SCC_ARGS: "[]",
        VIBE_CHECK_SCC_CMD: join(projectRoot, "tools", "missing-scc")
      });

      assert.equal(
        result.status,
        0,
        `legitimate empty scan failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
      assert.equal(result.stderr, "");
      assert.match(result.stdout, /Scan completeness: empty/);
      assert.doesNotMatch(result.stdout, /Generating warnings/);
      assert.match(
        result.stdout,
        /Quality was not evaluated.*no capability had eligible measurement input/
      );
      assert.doesNotMatch(result.stdout, /Quality check status: passed/);
      assert.doesNotMatch(result.stdout, /✅ Quality scan complete\./);

      const metrics = readMetricsArtifact(artifactDir);
      assert.deepEqual(metrics.scanCompleteness, {
        capabilities: [
          { capabilityId: "file-metrics", status: "no-input" },
          { capabilityId: "function-metrics", status: "no-input" },
          { capabilityId: "duplicate-detection", status: "no-input" }
        ],
        overall: "empty"
      });
      assert.deepEqual(metrics.warnings, { all: [], changed: [], regressions: [] });

      const report = readFileSync(join(artifactDir, "report.md"), "utf8");
      assert.match(report, /Overall.*`empty`/);
      assert.match(report, /file-metrics.*`no-input`/);
      assert.match(report, /function-metrics.*`no-input`/);
      assert.match(report, /duplicate-detection.*`no-input`/);
      assert.match(
        report,
        /Quality was not evaluated.*no capability had eligible measurement input/
      );
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("treats a successful zero-finding quick scan as complete without resolving jscpd", { timeout: 30_000 }, () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-zero-findings-"));
    const projectRoot = join(tempRoot, "configured-project");
    const configPath = join(projectRoot, ".vibe-check", "config.json");
    const artifactDir = join(projectRoot, "artifacts/configured-scan");

    try {
      cpSync(fixtureRoot, projectRoot, { recursive: true });
      const lizardCommand = writeControlledLizard(projectRoot, "zero");
      const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
      raiseWarningFloors(config);
      writeFileSync(configPath, JSON.stringify(config), "utf8");

      const result = runProductCli([
        "scan",
        projectRoot,
        "--config",
        ".vibe-check/config.json",
        "--profile",
        "quick",
        "--skip-baseline"
      ], {
        ...configuredScannerEnvironment(projectRoot),
        VIBE_CHECK_JSCPD_CMD: join(projectRoot, "tools", "missing-jscpd"),
        VIBE_CHECK_LIZARD_CMD: lizardCommand
      });

      assertCommandSucceeded(result, "successful zero-finding quick scan");
      assert.equal(result.stderr, "");

      const metrics = readMetricsArtifact(artifactDir);
      const functionMetrics = metrics.scanCompleteness.capabilities.find(
        (capability) => capability.capabilityId === "function-metrics"
      );
      const duplicateDetection = metrics.scanCompleteness.capabilities.find(
        (capability) => capability.capabilityId === "duplicate-detection"
      );
      assert.equal(functionMetrics?.status, "succeeded");
      assert.deepEqual(metrics.functionMetrics, []);
      assert.equal(duplicateDetection?.status, "skipped");
      assert.equal(metrics.scanCompleteness.overall, "complete");
      assert.equal(
        metrics.metadata.tools.some((tool) => tool.name === "jscpd"),
        false
      );

      assert.match(result.stdout, /Scan completeness: complete/);
      assert.match(result.stdout, /function-metrics: succeeded/);
      assert.match(result.stdout, /duplicate-detection: skipped/);
      assert.match(result.stdout, /Quality check status: passed/);
      assert.doesNotMatch(result.stdout, /Scan completeness: (?:empty|failed)/);
      assert.doesNotMatch(result.stdout, /Quality was not evaluated/);
      assert.doesNotMatch(result.stdout, /jscpd validation failed/);

      const report = readFileSync(join(artifactDir, "report.md"), "utf8");
      assert.match(report, /Overall.*`complete`/);
      assert.match(report, /function-metrics.*`succeeded`/);
      assert.match(report, /duplicate-detection.*`skipped`/);
      assert.doesNotMatch(report, /Overall.*`(?:empty|failed)`/);
      assert.doesNotMatch(report, /Quality was not evaluated/);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("projects Lizard execution and invalid-result failures consistently", { timeout: 30_000 }, () => {
    const variants = [
      { diagnosticKind: "execution", mode: "execution" },
      { diagnosticKind: "invalid-result", mode: "invalid" }
    ] as const;

    for (const variant of variants) {
      const tempRoot = mkdtempSync(join(tmpdir(), `vibe-check-lizard-${variant.mode}-`));
      const projectRoot = join(tempRoot, "configured-project");
      const configPath = join(projectRoot, ".vibe-check", "config.json");
      const artifactDir = join(projectRoot, "artifacts/configured-scan");

      try {
        cpSync(fixtureRoot, projectRoot, { recursive: true });
        const lizardCommand = writeControlledLizard(projectRoot, variant.mode);
        const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
        raiseWarningFloors(config);
        writeFileSync(configPath, JSON.stringify(config), "utf8");

        const result = runProductCli([
          "scan",
          projectRoot,
          "--config",
          ".vibe-check/config.json",
          "--profile",
          "quick",
          "--skip-baseline"
        ], {
          ...configuredScannerEnvironment(projectRoot),
          VIBE_CHECK_LIZARD_CMD: lizardCommand
        });

        assert.equal(
          result.status,
          2,
          `${variant.mode} Lizard result did not fail closed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
        );

        const metrics = readMetricsArtifact(artifactDir);
        const functionMetrics = metrics.scanCompleteness.capabilities.find(
          (capability) => capability.capabilityId === "function-metrics"
        );
        assert.ok(functionMetrics?.status === "failed");
        assert.equal(functionMetrics.diagnostic.kind, variant.diagnosticKind);
        assert.equal(metrics.scanCompleteness.overall, "failed");

        assert.match(result.stdout, /Scan completeness: failed/);
        assert.match(result.stdout, /function-metrics: failed/);
        assert.ok(result.stdout.includes(functionMetrics.diagnostic.message));
        assert.ok(result.stdout.includes(functionMetrics.diagnostic.action));
        assert.match(result.stderr, /Incomplete current measurements:/);
        assert.ok(result.stderr.includes(functionMetrics.diagnostic.message));
        assert.doesNotMatch(result.stderr, /Fatal quality scan issues:/);
        assert.doesNotMatch(result.stdout, /Quality check status: passed/);
        assert.doesNotMatch(result.stdout, /✅ Quality scan complete\./);

        const report = readFileSync(join(artifactDir, "report.md"), "utf8");
        assert.match(report, /Overall.*`failed`/);
        assert.match(report, /function-metrics.*`failed`/);
        assert.ok(report.includes(functionMetrics.diagnostic.message));
        assert.ok(report.includes(functionMetrics.diagnostic.action));
      } finally {
        rmSync(tempRoot, { force: true, recursive: true });
      }
    }
  });

  it("fails closed when an eligible current measurement component is unavailable", { timeout: 30_000 }, () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-unavailable-component-"));
    const projectRoot = join(tempRoot, "configured-project");
    const configPath = join(projectRoot, ".vibe-check", "config.json");
    const artifactDir = join(projectRoot, "artifacts/configured-scan");

    try {
      cpSync(fixtureRoot, projectRoot, { recursive: true });
      const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
      raiseWarningFloors(config);
      writeFileSync(configPath, JSON.stringify(config), "utf8");

      const result = runProductCli([
        "scan",
        projectRoot,
        "--config",
        ".vibe-check/config.json",
        "--profile",
        "quick",
        "--skip-baseline"
      ], {
        ...configuredScannerEnvironment(projectRoot),
        VIBE_CHECK_SCC_ARGS: "[]",
        VIBE_CHECK_SCC_CMD: join(projectRoot, "tools", "missing-scc")
      });

      assert.equal(
        result.status,
        2,
        `unavailable required component did not fail closed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
      assert.doesNotMatch(result.stdout, /✅ Quality scan complete\./);

      const metrics = readMetricsArtifact(artifactDir);
      assert.equal(metrics.scanCompleteness.overall, "failed");
      assert.deepEqual(
        metrics.scanCompleteness.capabilities.map((result) => [
          result.capabilityId,
          result.status
        ]),
        [
          ["file-metrics", "failed"],
          ["function-metrics", "succeeded"],
          ["duplicate-detection", "skipped"]
        ]
      );
      const fileMetrics = metrics.scanCompleteness.capabilities.find(
        (result) => result.capabilityId === "file-metrics"
      );
      assert.equal(fileMetrics?.status, "failed");
      assert.ok(fileMetrics?.status === "failed");
      assert.equal(fileMetrics.diagnostic.kind, "unavailable");
      assert.equal(typeof fileMetrics.diagnostic.message, "string");
      assert.equal(typeof fileMetrics.diagnostic.action, "string");
      assert.match(result.stdout, /Scan completeness: failed/);
      assert.match(result.stdout, /file-metrics: failed/);
      assert.ok(result.stdout.includes(fileMetrics.diagnostic.message));
      assert.ok(result.stdout.includes(fileMetrics.diagnostic.action));
      assert.match(result.stderr, /Incomplete current measurements:/);
      assert.doesNotMatch(result.stderr, /Fatal quality scan issues:/);
      assert.ok(result.stderr.includes(fileMetrics.diagnostic.message));
      assert.ok(result.stderr.includes(fileMetrics.diagnostic.action));

      const report = readFileSync(join(artifactDir, "report.md"), "utf8");
      assert.match(report, /Overall.*`failed`/);
      assert.match(report, /file-metrics.*`failed`/);
      assert.ok(report.includes(fileMetrics.diagnostic.message));
      assert.ok(report.includes(fileMetrics.diagnostic.action));
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });
});

interface CommandResult {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

function runConfiguredFixture(
  configPath = ".vibe-check/config.json",
  extraArgs: readonly string[] = []
): CommandResult {
  return runProductCli([
    "scan",
    fixtureRoot,
    "--config",
    configPath,
    "--skip-baseline",
    ...extraArgs
  ], {
    ...configuredScannerEnvironment(fixtureRoot)
  });
}

function runProductCli(
  args: readonly string[],
  environment: NodeJS.ProcessEnv = {}
): CommandResult {
  const result = spawnSync(
    process.execPath,
    ["run", "--silent", "product:cli", "--", ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, ...environment }
    }
  );

  assert.equal(result.error, undefined);
  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout
  };
}

function assertCommandSucceeded(result: CommandResult, label: string): void {
  assert.equal(
    result.status,
    0,
    `${label} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

function readFixtureMetrics(): MachineMetricsV1 {
  return readMetricsArtifact(fixtureArtifactDir);
}

function readMetricsArtifact(artifactDir: string): MachineMetricsV1 {
  const validation = validateMachineArtifactSetV1({
    metricsJson: readFileSync(resolve(artifactDir, "metrics.json")),
    warningsAllNdjson: readFileSync(
      resolve(artifactDir, "warnings-all.ndjson")
    ),
    warningsNdjson: readFileSync(resolve(artifactDir, "warnings.ndjson"))
  });
  if (!validation.ok) assert.fail(JSON.stringify(validation.diagnostic));
  return validation.value.metrics;
}

function stableScanEvidence(metrics: MachineMetricsV1): unknown {
  return {
    aggregates: metrics.aggregates,
    duplicateCode: metrics.duplicateCode,
    fileMetrics: metrics.fileMetrics,
    fingerprints: metrics.currentFingerprints,
    functionMetrics: metrics.functionMetrics,
    scanCompleteness: metrics.scanCompleteness,
    scope: metrics.metadata.scope,
    tools: metrics.metadata.tools,
    version: metrics.metadata.configVersion,
    warnings: metrics.warnings
  };
}

function cleanupFixtureOutput(): void {
  rmSync(resolve(fixtureRoot, "artifacts"), { force: true, recursive: true });
  rmSync(resolve(fixtureRoot, ".cache"), { force: true, recursive: true });
}

function writeFixtureFile(rootDir: string, relPath: string, content: string): void {
  const absPath = join(rootDir, relPath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content, "utf8");
}

function writeControlledLizard(
  rootDir: string,
  mode: "execution" | "invalid" | "zero"
): string {
  const scriptPath = join(rootDir, "tools", "completeness-lizard.ts");
  writeFixtureFile(
    rootDir,
    "tools/completeness-lizard.ts",
    [
      "#!/usr/bin/env bun",
      `const mode = ${JSON.stringify(mode)};`,
      "if (process.argv.includes(\"--version\")) {",
      "  console.log(\"lizard 1.17.10\");",
      "} else if (mode === \"zero\") {",
      "  console.log(\"NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line\");",
      "} else if (mode === \"execution\") {",
      "  console.error(\"controlled Lizard execution failure\");",
      "  process.exitCode = 7;",
      "} else if (mode === \"invalid\") {",
      "  console.log(\"NLOC,CCN,token count,parameter count\");",
      "  console.log(\"12,4\");",
      "} else {",
      "  throw new Error(`unexpected controlled Lizard mode: ${mode ?? \"missing\"}`);",
      "}",
      ""
    ].join("\n")
  );
  chmodSync(scriptPath, 0o755);
  if (process.platform !== "win32") return scriptPath;

  const commandPath = join(rootDir, "tools", "completeness-lizard.cmd");
  writeFileSync(
    commandPath,
    '@echo off\nbun "%~dp0completeness-lizard.ts" %*\n',
    "utf8"
  );
  return commandPath;
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
      cyclomaticComplexity: { absoluteFloor: number };
      codeLines: {
        absoluteFloor: number;
        lowComplexityAllowance: { codeLineFloor: number };
      };
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

function configuredScannerEnvironment(_projectRoot: string): NodeJS.ProcessEnv {
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

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

import { DEFAULT_CONFIG } from "./config.ts";
import {
  validateMetrics,
  type QualityMetrics
} from "./quality-core/src/index.ts";

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
      assert.equal(firstMetrics.metadata.configVersion, "configured-typescript-1");
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
      const second = runConfiguredFixture("../configured-typescript/vibe-check.config.json");
      assertCommandSucceeded(second, "second configured fixture scan");
      assert.deepEqual(stableScanEvidence(readFixtureMetrics()), stableFirst);

      cleanupFixtureOutput();
      const overridden = runConfiguredFixture(
        resolve(fixtureRoot, "vibe-check.config.json"),
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
    const artifactDir = join(projectRoot, "artifacts/should-not-exist");
    const configPath = join(projectRoot, "invalid.json");

    try {
      writeFixtureFile(
        projectRoot,
        "scanner.ts",
        `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(markerPath)}, "started");\n`
      );
      const config = JSON.parse(
        readFileSync(resolve(fixtureRoot, "vibe-check.config.json"), "utf8")
      ) as Record<string, unknown>;
      config.artifactDir = "artifacts/should-not-exist";
      config.tools = {
        jscpd: { args: ["scanner.ts"], command: "bun" },
        lizard: { args: ["scanner.ts"], command: "bun" },
        scc: { args: ["scanner.ts"], command: "bun" }
      };
      config.unexpected = true;
      writeFileSync(configPath, JSON.stringify(config), "utf8");

      const invalid = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "invalid.json",
        "--skip-baseline"
      ]);
      assert.equal(invalid.status, 3);
      assert.equal(invalid.stdout, "");
      assert.match(invalid.stderr, /Fatal error in quality scan: failed to load config/);
      assert.ok(invalid.stderr.includes(configPath));
      assert.equal(existsSync(markerPath), false);
      assert.equal(existsSync(artifactDir), false);

      delete config.unexpected;
      (config.report as Record<string, unknown>).timeZone = "Not/A_Real_Zone";
      writeFileSync(configPath, JSON.stringify(config), "utf8");
      const invalidTimeZone = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "invalid.json",
        "--skip-baseline"
      ]);
      assert.equal(invalidTimeZone.status, 3);
      assert.equal(invalidTimeZone.stdout, "");
      assert.match(invalidTimeZone.stderr, /config\.report\.timeZone must be a valid time zone/);
      assert.equal(existsSync(markerPath), false);
      assert.equal(existsSync(artifactDir), false);

      const missing = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "missing.json"
      ]);
      assert.equal(missing.status, 3);
      assert.equal(missing.stdout, "");
      assert.ok(missing.stderr.includes(join(projectRoot, "missing.json")));
      assert.equal(existsSync(markerPath), false);
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

      const metrics = JSON.parse(
        readFileSync(join(artifactDir, "metrics.json"), "utf8")
      ) as {
        metadata?: {
          configVersion?: unknown;
          tools?: Array<{ name?: unknown; version?: unknown }>;
        };
      };
      assert.equal(metrics.metadata?.configVersion, DEFAULT_CONFIG.version);
      assert.equal(
        metrics.metadata?.tools?.find((tool) => tool.name === "scc")?.version,
        "scc version 3.7.0"
      );
    } finally {
      rmSync(projectRoot, { force: true, recursive: true });
    }
  });

  it("returns a warning without a quality verdict when no capability has eligible input", { timeout: 30_000 }, () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-empty-scan-"));
    const projectRoot = join(tempRoot, "configured-project");
    const configPath = join(projectRoot, "vibe-check.config.json");
    const artifactDir = join(projectRoot, "artifacts/configured-scan");

    try {
      cpSync(fixtureRoot, projectRoot, { recursive: true });
      const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
      config.include = ["missing/**/*.ts"];
      config.acceptedWarnings = [
        {
          metric: "duplicate-tokens",
          reason: "stale acceptance should not be evaluated for an empty scan",
          ruleId: "jscpd-duplicate-code",
          sourceTool: "jscpd",
          value: 999
        }
      ];
      config.tools = {
        jscpd: { args: [], command: join(projectRoot, "tools", "missing-jscpd") },
        lizard: { args: [], command: join(projectRoot, "tools", "missing-lizard") },
        scc: { args: [], command: join(projectRoot, "tools", "missing-scc") }
      };
      writeFileSync(configPath, JSON.stringify(config), "utf8");

      const result = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "vibe-check.config.json",
        "--profile",
        "full",
        "--skip-baseline"
      ]);

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
    const configPath = join(projectRoot, "vibe-check.config.json");
    const artifactDir = join(projectRoot, "artifacts/configured-scan");

    try {
      cpSync(fixtureRoot, projectRoot, { recursive: true });
      writeControlledLizard(projectRoot);
      const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
      const tools = config.tools as Record<string, { args: string[]; command: string }>;
      tools.lizard = {
        args: ["tools/completeness-lizard.ts", "zero"],
        command: "bun"
      };
      tools.jscpd = {
        args: [],
        command: join(projectRoot, "tools", "missing-jscpd")
      };
      raiseWarningFloors(config);
      writeFileSync(configPath, JSON.stringify(config), "utf8");

      const result = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "vibe-check.config.json",
        "--profile",
        "quick",
        "--skip-baseline"
      ]);

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
      const configPath = join(projectRoot, "vibe-check.config.json");
      const artifactDir = join(projectRoot, "artifacts/configured-scan");

      try {
        cpSync(fixtureRoot, projectRoot, { recursive: true });
        writeControlledLizard(projectRoot);
        const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
        const tools = config.tools as Record<string, { args: string[]; command: string }>;
        tools.lizard = {
          args: ["tools/completeness-lizard.ts", variant.mode],
          command: "bun"
        };
        raiseWarningFloors(config);
        writeFileSync(configPath, JSON.stringify(config), "utf8");

        const result = runProductCli([
          "scan",
          projectRoot,
          "--config",
          "vibe-check.config.json",
          "--profile",
          "quick",
          "--skip-baseline"
        ]);

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
    const configPath = join(projectRoot, "vibe-check.config.json");
    const artifactDir = join(projectRoot, "artifacts/configured-scan");

    try {
      cpSync(fixtureRoot, projectRoot, { recursive: true });
      const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
      const tools = config.tools as Record<string, { args: string[]; command: string }>;
      tools.scc = {
        args: [],
        command: join(projectRoot, "tools", "missing-scc")
      };
      raiseWarningFloors(config);
      writeFileSync(configPath, JSON.stringify(config), "utf8");

      const result = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "vibe-check.config.json",
        "--profile",
        "quick",
        "--skip-baseline"
      ]);

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
  configPath = "vibe-check.config.json",
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
    VIBE_CHECK_JSCPD_ARGS: "not-json",
    VIBE_CHECK_JSCPD_CMD: "must-not-replace-explicit-jscpd",
    VIBE_CHECK_LIZARD_CMD: "must-not-replace-explicit-lizard",
    VIBE_CHECK_SCC_ARGS: "not-json",
    VIBE_CHECK_SCC_CMD: "must-not-replace-explicit-scc"
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

function readFixtureMetrics(): QualityMetrics {
  return readMetricsArtifact(fixtureArtifactDir);
}

function readMetricsArtifact(artifactDir: string): QualityMetrics {
  const input = JSON.parse(
    readFileSync(resolve(artifactDir, "metrics.json"), "utf8")
  ) as unknown;
  const validation = validateMetrics(input);
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.valid, true);
  return input as QualityMetrics;
}

function stableScanEvidence(metrics: QualityMetrics): unknown {
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

function writeControlledLizard(rootDir: string): void {
  writeFixtureFile(
    rootDir,
    "tools/completeness-lizard.ts",
    [
      "const mode = process.argv[2];",
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

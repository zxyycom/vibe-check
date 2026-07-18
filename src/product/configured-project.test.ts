import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
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

// @case BB-CLI-CONFIG-FILE-001
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
          ["scc", "scc version 3.7.0"],
          ["jscpd", "5.0.11"]
        ]
      );
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
      assert.match(
        readFileSync(resolve(fixtureArtifactDir, "report.md"), "utf8"),
        /^# Configured TypeScript Fixture Quality/
      );

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
  const input = JSON.parse(
    readFileSync(resolve(fixtureArtifactDir, "metrics.json"), "utf8")
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

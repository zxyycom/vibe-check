import { strict as assert } from "node:assert";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

import {
  assertCommandSucceeded,
  cleanupFixtureOutput,
  fixtureArtifactDir,
  fixtureRoot,
  readFixtureMetrics,
  runConfiguredFixture,
  runProductCli,
  stableScanEvidence,
  writeFixtureFile
} from "./configured-project-test-support.ts";

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
      assert.match(
        invalid.stderr,
        /Fatal error in quality scan: selected explicit config: failed to load config/
      );
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
});

import { strict as assert } from "node:assert";
import {
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  assertCommandSucceeded,
  configuredScannerEnvironment,
  createConfiguredProjectFixture,
  readMetricsArtifact,
  raiseWarningFloors,
  runProductCli,
  writeControlledLizard
} from "./configured-project-test-support.ts";

describe("formal CLI configured scan completeness", () => {
  it("returns a warning without a quality verdict when no capability has eligible input", { timeout: 30_000 }, () => {
    const { artifactDir, configPath, projectRoot, tempRoot } =
      createConfiguredProjectFixture("vibe-check-empty-scan-");
    const markerPath = join(projectRoot, "scanner-started");
    const markerScannerPath = join(projectRoot, "tools", "operational-marker.ts");
    const cacheDir = join(projectRoot, ".cache/configured-scan");

    try {
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
      assert.equal(
        invalidOperational.stdout,
        `Config: explicit ${configPath}\n`
      );
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
    const { artifactDir, configPath, projectRoot, tempRoot } =
      createConfiguredProjectFixture("vibe-check-zero-findings-");

    try {
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
      const { artifactDir, configPath, projectRoot, tempRoot } =
        createConfiguredProjectFixture(`vibe-check-lizard-${variant.mode}-`);

      try {
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
    const { artifactDir, configPath, projectRoot, tempRoot } =
      createConfiguredProjectFixture("vibe-check-unavailable-component-");

    try {
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

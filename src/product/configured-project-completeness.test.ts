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
  readMachinePublication,
  raiseWarningFloors,
  runProductCli,
  writeControlledLizard
} from "./configured-project-test-support.ts";

describe("formal CLI configured scan completeness", () => {
  it("returns a warning when all selected Checks are not applicable", { timeout: 30_000 }, () => {
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
      assert.match(result.stdout, /Snapshot completeness: complete/);
      assert.match(result.stdout, /Records: 0/);
      assert.doesNotMatch(result.stdout, /Quality check status: passed/);
      assert.doesNotMatch(result.stdout, /✅ Quality scan complete\./);

      const machine = readMachinePublication(artifactDir);
      assert.equal(machine.run.completeness.status, "complete");
      assert.deepEqual(machine.records, []);
      assert.deepEqual(
        machine.run.runs.map((run) => [run.checkId, run.status, run.result?.verdict]),
        [
          ["duplicate-detection", "completed", "not-applicable"],
          ["file-metrics", "completed", "not-applicable"],
          ["function-metrics", "completed", "not-applicable"]
        ]
      );

      const report = readFileSync(join(artifactDir, "report.md"), "utf8");
      assert.match(report, /Snapshot completeness\*\*: complete/);
      assert.match(report, /file-metrics`: completed \/ not-applicable/);
      assert.match(report, /function-metrics`: completed \/ not-applicable/);
      assert.match(report, /duplicate-detection`: completed \/ not-applicable/);
      assert.match(report, /## Unaccepted records\n\nNone\./);
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

      const machine = readMachinePublication(artifactDir);
      const functionRun = machine.run.runs.find(
        (run) => run.checkId === "function-metrics"
      );
      const duplicateRun = machine.run.runs.find(
        (run) => run.checkId === "duplicate-detection"
      );
      assert.deepEqual(functionRun?.result, { verdict: "passed" });
      assert.equal(duplicateRun?.status, "skipped");
      assert.equal(machine.run.completeness.status, "complete");
      assert.deepEqual(machine.records, []);

      assert.match(result.stdout, /Snapshot completeness: complete/);
      assert.match(result.stdout, /Quality check status: passed/);
      assert.doesNotMatch(result.stdout, /Snapshot completeness: incomplete/);
      assert.doesNotMatch(result.stdout, /jscpd validation failed/);

      const report = readFileSync(join(artifactDir, "report.md"), "utf8");
      assert.match(report, /Snapshot completeness\*\*: complete/);
      assert.match(report, /function-metrics`: completed \/ passed/);
      assert.match(report, /duplicate-detection`: skipped/);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("projects Lizard execution and invalid-result failures consistently", { timeout: 30_000 }, () => {
    const variants = [
      { diagnosticKind: "execution-failed", mode: "execution" },
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

        const machine = readMachinePublication(artifactDir);
        const functionRun = machine.run.runs.find(
          (run) => run.checkId === "function-metrics"
        );
        assert.equal(functionRun?.status, "failed");
        assert.equal(functionRun?.diagnostic?.category, variant.diagnosticKind);
        assert.equal(machine.run.completeness.status, "incomplete");

        assert.match(result.stdout, /Snapshot completeness: incomplete/);
        assert.equal(result.stderr, "");
        assert.doesNotMatch(result.stdout, /Quality check status: passed/);
        assert.doesNotMatch(result.stdout, /✅ Quality scan complete\./);

        const report = readFileSync(join(artifactDir, "report.md"), "utf8");
        assert.match(report, /Snapshot completeness\*\*: incomplete/);
        assert.match(report, /function-metrics`: failed/);
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

      const machine = readMachinePublication(artifactDir);
      assert.equal(machine.run.completeness.status, "incomplete");
      assert.deepEqual(
        machine.run.runs.map((run) => [
          run.checkId,
          run.status
        ]),
        [
          ["duplicate-detection", "skipped"],
          ["file-metrics", "failed"],
          ["function-metrics", "completed"]
        ]
      );
      const fileRun = machine.run.runs.find(
        (run) => run.checkId === "file-metrics"
      );
      assert.equal(fileRun?.status, "failed");
      assert.equal(fileRun?.diagnostic?.category, "unavailable");
      assert.match(result.stdout, /Snapshot completeness: incomplete/);
      assert.equal(result.stderr, "");

      const report = readFileSync(join(artifactDir, "report.md"), "utf8");
      assert.match(report, /Snapshot completeness\*\*: incomplete/);
      assert.match(report, /file-metrics`: failed/);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });
});

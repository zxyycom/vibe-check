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

import { loadSemanticProjectConfig } from "./config-file.ts";
import { resolveProjectConfigPaths } from "./config-paths.ts";
import { NeutralProjectConfig } from "./config.ts";
import {
  readMachinePublication,
  stableScanEvidence
} from "./configured-project-test-support.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");

describe("formal CLI project configuration workflow", () => {
  it("observes a clean project with neutral defaults and requires file policy for a gate", { timeout: 30_000 }, () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-config-workflow-"));
    const projectRoot = join(tempRoot, "configured-project");
    const paths = resolveProjectConfigPaths(projectRoot);
    const artifactDir = join(projectRoot, NeutralProjectConfig.artifactDir);
    const cacheDir = join(projectRoot, NeutralProjectConfig.cacheDir);
    const markerPath = join(tempRoot, "gate-scanner-started");
    const markerScannerPath = join(tempRoot, "gate-marker-scanner.ts");
    const scanArgs = [
      "scan",
      projectRoot,
      "--profile",
      "quick",
      "--skip-baseline"
    ] as const;

    try {
      cpSync(fixtureRoot, projectRoot, { recursive: true });
      rmSync(paths.directoryPath, { force: true, recursive: true });
      rmSync(artifactDir, { force: true, recursive: true });
      rmSync(cacheDir, { force: true, recursive: true });

      const neutral = runProductCli(
        scanArgs,
        configuredScannerEnvironment(projectRoot)
      );
      assertCommandSucceeded(neutral, "neutral default observation");
      assert.equal(neutral.stderr, "");
      assert.ok(neutral.stdout.startsWith("Config: default (not persisted)\n"));

      const neutralPublication = readMachinePublication(artifactDir);
      assert.equal(neutralPublication.run.completeness.status, "complete");
      assert.equal(neutralPublication.run.integrity.status, "valid");

      rmSync(artifactDir, { force: true, recursive: true });
      rmSync(cacheDir, { force: true, recursive: true });
      writeFileSync(
        markerScannerPath,
        `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(markerPath)}, "started");\n`,
        "utf8"
      );
      const gated = runProductCli([...scanArgs, "--gate", "all"], {
        VIBE_CHECK_SCC_ARGS: JSON.stringify([markerScannerPath]),
        VIBE_CHECK_SCC_CMD: process.execPath
      });
      assert.equal(gated.status, 3);
      assert.equal(gated.stdout, "");
      assert.ok(gated.stderr.includes(paths.configPath));
      assert.match(gated.stderr, /quality gate requires a complete file-backed policy/);
      assert.match(gated.stderr, /product:cli -- init/);
      assert.match(gated.stderr, /--config <file>/);
      assert.equal(existsSync(markerPath), false);
      assert.equal(existsSync(cacheDir), false);
      assert.equal(existsSync(artifactDir), false);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("materializes the neutral default and discovers equivalent runtime inputs without trusting sibling schema", { timeout: 30_000 }, async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-config-init-"));
    const projectRoot = join(tempRoot, "configured-project");
    const paths = resolveProjectConfigPaths(projectRoot);
    const artifactDir = join(projectRoot, NeutralProjectConfig.artifactDir);
    const scanArgs = [
      "scan",
      projectRoot,
      "--profile",
      "quick",
      "--skip-baseline"
    ] as const;

    try {
      cpSync(fixtureRoot, projectRoot, { recursive: true });
      rmSync(paths.directoryPath, { force: true, recursive: true });
      rmSync(artifactDir, { force: true, recursive: true });
      rmSync(join(projectRoot, NeutralProjectConfig.cacheDir), {
        force: true,
        recursive: true
      });

      const neutral = runProductCli(
        scanArgs,
        configuredScannerEnvironment(projectRoot)
      );
      assertCommandSucceeded(neutral, "neutral default equivalence source");
      assert.equal(neutral.stderr, "");
      assert.ok(neutral.stdout.startsWith("Config: default (not persisted)\n"));

      const neutralPublication = readMachinePublication(artifactDir);
      const neutralReport = readFileSync(join(artifactDir, "report.md"), "utf8");
      assert.equal(neutralPublication.run.completeness.status, "complete");
      assert.equal(
        neutralPublication.records.every((record) =>
          record.location === null || [
            "excluded/ignored.ts",
            "src/eligible.ts",
            "tools/controlled-scanner.ts"
          ].includes(record.location.path)
        ),
        true
      );
      assert.ok(neutralReport.startsWith(`# ${NeutralProjectConfig.report.title}\n`));
      assert.ok(neutralReport.includes("## Check runs"));
      assert.ok(neutralReport.includes("## Unaccepted records"));
      assert.ok(neutralReport.includes("## Accepted records"));

      const initialized = runProductCli(["init", projectRoot]);
      assertCommandSucceeded(initialized, "neutral project initialization");
      assert.equal(initialized.stderr, "");
      assert.equal(
        initialized.stdout,
        `Config: ${paths.configPath}\n` +
          `Schema: ${paths.schemaPath}\n` +
          "State: discovery-ready\n"
      );
      const persistedConfigBytes = readFileSync(paths.configPath);
      const persistedSchemaBytes = readFileSync(paths.schemaPath);

      rmSync(paths.schemaPath);
      const supplemented = runProductCli(["init", projectRoot]);
      assertCommandSucceeded(supplemented, "missing schema supplementation");
      assert.equal(supplemented.stderr, "");
      assert.equal(
        supplemented.stdout,
        `Config: ${paths.configPath}\n` +
          `Schema: ${paths.schemaPath}\n` +
          "State: discovery-ready\n"
      );
      assert.deepEqual(readFileSync(paths.configPath), persistedConfigBytes);
      assert.deepEqual(readFileSync(paths.schemaPath), persistedSchemaBytes);

      const repeated = runProductCli(["init", projectRoot]);
      assertCommandSucceeded(repeated, "complete initialization repeat");
      assert.equal(repeated.stderr, "");
      assert.equal(
        repeated.stdout,
        `Config: ${paths.configPath}\n` +
          `Schema: ${paths.schemaPath}\n` +
          "State: discovery-ready\n"
      );
      assert.deepEqual(readFileSync(paths.configPath), persistedConfigBytes);
      assert.deepEqual(readFileSync(paths.schemaPath), persistedSchemaBytes);

      writeFileSync(paths.schemaPath, "{ invalid sibling editor schema\n", "utf8");
      assert.deepEqual(
        await loadSemanticProjectConfig(paths.configPath),
        NeutralProjectConfig
      );

      const discovered = runProductCli(
        scanArgs,
        configuredScannerEnvironment(projectRoot)
      );
      assertCommandSucceeded(discovered, "initialized discovered observation");
      assert.equal(discovered.stderr, "");
      assert.ok(
        discovered.stdout.startsWith(`Config: discovered ${paths.configPath}\n`)
      );

      const discoveredPublication = readMachinePublication(artifactDir);
      const discoveredReport = readFileSync(
        join(artifactDir, "report.md"),
        "utf8"
      );
      assert.deepEqual(
        stableScanEvidence(discoveredPublication),
        stableScanEvidence(neutralPublication)
      );
      assert.equal(
        stableReportEvidence(discoveredReport),
        stableReportEvidence(neutralReport)
      );
      assert.deepEqual(readFileSync(paths.configPath), persistedConfigBytes);
      assert.equal(
        readFileSync(paths.schemaPath, "utf8"),
        "{ invalid sibling editor schema\n"
      );
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

function stableReportEvidence(report: string): string {
  return report
    .replace(/^- \*\*Timestamp\*\*: .*$/m, "- **Timestamp**: <timestamp>")
    .replace(/^- \*\*Invocation\*\*: .*$/m, "- **Invocation**: <invocation>")
    .replace(
      /^\*Report generated at .* by (.+)\*$/m,
      "*Report generated at <timestamp> by $1*"
    );
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

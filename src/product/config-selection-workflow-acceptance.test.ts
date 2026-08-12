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

import { resolveProjectConfigPaths } from "./config-paths.ts";
import { NeutralProjectConfig } from "./config.ts";
import {
  readMachinePublication
} from "./configured-project-test-support.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");

describe("formal CLI project configuration workflow", () => {
  it("keeps explicit selection authoritative and invalid explicit files final", { timeout: 30_000 }, () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-config-precedence-"));
    const projectRoot = join(tempRoot, "configured-project");
    const paths = resolveProjectConfigPaths(projectRoot);
    const explicitConfigPath = join(projectRoot, "policy", "explicit.json");
    const invalidConfigPath = join(projectRoot, "policy", "invalid.json");
    const explicitArtifactDir = join(projectRoot, "artifacts/explicit-scan");
    const discoveredArtifactDir = join(projectRoot, "artifacts/configured-scan");
    const explicitDocument = {
      ...structuredClone(NeutralProjectConfig),
      artifactDir: "artifacts/explicit-scan",
      include: ["src/eligible.ts"],
      report: {
        ...structuredClone(NeutralProjectConfig.report),
        title: "Explicit project policy report",
        topN: 1
      }
    };

    try {
      cpSync(fixtureRoot, projectRoot, { recursive: true });
      rmSync(join(projectRoot, "artifacts"), { force: true, recursive: true });
      rmSync(join(projectRoot, ".cache"), { force: true, recursive: true });
      writeFixtureFile(
        projectRoot,
        "policy/explicit.json",
        `${JSON.stringify(explicitDocument, null, 2)}\n`
      );
      writeFixtureFile(
        projectRoot,
        "policy/invalid.json",
        `${JSON.stringify({ ...explicitDocument, unexpected: true }, null, 2)}\n`
      );
      const discoveredBytes = readFileSync(paths.configPath);
      const explicitBytes = readFileSync(explicitConfigPath);
      const invalidBytes = readFileSync(invalidConfigPath);

      const explicit = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "policy/explicit.json",
        "--profile",
        "quick",
        "--skip-baseline"
      ], configuredScannerEnvironment(projectRoot));
      assertCommandSucceeded(explicit, "explicit-over-discovered observation");
      assert.equal(explicit.stderr, "");
      assert.ok(
        explicit.stdout.startsWith(`Config: explicit ${explicitConfigPath}\n`)
      );
      assert.equal(existsSync(discoveredArtifactDir), false);

      const explicitPublication = readMachinePublication(explicitArtifactDir);
      assert.equal(explicitPublication.run.completeness.status, "complete");
      assert.equal(
        explicitPublication.records.every(
          (record) =>
            record.location?.path === "src/eligible.ts" &&
            record.fields.codeArea === "project"
        ),
        true
      );
      assert.deepEqual(
        explicitPublication.run.runs
          .filter(({ checkId }) => checkId !== "duplicate-detection")
          .map(({ checkId, coverage, status }) => [checkId, coverage, status]),
        [
          ["file-metrics", { acknowledgedWorkCount: 1, plannedWorkCount: 1 }, "completed"],
          ["function-metrics", { acknowledgedWorkCount: 1, plannedWorkCount: 1 }, "completed"]
        ]
      );
      const explicitReport = readFileSync(
        join(explicitArtifactDir, "report.md"),
        "utf8"
      );
      assert.match(explicitReport, /^# Explicit project policy report$/m);
      assert.match(explicitReport, /^## Check runs$/m);
      assert.deepEqual(readFileSync(paths.configPath), discoveredBytes);
      assert.deepEqual(readFileSync(explicitConfigPath), explicitBytes);
      assert.deepEqual(readFileSync(invalidConfigPath), invalidBytes);

      rmSync(join(projectRoot, "artifacts"), { force: true, recursive: true });
      rmSync(join(projectRoot, ".cache"), { force: true, recursive: true });
      const invalid = runProductCli([
        "scan",
        projectRoot,
        "--config",
        "policy/invalid.json",
        "--profile",
        "quick",
        "--skip-baseline"
      ], configuredScannerEnvironment(projectRoot));
      assert.equal(invalid.status, 3);
      assert.equal(invalid.stdout, "");
      assert.match(invalid.stderr, /selected explicit config/);
      assert.ok(invalid.stderr.includes(invalidConfigPath));
      assert.match(invalid.stderr, /config\.unexpected is not allowed/);
      assert.equal(existsSync(explicitArtifactDir), false);
      assert.equal(existsSync(discoveredArtifactDir), false);
      assert.deepEqual(readFileSync(paths.configPath), discoveredBytes);
      assert.deepEqual(readFileSync(explicitConfigPath), explicitBytes);
      assert.deepEqual(readFileSync(invalidConfigPath), invalidBytes);
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

function writeFixtureFile(rootDir: string, relPath: string, content: string): void {
  const absPath = join(rootDir, relPath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content, "utf8");
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

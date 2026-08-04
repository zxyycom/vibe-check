import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  validateMachineArtifactSetV1,
  type MachineMetricsV1,
  type MachineWarningV1
} from "./machine-output.ts";

export interface CommandResult {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

export interface FixtureProject {
  readonly projectRoot: string;
  readonly tempRoot: string;
}

export interface FormalEntryArtifacts {
  readonly metrics: MachineMetricsV1;
  readonly report: string;
  readonly warnings: readonly MachineWarningV1[];
  readonly warningsAll: readonly MachineWarningV1[];
}

export function createFixtureProject(
  fixtureRoot: string,
  label: string
): FixtureProject {
  const tempRoot = mkdtempSync(join(tmpdir(), `vibe-check-gate-${label}-`));
  const projectRoot = join(tempRoot, "configured-project");
  cpSync(fixtureRoot, projectRoot, { recursive: true });
  return { projectRoot, tempRoot };
}

export function readFixtureConfig(projectRoot: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(projectRoot, ".vibe-check", "config.json"), "utf8")
  ) as Record<string, unknown>;
}

export function writeFixtureConfig(
  projectRoot: string,
  config: Record<string, unknown>
): void {
  writeFileSync(
    join(projectRoot, ".vibe-check", "config.json"),
    JSON.stringify(config),
    "utf8"
  );
}

export function setFixtureCacheDir(projectRoot: string, cacheDir: string): void {
  const config = readFixtureConfig(projectRoot);
  config.cacheDir = cacheDir;
  writeFixtureConfig(projectRoot, config);
}

export function setFixtureWarningPolicy(
  projectRoot: string,
  warningPolicy: string
): void {
  const config = readFixtureConfig(projectRoot);
  const codeAreas = config.codeAreas as Record<string, { warningPolicy: string }>;
  codeAreas["fixture-app"]!.warningPolicy = warningPolicy;
  writeFixtureConfig(projectRoot, config);
}

export function runFormalGateScan(
  repoRoot: string,
  projectRoot: string,
  args: readonly string[]
): CommandResult {
  assert.equal(args.includes("--gate"), true);
  const result = spawnSync(
    process.execPath,
    [
      "run", "--silent", "product:cli", "--", "scan", projectRoot,
      "--config", ".vibe-check/config.json", ...args
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ...configuredScannerEnvironment(),
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

export function readFormalEntryArtifacts(
  artifactDir: string
): FormalEntryArtifacts {
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
  const report = readFileSync(join(artifactDir, "report.md"), "utf8");

  assert.equal(metricsJson.toString("utf8"), JSON.stringify(metrics, null, 2));
  assert.deepEqual(warnings, metrics.warnings.changed);
  assert.deepEqual(warningsAll, metrics.warnings.all);
  assert.doesNotMatch(report, /vibe-check\.(?:metrics|warning)\.v1/);
  assert.equal(existsSync(join(artifactDir, "raw")), true);

  return { metrics, report, warnings, warningsAll };
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

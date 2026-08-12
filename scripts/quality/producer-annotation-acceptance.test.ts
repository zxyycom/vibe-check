import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
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

import { checks } from "../vibe-check-workspace/checks/definitions.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureRoot = join(repoRoot, "fixtures", "projects", "configured-typescript");
const acceptanceTestPath = "scripts/quality/producer-annotation-acceptance.test.ts";

describe("producer-to-annotation acceptance", () => {
  it("connects formal non-empty, zero-record, and invalid v2 artifact sets to the actual consumer", { timeout: 60_000 }, () => {
    const requiredChild = checks.find(({ id }) => id === "producer-annotation-acceptance");
    assert.deepEqual(
      requiredChild && {
        args: requiredChild.args,
        command: requiredChild.command,
        type: requiredChild.type
      },
      {
        args: ["test", acceptanceTestPath],
        command: "bun",
        type: "required"
      }
    );

    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-producer-annotation-"));
    const warningProject = join(tempRoot, "warning-project");
    const zeroProject = join(tempRoot, "zero-project");

    try {
      cpSync(fixtureRoot, warningProject, { recursive: true });
      cpSync(fixtureRoot, zeroProject, { recursive: true });

      const warningScan = runProductCli(warningProject);
      assertSucceeded(warningScan, "non-empty producer");
      const warningArtifacts = artifactDirectory(warningProject);
      const warningRecords = readFileSync(join(warningArtifacts, "records.ndjson"));
      assert.ok(warningRecords.byteLength > 0);
      assert.ok(readFileSync(join(warningArtifacts, "run.json")).byteLength > 0);

      const warningAnnotation = runAnnotationCli(warningArtifacts);
      assertSucceeded(warningAnnotation, "non-empty annotation consumer");
      assert.ok(annotationCommands(warningAnnotation.stdout).length > 0);
      assert.equal(warningAnnotation.stderr, "");

      selectNoInput(zeroProject);
      const zeroScan = runProductCli(zeroProject);
      assertSucceeded(zeroScan, "zero-record producer");
      const zeroArtifacts = artifactDirectory(zeroProject);
      assert.equal(readFileSync(join(zeroArtifacts, "records.ndjson")).byteLength, 0);
      assert.ok(readFileSync(join(zeroArtifacts, "run.json")).byteLength > 0);

      const zeroAnnotation = runAnnotationCli(zeroArtifacts);
      assertSucceeded(zeroAnnotation, "zero-record annotation consumer");
      assert.equal(zeroAnnotation.stdout, "");
      assert.equal(zeroAnnotation.stderr, "");

      const invalidRecord = JSON.parse(
        warningRecords.toString("utf8").split("\n")[0] ?? "null"
      ) as Record<string, unknown>;
      delete invalidRecord.schemaVersion;
      const validRecordCount = warningRecords.toString("utf8").split("\n").filter(Boolean).length;
      const invalidArtifacts = join(tempRoot, "invalid-artifacts");
      mkdirSync(invalidArtifacts);
      writeFileSync(join(invalidArtifacts, "run.json"), readFileSync(join(warningArtifacts, "run.json")));
      writeFileSync(
        join(invalidArtifacts, "records.ndjson"),
        Buffer.concat([
          warningRecords,
          Buffer.from(`${JSON.stringify(invalidRecord)}\n`, "utf8")
        ])
      );

      const invalidAnnotation = runAnnotationCli(invalidArtifacts);
      assert.equal(invalidAnnotation.status, 2);
      assert.equal(invalidAnnotation.stdout, "");
      assert.match(invalidAnnotation.stderr, /records\.ndjson: schema/i);
      assert.match(invalidAnnotation.stderr, new RegExp(`line ${validRecordCount + 1}\\b`));
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

function runProductCli(projectRoot: string): CommandResult {
  return runBun([
    "run",
    "--silent",
    "product:cli",
    "--",
    "scan",
    projectRoot,
    "--config",
    ".vibe-check/config.json",
    "--profile",
    "quick",
    "--skip-baseline"
  ], configuredScannerEnvironment());
}

function runAnnotationCli(artifactDirectory: string): CommandResult {
  return runBun([
    "run",
    "--silent",
    "quality:annotate",
    "--",
    artifactDirectory
  ]);
}

function runBun(
  args: readonly string[],
  environment: NodeJS.ProcessEnv = {}
): CommandResult {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...environment,
      VIBE_CHECK_QUALITY_TIMINGS: "0"
    }
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout
  };
}

function assertSucceeded(result: CommandResult, label: string): void {
  assert.equal(
    result.status,
    0,
    `${label} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

function artifactDirectory(projectRoot: string): string {
  return join(projectRoot, "artifacts", "configured-scan");
}

function selectNoInput(projectRoot: string): void {
  const configPath = join(projectRoot, ".vibe-check", "config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
  config.include = ["missing/**/*.ts"];
  writeFileSync(configPath, JSON.stringify(config), "utf8");
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

function annotationCommands(stdout: string): string[] {
  return stdout.split(/\r?\n/).filter((line) => line.startsWith("::warning "));
}

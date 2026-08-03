import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
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
  it("connects formal non-empty, zero-byte, and invalid producer streams to the actual consumer", { timeout: 60_000 }, () => {
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
      const warningStream = warningsPath(warningProject);
      const warningBytes = readFileSync(warningStream);
      assert.ok(warningBytes.byteLength > 0);

      const warningAnnotation = runAnnotationCli(warningStream);
      assertSucceeded(warningAnnotation, "non-empty annotation consumer");
      assert.ok(annotationCommands(warningAnnotation.stdout).length > 0);
      assert.equal(warningAnnotation.stderr, "");

      selectNoInput(zeroProject);
      const zeroScan = runProductCli(zeroProject);
      assertSucceeded(zeroScan, "zero-warning producer");
      const zeroStream = warningsPath(zeroProject);
      assert.equal(readFileSync(zeroStream).byteLength, 0);

      const zeroAnnotation = runAnnotationCli(zeroStream);
      assertSucceeded(zeroAnnotation, "zero-warning annotation consumer");
      assert.equal(zeroAnnotation.stdout, "");
      assert.equal(zeroAnnotation.stderr, "");

      const invalidWarning = JSON.parse(
        warningBytes.toString("utf8").split("\n")[0] ?? "null"
      ) as Record<string, unknown>;
      delete invalidWarning.schemaVersion;
      const validRecordCount = warningBytes.toString("utf8").split("\n").filter(Boolean).length;
      const invalidStream = join(tempRoot, "invalid-warnings.ndjson");
      writeFileSync(
        invalidStream,
        Buffer.concat([
          warningBytes,
          Buffer.from(`${JSON.stringify(invalidWarning)}\n`, "utf8")
        ])
      );

      const invalidAnnotation = runAnnotationCli(invalidStream);
      assert.equal(invalidAnnotation.status, 2);
      assert.equal(invalidAnnotation.stdout, "");
      assert.match(invalidAnnotation.stderr, /schema/i);
      assert.match(invalidAnnotation.stderr, new RegExp(`line ${validRecordCount + 1}\\b`));
      assert.match(invalidAnnotation.stderr, /\/schemaVersion/);
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
    "vibe-check.config.json",
    "--profile",
    "quick",
    "--skip-baseline"
  ]);
}

function runAnnotationCli(warnings: string): CommandResult {
  return runBun([
    "run",
    "--silent",
    "quality:annotate",
    "--",
    warnings
  ]);
}

function runBun(args: readonly string[]): CommandResult {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
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

function warningsPath(projectRoot: string): string {
  return join(
    projectRoot,
    "artifacts",
    "configured-scan",
    "warnings-all.ndjson"
  );
}

function selectNoInput(projectRoot: string): void {
  const configPath = join(projectRoot, "vibe-check.config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
  config.include = ["missing/**/*.ts"];
  writeFileSync(configPath, JSON.stringify(config), "utf8");
}

function annotationCommands(stdout: string): string[] {
  return stdout.split(/\r?\n/).filter((line) => line.startsWith("::warning "));
}

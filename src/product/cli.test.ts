import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { runProductCli } from "./cli.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("product CLI routing", () => {
  it("normalizes an explicit project root and passes scan flags through unchanged", async () => {
    const startupCwd = resolve(repoRoot, ".tmp", "cli-start");
    const calls: Array<{ argv: readonly string[]; projectRoot: string }> = [];
    const errors: string[] = [];

    const exitCode = await runProductCli(
      ["scan", "../target-project", "--profile", "quick", "--artifact-dir", "artifacts/quick"],
      {
        cwd: () => startupCwd,
        error: (message) => errors.push(message),
        scan: async (projectRoot, argv) => {
          calls.push({ argv, projectRoot });
          return "passed";
        }
      }
    );

    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(calls, [{
      argv: ["--profile", "quick", "--artifact-dir", "artifacts/quick"],
      projectRoot: resolve(startupCwd, "../target-project")
    }]);
  });

  it("uses the startup cwd when project root is omitted", async () => {
    const startupCwd = resolve(repoRoot, ".tmp", "cli-default-root");
    const calls: Array<{ argv: readonly string[]; projectRoot: string }> = [];

    const exitCode = await runProductCli(
      ["scan", "--profile", "full", "--skip-baseline"],
      {
        cwd: () => startupCwd,
        error: () => assert.fail("unexpected CLI error"),
        scan: async (projectRoot, argv) => {
          calls.push({ argv, projectRoot });
          return "warning";
        }
      }
    );

    assert.equal(exitCode, 0);
    assert.deepEqual(calls, [{
      argv: ["--profile", "full", "--skip-baseline"],
      projectRoot: startupCwd
    }]);
  });

  it("maps scan outcomes to the pinned process status contract", async () => {
    const cases = [
      ["passed", 0],
      ["warning", 0],
      ["failed", 2]
    ] as const;

    for (const [status, expectedExitCode] of cases) {
      const exitCode = await runProductCli(["scan"], {
        cwd: () => repoRoot,
        error: () => assert.fail("unexpected CLI error"),
        scan: async () => status
      });
      assert.equal(exitCode, expectedExitCode, status);
    }
  });

  it("writes top-level errors to stderr and preserves ordinary and special mappings", async () => {
    const cases: ReadonlyArray<{
      error: Error;
      expectedExitCode: 2 | 3;
    }> = [
      { error: new Error("ordinary failure"), expectedExitCode: 2 },
      { error: Object.assign(new Error("missing input"), { code: "ENOENT" }), expectedExitCode: 3 },
      { error: new Error("invalid config value"), expectedExitCode: 3 }
    ];

    for (const testCase of cases) {
      const errors: string[] = [];
      const exitCode = await runProductCli(["scan"], {
        cwd: () => repoRoot,
        error: (message) => errors.push(message),
        scan: async () => {
          throw testCase.error;
        }
      });

      assert.equal(exitCode, testCase.expectedExitCode, testCase.error.message);
      assert.deepEqual(errors, [`Fatal error in quality scan: ${testCase.error.message}`]);
    }
  });

  it("rejects unknown commands before starting a scan", async () => {
    const errors: string[] = [];
    let scanStarted = false;

    const exitCode = await runProductCli(["report"], {
      cwd: () => repoRoot,
      error: (message) => errors.push(message),
      scan: async () => {
        scanStarted = true;
        return "passed";
      }
    });

    assert.equal(exitCode, 2);
    assert.equal(scanStarted, false);
    assert.deepEqual(errors, ["Fatal error in quality scan: unknown command: report"]);
  });
});

describe("formal and dogfood entrypoints", () => {
  it("expose the same scan help through the product parser", () => {
    const formal = runBun([
      "run",
      "--silent",
      "product:cli",
      "--",
      "scan",
      repoRoot,
      "--help"
    ]);
    const dogfood = runBun(["scripts/quality/scan.ts", "--help"]);

    assertCommandSucceeded(formal, "formal product entry");
    assertCommandSucceeded(dogfood, "dogfood wrapper");
    assert.equal(formal.stdout, dogfood.stdout);
    assert.match(formal.stdout, /Usage: bun run product:cli -- scan \[project-root\] \[options\]/);
    assert.doesNotMatch(formal.stdout, /Usage: bun scripts\/quality\/scan\.ts/);
    assert.equal(formal.stderr, "");
    assert.equal(dogfood.stderr, "");
  });

  it("keeps the dogfood wrapper pointed only at the product CLI", () => {
    const wrapper = readFileSync(resolve(repoRoot, "scripts/quality/scan.ts"), "utf8");
    const packageJson = readFileSync(resolve(repoRoot, "package.json"), "utf8");

    assert.match(wrapper, /from "\.\.\/\.\.\/src\/product\/cli\.ts"/);
    assert.match(wrapper, /runProductCli\(\["scan", root, \.\.\.process\.argv\.slice\(2\)\]\)/);
    assert.doesNotMatch(wrapper, /parseArgs|runQualityScan|DEFAULT_CONFIG|qualityScanErrorExitCode/);
    assert.match(packageJson, /"quality:check": "bun scripts\/quality\/scan\.ts --profile quick --artifact-dir artifacts\/vibe-check-quality\/quick"/);
    assert.match(packageJson, /"quality:full-check": "bun scripts\/quality\/scan\.ts --profile full --with-baseline"/);
    assert.match(packageJson, /"quality:scan": "bun scripts\/quality\/scan\.ts"/);
  });
});

interface CommandResult {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

function runBun(args: readonly string[]): CommandResult {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8"
  });

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

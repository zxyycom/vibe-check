import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { runProductCli } from "./cli.ts";
import { getChangedFileList } from "./quality-core/src/input/files.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("product CLI routing", () => {
  it("normalizes an explicit project root and passes scan flags through unchanged", async () => {
    const startupCwd = resolve(repoRoot, ".tmp", "cli-start");
    const calls: Array<{ argv: readonly string[]; projectRoot: string }> = [];
    const errors: string[] = [];

    const exitCode = await runProductCli(
      [
        "scan",
        "../target-project",
        "--profile",
        "quick",
        "--changed-files",
        "inputs/changed.txt",
        "--artifact-dir",
        "artifacts/quick"
      ],
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
      argv: [
        "--profile",
        "quick",
        "--changed-files",
        "inputs/changed.txt",
        "--artifact-dir",
        "artifacts/quick"
      ],
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

// @case BB-CLI-CHANGED-FILES-001
describe("changed-files CLI contract", () => {
  it("maps wrapped read errors to ordinary and missing-input exits", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "docnav-quality-cli-errors-"));

    try {
      const cases = [
        { changedFiles: ".", expectedExitCode: 2 },
        { changedFiles: "missing.txt", expectedExitCode: 3 }
      ] as const;

      for (const testCase of cases) {
        const errors: string[] = [];
        const exitCode = await runProductCli(
          ["scan", projectRoot, "--changed-files", testCase.changedFiles],
          {
            cwd: () => repoRoot,
            error: (message) => errors.push(message),
            scan: async (root, argv) => {
              assert.deepEqual(argv, ["--changed-files", testCase.changedFiles]);
              getChangedFileList({ changedFiles: testCase.changedFiles }, root);
              return "passed";
            }
          }
        );

        assert.equal(exitCode, testCase.expectedExitCode, testCase.changedFiles);
        assert.equal(errors.length, 1);
        assert.match(
          errors[0] ?? "",
          /^Fatal error in quality scan: failed to read --changed-files/
        );
      }
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("exposes the same scan help through the product parser", () => {
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
    assert.match(formal.stdout, /relative paths use project root/);
    assert.match(formal.stdout, /Absolute list paths are kept; entries are project-relative/);
    assert.match(formal.stdout, /--config <file>/);
    assert.match(formal.stdout, /Complete JSON config; relative paths use project root/);
    assert.match(formal.stdout, /Omit to use built-in defaults; no discovery or merge is performed/);
    assert.doesNotMatch(formal.stdout, /Usage: bun scripts\/quality\/scan\.ts/);
    assert.equal(formal.stderr, "");
    assert.equal(dogfood.stderr, "");
  });

  it("resolves a relative changed-files list from an explicit project root", { timeout: 30_000 }, () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-cli-root-"));
    const projectRoot = join(tempDir, "project");

    try {
      initializeRepository(projectRoot);
      writeFixtureFile(projectRoot, "docs/example.md", "# Example\n");
      writeFixtureFile(projectRoot, "inputs/changed.txt", "docs/example.md\n");
      commitAll(projectRoot, "fixture");

      const result = runBun([
        "run",
        "--silent",
        "product:cli",
        "--",
        "scan",
        projectRoot,
        "--profile",
        "quick",
        "--changed-files",
        "inputs/changed.txt",
        "--artifact-dir",
        "artifacts/quality"
      ]);

      assertCommandSucceeded(result, "formal product entry with relative changed-files");
      assert.match(result.stdout, /Changed files in scan scope: 1/);
      assert.equal(result.stderr, "");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("formal and dogfood entrypoints", () => {
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

function writeFixtureFile(rootDir: string, relPath: string, content: string): void {
  const absPath = join(rootDir, relPath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content, "utf8");
}

function initializeRepository(repository: string): void {
  mkdirSync(repository, { recursive: true });
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.email", "quality-test@example.invalid"]);
  git(repository, ["config", "user.name", "Quality Test"]);
}

function commitAll(repository: string, message: string): void {
  git(repository, ["add", "."]);
  git(repository, ["commit", "--quiet", "-m", message]);
}

function git(repository: string, args: readonly string[]): string {
  const result = spawnSync("git", args, {
    cwd: repository,
    encoding: "utf8"
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
  return result.stdout.trim();
}

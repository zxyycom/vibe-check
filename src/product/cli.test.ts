import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
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

import { runProductCli } from "./cli.ts";
import { ProjectConfigError } from "./config-file.ts";
import { DEFAULT_CONFIG } from "./config.ts";
import { resolveProjectConfigPaths } from "./config-paths.ts";
import {
  configuredScanArgs,
  createConfiguredProjectFixture,
  readMachinePublication
} from "./configured-project-test-support.ts";
import { CliUsageError } from "./foundation/src/errors.ts";
import { getChangedFileList } from "./quality-core/src/input/files.ts";
import { GATE_POLICY_VALUES } from "./quality-core/src/model/gate-policy.ts";
import { ScannerOperationalInputError } from "./scanner-dependencies.ts";
import {
  assertCommandSucceeded,
  assertInvalidGateForms,
  commitAll,
  escapeRegExp,
  git,
  initializeRepository,
  runBun,
  writeFixtureFile
} from "./cli.test-support.ts";

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
          return "success";
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
          return "success";
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
      ["success", 0],
      ["gate-failed", 1],
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
      { error: new Error("invalid config value"), expectedExitCode: 3 },
      { error: new CliUsageError("invalid --gate usage"), expectedExitCode: 3 },
      {
        error: new ProjectConfigError(
          "/project/.vibe-check/config.json",
          new Error("invalid semantic document")
        ),
        expectedExitCode: 3
      },
      {
        error: new ScannerOperationalInputError("VIBE_CHECK_SCC_ARGS"),
        expectedExitCode: 2
      }
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
        return "success";
      }
    });

    assert.equal(exitCode, 2);
    assert.equal(scanStarted, false);
    assert.deepEqual(errors, [
      "Fatal error in Vibe Check CLI: unknown command: report; expected scan or init"
    ]);
  });
});

describe("gate CLI usage contract", () => {
  it("returns exit 3 before scanners or artifacts for every invalid gate form", { timeout: 15_000 }, () => {
    assertInvalidGateForms(repoRoot);
  });
});

describe("baseline resolution CLI contract", () => {
  it("maps Git execution failures to runtime exit 2 before scan work", { timeout: 15_000 }, () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-baseline-runtime-"));
    const missingProjectRoot = join(tempRoot, "missing-project-root");

    try {
      const result = runBun(repoRoot, [
        "run",
        "--silent",
        "product:cli",
        "--",
        "scan",
        missingProjectRoot,
        "--baseline",
        "HEAD"
      ]);

      assert.equal(result.status, 2);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /Fatal error in quality scan: .*Git could not run/i);
      assert.equal(existsSync(missingProjectRoot), false);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

describe("configuration workflow scan preflight", () => {
  it("requires a file-backed policy before dependency preflight for every gate", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-config-"));
    const artifactDir = join(projectRoot, "artifacts/should-not-exist");
    const candidatePath = resolveProjectConfigPaths(projectRoot).configPath;

    try {
      writeFixtureFile(projectRoot, "src/input.ts", "export const input = true;\n");
      initializeRepository(projectRoot);
      commitAll(projectRoot, "gate config preflight fixture");
      const baselineSha = git(projectRoot, ["rev-parse", "HEAD"]);
      for (const gatePolicy of GATE_POLICY_VALUES) {
        const baselineArgs = gatePolicy === "all"
          ? []
          : ["--baseline", baselineSha];
        const result = runBun(
          repoRoot,
          [
            "run",
            "--silent",
            "product:cli",
            "--",
            "scan",
            projectRoot,
            "--gate",
            gatePolicy,
            ...baselineArgs,
            "--artifact-dir",
            "artifacts/should-not-exist"
          ],
          { VIBE_CHECK_SCC_ARGS: "not-json" }
        );

        assert.equal(result.status, 3, gatePolicy);
        assert.equal(result.stdout, "", gatePolicy);
        assert.match(result.stderr, new RegExp(escapeRegExp(candidatePath)));
        assert.match(result.stderr, /init/);
        assert.match(result.stderr, /--config/);
        assert.doesNotMatch(result.stderr, /VIBE_CHECK_SCC_ARGS/);
        assert.equal(existsSync(artifactDir), false, gatePolicy);
      }
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("prints selected config provenance before dependency preflight", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-check-provenance-"));
    const paths = resolveProjectConfigPaths(projectRoot);
    const explicitPath = join(projectRoot, "explicit.json");
    const configSource = `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`;

    try {
      writeFixtureFile(projectRoot, "src/input.ts", "export const input = true;\n");
      const defaultResult = runBun(
        repoRoot,
        ["run", "--silent", "product:cli", "--", "scan", projectRoot],
        { VIBE_CHECK_SCC_ARGS: "not-json" }
      );
      assert.equal(defaultResult.status, 2);
      assert.equal(defaultResult.stdout, "Config: default (not persisted)\n");

      writeFixtureFile(projectRoot, ".vibe-check/config.json", configSource);
      const discoveredResult = runBun(
        repoRoot,
        ["run", "--silent", "product:cli", "--", "scan", projectRoot],
        { VIBE_CHECK_SCC_ARGS: "not-json" }
      );
      assert.equal(discoveredResult.status, 2);
      assert.equal(
        discoveredResult.stdout,
        `Config: discovered ${paths.configPath}\n`
      );

      writeFileSync(explicitPath, configSource, "utf8");
      const explicitResult = runBun(
        repoRoot,
        [
          "run",
          "--silent",
          "product:cli",
          "--",
          "scan",
          projectRoot,
          "--config",
          "explicit.json"
        ],
        { VIBE_CHECK_SCC_ARGS: "not-json" }
      );
      assert.equal(explicitResult.status, 2);
      assert.equal(
        explicitResult.stdout,
        `Config: explicit ${explicitPath}\n`
      );
      for (const result of [defaultResult, discoveredResult, explicitResult]) {
        assert.match(result.stderr, /VIBE_CHECK_SCC_ARGS/);
      }
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

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
              return "success";
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
    const formal = runBun(repoRoot, [
      "run",
      "--silent",
      "product:cli",
      "--",
      "scan",
      repoRoot,
      "--help"
    ]);
    const dogfood = runBun(repoRoot, ["scripts/quality/scan.ts", "--help"]);

    assertCommandSucceeded(formal, "formal product entry");
    assertCommandSucceeded(dogfood, "dogfood wrapper");
    assert.equal(formal.stdout, dogfood.stdout);
    assert.match(formal.stdout, /Usage: bun run product:cli -- scan \[project-root\] \[options\]/);
    assert.match(formal.stdout, /relative paths use project root/);
    assert.match(formal.stdout, /Absolute list paths are kept; entries are project-relative/);
    assert.match(formal.stdout, /--config <file>/);
    assert.match(formal.stdout, /Complete semantic config v1; relative paths use project root/);
    assert.match(formal.stdout, /Explicit --config has highest precedence/);
    assert.match(formal.stdout, /\.vibe-check\/config\.json is discovered/);
    assert.match(formal.stdout, /neutral default \(not persisted\)/);
    assert.match(formal.stdout, /Every gate requires a complete file-backed config/);
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

      const result = runBun(repoRoot, [
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
  it("keeps the wrapper thin while package entries bind the pinned environment", () => {
    const wrapper = readFileSync(resolve(repoRoot, "scripts/quality/scan.ts"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(resolve(repoRoot, "package.json"), "utf8")
    ) as { scripts: Record<string, string> };

    assert.match(wrapper, /from "\.\.\/\.\.\/src\/product\/cli\.ts"/);
    assert.match(wrapper, /runProductCli\(\["scan", root, \.\.\.process\.argv\.slice\(2\)\]\)/);
    assert.doesNotMatch(wrapper, /parseArgs|runQualityScan|DEFAULT_CONFIG|qualityScanErrorExitCode/);
    assert.equal(
      packageJson.scripts["product:cli"],
      "mise exec -- bun src/product/cli.ts"
    );
    assert.equal(
      packageJson.scripts["quality:check"],
      "mise exec -- bun scripts/quality/scan.ts --profile quick --artifact-dir artifacts/vibe-check-quality/quick"
    );
    assert.equal(
      packageJson.scripts["quality:full-check"],
      "mise exec -- bun scripts/quality/scan.ts --profile full"
    );
    assert.equal(
      packageJson.scripts["quality:scan"],
      "mise exec -- bun scripts/quality/scan.ts"
    );
    assert.equal(
      packageJson.scripts["quality:gate"],
      "mise exec -- bun scripts/quality/scan.ts --profile full --gate regressions"
    );

    const discovery = runBun(
      repoRoot,
      ["scripts/quality/scan.ts"],
      { VIBE_CHECK_SCC_ARGS: "not-json" }
    );
    assert.equal(discovery.status, 2);
    assert.equal(
      discovery.stdout,
      `Config: discovered ${resolveProjectConfigPaths(repoRoot).configPath}\n`
    );
    assert.match(discovery.stderr, /VIBE_CHECK_SCC_ARGS/);
  });

  it("runs the ordinary Bun quality entry without ambient scanner bindings", { timeout: 30_000 }, () => {
    const result = runBun(
      repoRoot,
      ["run", "--silent", "quality:check"],
      {
        VIBE_CHECK_LIZARD_CMD: "",
        VIBE_CHECK_SCC_CMD: ""
      }
    );

    assertCommandSucceeded(result, "ordinary Bun quality entry");
    assert.match(result.stdout, /Snapshot completeness: complete/);
    assert.doesNotMatch(
      `${result.stdout}\n${result.stderr}`,
      /No module named lizard|dependency\/v1:lizard|dependency\/v1:scc/
    );
  });

  it("preserves explicit scanner overrides through nested pinned environments", { timeout: 30_000 }, () => {
    const fixture = createConfiguredProjectFixture("vibe-check-nested-pinned-entry-");
    const missingScc = join(fixture.projectRoot, "tools", "missing-scc");

    try {
      const result = spawnSync(
        "mise",
        [
          "exec",
          "--",
          "bun",
          "run",
          "--silent",
          "product:cli",
          "--",
          ...configuredScanArgs(fixture.projectRoot, "quick")
        ],
        {
          cwd: repoRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            VIBE_CHECK_SCC_ARGS: "[]",
            VIBE_CHECK_SCC_CMD: missingScc
          }
        }
      );

      assert.equal(result.error, undefined);
      assert.equal(
        result.status,
        2,
        `nested package entry ignored the explicit scanner override\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
      assert.match(result.stdout, /Snapshot completeness: incomplete/);
      const fileRun = readMachinePublication(fixture.artifactDir).run.runs.find(
        (run) => run.checkId === "file-metrics"
      );
      assert.equal(fileRun?.status, "failed");
    } finally {
      rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });
});

import { strict as assert } from "node:assert";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { runProductCli } from "./cli.ts";
import { resolveProjectConfigPaths } from "./config-paths.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("product CLI routing", () => {
  it("shows root and init help without starting either operation", async () => {
    const cases = [
      {
        argv: ["--help"],
        expected: [
          /scan \[project-root\]/,
          /init \[project-root\]/,
          /file-backed policy/i
        ]
      },
      {
        argv: ["init", "--help"],
        expected: [
          /\.vibe-check\/config\.json/,
          /\.vibe-check\/config\.schema\.json/,
          /complete neutral default/i,
          /missing/i,
          /preserv/i
        ]
      }
    ] as const;

    for (const testCase of cases) {
      const output: string[] = [];
      const errors: string[] = [];
      let initStarted = false;
      let scanStarted = false;
      const exitCode = await runProductCli(testCase.argv, {
        error: (message) => errors.push(message),
        init: () => {
          initStarted = true;
          throw new Error("init must not start for help");
        },
        output: (message) => output.push(message),
        scan: async () => {
          scanStarted = true;
          return "success";
        }
      });

      assert.equal(exitCode, 0);
      assert.deepEqual(errors, []);
      assert.equal(initStarted, false);
      assert.equal(scanStarted, false);
      for (const expected of testCase.expected) {
        assert.match(output.join("\n"), expected);
      }
    }
  });

  it("normalizes init roots and reports neutral paths plus discovery-ready state", async () => {
    const startupCwd = resolve(repoRoot, ".tmp", "cli-init-start");
    const cases = [
      { argv: ["init"], expectedRoot: startupCwd },
      {
        argv: ["init", "../target-project"],
        expectedRoot: resolve(startupCwd, "../target-project")
      }
    ] as const;

    for (const testCase of cases) {
      const initRoots: string[] = [];
      const output: string[] = [];
      let scanStarted = false;
      const paths = resolveProjectConfigPaths(testCase.expectedRoot);
      const exitCode = await runProductCli(testCase.argv, {
        cwd: () => startupCwd,
        error: () => assert.fail("unexpected CLI error"),
        init: (projectRoot) => {
          initRoots.push(projectRoot);
          return {
            configPath: paths.configPath,
            schemaPath: paths.schemaPath,
            state: "discovery-ready"
          };
        },
        output: (message) => output.push(message),
        scan: async () => {
          scanStarted = true;
          return "success";
        }
      });

      assert.equal(exitCode, 0);
      assert.deepEqual(initRoots, [testCase.expectedRoot]);
      assert.equal(scanStarted, false);
      assert.deepEqual(output, [
        `Config: ${paths.configPath}`,
        `Schema: ${paths.schemaPath}`,
        "State: discovery-ready"
      ]);
      assert.equal(output.some((line) => line.includes("bun run")), false);
    }
  });

  it("maps init usage and runtime failures to operation-specific exit three diagnostics", async () => {
    const cases = [
      { argv: ["init", "one", "two"], expected: /zero or one project root/i },
      { argv: ["init", "--unknown"], expected: /unknown init option/i },
      { argv: ["init"], expected: /controlled init failure/i }
    ] as const;

    for (const testCase of cases) {
      const output: string[] = [];
      const errors: string[] = [];
      let scanStarted = false;
      const exitCode = await runProductCli(testCase.argv, {
        cwd: () => repoRoot,
        error: (message) => errors.push(message),
        init: () => {
          throw new Error("controlled init failure");
        },
        output: (message) => output.push(message),
        scan: async () => {
          scanStarted = true;
          return "success";
        }
      });

      assert.equal(exitCode, 3);
      assert.deepEqual(output, []);
      assert.equal(scanStarted, false);
      assert.equal(errors.length, 1);
      assert.match(errors[0] ?? "", /^Configuration initialization failed:/);
      assert.match(errors[0] ?? "", testCase.expected);
      assert.doesNotMatch(errors[0] ?? "", /quality scan|failed to load config/i);
    }
  });
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runMaterialValidationCli } from "./repository-material/workflow.ts";
import { runWorkspaceValidation } from "./workspace.ts";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const entrypoint = resolve(moduleDirectory, "workspace.ts");
const workspaceRoot = resolve(moduleDirectory, "..", "..");

test("root validate CLI runs every material task by default", () => {
  const result = runValidate("materials");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /strict JSON validation ok:/);
  assert.match(result.stdout, /current machine artifact examples ok: 1 set\(s\)/);
  assert.match(result.stdout, /schema strict compile ok:/);
  assert.match(result.stdout, /report examples ok:/);
  assert.match(result.stdout, /markdown links ok:/);
});

test("root validate CLI forwards focused material selections", async () => {
  // Exercise the same adapter as main; default-all above retains real process/material integration.
  for (const selection of [["json"], ["links", "json", "json"]]) {
    for (const materialsExitCode of [0, 7]) {
      const dispatches: Array<readonly string[]> = [];
      const exitCode = await runWorkspaceValidation(["materials", ...selection], {
        runMaterials: async ({ argv }) => {
          dispatches.push(argv);
          return materialsExitCode;
        }
      });
      assert.equal(exitCode, materialsExitCode);
      assert.deepEqual(dispatches, [selection]);
    }
  }

  const invalidDispatches: Array<readonly string[]> = [];
  await assert.rejects(
    () =>
      runWorkspaceValidation(["materials", "unknown"], {
        runMaterials: async ({ argv }) => {
          invalidDispatches.push(argv);
          return 0;
        }
      }),
    /unknown validation task/
  );
  assert.deepEqual(invalidDispatches, []);

  const documentationRoot = mkdtempSync(join(tmpdir(), "vibe-check-docs-cli-failure-"));
  try {
    mkdirSync(join(documentationRoot, "docs"), { recursive: true });
    writeFileSync(join(documentationRoot, "AGENTS.md"), "# Fixture\n", "utf8");
    writeFileSync(
      join(documentationRoot, "docs", "broken-links.md"),
      "[first](missing-first.md)\n[second](missing-second.md)\n",
      "utf8"
    );

    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await runMaterialValidationCli({
      argv: ["links"],
      linkRepositoryRoot: documentationRoot,
      writeStderr: (message) => stderr.push(message),
      writeStdout: (message) => stdout.push(message)
    });
    assert.equal(exitCode, 1);
    assert.deepEqual(stdout, []);
    assert.equal(
      stderr.join("\n"),
      [
        "docs/broken-links.md:1:1 missing local Markdown link target: docs/missing-first.md.",
        "docs/broken-links.md:2:1 missing local Markdown link target: docs/missing-second.md."
      ].join("\n")
    );
  } finally {
    rmSync(documentationRoot, { force: true, recursive: true });
  }
});

test("root validate CLI rejects the retired docs entrypoint", () => {
  const result = runValidate("docs");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown|usage/i);
});

type CliResult = {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
};

function runValidate(...args: string[]): CliResult {
  const result = spawnSync(process.execPath, [entrypoint, ...args], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });
  return {
    status: result.status,
    stderr: readProcessOutput(result.stderr),
    stdout: readProcessOutput(result.stdout)
  };
}

function readProcessOutput(value: ReturnType<typeof spawnSync>["stdout"]): string {
  return typeof value === "string" ? value : (value?.toString() ?? "");
}

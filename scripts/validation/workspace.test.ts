import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { runMaterialValidationCli } from "./repository-material/workflow.ts";
import { runWorkspaceValidation } from "./workspace.ts";

test("root validation adapter forwards default and focused material selections", async () => {
  for (const selection of [[], ["json"], ["links", "json", "json"]]) {
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

  for (const { argv, expectedError } of [
    { argv: ["materials", "unknown"], expectedError: /unknown validation task: unknown/ },
    { argv: ["docs"], expectedError: /usage:/ }
  ]) {
    const invalidDispatches: Array<readonly string[]> = [];
    await assert.rejects(
      () =>
        runWorkspaceValidation(argv, {
          runMaterials: async ({ argv: tasks }) => {
            invalidDispatches.push(tasks);
            return 0;
          }
        }),
      expectedError
    );
    assert.deepEqual(invalidDispatches, []);
  }
  assertWorkspaceLayoutLoadingBoundary();
});

test("material CLI reports real link failures through stderr and a nonzero return", async () => {
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
    assert.deepEqual(stderr, [
      "docs/broken-links.md:1:1 missing local Markdown link target: docs/missing-first.md.",
      "docs/broken-links.md:2:1 missing local Markdown link target: docs/missing-second.md."
    ]);
  } finally {
    rmSync(documentationRoot, { force: true, recursive: true });
  }
});

/** One isolated module cache proves loading, without paying for a full repository scan. */
function assertWorkspaceLayoutLoadingBoundary(): void {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-workspace-loading-"));
  try {
    for (const variant of ["complete", "missing-layout"]) {
      const validation = join(root, variant, "scripts/validation");
      const processDirectory = join(root, variant, "scripts/process-execution");
      mkdirSync(join(validation, "repository-material"), { recursive: true });
      mkdirSync(processDirectory, { recursive: true });
      copyFileSync(new URL("./workspace.ts", import.meta.url), join(validation, "workspace.ts"));
      copyFileSync(
        new URL("./repository-material/task-contract.ts", import.meta.url),
        join(validation, "repository-material/task-contract.ts")
      );
      writeFileSync(
        join(processDirectory, "command.ts"),
        `
        export const reportProcessOutput = () => {};
        export const runAsyncMain = () => { throw new Error("unexpected process entry"); };
        export const runCommand = (command, args) => {
          globalThis.commands.push({command, args}); globalThis.events.push("git");
        };
      `
      );
      writeFileSync(
        join(validation, "repository-material/workflow.ts"),
        `
        export const parseMaterialValidationTasks = (argv) => argv;
        export const runMaterialValidationCli = async () => 0;
      `
      );
      if (variant === "complete")
        writeFileSync(
          join(validation, "repository-layout.ts"),
          `
        await Promise.resolve();
        globalThis.events.push("layout-loaded");
        export const validateRepositoryLayout = () => {
          globalThis.events.push("layout");
          if (globalThis.layoutFailure) throw new Error("layout failed");
        };
      `
        );
    }
    const complete = pathToFileURL(join(root, "complete/scripts/validation/workspace.ts")).href;
    const missing = pathToFileURL(
      join(root, "missing-layout/scripts/validation/workspace.ts")
    ).href;
    const probe = join(root, "probe.mjs");
    writeFileSync(
      probe,
      `
      import assert from "node:assert/strict";
      globalThis.events = []; globalThis.commands = [];
      const {runWorkspaceValidation: run} = await import(${JSON.stringify(complete)});
      assert.deepEqual(globalThis.events, []);
      const success = async () => { globalThis.events.push("materials"); return 0; };
      assert.equal(await run(["materials"], {runMaterials: success}), 0);
      assert.deepEqual(globalThis.events, ["materials"]);
      globalThis.events = [];
      await assert.rejects(() => run(["docs"], {runMaterials: success}), /usage:/);
      assert.deepEqual(globalThis.events, []);
      assert.equal(await run([], {runMaterials: async () => 7}), 7);
      assert.deepEqual(globalThis.events, []);
      assert.equal(await run([], {runMaterials: success}), 0);
      assert.deepEqual(globalThis.events, ["materials", "layout-loaded", "layout", "git"]);
      assert.deepEqual(globalThis.commands, [{command: "git", args: ["diff", "--check"]}]);
      globalThis.events = []; globalThis.layoutFailure = true;
      await assert.rejects(() => run([], {runMaterials: success}), /layout failed/);
      assert.deepEqual(globalThis.events, ["materials", "layout"]);
      assert.equal(globalThis.commands.length, 1);
      globalThis.events = [];
      const {runWorkspaceValidation: runMissing} = await import(${JSON.stringify(missing)});
      assert.equal(await runMissing(["materials"], {runMaterials: success}), 0);
      assert.deepEqual(globalThis.events, ["materials"]);
      globalThis.events = [];
      await assert.rejects(() => runMissing([], {runMaterials: success}), /repository-layout/);
      assert.deepEqual(globalThis.events, ["materials"]);
      assert.equal(globalThis.commands.length, 1);
    `
    );
    const result = spawnSync(process.execPath, [probe], { encoding: "utf8", timeout: 3_000 });
    assert.equal(
      result.status,
      0,
      `${result.error?.message ?? ""}\n${result.stdout}\n${result.stderr}`
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

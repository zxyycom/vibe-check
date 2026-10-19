import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

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

  for (const argv of [["materials", "unknown"], ["docs"]]) {
    const invalidDispatches: Array<readonly string[]> = [];
    await assert.rejects(
      () =>
        runWorkspaceValidation(argv, {
          runMaterials: async ({ argv: tasks }) => {
            invalidDispatches.push(tasks);
            return 0;
          }
        }),
      /unknown validation task|usage:/
    );
    assert.deepEqual(invalidDispatches, []);
  }
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

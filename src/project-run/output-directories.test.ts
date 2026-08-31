import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../project-definition/project-definition.ts";
import { run } from "./run.ts";

const CHECK = Object.freeze({
  checkId: "output-directory-check",
  displayName: "Output directory check",
  execution: () => ({ status: "passed" as const, data: Object.freeze({}) })
});

describe("Package Run output directories", () => {
  it("accepts child, parent, and absolute directories in Definition and RunControls", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-output-directory-grammar-"));
    try {
      for (const directory of [
        "child-output",
        "../parent-output",
        resolve(root, "absolute-output")
      ]) {
        const result = await run(
          defineConfig({
            checks: [CHECK],
            outputs: {
              machinePublication: { directory, enabled: false },
              progressRendering: { enabled: false },
              diagnosticLogging: { directory, enabled: false }
            }
          }),
          {
            outputs: {
              machinePublication: { directory },
              diagnosticLogging: { directory }
            },
            projectRoot: root
          }
        );
        assert.equal(result.kind, "completed");
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("writes independent machine and diagnostic files to one Definition-selected parent directory", async () => {
    const container = mkdtempSync(join(tmpdir(), "vibe-check-output-directory-definition-"));
    const projectRoot = join(container, "project");
    const outputDirectory = join(container, "shared-output");
    mkdirSync(projectRoot);
    try {
      const result = await run(
        defineConfig({
          checks: [CHECK],
          outputs: {
            machinePublication: { directory: "../shared-output", enabled: true },
            progressRendering: { enabled: false },
            diagnosticLogging: { directory: "../shared-output", enabled: true }
          }
        }),
        { projectRoot }
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.outputs.machinePublication.status, "succeeded");
      assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
      assert.equal(
        result.outputs.diagnosticLogging.file,
        relative(
          projectRoot,
          join(outputDirectory, basename(result.outputs.diagnosticLogging.file ?? ""))
        )
      );
      assert.equal(
        existsSync(resolve(projectRoot, result.outputs.diagnosticLogging.file ?? "")),
        true
      );
      assert.deepEqual(
        readdirSync(outputDirectory).sort(),
        [basename(result.outputs.diagnosticLogging.file ?? ""), "records.ndjson", "run.json"].sort()
      );
    } finally {
      rmSync(container, { recursive: true, force: true });
    }
  });

  it("uses an absolute RunControls target without changing Definition defaults", async () => {
    const container = mkdtempSync(join(tmpdir(), "vibe-check-output-directory-controls-"));
    const projectRoot = join(container, "project");
    const outputDirectory = join(container, "absolute-output");
    mkdirSync(projectRoot);
    try {
      const result = await run(
        defineConfig({
          checks: [CHECK],
          outputs: {
            machinePublication: { enabled: false },
            progressRendering: { enabled: false },
            diagnosticLogging: { enabled: false }
          }
        }),
        {
          outputs: {
            machinePublication: { directory: outputDirectory, enabled: true },
            diagnosticLogging: { directory: outputDirectory, enabled: true }
          },
          projectRoot
        }
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.outputs.machinePublication.status, "succeeded");
      assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
      assert.equal(
        result.outputs.diagnosticLogging.file,
        relative(
          projectRoot,
          join(outputDirectory, basename(result.outputs.diagnosticLogging.file ?? ""))
        )
      );
      assert.equal(
        existsSync(resolve(projectRoot, result.outputs.diagnosticLogging.file ?? "")),
        true
      );
      assert.deepEqual(
        readdirSync(outputDirectory).sort(),
        [basename(result.outputs.diagnosticLogging.file ?? ""), "records.ndjson", "run.json"].sort()
      );
    } finally {
      rmSync(container, { recursive: true, force: true });
    }
  });
});

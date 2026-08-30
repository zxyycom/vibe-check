import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import { isRecord } from "../../data-boundary/value-shapes.ts";
import type { ProgressWriter } from "./renderer.ts";
import { executeValidatedRun } from "../invocation.ts";

function capturedProgressWriter() {
  const writes: string[] = [];
  const writer: ProgressWriter = {
    color: false,
    isTTY: false,
    term: undefined,
    write: (content: string): void => {
      writes.push(content);
    }
  };
  return { writes, writer };
}

describe("Package Run default outputs", () => {
  it("keeps default progress and publication outputs independently successful", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-default-outputs-"));
    const output = capturedProgressWriter();
    try {
      const result = await executeValidatedRun(
        defineConfig({
          checks: [
            {
              checkId: "custom",
              displayName: "Custom",
              execution: () => ({ status: "passed", data: {} })
            }
          ]
        }),
        { projectRoot: root },
        [],
        {
          progressWriterFactory: () => output.writer,
          wallClock: { now: () => new Date("2026-08-30T12:34:56.789Z") }
        }
      );

      assert.equal(result.kind, "completed");
      assert.equal(result.outputs.progressRendering.status, "succeeded");
      assert.equal(result.outputs.machinePublication.status, "succeeded");
      assert.deepEqual(result.outputs.diagnosticLogging, {
        enabled: false,
        file: null,
        status: "disabled"
      });
      assert.equal(
        output.writes.some((write) => write.includes("Execution summary:\n  execution: completed")),
        true
      );
      assert.equal(existsSync(join(root, "artifacts", "vibe-check", "run.json")), true);
      assert.equal(existsSync(join(root, "artifacts", "vibe-check", "records.ndjson")), true);
      assert.equal(existsSync(join(root, ".log", "vibe-check")), false);
      const publishedRun: unknown = JSON.parse(
        readFileSync(join(root, "artifacts", "vibe-check", "run.json"), "utf8")
      );
      assert.equal(
        isRecord(publishedRun) && isRecord(publishedRun.invocation)
          ? publishedRun.invocation.timestamp
          : undefined,
        "2026-08-30T12:34:56.789Z"
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

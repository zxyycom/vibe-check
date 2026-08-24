import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../definition/project-definition.ts";
import type { ProgressWriter } from "./progress.ts";
import { executeValidatedRun } from "./invocation.ts";

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

describe("Package Run default effects", () => {
  it("keeps default progress and publication effects independently successful", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-default-effects-"));
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
        { progressWriterFactory: () => output.writer }
      );

      assert.equal(result.kind, "completed");
      assert.equal(result.effects.progress.status, "succeeded");
      assert.equal(result.effects.output.status, "succeeded");
      assert.equal(
        output.writes.some((write) => write.includes("Execution summary:\n  execution: completed")),
        true
      );
      assert.equal(existsSync(join(root, "artifacts", "vibe-check", "run.json")), true);
      assert.equal(existsSync(join(root, "artifacts", "vibe-check", "records.ndjson")), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

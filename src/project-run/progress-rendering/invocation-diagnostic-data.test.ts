import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation.ts";
import { check, definition } from "./invocation.test-support.ts";

describe("Package Run diagnostic logging output", () => {
  it("summarizes accepted final data instead of copying it into the diagnostic log", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-final-data-"));
    try {
      const files = Array.from({ length: 700 }, (_, index) => `package/file-${index}.ts`);
      const result = await executeValidatedRun(
        definition([check({ execution: () => ({ status: "passed", data: { files } }) })]),
        {
          outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
          projectRoot: root
        },
        []
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      const file = result.outputs.diagnosticLogging.file;
      assert.ok(file);
      const diagnosticLog = readFileSync(join(root, file), "utf8");
      assert.match(diagnosticLog, /data\.availability="available"/);
      assert.match(diagnosticLog, /data\.bytes=\d+/);
      assert.match(diagnosticLog, /data\.keys=1/);
      assert.match(diagnosticLog, /data\.shape="object"/);
      assert.match(diagnosticLog, /\[FINISHED] \[PASSED] check\.finished/);
      assert.doesNotMatch(diagnosticLog, /package\/file-699\.ts/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

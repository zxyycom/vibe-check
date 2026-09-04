import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation.ts";
import { check, definition } from "./invocation.test-support.ts";

describe("Package Run diagnostic logging output", () => {
  it("does not duplicate accepted final data into the core diagnostic channel", async () => {
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
      const file = result.outputs.diagnosticLogging.channels.core.file;
      assert.ok(file);
      const diagnosticLog = readFileSync(join(root, file), "utf8");
      assert.match(diagnosticLog, /\[FINISHED] \[PASSED] .*check\.finished/);
      assert.match(diagnosticLog, /messageCount=0/);
      assert.match(diagnosticLog, /status="passed"/);
      assert.doesNotMatch(diagnosticLog, /data\.availability=/);
      assert.doesNotMatch(diagnosticLog, /package\/file-699\.ts/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation/run.ts";
import { check, definition } from "./invocation.test-support.ts";

describe("Package Run diagnostic logging output", () => {
  it("writes one compact invocation start instead of catalog entries for every Check", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-catalog-"));
    try {
      const catalog = Array.from({ length: 70 }, (_, index) =>
        check({ checkId: `catalog-${index}` })
      );
      const result = await executeValidatedRun(
        definition(catalog),
        {
          outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
          projectRoot: root
        },
        [],
        { wallClock: { now: () => new Date("2026-08-30T12:34:56.789Z") } }
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      const file = result.outputs.diagnosticLogging.channels.core.file;
      assert.ok(file);
      assert.match(file, /^diagnostic\/core-20260830T123456\.789Z-/);
      assert.equal(result.outputs.diagnosticLogging.channels.scheduler.status, "succeeded");
      assert.match(
        result.outputs.diagnosticLogging.channels.scheduler.file ?? "",
        /^diagnostic\/scheduler-20260830T123456\.789Z-/
      );
      const diagnosticLog = readFileSync(join(root, file), "utf8");
      assert.equal([...diagnosticLog.matchAll(/\[RUN\] \[STARTED\].*run\.started /g)].length, 1);
      assert.match(diagnosticLog, /aggregation=null/);
      assert.match(diagnosticLog, /checkCount=70/);
      assert.match(diagnosticLog, /flags=\[\]/);
      assert.match(diagnosticLog, /invocationId="invocation\/v1:/);
      assert.match(diagnosticLog, /outputs\./);
      assert.match(diagnosticLog, /scheduler\./);
      assert.doesNotMatch(diagnosticLog, /catalog\.check/);
      assert.doesNotMatch(diagnosticLog, /details=unavailable:(?:value-limit|width-limit)/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

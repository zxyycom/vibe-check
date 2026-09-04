import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation.ts";
import { check, definition, PASSED } from "./invocation.test-support.ts";

describe("Package Run diagnostic logging output", () => {
  it("does not invoke hostile author details while diagnostic logging is enabled", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-hostile-diagnostics-"));
    try {
      let toJsonCalls = 0;
      const hostile: Record<string, unknown> = {};
      Object.defineProperty(hostile, "toJSON", {
        enumerable: true,
        value: (): object => {
          toJsonCalls += 1;
          return { leaked: true };
        }
      });
      const source = definition(
        [
          {
            checkId: "hostile-preflight",
            displayName: "Hostile preflight",
            execution: () => PASSED,
            preflight: () => ({ status: "success", preparedOptions: hostile })
          },
          check({
            checkId: "hostile-callback",
            execution: ({ records }) => {
              records.report({ id: "hostile" }, hostile);
              return { status: "passed", data: hostile };
            }
          })
        ],
        false
      );
      const result = await executeValidatedRun(
        source,
        {
          outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
          projectRoot: root
        },
        []
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(toJsonCalls, 0);
      assert.deepEqual(
        result.snapshot.checks.map((settledCheck) => settledCheck.outcome.status),
        ["unavailable", "unavailable"]
      );
      const file = result.outputs.diagnosticLogging.channels.core.file;
      assert.ok(file);
      const diagnosticLog = readFileSync(join(root, file), "utf8");
      assert.match(diagnosticLog, /record\.reported/);
      assert.match(diagnosticLog, /check\.contained/);
      assert.match(diagnosticLog, /details=unavailable:unsupported-function/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

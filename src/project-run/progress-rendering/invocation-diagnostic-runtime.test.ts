import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import { executeValidatedRun } from "../invocation.ts";

describe("Package Run diagnostic logging output", () => {
  it("closes diagnostic logging once after an unexpected nonconfiguration failure", async () => {
    let closeCalls = 0;
    const result = await executeValidatedRun(
      defineConfig({
        checks: [],
        outputs: {
          diagnosticLogging: { enabled: true },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      }),
      {},
      [],
      {
        clock: {
          now: (): never => {
            throw new Error("clock fault");
          }
        },
        diagnosticLoggerFactory: () =>
          Object.freeze({
            close: () => {
              closeCalls += 1;
              return "succeeded" as const;
            },
            observe: () => undefined
          })
      }
    );

    assert.equal(result.kind, "execution");
    if (result.kind !== "execution") return;
    assert.deepEqual(result.diagnostic, { code: "task-engine-failed" });
    assert.equal(closeCalls, 1);
    assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
  });
});

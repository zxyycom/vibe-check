import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { check, definition, PASSED } from "./run.test-support.ts";
import { run } from "./run.ts";

describe("Package Run", () => {
  it("rejects an invalid projected generic Task graph before any Check callback runs", async () => {
    let calls = 0;
    const result = await run(
      definition([
        check({
          dependsOn: ["missing-check"],
          enabledByFlags: { flags: ["never-enabled"], mode: "all" },
          execution: () => {
            calls += 1;
            return PASSED;
          }
        })
      ])
    );
    assert.deepEqual(result.kind === "planning" ? result.diagnostic : result, {
      code: "task-graph-invalid"
    });
    assert.equal(calls, 0);
  });
});

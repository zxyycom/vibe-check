import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { check, definition, PASSED } from "./run.test-support.ts";
import { run } from "./run.ts";

describe("Package Run", () => {
  it("rejects an invalid projected Check relation graph before any Check callback runs", async () => {
    let calls = 0;
    for (const checks of invalidRelationChecks(() => {
      calls += 1;
      return PASSED;
    })) {
      const result = await run(definition(checks));
      assert.deepEqual(result.kind === "planning" ? result.diagnostic : result, {
        code: "task-graph-invalid"
      });
    }
    assert.equal(calls, 0);
  });
});

function invalidRelationChecks(execute: () => typeof PASSED) {
  return [
    [
      check({
        dependsOn: ["missing-check"],
        enabledByFlags: {
          flags: ["never-enabled"],
          mode: "all",
          propagateDependsOn: true
        },
        execute
      })
    ],
    [check({ observes: ["missing-check"], execute: execute })],
    [
      check({ checkId: "source", execute: execute }),
      check({ checkId: "overlap", dependsOn: ["source"], observes: ["source"], execute: execute })
    ],
    [
      check({ checkId: "depends", dependsOn: ["observes"], execute: execute }),
      check({ checkId: "observes", observes: ["depends"], execute: execute })
    ],
    [check({ checkId: "self", observes: ["self"], execute: execute })]
  ];
}

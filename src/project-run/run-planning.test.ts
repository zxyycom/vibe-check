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

function invalidRelationChecks(execution: () => typeof PASSED) {
  return [
    [check({ dependsOn: ["missing-check"], execution })],
    [check({ observes: ["missing-check"], execution })],
    [
      check({ checkId: "source", execution }),
      check({ checkId: "overlap", dependsOn: ["source"], observes: ["source"], execution })
    ],
    [
      check({ checkId: "depends", dependsOn: ["observes"], execution }),
      check({ checkId: "observes", observes: ["depends"], execution })
    ],
    [check({ checkId: "self", observes: ["self"], execution })]
  ];
}

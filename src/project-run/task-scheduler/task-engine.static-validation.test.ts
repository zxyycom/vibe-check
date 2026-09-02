import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateTaskGraph } from "./graph.ts";
import { runTaskGraph } from "./scheduler.ts";

describe("static task engine", () => {
  it("validates static task identity dependency and scope structure before execution", async () => {
    assert.throws(
      () => validateTaskGraph({ tasks: [], dependOn: [] }),
      /task graph has unknown property: dependOn/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [{ id: "script-task", command: "bun" }]
        }),
      /task graph tasks\[0\] has unknown property: command/
    );
    for (const admissionPriority of [Number.NaN, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(
        () => validateTaskGraph({ tasks: [{ admissionPriority, id: "priority" }] }),
        /task priority\.admissionPriority must be a safe integer/
      );
    }
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [{ id: "terminal", scopeId: "scope" }],
          scopes: [
            {
              id: "scope",
              maxParallel: 1,
              activationTaskIds: [],
              terminalTaskId: "terminal",
              terminal: "terminal"
            }
          ]
        }),
      /task graph scopes\[0\] has unknown property: terminal/
    );
    assert.throws(
      () => validateTaskGraph({ tasks: [{ id: "same" }, { id: "same" }] }),
      /duplicate task id: same/
    );
    assert.throws(
      () => validateTaskGraph({ tasks: [{ id: "dependent", dependsOn: ["missing"] }] }),
      /task dependent depends on unknown task missing/
    );
    assert.throws(
      () => validateTaskGraph({ tasks: [{ id: "observer", observes: ["missing"] }] }),
      /task observer observes unknown task missing/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [{ id: "source" }, { id: "overlap", dependsOn: ["source"], observes: ["source"] }]
        }),
      /cannot both depend on and observe task source/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [
            { id: "one", dependsOn: ["two"] },
            { id: "two", dependsOn: ["one"] }
          ]
        }),
      /task dependency cycle includes/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [
            { id: "depends", dependsOn: ["observes"] },
            { id: "observes", observes: ["depends"] }
          ]
        }),
      /task dependency cycle includes/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [{ id: "terminal", scopeId: "scope" }],
          scopes: [
            {
              id: "scope",
              maxParallel: 1,
              activationTaskIds: ["other"],
              terminalTaskId: "terminal"
            }
          ]
        }),
      /activation task must belong to the scope: other/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [
            { id: "work", scopeId: "scope" },
            { id: "terminal", scopeId: "scope" }
          ],
          scopes: [
            {
              id: "scope",
              maxParallel: 1,
              activationTaskIds: ["work"],
              terminalTaskId: "terminal"
            }
          ]
        }),
      /terminal task must relate to scoped task work/
    );
    assert.doesNotThrow(() =>
      validateTaskGraph({
        tasks: [
          { id: "observed-work", scopeId: "observed-scope" },
          {
            id: "observed-terminal",
            observes: ["observed-work"],
            scopeId: "observed-scope"
          }
        ],
        scopes: [
          {
            id: "observed-scope",
            maxParallel: 1,
            activationTaskIds: ["observed-work"],
            terminalTaskId: "observed-terminal"
          }
        ]
      })
    );
    await assert.rejects(
      () =>
        runTaskGraph({
          graph: {
            tasks: [{ id: "terminal", scopeId: "scope" }],
            scopes: [
              {
                id: "scope",
                maxParallel: 2,
                activationTaskIds: [],
                terminalTaskId: "terminal"
              }
            ]
          },
          maxParallel: 1,
          execute: () => undefined
        }),
      /scope scope maxParallel exceeds task engine maxParallel/
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runTaskGraph } from "../../src/product/task-scheduler/index.ts";

import type { CheckDefinition, CheckTask } from "./checks/index.ts";
import { defineChecks } from "./checks/normalization.ts";
import { createWorkspaceTaskGraph } from "./task-engine-adapter.ts";

describe("workspace task engine adapter", () => {
  it("projects scripts-owned command fields into one graph without leaking them into the engine", async () => {
    const checks = [
      checkTask({ id: "setup", command: "setup" }),
      checkTask({
        id: "verify",
        command: "verify",
        dependsOn: ["setup"],
        mutex: ["workspace"],
        env: { VERIFY: "1" },
        args: ["--strict"]
      })
    ];
    const adapted = createWorkspaceTaskGraph(checks);

    assert.deepEqual(adapted.graph, {
      tasks: [{ id: "setup", dependsOn: [], mutex: [] }, {
        id: "verify",
        dependsOn: ["setup"],
        mutex: ["workspace"]
      }]
    });
    assert.equal(adapted.checkByTaskId.get("verify")?.command, "verify");
    assert.deepEqual(adapted.checkByTaskId.get("verify")?.env, { VERIFY: "1" });

    const run = await runTaskGraph({
      graph: adapted.graph,
      maxParallel: 2,
      execute: (task) => adapted.checkByTaskId.get(task.id)?.command
    });
    assert.deepEqual(run.settlements.map(({ settlement }) => settlement), [
      { kind: "completed", value: "setup" },
      { kind: "completed", value: "verify" }
    ]);
  });

  it("rejects malformed dynamic Check authoring before task-graph projection", () => {
    const invalidDefinitions: readonly {
      readonly input: unknown;
      readonly message: RegExp;
    }[] = [
      {
        input: [{ id: "leaf", type: "required" }],
        message: /checks\[0\]\.command must be a non-empty string/
      },
      {
        input: [{
          id: "group",
          type: "required",
          command: "bun",
          tasks: [{ id: "leaf", command: "bun" }]
        }],
        message: /checks\[0\] contains unsupported field command/
      },
      {
        input: [{
          id: "leaf",
          type: "required",
          command: "bun",
          env: { VIBE_CHECK_MODE: true }
        }],
        message: /checks\[0\]\.env\.VIBE_CHECK_MODE must be a string or undefined/
      },
      {
        input: [{
          id: "leaf",
          type: "required",
          command: "bun",
          dependsOn: { invalid: true }
        }],
        message: /checks\[0\]\.dependsOn must be a string or string array/
      },
      {
        input: [{
          id: "leaf",
          type: "required",
          command: "bun",
          taskz: []
        }],
        message: /checks\[0\] contains unsupported field taskz/
      }
    ];

    for (const { input, message } of invalidDefinitions) {
      assert.throws(
        () => defineChecks(input as readonly CheckDefinition[]),
        message
      );
    }
  });
});

function checkTask(input: Partial<CheckTask> & Pick<CheckTask, "command" | "id">): CheckTask {
  return {
    id: input.id,
    label: input.label ?? input.id,
    type: input.type ?? "required",
    mutex: input.mutex ?? [],
    dependsOn: input.dependsOn ?? [],
    env: input.env,
    envFile: input.envFile,
    allowOutput: input.allowOutput ?? [],
    args: input.args ?? [],
    command: input.command,
    ignoreOutput: input.ignoreOutput ?? [],
    reportId: input.reportId ?? input.id,
    reportLabel: input.reportLabel ?? input.label ?? input.id,
    warningOutput: input.warningOutput ?? []
  };
}

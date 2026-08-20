import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig, type Check, type CheckExecution } from "../definition/project.ts";
import { run } from "./index.ts";

const COMPLETED = Object.freeze({ status: "completed" as const, verdict: "passed" as const });

function check(
  overrides: Readonly<{
    readonly checkId?: string;
    readonly dependsOn?: readonly string[];
    readonly execution?: CheckExecution;
    readonly maxParallel?: number;
    readonly mutex?: readonly string[];
  }> = {}
): Check {
  return {
    checkId: overrides.checkId ?? "custom",
    displayName: overrides.checkId ?? "Custom",
    execution: overrides.execution ?? (() => COMPLETED),
    ...(overrides.dependsOn === undefined ? {} : { dependsOn: overrides.dependsOn }),
    ...(overrides.maxParallel === undefined ? {} : { maxParallel: overrides.maxParallel }),
    ...(overrides.mutex === undefined ? {} : { mutex: overrides.mutex }),
    recordTypes: []
  };
}

function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    effects: {
      cache: { enabled: false },
      logs: { enabled: false },
      output: { enabled: false },
      progress: { enabled: false }
    },
    selectedPolicy: null
  });
}

describe("Package Run", () => {
  it("rejects invalid closed controls and definitions before any Check callback", async () => {
    let calls = 0;
    const source = definition([
      check({
        execution: () => {
          calls += 1;
          return COMPLETED;
        }
      })
    ]);

    const badControls = await run(source, { unexpected: true });
    const badDefinition = await run({ ...source, unexpected: true }, {});

    assert.deepEqual(badControls, {
      kind: "configuration",
      definitionWarnings: [],
      diagnostic: {
        kind: "invalid-run-controls",
        path: "controls.unexpected",
        reason: "unknown-key"
      }
    });
    assert.equal(badDefinition.kind, "configuration");
    assert.equal(calls, 0);
  });

  it("executes each normalized Check directly with the public callback context", async () => {
    let received:
      | Readonly<{
          readonly changedFiles: readonly string[];
          readonly options: object;
          readonly root: string;
          readonly signal: AbortSignal;
        }>
      | undefined;
    const source = definition([
      check({
        execution: (context) => {
          received = {
            changedFiles: context.project.changedFiles,
            options: context.options,
            root: context.project.root,
            signal: context.signal
          };
          return COMPLETED;
        }
      })
    ]);
    const root = mkdtempSync(join(tmpdir(), "vibe-check-direct-run-"));
    try {
      const result = await run(source, { changedFiles: ["src/a.ts"], projectRoot: root });
      assert.equal(result.kind, "completed");
      assert.deepEqual(received?.changedFiles, ["src/a.ts"]);
      assert.deepEqual(received?.options, {});
      assert.equal(received?.root, root);
      assert.equal(received?.signal.aborted, false);
      if (result.kind !== "completed") return;
      assert.deepEqual(
        result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
        [
          {
            checkId: "custom",
            outcome: COMPLETED
          }
        ]
      );
      assert.deepEqual(result.definitionWarnings, []);
      assert.doesNotMatch(JSON.stringify(result), /createTaskPlan|binding|operationalDependencies/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("projects direct dependencies to generic tasks and gives skipped dependents a prerequisite reason", async () => {
    let dependentCalls = 0;
    const source = definition([
      check({
        checkId: "unavailable",
        execution: () => ({ status: "unavailable", reason: { code: "source-unavailable" } })
      }),
      check({
        checkId: "dependent",
        dependsOn: ["unavailable"],
        execution: () => {
          dependentCalls += 1;
          return COMPLETED;
        }
      })
    ]);

    const result = await run(source);
    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.equal(dependentCalls, 0);
    assert.deepEqual(
      result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
      [
        {
          checkId: "dependent",
          outcome: {
            status: "unavailable",
            reason: { code: "prerequisite-unavailable", checkIds: ["unavailable"] }
          }
        },
        {
          checkId: "unavailable",
          outcome: { status: "unavailable", reason: { code: "source-unavailable" } }
        }
      ]
    );
  });

  it("rejects an invalid projected generic Task graph before any Check callback runs", async () => {
    let calls = 0;
    const result = await run(
      definition([
        check({
          dependsOn: ["missing-check"],
          execution: () => {
            calls += 1;
            return COMPLETED;
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

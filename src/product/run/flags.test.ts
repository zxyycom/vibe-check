import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig, type Check } from "../definition/project.ts";
import { run } from "./index.ts";

const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });

function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    effects: {
      cache: { enabled: false },
      logs: { enabled: false },
      output: { enabled: false },
      progress: { enabled: false }
    }
  });
}

describe("Package Run flags", () => {
  it("rejects invalid flag input before any Check callback", async () => {
    let calls = 0;
    const source = definition([
      {
        checkId: "flag-aware",
        displayName: "Flag-aware",
        execution: () => {
          calls += 1;
          return PASSED;
        }
      }
    ]);
    const inheritedSparseFlags = Array<string>(1);
    const derivedArrayPrototype = { 0: "inherited" };
    Object.setPrototypeOf(derivedArrayPrototype, Array.prototype);
    Object.setPrototypeOf(inheritedSparseFlags, derivedArrayPrototype);

    for (const flags of [
      "not-an-array",
      [""],
      ["valid", 1],
      Array<string>(1),
      inheritedSparseFlags
    ]) {
      const result = await run(source, { flags });
      assert.deepEqual(result, {
        kind: "configuration",
        definitionWarnings: [],
        diagnostic: {
          kind: "invalid-run-controls",
          path: "controls.flags",
          reason: "invalid-value"
        }
      });
    }
    assert.equal(calls, 0);
  });

  it("provides canonical immutable callback snapshots", async () => {
    const snapshots: (readonly string[])[] = [];
    const source = definition([
      {
        checkId: "flag-aware",
        displayName: "Flag-aware",
        execution: (context) => {
          assert.equal(Object.isFrozen(context.project.flags), true);
          assert.throws(
            () => Object.defineProperty(context.project.flags, "0", { value: "mutated" }),
            TypeError
          );
          snapshots.push(context.project.flags);
          return PASSED;
        }
      }
    ]);
    await run(source);
    await run(source, { flags: undefined });
    await run(source, { flags: [] });
    const callerFlags = ["enabled:docs", "disabled:docs", "enabled:docs"];
    const result = await run(source, { flags: callerFlags });
    callerFlags.push("caller-mutation");
    assert.equal(result.kind, "completed");
    assert.deepEqual(snapshots, [[], [], [], ["disabled:docs", "enabled:docs"]]);
  });

  it("keeps dependent admission after local not-applicable", async () => {
    let flagControlledCalls = 0;
    let dependentCalls = 0;
    const result = await run(
      definition([
        {
          checkId: "flag-controlled",
          displayName: "Flag-controlled",
          execution: (context) => {
            if (context.project.flags.includes("disabled:flag-controlled")) {
              return { status: "not-applicable", reason: { code: "project-disabled" } };
            }
            flagControlledCalls += 1;
            return PASSED;
          }
        },
        {
          checkId: "dependent",
          displayName: "Dependent",
          dependsOn: ["flag-controlled"],
          execution: () => {
            dependentCalls += 1;
            return PASSED;
          }
        }
      ]),
      { flags: ["disabled:flag-controlled"] }
    );
    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.equal(flagControlledCalls, 0);
    assert.equal(dependentCalls, 1);
    assert.deepEqual(
      result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
      [
        {
          checkId: "dependent",
          outcome: PASSED
        },
        {
          checkId: "flag-controlled",
          outcome: { status: "not-applicable", reason: { code: "project-disabled" } }
        }
      ]
    );
  });
});

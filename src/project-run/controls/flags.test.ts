import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import type { Check, CheckFlagEnablementMode, CheckOutcome } from "../../check/check.ts";
import { run } from "../run.ts";

const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });

function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    }
  });
}

const CONTROL_FLAGS = ["feature:alpha", "feature:beta"] as const;

function requireCompletedRun(result: Awaited<ReturnType<typeof run>>) {
  assert(result.kind === "completed");
  return result;
}

async function assertFlagEnablementMode(
  input: Readonly<{
    readonly mode: CheckFlagEnablementMode;
    readonly matchingFlags: readonly string[];
    readonly nonmatchingFlags: readonly string[];
  }>
): Promise<void> {
  let preflightCalls = 0;
  let controlledCalls = 0;
  let dependentCalls = 0;
  let observerCalls = 0;
  const observedStatuses: CheckOutcome["status"][] = [];
  const observedFlags: (readonly string[])[] = [];
  const source = definition([
    {
      checkId: "flag-controlled",
      displayName: "Flag-controlled",
      enabledByFlags: { flags: CONTROL_FLAGS, mode: input.mode },
      preflight: (options) => {
        preflightCalls += 1;
        return { status: "success", preparedOptions: options };
      },
      execution: ({ project }) => {
        controlledCalls += 1;
        observedFlags.push(project.flags);
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
    },
    {
      checkId: "observer",
      displayName: "Observer",
      observes: ["flag-controlled"],
      execution: ({ dependencies }) => {
        observerCalls += 1;
        const [observation] = dependencies.list();
        assert(observation !== undefined);
        observedStatuses.push(observation.outcome.status);
        return PASSED;
      }
    }
  ]);

  const enabled = requireCompletedRun(await run(source, { flags: input.matchingFlags }));
  const disabled = requireCompletedRun(await run(source, { flags: input.nonmatchingFlags }));
  assert.equal(preflightCalls, 1);
  assert.equal(controlledCalls, 1);
  assert.equal(dependentCalls, 1);
  assert.equal(observerCalls, 2);
  assert.deepEqual(observedStatuses, ["passed", "not-applicable"]);
  assert.deepEqual(observedFlags, [Object.freeze([...new Set(input.matchingFlags)].sort())]);
  assert.deepEqual(
    enabled.snapshot.checks.find(({ checkId }) => checkId === "flag-controlled")?.outcome,
    PASSED
  );
  assert.deepEqual(
    disabled.snapshot.checks.find(({ checkId }) => checkId === "flag-controlled")?.outcome,
    {
      status: "not-applicable",
      reason: { code: "flag-condition-not-matched" }
    }
  );
  assert.deepEqual(
    disabled.checkDurations.find(({ checkId }) => checkId === "flag-controlled"),
    { checkId: "flag-controlled", durationMs: null }
  );
  assert.deepEqual(
    disabled.snapshot.checks.find(({ checkId }) => checkId === "dependent")?.outcome,
    {
      status: "unavailable",
      reason: { code: "dependency-not-passed", checkIds: ["flag-controlled"] }
    }
  );
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

  it("enables all mode only when every configured flag is present", async () => {
    await assertFlagEnablementMode({
      matchingFlags: CONTROL_FLAGS,
      mode: "all",
      nonmatchingFlags: ["feature:alpha"]
    });
  });

  it("enables any mode when at least one configured flag is present", async () => {
    await assertFlagEnablementMode({
      matchingFlags: ["feature:beta"],
      mode: "any",
      nonmatchingFlags: ["feature:other"]
    });
    await assertFlagEnablementMode({
      matchingFlags: CONTROL_FLAGS,
      mode: "any",
      nonmatchingFlags: ["feature:other"]
    });
  });

  it("enables none mode only when no configured flag is present", async () => {
    await assertFlagEnablementMode({
      matchingFlags: ["feature:other"],
      mode: "none",
      nonmatchingFlags: ["feature:alpha"]
    });
  });

  it("enables not-all mode when at least one configured flag is absent", async () => {
    await assertFlagEnablementMode({
      matchingFlags: ["feature:alpha"],
      mode: "not-all",
      nonmatchingFlags: CONTROL_FLAGS
    });
    await assertFlagEnablementMode({
      matchingFlags: [],
      mode: "not-all",
      nonmatchingFlags: CONTROL_FLAGS
    });
  });

  it("keeps matching roots direct unless their author opts into dependency propagation", async () => {
    let providerCalls = 0;
    let rootCalls = 0;
    const result = requireCompletedRun(
      await run(
        definition([
          {
            checkId: "provider",
            displayName: "Provider",
            enabledByFlags: { flags: ["provider"], mode: "all" },
            execution: () => {
              providerCalls += 1;
              return PASSED;
            }
          },
          {
            checkId: "root",
            displayName: "Root",
            dependsOn: ["provider"],
            enabledByFlags: { flags: ["root"], mode: "all" },
            execution: () => {
              rootCalls += 1;
              return PASSED;
            }
          }
        ]),
        { flags: ["root"] }
      )
    );

    assert.equal(providerCalls, 0);
    assert.equal(rootCalls, 0);
    assert.deepEqual(result.snapshot.checks, [
      {
        checkId: "provider",
        displayName: "Provider",
        outcome: {
          status: "not-applicable",
          reason: { code: "flag-condition-not-matched" }
        }
      },
      {
        checkId: "root",
        displayName: "Root",
        outcome: {
          status: "unavailable",
          reason: { code: "dependency-not-passed", checkIds: ["provider"] }
        }
      }
    ]);
  });

  it("starts each opt-in root dependency closure without selecting observations", async () => {
    let alwaysCalls = 0;
    let middleCalls = 0;
    let observerCalls = 0;
    let providerCalls = 0;
    let rootOneCalls = 0;
    let rootTwoCalls = 0;
    const result = requireCompletedRun(
      await run(
        definition([
          {
            checkId: "always",
            displayName: "Always",
            execution: () => {
              alwaysCalls += 1;
              return PASSED;
            }
          },
          {
            checkId: "provider",
            displayName: "Provider",
            enabledByFlags: { flags: ["provider"], mode: "all" },
            preflight: (options) => ({ status: "success", preparedOptions: options }),
            execution: () => {
              providerCalls += 1;
              return PASSED;
            }
          },
          {
            checkId: "middle",
            displayName: "Middle",
            dependsOn: ["provider"],
            enabledByFlags: { flags: ["middle"], mode: "all" },
            execution: () => {
              middleCalls += 1;
              return PASSED;
            }
          },
          {
            checkId: "observer",
            displayName: "Observer",
            enabledByFlags: { flags: ["observer"], mode: "all" },
            execution: () => {
              observerCalls += 1;
              return PASSED;
            }
          },
          {
            checkId: "root-one",
            displayName: "Root one",
            dependsOn: ["middle"],
            observes: ["observer"],
            enabledByFlags: {
              flags: ["root-one"],
              mode: "all",
              propagateDependsOn: true
            },
            execution: () => {
              rootOneCalls += 1;
              return PASSED;
            }
          },
          {
            checkId: "root-two",
            displayName: "Root two",
            dependsOn: ["middle"],
            enabledByFlags: {
              flags: ["root-two"],
              mode: "all",
              propagateDependsOn: true
            },
            execution: () => {
              rootTwoCalls += 1;
              return PASSED;
            }
          }
        ]),
        { flags: ["root-one", "root-two"] }
      )
    );

    assert.deepEqual(
      { alwaysCalls, middleCalls, observerCalls, providerCalls, rootOneCalls, rootTwoCalls },
      {
        alwaysCalls: 1,
        middleCalls: 1,
        observerCalls: 0,
        providerCalls: 1,
        rootOneCalls: 1,
        rootTwoCalls: 1
      }
    );
    assert.deepEqual(
      result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, status: outcome.status })),
      [
        { checkId: "always", status: "passed" },
        { checkId: "middle", status: "passed" },
        { checkId: "observer", status: "not-applicable" },
        { checkId: "provider", status: "passed" },
        { checkId: "root-one", status: "passed" },
        { checkId: "root-two", status: "passed" }
      ]
    );
  });

  it("expands a direct-selected dependency when an opt-in root requires its prerequisite", async () => {
    let middleCalls = 0;
    let providerCalls = 0;
    let rootCalls = 0;
    const result = requireCompletedRun(
      await run(
        definition([
          {
            checkId: "provider",
            displayName: "Provider",
            enabledByFlags: { flags: ["provider"], mode: "all" },
            execution: () => {
              providerCalls += 1;
              return PASSED;
            }
          },
          {
            checkId: "middle",
            displayName: "Middle",
            dependsOn: ["provider"],
            enabledByFlags: { flags: ["middle"], mode: "all" },
            execution: () => {
              middleCalls += 1;
              return PASSED;
            }
          },
          {
            checkId: "root",
            displayName: "Root",
            dependsOn: ["middle"],
            enabledByFlags: {
              flags: ["root"],
              mode: "all",
              propagateDependsOn: true
            },
            execution: () => {
              rootCalls += 1;
              return PASSED;
            }
          }
        ]),
        { flags: ["middle", "root"] }
      )
    );

    assert.deepEqual(
      { middleCalls, providerCalls, rootCalls },
      { middleCalls: 1, providerCalls: 1, rootCalls: 1 }
    );
    assert.deepEqual(
      result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, status: outcome.status })),
      [
        { checkId: "middle", status: "passed" },
        { checkId: "provider", status: "passed" },
        { checkId: "root", status: "passed" }
      ]
    );
  });

  it("leaves pre-work cancellation ahead of flag dependency selection", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const result = await run(
      definition([
        {
          checkId: "provider",
          displayName: "Provider",
          enabledByFlags: { flags: ["provider"], mode: "all" },
          execution: () => {
            calls += 1;
            return PASSED;
          }
        },
        {
          checkId: "root",
          displayName: "Root",
          dependsOn: ["provider"],
          enabledByFlags: {
            flags: ["root"],
            mode: "all",
            propagateDependsOn: true
          },
          execution: () => {
            calls += 1;
            return PASSED;
          }
        }
      ]),
      { flags: ["root"], signal: controller.signal }
    );

    assert.equal(result.kind, "cancelled");
    if (result.kind === "cancelled") assert.equal(result.phase, "pre-work");
    assert.equal(calls, 0);
  });
});

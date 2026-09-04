import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Check } from "../../check/check.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
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

function requireCompletedRun(result: Awaited<ReturnType<typeof run>>) {
  assert(result.kind === "completed");
  return result;
}

describe("Package Run flag dependency selection", () => {
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

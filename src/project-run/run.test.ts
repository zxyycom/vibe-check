import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  inherit,
  type Check,
  type CheckExecution,
  type DependencyReadResult
} from "../check/check.ts";
import { defineConfig } from "../project-definition/project-definition.ts";
import { run } from "./run.ts";

const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });

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
    execution: overrides.execution ?? (() => PASSED),
    ...(overrides.dependsOn === undefined ? {} : { dependsOn: overrides.dependsOn }),
    ...(overrides.maxParallel === undefined ? {} : { maxParallel: overrides.maxParallel }),
    ...(overrides.mutex === undefined ? {} : { mutex: overrides.mutex })
  };
}

function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    }
  });
}

function deferred(): Readonly<{ readonly promise: Promise<void>; readonly resolve: () => void }> {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return Object.freeze({
    promise,
    resolve: (): void => {
      if (resolvePromise === undefined) throw new Error("Deferred promise is unavailable");
      resolvePromise();
    }
  });
}

describe("Package Run", () => {
  it("rejects invalid closed controls while a blocked preflight settles unavailable before execution", async () => {
    let calls = 0;
    let preflightReceivedFrozenOptions = false;
    const source = definition([
      check({
        execution: () => {
          calls += 1;
          return PASSED;
        }
      })
    ]);

    const unknownControlResult = await run(source, { changedFiles: ["src/a.ts"] });
    const badDefinition = await run({ ...source, unexpected: true }, {});
    const badOptions = await run(
      definition([
        {
          ...check({
            execution: () => {
              calls += 1;
              return PASSED;
            }
          }),
          options: { accepted: false },
          preflight: (options) => {
            preflightReceivedFrozenOptions = Object.isFrozen(options);
            return { status: "failure", action: "block", reason: { code: "invalid-options" } };
          }
        }
      ])
    );

    assert.deepEqual(unknownControlResult, {
      kind: "configuration",
      definitionWarnings: [],
      diagnostic: {
        kind: "invalid-run-controls",
        path: "controls.changedFiles",
        reason: "unknown-key"
      }
    });
    assert.equal(badDefinition.kind, "configuration");
    assert.equal(badOptions.kind, "completed");
    if (badOptions.kind === "completed") {
      assert.deepEqual(badOptions.snapshot.checks[0]?.outcome, {
        status: "unavailable",
        reason: { code: "invalid-options" }
      });
      assert.deepEqual(badOptions.checkDurations, [{ checkId: "custom", durationMs: null }]);
    }
    assert.equal(preflightReceivedFrozenOptions, true);
    assert.equal(calls, 0);
  });

  it("executes each normalized Check directly with the public callback context", async () => {
    let received:
      | Readonly<{
          readonly contextFrozen: boolean;
          readonly dependenciesFrozen: boolean;
          readonly dependencyRead: DependencyReadResult;
          readonly options: object;
          readonly projectKeys: readonly string[];
          readonly root: string;
          readonly signal: AbortSignal;
        }>
      | undefined;
    const source = definition([
      check({
        execution: (context) => {
          received = {
            contextFrozen: Object.isFrozen(context),
            dependencyRead: context.dependencies.get("missing"),
            dependenciesFrozen: Object.isFrozen(context.dependencies),
            options: context.options,
            projectKeys: Object.keys(context.project).sort(),
            root: context.project.root,
            signal: context.signal
          };
          return PASSED;
        }
      })
    ]);
    const root = mkdtempSync(join(tmpdir(), "vibe-check-direct-run-"));
    try {
      const toISOString = Object.getOwnPropertyDescriptor(Date.prototype, "toISOString");
      if (toISOString === undefined) throw new Error("Date.prototype.toISOString is unavailable");
      Object.defineProperty(Date.prototype, "toISOString", {
        configurable: true,
        value: (): string => {
          throw new Error("disabled output must not construct a publication model");
        }
      });
      let result: Awaited<ReturnType<typeof run>>;
      try {
        result = await run(source, { projectRoot: root });
      } finally {
        Object.defineProperty(Date.prototype, "toISOString", toISOString);
      }
      assert.equal(result.kind, "completed");
      assert.equal(received?.contextFrozen, true);
      assert.deepEqual(received?.dependencyRead, {
        ok: false,
        error: { code: "dependency-not-declared", checkId: "missing" }
      });
      assert.equal(received?.dependenciesFrozen, true);
      assert.deepEqual(received?.options, {});
      assert.deepEqual(received?.projectKeys, ["flags", "root"]);
      assert.equal(received?.root, root);
      assert.equal(received?.signal.aborted, false);
      if (result.kind !== "completed") return;
      assert.deepEqual(
        result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
        [
          {
            checkId: "custom",
            outcome: PASSED
          }
        ]
      );
      assert.deepEqual(result.definitionWarnings, []);
      assert.doesNotMatch(JSON.stringify(result), /createTaskPlan|binding|operationalDependencies/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns the existing execution cancellation result when the preflight barrier aborts", async () => {
    const controller = new AbortController();
    const preflightEntered = deferred();
    let callbackCalls = 0;
    const cancelled = run(
      definition([
        {
          ...check({
            execution: () => {
              callbackCalls += 1;
              return PASSED;
            }
          }),
          options: {},
          preflight: async (_options, signal) => {
            assert.equal(signal, controller.signal);
            preflightEntered.resolve();
            await new Promise<void>((resolve) =>
              signal.addEventListener("abort", () => resolve(), { once: true })
            );
            return { status: "success", preparedOptions: {} };
          }
        }
      ]),
      { signal: controller.signal }
    );
    await preflightEntered.promise;
    controller.abort();
    const result = await cancelled;
    assert.equal(result.kind, "cancelled");
    if (result.kind === "cancelled") {
      assert.equal(result.phase, "execution");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
    }
    assert.equal(callbackCalls, 0);
  });

  it("admits an unavailable dependency and exposes its read failure", async () => {
    let dependentCalls = 0;
    let read: DependencyReadResult | undefined;
    const source = definition([
      check({
        checkId: "unavailable",
        execution: () => ({ status: "unavailable", reason: { code: "source-unavailable" } })
      }),
      check({
        checkId: "dependent",
        dependsOn: ["unavailable"],
        execution: (context) => {
          dependentCalls += 1;
          read = context.dependencies.get("unavailable");
          return read.ok ? PASSED : { status: "unavailable", reason: { code: read.error.code } };
        }
      })
    ]);

    const result = await run(source);
    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.equal(dependentCalls, 1);
    assert.deepEqual(read, {
      ok: false,
      error: {
        code: "upstream-data-unavailable",
        checkId: "unavailable",
        status: "unavailable"
      }
    });
    assert.deepEqual(
      result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
      [
        {
          checkId: "dependent",
          outcome: {
            status: "unavailable",
            reason: { code: "upstream-data-unavailable" }
          }
        },
        {
          checkId: "unavailable",
          outcome: { status: "unavailable", reason: { code: "source-unavailable" } }
        }
      ]
    );

    let inheritedRead: DependencyReadResult | undefined;
    const inheritedResult = await run(
      definition([
        check({
          checkId: "inherited-source",
          execution: () => ({ status: "passed", data: { inherited: true } })
        }),
        {
          checkId: "container",
          displayName: "Container",
          dependsOn: inherit({ add: ["inherited-source"] }),
          checks: [
            check({
              checkId: "inherited-dependent",
              execution: (context) => {
                inheritedRead = context.dependencies.get("inherited-source");
                return { status: "passed", data: { dependent: true } };
              }
            })
          ]
        }
      ])
    );
    assert.equal(inheritedResult.kind, "completed");
    if (inheritedResult.kind !== "completed") return;
    assert.deepEqual(inheritedRead, {
      ok: true,
      checkId: "inherited-source",
      status: "passed",
      data: { inherited: true }
    });
    const inheritedSourceOutcome = inheritedResult.snapshot.checks.find(
      (coreCheck) => coreCheck.checkId === "inherited-source"
    )?.outcome;
    if (inheritedRead?.ok && inheritedSourceOutcome?.status === "passed") {
      assert.equal(inheritedRead.data, inheritedSourceOutcome.data);
    }
  });

  it("rejects an invalid projected generic Task graph before any Check callback runs", async () => {
    let calls = 0;
    const result = await run(
      definition([
        check({
          dependsOn: ["missing-check"],
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

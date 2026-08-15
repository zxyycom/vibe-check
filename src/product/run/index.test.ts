import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { fileMetrics, defineConfig, type CustomCheckBinding } from "../definition/project.ts";
import { run } from "./index.ts";
import { assertPublishedResult } from "./test-support.ts";

const custom = (overrides: Readonly<{
  readonly applicability?: () => unknown;
  readonly binding?: CustomCheckBinding;
  readonly execute?: () => unknown;
  readonly checkId?: string;
  readonly dependsOn?: string | readonly string[];
  readonly mutex?: string | readonly string[];
}> = {}) => ({
  kind: "custom" as const,
  checkId: overrides.checkId ?? "custom",
  displayName: "Custom",
  recordTypes: [],
  applicability: overrides.applicability ?? (() => ({ status: "applicable" as const, workHandles: [] })),
  binding: overrides.binding ?? {
    kind: "direct" as const,
    execute: overrides.execute ?? (() => ({ verdict: "passed" }))
  },
  ...(overrides.dependsOn === undefined ? {} : { dependsOn: overrides.dependsOn }),
  ...(overrides.mutex === undefined ? {} : { mutex: overrides.mutex })
});

function definition(overrides: Parameters<typeof custom>[0] = {}) {
  return defineConfig({
    checks: [custom(overrides)],
    policies: {
      "project-gate": {
        policyId: "project-gate",
        references: [],
        acceptance: [],
        views: [],
        readiness: [],
        blockWhen: { kind: "run-status" as const, checkId: "custom", status: "failed" }
      }
    },
    selectedPolicy: "project-gate",
    effects: {
      cache: { enabled: false },
      logs: { enabled: false },
      output: { enabled: false },
      progress: { enabled: false }
    }
  });
}

describe("Package Run", () => {
  it("rejects invalid closed controls before project applicability or runner functions", async () => {
    let calls = 0;
    const source = definition({
      applicability: () => {
        calls += 1;
        return { status: "applicable", workHandles: [] };
      }
    });
    const result = await run(source, { unexpected: true });
    const incompatibleComparison = await run(source, {
      comparison: { referenceName: "baseline", revision: "HEAD" }
    });

    assert.deepEqual(result, {
      kind: "configuration",
      diagnostic: { kind: "invalid-run-controls", path: "controls.unexpected", reason: "unknown-key" }
    });
    assert.deepEqual(incompatibleComparison, {
      kind: "configuration",
      diagnostic: { kind: "invalid-run-controls", path: "controls.comparison", reason: "invalid-value" }
    });
    assert.equal(calls, 0);
  });

  it("requires the definition itself before any project function", async () => {
    let customCalls = 0;
    const missing = await run(undefined, {});
    const invalid = await run({
      ...definition({ applicability: () => { customCalls += 1; return { status: "applicable", workHandles: [] }; } }),
      unexpected: true
    });

    assert.equal(missing.kind, "configuration");
    assert.equal(invalid.kind, "configuration");
    assert.equal(customCalls, 0);
  });

  it("uses the validated named policy and keeps function bindings out of its result", async () => {
    let directCalls = 0;
    const source = definition({ execute: () => { directCalls += 1; return { verdict: "passed" }; } });
    const root = mkdtempSync(join(tmpdir(), "vibe-check-package-run-"));
    try {
      const result = await run(source, {
        projectRoot: root,
        effects: {
          cache: { enabled: true, directory: "cache" },
          logs: { enabled: false },
          output: { enabled: true, directory: "published" },
          progress: { enabled: false }
        }
      });
      assertPublishedResult(result, root);
      const disabled = await run(source, {
        projectRoot: root,
        effects: { output: { enabled: false, directory: "disabled-publication" } }
      });
      assert.equal(disabled.kind, "completed");
      if (disabled.kind !== "completed") return;
      assert.equal(disabled.effects.output.status, "disabled");
      assert.equal(existsSync(join(root, "disabled-publication")), false);
      writeFileSync(join(root, "blocked-output"), "not a directory", "utf8");
      const outputFailure = await run(source, {
        projectRoot: root,
        effects: { output: { enabled: true, directory: "blocked-output" } }
      });
      assert.equal(outputFailure.kind, "effect");
      if (outputFailure.kind !== "effect") return;
      assert.deepEqual(outputFailure.diagnostic, { effect: "output", code: "effect-failed" });
      assert.equal(outputFailure.effects.output.status, "failed");
      assert.equal(directCalls, 3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("calls an applicable TaskPlan factory during closed planning and lets the shared scheduler run it", async () => {
    let factoryCalls = 0;
    let leafCalls = 0;
    const result = await run(definition({
      binding: {
        kind: "task-plan",
        createTaskPlan: () => {
          factoryCalls += 1;
          return {
            tasks: [{
              id: "work",
              workHandles: ["work-handle/v1:custom"],
              dependsOn: [],
              mutex: [],
              run: () => { leafCalls += 1; return "complete"; }
            }],
            complete: () => ({ verdict: "passed" })
          };
        }
      },
      applicability: () => ({ status: "applicable", workHandles: ["work-handle/v1:custom"] })
    }));

    assert.equal(result.kind, "completed");
    assert.equal(factoryCalls, 1);
    assert.equal(leafCalls, 1);
  });

  it("does not call a TaskPlan factory for a not-applicable Check", async () => {
    let factoryCalls = 0;
    const result = await run(definition({
      binding: { kind: "task-plan", createTaskPlan: () => { factoryCalls += 1; throw new Error("must not be called"); } },
      applicability: () => ({ status: "not-applicable" })
    }));
    assert.equal(result.kind, "completed");
    assert.equal(factoryCalls, 0);
  });

  it("flattens group dependencies before shared execution", async () => {
    const calls: string[] = [];
    const result = await run(defineConfig({
      checks: [{
        id: "producers",
        checks: [custom({
          checkId: "producer",
          execute: () => { calls.push("producer"); return { verdict: "passed" }; }
        })]
      }, custom({
        checkId: "consumer",
        dependsOn: "producers",
        execute: () => { calls.push("consumer"); return { verdict: "passed" }; }
      })],
      effects: {
        cache: { enabled: false }, logs: { enabled: false }, output: { enabled: false }, progress: { enabled: false }
      }
    }));

    assert.equal(result.kind, "completed");
    assert.deepEqual(calls, ["producer", "consumer"]);
  });

  it("uses only explicit mutex constraints to serialize direct and TaskPlan leaf work", async () => {
    let inFlight = 0;
    let maximumInFlight = 0;
    const enter = async () => {
      inFlight += 1;
      maximumInFlight = Math.max(maximumInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
    };
    const result = await run(defineConfig({
      checks: [{
        id: "native-work",
        mutex: "native",
        checks: [
          custom({ checkId: "direct", execute: enter }),
          custom({
            checkId: "planned",
            applicability: () => ({ status: "applicable", workHandles: ["work-handle/v1:planned"] }),
            binding: {
              kind: "task-plan",
              createTaskPlan: () => ({
                tasks: [{
                  id: "work",
                  workHandles: ["work-handle/v1:planned"],
                  run: enter
                }],
                complete: () => ({ verdict: "passed" })
              })
            }
          })
        ]
      }],
      scheduler: { maxParallel: 2 },
      effects: {
        cache: { enabled: false }, logs: { enabled: false }, output: { enabled: false }, progress: { enabled: false }
      }
    }));

    assert.equal(result.kind, "completed");
    assert.equal(maximumInFlight, 1);
  });

  it("prepares built-ins present in the tree before a dependent custom Check", async () => {
    let consumerCalls = 0;
    const result = await run(defineConfig({
      checks: [
        fileMetrics,
        custom({
          checkId: "consumer",
          dependsOn: "file-metrics",
          execute: () => { consumerCalls += 1; return { verdict: "passed" }; }
        })
      ],
      effects: {
        cache: { enabled: false }, logs: { enabled: false }, output: { enabled: false }, progress: { enabled: false }
      }
    }), { operationalDependencies: { file: { executable: process.execPath } } });

    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.equal(result.snapshot.runs.find((entry) => entry.checkId === "file-metrics")?.status, "failed");
    assert.equal(result.snapshot.runs.find((entry) => entry.checkId === "consumer")?.diagnostic?.category, "unavailable");
    assert.equal(consumerCalls, 0);
  });

  it("observes cooperative cancellation after input validation and before planning work", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const result = await run(definition({
      applicability: () => { calls += 1; return { status: "applicable", workHandles: [] }; }
    }), { signal: controller.signal });
    assert.equal(result.kind, "cancelled");
    if (result.kind === "cancelled") assert.equal(result.phase, "pre-work");
    assert.equal(calls, 0);
  });
});

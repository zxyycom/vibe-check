import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig, type CustomCheckDeclaration } from "./project-definition.ts";
import { projectMachinePublicationV2 } from "./quality-core/src/output/publication-v2/index.ts";
import { run } from "./run.ts";

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
      diagnostic: {
        kind: "invalid-run-controls",
        path: "controls.unexpected",
        reason: "unknown-key"
      }
    });
    assert.deepEqual(incompatibleComparison, {
      kind: "configuration",
      diagnostic: {
        kind: "invalid-run-controls",
        path: "controls.comparison",
        reason: "invalid-value"
      }
    });
    assert.equal(calls, 0);
  });

  it("requires the definition itself before any project function", async () => {
    let customCalls = 0;
    const missing = await run(undefined, {});
    const invalid = await run({
      ...definition({
        applicability: () => {
          customCalls += 1;
          return { status: "applicable", workHandles: [] };
        }
      }),
      unexpected: true
    });

    assert.equal(missing.kind, "configuration");
    assert.equal(invalid.kind, "configuration");
    assert.equal(customCalls, 0);
  });

  it("uses the validated named policy and keeps function bindings out of its result", async () => {
    let directCalls = 0;
    const source = definition({
      execute: () => {
        directCalls += 1;
        return { verdict: "passed" };
      }
    });
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

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(result.decision.policyId, "project-gate");
      assert.equal(result.decision.gate.status, "passed");
      assert.equal(result.snapshot.runs[0]?.result?.verdict, "passed");
      assert.deepEqual(result.effects, {
        cache: { enabled: true, status: "not-run" },
        logs: { enabled: false, status: "disabled" },
        output: { enabled: true, status: "succeeded" },
        progress: { enabled: false, status: "disabled" }
      });
      const machine = JSON.parse(readFileSync(join(root, "published", "run.json"), "utf8")) as {
        catalogFingerprint: string;
        decision: unknown;
      };
      assert.equal(machine.catalogFingerprint, result.model.snapshot.catalogFingerprint);
      assert.deepEqual(machine.decision, projectMachinePublicationV2(result.model).run.decision);
      assert.doesNotMatch(JSON.stringify(result), /createTaskPlan|"execute"/);

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
    const printed: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => printed.push(args.join(" "));
    let result;
    try {
      result = await run(definition({
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
                run: () => {
                  leafCalls += 1;
                  return "complete";
                }
              }],
              complete: () => ({ verdict: "passed" })
            };
          }
        },
        applicability: () => ({ status: "applicable", workHandles: ["work-handle/v1:custom"] })
      }), { effects: { logs: { enabled: true }, progress: { enabled: true } } });
    } finally {
      console.log = originalLog;
    }

    assert.equal(result.kind, "completed");
    assert.equal(factoryCalls, 1);
    assert.equal(leafCalls, 1);
    if (result.kind !== "completed") return;
    assert.equal(result.effects.logs.status, "succeeded");
    assert.equal(result.effects.progress.status, "succeeded");
    assert.ok(printed.includes("Vibe Check: execution"));
    assert.ok(printed.includes("Vibe Check: effects"));
    assert.ok(printed.some((line) => line.includes("Summary:")));
  });

  it("does not call a TaskPlan factory for an unselected or not-applicable Check", async () => {
    let factoryCalls = 0;
    const source = definition({
      binding: {
        kind: "task-plan",
        createTaskPlan: () => {
          factoryCalls += 1;
          throw new Error("must not be called");
        }
      },
      applicability: () => ({ status: "not-applicable" })
    });

    const notApplicable = await run(source);
    const result = await run({ ...source, checks: { ...source.checks, selected: [] } });

    assert.equal(notApplicable.kind, "completed");
    assert.equal(result.kind, "completed");
    assert.equal(factoryCalls, 0);
    if (notApplicable.kind !== "completed") return;
    assert.deepEqual(notApplicable.effects, {
      cache: { enabled: false, status: "disabled" },
      logs: { enabled: false, status: "disabled" },
      output: { enabled: false, status: "disabled" },
      progress: { enabled: false, status: "disabled" }
    });
  });

  it("closes requiresChecks through the existing catalog before shared execution", async () => {
    const calls: string[] = [];
    const result = await run(defineConfig({
      checks: {
        custom: [{
          definition: { checkId: "producer", displayName: "Producer", recordTypes: [] },
          applicability: () => ({ status: "applicable", workHandles: [] }),
          binding: { kind: "direct", execute: () => { calls.push("producer"); return { verdict: "passed" }; } }
        }, {
          definition: { checkId: "consumer", displayName: "Consumer", recordTypes: [] },
          applicability: () => ({ status: "applicable", workHandles: [] }),
          binding: { kind: "direct", execute: () => { calls.push("consumer"); return { verdict: "passed" }; } }
        }],
        schedules: [
          { checkId: "producer", requiresChecks: [] },
          { checkId: "consumer", requiresChecks: ["producer"] }
        ],
        selected: ["consumer"]
      },
      effects: {
        cache: { enabled: false },
        logs: { enabled: false },
        output: { enabled: false },
        progress: { enabled: false }
      }
    }));

    assert.equal(result.kind, "completed");
    assert.deepEqual(calls, ["producer", "consumer"]);
  });

  it("prepares a required built-in selected through the Check dependency closure", async () => {
    let consumerCalls = 0;
    const result = await run(defineConfig({
      checks: {
        builtIn: ["file-metrics"],
        custom: [{
          definition: { checkId: "consumer", displayName: "Consumer", recordTypes: [] },
          applicability: () => ({ status: "applicable", workHandles: [] }),
          binding: { kind: "direct", execute: () => {
            consumerCalls += 1;
            return { verdict: "passed" };
          } }
        }],
        schedules: [
          { checkId: "file-metrics", requiresChecks: [] },
          { checkId: "consumer", requiresChecks: ["file-metrics"] }
        ],
        selected: ["consumer"]
      },
      effects: {
        cache: { enabled: false },
        logs: { enabled: false },
        output: { enabled: false },
        progress: { enabled: false }
      }
    }), {
      operationalDependencies: { file: { executable: process.execPath } }
    });

    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.equal(result.snapshot.runs.find((run) => run.checkId === "file-metrics")?.status, "failed");
    assert.equal(result.snapshot.runs.find((run) => run.checkId === "consumer")?.diagnostic?.category, "unavailable");
    assert.equal(consumerCalls, 0);
  });

  it("observes cooperative cancellation after input validation and before planning work", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const result = await run(definition({
      applicability: () => {
        calls += 1;
        return { status: "applicable", workHandles: [] };
      }
    }), { signal: controller.signal });

    assert.equal(result.kind, "cancelled");
    if (result.kind === "cancelled") assert.equal(result.phase, "pre-work");
    assert.equal(calls, 0);
  });
});

function definition(overrides: Partial<{
  applicability: () => unknown;
  binding: CustomCheckDeclaration["binding"];
  execute: () => unknown;
}>) {
  const binding = overrides.binding ?? {
    kind: "direct" as const,
    execute: overrides.execute ?? (() => ({ verdict: "passed" }))
  };
  return defineConfig({
    checks: {
      custom: [{
        definition: {
          checkId: "custom",
          displayName: "Custom",
          recordTypes: []
        },
        applicability: overrides.applicability ?? (() => ({ status: "applicable", workHandles: [] })),
        binding
      }],
      schedules: [{ checkId: "custom", requiresChecks: [] }],
      selected: ["custom"]
    },
    policies: {
      "project-gate": {
        policyId: "project-gate",
        references: [],
        acceptance: [],
        views: [],
        readiness: [],
        blockWhen: { kind: "run-status", checkId: "custom", status: "failed" }
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

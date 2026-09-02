import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../project-definition/project-definition.ts";
import type { DiagnosticObservation } from "./diagnostic-logging/logger.ts";
import { executeValidatedRun } from "./invocation.ts";

const PASSED = Object.freeze({
  data: Object.freeze({}),
  status: "passed" as const
});

describe("Package Run learned Scheduler admission", () => {
  it("learns admitted Task durations through a project-root-relative state directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "vibe-check-learned-scheduler-"));
    try {
      const firstOrder: string[] = [];
      const first = await executeValidatedRun(
        learnedDefinition(firstOrder),
        { projectRoot: root },
        []
      );
      assert.equal(first.kind, "completed");
      assert.deepEqual(firstOrder, ["fast", "slow"]);
      assert.equal("terminalSchedulerMeasurement" in first, false);

      const history = await readFile(
        join(root, "scheduler-state", "scheduler-history.json"),
        "utf8"
      );
      assert.match(history, /identityDigest/);
      assert.doesNotMatch(history, /private-option/);
      assert.doesNotMatch(history, /private-flag/);

      const secondOrder: string[] = [];
      const second = await executeValidatedRun(
        learnedDefinition(secondOrder),
        { projectRoot: root },
        []
      );
      assert.equal(second.kind, "completed");
      assert.deepEqual(secondOrder, ["slow", "fast"]);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("emits bounded learned diagnostics and contains local history write failure", async () => {
    const root = await mkdtemp(join(tmpdir(), "vibe-check-learned-diagnostics-"));
    try {
      await writeFile(join(root, "not-a-directory"), "not a directory", "utf8");
      const observations: DiagnosticObservation[] = [];
      const result = await executeValidatedRun(
        learnedDefinition([], "not-a-directory", true),
        { flags: ["private-flag"], projectRoot: root },
        [],
        {
          diagnosticLoggerFactory: () =>
            Object.freeze({
              close: () => "succeeded" as const,
              observe: (observation: DiagnosticObservation) => observations.push(observation)
            })
        }
      );

      assert.equal(result.kind, "completed");
      const learning = observations.filter(
        (observation) =>
          observation.event.startsWith("scheduler.history.") ||
          observation.event === "scheduler.learned-admission"
      );
      assert.ok(learning.some((observation) => observation.event === "scheduler.history.read"));
      assert.equal(
        learning.filter((observation) => observation.event === "scheduler.learned-admission")
          .length,
        2
      );
      assert.ok(
        learning.some(
          (observation) =>
            observation.event === "scheduler.history.write" && observation.tags.includes("FAILED")
        )
      );
      const serialized = JSON.stringify(observations);
      assert.doesNotMatch(serialized, /private-option/);
      assert.doesNotMatch(serialized, /private-flag/);
      assert.doesNotMatch(serialized, /identityDigest/);
      assert.doesNotMatch(serialized, /samples/);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

function learnedDefinition(
  order: string[],
  stateDirectory = "scheduler-state",
  diagnosticLogging = false
) {
  return defineConfig({
    checks: [
      {
        checkId: "fast",
        displayName: "Fast",
        execution: async () => {
          order.push("fast");
          await delay(2);
          return PASSED;
        },
        options: { retainedOnlyAsDigest: "private-option" }
      },
      {
        checkId: "slow",
        displayName: "Slow",
        execution: async () => {
          order.push("slow");
          await delay(30);
          return PASSED;
        },
        options: { retainedOnlyAsDigest: "private-option" }
      }
    ],
    outputs: {
      diagnosticLogging: { enabled: diagnosticLogging },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    scheduler: {
      admissionPolicy: { kind: "learned-critical-path", stateDirectory },
      maxParallel: 1
    }
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

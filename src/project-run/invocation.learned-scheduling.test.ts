import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { Check } from "../check/check.ts";
import {
  defineConfig,
  type SchedulerMeasurementHook
} from "../project-definition/project-definition.ts";
import type { DiagnosticLogger, DiagnosticObservation } from "./diagnostic-logging/logger.ts";
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
        learnedDefinition({ order: firstOrder }),
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
        learnedDefinition({ order: secondOrder }),
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
        learnedDefinition({
          diagnosticLogging: true,
          order: [],
          stateDirectory: "not-a-directory"
        }),
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

  it("prepares before admission and records only after terminal measurement Hooks settle", async () => {
    const root = await mkdtemp(join(tmpdir(), "vibe-check-learned-lifecycle-"));
    try {
      const events: string[] = [];
      let historyVisibleToTerminalHook = true;
      const result = await executeValidatedRun(
        learnedDefinition({
          diagnosticLogging: true,
          measurementHooks: [
            async () => {
              events.push("terminal-hook");
              try {
                await readFile(join(root, "scheduler-state", "scheduler-history.json"), "utf8");
              } catch {
                historyVisibleToTerminalHook = false;
              }
            }
          ],
          order: []
        }),
        { projectRoot: root },
        [],
        {
          diagnosticLoggerFactory: () => historyLifecycleDiagnosticLogger(events)
        }
      );

      assert.equal(result.kind, "completed");
      assert.equal(historyVisibleToTerminalHook, false);
      assertOrdered({
        events,
        required: [
          "scheduler.history.read",
          "scheduler.learned-admission",
          "terminal-hook",
          "scheduler.history.recorded",
          "scheduler.history.write"
        ]
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("records a cancelled Run only after its terminal measurement Hook settles", async () => {
    const root = await mkdtemp(join(tmpdir(), "vibe-check-learned-cancelled-lifecycle-"));
    try {
      const controller = new AbortController();
      const events: string[] = [];
      const result = await executeValidatedRun(
        learnedDefinition({
          checks: [
            {
              checkId: "started",
              displayName: "Started",
              execution: () => {
                controller.abort();
                return PASSED;
              }
            },
            {
              checkId: "cancelled-before-start",
              displayName: "Cancelled before start",
              execution: () => PASSED
            }
          ],
          diagnosticLogging: true,
          measurementHooks: [async () => events.push("terminal-hook")],
          order: []
        }),
        { projectRoot: root, signal: controller.signal },
        [],
        {
          diagnosticLoggerFactory: () => historyLifecycleDiagnosticLogger(events)
        }
      );

      assert.equal(result.kind, "cancelled");
      assertOrdered({
        events,
        required: [
          "scheduler.history.read",
          "scheduler.learned-admission",
          "terminal-hook",
          "scheduler.history.recorded",
          "scheduler.history.write"
        ]
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

function learnedDefinition(input: {
  readonly order: string[];
  readonly checks?: readonly Check[];
  readonly diagnosticLogging?: boolean;
  readonly measurementHooks?: readonly SchedulerMeasurementHook[];
  readonly stateDirectory?: string;
}) {
  const stateDirectory = input.stateDirectory ?? "scheduler-state";
  return defineConfig({
    checks: input.checks ?? learnedChecks(input.order),
    outputs: {
      diagnosticLogging: { enabled: input.diagnosticLogging ?? false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    scheduler: {
      admissionPolicy: { kind: "learned-critical-path", stateDirectory },
      maxParallel: 1,
      measurementHooks: input.measurementHooks ?? []
    }
  });
}

function learnedChecks(order: string[]): readonly Check[] {
  return [
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
  ];
}

function historyLifecycleDiagnosticLogger(events: string[]): DiagnosticLogger {
  return Object.freeze({
    close: () => "succeeded" as const,
    observe: (observation: DiagnosticObservation) => {
      if (
        observation.event === "scheduler.history.read" ||
        observation.event === "scheduler.learned-admission" ||
        observation.event === "scheduler.history.recorded" ||
        observation.event === "scheduler.history.write"
      ) {
        events.push(observation.event);
      }
    }
  });
}

function assertOrdered(input: {
  readonly events: readonly string[];
  readonly required: readonly string[];
}): void {
  let priorIndex = -1;
  for (const event of input.required) {
    const index = input.events.indexOf(event, priorIndex + 1);
    assert.ok(
      index >= 0,
      `expected ${event} after ${input.events.slice(priorIndex + 1).join(", ")}`
    );
    priorIndex = index;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

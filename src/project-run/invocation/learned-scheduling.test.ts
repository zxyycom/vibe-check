import assert from "node:assert/strict";

import { assertEventsInOrder } from "./invocation-event-order.test-support.ts";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { Check } from "../../check/check.ts";
import {
  createLearnedCriticalPathStrategy,
  type LearnedCriticalPathObservation
} from "../../package-tools/learned-critical-path/strategy.ts";
import {
  defineConfig,
  type SchedulerTerminalEffect
} from "../../project-definition/project-definition.ts";
import { executeValidatedRun } from "./run.ts";

const PASSED = Object.freeze({
  data: Object.freeze({}),
  status: "passed" as const
});

describe("Package Run learned Scheduler admission", () => {
  it("learns admitted Task durations through a caller-owned absolute state directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "vibe-check-learned-scheduler-"));
    try {
      const firstOrder: string[] = [];
      let nowMs = 0;
      const clock = { now: () => nowMs };
      const advance = (milliseconds: number): void => {
        nowMs += milliseconds;
      };
      const first = await executeValidatedRun(
        learnedDefinition({
          order: firstOrder,
          advance,
          sampleWindow: 1,
          stateDirectory: join(root, "scheduler-state")
        }),
        { projectRoot: root },
        [],
        { clock }
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
      const firstPersisted: unknown = JSON.parse(history);
      assertPersistedDurations(firstPersisted);

      const secondOrder: string[] = [];
      const second = await executeValidatedRun(
        learnedDefinition({
          order: secondOrder,
          advance,
          sampleWindow: 1,
          stateDirectory: join(root, "scheduler-state")
        }),
        { projectRoot: root },
        [],
        { clock }
      );
      assert.equal(second.kind, "completed");
      assert.deepEqual(secondOrder, ["slow", "fast"]);
      const persisted: unknown = JSON.parse(
        await readFile(join(root, "scheduler-state", "scheduler-history.json"), "utf8")
      );
      assertPersistedHistory(persisted);
      assertPersistedDurations(persisted);
      assert.ok(persisted.series.every((series) => series.samples.length <= 1));
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("uses caller-owned observations and contains local history write failure", async () => {
    const root = await mkdtemp(join(tmpdir(), "vibe-check-learned-diagnostics-"));
    try {
      await writeFile(join(root, "not-a-directory"), "not a directory", "utf8");
      const observations: LearnedCriticalPathObservation[] = [];
      const result = await executeValidatedRun(
        learnedDefinition({
          observe: (event) => observations.push(event),
          order: [],
          stateDirectory: join(root, "not-a-directory")
        }),
        { flags: ["private-flag"], projectRoot: root },
        []
      );
      assert.equal(result.kind, "completed");
      assert.ok(
        observations.some(
          (event) => event.kind === "history-unavailable" || event.kind === "recording-unavailable"
        )
      );
      assert.doesNotMatch(
        JSON.stringify(observations),
        /private-option|private-flag|identityDigest|samples/
      );
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("prepares before admission and records only after terminal effects settle", async () => {
    const root = await mkdtemp(join(tmpdir(), "vibe-check-learned-lifecycle-"));
    try {
      const events: string[] = [];
      const terminalHistory = historyDuringTerminalHook(events, join(root, "scheduler-state"));
      const result = await executeValidatedRun(
        learnedDefinition({
          observe: (event) => events.push(event.kind),
          stateDirectory: join(root, "scheduler-state"),
          terminalEffects: [terminalHistory.hook],
          order: []
        }),
        { projectRoot: root },
        []
      );

      assert.equal(result.kind, "completed");
      assert.equal(terminalHistory.visible, false);
      await assertRecordedTaskCount(join(root, "scheduler-state"), 2);
      assertEventsInOrder({
        events,
        required: ["selection-proposed", "terminal-hook"]
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("records a cancelled Run only after its terminal terminal effect settles", async () => {
    const root = await mkdtemp(join(tmpdir(), "vibe-check-learned-cancelled-lifecycle-"));
    try {
      const controller = new AbortController();
      const events: string[] = [];
      const terminalHistory = historyDuringTerminalHook(events, join(root, "scheduler-state"));
      const result = await executeValidatedRun(
        learnedDefinition({
          checks: [
            {
              checkId: "started",
              displayName: "Started",
              execute: () => {
                controller.abort();
                return PASSED;
              }
            },
            {
              checkId: "cancelled-before-start",
              displayName: "Cancelled before start",
              execute: () => PASSED
            }
          ],
          observe: (event) => events.push(event.kind),
          stateDirectory: join(root, "scheduler-state"),
          terminalEffects: [terminalHistory.hook],
          order: []
        }),
        { projectRoot: root, signal: controller.signal },
        []
      );

      assert.equal(result.kind, "cancelled");
      assert.equal(terminalHistory.visible, false);
      await assertRecordedTaskCount(join(root, "scheduler-state"), 2);
      assertEventsInOrder({
        events,
        required: ["selection-proposed", "terminal-hook"]
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

function learnedDefinition(input: {
  readonly order: string[];
  readonly advance?: (milliseconds: number) => void;
  readonly checks?: readonly Check[];
  readonly observe?: (event: LearnedCriticalPathObservation) => void;
  readonly terminalEffects?: readonly SchedulerTerminalEffect[];
  readonly sampleWindow?: number;
  readonly stateDirectory: string;
}) {
  return defineConfig({
    checks: input.checks ?? learnedChecks(input.order, input.advance),
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    },
    scheduler: {
      admissionPolicy: {
        kind: "custom",
        strategy: createLearnedCriticalPathStrategy({
          identityForTask: (task) => ({ taskId: task.taskId, test: "learned-scheduling" }),
          ...(input.observe === undefined ? {} : { observe: input.observe }),
          ...(input.sampleWindow === undefined ? {} : { sampleWindow: input.sampleWindow }),
          stateDirectory: input.stateDirectory
        })
      },
      maxParallel: 1,
      terminalEffects: input.terminalEffects ?? []
    }
  });
}

function learnedChecks(
  order: string[],
  advance?: (milliseconds: number) => void
): readonly Check[] {
  return [
    { checkId: "fast", displayName: "Fast", durationMs: 2 },
    { checkId: "slow", displayName: "Slow", durationMs: 30 }
  ].map(({ checkId, displayName, durationMs }) => ({
    checkId,
    displayName,
    execute: () => {
      order.push(checkId);
      advance?.(durationMs);
      return PASSED;
    },
    options: { retainedOnlyAsDigest: "private-option" }
  }));
}

function historyDuringTerminalHook(
  events: string[],
  stateDirectory: string
): Readonly<{ readonly hook: SchedulerTerminalEffect; readonly visible: boolean }> {
  let visible = true;
  return Object.freeze({
    hook: async () => {
      events.push("terminal-hook");
      try {
        await readFile(join(stateDirectory, "scheduler-history.json"), "utf8");
      } catch {
        visible = false;
      }
    },
    get visible(): boolean {
      return visible;
    }
  });
}

function assertPersistedDurations(value: unknown): void {
  assertPersistedHistory(value);
  const durations = value.series
    .flatMap((series) => series.samples)
    .map((sample) => {
      assert.ok(typeof sample === "object" && sample !== null && "durationMs" in sample);
      assert.ok(typeof sample.durationMs === "number");
      return sample.durationMs;
    });
  assert.deepEqual(
    durations.sort((left, right) => left - right),
    [2, 30]
  );
}

function assertPersistedHistory(
  value: unknown
): asserts value is { readonly series: readonly { readonly samples: readonly unknown[] }[] } {
  assert.ok(isPersistedHistory(value));
}

async function assertRecordedTaskCount(
  stateDirectory: string,
  expectedTaskCount: number
): Promise<void> {
  const history: unknown = JSON.parse(
    await readFile(join(stateDirectory, "scheduler-history.json"), "utf8")
  );
  assertPersistedHistory(history);
  assert.equal(history.series.length, expectedTaskCount);
  assert.equal(
    history.series.reduce((count, series) => count + series.samples.length, 0),
    expectedTaskCount
  );
}

function isPersistedHistory(
  value: unknown
): value is { readonly series: readonly { readonly samples: readonly unknown[] }[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "series" in value &&
    Array.isArray(value.series) &&
    value.series.every(isPersistedHistorySeries)
  );
}

function isPersistedHistorySeries(
  value: unknown
): value is { readonly samples: readonly unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "samples" in value &&
    Array.isArray(value.samples)
  );
}

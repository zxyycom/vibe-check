import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  createDiagnosticLogger,
  createDiagnosticLoggingRouter,
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticObservation
} from "./logger.ts";

describe("Project Run diagnostic logger detail safety", () => {
  it("rejects descriptor-unsafe details without invoking author hooks", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-logger-"));
    try {
      const authorHooks = { accessorReads: 0, proxyTraps: 0, toJsonCalls: 0 };
      const unsafeDetails = createUnsafeDiagnosticDetails(authorHooks);
      const logger = createDiagnosticLogger({
        clock: { now: () => 0 },
        enabled: true,
        file: join(root, "run.log")
      });
      observeUnsafeDiagnosticDetails(logger, unsafeDetails);
      assert.equal(logger.close(), "succeeded");
      assert.deepEqual(authorHooks, { accessorReads: 0, proxyTraps: 0, toJsonCalls: 0 });
      const log = readFileSync(join(root, "run.log"), "utf8");
      assert.match(log, /details=unavailable:accessor-or-hidden-property/);
      assert.match(log, /details=unavailable:unsupported-function/);
      assert.match(log, /details=unavailable:proxy/);
      assert.match(log, /details=unavailable:cycle/);
      assert.match(log, /details=unavailable:depth-limit/);
      assert.equal((log.match(/^#\d{6} /gm) ?? []).length, 5);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

describe("Project Run diagnostic logger observation formatting", () => {
  it("renders bounded filterable facts without changing their format", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-logger-"));
    try {
      const logger = createDiagnosticLogger({
        clock: { now: () => 0 },
        enabled: true,
        file: join(root, "run.log")
      });
      observeDiagnosticFormattingExamples(logger);
      assert.equal(logger.close(), "succeeded");

      const log = readFileSync(join(root, "run.log"), "utf8");
      assert.match(log, /^#000001 \+00:00:00\.000 \[RUN\] \[SAFE\] safe a=\[true,2\] z="ready"\n/m);
      const schedulerRecord = observationText(log, "scheduler.decision");
      assert.match(schedulerRecord, /proposal\.kind="select"/);
      assert.match(schedulerRecord, /trigger\.kind="execution-started"/);
      assert.doesNotMatch(schedulerRecord, /(?:^|[ │])kind="admit"/m);
      assert.doesNotMatch(schedulerRecord, /(?:^|[ │])taskId="compile"/m);
      const recordObservation = observationText(log, "record.reported");
      assert.match(recordObservation, /identity\.id="finding"/);
      assert.doesNotMatch(recordObservation, /(?:^|[ │])result="committed"/m);
      assert.match(observationText(log, "callback.cancelled"), /result="cancelled"/);
      assert.match(
        log,
        /\[scope\\\\path\\u000aforged\] \[closing\\u005dtag\] event\\u0085\\u000dfabricated/
      );
      assert.equal(log.endsWith("\n"), true);
      assert.ok(
        log.split("\n").every((line) => line.length <= 200),
        "diagnostic observations must use bounded physical lines"
      );
      assert.equal((log.match(/^#\d{6} /gm) ?? []).length, 8);
      assert.match(log, /details\.0="entry-0"/);
      assert.match(log, /details\.699="entry-699"/);
      assert.match(log, /details=unavailable:width-limit/);
      assert.match(log, /details=unavailable:size-limit/);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

describe("Project Run diagnostic logger", () => {
  it("correlates explicit owner channels with one invocation-wide sequence", () => {
    const observations: DiagnosticObservation[] = [];
    let now = 0;
    const router = createDiagnosticLoggingRouter({
      clock: { now: () => ++now },
      coreFile: "core.log",
      factory: () =>
        Object.freeze({
          close: () => "succeeded" as const,
          observe: (observation: DiagnosticObservation) => observations.push(observation)
        }),
      invocationId: "invocation/v1:test",
      learnedAdmissionFile: "learned-admission.log",
      schedulerFile: "scheduler.log"
    });

    router.core.observe({ event: "run.started", tags: diagnosticTags("RUN", "STARTED") });
    router.scheduler.observe({ event: "scheduler.graph", tags: diagnosticTags("GRAPH") });
    router.learnedAdmission.observe({
      event: "scheduler.history.prediction-unavailable",
      tags: diagnosticTags("HISTORY", "PREDICTION_UNAVAILABLE")
    });

    assert.deepEqual(
      observations.map((observation) => observation.correlation),
      [
        { elapsedMs: 1, invocationId: "invocation/v1:test", sequence: 1 },
        { elapsedMs: 2, invocationId: "invocation/v1:test", sequence: 2 },
        { elapsedMs: 3, invocationId: "invocation/v1:test", sequence: 3 }
      ]
    );
    assert.deepEqual(router.close(), {
      core: "succeeded",
      learnedAdmission: "succeeded",
      scheduler: "succeeded"
    });
  });

  it("contains setup and close failure of one owner channel", () => {
    const setupObservations: DiagnosticObservation[] = [];
    const setupFailure = createDiagnosticLoggingRouter({
      clock: { now: () => 0 },
      coreFile: "core.log",
      factory: ({ file }) => {
        if (file === "scheduler.log") throw new Error("scheduler setup failed");
        return Object.freeze({
          close: () => "succeeded" as const,
          observe: (observation: DiagnosticObservation) => setupObservations.push(observation)
        });
      },
      invocationId: "invocation/v1:setup-failure",
      learnedAdmissionFile: null,
      schedulerFile: "scheduler.log"
    });
    setupFailure.core.observe({ event: "run.started", tags: diagnosticTags("RUN", "STARTED") });
    setupFailure.scheduler.observe({ event: "scheduler.graph", tags: diagnosticTags("GRAPH") });
    assert.deepEqual(setupFailure.close(), {
      core: "succeeded",
      learnedAdmission: "disabled",
      scheduler: "failed"
    });
    assert.deepEqual(
      setupObservations.map((observation) => observation.event),
      ["run.started"]
    );

    const closeObservations: DiagnosticObservation[] = [];
    const closeFailure = createDiagnosticLoggingRouter({
      clock: { now: () => 0 },
      coreFile: "core.log",
      factory: ({ file }) =>
        Object.freeze({
          close: () => {
            if (file === "scheduler.log") throw new Error("scheduler close failed");
            return "succeeded" as const;
          },
          observe: (observation: DiagnosticObservation) => closeObservations.push(observation)
        }),
      invocationId: "invocation/v1:close-failure",
      learnedAdmissionFile: null,
      schedulerFile: "scheduler.log"
    });
    closeFailure.core.observe({ event: "run.started", tags: diagnosticTags("RUN", "STARTED") });
    closeFailure.scheduler.observe({ event: "scheduler.graph", tags: diagnosticTags("GRAPH") });
    assert.deepEqual(closeFailure.close(), {
      core: "succeeded",
      learnedAdmission: "disabled",
      scheduler: "failed"
    });
    assert.deepEqual(
      closeObservations.map((observation) => observation.event),
      ["run.started", "scheduler.graph"]
    );
  });

  it("summarizes descriptor-safe normal values without rendering their full lifecycle payload", () => {
    assert.deepEqual(summarizeDiagnosticValue({ files: ["a", "b"], ready: true }), {
      availability: "available",
      bytes: 32,
      keys: 2,
      shape: "object"
    });
    assert.deepEqual(summarizeDiagnosticValue(["a", "b"]), {
      availability: "available",
      bytes: 9,
      items: 2,
      shape: "array"
    });
    const hostile: Record<string, unknown> = {};
    Object.defineProperty(hostile, "value", {
      enumerable: true,
      get: (): never => {
        throw new Error("must not read");
      }
    });
    assert.deepEqual(summarizeDiagnosticValue(hostile), {
      availability: "unavailable",
      reason: "accessor-or-hidden-property"
    });
  });
});

interface UnsafeDiagnosticDetails {
  readonly accessor: Record<string, unknown>;
  readonly cyclic: Record<string, unknown>;
  readonly deeplyNested: Record<string, unknown>;
  readonly proxy: object;
  readonly toJson: Record<string, unknown>;
}

function createUnsafeDiagnosticDetails(authorHooks: {
  accessorReads: number;
  proxyTraps: number;
  toJsonCalls: number;
}): UnsafeDiagnosticDetails {
  const accessor: Record<string, unknown> = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get: (): string => {
      authorHooks.accessorReads += 1;
      return "must-not-read";
    }
  });
  const toJson: Record<string, unknown> = {};
  Object.defineProperty(toJson, "toJSON", {
    enumerable: true,
    value: (): object => {
      authorHooks.toJsonCalls += 1;
      return { leaked: true };
    }
  });
  const proxy = new Proxy(
    {},
    {
      get: (): never => {
        authorHooks.proxyTraps += 1;
        throw new Error("must-not-read");
      },
      getPrototypeOf: (): never => {
        authorHooks.proxyTraps += 1;
        throw new Error("must-not-read");
      },
      ownKeys: (): never => {
        authorHooks.proxyTraps += 1;
        throw new Error("must-not-read");
      }
    }
  );
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  let deepest: Record<string, unknown> = {};
  const deeplyNested = deepest;
  for (let index = 0; index < 16; index += 1) {
    const next: Record<string, unknown> = {};
    deepest.next = next;
    deepest = next;
  }
  return { accessor, cyclic, deeplyNested, proxy, toJson };
}

function observeUnsafeDiagnosticDetails(
  logger: ReturnType<typeof createDiagnosticLogger>,
  details: UnsafeDiagnosticDetails
): void {
  logger.observe({
    event: "accessor",
    tags: diagnosticTags("RUN", "ACCESSOR"),
    details: { accessor: details.accessor }
  });
  logger.observe({
    event: "to-json",
    tags: diagnosticTags("RUN"),
    details: { toJson: details.toJson }
  });
  logger.observe({
    event: "proxy",
    tags: diagnosticTags("RUN"),
    details: { proxy: details.proxy }
  });
  logger.observe({
    event: "cycle",
    tags: diagnosticTags("RUN"),
    details: { cyclic: details.cyclic }
  });
  logger.observe({ event: "depth", tags: diagnosticTags("RUN"), details: details.deeplyNested });
}

function observeDiagnosticFormattingExamples(
  logger: ReturnType<typeof createDiagnosticLogger>
): void {
  logger.observe({
    event: "safe",
    tags: diagnosticTags("RUN", "SAFE"),
    details: { z: "ready", a: [true, 2] }
  });
  logger.observe({
    event: "scheduler.decision",
    tags: diagnosticTags("SCHEDULER", "ADMIT", "TASK:compile"),
    details: {
      kind: "admit",
      proposal: { kind: "select", taskId: "compile" },
      taskId: "compile",
      trigger: { kind: "execution-started" }
    }
  });
  logger.observe({
    event: "record.reported",
    tags: diagnosticTags("CHECK:quality", "RECORD", "COMMITTED"),
    details: { identity: { id: "finding" }, result: "committed" }
  });
  logger.observe({
    event: "callback.cancelled",
    tags: diagnosticTags("CHECK:fixture", "EXECUTION", "CANCELLED"),
    details: { result: "cancelled" }
  });
  logger.observe({
    event: "event\u0085\rfabricated",
    tags: diagnosticTags("scope\\path\nforged", "closing]tag")
  });
  logger.observe({
    event: "ordinary-width",
    tags: diagnosticTags("RUN"),
    details: Array.from({ length: 700 }, (_, index) => `entry-${index}`)
  });
  logger.observe({
    event: "extreme-width",
    tags: diagnosticTags("RUN"),
    details: Array.from({ length: 4_097 }, (_, index) => `entry-${index}`)
  });
  logger.observe({
    event: "size",
    tags: diagnosticTags("RUN"),
    details: { value: "x".repeat(1_048_577) }
  });
}

function observationText(log: string, event: string): string {
  const start = log.indexOf(event);
  assert.notEqual(start, -1);
  const end = log.indexOf("\n#", start);
  return log.slice(start, end < 0 ? undefined : end);
}

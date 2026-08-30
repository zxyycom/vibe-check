import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import type { Check, CheckExecution } from "../../check/check.ts";
import { isRecord } from "../../data-boundary/value-shapes.ts";
import type { ProgressWriter } from "./renderer.ts";
import type { ProgressRefreshScheduler } from "./presentation.ts";
import { executeValidatedRun } from "../invocation.ts";

const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });
const DIAGNOSTIC_FILE =
  /^.+\/run-\d{8}T\d{6}\.\d{3}Z-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.log$/;

function check(
  overrides: Readonly<{
    readonly checkId?: string;
    readonly execution?: CheckExecution;
    readonly maxParallel?: number;
  }> = {}
): Check {
  return {
    checkId: overrides.checkId ?? "custom",
    displayName: overrides.checkId ?? "Custom",
    execution: overrides.execution ?? (() => PASSED),
    ...(overrides.maxParallel === undefined ? {} : { maxParallel: overrides.maxParallel })
  };
}

function definition(checks: readonly Check[], progress = false) {
  return defineConfig({
    checks,
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: progress }
    }
  });
}

function capturedProgressWriter(
  input: Readonly<{
    readonly isTTY?: boolean;
    readonly throwAtWrite?: number;
    readonly throws?: boolean;
  }> = {}
) {
  const attempts: string[] = [];
  const writes: string[] = [];
  const writer: ProgressWriter = {
    color: false,
    isTTY: input.isTTY ?? false,
    term: undefined,
    write: (content: string): void => {
      attempts.push(content);
      if (input.throws === true || input.throwAtWrite === attempts.length) {
        throw new Error("progress stream closed");
      }
      writes.push(content);
    }
  };
  return { attempts, writes, writer };
}

function deferred<T>(): Readonly<{
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}> {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return Object.freeze({
    promise,
    resolve: (value: T): void => {
      if (resolvePromise === undefined) throw new Error("Deferred promise is not initialized");
      resolvePromise(value);
    }
  });
}

function capturedRefreshScheduler(): Readonly<{
  readonly cancellations: () => number;
  readonly intervalMs: () => number | undefined;
  readonly refresh: () => void;
  readonly scheduler: ProgressRefreshScheduler;
}> {
  let scheduledRefresh: (() => void) | undefined;
  let scheduledIntervalMs: number | undefined;
  let cancellationCount = 0;
  return Object.freeze({
    cancellations: () => cancellationCount,
    intervalMs: () => scheduledIntervalMs,
    refresh: () => {
      assert.ok(scheduledRefresh, "TTY progress must schedule a heartbeat while work is running");
      scheduledRefresh();
    },
    scheduler: Object.freeze({
      schedule: (refresh: () => void, intervalMs: number) => {
        scheduledRefresh = refresh;
        scheduledIntervalMs = intervalMs;
        return Object.freeze({
          cancel: () => {
            cancellationCount += 1;
          }
        });
      }
    })
  });
}

describe("Package Run progress rendering outputs", () => {
  it("presents enabled Package Run progress through the injected plain writer", async () => {
    const output = capturedProgressWriter();
    const result = await executeValidatedRun(definition([check()], true), {}, [], {
      progressWriterFactory: () => output.writer
    });

    assert.equal(result.kind, "completed");
    assert.equal(result.outputs.progressRendering.status, "succeeded");
    assert.equal(output.writes[0], "Vibe Check\ntotal 1 checks\n\nChecks:\n");
    assert.match(output.writes[1] ?? "", /^ {2}\[1\/1] Custom \| passed \| \d+(?:\.\d+)?ms\n$/);
    assert.match(
      output.writes[2] ?? "",
      /^\nExecution summary:\n {2}execution: completed\n {2}total checks: 1\n {2}passed: 1\n {2}failed: 0\n {2}not applicable: 0\n {2}unavailable: 0\n {2}elapsed: \d+(?:\.\d+)?(?:ms|s)\n$/
    );
  });

  it("does not create or write a progress writer when Package Run progress is disabled", async () => {
    let factoryCalls = 0;
    const result = await executeValidatedRun(definition([check()]), {}, [], {
      progressWriterFactory: () => {
        factoryCalls += 1;
        return capturedProgressWriter().writer;
      }
    });

    assert.equal(result.kind, "completed");
    assert.equal(result.outputs.progressRendering.status, "disabled");
    assert.equal(factoryCalls, 0);
  });

  it("contains progress writer failures while preserving completed Check facts", async () => {
    const output = capturedProgressWriter({ throws: true });
    let calls = 0;
    const result = await executeValidatedRun(
      definition(
        [
          check({
            execution: () => {
              calls += 1;
              return PASSED;
            }
          })
        ],
        true
      ),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(calls, 1);
    assert.equal(result.kind, "output");
    if (result.kind !== "output") return;
    assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
    assert.equal(result.outputs.progressRendering.status, "failed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
  });

  it("schedules one 5-second TTY heartbeat and cancels it after the last Check settles", async () => {
    const output = capturedProgressWriter({ isTTY: true });
    const slow = deferred<void>();
    const slowStarted = deferred<void>();
    const refresh = capturedRefreshScheduler();
    let nowMs = 0;
    const running = executeValidatedRun(
      definition(
        [
          check({
            execution: async () => {
              slowStarted.resolve(undefined);
              await slow.promise;
              return PASSED;
            }
          })
        ],
        true
      ),
      {},
      [],
      {
        clock: { now: () => nowMs },
        progressRefreshScheduler: refresh.scheduler,
        progressWriterFactory: () => output.writer
      }
    );

    await slowStarted.promise;
    assert.equal(refresh.intervalMs(), 5_000);
    nowMs = 5_000;
    refresh.refresh();
    assert.equal(output.writes.at(-1), "  [1/1] Custom | running | 5s\n");
    slow.resolve(undefined);
    const result = await running;

    assert.equal(result.kind, "completed");
    assert.equal(result.outputs.progressRendering.status, "succeeded");
    assert.equal(refresh.cancellations(), 1);
  });

  it("contains a TTY rewrite failure without leaving Check or Record facts open", async () => {
    const output = capturedProgressWriter({ isTTY: true, throwAtWrite: 3 });
    const slow = deferred<void>();
    const slowStarted = deferred<void>();
    const refresh = capturedRefreshScheduler();
    const running = executeValidatedRun(
      definition(
        [
          check({
            checkId: "slow",
            execution: async (context) => {
              context.records.report({ id: "sample" }, { metric: "score" });
              slowStarted.resolve(undefined);
              await slow.promise;
              return PASSED;
            },
            maxParallel: 2
          })
        ],
        true
      ),
      {},
      [],
      {
        progressRefreshScheduler: refresh.scheduler,
        progressWriterFactory: () => output.writer
      }
    );

    await slowStarted.promise;
    assert.equal(refresh.intervalMs(), 5_000);
    refresh.refresh();
    assert.equal(refresh.cancellations(), 1);
    slow.resolve(undefined);
    const result = await running;

    assert.equal(result.kind, "output");
    if (result.kind !== "output") return;
    assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
    assert.equal(result.outputs.progressRendering.status, "failed");
    assert.equal(output.attempts.length, 3);
    assert.equal(output.attempts[2], "\u001B[1A\u001B[2K");
    assert.equal(output.writes.length, 2);
    assert.equal(result.snapshot.checks.length, 1);
    assert.equal(result.snapshot.records.length, 1);
  });

  it("continues output publication after a progress writer failure", async () => {
    const output = capturedProgressWriter({ throws: true });
    const root = mkdtempSync(join(tmpdir(), "vibe-check-progress-output-"));
    try {
      const result = await executeValidatedRun(
        definition([check()], true),
        {
          outputs: {
            machinePublication: { directory: "published", enabled: true },
            diagnosticLogging: { directory: "diagnostic", enabled: true }
          },
          projectRoot: root
        },
        [],
        {
          progressWriterFactory: () => output.writer,
          wallClock: { now: () => new Date("2026-08-30T12:34:56.789Z") }
        }
      );

      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
      assert.equal(result.outputs.progressRendering.status, "failed");
      assert.equal(result.outputs.machinePublication.status, "succeeded");
      assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
      assert.match(result.outputs.diagnosticLogging.file ?? "", DIAGNOSTIC_FILE);
      assert.match(
        result.outputs.diagnosticLogging.file ?? "",
        /^diagnostic\/run-20260830T123456\.789Z-/
      );
      assert.equal(existsSync(join(root, result.outputs.diagnosticLogging.file ?? "")), true);
      const diagnosticLog = readFileSync(
        join(root, result.outputs.diagnosticLogging.file ?? ""),
        "utf8"
      );
      assert.match(diagnosticLog, /^#000001 \+\d+\.\dms \[RUN\] run\.started /);
      assert.match(
        diagnosticLog,
        /\[RUN\] run\.planning\.succeeded normalized task graph was accepted/
      );
      assert.match(
        diagnosticLog,
        /\[RUN\] run\.aggregation\.completed no Check aggregation was selected/
      );
      assert.match(
        diagnosticLog,
        /\[RUN\] run\.terminal-before-log-close terminal diagnostic event written before logger close is confirmed/
      );
      assert.match(diagnosticLog, /"diagnosticLogging":"close-not-yet-confirmed"/);
      assert.doesNotMatch(
        diagnosticLog,
        /"diagnosticLogging":\{"enabled":true,"status":"not-run"\}/
      );
      assert.match(diagnosticLog, /"machinePublication":\{"enabled":true,"status":"succeeded"}/);
      assert.match(diagnosticLog, /"progressRendering":\{"enabled":true,"status":"failed"}/);
      assert.equal(diagnosticLog.endsWith("\n"), true);
      assert.equal(existsSync(join(root, "published", "run.json")), true);
      assert.equal(existsSync(join(root, "published", "records.ndjson")), true);
      const publishedRun: unknown = JSON.parse(
        readFileSync(join(root, "published", "run.json"), "utf8")
      );
      assert.equal(
        isRecord(publishedRun)
          ? isRecord(publishedRun.invocation) && publishedRun.invocation.timestamp
          : undefined,
        "2026-08-30T12:34:56.789Z"
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("returns output facts when machine publication alone fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-machine-failure-"));
    try {
      writeFileSync(join(root, "blocked"), "not a directory");
      const result = await executeValidatedRun(
        definition([check()], false),
        {
          projectRoot: root,
          outputs: { machinePublication: { directory: "blocked", enabled: true } }
        },
        []
      );
      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "machine-publication-failed" });
      assert.equal(result.outputs.machinePublication.status, "failed");
      assert.equal(result.outputs.progressRendering.status, "disabled");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps both failed outputs and prioritizes progress rendering", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-output-failure-"));
    const output = capturedProgressWriter({ throws: true });
    try {
      writeFileSync(join(root, "blocked"), "not a directory");
      const result = await executeValidatedRun(
        definition([check()], true),
        {
          projectRoot: root,
          outputs: {
            machinePublication: { directory: "blocked", enabled: true },
            diagnosticLogging: { directory: "blocked", enabled: true }
          }
        },
        [],
        { progressWriterFactory: () => output.writer }
      );
      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
      assert.equal(result.outputs.progressRendering.status, "failed");
      assert.equal(result.outputs.machinePublication.status, "failed");
      assert.equal(result.outputs.diagnosticLogging.status, "failed");
      assert.match(result.outputs.diagnosticLogging.file ?? "", DIAGNOSTIC_FILE);
      assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("writes one compact invocation start instead of catalog entries for every Check", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-catalog-"));
    try {
      const catalog = Array.from({ length: 70 }, (_, index) =>
        check({ checkId: `catalog-${index}` })
      );
      const result = await executeValidatedRun(
        definition(catalog),
        {
          outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
          projectRoot: root
        },
        [],
        { wallClock: { now: () => new Date("2026-08-30T12:34:56.789Z") } }
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      const file = result.outputs.diagnosticLogging.file;
      assert.ok(file);
      assert.match(file, /^diagnostic\/run-20260830T123456\.789Z-/);
      const diagnosticLog = readFileSync(join(root, file), "utf8");
      assert.equal([...diagnosticLog.matchAll(/\[RUN\] run\.started /g)].length, 1);
      assert.match(diagnosticLog, /"aggregation":null/);
      assert.match(diagnosticLog, /"checkCount":70/);
      assert.match(diagnosticLog, /"flags":\[\]/);
      assert.match(diagnosticLog, /"invocationId":"invocation\/v1:/);
      assert.match(diagnosticLog, /"outputs":/);
      assert.match(diagnosticLog, /"scheduler":/);
      assert.doesNotMatch(diagnosticLog, /catalog\.check/);
      assert.doesNotMatch(diagnosticLog, /details=details-unavailable:(?:value-limit|width-limit)/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("summarizes accepted final data instead of copying it into the diagnostic log", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-final-data-"));
    try {
      const files = Array.from({ length: 700 }, (_, index) => `package/file-${index}.ts`);
      const result = await executeValidatedRun(
        definition([check({ execution: () => ({ status: "passed", data: { files } }) })]),
        {
          outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
          projectRoot: root
        },
        []
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      const file = result.outputs.diagnosticLogging.file;
      assert.ok(file);
      const diagnosticLog = readFileSync(join(root, file), "utf8");
      assert.match(
        diagnosticLog,
        /"outcome":\{"data":\{"availability":"available","bytes":\d+,"keys":1,"shape":"object"\},"status":"passed"\}/
      );
      assert.doesNotMatch(diagnosticLog, /package\/file-699\.ts/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not invoke hostile author details while diagnostic logging is enabled", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-hostile-diagnostics-"));
    try {
      let toJsonCalls = 0;
      const hostile: Record<string, unknown> = {};
      Object.defineProperty(hostile, "toJSON", {
        enumerable: true,
        value: (): object => {
          toJsonCalls += 1;
          return { leaked: true };
        }
      });
      const source = definition(
        [
          {
            checkId: "hostile-preflight",
            displayName: "Hostile preflight",
            execution: () => PASSED,
            preflight: () => ({ status: "success", preparedOptions: hostile })
          },
          check({
            checkId: "hostile-callback",
            execution: ({ records }) => {
              records.report({ id: "hostile" }, hostile);
              return { status: "passed", data: hostile };
            }
          })
        ],
        false
      );
      const result = await executeValidatedRun(
        source,
        {
          outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
          projectRoot: root
        },
        []
      );

      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.equal(toJsonCalls, 0);
      assert.deepEqual(
        result.snapshot.checks.map((settledCheck) => settledCheck.outcome.status),
        ["unavailable", "unavailable"]
      );
      const file = result.outputs.diagnosticLogging.file;
      assert.ok(file);
      const diagnosticLog = readFileSync(join(root, file), "utf8");
      assert.match(diagnosticLog, /record\.reported/);
      assert.match(diagnosticLog, /check\.contained/);
      assert.match(diagnosticLog, /details=details-unavailable:unsupported-function/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("closes diagnostic logging once after an unexpected nonconfiguration failure", async () => {
    let closeCalls = 0;
    const result = await executeValidatedRun(
      defineConfig({
        checks: [],
        outputs: {
          diagnosticLogging: { enabled: true },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      }),
      {},
      [],
      {
        clock: {
          now: (): never => {
            throw new Error("clock fault");
          }
        },
        diagnosticLoggerFactory: () =>
          Object.freeze({
            close: () => {
              closeCalls += 1;
              return "succeeded" as const;
            },
            observe: () => undefined
          })
      }
    );

    assert.equal(result.kind, "execution");
    if (result.kind !== "execution") return;
    assert.deepEqual(result.diagnostic, { code: "task-engine-failed" });
    assert.equal(closeCalls, 1);
    assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
  });

  it("contains diagnostic logger implementation failures without revising final facts", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-failure-"));
    try {
      const source = definition([
        check({
          execution: ({ records }) => {
            records.report({ id: "accepted" }, { source: "callback" });
            return { status: "passed", data: { accepted: true } };
          }
        })
      ]);
      const failures = [
        "factory-throws",
        "observe-throws",
        "close-failed",
        "close-throws"
      ] as const;
      for (const failure of failures) {
        let delegateCloseCalls = 0;
        let delegateObserveCalls = 0;
        const result = await executeValidatedRun(
          source,
          {
            outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
            projectRoot: root
          },
          [],
          {
            diagnosticLoggerFactory: () => {
              if (failure === "factory-throws") throw new Error("logger creation failed");
              return Object.freeze({
                close: () => {
                  delegateCloseCalls += 1;
                  if (failure === "close-throws") throw new Error("logger close failed");
                  return failure === "close-failed" ? "failed" : "succeeded";
                },
                observe: () => {
                  delegateObserveCalls += 1;
                  if (failure === "observe-throws") throw new Error("logger append failed");
                }
              });
            }
          }
        );

        assert.equal(result.kind, "output", failure);
        if (result.kind !== "output") continue;
        assert.deepEqual(result.diagnostic, { code: "diagnostic-logging-failed" }, failure);
        assert.deepEqual(result.snapshot.checks[0]?.outcome, {
          status: "passed",
          data: { accepted: true }
        });
        assert.deepEqual(result.snapshot.records, [
          { checkId: "custom", id: "accepted", data: { source: "callback" } }
        ]);
        assert.deepEqual(result.checkMessages, []);
        assert.equal(result.outputs.machinePublication.status, "disabled");
        assert.equal(result.outputs.progressRendering.status, "disabled");
        assert.equal(result.outputs.diagnosticLogging.enabled, true);
        assert.equal(result.outputs.diagnosticLogging.status, "failed");
        assert.match(result.outputs.diagnosticLogging.file ?? "", DIAGNOSTIC_FILE);
        assert.equal(delegateCloseCalls, failure === "factory-throws" ? 0 : 1, failure);
        if (failure === "factory-throws") assert.equal(delegateObserveCalls, 0, failure);
        else if (failure === "observe-throws") assert.equal(delegateObserveCalls, 1, failure);
        else assert.ok(delegateObserveCalls > 1, failure);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

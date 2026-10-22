import assert from "node:assert/strict";

import type { Check, CheckExecution } from "../../check/check.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
import type { ProgressWriter } from "./renderer.ts";
import type { ProgressRefreshScheduler } from "./presentation.ts";

export { deferred } from "../execution-control.test-support.ts";

export const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });
export const DIAGNOSTIC_FILE =
  /^.+\/(?:core|scheduler)-\d{8}T\d{6}\.\d{3}Z-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.log$/;

export function check(
  overrides: Readonly<{
    readonly checkId?: string;
    readonly enabledByFlags?: Check["enabledByFlags"];
    readonly execute?: CheckExecution;
    readonly maxParallel?: number;
    readonly omitQuietPassedRow?: Check["omitQuietPassedRow"];
  }> = {}
): Check {
  return {
    checkId: overrides.checkId ?? "custom",
    displayName: overrides.checkId ?? "Custom",
    execute: overrides.execute ?? (() => PASSED),
    ...(overrides.enabledByFlags === undefined ? {} : { enabledByFlags: overrides.enabledByFlags }),
    ...(overrides.maxParallel === undefined ? {} : { maxParallel: overrides.maxParallel }),
    ...(overrides.omitQuietPassedRow === undefined
      ? {}
      : { omitQuietPassedRow: overrides.omitQuietPassedRow })
  };
}

export function definition(checks: readonly Check[], progress = false) {
  return defineConfig({
    checks,
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: progress }
    }
  });
}

export function capturedProgressWriter(
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

export function capturedRefreshScheduler(): Readonly<{
  readonly activeHandles: () => number;
  readonly cancellations: () => number;
  readonly intervalMs: () => number | undefined;
  readonly refresh: () => void;
  readonly schedules: () => number;
  readonly scheduler: ProgressRefreshScheduler;
}> {
  const activeRefreshes = new Map<number, () => void>();
  let scheduledIntervalMs: number | undefined;
  let cancellationCount = 0;
  let scheduleCount = 0;
  return Object.freeze({
    activeHandles: () => activeRefreshes.size,
    cancellations: () => cancellationCount,
    intervalMs: () => scheduledIntervalMs,
    refresh: () => {
      assert.ok(
        activeRefreshes.size > 0,
        "TTY progress must schedule a heartbeat while work is running"
      );
      for (const refresh of [...activeRefreshes.values()]) refresh();
    },
    schedules: () => scheduleCount,
    scheduler: Object.freeze({
      schedule: (refresh: () => void, intervalMs: number) => {
        const handle = ++scheduleCount;
        activeRefreshes.set(handle, refresh);
        scheduledIntervalMs = intervalMs;
        return Object.freeze({
          cancel: () => {
            cancellationCount += 1;
            activeRefreshes.delete(handle);
          }
        });
      }
    })
  });
}

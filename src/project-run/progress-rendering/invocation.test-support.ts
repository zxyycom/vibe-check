import assert from "node:assert/strict";

import type { Check, CheckExecution } from "../../check/check.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
import type { ProgressWriter } from "./renderer.ts";
import type { ProgressRefreshScheduler } from "./presentation.ts";

export { deferred } from "../execution-control.test-support.ts";

export const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });
export const DIAGNOSTIC_FILE =
  /^.+\/(?:core|scheduler|learned-admission)-\d{8}T\d{6}\.\d{3}Z-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.log$/;

export function check(
  overrides: Readonly<{
    readonly checkId?: string;
    readonly enabledByFlags?: Check["enabledByFlags"];
    readonly execution?: CheckExecution;
    readonly maxParallel?: number;
    readonly visibility?: Check["visibility"];
  }> = {}
): Check {
  return {
    checkId: overrides.checkId ?? "custom",
    displayName: overrides.checkId ?? "Custom",
    execution: overrides.execution ?? (() => PASSED),
    ...(overrides.enabledByFlags === undefined ? {} : { enabledByFlags: overrides.enabledByFlags }),
    ...(overrides.maxParallel === undefined ? {} : { maxParallel: overrides.maxParallel }),
    ...(overrides.visibility === undefined ? {} : { visibility: overrides.visibility })
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

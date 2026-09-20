import assert from "node:assert/strict";

import type { Check, CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { NO_DEPENDENCIES } from "../check-execution.test-support.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import { commandCheck } from "./command-check.ts";
import { executeCommandCheck } from "./execution.ts";
import type { ResolvedCommandCheckOptions } from "./contract.ts";

/** Creates the ordinary command fixture with explicit, short-lived process defaults. */
export function createCommandCheckFixture(overrides: Readonly<Record<string, unknown>> = {}) {
  return commandCheck({
    checkId: "command-test",
    displayName: "Command test",
    executable: process.execPath,
    outputByteLimit: 16 * 1024,
    timeoutMs: 1_000,
    ...overrides
  });
}

/** Executes command-owned behavior directly with the smallest valid invocation context. */
export async function executeCommandCheckFixture(
  options: ResolvedCommandCheckOptions,
  root: string,
  artifactDirectory: string | null = null,
  signal?: AbortSignal
): Promise<CheckResult> {
  return executeCommandCheck(
    createCommandCheckExecutionContext(options, root, artifactDirectory, signal)
  );
}

/** Creates the direct invocation context used to test the factory's bound execute callback. */
export function createCommandCheckExecutionContext(
  options: ResolvedCommandCheckOptions,
  root: string,
  artifactDirectory: string | null = null,
  signal?: AbortSignal
): CheckExecutionContext<ResolvedCommandCheckOptions> {
  return Object.freeze({
    artifactDirectory,
    dependencies: NO_DEPENDENCIES,
    invocationId: "invocation/v1:command-check-direct-test",
    options,
    project: Object.freeze({ flags: Object.freeze([]), root }),
    records: Object.freeze({ report: () => undefined }),
    signal: signal ?? new AbortController().signal
  });
}

/** Proves that both command execution and its resolver leave caller cancellation to Core. */
export async function assertCommandRunCancelsDuringExecution(
  check: Check,
  root: string,
  abortAfterMs: number
): Promise<void> {
  const controller = new AbortController();
  const definition = defineConfig({
    checks: [check],
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: false }
    }
  });
  setTimeout(() => {
    controller.abort();
  }, abortAfterMs);
  const result = await run(definition, { projectRoot: root, signal: controller.signal });
  assert.equal(result.kind, "cancelled");
  assert.equal(result.phase, "execution");
  if (result.kind !== "cancelled" || result.phase !== "execution") return;
  assert.deepEqual(result.snapshot.checks[0]?.outcome, {
    status: "unavailable",
    reason: { code: "execution-cancelled" }
  });
}

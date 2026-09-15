import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { NO_DEPENDENCIES } from "../check-execution.test-support.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import { commandCheck } from "./command-check.ts";
import { executeCommandCheck } from "./execution.ts";
import type { ResolvedCommandCheckOptions } from "./contract.ts";

const CANARY_ARGUMENT = "command-argument-canary";
const CANARY_ENVIRONMENT = "command-environment-canary";
const CANARY_OUTPUT = "command-output-canary";

function check(overrides: Readonly<Record<string, unknown>> = {}) {
  return commandCheck({
    checkId: "command-test",
    displayName: "Command test",
    executable: process.execPath,
    outputByteLimit: 16 * 1024,
    timeoutMs: 1_000,
    ...overrides
  });
}

function context(
  options: ResolvedCommandCheckOptions,
  root: string,
  artifactDirectory: string | null = null,
  signal = new AbortController().signal
): CheckExecutionContext<ResolvedCommandCheckOptions> {
  return Object.freeze({
    artifactDirectory,
    dependencies: NO_DEPENDENCIES,
    invocationId: "invocation/v1:command-check-direct-test",
    options,
    project: Object.freeze({ flags: Object.freeze([]), root }),
    records: Object.freeze({ report: () => undefined }),
    signal
  });
}

async function execute(
  options: ResolvedCommandCheckOptions,
  root: string,
  artifactDirectory: string | null = null,
  signal?: AbortSignal
): Promise<CheckResult> {
  return executeCommandCheck(context(options, root, artifactDirectory, signal));
}

async function waitForFile(path: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (existsSync(path)) return;
    await new Promise<void>((resolveDelay) => {
      setTimeout(resolveDelay, 10);
    });
  }
  throw new Error(`Timed out waiting for ${path}`);
}

describe("commandCheck constructor and execution", () => {
  it("closes command input, freezes defaults, and preserves ordinary Check composition", async () => {
    const child = check({ checkId: "child", displayName: "Child" });
    const command = check({
      admissionPriority: 3,
      arguments: ["--eval", "process.exit(0)"],
      checks: [child],
      dependsOn: ["base"],
      enabledByFlags: { when: "selected" },
      maxParallel: 2,
      mutex: ["node"],
      observes: ["audit"],
      omitQuietPassedRow: true,
      resourceClaims: { node: 1 }
    });
    assert.equal(command.checkId, "command-test");
    assert.equal(Object.isFrozen(command.options), true);
    assert.deepEqual(command.options.environment, { mode: "exact", variables: {} });
    assert.deepEqual(command.options.output, { mode: "discard" });
    assert.deepEqual(command.options.arguments, ["--eval", "process.exit(0)"]);
    assert.deepEqual(command.dependsOn, ["base"]);
    assert.deepEqual(command.observes, ["audit"]);
    assert.equal(command.admissionPriority, 3);
    assert.equal(command.maxParallel, 2);
    assert.equal(command.omitQuietPassedRow, true);
    assert.equal(command.checks?.[0], child);

    for (const invalidOptions of [
      { ...command.options, executable: "bad\0command" },
      { ...command.options, arguments: ["ok", "bad\0argument"] },
      { ...command.options, environment: { mode: "exact", variables: { KEY: null } } },
      { ...command.options, output: { mode: "unknown" } },
      { ...command.options, timeoutMs: 0 },
      { ...command.options, outputByteLimit: 1.5 },
      { ...command.options, workingDirectory: "bad\0directory" }
    ]) {
      const prepared: unknown = await Reflect.apply(command.prepare!, undefined, [
        invalidOptions,
        new AbortController().signal
      ]);
      assert.deepEqual(prepared, {
        status: "failure",
        action: "block",
        reason: { code: "invalid-options" }
      });
    }

    const sparseArguments = new Array<string>(3);
    sparseArguments[0] = "ok";
    sparseArguments[2] = "later";
    for (const invalidInput of [
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        timeoutMs: 1,
        outputByteLimit: 1,
        unknown: true
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        arguments: sparseArguments,
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "exact", variables: { "bad\0name": "value" } },
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "exact", variables: null },
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "exact", variables: undefined },
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "inherit", overrides: null },
        timeoutMs: 1,
        outputByteLimit: 1
      },
      {
        checkId: "bad",
        displayName: "Bad",
        executable: process.execPath,
        environment: { mode: "inherit", overrides: undefined },
        timeoutMs: 1,
        outputByteLimit: 1
      }
    ]) {
      assert.throws(
        () => Reflect.apply(commandCheck, undefined, [invalidInput]),
        /documented closed command/
      );
    }
  });

  it("uses no-shell arguments, resolved cwd, and exact or inherited environment without publishing child material", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    const nested = join(root, "nested");
    mkdirSync(nested);
    try {
      const exact = check({
        arguments: [
          "--eval",
          `if (process.cwd() !== ${JSON.stringify(nested)} || process.env.EXACT !== "yes" || process.env.PATH !== undefined) process.exit(7); process.stdout.write(${JSON.stringify(CANARY_OUTPUT)})`
        ],
        environment: { mode: "exact", variables: { EXACT: "yes" } },
        workingDirectory: "nested"
      });
      assert.deepEqual(await execute(exact.options, root), {
        status: "passed",
        data: { exitCode: 0 }
      });

      const inherited = check({
        arguments: [
          "--eval",
          'if (process.env.COMMAND_CHECK_PARENT !== "parent" || process.env.REMOVE !== undefined) process.exit(8)'
        ],
        environment: { mode: "inherit", overrides: { REMOVE: null } }
      });
      process.env.COMMAND_CHECK_PARENT = "parent";
      process.env.REMOVE = "remove";
      try {
        assert.deepEqual(await execute(inherited.options, root), {
          status: "passed",
          data: { exitCode: 0 }
        });
      } finally {
        delete process.env.COMMAND_CHECK_PARENT;
        delete process.env.REMOVE;
      }
      const productSurface = JSON.stringify(await execute(exact.options, root));
      assert.equal(productSurface.includes(CANARY_OUTPUT), false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("maps numeric exit, startup, timeout, output limit, and signal terminal branches", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    try {
      assert.deepEqual(
        await execute(check({ arguments: ["--eval", "process.exit(23)"] }).options, root),
        { status: "failed", data: { exitCode: 23 } }
      );
      assert.deepEqual(
        await execute(check({ executable: join(root, "does-not-exist") }).options, root),
        { status: "unavailable", reason: { code: "command-start-failed" } }
      );
      assert.deepEqual(
        await execute(
          check({ arguments: ["--eval", "setTimeout(() => {}, 1_000)"], timeoutMs: 20 }).options,
          root
        ),
        { status: "unavailable", reason: { code: "command-timeout" } }
      );
      assert.deepEqual(
        await execute(
          check({
            arguments: ["--eval", "process.stdout.write('x'.repeat(1000))"],
            outputByteLimit: 32
          }).options,
          root
        ),
        { status: "unavailable", reason: { code: "command-output-limit-exceeded" } }
      );
      assert.deepEqual(
        await execute(
          check({ arguments: ["--eval", "process.kill(process.pid, 'SIGTERM')"] }).options,
          root
        ),
        { status: "unavailable", reason: { code: "command-terminated-by-signal" } }
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("leaves caller cancellation to the ordinary Core execution outcome", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    const controller = new AbortController();
    try {
      const definition = defineConfig({
        checks: [check({ arguments: ["--eval", "setTimeout(() => {}, 1_000)"] })],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      });
      setTimeout(() => {
        controller.abort();
      }, 50);
      const result = await run(definition, { projectRoot: root, signal: controller.signal });
      assert.equal(result.kind, "cancelled");
      assert.equal(result.phase, "execution");
      if (result.kind !== "cancelled" || result.phase !== "execution") return;
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("requires artifact capability for transcripts and atomically retains only opted-in raw output", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    const artifactDirectory = join(root, "artifact");
    try {
      const transcript = check({
        arguments: [
          "--eval",
          `process.stdout.write(${JSON.stringify(CANARY_OUTPUT)}); process.stderr.write('stderr')`
        ],
        output: { mode: "transcript" }
      });
      assert.deepEqual(await execute(transcript.options, root), {
        status: "unavailable",
        reason: { code: "command-transcript-unavailable" }
      });
      assert.deepEqual(await execute(transcript.options, root, artifactDirectory), {
        status: "passed",
        data: { exitCode: 0 }
      });
      const log = readFileSync(join(artifactDirectory, "process.log"), "utf8");
      assert.match(log, /^status=passed\nstdout:\n/);
      assert.match(log, new RegExp(CANARY_OUTPUT));
      assert.match(log, /stderr/);
      assert.equal(log.includes(CANARY_ARGUMENT), false);
      assert.equal(log.includes(CANARY_ENVIRONMENT), false);

      const finalFailureArtifact = join(root, "final-replacement-failure");
      const finalFailure = check({
        arguments: ["--eval", "setTimeout(() => process.stdout.write('closed'), 500)"],
        output: { mode: "transcript" }
      });
      const finalFailureExecution = execute(finalFailure.options, root, finalFailureArtifact);
      const finalTranscriptPath = join(finalFailureArtifact, "process.log");
      await waitForFile(finalTranscriptPath);
      rmSync(finalTranscriptPath);
      mkdirSync(finalTranscriptPath);
      assert.deepEqual(await finalFailureExecution, {
        status: "unavailable",
        reason: { code: "command-transcript-unavailable" }
      });

      const blockedArtifact = join(root, "blocked");
      writeFileSync(blockedArtifact, "not a directory", "utf8");
      assert.deepEqual(await execute(transcript.options, root, blockedArtifact), {
        status: "unavailable",
        reason: { code: "command-transcript-unavailable" }
      });
      assert.equal(existsSync(join(blockedArtifact, "process.log")), false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

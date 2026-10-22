import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { syncBuiltinESMExports } from "node:module";
import { mock } from "node:test";
import timers from "node:timers/promises";

import {
  commandCheck,
  defineCheck,
  defineConfig,
  defineContextCallback,
  run
} from "@zxyycom/vibe-check";

const projectRoot = process.argv[2];
if (process.argv.length !== 3 || projectRoot === undefined || !isAbsolute(projectRoot)) {
  throw new Error("usage: command-check-runtime.mjs <absolute-project-root>");
}
assert.equal(statSync(projectRoot).isDirectory(), true, "fixture project root must be a directory");

const DEFAULT_EXECUTABLE_CANARY = "__VIBE_CHECK_DEFAULT_EXECUTABLE_CANARY__";
const DEFAULT_ARGUMENT_CANARY = "__VIBE_CHECK_DEFAULT_ARGUMENT_CANARY__";
const DEFAULT_ENVIRONMENT_CANARY = "__VIBE_CHECK_DEFAULT_ENVIRONMENT_CANARY__";
const CHILD_STDOUT_CANARY = "__VIBE_CHECK_CHILD_STDOUT_CANARY__";
const CHILD_STDERR_CANARY = "__VIBE_CHECK_CHILD_STDERR_CANARY__";
const TRANSCRIPT_ARGUMENT_CANARY = "__VIBE_CHECK_TRANSCRIPT_ARGUMENT_CANARY__";
const TRANSCRIPT_ENVIRONMENT_CANARY = "__VIBE_CHECK_TRANSCRIPT_ENVIRONMENT_CANARY__";

const prerequisite = defineCheck({
  checkId: "command-prerequisite",
  displayName: "Command prerequisite",
  execute: () => ({ status: "passed", data: {} })
});
const nestedChild = defineCheck({
  checkId: "command-nested-child",
  displayName: "Command nested child",
  execute: () => ({ status: "passed", data: {} })
});
const composed = commandCheck({
  admissionPriority: 1,
  arguments: ["--eval", "process.exit(0)"],
  checkId: "command-composed",
  checks: [nestedChild],
  dependsOn: [prerequisite.checkId],
  displayName: "Composed command",
  enabledByFlags: { when: "command-enabled" },
  executable: process.execPath,
  maxParallel: 1,
  mutex: ["command-fixture"],
  outputByteLimit: 256,
  resourceClaims: { process: 1 },
  timeoutMs: 5_000
});
const passed = commandCheck({
  arguments: ["--eval", "process.exit(0)"],
  checkId: "command-passed",
  displayName: "Passed command",
  executable: process.execPath,
  outputByteLimit: 256,
  timeoutMs: 5_000
});
const failed = commandCheck({
  arguments: ["--eval", "process.exit(7)"],
  checkId: "command-failed",
  displayName: "Failed command",
  executable: process.execPath,
  outputByteLimit: 256,
  timeoutMs: 5_000
});
const outputLimited = commandCheck({
  arguments: ["--eval", "process.stdout.write('x'.repeat(257))"],
  checkId: "command-output-limited",
  displayName: "Output limited command",
  executable: process.execPath,
  outputByteLimit: 32,
  timeoutMs: 5_000
});
const defaultCanary = commandCheck({
  arguments: [DEFAULT_ARGUMENT_CANARY],
  checkId: "command-default-canary",
  displayName: "Default boundary canary",
  environment: { mode: "exact", variables: { SECRET: DEFAULT_ENVIRONMENT_CANARY } },
  executable: DEFAULT_EXECUTABLE_CANARY,
  outputByteLimit: 256,
  timeoutMs: 5_000
});
const discardedChildOutput = commandCheck({
  arguments: [
    "--eval",
    `process.stdout.write(${JSON.stringify(CHILD_STDOUT_CANARY)}); process.stderr.write(${JSON.stringify(CHILD_STDERR_CANARY)}); process.exit(3)`
  ],
  checkId: "command-discarded-child-output",
  displayName: "Discarded child output",
  executable: process.execPath,
  outputByteLimit: 256,
  timeoutMs: 5_000
});
const transcript = commandCheck({
  arguments: [
    "--eval",
    "process.stdout.write('transcript stdout'); process.stderr.write('transcript stderr')",
    TRANSCRIPT_ARGUMENT_CANARY
  ],
  checkId: "command-transcript",
  displayName: "Transcript command",
  environment: { mode: "exact", variables: { SECRET: TRANSCRIPT_ENVIRONMENT_CANARY } },
  executable: process.execPath,
  output: { mode: "transcript" },
  outputByteLimit: 256,
  timeoutMs: 5_000
});

const mainResult = await run(
  defineConfig({
    checks: [
      prerequisite,
      composed,
      passed,
      failed,
      outputLimited,
      defaultCanary,
      discardedChildOutput,
      transcript
    ],
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { directory: "command-machine", enabled: true },
      progressRendering: { enabled: false }
    },
    scheduler: { maxParallel: 1, resourceCapacities: { process: 1 } }
  }),
  {
    checkArtifactBaseDirectory: "command-artifacts",
    flags: ["command-enabled"],
    projectRoot
  }
);
if (mainResult.kind !== "completed") {
  throw new Error(`command fixture did not complete: ${mainResult.kind}`);
}

const transcriptPath = findProcessTranscript(join(projectRoot, "command-artifacts"));
const transcriptContents = transcriptPath === undefined ? "" : readFileSync(transcriptPath, "utf8");
const machineContents = readFileSync(join(projectRoot, "command-machine", "run.json"), "utf8");
const defaultPublicMaterial = JSON.stringify({
  checkMessages: mainResult.checkMessages,
  checkDurations: mainResult.checkDurations,
  snapshot: mainResult.snapshot
});
const cancellation = await cancellationEvidence(projectRoot);
const contextDeclarations = await declaredContextEvidence(projectRoot);
await assertIncompleteCommandBoundaries(projectRoot);

process.stdout.write(
  "__VIBE_CHECK_COMMAND_CHECK_RUN__" +
    JSON.stringify({
      cancellation,
      contextDeclarations,
      main: commandOutcomes(mainResult),
      publicSurface: {
        defaultCanariesAbsent: ![
          DEFAULT_EXECUTABLE_CANARY,
          DEFAULT_ARGUMENT_CANARY,
          DEFAULT_ENVIRONMENT_CANARY,
          CHILD_STDOUT_CANARY,
          CHILD_STDERR_CANARY
        ].some((canary) => defaultPublicMaterial.includes(canary)),
        machineCanariesAbsent: ![
          DEFAULT_EXECUTABLE_CANARY,
          DEFAULT_ARGUMENT_CANARY,
          DEFAULT_ENVIRONMENT_CANARY,
          CHILD_STDOUT_CANARY,
          CHILD_STDERR_CANARY
        ].some((canary) => machineContents.includes(canary))
      },
      transcript: {
        exists: transcriptPath !== undefined,
        excludesDefinitionMaterial: ![
          process.execPath,
          TRANSCRIPT_ARGUMENT_CANARY,
          TRANSCRIPT_ENVIRONMENT_CANARY
        ].some((value) => transcriptContents.includes(value)),
        includesRawStderr: transcriptContents.includes("transcript stderr"),
        includesRawStdout: transcriptContents.includes("transcript stdout")
      }
    })
);

async function cancellationEvidence(root) {
  const readyPath = join(root, "command-cancellation-ready");
  const controller = new AbortController();
  const cancelled = commandCheck({
    arguments: [
      "--eval",
      "require('node:fs').writeFileSync(process.argv[1], 'ready'); setInterval(() => {}, 1_000)",
      readyPath
    ],
    checkId: "command-cancelled",
    displayName: "Cancelled command",
    executable: process.execPath,
    outputByteLimit: 256,
    timeoutMs: 5_000
  });
  try {
    const resultPromise = run(
      defineConfig({
        checks: [cancelled],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      }),
      { projectRoot: root, signal: controller.signal }
    );
    await waitForFile(readyPath);
    controller.abort();
    const result = await resultPromise;
    const outcome =
      result.kind === "cancelled" && result.phase === "execution"
        ? outcomeFor(result.snapshot, cancelled.checkId)
        : undefined;
    return {
      kind: result.kind,
      outcome: safeOutcome(outcome),
      phase: result.kind === "cancelled" ? result.phase : null
    };
  } finally {
    rmSync(readyPath, { force: true });
  }
}

function commandOutcomes(result) {
  return {
    composed: safeOutcome(outcomeFor(result.snapshot, composed.checkId)),
    defaultCanary: safeOutcome(outcomeFor(result.snapshot, defaultCanary.checkId)),
    discardedChildOutput: safeOutcome(outcomeFor(result.snapshot, discardedChildOutput.checkId)),
    failed: safeOutcome(outcomeFor(result.snapshot, failed.checkId)),
    nestedChild: safeOutcome(outcomeFor(result.snapshot, nestedChild.checkId)),
    outputLimited: safeOutcome(outcomeFor(result.snapshot, outputLimited.checkId)),
    passed: safeOutcome(outcomeFor(result.snapshot, passed.checkId)),
    prerequisite: safeOutcome(outcomeFor(result.snapshot, prerequisite.checkId)),
    transcript: safeOutcome(outcomeFor(result.snapshot, transcript.checkId))
  };
}

function outcomeFor(snapshot, checkId) {
  return snapshot.checks.find((check) => check.checkId === checkId)?.outcome;
}

function safeOutcome(outcome) {
  if (outcome === undefined) return null;
  if (outcome.status === "passed" || outcome.status === "failed") {
    return { exitCode: outcome.data.exitCode, status: outcome.status };
  }
  return { reason: outcome.reason?.code ?? null, status: outcome.status };
}

function findProcessTranscript(directory) {
  if (!existsSync(directory)) return undefined;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = findProcessTranscript(path);
      if (nested !== undefined) return nested;
    } else if (entry.isFile() && entry.name === "process.log") {
      return path;
    }
  }
  return undefined;
}

async function waitForFile(path) {
  const deadline = Date.now() + 2_000;
  while (!existsSync(path)) {
    if (Date.now() >= deadline) throw new Error("cancelled command did not signal readiness");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function declaredContextEvidence(root) {
  let environmentFields, completionFields, emptyFields;
  let frozen = true,
    businessInputs = true;
  const needs = ["project"];
  const environment = {
    contextNeeds: needs,
    callback(options, context) {
      businessInputs &&= options.executable === process.execPath;
      environmentFields = Object.keys(context);
      frozen &&= Object.isFrozen(context);
      return { mode: "exact", variables: { DECLARED_PROJECT_ROOT: context.project.root } };
    }
  };
  const checked = commandCheck({
    checkId: "declared-command",
    displayName: "Declared command",
    executable: process.execPath,
    arguments: [
      "--eval",
      "if (!process.env.DECLARED_PROJECT_ROOT) process.exit(11); process.exitCode = 13"
    ],
    outputByteLimit: 256,
    timeoutMs: 5_000,
    resolveEnvironment: environment,
    afterCommand: {
      execute: defineContextCallback("command.complete", {
        contextNeeds: ["records"],
        callback({ options, command }, context) {
          businessInputs &&= options.executable === process.execPath && command.exitCode === 13;
          completionFields = Object.keys(context);
          frozen &&= Object.isFrozen(context);
          context.records.report({ id: "declared-completion" }, { complete: true });
          return { status: "passed", data: { exitCode: command.exitCode } };
        }
      })
    }
  });
  needs.splice(0);
  environment.callback = () => {
    throw new Error("constructor failed to fix callback");
  };
  const empty = commandCheck({
    checkId: "empty-command",
    displayName: "Empty command",
    executable: process.execPath,
    arguments: ["--eval", "process.stdout.write('中'.repeat(32))"],
    outputByteLimit: 64,
    timeoutMs: 5_000,
    resolveEnvironment(_options, context) {
      emptyFields = Object.keys(context);
      frozen &&= Object.isFrozen(context);
      return { mode: "exact" };
    }
  });
  const result = await run(
    defineConfig({
      checks: [checked, empty],
      outputs: {
        diagnosticLogging: { enabled: false },
        machinePublication: { enabled: false },
        progressRendering: { enabled: false }
      }
    }),
    { projectRoot: root }
  );
  return {
    businessInputs,
    completionFields,
    emptyFields,
    environmentFields,
    frozen,
    passed:
      result.kind === "completed" &&
      result.snapshot.checks.every(({ outcome }) => outcome.status === "passed") &&
      result.snapshot.records.length === 1
  };
}
/** Uses real child PIDs and signals; only the escalation clock is virtual, not the cleanup deadline. */
async function assertIncompleteCommandBoundaries(root) {
  const ownedPaths = [];
  let callbackCalls = 0;
  let cleanupDeadlineExpired = false;
  const cases = [1, 2].flatMap((fd) =>
    ["burst", "continuous", "exit-0", "exit-23"].map((mode) => ({ fd, mode }))
  );
  if (process.platform !== "win32") cases.push({ fd: 1, mode: "ignore-sigterm" });
  const checks = cases.map(({ fd, mode }, index) => {
    const pidPath = join(root, `command-incomplete-${index}.pid`);
    const terminationPath = join(root, `command-incomplete-${index}.sigterm`);
    ownedPaths.push({ pidPath, terminationPath });
    let outputLifecycleSource;
    switch (mode) {
      case "continuous":
        outputLifecycleSource = "setInterval(write, 10);";
        break;
      case "burst":
      case "ignore-sigterm":
        outputLifecycleSource = "write(); setInterval(() => {}, 1_000);";
        break;
      case "exit-0":
        outputLifecycleSource = "write(); setTimeout(() => process.exit(0), 50);";
        break;
      case "exit-23":
        outputLifecycleSource = "write(); setTimeout(() => process.exit(23), 50);";
        break;
      default:
        throw new Error(`unknown incomplete command mode: ${mode}`);
    }
    const source = [
      "const fs = require('node:fs');",
      ...(mode === "ignore-sigterm"
        ? [
            `process.on('SIGTERM', () => fs.writeFileSync(${JSON.stringify(terminationPath)}, 'ignored'));`
          ]
        : []),
      `fs.writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));`,
      // Keep the child alive after expected pipe closure, but expose any other fixture I/O failure.
      `const write = () => {
        try { fs.writeSync(${fd}, 'x'.repeat(4096)); }
        catch (error) {
          if (!(error instanceof Error) || !('code' in error) || error.code !== 'EPIPE') throw error;
        }
      };`,
      outputLifecycleSource
    ].join("\n");
    return commandCheck({
      checkId: `command-incomplete-${index}`,
      displayName: "Incomplete command",
      executable: process.execPath,
      arguments: ["--eval", source],
      outputByteLimit: 32,
      timeoutMs: 20_000,
      afterCommand: {
        execute: defineContextCallback("command.complete", {
          contextNeeds: ["records"],
          callback(_input, { records }) {
            callbackCalls += 1;
            records.report({ id: "unexpected-partial-completion" }, { partial: true });
            return { status: "passed", data: { partial: true } };
          }
        })
      }
    });
  });
  const forceKillClock = controlledForceKillClock();
  const controller = new AbortController();
  const running = run(
    defineConfig({
      checks,
      outputs: {
        diagnosticLogging: { enabled: false },
        machinePublication: { enabled: false },
        progressRendering: { enabled: false }
      }
    }),
    { projectRoot: root, signal: controller.signal }
  );
  const watchdog = setTimeout(() => {
    cleanupDeadlineExpired = true;
    controller.abort();
    for (const { pidPath } of ownedPaths) killOwnedChild(pidPath);
  }, 9_000);
  try {
    if (process.platform !== "win32") {
      const ignored = ownedPaths.at(-1);
      await waitForFile(ignored.terminationPath);
      assert.equal(
        ownedChildAlive(ignored.pidPath),
        true,
        "ignored SIGTERM child exited before escalation"
      );
      forceKillClock.advance();
    }
    const result = await running;
    assert.equal(cleanupDeadlineExpired, false, "overflow waited for the fixture cleanup deadline");
    assert.equal(result.kind, "completed");
    assert.equal(callbackCalls, 0);
    assert.deepEqual(result.snapshot.records, []);
    for (const { outcome } of result.snapshot.checks) {
      assert.equal(outcome.status === "failed" || outcome.status === "unavailable", true);
      if (outcome.status === "failed") assert.deepEqual(outcome.data, { exitCode: 23 });
      else assert.equal(outcome.reason.code, "command-output-limit-exceeded");
    }
    for (const { pidPath } of ownedPaths) {
      assert.equal(existsSync(pidPath), true, "fixture child did not record its PID");
      assert.equal(ownedChildAlive(pidPath), false, "installed command returned with a live child");
    }
    if (process.platform !== "win32") {
      assert.equal(existsSync(ownedPaths.at(-1).terminationPath), true);
    }
  } finally {
    clearTimeout(watchdog);
    try {
      // Release pending logical waits before awaiting a possibly failed Run.
      forceKillClock.restore();
      controller.abort();
      for (const { pidPath } of ownedPaths) killOwnedChild(pidPath);
      await running;
    } finally {
      for (const { pidPath, terminationPath } of ownedPaths) {
        rmSync(pidPath, { force: true });
        rmSync(terminationPath, { force: true });
      }
    }
  }
}

function controlledForceKillClock() {
  const originalTimeout = timers.setTimeout;
  const pending = [];
  const timerMock = mock.method(timers, "setTimeout", (delay, value, options) => {
    if (delay !== 5_000) return originalTimeout(delay, value, options);
    return new Promise((resolve) => pending.push(() => resolve(value)));
  });
  // Execa imports the built-in's named export; update that binding in this isolated Node fixture.
  syncBuiltinESMExports();
  return {
    advance() {
      assert.ok(
        pending.length > 0 || process.platform === "win32",
        "missing 5-second escalation timer"
      );
      for (const resolve of pending) resolve();
    },
    restore() {
      for (const resolve of pending) resolve();
      timerMock.mock.restore();
      syncBuiltinESMExports();
    }
  };
}

function ownedChildAlive(pidPath) {
  const pid = readOwnedChildPid(pidPath);
  if (pid === undefined) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") return false;
    throw error;
  }
}

function killOwnedChild(pidPath) {
  const pid = readOwnedChildPid(pidPath);
  if (pid === undefined) return;
  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") return;
    throw error;
  }
}

function readOwnedChildPid(pidPath) {
  if (!existsSync(pidPath)) return undefined;
  const pid = Number(readFileSync(pidPath, "utf8"));
  assert.equal(Number.isSafeInteger(pid) && pid > 0, true, `invalid fixture PID: ${pidPath}`);
  return pid;
}

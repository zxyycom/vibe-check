import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { commandCheck, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const projectRoot = process.argv[2];
if (projectRoot === undefined) throw new Error("fixture project root is required");

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

process.stdout.write(
  "__VIBE_CHECK_COMMAND_CHECK_RUN__" +
    JSON.stringify({
      cancellation,
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

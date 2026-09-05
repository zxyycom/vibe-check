#!/usr/bin/env bun

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  preparePackageCandidate,
  type PreparedPackageCandidate
} from "../../package/candidate/prepare.ts";
import { prepareReleaseCandidateFromReceipt } from "../../package/release/prepare.ts";
import { errorMessage } from "../../error-message.ts";

import { projectGateHelp, selectionFlags, type ProjectGateSelection } from "./runtime/controls.ts";
import {
  parseProjectGateInvocationArguments,
  type ProjectGateCandidateInput
} from "./runtime/invocation.ts";
import {
  createInitialProjectGateResult,
  createProjectGateResult,
  parseProjectGateResult,
  type ProjectGateResult
} from "./runtime/result.ts";
import { startProjectGateTranscript, type ProjectGateTranscript } from "./runtime/transcript.ts";
import type { ProjectGateAfterHook, ProjectGateContext } from "./runtime/after-gate.ts";
import {
  reportGateAdapterMessage,
  reportGateInvocationStarted,
  reportProjectGateMessages
} from "./runtime/reporting.ts";

interface GateRunModule {
  readonly afterGate: ProjectGateAfterHook;
  readonly resolvedEntryPath: string;
  run(input: {
    readonly flags: readonly string[];
    readonly invocationLogDirectory: string;
    readonly preparedCandidate: PreparedPackageCandidate;
  }): Promise<unknown>;
}

interface ProjectGateSteps {
  readonly clock: ProjectGateClock;
  readonly createInvocationLogDirectory: () => string;
  readonly loadRunModule: () => Promise<GateRunModule>;
  readonly prepareCandidate: () => Promise<PreparedPackageCandidate>;
  readonly prepareReleaseCandidate: (receiptPath: string) => Promise<PreparedPackageCandidate>;
  readonly startTranscript: typeof startProjectGateTranscript;
}

export type { ProjectGateContext, ProjectGateTiming } from "./runtime/after-gate.ts";

interface ProjectGateClock {
  now(): number;
}

const SYSTEM_PROJECT_GATE_CLOCK: ProjectGateClock = Object.freeze({
  now: () => performance.now()
});

const PROJECT_GATE_REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const defaultSteps: ProjectGateSteps = Object.freeze({
  clock: SYSTEM_PROJECT_GATE_CLOCK,
  createInvocationLogDirectory,
  loadRunModule: async (): Promise<GateRunModule> => import("./runtime/bound-run.ts"),
  prepareCandidate: preparePackageCandidate,
  prepareReleaseCandidate: (receiptPath: string) =>
    prepareReleaseCandidateFromReceipt({ receiptPath }),
  startTranscript: startProjectGateTranscript
});

export const PROJECT_GATE_EXIT_STATUS = Object.freeze({
  failed: 1,
  passed: 0,
  unavailable: 2
} as const);

export type ProjectGateExitStatus =
  (typeof PROJECT_GATE_EXIT_STATUS)[keyof typeof PROJECT_GATE_EXIT_STATUS];

/** Runs the candidate-backed repository Gate and returns its process exit status. */
export async function runProjectGate(
  arguments_: readonly string[] = process.argv.slice(2),
  stepOverrides: Partial<ProjectGateSteps> = {}
): Promise<ProjectGateExitStatus> {
  const steps: ProjectGateSteps = Object.freeze({
    ...defaultSteps,
    ...stepOverrides
  });
  const parsed = parseProjectGateInvocationArguments(arguments_);
  if (!parsed.ok) {
    console.error(`project gate argument error: ${parsed.error}`);
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }
  if (parsed.action === "help") {
    console.log(projectGateHelp());
    return PROJECT_GATE_EXIT_STATUS.passed;
  }
  const gateStartedAtMs = steps.clock.now();

  let prepared: PreparedPackageCandidate;
  try {
    prepared = await prepareInvocationCandidate(parsed.candidateInput, steps);
  } catch (error: unknown) {
    console.error(`project gate candidate preparation failed: ${errorMessage(error)}`);
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }
  const candidatePreparedAtMs = steps.clock.now();

  let runModule: GateRunModule;
  try {
    runModule = await steps.loadRunModule();
  } catch (error: unknown) {
    console.error(`project gate candidate import failed: ${errorMessage(error)}`);
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }
  if (runModule.resolvedEntryPath !== prepared.resolvedEntryPath) {
    console.error(
      "project gate candidate import failed: resolved package entry did not match preparation"
    );
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }

  let invocationLogDirectory: string;
  try {
    invocationLogDirectory = steps.createInvocationLogDirectory();
  } catch (error: unknown) {
    console.error(`project gate log setup failed: ${errorMessage(error)}`);
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }
  let transcript: ProjectGateTranscript;
  try {
    transcript = steps.startTranscript(invocationLogDirectory);
  } catch (error: unknown) {
    console.error(`project gate log setup failed: ${errorMessage(error)}`);
    console.log(`project gate logs: ${invocationLogDirectory}`);
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }
  const productRunStartedAtMs = steps.clock.now();
  let finalResult = createProjectGateResult("unavailable");
  let exitStatus: ProjectGateExitStatus;
  let transcriptStatus: "failed" | "succeeded";
  try {
    reportGateInvocationStarted(transcript, {
      candidateSource: parsed.candidateInput.kind,
      candidateVersion: prepared.candidateVersion,
      selection: parsed.selection
    });
    const runResult = await runModule.run({
      flags: selectionFlags(parsed.selection),
      invocationLogDirectory,
      preparedCandidate: prepared
    });
    const initialResult = createInitialProjectGateResult(runResult);
    const initialResultAtMs = steps.clock.now();
    const context = createProjectGateContext({
      candidatePreparedAtMs,
      initialResultAtMs,
      invocationLogDirectory,
      preparedCandidate: prepared,
      runResult,
      selection: parsed.selection,
      startedAtMs: gateStartedAtMs,
      productRunStartedAtMs
    });
    finalResult = await applyAfterGate(runModule.afterGate, initialResult, context);
    reportProjectGateMessages(finalResult.messages, transcript);
  } catch (error: unknown) {
    finalResult = createProjectGateResult("unavailable");
    reportGateAdapterMessage(
      transcript,
      "error",
      `project gate execution failed: ${errorMessage(error)}`
    );
  } finally {
    exitStatus = projectGateExitStatus(finalResult);
    transcriptStatus = completeProjectGateTranscript(transcript, {
      exitStatus,
      invocationLogDirectory,
      result: finalResult.status
    });
  }

  if (transcriptStatus === "failed") {
    console.error("project gate log failure: gate.log was not completed");
    console.log(`project gate logs: ${invocationLogDirectory}`);
    console.log("project gate result: unavailable");
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }
  console.log(`project gate logs: ${invocationLogDirectory}`);
  console.log(`project gate result: ${finalResult.status}`);
  return exitStatus;
}

function prepareInvocationCandidate(
  candidateInput: ProjectGateCandidateInput,
  steps: ProjectGateSteps
): Promise<PreparedPackageCandidate> {
  switch (candidateInput.kind) {
    case "local":
      return steps.prepareCandidate();
    case "release-receipt":
      return steps.prepareReleaseCandidate(candidateInput.receiptPath);
  }
}

function completeProjectGateTranscript(
  transcript: ProjectGateTranscript,
  completion: Parameters<ProjectGateTranscript["complete"]>[0]
): "failed" | "succeeded" {
  try {
    return transcript.complete(completion);
  } catch {
    return "failed";
  }
}

/** Converts the single final Gate result into its process boundary. */
export function projectGateExitStatus(result: ProjectGateResult): ProjectGateExitStatus {
  if (result.status === "passed") return PROJECT_GATE_EXIT_STATUS.passed;
  if (result.status === "failed") return PROJECT_GATE_EXIT_STATUS.failed;
  return PROJECT_GATE_EXIT_STATUS.unavailable;
}

export function createInvocationLogDirectory(): string {
  const invocationId = `${new Date().toISOString().replaceAll(":", "-")}-${process.pid}-${crypto.randomUUID()}`;
  const directory = resolve(PROJECT_GATE_REPOSITORY_ROOT, ".log", "project-gate", invocationId);
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function applyAfterGate(
  afterGate: ProjectGateAfterHook,
  initialResult: ProjectGateResult,
  context: ProjectGateContext
): Promise<ProjectGateResult> {
  try {
    const transformed = parseProjectGateResult(await afterGate(initialResult, context));
    if (transformed !== undefined) return transformed;
    return afterGateFailure("after-gate-invalid-result", "afterGate returned an invalid result");
  } catch {
    return afterGateFailure(
      "after-gate-failed",
      "afterGate failed before producing a final result"
    );
  }
}

type AfterGateFailureCode = "after-gate-failed" | "after-gate-invalid-result";

function afterGateFailure(code: AfterGateFailureCode, message: string): ProjectGateResult {
  return createProjectGateResult("unavailable", [{ level: "error", code, message }]);
}

function createProjectGateContext(
  input: Readonly<{
    readonly candidatePreparedAtMs: number;
    readonly initialResultAtMs: number;
    readonly invocationLogDirectory: string;
    readonly preparedCandidate: PreparedPackageCandidate;
    readonly runResult: unknown;
    readonly selection: ProjectGateSelection;
    readonly startedAtMs: number;
    readonly productRunStartedAtMs: number;
  }>
): ProjectGateContext {
  return Object.freeze({
    invocationLogDirectory: input.invocationLogDirectory,
    preparedCandidate: input.preparedCandidate,
    repositoryRoot: PROJECT_GATE_REPOSITORY_ROOT,
    runResult: input.runResult,
    selection: input.selection,
    timing: Object.freeze({
      adapterSetupMs: input.productRunStartedAtMs - input.candidatePreparedAtMs,
      candidatePreparationMs: input.candidatePreparedAtMs - input.startedAtMs,
      elapsedToInitialResultMs: input.initialResultAtMs - input.startedAtMs,
      initialResultAtMs: input.initialResultAtMs,
      productRunMs: input.initialResultAtMs - input.productRunStartedAtMs,
      startedAtMs: input.startedAtMs
    })
  });
}

if (import.meta.main) {
  process.exitCode = await runProjectGate();
}

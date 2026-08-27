#!/usr/bin/env bun

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  preparePackageCandidate,
  type PreparedPackageCandidate
} from "../../package/candidate/prepare.ts";
import { errorMessage } from "../../error-message.ts";

import {
  parseProjectGateArguments,
  projectGateHelp,
  projectGateSelectionSummary,
  selectionFlags,
  type ProjectGateSelection
} from "./controls.ts";
import {
  createInitialProjectGateResult,
  createProjectGateResult,
  parseProjectGateResult,
  type ProjectGateMessage,
  type ProjectGateResult
} from "./result.ts";

interface GateRunModule {
  readonly resolvedEntryPath: string;
  runProjectGate(input: {
    readonly flags: readonly string[];
    readonly invocationLogDirectory: string;
    readonly preparedCandidate: PreparedPackageCandidate;
  }): Promise<unknown>;
}

interface ProjectGateSteps {
  readonly afterGate: ProjectGateAfterHook;
  readonly clock: ProjectGateClock;
  readonly createInvocationLogDirectory: () => string;
  readonly loadRunModule: () => Promise<GateRunModule>;
  readonly prepareCandidate: () => Promise<PreparedPackageCandidate>;
}

export interface ProjectGateContext {
  readonly invocationLogDirectory: string;
  readonly preparedCandidate: PreparedPackageCandidate;
  readonly repositoryRoot: string;
  readonly runResult: unknown;
  readonly selection: ProjectGateSelection;
  readonly timing: ProjectGateTiming;
}

export interface ProjectGateTiming {
  readonly elapsedToInitialResultMs: number;
  readonly initialResultAtMs: number;
  readonly startedAtMs: number;
}

export type ProjectGateAfterHook = (
  result: ProjectGateResult,
  context: ProjectGateContext
) => ProjectGateResult | Promise<ProjectGateResult>;

interface ProjectGateClock {
  now(): number;
}

const SYSTEM_PROJECT_GATE_CLOCK: ProjectGateClock = Object.freeze({
  now: () => performance.now()
});

const PROJECT_GATE_REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const defaultSteps: ProjectGateSteps = Object.freeze({
  afterGate: (result: ProjectGateResult): ProjectGateResult => result,
  clock: SYSTEM_PROJECT_GATE_CLOCK,
  createInvocationLogDirectory,
  loadRunModule: async (): Promise<GateRunModule> => import("./project-run.ts"),
  prepareCandidate: preparePackageCandidate
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
  const steps: ProjectGateSteps = Object.freeze({ ...defaultSteps, ...stepOverrides });
  const parsed = parseProjectGateArguments(arguments_);
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
    prepared = await steps.prepareCandidate();
  } catch (error: unknown) {
    console.error(`project gate candidate preparation failed: ${errorMessage(error)}`);
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }

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
  console.log(`project gate candidate: ${prepared.candidateVersion}`);
  console.log(`project gate selection: ${projectGateSelectionSummary(parsed.value)}`);
  let runResult: unknown;
  try {
    runResult = await runModule.runProjectGate({
      flags: selectionFlags(parsed.value),
      invocationLogDirectory,
      preparedCandidate: prepared
    });
  } catch (error: unknown) {
    console.error(`project gate execution failed: ${errorMessage(error)}`);
    console.error(`project gate logs: ${invocationLogDirectory}`);
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }

  const initialResult = createInitialProjectGateResult(runResult);
  const initialResultAtMs = Math.max(gateStartedAtMs, steps.clock.now());
  const context = createProjectGateContext({
    initialResultAtMs,
    invocationLogDirectory,
    preparedCandidate: prepared,
    runResult,
    selection: parsed.value,
    startedAtMs: gateStartedAtMs
  });
  const finalResult = await applyAfterGate(steps.afterGate, initialResult, context);
  reportProjectGateMessages(finalResult.messages);
  console.log(`project gate logs: ${invocationLogDirectory}`);
  console.log(`project gate result: ${finalResult.status}`);
  return projectGateExitStatus(finalResult);
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
    readonly initialResultAtMs: number;
    readonly invocationLogDirectory: string;
    readonly preparedCandidate: PreparedPackageCandidate;
    readonly runResult: unknown;
    readonly selection: ProjectGateSelection;
    readonly startedAtMs: number;
  }>
): ProjectGateContext {
  return Object.freeze({
    invocationLogDirectory: input.invocationLogDirectory,
    preparedCandidate: input.preparedCandidate,
    repositoryRoot: PROJECT_GATE_REPOSITORY_ROOT,
    runResult: input.runResult,
    selection: input.selection,
    timing: Object.freeze({
      elapsedToInitialResultMs: input.initialResultAtMs - input.startedAtMs,
      initialResultAtMs: input.initialResultAtMs,
      startedAtMs: input.startedAtMs
    })
  });
}

function reportProjectGateMessages(messages: readonly ProjectGateMessage[]): void {
  for (const message of messages) {
    const text = `project gate ${message.level} [${message.code}]: ${message.message}`;
    if (message.level === "error") {
      console.error(text);
      continue;
    }
    if (message.level === "warning") {
      console.warn(text);
      continue;
    }
    console.log(text);
  }
}

if (import.meta.main) {
  process.exitCode = await runProjectGate();
}

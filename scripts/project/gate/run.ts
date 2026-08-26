#!/usr/bin/env bun

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  preparePackageCandidate,
  type PreparedPackageCandidate
} from "../../package/candidate/prepare.ts";
import { errorMessage } from "../../error-message.ts";
import { isNonArrayRecord } from "../../value-guards.ts";

import {
  parseProjectGateArguments,
  selectionFlags,
  type ProjectGateSelection
} from "./controls.ts";

interface GateRunModule {
  readonly resolvedEntryPath: string;
  runProjectGate(input: {
    readonly flags: readonly string[];
    readonly invocationLogDirectory: string;
  }): Promise<unknown>;
}

interface ProjectGateSteps {
  readonly createInvocationLogDirectory: () => string;
  readonly loadRunModule: () => Promise<GateRunModule>;
  readonly prepareCandidate: () => Promise<PreparedPackageCandidate>;
}

const defaultSteps: ProjectGateSteps = Object.freeze({
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
  steps: ProjectGateSteps = defaultSteps
): Promise<ProjectGateExitStatus> {
  const parsed = parseProjectGateArguments(arguments_);
  if (!parsed.ok) {
    console.error(`project gate argument error: ${parsed.error}`);
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }

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
  console.log(`project gate selection: ${selectionSummary(parsed.value)}`);
  try {
    const result = await runModule.runProjectGate({
      flags: selectionFlags(parsed.value),
      invocationLogDirectory
    });
    const status = projectGateExitStatus(result);
    console.log(`project gate logs: ${invocationLogDirectory}`);
    console.log(`project gate result: ${resultSummary(status)}`);
    return status;
  } catch (error: unknown) {
    console.error(`project gate execution failed: ${errorMessage(error)}`);
    console.error(`project gate logs: ${invocationLogDirectory}`);
    return PROJECT_GATE_EXIT_STATUS.unavailable;
  }
}

/** Maps completed Run facts; aggregation ownership remains inside Package Run. */
export function projectGateExitStatus(result: unknown): ProjectGateExitStatus {
  if (!isCompletedResult(result)) return PROJECT_GATE_EXIT_STATUS.unavailable;
  if (
    result.definitionWarnings.length > 0 ||
    result.outputs.progressRendering.status !== "succeeded"
  ) {
    return PROJECT_GATE_EXIT_STATUS.failed;
  }
  return result.aggregate === "passed"
    ? PROJECT_GATE_EXIT_STATUS.passed
    : PROJECT_GATE_EXIT_STATUS.failed;
}

function isCompletedResult(value: unknown): value is Readonly<{
  readonly aggregate: "failed" | "not-applicable" | "passed" | "unavailable";
  readonly definitionWarnings: readonly unknown[];
  readonly outputs: Readonly<{
    readonly progressRendering: Readonly<{ readonly status: unknown }>;
  }>;
  readonly kind: "completed";
}> {
  return (
    isNonArrayRecord(value) &&
    value.kind === "completed" &&
    isCheckAggregate(value.aggregate) &&
    Array.isArray(value.definitionWarnings) &&
    isNonArrayRecord(value.outputs) &&
    isNonArrayRecord(value.outputs.progressRendering)
  );
}

function isCheckAggregate(
  value: unknown
): value is "failed" | "not-applicable" | "passed" | "unavailable" {
  return (
    value === "failed" ||
    value === "not-applicable" ||
    value === "passed" ||
    value === "unavailable"
  );
}

export function createInvocationLogDirectory(): string {
  const invocationId = `${new Date().toISOString().replaceAll(":", "-")}-${process.pid}-${crypto.randomUUID()}`;
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const directory = resolve(repositoryRoot, ".log", "project-gate", invocationId);
  mkdirSync(directory, { recursive: true });
  return directory;
}

function resultSummary(status: ProjectGateExitStatus): string {
  if (status === PROJECT_GATE_EXIT_STATUS.passed) return "passed";
  if (status === PROJECT_GATE_EXIT_STATUS.failed) return "failed";
  return "unavailable";
}

function selectionSummary(selection: ProjectGateSelection): string {
  const disabledTags =
    selection.disabledTags.length === 0 ? "none" : selection.disabledTags.join(",");
  return `profile=${selection.profile}; disabled-tags=${disabledTags}`;
}

if (import.meta.main) {
  process.exitCode = await runProjectGate();
}

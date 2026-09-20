import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANDIDATE_ARTIFACT_PATH_ENV,
  CANDIDATE_ARTIFACT_SHA256_ENV
} from "../../../package/candidate/acceptance-input.ts";
import {
  EXTERNAL_CONSUMER_ROOT_ENV,
  parseExternalConsumerMaterialData,
  type ExternalConsumerMaterialData,
  validateExternalConsumerMaterialPhysical
} from "../../../package/candidate/external-consumer/input.ts";
import {
  commandCheck,
  type AfterCommandContext,
  type CheckDependencies,
  type CheckResult
} from "@zxyycom/vibe-check";
import { failedProcessResult, processTranscriptPath } from "./process/transcript.ts";
import type { ProcessInvocation } from "../../../process-execution/command.ts";
import {
  parseProjectGatePreparedCandidateData,
  type ProjectGatePreparedCandidateData
} from "./prepared-candidate.ts";

const providerAdapterPath = fileURLToPath(
  new URL("../../../package/candidate/external-consumer/provider.ts", import.meta.url)
);
const repositoryRoot = resolve(fileURLToPath(new URL("../../../..", import.meta.url)));
const externalConsumerOutputByteLimit = 64 * 1024;
const externalConsumerProviderInvocation = Object.freeze({
  args: Object.freeze([providerAdapterPath]),
  command: process.execPath,
  cwd: repositoryRoot
});

/** Owns the one temporary root for a bound Gate Run, including cancelled child setup. */
export interface ExternalConsumerMaterialLease {
  cleanup(): void;
  providerRoot(): string;
}

/** Creates a lazily allocated root which the bound Gate Run always removes in `finally`. */
export function createExternalConsumerMaterialLease(): ExternalConsumerMaterialLease {
  let root: string | undefined;
  return Object.freeze({
    cleanup(): void {
      if (root === undefined) return;
      const owned = root;
      root = undefined;
      rmSync(owned, { force: true, recursive: true });
    },
    providerRoot(): string {
      root ??= mkdtempSync(join(tmpdir(), "vibe-check-external-consumer-"));
      return root;
    }
  });
}

/** Runs the cancellable external installation adapter and publishes its closed typed result. */
export function createExternalConsumerMaterialCheck(
  input: Readonly<{
    readonly lease: ExternalConsumerMaterialLease;
    readonly preparedCandidateCheckId: string;
    readonly timeoutMs: number;
  }>,
  invocation: Pick<
    ProcessInvocation,
    "args" | "command" | "cwd"
  > = externalConsumerProviderInvocation
) {
  return commandCheck({
    arguments: invocation.args,
    checkId: "prepared-external-package-consumer",
    dependsOn: [input.preparedCandidateCheckId],
    displayName: "Prepared external package consumer",
    executable: invocation.command,
    output: { mode: "transcript" },
    outputByteLimit: externalConsumerOutputByteLimit,
    resolveEnvironment: ({ dependencies }) =>
      resolveExternalConsumerProviderEnvironment({
        dependencies,
        lease: input.lease,
        preparedCandidateCheckId: input.preparedCandidateCheckId
      }),
    timeoutMs: input.timeoutMs,
    workingDirectory: invocation.cwd,
    afterCommand: {
      execute: (context) =>
        settleExternalConsumerProviderCommand({
          context,
          lease: input.lease,
          preparedCandidateCheckId: input.preparedCandidateCheckId
        }),
      parseData: parseExternalConsumerMaterialData
    }
  });
}

/** Binds child stdout to this exact prepared artifact and this invocation's owned root. */
export function validateExternalConsumerProviderProvenance(
  data: ExternalConsumerMaterialData,
  candidate: ProjectGatePreparedCandidateData,
  providerRoot: string
): ExternalConsumerMaterialData {
  if (
    data.artifactPath !== candidate.artifactPath ||
    data.sha256 !== candidate.sha256 ||
    data.consumerDirectory !== join(providerRoot, "consumer")
  ) {
    throw new TypeError("external consumer provider output does not match its owned provenance");
  }
  return data;
}

/** Resolves the provider's inherited host environment and exact candidate-owned overrides. */
export function resolveExternalConsumerProviderEnvironment(
  input: Readonly<{
    readonly dependencies: CheckDependencies;
    readonly lease: ExternalConsumerMaterialLease;
    readonly preparedCandidateCheckId: string;
  }>
) {
  return Object.freeze({
    mode: "inherit" as const,
    overrides: providerEnvironment(
      preparedCandidateFromDependencies(input.dependencies, input.preparedCandidateCheckId),
      input.lease
    )
  });
}

/** Settles provider output only after Product has finalized the command transcript. */
export function settleExternalConsumerProviderCommand(
  input: Readonly<{
    readonly context: AfterCommandContext;
    readonly lease: ExternalConsumerMaterialLease;
    readonly preparedCandidateCheckId: string;
  }>
): CheckResult<ExternalConsumerMaterialData> {
  const { context, lease, preparedCandidateCheckId } = input;
  if (context.artifactDirectory === null)
    return unavailableExternalConsumerMaterial("command-transcript-unavailable");
  if (context.command.exitCode !== 0) return unavailableExternalConsumerCommand(context);
  try {
    const data = parseExternalConsumerMaterialData(JSON.parse(context.command.stdout));
    validateExternalConsumerMaterialPhysical(data);
    return Object.freeze({
      status: "passed",
      data: validateExternalConsumerProviderProvenance(
        data,
        preparedCandidateFromDependencies(context.dependencies, preparedCandidateCheckId),
        lease.providerRoot()
      )
    });
  } catch {
    return unavailableExternalConsumerMaterial("process-output-invalid");
  }
}

function preparedCandidateFromDependencies(
  dependencies: CheckDependencies,
  checkId: string
): ProjectGatePreparedCandidateData {
  const read = dependencies.get(checkId);
  if (!read.ok || read.status !== "passed") {
    throw new TypeError("prepared candidate dependency is unavailable");
  }
  return parseProjectGatePreparedCandidateData(read.data);
}

function providerEnvironment(
  candidate: ProjectGatePreparedCandidateData,
  lease: ExternalConsumerMaterialLease
): Readonly<Record<string, string>> {
  return Object.freeze({
    [CANDIDATE_ARTIFACT_PATH_ENV]: candidate.artifactPath,
    [CANDIDATE_ARTIFACT_SHA256_ENV]: candidate.sha256,
    [EXTERNAL_CONSUMER_ROOT_ENV]: lease.providerRoot()
  });
}

function unavailableExternalConsumerMaterial(
  code:
    | "command-transcript-unavailable"
    | "external-consumer-provider-failed"
    | "process-output-invalid"
): CheckResult<ExternalConsumerMaterialData> {
  return Object.freeze({ status: "unavailable", reason: Object.freeze({ code }) });
}

/** Retains generic failure evidence without claiming typed provider material after a nonzero command. */
function unavailableExternalConsumerCommand(
  context: AfterCommandContext
): CheckResult<ExternalConsumerMaterialData> {
  if (context.artifactDirectory === null)
    return unavailableExternalConsumerMaterial("command-transcript-unavailable");
  const failed = failedProcessResult(context, {
    command: context.options.executable,
    exitCode: context.command.exitCode,
    logPath: processTranscriptPath(context.artifactDirectory),
    signal: null
  });
  return Object.freeze({
    status: "unavailable",
    reason: Object.freeze({ code: "external-consumer-provider-failed" }),
    ...(failed.messages === undefined ? {} : { messages: failed.messages })
  });
}

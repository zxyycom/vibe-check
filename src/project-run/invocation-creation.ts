import { randomUUID } from "node:crypto";

import {
  createDeclarativeFingerprint,
  type DefinitionWarning,
  type NormalizedProjectDefinition,
  type ProjectDefinition
} from "../project-definition/project-definition.ts";
import type { RunControls } from "./controls/contract.ts";
import {
  createDiagnosticLogger,
  createDiagnosticLoggingRouter
} from "./diagnostic-logging/logger.ts";
import type { Invocation, RunInvocationDependencies } from "./invocation.ts";
import { createOutputStatuses } from "./output-status.ts";
import { effectiveOutputs } from "./output-configuration.ts";
import { resolveInvocationPaths } from "./invocation-paths.ts";
import { createProgressRendering } from "./progress-rendering/presentation.ts";

const SYSTEM_MONOTONIC_CLOCK: Invocation["clock"] = Object.freeze({
  now: () => performance.now()
});

export interface InvocationCreationInput {
  readonly controls: RunControls;
  readonly definition: ProjectDefinition;
  readonly definitionWarnings: readonly DefinitionWarning[];
  readonly dependencies: RunInvocationDependencies;
  readonly normalized: NormalizedProjectDefinition;
}

/** Creates immutable invocation-owned output state before any planning or execution work. */
export function createInvocation(input: InvocationCreationInput): Invocation {
  const outputConfiguration = effectiveOutputs(input.definition, input.controls);
  const clock = input.dependencies.clock ?? SYSTEM_MONOTONIC_CLOCK;
  const diagnosticLoggingEnabled = outputConfiguration.diagnosticLogging.enabled;
  const learnedAdmissionEnabled =
    input.normalized.scheduler.admissionPolicy.kind === "learned-critical-path";
  const startedAtUtc = captureOutputCreationTimestamp(outputConfiguration, input.dependencies);
  const identity = createInvocationIdentity();
  const paths = resolveInvocationPaths({
    checkArtifactBaseDirectory: input.controls.checkArtifactBaseDirectory,
    checkIds: input.normalized.checks.map((check) => check.definition.checkId),
    diagnosticLogSuffix: diagnosticLoggingEnabled
      ? diagnosticLogSuffix(requireStartedAtUtc(startedAtUtc), identity.uuid)
      : undefined,
    learnedAdmissionEnabled,
    outputConfiguration,
    progressLogFile: input.controls.progressLogFile,
    projectRoot: input.controls.projectRoot ?? process.cwd()
  });
  const outputs = createOutputStatuses(
    outputConfiguration,
    paths.diagnosticLoggingReadbackFiles,
    learnedAdmissionEnabled,
    input.normalized.scheduler.measurementHooks.length > 0
  );
  const diagnosticLogging = createDiagnosticLoggingRouter({
    clock,
    coreFile: paths.diagnosticLoggingFiles.core,
    factory: input.dependencies.diagnosticLoggerFactory ?? createDiagnosticLogger,
    invocationId: identity.id,
    learnedAdmissionFile: paths.diagnosticLoggingFiles.learnedAdmission,
    schedulerFile: paths.diagnosticLoggingFiles.scheduler
  });

  return Object.freeze({
    admissionStrategyProviderFactory: input.dependencies.admissionStrategyProviderFactory,
    clock,
    controls: input.controls,
    declarativeFingerprint: createDeclarativeFingerprint(input.normalized.declarative),
    definition: input.definition,
    definitionWarnings: Object.freeze([...input.definitionWarnings]),
    diagnosticLogging,
    diagnosticLoggingEnabled,
    outputConfiguration,
    outputs,
    invocationId: identity.id,
    paths,
    normalized: input.normalized,
    progressRendering: createProgressRendering(outputConfiguration.progressRendering, outputs, {
      clock,
      refreshScheduler: input.dependencies.progressRefreshScheduler,
      writerFactory: input.dependencies.progressWriterFactory,
      file: paths.progressLogFile
    }),
    startedAtUtc
  });
}

function captureOutputCreationTimestamp(
  outputConfiguration: ProjectDefinition["outputs"],
  dependencies: RunInvocationDependencies
): string | null {
  if (
    !outputConfiguration.diagnosticLogging.enabled &&
    !outputConfiguration.machinePublication.enabled
  )
    return null;
  return (dependencies.wallClock?.now() ?? new Date()).toISOString();
}

function createInvocationIdentity(): Readonly<{
  readonly id: string;
  readonly uuid: string;
}> {
  const uuid = randomUUID();
  return Object.freeze({ id: `invocation/v1:${uuid}`, uuid });
}

function diagnosticLogSuffix(startedAtUtc: string, invocationUuid: string): string {
  const compactUtc = startedAtUtc.replaceAll("-", "").replaceAll(":", "");
  return `${compactUtc}-${invocationUuid}`;
}

function requireStartedAtUtc(startedAtUtc: string | null): string {
  if (startedAtUtc === null) throw new Error("Enabled output requires an invocation timestamp");
  return startedAtUtc;
}

import { randomUUID } from "node:crypto";
import { relative, resolve } from "node:path";

import {
  createDeclarativeFingerprint,
  type DefinitionWarning,
  type NormalizedProjectDefinition,
  type ProjectDefinition
} from "../project-definition/project-definition.ts";
import type { RunControls } from "./controls/contract.ts";
import {
  createDiagnosticLogger,
  type DiagnosticLogger,
  type DiagnosticLoggerFactory,
  type DiagnosticObservation
} from "./diagnostic-logging/logger.ts";
import type { Invocation, RunInvocationDependencies } from "./invocation.ts";
import { createOutputStatuses } from "./output-status.ts";
import { effectiveOutputs } from "./output-configuration.ts";
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
  const projectRoot = resolve(input.controls.projectRoot ?? process.cwd());
  const startedAtUtc = captureOutputCreationTimestamp(outputConfiguration, input.dependencies);
  const identity = createInvocationIdentity();
  const diagnosticLoggingFile = resolveDiagnosticLoggingFile({
    identity,
    outputConfiguration,
    projectRoot,
    startedAtUtc
  });
  const outputs = createOutputStatuses(outputConfiguration, diagnosticLoggingFile);
  const diagnosticLogger = createDiagnosticLoggerSafely(
    input.dependencies.diagnosticLoggerFactory ?? createDiagnosticLogger,
    {
      clock,
      enabled: outputConfiguration.diagnosticLogging.enabled,
      file: diagnosticLoggingFile === null ? null : resolve(projectRoot, diagnosticLoggingFile)
    }
  );

  return Object.freeze({
    clock,
    controls: input.controls,
    declarativeFingerprint: createDeclarativeFingerprint(input.normalized.declarative),
    definition: input.definition,
    definitionWarnings: Object.freeze([...input.definitionWarnings]),
    diagnosticLogger,
    outputConfiguration,
    outputs,
    invocationId: identity.id,
    normalized: input.normalized,
    progressRendering: createProgressRendering(outputConfiguration.progressRendering, outputs, {
      clock,
      refreshScheduler: input.dependencies.progressRefreshScheduler,
      writerFactory: input.dependencies.progressWriterFactory
    }),
    projectRoot,
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

function createInvocationIdentity(): Readonly<{ readonly id: string; readonly uuid: string }> {
  const uuid = randomUUID();
  return Object.freeze({ id: `invocation/v1:${uuid}`, uuid });
}

function resolveDiagnosticLoggingFile(
  input: Readonly<{
    readonly identity: Readonly<{ readonly uuid: string }>;
    readonly outputConfiguration: ProjectDefinition["outputs"];
    readonly projectRoot: string;
    readonly startedAtUtc: string | null;
  }>
): string | null {
  if (!input.outputConfiguration.diagnosticLogging.enabled) return null;
  return relative(
    input.projectRoot,
    resolve(
      input.projectRoot,
      input.outputConfiguration.diagnosticLogging.directory,
      diagnosticLogFileName(requireStartedAtUtc(input.startedAtUtc), input.identity.uuid)
    )
  );
}

function createDiagnosticLoggerSafely(
  factory: DiagnosticLoggerFactory,
  input: Parameters<DiagnosticLoggerFactory>[0]
): DiagnosticLogger {
  let delegate: DiagnosticLogger;
  try {
    delegate = factory(input);
  } catch {
    return failedDiagnosticLogger();
  }
  let failed = false;
  return Object.freeze({
    close: () => {
      try {
        const status = delegate.close();
        return failed ? "failed" : status;
      } catch {
        return "failed";
      }
    },
    observe: (observation: DiagnosticObservation) => {
      if (failed) return;
      try {
        delegate.observe(observation);
      } catch {
        failed = true;
      }
    }
  });
}

function failedDiagnosticLogger(): DiagnosticLogger {
  return Object.freeze({
    close: () => "failed" as const,
    observe: () => undefined
  });
}

function diagnosticLogFileName(startedAtUtc: string, invocationUuid: string): string {
  const compactUtc = startedAtUtc.replaceAll("-", "").replaceAll(":", "");
  return `run-${compactUtc}-${invocationUuid}.log`;
}

function requireStartedAtUtc(startedAtUtc: string | null): string {
  if (startedAtUtc === null) throw new Error("Enabled output requires an invocation timestamp");
  return startedAtUtc;
}

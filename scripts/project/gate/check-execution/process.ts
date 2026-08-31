import { errorMessage } from "../../../error-message.ts";
import { writeTextFile } from "../../../repository-files/files.ts";
import { runProcess, type ProcessResult } from "../../../process-execution/execution.ts";
import { isNonArrayRecord } from "../../../value-guards.ts";
import {
  defineCheck,
  type Check,
  type CheckExecutionContext,
  type CheckPreflight,
  type CheckResult
} from "@zxyycom/vibe-check";

import {
  failedProcessResult,
  formatTimeout,
  processTranscriptPath,
  processTranscriptReference,
  writeProcessStartupTranscript,
  writeProcessTranscript
} from "./transcript.ts";
import { validProcessCheckDescriptor, validProcessEnvironment } from "./process-descriptor.ts";

const UNAVAILABLE_REASON_CODE = Object.freeze({
  dependencyDataInvalid: "dependency-data-invalid",
  dependencyFailed: "dependency-failed",
  dependencyUnavailable: "dependency-unavailable",
  executionCancelled: "execution-cancelled",
  exitUnavailable: "exit-unavailable",
  processTimeout: "process-timeout",
  processOutputInvalid: "process-output-invalid",
  processUnavailable: "process-unavailable",
  transcriptUnavailable: "transcript-unavailable"
} as const);

type UnavailableReasonCode = (typeof UNAVAILABLE_REASON_CODE)[keyof typeof UNAVAILABLE_REASON_CODE];

export interface ProcessCheckDependencies {
  readonly runProcess: typeof runProcess;
  readonly writeTextFile: typeof writeTextFile;
}

export interface ProcessCheckDataDependency<Data extends object> {
  readonly checkId: string;
  readonly environment: (data: Data) => Readonly<Record<string, string>>;
  readonly parseData: (data: unknown) => Data;
}

/** Parses one successful child process output into provider-owned final data. */
export interface ProcessCheckSuccessData<Data extends object, DependencyData extends object> {
  readonly fromStdout: (stdout: string) => unknown;
  readonly parseData: (data: unknown) => Data;
  readonly validateDependencyData?: (data: Data, dependency: DependencyData) => Data;
}

/** One Check's actual external command boundary. */
export interface ProcessCheckDescriptor {
  readonly args: readonly string[];
  readonly checkId: string;
  readonly command: string;
  readonly cwd?: string;
  readonly displayName: string;
  readonly environment?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

export type { ProcessTranscriptStep } from "./transcript.ts";
export {
  failedProcessResult,
  processTranscriptReference,
  writeProcessTranscript
} from "./transcript.ts";

const defaultProcessCheckDependencies: ProcessCheckDependencies = Object.freeze({
  runProcess,
  writeTextFile
});

const prepareProcessDescriptor: CheckPreflight<ProcessCheckDescriptor> = (options) =>
  validProcessCheckDescriptor(options)
    ? { status: "success", preparedOptions: options }
    : { status: "failure", action: "block", reason: { code: "invalid-options" } };

/** Creates an ordinary Check that owns an external process and its transcript. */
export function createProcessCheck(
  definition: ProcessCheckDescriptor,
  invocationLogDirectory: string,
  dependencies: ProcessCheckDependencies = defaultProcessCheckDependencies
) {
  return defineCheck<string, ProcessCheckDescriptor>({
    checkId: definition.checkId,
    displayName: definition.displayName,
    options: definition,
    preflight: prepareProcessDescriptor,
    execution: async (context): Promise<CheckResult> =>
      executeProcessCheck(context, invocationLogDirectory, dependencies)
  });
}

/** Runs one process only after restoring typed data from one direct provider dependency. */
export function createProcessCheckWithDataDependency<Data extends object>(
  definition: ProcessCheckDescriptor,
  invocationLogDirectory: string,
  dependency: ProcessCheckDataDependency<Data>,
  dependencies: ProcessCheckDependencies = defaultProcessCheckDependencies
): Check {
  const check = {
    checkId: definition.checkId,
    dependsOn: [dependency.checkId],
    displayName: definition.displayName,
    options: definition,
    preflight: prepareProcessDescriptor,
    execution: async (
      context: CheckExecutionContext<ProcessCheckDescriptor>
    ): Promise<CheckResult> => {
      const resolved = resolveDependencyProcessOptions(context, dependency);
      if (resolved.kind === "unavailable") return unavailable(resolved.code);
      return executeProcessCheck(
        Object.freeze({ ...context, options: resolved.options }),
        invocationLogDirectory,
        dependencies
      );
    }
  } as const;
  return defineCheck<string, ProcessCheckDescriptor>(check);
}

/** Creates a dependency-backed process provider with closed typed stdout data. */
export function createProcessCheckWithDataDependencyAndSuccessData<
  DependencyData extends object,
  SuccessData extends object
>(
  definition: ProcessCheckDescriptor,
  invocationLogDirectory: string,
  dependency: ProcessCheckDataDependency<DependencyData>,
  successData: ProcessCheckSuccessData<SuccessData, DependencyData>,
  dependencies: ProcessCheckDependencies = defaultProcessCheckDependencies
): Check {
  const check = {
    checkId: definition.checkId,
    dependsOn: [dependency.checkId],
    displayName: definition.displayName,
    options: definition,
    parseData: successData.parseData,
    preflight: prepareProcessDescriptor,
    execution: async (
      context: CheckExecutionContext<ProcessCheckDescriptor>
    ): Promise<CheckResult<SuccessData>> => {
      const resolved = resolveDependencyProcessOptions(context, dependency);
      if (resolved.kind === "unavailable") return unavailable(resolved.code);
      return executeProcessCheck(
        Object.freeze({ ...context, options: resolved.options }),
        invocationLogDirectory,
        dependencies,
        (stdout) => {
          const data = successData.parseData(successData.fromStdout(stdout));
          return successData.validateDependencyData?.(data, resolved.data) ?? data;
        }
      );
    }
  } as const;
  return defineCheck(check);
}

type DependencyProcessResolution<Data extends object> =
  | Readonly<{
      readonly data: Data;
      readonly kind: "resolved";
      readonly options: ProcessCheckDescriptor;
    }>
  | Readonly<{ readonly code: UnavailableReasonCode; readonly kind: "unavailable" }>;

/** Resolves one direct dependency into collision-free process options or a closed unavailable fact. */
function resolveDependencyProcessOptions<Data extends object>(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  dependency: ProcessCheckDataDependency<Data>
): DependencyProcessResolution<Data> {
  const read = context.dependencies.get(dependency.checkId);
  if (!read.ok)
    return Object.freeze({
      code: UNAVAILABLE_REASON_CODE.dependencyUnavailable,
      kind: "unavailable"
    });
  if (read.status !== "passed")
    return Object.freeze({ code: UNAVAILABLE_REASON_CODE.dependencyFailed, kind: "unavailable" });
  try {
    const data = dependency.parseData(read.data);
    const environment = dependency.environment(data);
    if (
      !isNonArrayRecord(environment) ||
      !validProcessEnvironment(environment) ||
      Object.keys(environment).some((name) =>
        Object.hasOwn(context.options.environment ?? {}, name)
      )
    ) {
      return Object.freeze({
        code: UNAVAILABLE_REASON_CODE.dependencyDataInvalid,
        kind: "unavailable"
      });
    }
    return Object.freeze({
      data,
      kind: "resolved",
      options: Object.freeze({
        ...context.options,
        environment: Object.freeze({ ...(context.options.environment ?? {}), ...environment })
      })
    });
  } catch {
    return Object.freeze({
      code: UNAVAILABLE_REASON_CODE.dependencyDataInvalid,
      kind: "unavailable"
    });
  }
}

function executeProcessCheck(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  invocationLogDirectory: string,
  dependencies: ProcessCheckDependencies
): Promise<CheckResult>;
function executeProcessCheck<Data extends object>(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  invocationLogDirectory: string,
  dependencies: ProcessCheckDependencies,
  successData: (stdout: string) => Data
): Promise<CheckResult<Data>>;
async function executeProcessCheck(
  context: CheckExecutionContext<ProcessCheckDescriptor>,
  invocationLogDirectory: string,
  dependencies: ProcessCheckDependencies,
  successData?: (stdout: string) => object
): Promise<CheckResult> {
  if (context.signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);

  const logPath = processTranscriptPath(invocationLogDirectory, context.options.checkId);
  try {
    writeProcessStartupTranscript({
      definition: context.options,
      invocationLogDirectory,
      writeTextFile: dependencies.writeTextFile
    });
  } catch {
    return unavailable(UNAVAILABLE_REASON_CODE.transcriptUnavailable);
  }

  let result: ProcessResult;
  try {
    result = await dependencies.runProcess({
      args: context.options.args,
      command: context.options.command,
      cwd: context.options.cwd ?? context.project.root,
      env: { ...process.env, ...context.options.environment },
      label: context.options.checkId,
      cancelSignal: context.signal,
      timeout: context.options.timeoutMs
    });
  } catch (error: unknown) {
    result = unavailableProcessResult(error);
  }

  try {
    writeProcessTranscript({
      checkId: context.options.checkId,
      invocationLogDirectory,
      steps: [{ definition: context.options, label: "command", result }],
      writeTextFile: dependencies.writeTextFile
    });
  } catch {
    return unavailable(UNAVAILABLE_REASON_CODE.transcriptUnavailable);
  }

  if (context.signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);
  if (result.timedOut === true) {
    const timeoutMs = context.options.timeoutMs;
    if (timeoutMs === undefined) return unavailable(UNAVAILABLE_REASON_CODE.processUnavailable);
    return Object.freeze({
      status: "unavailable",
      reason: { code: UNAVAILABLE_REASON_CODE.processTimeout },
      messages: Object.freeze([
        Object.freeze({
          level: "error",
          code: "command-timeout",
          message: `Command exceeded its ${formatTimeout(timeoutMs)} timeout; transcript: ${processTranscriptReference(logPath)}.`
        })
      ])
    });
  }
  if (result.error !== undefined) return unavailable(UNAVAILABLE_REASON_CODE.processUnavailable);
  const exitCode = result.status;
  if (exitCode === null) return unavailable(UNAVAILABLE_REASON_CODE.exitUnavailable);
  if (exitCode === 0) {
    if (successData === undefined)
      return Object.freeze({ status: "passed", data: Object.freeze({ exitCode }) });
    try {
      return Object.freeze({ status: "passed", data: successData(result.stdout) });
    } catch {
      return unavailable(UNAVAILABLE_REASON_CODE.processOutputInvalid);
    }
  }

  return failedProcessResult(context, {
    command: context.options.command,
    exitCode,
    logPath,
    signal: result.signal
  });
}

function unavailableProcessResult(error: unknown): ProcessResult {
  return {
    error: error instanceof Error ? error : new Error(errorMessage(error)),
    signal: null,
    status: null,
    stderr: "",
    stdout: ""
  };
}

function unavailable<Data extends object = object>(code: UnavailableReasonCode): CheckResult<Data> {
  return Object.freeze({ status: "unavailable", reason: { code } });
}

import { writeTextFile } from "../../../../repository-files/files.ts";
import { runProcess } from "../../../../process-execution/execution.ts";
import { isNonArrayRecord } from "../../../../value-guards.ts";
import {
  defineCheck,
  type Check,
  type CheckExecutionContext,
  type CheckPreflight,
  type CheckResult
} from "@zxyycom/vibe-check";

import { validProcessCheckDescriptor, validProcessEnvironment } from "./process-descriptor.ts";
import {
  executeProcessCheck,
  PROCESS_CHECK_UNAVAILABLE_REASON_CODE as UNAVAILABLE_REASON_CODE,
  unavailableProcessCheckResult,
  type ProcessCheckUnavailableReasonCode
} from "./process-execution.ts";

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
    : {
        status: "failure",
        action: "block",
        reason: { code: "invalid-options" }
      };

/** Creates an ordinary Check that owns an external process and its transcript. */
export function createProcessCheck(
  definition: ProcessCheckDescriptor,
  dependencies: ProcessCheckDependencies = defaultProcessCheckDependencies
) {
  return defineCheck<string, ProcessCheckDescriptor>({
    checkId: definition.checkId,
    displayName: definition.displayName,
    options: definition,
    preflight: prepareProcessDescriptor,
    execution: async (context): Promise<CheckResult> => executeProcessCheck(context, dependencies)
  });
}

/** Runs one process only after restoring typed data from one direct provider dependency. */
export function createProcessCheckWithDataDependency<Data extends object>(
  definition: ProcessCheckDescriptor,
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
      if (resolved.kind === "unavailable") return unavailableProcessCheckResult(resolved.code);
      return executeProcessCheck(
        Object.freeze({ ...context, options: resolved.options }),
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
      if (resolved.kind === "unavailable") return unavailableProcessCheckResult(resolved.code);
      return executeProcessCheck(
        Object.freeze({ ...context, options: resolved.options }),
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
  | Readonly<{
      readonly code: ProcessCheckUnavailableReasonCode;
      readonly kind: "unavailable";
    }>;

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
    return Object.freeze({
      code: UNAVAILABLE_REASON_CODE.dependencyFailed,
      kind: "unavailable"
    });
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
        environment: Object.freeze({
          ...(context.options.environment ?? {}),
          ...environment
        })
      })
    });
  } catch {
    return Object.freeze({
      code: UNAVAILABLE_REASON_CODE.dependencyDataInvalid,
      kind: "unavailable"
    });
  }
}

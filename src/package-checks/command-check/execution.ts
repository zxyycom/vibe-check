import { isAbsolute, resolve } from "node:path";

import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { runProcess } from "../host-environment/process.ts";
import { isValidResolvedCommandCheckOptions, resolveCommandCheckEnvironment } from "./options.ts";
import { closedTranscript, runningTranscript, writeCommandTranscript } from "./transcript.ts";
import type {
  AfterCommand,
  CommandCheckFinalData,
  CommandEnvironmentResolver,
  CommandCheckUnavailableReasonCode,
  ResolvedCommandCheckOptions
} from "./contract.ts";

type CommandProcessResult = Awaited<ReturnType<typeof runProcess>> &
  Readonly<{ readonly isCanceled?: true; readonly isMaxBuffer?: true; readonly timedOut?: true }>;

/** Executes one validated no-shell command and releases all child material after optional transcript persistence. */
export async function executeCommandCheck(
  context: CheckExecutionContext<ResolvedCommandCheckOptions>,
  executionExtensions: Readonly<{
    readonly afterCommand?: AfterCommand | undefined;
    readonly resolveEnvironment?: CommandEnvironmentResolver | undefined;
  }> = {}
): Promise<CheckResult> {
  if (!isValidResolvedCommandCheckOptions(context.options)) return unavailable("invalid-options");

  const environment = await resolveExecutionEnvironment(
    context,
    executionExtensions.resolveEnvironment
  );
  if (environment === undefined) return unavailable("command-environment-resolution-failed");

  return executeResolvedCommand(context, environment, executionExtensions.afterCommand);
}

/** Runs one resolved command, preserving requested transcripts before caller-owned settlement. */
async function executeResolvedCommand(
  context: CheckExecutionContext<ResolvedCommandCheckOptions>,
  environment: ResolvedCommandCheckOptions["environment"],
  afterCommand: AfterCommand | undefined
): Promise<CheckResult> {
  const { options } = context;
  if (!(await writeRunningCommandTranscript(context.artifactDirectory, options.output.mode))) {
    return unavailable("command-transcript-unavailable");
  }

  const result = await runProcess({
    args: options.arguments,
    cancelSignal: context.signal,
    command: options.executable,
    cwd: resolveWorkingDirectory(options.workingDirectory, context.project.root),
    env: executionEnvironment(environment),
    extendEnv: false,
    label: "command Check",
    maxBuffer: options.outputByteLimit,
    timeout: options.timeoutMs
  });
  const terminal = terminalResult(result);
  if (
    !(await writeClosedCommandTranscript(
      context.artifactDirectory,
      options.output.mode,
      terminal.status,
      result
    ))
  ) {
    return unavailable("command-transcript-unavailable");
  }
  return settleCommandResult(context, result, terminal.result, afterCommand);
}

/** Writes the running marker only where output policy and artifact capability both allow it. */
async function writeRunningCommandTranscript(
  artifactDirectory: string | null,
  outputMode: ResolvedCommandCheckOptions["output"]["mode"]
): Promise<boolean> {
  if (outputMode === "discard") return true;
  return (
    artifactDirectory !== null && writeCommandTranscript(artifactDirectory, runningTranscript())
  );
}

/** Replaces the running marker with final child material before any caller-owned callback observes it. */
async function writeClosedCommandTranscript(
  artifactDirectory: string | null,
  outputMode: ResolvedCommandCheckOptions["output"]["mode"],
  status: "passed" | "failed" | "unavailable",
  result: CommandProcessResult
): Promise<boolean> {
  if (outputMode === "discard") return true;
  return (
    artifactDirectory !== null &&
    writeCommandTranscript(
      artifactDirectory,
      closedTranscript({ status, stderr: result.stderr, stdout: result.stdout })
    )
  );
}

/** Lets the caller settle only complete numeric exits; all other terminal causes remain Product-owned. */
function settleCommandResult(
  context: CheckExecutionContext<ResolvedCommandCheckOptions>,
  result: CommandProcessResult,
  defaultResult: CheckResult<CommandCheckFinalData>,
  afterCommand: AfterCommand | undefined
): CheckResult | Promise<CheckResult> {
  if (afterCommand === undefined || !isCompleteCommandResult(result)) return defaultResult;
  return afterCommand.execute(
    Object.freeze({
      ...context,
      command: Object.freeze({
        exitCode: result.status,
        stderr: result.stderr,
        stdout: result.stdout
      })
    })
  );
}

async function resolveExecutionEnvironment(
  context: CheckExecutionContext<ResolvedCommandCheckOptions>,
  resolver: CommandEnvironmentResolver | undefined
): Promise<ResolvedCommandCheckOptions["environment"] | undefined> {
  if (resolver === undefined) return context.options.environment;
  try {
    const environment = await resolver(
      Object.freeze({
        dependencies: context.dependencies,
        options: context.options,
        project: context.project,
        signal: context.signal
      })
    );
    return resolveCommandCheckEnvironment(environment);
  } catch {
    return undefined;
  }
}

function resolveWorkingDirectory(workingDirectory: string | null, projectRoot: string): string {
  if (workingDirectory === null) return projectRoot;
  if (isAbsolute(workingDirectory)) return workingDirectory;
  return resolve(projectRoot, workingDirectory);
}

function executionEnvironment(
  environment: ResolvedCommandCheckOptions["environment"]
): NodeJS.ProcessEnv {
  if (environment.mode === "exact") return { ...environment.variables };
  const inherited: NodeJS.ProcessEnv = { ...process.env };
  for (const [name, value] of Object.entries(environment.overrides)) {
    if (value === null) delete inherited[name];
    else inherited[name] = value;
  }
  return inherited;
}

function isCompleteCommandResult(result: CommandProcessResult): result is CommandProcessResult & {
  readonly status: number;
} {
  return (
    typeof result.status === "number" &&
    result.isCanceled !== true &&
    result.isMaxBuffer !== true &&
    result.timedOut !== true &&
    result.signal === null
  );
}

function terminalResult(result: CommandProcessResult): Readonly<{
  readonly result: CheckResult<CommandCheckFinalData>;
  readonly status: "passed" | "failed" | "unavailable";
}> {
  if (typeof result.status === "number" && result.status !== 0) {
    return completedTerminal("failed", result.status);
  }
  if (result.isCanceled === true) return unavailableTerminal("command-terminated-by-signal");
  if (result.timedOut === true) return unavailableTerminal("command-timeout");
  if (result.isMaxBuffer === true) return unavailableTerminal("command-output-limit-exceeded");
  if (result.signal !== null) return unavailableTerminal("command-terminated-by-signal");
  if (result.status === 0) {
    return completedTerminal("passed", 0);
  }
  return unavailableTerminal("command-start-failed");
}

function completedTerminal(
  status: "passed" | "failed",
  exitCode: number
): Readonly<{
  readonly result: CheckResult<CommandCheckFinalData>;
  readonly status: "passed" | "failed";
}> {
  const result: CheckResult<CommandCheckFinalData> =
    status === "passed"
      ? Object.freeze({ status: "passed" as const, data: Object.freeze({ exitCode }) })
      : Object.freeze({ status: "failed" as const, data: Object.freeze({ exitCode }) });
  return Object.freeze({ result, status });
}

function unavailableTerminal(code: CommandCheckUnavailableReasonCode): Readonly<{
  readonly result: CheckResult<CommandCheckFinalData>;
  readonly status: "unavailable";
}> {
  return Object.freeze({ result: unavailable(code), status: "unavailable" });
}

function unavailable(code: CommandCheckUnavailableReasonCode): CheckResult<CommandCheckFinalData> {
  return Object.freeze({ status: "unavailable", reason: Object.freeze({ code }) });
}

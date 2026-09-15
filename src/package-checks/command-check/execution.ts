import { isAbsolute, resolve } from "node:path";

import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { runProcess } from "../host-environment/process.ts";
import { isValidResolvedCommandCheckOptions } from "./options.ts";
import { closedTranscript, runningTranscript, writeCommandTranscript } from "./transcript.ts";
import type {
  CommandCheckFinalData,
  CommandCheckUnavailableReasonCode,
  ResolvedCommandCheckOptions
} from "./contract.ts";

type CommandProcessResult = Awaited<ReturnType<typeof runProcess>> &
  Readonly<{ readonly isCanceled?: true; readonly isMaxBuffer?: true; readonly timedOut?: true }>;

/** Executes one validated no-shell command and releases all child material after optional transcript persistence. */
export async function executeCommandCheck(
  context: CheckExecutionContext<ResolvedCommandCheckOptions>
): Promise<CheckResult<CommandCheckFinalData>> {
  if (!isValidResolvedCommandCheckOptions(context.options)) return unavailable("invalid-options");

  const options = context.options;
  if (options.output.mode === "transcript") {
    if (
      context.artifactDirectory === null ||
      !(await writeCommandTranscript(context.artifactDirectory, runningTranscript()))
    ) {
      return unavailable("command-transcript-unavailable");
    }
  }

  const result = await runProcess({
    args: options.arguments,
    cancelSignal: context.signal,
    command: options.executable,
    cwd: resolveWorkingDirectory(options.workingDirectory, context.project.root),
    env: executionEnvironment(options.environment),
    extendEnv: false,
    label: "command Check",
    maxBuffer: options.outputByteLimit,
    timeout: options.timeoutMs
  });
  const terminal = terminalResult(result);
  if (
    options.output.mode === "transcript" &&
    (context.artifactDirectory === null ||
      !(await writeCommandTranscript(
        context.artifactDirectory,
        closedTranscript({ status: terminal.status, stderr: result.stderr, stdout: result.stdout })
      )))
  ) {
    return unavailable("command-transcript-unavailable");
  }
  return terminal.result;
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

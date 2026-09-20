/** Public consumer source that proves command Check authoring through the installed package root. */
export const COMMAND_CHECK_TYPE_ACCEPTANCE_SOURCE = String.raw`const exactCommandEnvironment: CommandCheckEnvironment = {
  mode: "exact",
  variables: { NODE_NO_WARNINGS: "1" }
};
const discardCommandOutput: CommandCheckOutput = { mode: "discard" };
const commandInput: CommandCheckInput<"isolated-command-check"> = {
  admissionPriority: 1,
  arguments: ["--eval", "process.exit(0)"],
  checkId: "isolated-command-check",
  checks: [directCheck],
  dependsOn: [],
  displayName: "Isolated command Check",
  enabledByFlags: { when: "isolated-command-check" },
  environment: exactCommandEnvironment,
  executable: process.execPath,
  maxParallel: 1,
  mutex: ["isolated-command"],
  observes: [],
  omitQuietPassedRow: true,
  output: discardCommandOutput,
  outputByteLimit: 1024,
  resourceClaims: { process: 1 },
  timeoutMs: 1_000
};
const installedCommandCheck: CommandCheck<"isolated-command-check"> = commandCheck(commandInput);
const installedCommandExecute: (
  context: Parameters<typeof installedCommandCheck.execute>[0]
) => CheckResult<CommandCheckFinalData> | Promise<CheckResult<CommandCheckFinalData>> =
  installedCommandCheck.execute;
const ordinaryAfterCommand = commandCheck({
  ...commandInput,
  checkId: "ordinary-after-command",
  afterCommand: {
    execute: ({ command, records }) => {
      records.report({ id: "ordinary-after-command" }, { stderrLength: command.stderr.length });
      return { status: "passed", data: { stdout: command.stdout } };
    }
  }
});
const ordinaryAfterCommandExecute: (
  context: Parameters<typeof ordinaryAfterCommand.execute>[0]
) => CheckResult<{ readonly stdout: string }> | Promise<CheckResult<{ readonly stdout: string }>> =
  ordinaryAfterCommand.execute;
const typedAfterCommand = commandCheck({
  ...commandInput,
  checkId: "typed-after-command",
  afterCommand: {
    execute: ({ command }) => ({ status: "passed", data: { source: command.stdout } }),
    parseData: (data) => {
      if (typeof data.source !== "string") throw new TypeError("typed command data is invalid");
      return { source: data.source };
    }
  }
});
const typedAfterCommandParser: (data: CanonicalJsonObject) => { readonly source: string } =
  typedAfterCommand.parseData;
// @ts-expect-error static and invocation-time environment policies are mutually exclusive.
commandCheck({
  ...commandInput,
  environment: exactCommandEnvironment,
  resolveEnvironment: () => exactCommandEnvironment
});
commandCheck({
  ...commandInput,
  // @ts-expect-error afterCommand does not permit combining static and invocation-time environments.
  afterCommand: { execute: () => ({ status: "passed", data: { source: "ordinary" } }) },
  environment: exactCommandEnvironment,
  resolveEnvironment: () => exactCommandEnvironment
});
const mismatchedCommandParser = (data: CanonicalJsonObject) => {
  if (typeof data.source !== "string") throw new TypeError("mismatched command data is invalid");
  return { source: data.source };
};
commandCheck({
  ...commandInput,
  // @ts-expect-error typed parser final data must match afterCommand.execute data.
  afterCommand: {
    execute: () => ({ status: "passed", data: { count: 1 } }),
    parseData: mismatchedCommandParser
  }
});
const commandFinalData: CommandCheckFinalData = { exitCode: 0 };
const commandUnavailableReason: CommandCheckUnavailableReasonCode =
  "command-output-limit-exceeded";
void [
  commandCheck,
  commandFinalData,
  commandInput,
  commandUnavailableReason,
  installedCommandCheck,
  installedCommandExecute,
  ordinaryAfterCommand,
  ordinaryAfterCommandExecute,
  typedAfterCommand,
  typedAfterCommandParser
];
`;

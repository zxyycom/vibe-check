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
const commandFinalData: CommandCheckFinalData = { exitCode: 0 };
const commandUnavailableReason: CommandCheckUnavailableReasonCode =
  "command-output-limit-exceeded";
void [
  commandCheck,
  commandFinalData,
  commandInput,
  commandUnavailableReason,
  installedCommandCheck,
  installedCommandExecute
];
`;

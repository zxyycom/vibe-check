import {
  runProcess,
  type ProcessResult
} from "../tools/foundation/src/index.ts";

export function runBunCommand(options: {
  workspaceRoot: string;
  args: string[];
  label: string;
}): Promise<ProcessResult> {
  return runProcess({
    command: "bun",
    args: options.args,
    cwd: options.workspaceRoot,
    label: options.label
  });
}

export function processFailureMessage(
  result: ProcessResult,
  label: string
): string {
  const details = result.stderr.trim() || result.stdout.trim();
  return `${label} failed with status ${String(result.status)}${details ? `: ${details}` : ""}`;
}

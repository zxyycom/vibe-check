import { runProcess, type ProcessResult } from "../tools/foundation/src/index.ts";

export function runBunCommand(options: {
  args: string[];
  cancelSignal?: AbortSignal;
  label: string;
  workspaceRoot: string;
}): Promise<ProcessResult> {
  return runProcess({
    args: options.args,
    cancelSignal: options.cancelSignal,
    command: "bun",
    cwd: options.workspaceRoot,
    label: options.label
  });
}

export function processFailureMessage(result: ProcessResult, label: string): string {
  const details = result.stderr.trim() || result.stdout.trim();
  return `${label} failed with status ${String(result.status)}${details ? `: ${details}` : ""}`;
}

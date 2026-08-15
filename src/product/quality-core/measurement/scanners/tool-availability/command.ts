import { runProcess } from "../../../../foundation/index.ts";

export type ToolCommandResult = Awaited<ReturnType<typeof runToolCommand>>;

export function runToolCommand(
  rootDir: string,
  executable: string,
  args: readonly string[]
) {
  return runProcess({
    args: [...args],
    command: executable,
    cwd: rootDir
  });
}

export function versionOutput(result: ToolCommandResult): string {
  return (result.stdout || "").trim() || (result.stderr || "").trim();
}

export function processFailure(result: ToolCommandResult): string {
  return typeof result.status === "number"
    ? `exit ${result.status}`
    : `signal ${result.signal || "unknown"}`;
}

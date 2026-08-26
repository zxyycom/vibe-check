import { runProcess } from "../../host-environment/process/command.ts";
import type { DuplicateDetectionScannerOptions } from "../options.ts";
import { isMissingExplicitCommand } from "./command-path.ts";
import { isDefaultJscpdCommand, resolveJscpdCommand } from "./default-command.ts";
import { parseJscpdVersionOutput } from "./scanner.ts";

type JscpdAvailability = Readonly<{
  available: boolean;
  error: string | null;
  name: "jscpd";
  reason: "execution-error" | "tool-unavailable" | null;
  source: string;
  version: string | null;
}>;

type ToolCommandResult = Awaited<ReturnType<typeof runProcess>>;

export async function checkJscpd(
  rootDir: string,
  dependency: DuplicateDetectionScannerOptions
): Promise<JscpdAvailability> {
  const resolved = resolveJscpdCommand(dependency);
  if (resolved.kind === "unavailable") {
    return unavailableJscpd(resolved.error, "tool-unavailable", dependency);
  }
  if (isMissingExplicitCommand(resolved.command.executable)) {
    return unavailableJscpd("jscpd dependency binary unavailable", "tool-unavailable", dependency);
  }

  try {
    const result = await runProcess({
      args: [...resolved.command.availabilityArgs],
      command: resolved.command.executable,
      cwd: rootDir
    });
    return availabilityFromVersionResult(result, dependency);
  } catch (error: unknown) {
    return error instanceof Error
      ? processErrorAvailability(error, dependency)
      : unavailableJscpd("unknown error", "execution-error", dependency);
  }
}

function availabilityFromVersionResult(
  result: ToolCommandResult,
  dependency: DuplicateDetectionScannerOptions
): JscpdAvailability {
  if (result.error) return processErrorAvailability(result.error, dependency);
  const output = commandOutput(result);
  if (result.status !== 0) {
    return unavailableJscpd(
      `jscpd --version failed, ${processTermination(result)}${output ? `: ${output}` : ""}`,
      "execution-error",
      dependency
    );
  }
  return {
    name: "jscpd",
    available: true,
    version: parseJscpdVersionOutput(output),
    error: null,
    source: jscpdSource(dependency),
    reason: null
  };
}

function processErrorAvailability(
  error: Error,
  dependency: DuplicateDetectionScannerOptions
): JscpdAvailability {
  const isMissingTool = (error as NodeJS.ErrnoException).code === "ENOENT";
  return unavailableJscpd(
    isMissingTool ? "jscpd dependency binary unavailable" : `jscpd version error: ${error.message}`,
    isMissingTool ? "tool-unavailable" : "execution-error",
    dependency
  );
}

function unavailableJscpd(
  error: string,
  reason: Exclude<JscpdAvailability["reason"], null>,
  dependency: DuplicateDetectionScannerOptions
): JscpdAvailability {
  return {
    name: "jscpd",
    available: false,
    version: null,
    error,
    source: jscpdSource(dependency),
    reason
  };
}

function jscpdSource(dependency: DuplicateDetectionScannerOptions): string {
  return isDefaultJscpdCommand(dependency) ? "package dependency" : "repository devDependency";
}

function commandOutput(result: ToolCommandResult): string {
  return (result.stdout || "").trim() || (result.stderr || "").trim();
}

function processTermination(result: ToolCommandResult): string {
  return typeof result.status === "number"
    ? `exit ${result.status}`
    : `signal ${result.signal || "unknown"}`;
}

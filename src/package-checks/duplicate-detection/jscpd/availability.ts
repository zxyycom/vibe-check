import { runProcess } from "../../host-environment/process/command.ts";
import type { ResolvedDuplicateDetectionScannerOptions } from "../options.ts";
import { isMissingExplicitCommand } from "./command-path.ts";
import { isPackageJscpdCommand, resolveJscpdCommand } from "./command-resolution.ts";
import { parseJscpdVersionOutput } from "./scanner.ts";

type JscpdAvailability = Readonly<
  | {
      available: true;
      error: null;
      name: "jscpd";
      reason: null;
      source: JscpdSource;
      version: string;
    }
  | {
      available: false;
      error: string;
      name: "jscpd";
      reason: "execution-error" | "tool-unavailable";
      source: JscpdSource;
      version: null;
    }
>;

type JscpdSource = "custom command" | "package dependency";

type ToolCommandResult = Awaited<ReturnType<typeof runProcess>>;

export async function checkJscpd(
  rootDir: string,
  dependency: ResolvedDuplicateDetectionScannerOptions
): Promise<JscpdAvailability> {
  const resolved = resolveJscpdCommand(dependency.command);
  if (resolved.kind === "unavailable") {
    return unavailableJscpd(resolved.error, "tool-unavailable", dependency);
  }
  if (isMissingExplicitCommand(resolved.command.executable)) {
    return unavailableJscpd("jscpd dependency binary unavailable", "tool-unavailable", dependency);
  }

  try {
    const result = await runProcess({
      args: [...resolved.command.versionArguments],
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
  dependency: ResolvedDuplicateDetectionScannerOptions
): JscpdAvailability {
  if (result.error) return processErrorAvailability(result.error, dependency);
  const output = commandOutput(result);
  if (result.status !== 0) return failedVersionAvailability(result, output, dependency);
  const version = parseJscpdVersionOutput(output);
  if (version === null) return unrecognizedVersionAvailability(dependency);
  return {
    name: "jscpd",
    available: true,
    version,
    error: null,
    source: jscpdSource(dependency),
    reason: null
  };
}

function failedVersionAvailability(
  result: ToolCommandResult,
  output: string,
  dependency: ResolvedDuplicateDetectionScannerOptions
): JscpdAvailability {
  const detail = output ? `: ${output}` : "";
  return unavailableJscpd(
    `jscpd --version failed, ${processTermination(result)}${detail}`,
    "execution-error",
    dependency
  );
}

function unrecognizedVersionAvailability(
  dependency: ResolvedDuplicateDetectionScannerOptions
): JscpdAvailability {
  return unavailableJscpd(
    "jscpd --version returned unrecognized output",
    "execution-error",
    dependency
  );
}

function processErrorAvailability(
  error: Error,
  dependency: ResolvedDuplicateDetectionScannerOptions
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
  dependency: ResolvedDuplicateDetectionScannerOptions
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

function jscpdSource(dependency: ResolvedDuplicateDetectionScannerOptions): JscpdSource {
  return isPackageJscpdCommand(dependency.command) ? "package dependency" : "custom command";
}

function commandOutput(result: ToolCommandResult): string {
  return (result.stdout || "").trim() || (result.stderr || "").trim();
}

function processTermination(result: ToolCommandResult): string {
  return typeof result.status === "number"
    ? `exit ${result.status}`
    : `signal ${result.signal || "unknown"}`;
}

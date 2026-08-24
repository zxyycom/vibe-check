import type { DuplicationScannerDependency } from "../dependencies.ts";
import type { ToolAvailability } from "../../../configuration/metric-contract.ts";
import { isMissingExplicitCommand } from "../command-path.ts";
import { isDefaultJscpdCommand, resolveJscpdCommand } from "../jscpd/default-command.ts";
import { parseJscpdVersionOutput } from "../jscpd/scanner.ts";
import {
  processFailure,
  runToolCommand,
  versionOutput,
  type ToolCommandResult
} from "./command.ts";

export async function checkJscpd(
  rootDir: string,
  dependency: DuplicationScannerDependency
): Promise<ToolAvailability> {
  const resolved = resolveJscpdCommand(dependency);
  if (resolved.kind === "unavailable") {
    return unavailableJscpd(resolved.error, "tool-unavailable", dependency);
  }
  if (isMissingExplicitCommand(resolved.command.executable)) {
    return unavailableJscpd("jscpd dependency binary unavailable", "tool-unavailable", dependency);
  }

  try {
    const result = await runToolCommand(
      rootDir,
      resolved.command.executable,
      resolved.command.availabilityArgs
    );
    return jscpdAvailabilityFromVersionResult(result, dependency);
  } catch (error: unknown) {
    return error instanceof Error
      ? jscpdProcessErrorAvailability(error, dependency)
      : unavailableJscpd("unknown error", "execution-error", dependency);
  }
}

function jscpdAvailabilityFromVersionResult(
  result: ToolCommandResult,
  dependency: DuplicationScannerDependency
): ToolAvailability {
  if (result.error) {
    return jscpdProcessErrorAvailability(result.error, dependency);
  }

  const output = versionOutput(result);
  if (result.status !== 0) {
    return unavailableJscpdVersion(result, output, dependency);
  }

  return availableJscpd(output, dependency);
}

function unavailableJscpdVersion(
  result: ToolCommandResult,
  output: string,
  dependency: DuplicationScannerDependency
): ToolAvailability {
  return unavailableJscpd(
    `jscpd --version failed, ${processFailure(result)}${output ? `: ${output}` : ""}`,
    "execution-error",
    dependency
  );
}

function availableJscpd(
  output: string,
  dependency: DuplicationScannerDependency
): ToolAvailability {
  return {
    name: "jscpd",
    available: true,
    version: parseJscpdVersionOutput(output),
    error: null,
    source: jscpdSource(dependency),
    reason: null
  };
}

function jscpdProcessErrorAvailability(
  error: Error,
  dependency: DuplicationScannerDependency
): ToolAvailability {
  const code = (error as NodeJS.ErrnoException).code;
  const isMissingTool = code === "ENOENT";
  return unavailableJscpd(
    isMissingTool ? "jscpd dependency binary unavailable" : `jscpd version error: ${error.message}`,
    isMissingTool ? "tool-unavailable" : "execution-error",
    dependency
  );
}

function unavailableJscpd(
  error: string,
  reason: NonNullable<ToolAvailability["reason"]>,
  dependency: DuplicationScannerDependency
): ToolAvailability {
  return {
    name: "jscpd",
    available: false,
    version: null,
    error,
    source: jscpdSource(dependency),
    reason
  };
}

function jscpdSource(dependency: DuplicationScannerDependency): string {
  return isDefaultJscpdCommand(dependency) ? "package dependency" : "repository devDependency";
}

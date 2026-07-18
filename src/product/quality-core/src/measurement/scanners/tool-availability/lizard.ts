import type { ToolAvailability, ToolConfig } from "../../../model/schema.ts";
import {
  processFailure,
  runToolCommand,
  versionOutput,
  type ToolCommandResult
} from "./command.ts";

export async function checkLizard(rootDir: string, toolConfig: ToolConfig): Promise<ToolAvailability> {
  try {
    const result = await runToolCommand(rootDir, toolConfig, ["--version"]);
    return lizardAvailabilityFromVersionResult(result);
  } catch (error: unknown) {
    return error instanceof Error
      ? lizardProcessErrorAvailability(error)
      : unavailableLizard("unknown error", "execution-error");
  }
}

function lizardAvailabilityFromVersionResult(result: ToolCommandResult): ToolAvailability {
  if (result.error) {
    return lizardProcessErrorAvailability(result.error);
  }

  const output = versionOutput(result);
  if (result.status !== 0) {
    return unavailableLizard(
      `lizard --version failed, ${processFailure(result)}${output ? `: ${output}` : ""}`,
      "execution-error"
    );
  }

  return {
    name: "lizard",
    available: true,
    version: output || "unknown",
    error: null,
    source: "uv",
    reason: null
  };
}

function lizardProcessErrorAvailability(error: Error): ToolAvailability {
  const code = (error as NodeJS.ErrnoException).code;
  const isMissingTool = code === "ENOENT";
  return unavailableLizard(
    isMissingTool ? `lizard command unavailable: ${error.message}` : `lizard version error: ${error.message}`,
    isMissingTool ? "tool-unavailable" : "execution-error"
  );
}

function unavailableLizard(error: string, reason: NonNullable<ToolAvailability["reason"]>): ToolAvailability {
  return {
    name: "lizard",
    available: false,
    version: null,
    error,
    source: "uv",
    reason
  };
}

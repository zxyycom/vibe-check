import { runProcess } from "../../host-environment/process/command.ts";
import type { FunctionMetricsScannerOptions } from "../options.ts";

type LizardAvailability = Readonly<{
  available: boolean;
  error: string | null;
  name: "lizard";
  reason: "execution-error" | "tool-unavailable" | null;
  source: "uv";
  version: string | null;
}>;

type ToolCommandResult = Awaited<ReturnType<typeof runProcess>>;

export async function checkLizard(
  rootDir: string,
  dependency: FunctionMetricsScannerOptions
): Promise<LizardAvailability> {
  try {
    const result = await runProcess({
      args: [...dependency.availabilityArgs],
      command: dependency.executable,
      cwd: rootDir
    });
    return availabilityFromVersionResult(result);
  } catch (error: unknown) {
    return error instanceof Error
      ? processErrorAvailability(error)
      : unavailableLizard("unknown error", "execution-error");
  }
}

function availabilityFromVersionResult(result: ToolCommandResult): LizardAvailability {
  if (result.error) return processErrorAvailability(result.error);
  const output = commandOutput(result);
  if (result.status !== 0) {
    return unavailableLizard(
      `lizard --version failed, ${processTermination(result)}${output ? `: ${output}` : ""}`,
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

function processErrorAvailability(error: Error): LizardAvailability {
  const isMissingTool = (error as NodeJS.ErrnoException).code === "ENOENT";
  return unavailableLizard(
    isMissingTool
      ? `lizard command unavailable: ${error.message}`
      : `lizard version error: ${error.message}`,
    isMissingTool ? "tool-unavailable" : "execution-error"
  );
}

function unavailableLizard(
  error: string,
  reason: Exclude<LizardAvailability["reason"], null>
): LizardAvailability {
  return { name: "lizard", available: false, version: null, error, source: "uv", reason };
}

function commandOutput(result: ToolCommandResult): string {
  return (result.stdout || "").trim() || (result.stderr || "").trim();
}

function processTermination(result: ToolCommandResult): string {
  return typeof result.status === "number"
    ? `exit ${result.status}`
    : `signal ${result.signal || "unknown"}`;
}

import { errorMessage } from "../../host-environment/error-message.ts";
import { runProcess } from "../../host-environment/process/command.ts";
import type { ResolvedFunctionMetricsScannerOptions } from "../options.ts";

type LizardAvailability = Readonly<
  | {
      readonly available: true;
      readonly error: null;
      readonly name: "lizard";
      readonly reason: null;
      readonly source: "configured command";
      readonly version: string;
    }
  | {
      readonly available: false;
      readonly error: string;
      readonly name: "lizard";
      readonly reason: "contract-error" | "execution-error" | "tool-unavailable";
      readonly source: "configured command";
      readonly version: null;
    }
>;

type ToolCommandResult = Awaited<ReturnType<typeof runProcess>>;

export async function checkLizard(
  rootDir: string,
  dependency: ResolvedFunctionMetricsScannerOptions
): Promise<LizardAvailability> {
  try {
    const result = await runProcess({
      args: ["--version"],
      command: dependency.executable,
      cwd: rootDir
    });
    return availabilityFromVersionResult(result);
  } catch (error: unknown) {
    return unavailableLizard(`lizard version error: ${errorMessage(error)}`, "execution-error");
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
  if (output === "") {
    return unavailableLizard("lizard --version returned empty output", "contract-error");
  }
  return {
    name: "lizard",
    available: true,
    version: output,
    error: null,
    source: "configured command",
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
  return {
    name: "lizard",
    available: false,
    version: null,
    error,
    source: "configured command",
    reason
  };
}

function commandOutput(result: ToolCommandResult): string {
  return (result.stdout || "").trim() || (result.stderr || "").trim();
}

function processTermination(result: ToolCommandResult): string {
  return typeof result.status === "number"
    ? `exit ${result.status}`
    : `signal ${result.signal || "unknown"}`;
}

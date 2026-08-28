import { errorMessage } from "../../host-environment/error-message.ts";
import { runProcess } from "../../host-environment/process/command.ts";
import type { ResolvedFileMetricsScannerOptions } from "../options.ts";
import { SCC_VERSION_OUTPUT } from "./scanner.ts";

type SccAvailability = Readonly<
  | {
      readonly available: true;
      readonly error: null;
      readonly name: "scc";
      readonly reason: null;
      readonly source: "configured command";
      readonly version: string;
    }
  | {
      readonly available: false;
      readonly error: string;
      readonly name: "scc";
      readonly reason: "contract-error" | "execution-error" | "tool-unavailable";
      readonly source: "configured command";
      readonly version: null;
    }
>;

type ToolCommandResult = Awaited<ReturnType<typeof runProcess>>;

export async function checkScc(
  rootDir: string,
  dependency: ResolvedFileMetricsScannerOptions
): Promise<SccAvailability> {
  try {
    const result = await runProcess({
      args: ["--version"],
      command: dependency.executable,
      cwd: rootDir
    });
    return availabilityFromVersionResult(result);
  } catch (error: unknown) {
    return unavailableScc(`scc version error: ${errorMessage(error)}`, "execution-error");
  }
}

function availabilityFromVersionResult(result: ToolCommandResult): SccAvailability {
  if (result.error) return processErrorAvailability(result.error);
  const version = commandOutput(result);
  if (result.status !== 0) {
    return unavailableScc(
      `scc --version failed, ${processTermination(result)}${version ? `: ${version}` : ""}`,
      "execution-error"
    );
  }
  if (version !== SCC_VERSION_OUTPUT) {
    return unavailableScc(
      `expected ${SCC_VERSION_OUTPUT}, got "${version || "unknown"}"`,
      "contract-error"
    );
  }
  return {
    name: "scc",
    available: true,
    version,
    error: null,
    source: "configured command",
    reason: null
  };
}

function processErrorAvailability(error: Error): SccAvailability {
  const isMissingTool = (error as NodeJS.ErrnoException).code === "ENOENT";
  return unavailableScc(
    isMissingTool ? `scc not installed: ${error.message}` : `scc version error: ${error.message}`,
    isMissingTool ? "tool-unavailable" : "execution-error"
  );
}

function unavailableScc(
  error: string,
  reason: Exclude<SccAvailability["reason"], null>
): SccAvailability {
  return {
    name: "scc",
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

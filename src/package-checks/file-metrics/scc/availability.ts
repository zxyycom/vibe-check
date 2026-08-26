import { runProcess } from "../../host-environment/process/command.ts";
import type { FileMetricsScannerOptions } from "../options.ts";
import { SCC_VERSION_OUTPUT } from "./scanner.ts";

type SccAvailability = Readonly<{
  available: boolean;
  error: string | null;
  name: "scc";
  reason: "contract-error" | "execution-error" | "tool-unavailable" | null;
  source: "system";
  version: string | null;
}>;

type ToolCommandResult = Awaited<ReturnType<typeof runProcess>>;

export async function checkScc(
  rootDir: string,
  dependency: FileMetricsScannerOptions
): Promise<SccAvailability> {
  try {
    const result = await runProcess({
      args: [...dependency.availabilityArgs],
      command: dependency.executable,
      cwd: rootDir
    });
    return availabilityFromVersionResult(result);
  } catch {
    return unavailableScc("unknown error", "execution-error");
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
  return { name: "scc", available: true, version, error: null, source: "system", reason: null };
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
  return { name: "scc", available: false, version: null, error, source: "system", reason };
}

function commandOutput(result: ToolCommandResult): string {
  return (result.stdout || "").trim() || (result.stderr || "").trim();
}

function processTermination(result: ToolCommandResult): string {
  return typeof result.status === "number"
    ? `exit ${result.status}`
    : `signal ${result.signal || "unknown"}`;
}

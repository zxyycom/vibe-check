import { errorMessage } from "../../host-environment/error-message.ts";
import { processFailure, runProcess } from "../../host-environment/process/command.ts";
import type { ResolvedFileMetricsScannerOptions } from "../options.ts";
import { SCC_VERSION_OUTPUT } from "./parser.ts";

const SCC_VERSION_ARGUMENTS = Object.freeze(["--version"]);

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

type SccVersionCommandResult = Awaited<ReturnType<typeof runProcess>>;

export async function checkScc(
  rootDir: string,
  scanner: ResolvedFileMetricsScannerOptions
): Promise<SccAvailability> {
  try {
    const commandResult = await runProcess({
      args: SCC_VERSION_ARGUMENTS,
      command: scanner.executable,
      cwd: rootDir
    });
    return availabilityFromVersionResult(commandResult);
  } catch (error: unknown) {
    return unavailableScc(`scc version error: ${errorMessage(error)}`, "execution-error");
  }
}

function availabilityFromVersionResult(commandResult: SccVersionCommandResult): SccAvailability {
  if (commandResult.error) return processErrorAvailability(commandResult.error);
  const version = commandOutput(commandResult);
  if (commandResult.status !== 0) {
    return unavailableScc(
      `scc --version failed, ${processTermination(commandResult)}${version ? `: ${version}` : ""}`,
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
  const isMissingTool = processFailure(error).code === "ENOENT";
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

function commandOutput(commandResult: SccVersionCommandResult): string {
  return (commandResult.stdout || "").trim() || (commandResult.stderr || "").trim();
}

function processTermination(commandResult: SccVersionCommandResult): string {
  return typeof commandResult.status === "number"
    ? `exit ${commandResult.status}`
    : `signal ${commandResult.signal || "unknown"}`;
}

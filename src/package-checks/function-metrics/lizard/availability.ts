import { errorMessage } from "../../host-environment/error-message.ts";
import { runProcess } from "../../host-environment/process/command.ts";
import type { ResolvedFunctionMetricsScannerOptions } from "../options.ts";

type LizardAvailability = Readonly<
  | {
      readonly available: true;
      readonly version: string;
    }
  | {
      readonly available: false;
      readonly error: string;
      readonly reason: "contract-error" | "execution-error" | "tool-unavailable";
    }
>;

interface UnavailableLizardInput {
  readonly error: string;
  readonly reason: Extract<LizardAvailability, { available: false }>["reason"];
}

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
    return unavailableLizard({
      error: `lizard version error: ${errorMessage(error)}`,
      reason: "execution-error"
    });
  }
}

function availabilityFromVersionResult(result: ToolCommandResult): LizardAvailability {
  if (result.signal !== null) {
    const output = commandOutput(result);
    return unavailableLizard({
      error: `lizard --version failed, signal ${result.signal}${output ? `: ${output}` : ""}`,
      reason: "execution-error"
    });
  }
  if (result.error) return processErrorAvailability(result.error);
  const output = commandOutput(result);
  if (result.status !== 0) {
    return unavailableLizard({
      error: `lizard --version failed, ${processTermination(result)}${output ? `: ${output}` : ""}`,
      reason: "execution-error"
    });
  }
  const version = parseLizardVersion(output);
  if (version === undefined) {
    return unavailableLizard({
      error: "lizard --version must output canonical 1.23.<patch>",
      reason: "contract-error"
    });
  }
  if (version.major !== 1 || version.minor !== 23) {
    return unavailableLizard({
      error: `lizard --version ${formatLizardVersion(version)} is not supported; expected 1.23.<patch>`,
      reason: "contract-error"
    });
  }
  return Object.freeze({ available: true, version: formatLizardVersion(version) });
}

interface LizardVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

function parseLizardVersion(output: string): LizardVersion | undefined {
  const match = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.exec(output);
  if (match === null) return undefined;
  const [major, minor, patch] = match.slice(1).map(Number);
  if (![major, minor, patch].every(Number.isSafeInteger)) return undefined;
  return Object.freeze({ major, minor, patch });
}

function formatLizardVersion(version: LizardVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function processErrorAvailability(error: Error): LizardAvailability {
  const isMissingTool = Object.hasOwn(error, "code") && Reflect.get(error, "code") === "ENOENT";
  return unavailableLizard({
    error: isMissingTool
      ? `lizard command unavailable: ${error.message}`
      : `lizard version error: ${error.message}`,
    reason: isMissingTool ? "tool-unavailable" : "execution-error"
  });
}

function unavailableLizard({ error, reason }: UnavailableLizardInput): LizardAvailability {
  return Object.freeze({ available: false, error, reason });
}

function commandOutput(result: ToolCommandResult): string {
  return (result.stdout || "").trim() || (result.stderr || "").trim();
}

function processTermination(result: ToolCommandResult): string {
  return typeof result.status === "number"
    ? `exit ${result.status}`
    : `signal ${result.signal || "unknown"}`;
}

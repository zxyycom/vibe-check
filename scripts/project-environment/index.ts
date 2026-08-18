import { spawnSync } from "node:child_process";
import { devNull } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MAX_PROCESS_OUTPUT_BUFFER_BYTES = 64 * 1024 * 1024;
const PLAIN_TEXT_ENV = Object.freeze({
  CLICOLOR: "0",
  CLICOLOR_FORCE: "0",
  FORCE_COLOR: "0",
  NO_COLOR: "1",
  PNPM_CONFIG_COLOR: "false",
  PY_COLORS: "0",
  TERM: "dumb",
  UV_NO_COLOR: "1",
  npm_config_color: "false"
} satisfies NodeJS.ProcessEnv);
const MISE_ENV = Object.freeze({
  ...process.env,
  MISE_GLOBAL_CONFIG_FILE: devNull
} satisfies NodeJS.ProcessEnv);
const MISE_TOOLS = [
  "node",
  "bun",
  "pnpm",
  "uv",
  "go",
  "pipx:lizard",
  "go:github.com/boyter/scc/v3",
  "npm:@colbymchenry/codegraph"
] as const;

type EnvironmentAction = "check" | "setup";

interface CommandOutputOptions {
  readonly shouldCaptureOutput?: boolean;
}

interface RunCommandInput extends CommandOutputOptions {
  readonly args: readonly string[];
  readonly command: string;
  readonly environment?: NodeJS.ProcessEnv;
}

interface RunMiseCommandInput extends CommandOutputOptions {
  readonly args: readonly string[];
}

interface RunCommandInMiseInput extends CommandOutputOptions {
  readonly args: readonly string[];
  readonly command: string;
}

function setupEnvironment(): void {
  trustRepositoryMiseConfig();
  runMiseCommand({ args: ["install", "--locked", ...MISE_TOOLS] });
  runCommandInMise({ args: ["install", "--frozen-lockfile"], command: "pnpm" });

  runCommandInMise({ args: ["init", "."], command: "codegraph" });
  runCommandInMise({ args: ["sync", "--quiet", "."], command: "codegraph" });
}

function checkEnvironment(): void {
  runMiseCommand({ args: ["install", "--dry-run-code", "--locked", ...MISE_TOOLS] });
  runMiseCommand({ args: ["ls", "--current", ...MISE_TOOLS] });
  runCommandInMise({
    args: ["-m", "lizard", "--version"],
    command: resolveLizardInterpreterPath()
  });
  runCommandInMise({ args: ["--version"], command: resolveSccExecutablePath() });
  runCommandInMise({ args: ["run", "jscpd", "--version"], command: "bun" });
  runCommandInMise({ args: ["--version"], command: "codegraph" });
  runCommandInMise({ args: ["status", "."], command: "codegraph" });
}

function resolveSccExecutablePath(): string {
  const sccToolRoot = runMiseCommand({
    args: ["where", "go:github.com/boyter/scc/v3"],
    shouldCaptureOutput: true
  }).trim();
  if (!sccToolRoot) {
    throw new Error("mise where go:github.com/boyter/scc/v3 returned no installation path");
  }
  return resolve(sccToolRoot, "bin", process.platform === "win32" ? "scc.exe" : "scc");
}

function trustRepositoryMiseConfig(): void {
  // Run outside the repository so mise does not parse the untrusted config before `trust`.
  runMiseCommand({
    args: ["-C", dirname(REPO_ROOT), "trust", resolve(REPO_ROOT, "mise.toml")]
  });
}

function resolveLizardInterpreterPath(): string {
  const lizardToolRoot = runMiseCommand({
    args: ["where", "pipx:lizard"],
    shouldCaptureOutput: true
  }).trim();
  if (!lizardToolRoot) {
    throw new Error("mise where pipx:lizard returned no installation path");
  }
  return resolve(
    lizardToolRoot,
    "lizard",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python"
  );
}

function runCommandInMise({ args, command, shouldCaptureOutput }: RunCommandInMiseInput): string {
  return runMiseCommand({
    args: ["exec", "--", command, ...args],
    shouldCaptureOutput
  });
}

function runMiseCommand({ args, shouldCaptureOutput }: RunMiseCommandInput): string {
  return runCommand({
    args,
    command: "mise",
    environment: MISE_ENV,
    shouldCaptureOutput
  });
}

function runCommand({
  args,
  command,
  environment = process.env,
  shouldCaptureOutput = false
}: RunCommandInput): string {
  const commandResult = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...environment, ...PLAIN_TEXT_ENV },
    maxBuffer: MAX_PROCESS_OUTPUT_BUFFER_BYTES,
    stdio: shouldCaptureOutput ? "pipe" : "inherit",
    windowsHide: true
  });
  const stderrOutput = typeof commandResult.stderr === "string" ? commandResult.stderr : "";
  const stdoutOutput = typeof commandResult.stdout === "string" ? commandResult.stdout : "";
  const commandDisplay = [command, ...args].join(" ");

  if (commandResult.error) {
    throw new Error(`${commandDisplay} could not start: ${commandResult.error.message}`);
  }
  if (commandResult.status !== 0) {
    const exitDescription = commandResult.signal
      ? `signal ${commandResult.signal}`
      : `exit ${commandResult.status ?? "unknown"}`;
    const diagnostic = stderrOutput.trim() || stdoutOutput.trim();
    const diagnosticSuffix = diagnostic ? `: ${diagnostic}` : "";
    throw new Error(`${commandDisplay} failed (${exitDescription})${diagnosticSuffix}`);
  }
  return stdoutOutput;
}

function parseEnvironmentAction(value: string | undefined): EnvironmentAction {
  if (value === "check" || value === "setup") {
    return value;
  }
  throw new Error("usage: bun scripts/project-environment/index.ts <check|setup>");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const action = parseEnvironmentAction(process.argv[2]);
    if (action === "setup") {
      setupEnvironment();
    } else {
      checkEnvironment();
    }
  } catch (error) {
    const failureMessage = error instanceof Error ? error.message : String(error);
    console.error(`project environment failed: ${failureMessage}`);
    process.exitCode = 1;
  }
}

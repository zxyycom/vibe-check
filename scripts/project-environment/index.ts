import { spawnSync } from "node:child_process";
import { devNull } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PROCESS_MAX_BUFFER = 64 * 1024 * 1024;
const PLAIN_TEXT_ENV = {
  CLICOLOR: "0",
  CLICOLOR_FORCE: "0",
  FORCE_COLOR: "0",
  NO_COLOR: "1",
  PNPM_CONFIG_COLOR: "false",
  PY_COLORS: "0",
  TERM: "dumb",
  UV_NO_COLOR: "1",
  npm_config_color: "false"
} satisfies NodeJS.ProcessEnv;
const MISE_ENV = {
  ...process.env,
  MISE_GLOBAL_CONFIG_FILE: devNull
} satisfies NodeJS.ProcessEnv;
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

interface RunCommandOptions extends CommandOutputOptions {
  readonly environment?: NodeJS.ProcessEnv;
}

function setupEnvironment(): void {
  trustRepositoryMiseConfig();
  runCommand("git", ["submodule", "update", "--init", "--recursive"]);
  runMiseCommand(["install", "--locked", ...MISE_TOOLS]);
  runCommandInMise("pnpm", ["install", "--frozen-lockfile"]);

  runCommandInMise("codegraph", ["init", "."]);
  runCommandInMise("codegraph", ["sync", "--quiet", "."]);
}

function checkEnvironment(): void {
  runMiseCommand(["install", "--dry-run-code", "--locked", ...MISE_TOOLS]);
  checkSubmodules();
  runMiseCommand(["ls", "--current", ...MISE_TOOLS]);
  runCommandInMise(resolveLizardInterpreterPath(), ["-m", "lizard", "--version"]);
  runCommandInMise(resolveSccExecutablePath(), ["--version"]);
  runCommandInMise("bun", ["run", "jscpd", "--version"]);
  runCommandInMise("codegraph", ["--version"]);
  runCommandInMise("codegraph", ["status", "."]);
}

function resolveSccExecutablePath(): string {
  const sccToolRoot = runMiseCommand(
    ["where", "go:github.com/boyter/scc/v3"],
    { shouldCaptureOutput: true }
  ).trim();
  if (!sccToolRoot) {
    throw new Error("mise where go:github.com/boyter/scc/v3 returned no installation path");
  }
  return resolve(
    sccToolRoot,
    "bin",
    process.platform === "win32" ? "scc.exe" : "scc"
  );
}

function trustRepositoryMiseConfig(): void {
  // Run outside the repository so mise does not parse the untrusted config before `trust`.
  runMiseCommand([
    "-C",
    dirname(REPO_ROOT),
    "trust",
    resolve(REPO_ROOT, "mise.toml")
  ]);
}

function checkSubmodules(): void {
  const submoduleStatusOutput = runCommand(
    "git",
    ["submodule", "status", "--recursive"],
    { shouldCaptureOutput: true }
  );
  const submoduleStatusLines = submoduleStatusOutput
    .split(/\r?\n/u)
    .filter((line) => line.length > 0);
  if (submoduleStatusLines.length === 0) {
    throw new Error("git submodule status returned no entries");
  }

  const failingSubmoduleStatusLines = submoduleStatusLines.filter(
    (line) => !line.startsWith(" ")
  );
  if (failingSubmoduleStatusLines.length > 0) {
    throw new Error(
      `submodules are unavailable or not at the pinned revision:\n${failingSubmoduleStatusLines.join("\n")}\nRun bun run env:setup.`
    );
  }
  console.log(`submodule check ok: ${submoduleStatusLines.length} pinned checkouts`);
}

function resolveLizardInterpreterPath(): string {
  const lizardToolRoot = runMiseCommand(
    ["where", "pipx:lizard"],
    { shouldCaptureOutput: true }
  ).trim();
  if (!lizardToolRoot) {
    throw new Error("mise where pipx:lizard returned no installation path");
  }
  return resolve(
    lizardToolRoot,
    "lizard",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python"
  );
}

function runCommandInMise(
  command: string,
  args: readonly string[],
  options: CommandOutputOptions = {}
): string {
  return runMiseCommand(["exec", "--", command, ...args], options);
}

function runMiseCommand(
  args: readonly string[],
  options: CommandOutputOptions = {}
): string {
  return runCommand("mise", args, { ...options, environment: MISE_ENV });
}

function runCommand(
  command: string,
  args: readonly string[],
  options: RunCommandOptions = {}
): string {
  const {
    environment = process.env,
    shouldCaptureOutput = false
  } = options;
  const commandResult = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...environment, ...PLAIN_TEXT_ENV },
    maxBuffer: PROCESS_MAX_BUFFER,
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

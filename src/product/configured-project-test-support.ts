import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateMachinePublicationSetV2
} from "./machine-output.ts";

export type MachinePublicationV2 = Extract<
  ReturnType<typeof validateMachinePublicationSetV2>,
  { ok: true }
>["value"];

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");
export const fixtureArtifactDir = resolve(fixtureRoot, "artifacts/configured-scan");

export interface ConfiguredProjectFixture {
  readonly artifactDir: string;
  readonly configPath: string;
  readonly projectRoot: string;
  readonly tempRoot: string;
}

export function createConfiguredProjectFixture(
  tempPrefix: string
): ConfiguredProjectFixture {
  const tempRoot = mkdtempSync(join(tmpdir(), tempPrefix));
  const projectRoot = join(tempRoot, "configured-project");
  cpSync(fixtureRoot, projectRoot, { recursive: true });
  rmSync(join(projectRoot, "artifacts"), { force: true, recursive: true });
  rmSync(join(projectRoot, ".cache"), { force: true, recursive: true });
  return {
    artifactDir: join(projectRoot, "artifacts/configured-scan"),
    configPath: join(projectRoot, ".vibe-check", "config.json"),
    projectRoot,
    tempRoot
  };
}

export interface CommandResult {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

export function runConfiguredFixture(
  configPath = ".vibe-check/config.json",
  extraArgs: readonly string[] = []
): CommandResult {
  return runProductCli([
    "scan",
    fixtureRoot,
    "--config",
    configPath,
    "--skip-baseline",
    ...extraArgs
  ], {
    ...configuredScannerEnvironment(fixtureRoot)
  });
}

export function runProductCli(
  args: readonly string[],
  environment: NodeJS.ProcessEnv = {}
): CommandResult {
  const result = spawnSync(
    process.execPath,
    ["run", "--silent", "product:cli", "--", ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, ...environment }
    }
  );

  assert.equal(result.error, undefined);
  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout
  };
}

export function assertCommandSucceeded(result: CommandResult, label: string): void {
  assert.equal(
    result.status,
    0,
    `${label} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

export function readFixturePublication(): MachinePublicationV2 {
  return readMachinePublication(fixtureArtifactDir);
}

export function readMachinePublication(
  artifactDir: string
): MachinePublicationV2 {
  const validation = validateMachinePublicationSetV2({
    recordsNdjson: readFileSync(resolve(artifactDir, "records.ndjson")),
    runJson: readFileSync(resolve(artifactDir, "run.json"))
  });
  if (!validation.ok) assert.fail(JSON.stringify(validation.diagnostic));
  return validation.value;
}

export function stableScanEvidence(publication: MachinePublicationV2): unknown {
  return {
    records: publication.records.map(({ checkRunId: _, ...record }) => record),
    run: {
      ...publication.run,
      invocation: {
        ...publication.run.invocation,
        invocationId: "<invocation>",
        timestamp: "<timestamp>"
      },
      runs: publication.run.runs.map(({ checkRunId: _, ...run }) => run)
    }
  };
}

export function cleanupFixtureOutput(): void {
  rmSync(resolve(fixtureRoot, "artifacts"), { force: true, recursive: true });
  rmSync(resolve(fixtureRoot, ".cache"), { force: true, recursive: true });
}

export function writeFixtureFile(rootDir: string, relPath: string, content: string): void {
  const absPath = join(rootDir, relPath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content, "utf8");
}

export function writeControlledLizard(
  rootDir: string,
  mode: "execution" | "invalid" | "zero"
): string {
  const scriptPath = join(rootDir, "tools", "completeness-lizard.ts");
  writeFixtureFile(
    rootDir,
    "tools/completeness-lizard.ts",
    [
      "#!/usr/bin/env bun",
      `const mode = ${JSON.stringify(mode)};`,
      "if (process.argv.includes(\"--version\")) {",
      "  console.log(\"lizard 1.17.10\");",
      "} else if (mode === \"zero\") {",
      "  console.log(\"NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line\");",
      "} else if (mode === \"execution\") {",
      "  console.error(\"controlled Lizard execution failure\");",
      "  process.exitCode = 7;",
      "} else if (mode === \"invalid\") {",
      "  console.log(\"NLOC,CCN,token count,parameter count\");",
      "  console.log(\"12,4\");",
      "} else {",
      "  throw new Error(`unexpected controlled Lizard mode: ${mode ?? \"missing\"}`);",
      "}",
      ""
    ].join("\n")
  );
  chmodSync(scriptPath, 0o755);
  if (process.platform !== "win32") return scriptPath;

  const commandPath = join(rootDir, "tools", "completeness-lizard.cmd");
  writeFileSync(
    commandPath,
    '@echo off\nbun "%~dp0completeness-lizard.ts" %*\n',
    "utf8"
  );
  return commandPath;
}

export function raiseWarningFloors(config: Record<string, unknown>): void {
  const checks = config.checks as {
    files: {
      codeLines: {
        absoluteFloor: number;
        lowDecisionTokenAllowance: { codeLineFloor: number };
      };
    };
    functions: {
      cyclomaticComplexity: { absoluteFloor: number };
      codeLines: {
        absoluteFloor: number;
        lowComplexityAllowance: { codeLineFloor: number };
      };
      parameterCount: { absoluteFloor: number };
    };
  };

  checks.functions.cyclomaticComplexity.absoluteFloor = 10_000;
  checks.functions.codeLines.absoluteFloor = 10_000;
  checks.functions.codeLines.lowComplexityAllowance.codeLineFloor = 10_000;
  checks.functions.parameterCount.absoluteFloor = 10_000;
  checks.files.codeLines.absoluteFloor = 10_000;
  checks.files.codeLines.lowDecisionTokenAllowance.codeLineFloor = 10_000;
}

export function configuredScannerEnvironment(_projectRoot: string): NodeJS.ProcessEnv {
  return {
    VIBE_CHECK_JSCPD_ARGS: JSON.stringify(["tools/controlled-scanner.ts", "jscpd"]),
    VIBE_CHECK_JSCPD_CMD: process.execPath,
    VIBE_CHECK_LIZARD_CMD: join(
      "tools",
      process.platform === "win32" ? "controlled-lizard.cmd" : "controlled-lizard"
    ),
    VIBE_CHECK_SCC_ARGS: JSON.stringify(["tools/controlled-scanner.ts", "scc"]),
    VIBE_CHECK_SCC_CMD: process.execPath
  };
}

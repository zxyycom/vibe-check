import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { errorMessage } from "../../error-message.ts";
import {
  processFailureFromResult,
  runProcessSync,
  writeProcessOutput
} from "../../process-execution/execution.ts";
import { prepareFormalRelease } from "./prepare.ts";
import type { VerifiedFormalRelease } from "./receipt.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const projectGatePath = resolve(repositoryRoot, "scripts/project/gate/run.ts");

type FormalReleaseCommandInput =
  | Readonly<{ readonly command: "prepare"; readonly tag: string; readonly version: string }>
  | Readonly<{ readonly command: "verify"; readonly receiptPath: string }>;

interface FormalReleaseCommandSteps {
  readonly prepare: typeof prepareFormalRelease;
  readonly report: (line: string) => void;
  readonly verify: (receiptPath: string) => number | Promise<number>;
}

const defaultSteps: FormalReleaseCommandSteps = Object.freeze({
  prepare: prepareFormalRelease,
  report: (line: string) => console.log(line),
  verify: runFullReleaseAcceptance
});

export function createFullReleaseAcceptanceInvocation(receiptPath: string) {
  return Object.freeze({
    args: Object.freeze([
      "exec",
      "--",
      "bun",
      projectGatePath,
      "--all",
      "--release-receipt",
      resolve(repositoryRoot, receiptPath)
    ]),
    command: "mise"
  });
}

/** Runs only local formal preparation or same-receipt complete Gate verification. */
export async function runFormalReleaseCommand(
  argv: readonly string[],
  stepOverrides: Partial<FormalReleaseCommandSteps> = {}
): Promise<number> {
  const steps: FormalReleaseCommandSteps = Object.freeze({ ...defaultSteps, ...stepOverrides });
  const input = parseFormalReleaseCommand(argv);
  if (input.command === "verify") return steps.verify(input.receiptPath);
  const prepared = await steps.prepare({ tag: input.tag, version: input.version });
  reportPreparedRelease(prepared, steps.report);
  return 0;
}

function runFullReleaseAcceptance(receiptPath: string): number {
  const invocation = createFullReleaseAcceptanceInvocation(receiptPath);
  const result = runProcessSync({
    args: invocation.args,
    command: invocation.command,
    cwd: repositoryRoot
  });
  writeProcessOutput(result);
  if (result.error !== undefined || result.status === null) {
    throw processFailureFromResult(result) ?? new Error("formal release Gate did not exit");
  }
  return result.status;
}

function parseFormalReleaseCommand(argv: readonly string[]): FormalReleaseCommandInput {
  const [command, ...options] = argv;
  if (command === "prepare") {
    const values = parseNamedOptions(options, ["--tag", "--version"]);
    return Object.freeze({
      command,
      tag: requiredOption(values, "--tag"),
      version: requiredOption(values, "--version")
    });
  }
  if (command === "verify") {
    const values = parseNamedOptions(options, ["--receipt"]);
    return Object.freeze({
      command,
      receiptPath: requiredOption(values, "--receipt")
    });
  }
  throw new Error(
    "usage: bun scripts/package/release/command.ts prepare --version <0.0.PATCH> --tag <tag> | bun scripts/package/release/command.ts verify --receipt <path>"
  );
}

function parseNamedOptions(
  argv: readonly string[],
  allowedNames: readonly string[]
): ReadonlyMap<string, string> {
  if (argv.length === 0 || argv.length % 2 !== 0)
    throw new Error("formal release options are incomplete");
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (
      name === undefined ||
      value === undefined ||
      !allowedNames.includes(name) ||
      value.length === 0 ||
      value.startsWith("--") ||
      values.has(name)
    ) {
      throw new Error("formal release options are invalid or duplicated");
    }
    values.set(name, value);
  }
  return values;
}

function requiredOption(values: ReadonlyMap<string, string>, name: string): string {
  const value = values.get(name);
  if (value === undefined) throw new Error(`formal release requires ${name}`);
  return value;
}

function reportPreparedRelease(
  prepared: VerifiedFormalRelease,
  report: (line: string) => void
): void {
  report(
    `formal release package: ${prepared.receipt.package.name}@${prepared.receipt.package.version}`
  );
  report(`formal release tag: ${prepared.receipt.package.tag}`);
  report(`formal release artifact: ${prepared.artifact.artifactPath}`);
  report(`formal release sha256: ${prepared.artifact.sha256}`);
  report(`formal release integrity: ${prepared.receipt.artifact.integrity}`);
  report(`formal release receipt: ${prepared.receiptPath}`);
}

if (import.meta.main) {
  try {
    process.exitCode = await runFormalReleaseCommand(process.argv.slice(2));
  } catch (error: unknown) {
    console.error(`formal release command failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}

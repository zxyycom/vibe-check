import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  EVIDENCE_SCHEMA_VERSION,
  canonicalJsonText,
  installedCandidateIdentity
} from "./evidence.ts";
import { CommandFailure, writeNewFile } from "./command-output.ts";
import { FIXTURES } from "./fixture-registry.ts";
import { validateScenario, type PolicyRegistryId, type Scenario } from "./scenario.ts";
import type { ReplicateOptions, WorkbenchEvidence } from "./command-execution.ts";

const USAGE =
  "usage: admission:simulate <scenario.json|fixture-id> [--policy static|learned] [--seed non-negative-integer] [--replicates positive-integer] [--out new-file]";

interface CommandOptions extends ReplicateOptions {
  readonly out?: string;
}

export async function runCommand(args: readonly string[]): Promise<number> {
  let outputPath: string | undefined;
  try {
    const invocation = parseInvocation(args);
    outputPath = invocation.options.out;
    const scenario = await loadScenario(invocation.input);
    requireRegisteredPolicy(scenario, invocation.options.policy);
    const { executeReplicates } = await import("./command-execution.ts");
    const evidence = await executeReplicates(
      scenario,
      invocation.options,
      installedCandidateIdentity()
    );
    return await writeEvidence(evidence, outputPath);
  } catch (error) {
    return await writeFailure(error, outputPath);
  }
}

function requireRegisteredPolicy(scenario: Scenario, policy: PolicyRegistryId): void {
  if (!scenario.policyIds.includes(policy)) {
    throw new CommandFailure("invalid-input", `scenario does not register policy ${policy}`);
  }
}

async function writeEvidence(
  evidence: WorkbenchEvidence,
  outputPath: string | undefined
): Promise<number> {
  const text = `${canonicalJsonText(evidence, 2)}\n`;
  if (outputPath === undefined) {
    (evidence.status === "success" ? process.stdout : process.stderr).write(text);
  } else {
    await writeNewFile(outputPath, text);
    if (evidence.status === "error") {
      process.stderr.write(
        `${canonicalJsonText({ code: "simulation-failed", evidencePath: resolve(outputPath), status: "error" })}\n`
      );
    }
  }
  return evidence.status === "success" ? 0 : 1;
}

async function writeFailure(error: unknown, outputPath: string | undefined): Promise<number> {
  const failure = commandFailureEvidence(error);
  const text = `${canonicalJsonText(failure, 2)}\n`;
  if (outputPath === undefined) process.stderr.write(text);
  else {
    try {
      await writeNewFile(outputPath, text);
      process.stderr.write(
        `${canonicalJsonText({ code: failure.error.code, evidencePath: resolve(outputPath), status: "error" })}\n`
      );
    } catch (writeError) {
      process.stderr.write(`${canonicalJsonText(commandFailureEvidence(writeError), 2)}\n`);
    }
  }
  return error instanceof CommandFailure && error.code === "invalid-input" ? 64 : 1;
}

async function loadScenario(input: string): Promise<Scenario> {
  const fixture = FIXTURES[input];
  if (fixture !== undefined) return validateScenario(fixture);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(resolve(input), "utf8"));
  } catch (error) {
    throw new CommandFailure(
      "invalid-input",
      error instanceof Error
        ? `invalid scenario input ${input}: ${error.message}`
        : `invalid scenario input ${input}`
    );
  }
  return validateScenario(parsed);
}

function parseInvocation(
  args: readonly string[]
): Readonly<{ readonly input: string; readonly options: CommandOptions }> {
  const input = requiredInput(args[0]);
  const values = optionPairs(args.slice(1));
  return Object.freeze({
    input,
    options: Object.freeze({
      ...outputOption(values),
      policy: policyOption(values),
      replicates: boundedInteger(optionOr(values, "--replicates", "1"), "replicates", false),
      seed: boundedInteger(optionOr(values, "--seed", "0"), "seed", true)
    })
  });
}

function requiredInput(input: string | undefined): string {
  if (input === undefined || input.startsWith("--"))
    throw new CommandFailure("invalid-input", USAGE);
  return input;
}

function policyOption(values: ReadonlyMap<string, string>): PolicyRegistryId {
  const policy = optionOr(values, "--policy", "static");
  if (policy !== "static" && policy !== "learned") throw new CommandFailure("invalid-input", USAGE);
  return policy;
}

function outputOption(values: ReadonlyMap<string, string>): Readonly<{ readonly out?: string }> {
  const out = values.get("--out");
  if (out === undefined) return Object.freeze({});
  if (out.length === 0) throw new CommandFailure("invalid-input", "output path must not be empty");
  return Object.freeze({ out });
}

function optionOr(values: ReadonlyMap<string, string>, flag: string, fallback: string): string {
  return values.get(flag) ?? fallback;
}

function optionPairs(optionArgs: readonly string[]): ReadonlyMap<string, string> {
  if (optionArgs.length % 2 !== 0) throw new CommandFailure("invalid-input", USAGE);
  const values = new Map<string, string>();
  for (let index = 0; index < optionArgs.length; index += 2) {
    const flag = optionArgs[index];
    const value = optionArgs[index + 1];
    if (
      flag === undefined ||
      value === undefined ||
      !["--out", "--policy", "--replicates", "--seed"].includes(flag) ||
      values.has(flag)
    ) {
      throw new CommandFailure("invalid-input", USAGE);
    }
    values.set(flag, value);
  }
  return values;
}

function boundedInteger(value: string, name: string, allowsZero: boolean): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < (allowsZero ? 0 : 1)) {
    throw new CommandFailure(
      "invalid-input",
      `${name} must be ${allowsZero ? "non-negative" : "positive"}`
    );
  }
  return parsed;
}

function commandFailureEvidence(error: unknown) {
  const code = error instanceof CommandFailure ? error.code : "invalid-input";
  const message =
    error instanceof Error && error.message.length > 0 ? error.message : "unknown command failure";
  return Object.freeze({
    candidateIdentity: null,
    error: Object.freeze({ code, message }),
    policyIdentity: null,
    profileSetIdentity: null,
    replicate: null,
    scenarioIdentity: null,
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    seed: null,
    source: "virtual" as const,
    status: "error" as const,
    trace: Object.freeze([]),
    virtualTimeMs: 0
  });
}

if (import.meta.main) process.exitCode = await runCommand(process.argv.slice(2));

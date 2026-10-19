import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { isNonArrayRecord, isStringArray } from "../../../value-guards.ts";
import { FIXTURES } from "../fixture-registry.ts";
import type {
  Artifact,
  EvaluationInvocation,
  Protocol,
  ProtocolScenarioInput,
  ScenarioCase
} from "./types.ts";
import type { LearnedStrategyFactory } from "../policy.ts";
import { validateScenario } from "../scenario.ts";

const PROTOCOL_PATH =
  "scripts/project/admission-workbench/learned-heuristic-evaluation/protocol.json";

export async function loadProtocol(): Promise<
  Readonly<{ readonly protocol: Protocol; readonly sha256: string }>
> {
  const text = await readFile(PROTOCOL_PATH, "utf8");
  const parsed: unknown = JSON.parse(text);
  const protocol = parseEvaluationProtocol(parsed);
  return Object.freeze({
    protocol,
    sha256: `sha256:${createHash("sha256").update(text).digest("hex")}`
  });
}

export async function loadScenarioCases(protocol: Protocol): Promise<readonly ScenarioCase[]> {
  const scenarios = await Promise.all(protocol.scenarioInputs.map(loadScenarioCase));
  assertScenarioCases(scenarios);
  return Object.freeze(scenarios);
}

async function loadScenarioCase(input: ProtocolScenarioInput): Promise<ScenarioCase> {
  if (input.fixtureId !== undefined) return fixtureScenarioCase(input.fixtureId);
  return fileScenarioCase(input.path);
}

function fixtureScenarioCase(fixtureId: string): ScenarioCase {
  const fixture = FIXTURES[fixtureId];
  if (fixture === undefined) throw new TypeError(`protocol fixture is unavailable: ${fixtureId}`);
  return Object.freeze({
    scenario: fixture,
    scenarioId: fixture.scenarioId,
    source: `fixture:${fixtureId}`
  });
}

async function fileScenarioCase(path: string): Promise<ScenarioCase> {
  const source = resolve(path);
  const scenario = validateScenario(JSON.parse(await readFile(source, "utf8")));
  return Object.freeze({ scenario, scenarioId: scenario.scenarioId, source });
}

function assertScenarioCases(scenarios: readonly ScenarioCase[]): void {
  if (scenarios.length === 0)
    throw new TypeError("protocol must contain at least one scenario input");
  if (new Set(scenarios.map(({ scenarioId }) => scenarioId)).size !== scenarios.length)
    throw new TypeError("protocol scenario IDs must be unique");
}

export async function loadArtifact(directory: string): Promise<Artifact> {
  const artifactDirectory = resolve(directory);
  const entryPath = resolve(artifactDirectory, "index.mjs");
  const manifestPath = resolve(artifactDirectory, "package.json");
  const [entry, manifest, packageContentsSha256] = await Promise.all([
    readRegularFile(entryPath, "entry"),
    readRegularFile(manifestPath, "manifest"),
    packageContentsHash(artifactDirectory)
  ]);
  const manifestValue: unknown = JSON.parse(manifest);
  if (!isPackageManifest(manifestValue))
    throw new TypeError(`artifact manifest is invalid: ${artifactDirectory}`);
  const module: unknown = await import(pathToFileURL(entryPath).href);
  if (!isPublicArtifactModule(module))
    throw new TypeError(`artifact does not export learned strategy factory: ${artifactDirectory}`);
  return Object.freeze({
    directory: artifactDirectory,
    factory: module.createLearnedCriticalPathStrategy,
    identity: Object.freeze({
      entrySha256: `sha256:${createHash("sha256").update(entry).digest("hex")}`,
      packageContentsSha256,
      packageName: "@zxyycom/vibe-check" as const,
      packageVersion: manifestValue.version
    })
  });
}

async function readRegularFile(path: string, label: string): Promise<string> {
  const info = await stat(path);
  if (!info.isFile()) throw new TypeError(`artifact ${label} must be a regular file`);
  return readFile(path, "utf8");
}

/** Hashes the supplied published directory, so re-export stubs cannot hide implementation changes. */
async function packageContentsHash(directory: string): Promise<string> {
  const files = await regularFiles(directory);
  const hash = createHash("sha256");
  for (const path of files) {
    hash.update(path.slice(directory.length + 1), "utf8");
    hash.update("\0", "utf8");
    hash.update(await readFile(path));
    hash.update("\0", "utf8");
  }
  return `sha256:${hash.digest("hex")}`;
}

async function regularFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await regularFiles(path)));
    else if (entry.isFile()) files.push(path);
    else throw new TypeError(`artifact contains non-regular entry: ${path}`);
  }
  return files;
}

export function parseInvocation(args: readonly string[]): EvaluationInvocation {
  if (!hasValidInvocationShape(args)) throw new TypeError(usage());
  return Object.freeze({
    baselineArtifactPath: args[1],
    candidateArtifactPath: args[3],
    outputPath: args[5]
  });
}

function hasValidInvocationShape(
  args: readonly string[]
): args is readonly [string, string, string, string, string, string] {
  return (
    args.length === 6 &&
    args[0] === "--baseline-artifact" &&
    args[2] === "--candidate-artifact" &&
    args[4] === "--out" &&
    args[1] !== undefined &&
    args[3] !== undefined &&
    args[5] !== undefined
  );
}

function usage(): string {
  return "usage: learned-heuristic-evaluation --baseline-artifact DIR --candidate-artifact DIR --out new-evidence.json";
}

export async function writeExclusive(path: string, text: string): Promise<void> {
  await writeFile(resolve(path), text, { encoding: "utf8", flag: "wx" });
}

/** Validates the frozen protocol's consumed fields before any artifact or simulation work. */
export function parseEvaluationProtocol(value: unknown): Protocol {
  const protocol = protocolRecord(value, "protocol");
  if (protocol.schemaVersion !== 2) throw new TypeError("protocol.schemaVersion must be 2");
  if (typeof protocol.protocolId !== "string" || protocol.protocolId.length === 0)
    throw new TypeError("protocol.protocolId must be a non-empty string");
  if (!Array.isArray(protocol.scenarioInputs) || protocol.scenarioInputs.length === 0)
    throw new TypeError("protocol.scenarioInputs must be a non-empty array");
  const scenarioInputs = protocol.scenarioInputs.map(parseProtocolScenarioInput);
  const hostCost = protocolRecord(protocol.hostCost, "protocol.hostCost");
  const comparison = protocolRecord(protocol.virtualComparison, "protocol.virtualComparison");
  const secondary = protocolRecord(comparison.secondary, "protocol.virtualComparison.secondary");
  if (!isStringArray(secondary.improvementEligibleScenarioIds))
    throw new TypeError(
      "protocol.virtualComparison.secondary.improvementEligibleScenarioIds must be a string array"
    );
  return Object.freeze({
    hostCost: Object.freeze({
      corpusIterations: protocolInteger(
        hostCost.corpusIterations,
        "protocol.hostCost.corpusIterations",
        1
      ),
      samples: protocolInteger(hostCost.samples, "protocol.hostCost.samples", 1),
      warmups: protocolInteger(hostCost.warmups, "protocol.hostCost.warmups", 0)
    }),
    protocolId: protocol.protocolId,
    scenarioInputs: Object.freeze(scenarioInputs),
    schemaVersion: 2,
    virtualComparison: Object.freeze({
      replicates: protocolInteger(
        comparison.replicates,
        "protocol.virtualComparison.replicates",
        1
      ),
      seed: protocolInteger(comparison.seed, "protocol.virtualComparison.seed", 0),
      secondary: Object.freeze({
        improvementEligibleScenarioIds: Object.freeze([...secondary.improvementEligibleScenarioIds])
      })
    })
  });
}

function parseProtocolScenarioInput(value: unknown, index: number): ProtocolScenarioInput {
  const field = `protocol.scenarioInputs[${index}]`;
  const input = protocolRecord(value, field);
  if (typeof input.fixtureId === "string" && input.fixtureId.length > 0 && input.path === undefined)
    return Object.freeze({ fixtureId: input.fixtureId });
  if (typeof input.path === "string" && input.path.length > 0 && input.fixtureId === undefined)
    return Object.freeze({ path: input.path });
  throw new TypeError(`${field} must name exactly one non-empty fixtureId or path`);
}

function protocolRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isNonArrayRecord(value)) throw new TypeError(`${field} must be an object`);
  return value;
}

function protocolInteger(value: unknown, field: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum)
    throw new TypeError(`${field} must be a safe integer >= ${minimum}`);
  return value;
}

function isPackageManifest(
  value: unknown
): value is Readonly<{ readonly name: string; readonly version: string }> {
  return (
    isNonArrayRecord(value) &&
    value.name === "@zxyycom/vibe-check" &&
    typeof value.version === "string" &&
    value.version.length > 0
  );
}

function isPublicArtifactModule(value: unknown): value is Readonly<{
  readonly createLearnedCriticalPathStrategy: LearnedStrategyFactory;
}> {
  return isNonArrayRecord(value) && typeof value.createLearnedCriticalPathStrategy === "function";
}

import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { FIXTURES } from "./fixture-registry.ts";
import type {
  Artifact,
  EvaluationInvocation,
  Protocol,
  ProtocolScenarioInput,
  ScenarioCase
} from "./learned-heuristic-evaluation-types.ts";
import type { LearnedStrategyFactory } from "./policy.ts";
import { validateScenario } from "./scenario.ts";

const PROTOCOL_PATH =
  "scripts/project/admission-workbench/learned-heuristic-evaluation.protocol.json";

export async function loadProtocol(): Promise<
  Readonly<{ readonly protocol: Protocol; readonly sha256: string }>
> {
  const text = await readFile(PROTOCOL_PATH, "utf8");
  const parsed: unknown = JSON.parse(text);
  if (!isProtocol(parsed))
    throw new TypeError("heuristic evaluation protocol has an invalid shape");
  return Object.freeze({
    protocol: parsed,
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
  if (input.path !== undefined) return fileScenarioCase(input.path);
  throw new TypeError("protocol scenario input must name exactly one fixture or JSON path");
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

function isProtocol(value: unknown): value is Protocol {
  return (
    isProtocolObject(value) && hasProtocolScenarioInputs(value) && hasProtocolMeasurements(value)
  );
}

function isProtocolObject(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.schemaVersion === 2 &&
    typeof value.protocolId === "string" &&
    isRecord(value.hostCost) &&
    isRecord(value.virtualComparison) &&
    isRecord(value.virtualComparison.secondary)
  );
}

function hasProtocolScenarioInputs(value: Record<string, unknown>): boolean {
  return Array.isArray(value.scenarioInputs) && value.scenarioInputs.every(isProtocolScenarioInput);
}

function isProtocolScenarioInput(value: unknown): boolean {
  return (
    isRecord(value) && (typeof value.fixtureId === "string") !== (typeof value.path === "string")
  );
}

function hasProtocolMeasurements(value: Record<string, unknown>): boolean {
  const records = protocolMeasurementRecords(value);
  return (
    records !== undefined &&
    hasHostCostMeasurements(records.hostCost) &&
    hasVirtualMeasurements(records.comparison)
  );
}

function protocolMeasurementRecords(value: Record<string, unknown>):
  | Readonly<{
      readonly comparison: Record<string, unknown>;
      readonly hostCost: Record<string, unknown>;
    }>
  | undefined {
  const hostCost = value.hostCost;
  const comparison = value.virtualComparison;
  if (!isRecord(hostCost) || !isRecord(comparison) || !isRecord(comparison.secondary))
    return undefined;
  return Object.freeze({ comparison, hostCost });
}

function hasHostCostMeasurements(value: Record<string, unknown>): boolean {
  return (
    isFiniteNumber(value.corpusIterations) &&
    isFiniteNumber(value.samples) &&
    isFiniteNumber(value.warmups)
  );
}

function hasVirtualMeasurements(value: Record<string, unknown>): boolean {
  return (
    isFiniteNumber(value.replicates) &&
    isFiniteNumber(value.seed) &&
    isRecord(value.secondary) &&
    Array.isArray(value.secondary.improvementEligibleScenarioIds)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPackageManifest(
  value: unknown
): value is Readonly<{ readonly name: string; readonly version: string }> {
  return (
    isRecord(value) &&
    value.name === "@zxyycom/vibe-check" &&
    typeof value.version === "string" &&
    value.version.length > 0
  );
}

function isPublicArtifactModule(value: unknown): value is Readonly<{
  readonly createLearnedCriticalPathStrategy: LearnedStrategyFactory;
}> {
  return isRecord(value) && typeof value.createLearnedCriticalPathStrategy === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

import type { DuplicateDetectionScannerOptions } from "./options.ts";
import {
  loadScanCacheEntry,
  writeScanCacheEntry,
  type DuplicateCodeCacheIdentity
} from "./cache/cache.ts";
import { runBoundedTasks } from "./jscpd/parallel.ts";
import { scanWithJscpdAsync } from "./jscpd/scanner.ts";
import { isDefaultJscpdCommand } from "./jscpd/default-command.ts";
import { toScopedJscpdMeasurements } from "./jscpd/scoped-fragments.ts";
import { checkJscpd } from "./jscpd/availability.ts";
import { acceptExactInputMeasurements } from "../project-files/exact-input-measurement.ts";
import type { CodeAreaFingerprint } from "../project-files/code-area-classification.ts";
import type { DuplicateCodeFragment } from "./measurement-model.ts";
import type {
  DuplicateDetectionAreaInput,
  DuplicateDetectionExactInputSet,
  DuplicateMeasurementInput,
  DuplicateDetectionSemantics
} from "./execution.ts";
import { isValidDuplicateFragment } from "./records.ts";

export type DuplicateMeasurementResult = Readonly<
  | { fragments: readonly DuplicateCodeFragment[]; kind: "complete" }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "cache-write-failed" }
  | { kind: "unavailable" }
>;

type AreaMeasurementResult = Readonly<
  | { fragments: readonly DuplicateCodeFragment[]; kind: "complete" }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "cache-write-failed" }
>;

interface AreaMeasurementInput {
  readonly area: DuplicateDetectionAreaInput;
  readonly cache: DuplicateMeasurementInput["cache"];
  readonly cacheRootDir: string;
  readonly commitSha: string;
  readonly configVersion: string;
  readonly dependency: DuplicateDetectionScannerOptions;
  readonly rootDir: string;
  readonly toolVersion: string;
}

export async function measureDuplicateDetection(
  options: DuplicateMeasurementInput
): Promise<DuplicateMeasurementResult> {
  const cache = options.cache;
  const { dependency, input, semantics } = options;
  if (!validAreaInputs(input.areas)) {
    return Object.freeze({ kind: "invalid-result" });
  }
  const areas = measurableAreas(input.areas);
  if (areas.length === 0) {
    return Object.freeze({ kind: "complete", fragments: Object.freeze([]) });
  }
  const availability = await checkJscpd(input.rootDir, dependency);
  if (!availability.available) {
    return Object.freeze({ kind: "unavailable" });
  }
  return measureAreas({
    areas,
    cache,
    dependency,
    input,
    semantics,
    toolVersion: availability.version ?? "unknown"
  });
}

function measurableAreas(
  areas: readonly DuplicateDetectionAreaInput[]
): DuplicateDetectionAreaInput[] {
  return areas
    .filter((area) => area.approvedExactPaths.length >= 2)
    .sort((left, right) => compareText(left.codeArea, right.codeArea));
}

async function measureAreas(
  options: Readonly<{
    areas: readonly DuplicateDetectionAreaInput[];
    cache: DuplicateMeasurementInput["cache"];
    dependency: DuplicateDetectionScannerOptions;
    input: DuplicateDetectionExactInputSet;
    semantics: DuplicateDetectionSemantics;
    toolVersion: string;
  }>
): Promise<DuplicateMeasurementResult> {
  let areaResults: AreaMeasurementResult[];
  try {
    areaResults = await runBoundedTasks(
      [...options.areas],
      options.dependency.maxConcurrency,
      (area) =>
        measureArea({
          area,
          cache: options.cache,
          cacheRootDir: options.input.cacheRootDir,
          commitSha: options.input.commitSha,
          configVersion: options.semantics.configVersion,
          dependency: options.dependency,
          rootDir: options.input.rootDir,
          toolVersion: options.toolVersion
        })
    );
  } catch {
    return Object.freeze({ kind: "execution-failed" });
  }
  if (areaResults.some((result) => result.kind === "execution-failed")) {
    return Object.freeze({ kind: "execution-failed" });
  }
  if (areaResults.some((result) => result.kind === "cache-write-failed")) {
    return Object.freeze({ kind: "cache-write-failed" });
  }
  if (areaResults.some((result) => result.kind === "invalid-result")) {
    return Object.freeze({ kind: "invalid-result" });
  }
  const fragments = areaResults.flatMap((result) =>
    result.kind === "complete" ? result.fragments : []
  );
  return Object.freeze({ kind: "complete", fragments: Object.freeze(fragments) });
}

function validAreaInputs(areas: readonly DuplicateDetectionAreaInput[]): boolean {
  const codeAreas = new Set<string>();
  for (const area of areas) {
    if (!isValidAreaInput(area) || codeAreas.has(area.codeArea)) {
      return false;
    }
    codeAreas.add(area.codeArea);
  }
  return true;
}

function isValidAreaInput(area: DuplicateDetectionAreaInput): boolean {
  return (
    typeof area.codeArea === "string" &&
    area.codeArea.length > 0 &&
    Number.isSafeInteger(area.minimumTokens) &&
    area.minimumTokens >= 0 &&
    validFingerprint(area.inputFingerprint) &&
    area.approvedExactPaths.every((path) => typeof path === "string" && path.length > 0)
  );
}

function validFingerprint(fingerprint: DuplicateDetectionAreaInput["inputFingerprint"]): boolean {
  return (
    Number.isSafeInteger(fingerprint.fileCount) &&
    fingerprint.fileCount >= 0 &&
    Array.isArray(fingerprint.fileList) &&
    fingerprint.fileList.every((path) => typeof path === "string") &&
    typeof fingerprint.fingerprint === "string" &&
    fingerprint.fingerprint.length > 0
  );
}

async function measureArea(input: AreaMeasurementInput): Promise<AreaMeasurementResult> {
  const files = uniqueSorted(input.area.approvedExactPaths);
  const identity = createCacheIdentity(input);
  if (input.cache.enabled) {
    const cachedFragments = loadValidCachedFragments(input, identity, files);
    if (cachedFragments !== null) {
      return Object.freeze({ kind: "complete", fragments: cachedFragments });
    }
  }
  return scanAndCacheArea(input, identity, files);
}

function loadValidCachedFragments(
  input: AreaMeasurementInput,
  identity: DuplicateCodeCacheIdentity,
  files: readonly string[]
): readonly DuplicateCodeFragment[] | null {
  const cached = loadScanCacheEntry({ rootDir: input.cacheRootDir, identity });
  if (!cached.hit) {
    return null;
  }
  const accepted = acceptExactInputMeasurements(toScopedJscpdMeasurements(cached.metrics), files);
  if (!accepted.ok || !accepted.payloads.every(isValidDuplicateFragment)) {
    return null;
  }
  return Object.freeze(withCodeArea(accepted.payloads, input.area.codeArea));
}

async function scanAndCacheArea(
  input: AreaMeasurementInput,
  identity: DuplicateCodeCacheIdentity,
  files: readonly string[]
): Promise<AreaMeasurementResult> {
  const result = await scanWithJscpdAsync({
    cwd: input.rootDir,
    dependency: input.dependency,
    files: [...files],
    minimumTokens: input.area.minimumTokens
  });
  if (!result.ok) {
    return Object.freeze({
      kind: result.reason === "jscpd-execution-error" ? "execution-failed" : "invalid-result"
    });
  }
  const accepted = acceptExactInputMeasurements(result.measurements, files);
  if (!accepted.ok || !accepted.payloads.every(isValidDuplicateFragment)) {
    return Object.freeze({ kind: "invalid-result" });
  }
  const fragments = withCodeArea(accepted.payloads, input.area.codeArea);
  if (input.cache.enabled) {
    try {
      writeScanCacheEntry({ rootDir: input.cacheRootDir, identity, metrics: fragments });
    } catch {
      return Object.freeze({ kind: "cache-write-failed" });
    }
  }
  return Object.freeze({ kind: "complete", fragments: Object.freeze(fragments) });
}

function createCacheIdentity(input: AreaMeasurementInput): DuplicateCodeCacheIdentity {
  return Object.freeze({
    toolName: "jscpd",
    toolVersion: input.toolVersion,
    normalizedToolArgs: Object.freeze(jscpdCacheArgs(input.dependency, input.area.minimumTokens)),
    configVersion: input.configVersion,
    codeArea: input.area.codeArea,
    commitSha: input.commitSha,
    inputFingerprint: {
      fileCount: input.area.inputFingerprint.fileCount,
      fileList: [...input.area.inputFingerprint.fileList],
      fingerprint: input.area.inputFingerprint.fingerprint
    } satisfies CodeAreaFingerprint
  });
}

export function jscpdCacheArgs(
  dependency: DuplicateDetectionScannerOptions,
  minimumTokens: number
): readonly string[] {
  const command = isDefaultJscpdCommand(dependency)
    ? ["<bun>", "<package-jscpd-bin>"]
    : [normalizedJscpdCommandForCache(dependency.executable), ...dependency.args];
  return [
    ...command,
    "--config",
    "<jscpd-config-with-input-fingerprint>",
    "--min-tokens",
    String(minimumTokens),
    "--reporters",
    "json",
    "--absolute"
  ];
}

function normalizedJscpdCommandForCache(command: string): string {
  const normalized = command.split("\\").join("/");
  return normalized.endsWith("/node_modules/.bin/jscpd") ||
    normalized.endsWith("/node_modules/.bin/jscpd.cmd")
    ? "<repo-local-jscpd-bin>"
    : command;
}

function withCodeArea(
  fragments: readonly DuplicateCodeFragment[],
  codeArea: string
): DuplicateCodeFragment[] {
  return fragments.map((fragment) => ({
    ...fragment,
    codeAreas: [codeArea],
    locations: fragment.locations.map((location) => ({ ...location, codeArea }))
  }));
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

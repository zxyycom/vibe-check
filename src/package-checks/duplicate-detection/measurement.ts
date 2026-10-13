import { acceptExactInputMeasurements } from "../project-files/exact-input-measurement.ts";
import { applyDuplicateAreaPolicy } from "./area-policy.ts";
import {
  loadScanCacheEntry,
  writeScanCacheEntry,
  type DuplicateCodeCacheIdentity
} from "./cache/store.ts";
import { prepareDuplicateScanCache, type PreparedDuplicateScanCache } from "./cache/identity.ts";
import { checkJscpd } from "./jscpd/availability.ts";
import { scanWithJscpdAsync } from "./jscpd/scanner.ts";
import { toScopedJscpdMeasurements } from "./jscpd/scoped-fragments.ts";
import type {
  DuplicateCodeFragment,
  DuplicateDetectionAreaInput,
  DuplicateDetectionExactInputSet,
  DuplicateMeasurementInput
} from "./measurement-model.ts";
import type { ResolvedDuplicateDetectionScannerOptions } from "./options.ts";
import { isValidDuplicateFragment } from "./records.ts";

export type DuplicateMeasurementResult = Readonly<
  | { fragments: readonly DuplicateCodeFragment[]; kind: "complete" }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "cache-write-failed" }
  | { kind: "unavailable" }
  | { kind: "source-unavailable" }
>;

type RawMeasurementResult = Readonly<
  | { fragments: readonly DuplicateCodeFragment[]; kind: "complete" }
  | { kind: "execution-failed" }
  | { kind: "invalid-result" }
  | { kind: "cache-write-failed" }
  | { kind: "source-unavailable" }
>;

interface RawScopeMeasurementInput {
  readonly cache: DuplicateMeasurementInput["cache"];
  readonly dependency: ResolvedDuplicateDetectionScannerOptions;
  readonly exactInput: DuplicateDetectionExactInputSet;
  readonly minimumLines: number;
  readonly minimumTokens: number;
  readonly toolVersion: string;
}

export async function measureDuplicateDetection(
  options: DuplicateMeasurementInput
): Promise<DuplicateMeasurementResult> {
  const { dependency, exactInput } = options;
  if (!validMeasurementInput(exactInput)) {
    return Object.freeze({ kind: "invalid-result" });
  }
  const availability = await checkJscpd(exactInput.rootDir, dependency);
  if (!availability.available) {
    return Object.freeze({ kind: "unavailable" });
  }

  const minimumLines = Math.min(...exactInput.areas.map((area) => area.minimumLines));
  const minimumTokens = Math.min(...exactInput.areas.map((area) => area.minimumTokens));
  const rawMeasurement = await measureRawScope({
    cache: options.cache,
    dependency,
    exactInput,
    minimumLines,
    minimumTokens,
    toolVersion: availability.version
  });
  if (rawMeasurement.kind !== "complete") return rawMeasurement;

  const fragments = applyDuplicateAreaPolicy(rawMeasurement.fragments, exactInput.areas);
  return fragments === undefined
    ? Object.freeze({ kind: "invalid-result" })
    : Object.freeze({ fragments, kind: "complete" });
}

function validMeasurementInput(exactInput: DuplicateDetectionExactInputSet): boolean {
  const approvedExactPaths = exactInput.approvedExactPaths;
  if (!hasValidScanScope(exactInput) || !hasValidApprovedPaths(exactInput)) return false;

  const approvedPathSet = new Set(approvedExactPaths);
  const coveredPathSet = new Set<string>();
  const codeAreaSet = new Set<string>();
  for (const area of exactInput.areas) {
    if (!isValidAreaInput(area) || codeAreaSet.has(area.codeArea)) return false;
    codeAreaSet.add(area.codeArea);
    for (const path of area.approvedExactPaths) {
      if (!approvedPathSet.has(path)) return false;
      coveredPathSet.add(path);
    }
  }
  return coveredPathSet.size === approvedPathSet.size;
}

function hasValidScanScope(exactInput: DuplicateDetectionExactInputSet): boolean {
  return exactInput.approvedExactPaths.length >= 2 && nonEmptyString(exactInput.rootDir);
}

function hasValidApprovedPaths(exactInput: DuplicateDetectionExactInputSet): boolean {
  const paths = exactInput.approvedExactPaths;
  return paths.every(nonEmptyString) && sameStrings(paths, uniqueSorted(paths));
}

function isValidAreaInput(area: DuplicateDetectionAreaInput): boolean {
  return (
    nonEmptyString(area.codeArea) &&
    positiveSafeInteger(area.minimumLines) &&
    positiveSafeInteger(area.minimumTokens) &&
    area.approvedExactPaths.length > 0 &&
    area.approvedExactPaths.every(nonEmptyString) &&
    sameStrings(area.approvedExactPaths, uniqueSorted(area.approvedExactPaths))
  );
}

async function measureRawScope(input: RawScopeMeasurementInput): Promise<RawMeasurementResult> {
  const exactPaths = input.exactInput.approvedExactPaths;
  let cache: PreparedDuplicateScanCache | null = null;
  if (input.cache.enabled) {
    try {
      cache = prepareDuplicateScanCache({ ...input, directory: input.cache.directory });
    } catch {
      return Object.freeze({ kind: "source-unavailable" });
    }
    const cachedFragments = loadValidCachedFragments(
      cache.cacheRootDir,
      cache.identity,
      exactPaths
    );
    if (cachedFragments !== null) {
      return Object.freeze({ fragments: cachedFragments, kind: "complete" });
    }
  }
  return scanAndCacheScope(input, cache, exactPaths);
}

function loadValidCachedFragments(
  cacheRootDir: string,
  identity: DuplicateCodeCacheIdentity,
  exactPaths: readonly string[]
): readonly DuplicateCodeFragment[] | null {
  const cached = loadScanCacheEntry({ rootDir: cacheRootDir, identity });
  if (!cached.hit) return null;
  const accepted = acceptExactInputMeasurements(
    toScopedJscpdMeasurements(cached.metrics),
    exactPaths
  );
  return accepted.ok && accepted.payloads.every(isValidDuplicateFragment)
    ? Object.freeze(accepted.payloads)
    : null;
}

async function scanAndCacheScope(
  input: RawScopeMeasurementInput,
  cache: PreparedDuplicateScanCache | null,
  exactPaths: readonly string[]
): Promise<RawMeasurementResult> {
  const result = await scanWithJscpdAsync({
    cwd: input.exactInput.rootDir,
    dependency: input.dependency,
    files: exactPaths,
    minimumLines: input.minimumLines,
    minimumTokens: input.minimumTokens
  });
  if (!result.ok) {
    return Object.freeze({
      kind: result.reason === "jscpd-execution-error" ? "execution-failed" : "invalid-result"
    });
  }

  const accepted = acceptExactInputMeasurements(result.measurements, exactPaths);
  if (!accepted.ok || !accepted.payloads.every(isValidDuplicateFragment)) {
    return Object.freeze({ kind: "invalid-result" });
  }
  const fragments = Object.freeze(accepted.payloads);
  if (cache !== null) {
    try {
      writeScanCacheEntry({
        rootDir: cache.cacheRootDir,
        identity: cache.identity,
        metrics: [...fragments]
      });
    } catch {
      return Object.freeze({ kind: "cache-write-failed" });
    }
  }
  return Object.freeze({ fragments, kind: "complete" });
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

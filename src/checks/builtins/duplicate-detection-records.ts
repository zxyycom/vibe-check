import { createHash } from "node:crypto";

import type {
  DuplicateCodeFragment,
  DuplicateCodeLocation
} from "../configuration/metric-contract.ts";
import { canonicalJsonBytes } from "../../foundation/canonical-data.ts";
import { compareText } from "./execution-support.ts";
import type { DuplicateDetectionSemantics } from "./duplicate-detection.ts";

export interface DuplicateRecordCandidate {
  readonly data: Readonly<{
    readonly codeAreas: readonly string[];
    readonly lineCount: number;
    readonly locations: readonly Readonly<{
      readonly endLine: number;
      readonly path: string;
      readonly startLine: number;
    }>[];
    readonly metric: "duplicate-tokens";
    readonly tokenCount: number;
  }>;
  readonly id: string;
}

/** Builds Check-owned supplemental facts without adding a Product record catalog. */
export function buildDuplicateRecordCandidates(
  fragments: readonly DuplicateCodeFragment[],
  semantics: DuplicateDetectionSemantics
): readonly DuplicateRecordCandidate[] | undefined {
  const ids = duplicateIdsInOrder(fragments);
  if (ids === undefined) return undefined;

  const candidates: DuplicateRecordCandidate[] = [];
  for (const [index, fragment] of fragments.entries()) {
    const candidate = createDuplicateRecordCandidate(fragment, ids[index], semantics);
    if (candidate === undefined) return undefined;
    if (candidate !== null) candidates.push(candidate);
  }
  candidates.sort((left, right) => compareText(left.id, right.id));
  return Object.freeze(candidates);
}

function createDuplicateRecordCandidate(
  fragment: DuplicateCodeFragment,
  id: string | undefined,
  semantics: DuplicateDetectionSemantics
): DuplicateRecordCandidate | null | undefined {
  if (!isValidDuplicateFragment(fragment) || id === undefined) return undefined;

  const locations = sortedLocations(fragment.locations);
  const codeAreas = uniqueSorted(locations.map((location) => location.codeArea));
  if (
    codeAreas.length > 0 &&
    codeAreas.every(
      (codeArea) => semantics.codeAreas[codeArea]?.warningPolicy === "exclude-warnings"
    )
  ) {
    return null;
  }

  return Object.freeze({
    id,
    data: Object.freeze({
      codeAreas: Object.freeze(codeAreas),
      lineCount: fragment.lineCount,
      locations: Object.freeze(
        locations.map((location) =>
          Object.freeze({
            endLine: location.endLine,
            path: location.path,
            startLine: location.startLine
          })
        )
      ),
      metric: "duplicate-tokens",
      tokenCount: fragment.tokenCount
    })
  });
}

export function isValidDuplicateFragment(fragment: DuplicateCodeFragment): boolean {
  const validMeasurements =
    Number.isSafeInteger(fragment.id) &&
    fragment.id >= 0 &&
    Number.isSafeInteger(fragment.lineCount) &&
    fragment.lineCount >= 0 &&
    Number.isSafeInteger(fragment.tokenCount) &&
    fragment.tokenCount >= 0;
  return (
    validMeasurements &&
    Array.isArray(fragment.locations) &&
    fragment.locations.length >= 2 &&
    fragment.locations.every(isValidLocation)
  );
}

function isValidLocation(location: DuplicateCodeLocation): boolean {
  const validPath =
    typeof location.path === "string" &&
    location.path.length > 0 &&
    typeof location.codeArea === "string" &&
    location.codeArea.length > 0;
  const validLines =
    Number.isSafeInteger(location.startLine) &&
    location.startLine >= 1 &&
    Number.isSafeInteger(location.endLine) &&
    location.endLine >= location.startLine;
  return validPath && validLines;
}

function duplicateIdsInOrder(
  fragments: readonly DuplicateCodeFragment[]
): readonly string[] | undefined {
  const occurrences = new Map<string, number>();
  const ids: string[] = [];
  for (const fragment of fragments) {
    if (!isValidDuplicateFragment(fragment)) return undefined;
    const fingerprint = duplicateFingerprint(fragment);
    const occurrence = (occurrences.get(fingerprint) ?? 0) + 1;
    occurrences.set(fingerprint, occurrence);
    ids.push(`duplicate-fragment/v1/sha256:${fingerprint}/occurrence:${occurrence}`);
  }
  return Object.freeze(ids);
}

function duplicateFingerprint(fragment: DuplicateCodeFragment): string {
  return createHash("sha256")
    .update(
      canonicalJsonBytes({
        lineCount: fragment.lineCount,
        paths: uniqueSorted(fragment.locations.map((location) => location.path)),
        tokenCount: fragment.tokenCount
      })
    )
    .digest("hex");
}

function sortedLocations(locations: readonly DuplicateCodeLocation[]): DuplicateCodeLocation[] {
  return [...locations].sort((left, right) =>
    compareText(locationSortKey(left), locationSortKey(right))
  );
}

function locationSortKey(location: DuplicateCodeLocation): string {
  const startLine = String(location.startLine).padStart(12, "0");
  const endLine = String(location.endLine).padStart(12, "0");
  return `${location.path}\u0000${startLine}\u0000${endLine}`;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

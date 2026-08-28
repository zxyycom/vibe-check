import { createHash } from "node:crypto";

import { canonicalJsonBytes } from "../../data-boundary/canonical-data.ts";
import type { DuplicateCodeFragment, DuplicateCodeLocation } from "./measurement-model.ts";

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
  fragments: readonly DuplicateCodeFragment[]
): readonly DuplicateRecordCandidate[] | undefined {
  const ids = duplicateIdsInOrder(fragments);
  if (ids === undefined) return undefined;

  const candidates: DuplicateRecordCandidate[] = [];
  for (const [index, fragment] of fragments.entries()) {
    const candidate = createDuplicateRecordCandidate(fragment, ids[index]);
    if (candidate === undefined) return undefined;
    candidates.push(candidate);
  }
  candidates.sort((left, right) => compareText(left.id, right.id));
  return Object.freeze(candidates);
}

function createDuplicateRecordCandidate(
  fragment: DuplicateCodeFragment,
  id: string | undefined
): DuplicateRecordCandidate | undefined {
  if (!isValidDuplicateFragment(fragment) || id === undefined) return undefined;

  const locations = sortedLocations(fragment.locations);
  const codeAreas = uniqueSorted(fragment.codeAreas);
  if (codeAreas.length === 0 || !sameStrings(codeAreas, fragment.codeAreas)) return undefined;

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
    fragment.locations.every(isValidLocation) &&
    Array.isArray(fragment.codeAreas) &&
    fragment.codeAreas.every(nonEmptyString)
  );
}

function isValidLocation(location: DuplicateCodeLocation): boolean {
  const validPath = typeof location.path === "string" && location.path.length > 0;
  const validLines =
    Number.isSafeInteger(location.startLine) &&
    location.startLine >= 1 &&
    Number.isSafeInteger(location.endLine) &&
    location.endLine >= location.startLine;
  return validPath && validLines;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
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

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

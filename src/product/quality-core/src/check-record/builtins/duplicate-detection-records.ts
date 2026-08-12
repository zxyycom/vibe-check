import { createHash } from "node:crypto";

import type {
  CodeAreaDefinition,
  DuplicateCodeFragment,
  DuplicateCodeLocation
} from "../../model/schema.ts";
import { canonicalJsonBytes } from "../identity.ts";
import type { QualityRecordCandidate, RecordLevel } from "../model.ts";
import { compareText, type RelationId } from "./builtin-support.ts";
import type { DuplicateDetectionSemantics } from "./duplicate-detection.ts";

export interface DuplicateRecordCandidate {
  readonly isChanged: boolean;
  readonly record: QualityRecordCandidate;
  readonly subject: string;
}

export function buildDuplicateRecordCandidates(
  fragments: readonly DuplicateCodeFragment[],
  semantics: DuplicateDetectionSemantics
): readonly DuplicateRecordCandidate[] | undefined {
  const subjects = duplicateSubjectsInOrder(fragments);
  if (subjects === undefined) {
    return undefined;
  }
  const candidates: DuplicateRecordCandidate[] = [];
  for (const [index, fragment] of fragments.entries()) {
    const candidate = createDuplicateRecordCandidate(fragment, subjects[index], semantics);
    if (candidate === undefined) {
      return undefined;
    }
    if (candidate !== null) {
      candidates.push(candidate);
    }
  }
  candidates.sort((left, right) => compareText(left.subject, right.subject));
  return Object.freeze(candidates);
}

function createDuplicateRecordCandidate(
  fragment: DuplicateCodeFragment,
  subject: string | undefined,
  semantics: DuplicateDetectionSemantics
): DuplicateRecordCandidate | null | undefined {
  if (!isValidDuplicateFragment(fragment) || subject === undefined) {
    return undefined;
  }
  const locations = sortedLocations(fragment.locations);
  const codeAreas = uniqueSorted(locations.map((location) => location.codeArea));
  const level = duplicateRecordLevel(codeAreas, semantics.codeAreas);
  if (level === null) {
    return null;
  }
  const primaryLocation = locations[0];
  if (primaryLocation === undefined) {
    return undefined;
  }
  return Object.freeze({
    isChanged: fragment.hitsChangedScope,
    subject,
    record: createDuplicateQualityRecord({
      codeAreas,
      fragment,
      level,
      locations,
      primaryLocation,
      subject
    })
  });
}

function createDuplicateQualityRecord(input: Readonly<{
  codeAreas: readonly string[];
  fragment: DuplicateCodeFragment;
  level: RecordLevel;
  locations: readonly DuplicateCodeLocation[];
  primaryLocation: DuplicateCodeLocation;
  subject: string;
}>): QualityRecordCandidate {
  const suggestion = `Consider extracting shared code into a common function or module. Locations: ${input.locations.map(formatLocation).join(", ")}`;
  return Object.freeze({
    recordTypeId: "duplicate-code",
    level: input.level,
    semanticSubject: input.subject,
    message: `Duplicate code fragment (${input.fragment.tokenCount} tokens) across ${input.locations.length} locations in areas [${input.codeAreas.join(", ")}]`,
    fields: Object.freeze({
      codeArea: input.codeAreas.join(","),
      lineCount: input.fragment.lineCount,
      locationCount: input.locations.length,
      metric: "duplicate-tokens",
      suggestion,
      value: input.fragment.tokenCount
    }),
    location: Object.freeze({
      path: input.primaryLocation.path,
      line: input.primaryLocation.startLine,
      column: 1
    })
  });
}

export function duplicateSubjects(
  fragments: readonly DuplicateCodeFragment[]
): ReadonlySet<string> | undefined {
  const orderedSubjects = duplicateSubjectsInOrder(fragments);
  return orderedSubjects === undefined ? undefined : new Set(orderedSubjects);
}

export function isValidDuplicateFragment(fragment: DuplicateCodeFragment): boolean {
  const validMeasurements = Number.isSafeInteger(fragment.id) && fragment.id >= 0
    && Number.isSafeInteger(fragment.lineCount) && fragment.lineCount >= 0
    && Number.isSafeInteger(fragment.tokenCount) && fragment.tokenCount >= 0;
  return validMeasurements
    && Array.isArray(fragment.locations) && fragment.locations.length >= 2
    && fragment.locations.every(isValidLocation);
}

function isValidLocation(location: DuplicateCodeLocation): boolean {
  const validPath = typeof location.path === "string" && location.path.length > 0
    && typeof location.codeArea === "string" && location.codeArea.length > 0;
  const validLines = Number.isSafeInteger(location.startLine) && location.startLine >= 1
    && Number.isSafeInteger(location.endLine) && location.endLine >= location.startLine;
  return validPath && validLines;
}

function duplicateSubjectsInOrder(
  fragments: readonly DuplicateCodeFragment[]
): readonly string[] | undefined {
  const occurrences = new Map<string, number>();
  const subjects: string[] = [];
  for (const fragment of fragments) {
    if (!isValidDuplicateFragment(fragment)) {
      return undefined;
    }
    const fingerprint = duplicateFingerprint(fragment);
    const occurrence = (occurrences.get(fingerprint) ?? 0) + 1;
    occurrences.set(fingerprint, occurrence);
    subjects.push(`duplicate-fragment/v1/sha256:${fingerprint}/occurrence:${occurrence}`);
  }
  return Object.freeze(subjects);
}

function duplicateFingerprint(fragment: DuplicateCodeFragment): string {
  return createHash("sha256").update(canonicalJsonBytes({
    lineCount: fragment.lineCount,
    paths: uniqueSorted(fragment.locations.map((location) => location.path)),
    tokenCount: fragment.tokenCount
  })).digest("hex");
}

function sortedLocations(
  locations: readonly DuplicateCodeLocation[]
): DuplicateCodeLocation[] {
  return [...locations].sort((left, right) => compareText(
    locationSortKey(left),
    locationSortKey(right)
  ));
}

function locationSortKey(location: DuplicateCodeLocation): string {
  const startLine = String(location.startLine).padStart(12, "0");
  const endLine = String(location.endLine).padStart(12, "0");
  return `${location.path}\u0000${startLine}\u0000${endLine}`;
}

function duplicateRecordLevel(
  codeAreas: readonly string[],
  definitions: Readonly<Record<string, CodeAreaDefinition>>
): RecordLevel | null {
  if (codeAreas.length > 0 && codeAreas.every((codeArea) => (
    definitions[codeArea]?.warningPolicy === "exclude-warnings"
  ))) {
    return null;
  }
  return codeAreas.length > 0 && codeAreas.every((codeArea) => (
    definitions[codeArea]?.warningPolicy === "watchlist-only"
  ))
    ? "info"
    : "warning";
}

function formatLocation(location: DuplicateCodeLocation): string {
  return `${location.path}:${location.startLine}`;
}

export function buildDuplicateRelations(
  candidates: readonly DuplicateRecordCandidate[],
  referenceSubjects: ReadonlySet<string>,
  changedDelta: number
): Map<string, readonly RelationId[]> {
  const relations = new Map<string, readonly RelationId[]>();
  for (const candidate of candidates) {
    const relation = relationForCandidate(candidate, referenceSubjects, changedDelta);
    relations.set(candidate.subject, relation);
  }
  return relations;
}

function relationForCandidate(
  candidate: DuplicateRecordCandidate,
  referenceSubjects: ReadonlySet<string>,
  changedDelta: number
): readonly RelationId[] {
  if (!candidate.isChanged) {
    return Object.freeze([]);
  }
  const delta = referenceSubjects.has(candidate.subject) ? 0 : 1;
  return Object.freeze([delta > changedDelta ? "regression" : "changed"]);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

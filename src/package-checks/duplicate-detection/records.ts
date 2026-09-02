import { createHash } from "node:crypto";

import { canonicalJsonBytes } from "../../data-boundary/canonical-data.ts";
import type { MaterializedFindingWaiver } from "../../finding-waivers/reconciliation.ts";
import {
  buildHashedFindingWaiverAuditRecord,
  type FindingWaiverAuditRecordData,
  type FindingWaiverRecordAudit
} from "../code-quality-findings/finding-waiver-evidence.ts";
import { isBlockingFinding, type FindingPolicy } from "../code-quality-findings/policy.ts";
import {
  compareDuplicateFindingLocations,
  resolveDuplicateDetectionFindingIdentity
} from "./finding-waiver-identity.ts";
import type { DuplicateCodeFragment, DuplicateCodeLocation } from "./measurement-model.ts";
import type {
  DuplicateDetectionFindingIdentity,
  ResolvedDuplicateDetectionOptions
} from "./options.ts";

/** 一条可信重复片段 supplemental Record 的 data。 */
export type DuplicateDetectionFindingRecordData = Readonly<{
  readonly blocking: boolean;
  readonly codeAreas: readonly string[];
  readonly lineCount: number;
  readonly locations: readonly Readonly<{
    readonly endLine: number;
    readonly path: string;
    readonly startLine: number;
  }>[];
  readonly metric: "duplicate-tokens";
  readonly tokenCount: number;
  /** 精确匹配 waiver 时保留理由，并令该 finding 不再参与 actionable settlement。 */
  readonly waiver?: Readonly<{ readonly reason: string }>;
}>;

/** 未使用或过宽 duplicate-detection waiver 的 supplemental audit Record data。 */
export type DuplicateDetectionFindingWaiverAuditRecordData =
  FindingWaiverAuditRecordData<DuplicateDetectionFindingIdentity>;

/** duplicateDetection 发布的 normal finding 或 waiver-audit Record data。 */
export type DuplicateDetectionRecordData =
  | DuplicateDetectionFindingRecordData
  | DuplicateDetectionFindingWaiverAuditRecordData;

export interface DuplicateRecordCandidate {
  readonly data: DuplicateDetectionFindingRecordData;
  readonly id: string;
}

export function duplicateDetectionFindingIdentity(
  candidate: DuplicateRecordCandidate
): DuplicateDetectionFindingIdentity {
  return Object.freeze({
    locations: candidate.data.locations,
    metric: candidate.data.metric
  });
}

export function duplicateDetectionWaiverIdentity(
  waiver: MaterializedFindingWaiver
): DuplicateDetectionFindingIdentity {
  const identity = resolveDuplicateDetectionFindingIdentity(waiver.identity);
  if (identity === undefined) {
    throw new TypeError("duplicateDetection waiver identity must retain sorted valid locations");
  }
  return identity;
}

/** 为一项未使用或过宽 waiver 构造 Check-owned audit Record。 */
export function duplicateDetectionWaiverAuditRecord(audit: FindingWaiverRecordAudit): Readonly<{
  readonly data: DuplicateDetectionFindingWaiverAuditRecordData;
  readonly id: string;
}> {
  const identity = duplicateDetectionWaiverIdentity(audit.waiver);
  return buildHashedFindingWaiverAuditRecord(identity, audit);
}

/** Builds Check-owned supplemental facts without adding a Product record catalog. */
export function buildDuplicateRecordCandidates(
  fragments: readonly DuplicateCodeFragment[],
  codeAreas: ResolvedDuplicateDetectionOptions["codeAreas"]
): readonly DuplicateRecordCandidate[] | undefined {
  const ids = duplicateIdsInOrder(fragments);
  if (ids === undefined) return undefined;

  const candidates: DuplicateRecordCandidate[] = [];
  for (const [index, fragment] of fragments.entries()) {
    const candidate = createDuplicateRecordCandidate(fragment, ids[index], codeAreas);
    if (candidate === undefined) return undefined;
    candidates.push(candidate);
  }
  candidates.sort((left, right) => compareText(left.id, right.id));
  return Object.freeze(candidates);
}

function createDuplicateRecordCandidate(
  fragment: DuplicateCodeFragment,
  id: string | undefined,
  configuredAreas: ResolvedDuplicateDetectionOptions["codeAreas"]
): DuplicateRecordCandidate | undefined {
  if (!isValidDuplicateFragment(fragment) || id === undefined) return undefined;

  const locations = sortedLocations(fragment.locations);
  const codeAreas = uniqueSorted(fragment.codeAreas);
  if (codeAreas.length === 0 || !sameStrings(codeAreas, fragment.codeAreas)) return undefined;
  const findingPolicies: FindingPolicy[] = [];
  for (const areaId of codeAreas) {
    const area = configuredAreas[areaId];
    if (area === undefined) return undefined;
    findingPolicies.push(area.findingPolicy);
  }

  return Object.freeze({
    id,
    data: Object.freeze({
      blocking: isBlockingFinding(findingPolicies),
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
  return (
    hasValidFragmentMeasurements(fragment) &&
    Array.isArray(fragment.locations) &&
    fragment.locations.length >= 2 &&
    fragment.locations.every(isValidLocation) &&
    locationsAreDistinct(fragment.locations) &&
    Array.isArray(fragment.codeAreas) &&
    fragment.codeAreas.every(nonEmptyString)
  );
}

function locationsAreDistinct(locations: readonly DuplicateCodeLocation[]): boolean {
  return locations.every((location, index) =>
    locations
      .slice(index + 1)
      .every((other) => compareDuplicateFindingLocations(location, other) !== 0)
  );
}

function hasValidFragmentMeasurements(fragment: DuplicateCodeFragment): boolean {
  return (
    nonNegativeSafeInteger(fragment.id) &&
    nonNegativeSafeInteger(fragment.lineCount) &&
    nonNegativeSafeInteger(fragment.tokenCount)
  );
}

function nonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
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
  return [...locations].sort(compareDuplicateFindingLocations);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

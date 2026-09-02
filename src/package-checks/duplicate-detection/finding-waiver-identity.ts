import {
  snapshotClosedArray,
  snapshotClosedPolicyRecord
} from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { isNormalizedProjectRelativePath } from "../host-environment/path.ts";
import type {
  DuplicateDetectionFindingIdentity,
  DuplicateDetectionFindingLocation
} from "./options.ts";

export function resolveDuplicateDetectionFindingIdentity(
  value: unknown
): DuplicateDetectionFindingIdentity | undefined {
  const identity = snapshotClosedPolicyRecord(value, { required: ["locations", "metric"] });
  if (identity === undefined || identity.metric !== "duplicate-tokens") return undefined;
  const candidates = snapshotClosedArray(identity.locations);
  if (candidates === undefined || candidates.length < 2) return undefined;
  const locations: DuplicateDetectionFindingLocation[] = [];
  for (const candidate of candidates) {
    const resolved = resolveDuplicateFindingLocation(candidate);
    if (resolved === undefined) return undefined;
    const previous = locations.at(-1);
    if (previous !== undefined && compareDuplicateFindingLocations(previous, resolved) >= 0) {
      return undefined;
    }
    locations.push(resolved);
  }
  return Object.freeze({ locations: Object.freeze(locations), metric: "duplicate-tokens" });
}

function resolveDuplicateFindingLocation(
  value: unknown
): DuplicateDetectionFindingLocation | undefined {
  const location = snapshotClosedPolicyRecord(value, {
    required: ["endLine", "path", "startLine"]
  });
  if (
    location === undefined ||
    !isNormalizedProjectRelativePath(location.path) ||
    !isPositiveSafeInteger(location.startLine) ||
    !isPositiveSafeInteger(location.endLine) ||
    location.endLine < location.startLine
  ) {
    return undefined;
  }
  return Object.freeze({
    endLine: location.endLine,
    path: location.path,
    startLine: location.startLine
  });
}

export function compareDuplicateFindingLocations(
  left: DuplicateDetectionFindingLocation,
  right: DuplicateDetectionFindingLocation
): number {
  const pathOrder = compareText(left.path, right.path);
  if (pathOrder !== 0) return pathOrder;
  const startLineOrder = left.startLine - right.startLine;
  return startLineOrder === 0 ? left.endLine - right.endLine : startLineOrder;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

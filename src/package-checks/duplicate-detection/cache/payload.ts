import { isNonArrayRecord } from "../../../data-boundary/value-shapes.ts";
import type { DuplicateCodeFragment, DuplicateCodeLocation } from "../measurement-model.ts";
import { stableStringify } from "./key.ts";
import {
  SCAN_CACHE_VERSION,
  type DuplicateCodeCacheIdentity,
  type ScanCachePayload
} from "./cache-contract.ts";

export function isMatchingPayload(
  payload: unknown,
  identity: DuplicateCodeCacheIdentity,
  cacheKey: string
): payload is ScanCachePayload {
  if (!isNonArrayRecord(payload)) return false;

  return (
    cacheIdentityFieldsMatch(payload, identity, cacheKey) &&
    cacheStructuredFieldsMatch(payload, identity)
  );
}

export function isMetricArray(value: unknown): value is DuplicateCodeFragment[] {
  if (!Array.isArray(value)) return false;
  return value.every(isDuplicateCodeFragment);
}

function cacheIdentityFieldsMatch(
  payload: Record<string, unknown>,
  identity: DuplicateCodeCacheIdentity,
  cacheKey: string
): boolean {
  return (
    payload.scanCacheVersion === SCAN_CACHE_VERSION &&
    payload.cacheKey === cacheKey &&
    payload.toolName === identity.toolName &&
    payload.toolVersion === identity.toolVersion &&
    payload.configVersion === identity.configVersion &&
    payload.codeArea === identity.codeArea &&
    payload.commitSha === identity.commitSha
  );
}

function cacheStructuredFieldsMatch(
  payload: Record<string, unknown>,
  identity: DuplicateCodeCacheIdentity
): boolean {
  return (
    stableStringify(payload.normalizedToolArgs) ===
      stableStringify([...identity.normalizedToolArgs]) &&
    stableStringify(payload.inputFingerprint) === stableStringify(identity.inputFingerprint)
  );
}

function isDuplicateCodeFragment(value: unknown): value is DuplicateCodeFragment {
  return (
    isNonArrayRecord(value) &&
    isFiniteNumber(value.id) &&
    isFiniteNumber(value.tokenCount) &&
    isFiniteNumber(value.lineCount) &&
    Array.isArray(value.codeAreas) &&
    value.codeAreas.every((area) => typeof area === "string") &&
    Array.isArray(value.locations) &&
    value.locations.every(isDuplicateCodeLocation)
  );
}

function isDuplicateCodeLocation(value: unknown): value is DuplicateCodeLocation {
  return (
    isNonArrayRecord(value) &&
    typeof value.path === "string" &&
    isFiniteNumber(value.startLine) &&
    isFiniteNumber(value.endLine) &&
    typeof value.codeArea === "string"
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

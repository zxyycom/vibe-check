import type { CheckOutcome } from "../check/check.ts";
import { canonicalizeJsonObject } from "../data-boundary/canonical-data.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "../data-boundary/closed-values.ts";

interface OutcomeNormalizationInput {
  readonly knownCheckIds: ReadonlySet<string>;
  readonly productOutcome: boolean;
  readonly value: unknown;
}

/** Normalizes one live Check terminal value before the settlement session commits it. */
export function normalizeCheckOutcome(input: OutcomeNormalizationInput): CheckOutcome | undefined {
  const outcome = snapshotClosedRecord(input.value);
  if (outcome === undefined || typeof outcome.status !== "string") return undefined;
  if (outcome.status === "passed" || outcome.status === "failed") {
    return normalizeFinalOutcome(outcome);
  }
  if (outcome.status === "not-applicable") {
    return normalizeNotApplicableOutcome(outcome, input.knownCheckIds);
  }
  if (outcome.status === "unavailable") {
    return normalizeUnavailableOutcome(outcome, input.productOutcome, input.knownCheckIds);
  }
  return undefined;
}

function normalizeFinalOutcome(
  outcome: Readonly<Record<string, unknown>>
): CheckOutcome | undefined {
  if (outcome.status !== "passed" && outcome.status !== "failed") return undefined;
  if (!hasExactKeys(outcome, ["status", "data"])) return undefined;
  const data = canonicalizeJsonObject(outcome.data);
  return data === undefined ? undefined : Object.freeze({ status: outcome.status, data });
}

function normalizeNotApplicableOutcome(
  outcome: Readonly<Record<string, unknown>>,
  knownCheckIds: ReadonlySet<string>
): CheckOutcome | undefined {
  if (!hasOptionalKeys(outcome, ["status"], ["reason"])) return undefined;
  if (outcome.reason === undefined) return Object.freeze({ status: "not-applicable" });
  const reason = normalizeReason(outcome.reason, false, knownCheckIds);
  return reason === undefined ? undefined : Object.freeze({ status: "not-applicable", reason });
}

function normalizeUnavailableOutcome(
  outcome: Readonly<Record<string, unknown>>,
  productOutcome: boolean,
  knownCheckIds: ReadonlySet<string>
): CheckOutcome | undefined {
  if (!hasExactKeys(outcome, ["status", "reason"])) return undefined;
  const reason = normalizeReason(outcome.reason, productOutcome, knownCheckIds);
  return reason === undefined ? undefined : Object.freeze({ status: "unavailable", reason });
}

function normalizeReason(
  value: unknown,
  allowCheckIds: boolean,
  knownCheckIds: ReadonlySet<string>
): Readonly<{ readonly code: string; readonly checkIds?: readonly string[] }> | undefined {
  const reason = snapshotClosedRecord(value);
  if (!isClosedSessionReason(reason, allowCheckIds)) return undefined;
  if (!Object.hasOwn(reason, "checkIds")) return Object.freeze({ code: reason.code });
  const checkIds = normalizedSessionReasonCheckIds(reason.checkIds, allowCheckIds, knownCheckIds);
  return checkIds === undefined ? undefined : Object.freeze({ code: reason.code, checkIds });
}

function isClosedSessionReason(
  value: Readonly<Record<string, unknown>> | undefined,
  allowCheckIds: boolean
): value is Readonly<Record<string, unknown>> & Readonly<{ readonly code: string }> {
  return (
    value !== undefined &&
    typeof value.code === "string" &&
    value.code.length > 0 &&
    hasOptionalKeys(value, ["code"], allowCheckIds ? ["checkIds"] : [])
  );
}

function normalizedSessionReasonCheckIds(
  value: unknown,
  allowCheckIds: boolean,
  knownCheckIds: ReadonlySet<string>
): readonly string[] | undefined {
  const rawCheckIds = snapshotClosedArray(value);
  if (!allowCheckIds || rawCheckIds === undefined || rawCheckIds.length === 0) return undefined;
  const checkIds: string[] = [];
  for (const checkId of rawCheckIds) {
    if (
      typeof checkId !== "string" ||
      checkId.length === 0 ||
      !knownCheckIds.has(checkId) ||
      checkIds.includes(checkId)
    ) {
      return undefined;
    }
    checkIds.push(checkId);
  }
  return Object.freeze(checkIds);
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

function hasOptionalKeys(
  value: Readonly<Record<string, unknown>>,
  required: readonly string[],
  optional: readonly string[]
): boolean {
  const supported = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => supported.has(key))
  );
}

import assert from "node:assert/strict";

import { isRecord, isUnknownArray } from "./values.ts";

/** Verifies one completed Check's canonical non-negative duration evidence. */
export function assertCanonicalExecutedDuration(checkDurations: unknown, checkId: string): void {
  const duration = findDuration(checkDurations, checkId);
  assert.notEqual(duration, undefined, `isolated Run duration is missing for ${checkId}`);
  if (!isRecord(duration)) throw new TypeError("isolated Run duration must be an object");
  assert.equal(duration.checkId, checkId);
  if (typeof duration.durationMs !== "number") {
    throw new TypeError("isolated Run durationMs must be a number");
  }
  assert.equal(Number.isFinite(duration.durationMs), true);
  assert.equal(duration.durationMs >= 0, true);
}

/** Verifies that the blocked dependent Check has no execution duration. */
export function assertUnavailableDependencyDuration(
  checkDurations: unknown,
  checkId: string
): void {
  assert.deepEqual(findDuration(checkDurations, checkId), { checkId, durationMs: null });
}

function findDuration(
  checkDurations: unknown,
  checkId: string
): Readonly<Record<string, unknown>> | undefined {
  if (!isUnknownArray(checkDurations)) {
    throw new TypeError("isolated Run checkDurations must be an array");
  }
  return checkDurations.find(
    (candidate): candidate is Readonly<Record<string, unknown>> =>
      isRecord(candidate) && candidate.checkId === checkId
  );
}

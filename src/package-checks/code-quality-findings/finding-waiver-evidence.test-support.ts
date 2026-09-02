import assert from "node:assert/strict";

interface FindingWaiverEvidence {
  readonly records: readonly Readonly<{ readonly data: object }>[];
  readonly result: Readonly<{
    readonly messages?: readonly Readonly<{ readonly code: string; readonly message: string }>[];
  }>;
}

/** Verifies the shared fail-closed evidence emitted for one overmatched waiver. */
export function assertOvermatchedFindingWaiverEvidence<Identity>(
  observed: FindingWaiverEvidence,
  expectedAudit: Readonly<{
    readonly identity: Identity;
    readonly kind: "finding-waiver-audit";
    readonly matchCount: number;
    readonly reason: string;
    readonly status: "overmatched";
  }>
): void {
  assert.equal(
    observed.result.messages?.some(
      ({ code, message }) =>
        code === "overmatched-finding-waiver" &&
        message.includes(`matched ${expectedAudit.matchCount} findings`)
    ),
    true
  );
  assert.equal(
    observed.records.some(({ data }) => Object.hasOwn(data, "waiver")),
    false
  );
  assert.deepEqual(observed.records.at(-1)?.data, expectedAudit);
}

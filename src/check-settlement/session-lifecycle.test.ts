import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { CoreInvariantFailure, createCoreCheckSession } from "./session.ts";
import { definition } from "./session.test-support.ts";
import { canonicalJsonBytes } from "../data-boundary/canonical-data.ts";
import { validateCoreSnapshot } from "./fact-validation.ts";

describe("check-record Core Check session", () => {
  it("closes every registered Check exactly once and freezes canonical Check and Record facts", () => {
    const session = createCoreCheckSession([
      { definition: definition("zeta-check") },
      { definition: definition("alpha-check") }
    ]);
    const settledAlphaOutcome = settleCanonicalCheckFacts(session);
    const snapshot = session.freeze();

    assertFrozenSnapshot(snapshot);
    assertCanonicalData(snapshot, settledAlphaOutcome);
    assert.equal(validateCoreSnapshot(snapshot).ok, true);
    assert.strictEqual(session.freeze(), snapshot);
  });

  it("maps unresolved scopes to Product unavailable outcomes while retaining accepted Records", () => {
    const session = createCoreCheckSession([
      { definition: definition("open-check") },
      { definition: definition("pending-check") }
    ]);
    const open = session.openCheckScope("open-check");
    assert.equal(open.records.report({ id: "retained" }, { value: 1 }), "committed");

    assert.deepEqual(session.closeUnresolvedAsCancelled(), [
      {
        checkId: "open-check",
        outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
      },
      {
        checkId: "pending-check",
        outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
      }
    ]);
    assert.equal(open.records.report({ id: "late" }, {}), "rejected");
    const snapshot = session.freeze();
    assert.deepEqual(snapshot.records, [
      { checkId: "open-check", id: "retained", data: { value: 1 } }
    ]);
    assert.deepEqual(
      snapshot.checks.map((check) => check.outcome),
      Array.from({ length: 2 }, cancelledOutcome)
    );
  });
});

function settleCanonicalCheckFacts(session: ReturnType<typeof createCoreCheckSession>) {
  const zeta = session.openCheckScope("zeta-check");
  assert.throws(() => session.readSettledCheckOutcome("zeta-check"), CoreInvariantFailure);
  assert.deepEqual(
    zeta.settleProduct({
      status: "unavailable",
      reason: { code: "product-reason", checkIds: ["not a reference id"] }
    }),
    { status: "unavailable", reason: { code: "invalid-execution-result" } }
  );
  const alpha = session.openCheckScope("alpha-check");
  assert.equal(
    alpha.records.report({ id: "sample" }, { "2": "two", "10": { "2": 2, "10": 10 } }),
    "committed"
  );
  assert.deepEqual(alpha.settle({ status: "failed", data: { "2": "two", "10": 10 } }), {
    authorResultAccepted: true,
    outcome: { status: "failed", data: { "2": "two", "10": 10 } }
  });
  return session.readSettledCheckOutcome("alpha-check");
}

function assertFrozenSnapshot(
  snapshot: ReturnType<ReturnType<typeof createCoreCheckSession>["freeze"]>
) {
  assert.deepEqual(Object.keys(snapshot).sort(), ["checks", "records"]);
  assert.deepEqual(
    snapshot.checks.map((check) => ({ checkId: check.checkId, outcome: check.outcome })),
    [
      { checkId: "alpha-check", outcome: { status: "failed", data: { "2": "two", "10": 10 } } },
      {
        checkId: "zeta-check",
        outcome: { status: "unavailable", reason: { code: "invalid-execution-result" } }
      }
    ]
  );
  assert.deepEqual(snapshot.records, [
    { checkId: "alpha-check", id: "sample", data: { "2": "two", "10": { "2": 2, "10": 10 } } }
  ]);
}

function assertCanonicalData(
  snapshot: ReturnType<ReturnType<typeof createCoreCheckSession>["freeze"]>,
  settledAlphaOutcome: ReturnType<
    ReturnType<typeof createCoreCheckSession>["readSettledCheckOutcome"]
  >
) {
  const alphaOutcome = snapshot.checks[0]?.outcome;
  assert.equal(alphaOutcome, settledAlphaOutcome);
  const alphaData =
    alphaOutcome?.status === "failed" || alphaOutcome?.status === "passed"
      ? alphaOutcome.data
      : undefined;
  assert.equal(
    new TextDecoder().decode(
      canonicalJsonBytes({ final: alphaData, record: snapshot.records[0]?.data })
    ),
    '{"final":{"10":10,"2":"two"},"record":{"10":{"10":10,"2":2},"2":"two"}}'
  );
}

function cancelledOutcome() {
  return { status: "unavailable" as const, reason: { code: "execution-cancelled" } };
}

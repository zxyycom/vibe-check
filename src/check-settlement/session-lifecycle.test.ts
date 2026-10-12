import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { CoreInvariantFailure, createCoreCheckSession } from "./session.ts";
import { definition } from "./session.test-support.ts";
import { canonicalJsonBytes } from "../data-boundary/canonical-data.ts";
import { validateCoreSnapshot } from "./fact-validation.ts";

describe("check-record Core Check session", () => {
  it("closes every registered Check exactly once and freezes canonical Check and Record facts", () => {
    const authoredZeta = { checkId: "zeta-check", displayName: "Zeta check" };
    const session = createCoreCheckSession([
      { definition: authoredZeta },
      { definition: definition("alpha-check") }
    ]);
    authoredZeta.checkId = "changed-check";
    authoredZeta.displayName = "Changed check";
    assert.throws(() => session.openCheckScope("changed-check"), CoreInvariantFailure);
    assert.throws(() => session.openCheckScope("unknown-check"), CoreInvariantFailure);
    const settledAlphaOutcome = settleCanonicalCheckFacts(session);
    const snapshot = session.freeze();

    assertFrozenSnapshot(snapshot);
    assertCanonicalData(snapshot, settledAlphaOutcome);
    assert.equal(snapshot.checks[1]?.displayName, "Zeta check");
    assert.equal(validateCoreSnapshot(snapshot).ok, true);
    assert.strictEqual(session.freeze(), snapshot);
    assertRegisteredProductReason();
    assertOrderedProductBlockers();
  });

  it("maps unresolved scopes to Product unavailable outcomes while retaining accepted Records", () => {
    const session = createCoreCheckSession([
      { definition: definition("pending\u0000check") },
      { definition: definition("open\u0000check") }
    ]);
    const open = session.openCheckScope("open\u0000check");
    assert.equal(open.records.report({ id: "retained" }, { value: 1 }), "committed");

    assert.deepEqual(session.closeUnresolvedAsCancelled(), [
      {
        checkId: "open\u0000check",
        outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
      },
      {
        checkId: "pending\u0000check",
        outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
      }
    ]);
    assert.equal(open.records.report({ id: "late" }, {}), "rejected");
    const snapshot = session.freeze();
    assert.deepEqual(snapshot.records, [
      { checkId: "open\u0000check", id: "retained", data: { value: 1 } }
    ]);
    assert.strictEqual(
      session.readSettledCheckOutcome("open\u0000check"),
      snapshot.checks[0]?.outcome
    );
    assert.deepEqual(session.readSettledCheckRecords("open\u0000check"), snapshot.records);
    assert.deepEqual(
      snapshot.checks.map((check) => check.outcome),
      Array.from({ length: 2 }, cancelledOutcome)
    );
  });
});

function assertOrderedProductBlockers() {
  for (const { checkIds, expectedReason } of [
    {
      checkIds: ["zeta", "alpha"],
      expectedReason: { code: "dependency-not-passed", checkIds: ["zeta", "alpha"] }
    },
    {
      checkIds: ["zeta", "alpha", "zeta"],
      expectedReason: { code: "invalid-execution-result" }
    },
    { checkIds: ["zeta", "missing"], expectedReason: { code: "invalid-execution-result" } },
    { checkIds: ["zeta", ""], expectedReason: { code: "invalid-execution-result" } }
  ]) {
    const session = createCoreCheckSession(
      ["consumer", "alpha", "zeta"].map((checkId) => ({ definition: definition(checkId) }))
    );
    const outcome = session.openCheckScope("consumer").settleProduct({
      status: "unavailable",
      reason: { code: "dependency-not-passed", checkIds }
    });
    assert.deepEqual(outcome, {
      status: "unavailable",
      reason: expectedReason
    });
    assert(outcome.status === "unavailable");
    assert.equal(Object.isFrozen(outcome.reason), true);
    if (outcome.reason?.checkIds !== undefined) {
      assert.equal(Object.isFrozen(outcome.reason.checkIds), true);
    }
  }
}

function assertRegisteredProductReason() {
  const session = createCoreCheckSession([
    { definition: definition("registered\u0000check") },
    { definition: definition("__proto__") }
  ]);
  const scope = session.openCheckScope("__proto__");
  assert.deepEqual(
    scope.settleProduct({
      status: "unavailable",
      reason: { code: "product-reason", checkIds: ["registered\u0000check"] }
    }),
    {
      status: "unavailable",
      reason: { code: "product-reason", checkIds: ["registered\u0000check"] }
    }
  );
  session.closeUnresolvedAsCancelled();
  assert.equal(validateCoreSnapshot(session.freeze()).ok, true);
}

function settleCanonicalCheckFacts(session: ReturnType<typeof createCoreCheckSession>) {
  const zeta = session.openCheckScope("zeta-check");
  assert.throws(() => session.readSettledCheckOutcome("zeta-check"), CoreInvariantFailure);
  assert.throws(() => session.readSettledCheckRecords("zeta-check"), CoreInvariantFailure);
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
  assert.deepEqual(session.readSettledCheckRecords("alpha-check"), [
    {
      checkId: "alpha-check",
      id: "sample",
      data: { "2": "two", "10": { "2": 2, "10": 10 } }
    }
  ]);
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

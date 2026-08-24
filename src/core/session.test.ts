import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { CoreInvariantFailure, createCoreCheckSession } from "./session.ts";
import { canonicalJsonBytes } from "../foundation/canonical-data.ts";
import { validateCoreSnapshot } from "./fact-validation.ts";

function definition(checkId: string) {
  return { checkId, displayName: checkId } as const;
}

describe("check-record Core Check session", () => {
  it("closes every registered Check exactly once and freezes canonical Check and Record facts", () => {
    const session = createCoreCheckSession([
      { definition: definition("zeta-check") },
      { definition: definition("alpha-check") }
    ]);
    const zeta = session.openCheckScope("zeta-check");
    assert.throws(() => session.readSettledCheckOutcome("zeta-check"), CoreInvariantFailure);
    assert.deepEqual(zeta.settle({ status: "not-applicable" }), {
      authorResultAccepted: true,
      outcome: { status: "not-applicable" }
    });
    const alpha = session.openCheckScope("alpha-check");
    assert.equal(
      alpha.records.report({ id: "sample" }, { "2": "two", "10": { "2": 2, "10": 10 } }),
      "committed"
    );
    assert.deepEqual(alpha.settle({ status: "failed", data: { "2": "two", "10": 10 } }), {
      authorResultAccepted: true,
      outcome: { status: "failed", data: { "2": "two", "10": 10 } }
    });
    const settledAlphaOutcome = session.readSettledCheckOutcome("alpha-check");
    assert.deepEqual(settledAlphaOutcome, {
      status: "failed",
      data: { "2": "two", "10": 10 }
    });

    const snapshot = session.freeze();
    assert.deepEqual(Object.keys(snapshot).sort(), ["checks", "records"]);
    assert.deepEqual(
      snapshot.checks.map((check) => ({ checkId: check.checkId, outcome: check.outcome })),
      [
        {
          checkId: "alpha-check",
          outcome: { status: "failed", data: { "2": "two", "10": 10 } }
        },
        { checkId: "zeta-check", outcome: { status: "not-applicable" } }
      ]
    );
    assert.deepEqual(snapshot.records, [
      {
        checkId: "alpha-check",
        id: "sample",
        data: { "2": "two", "10": { "2": 2, "10": 10 } }
      }
    ]);
    const alphaOutcome = snapshot.checks[0]?.outcome;
    assert.equal(alphaOutcome, settledAlphaOutcome);
    const alphaData =
      alphaOutcome?.status === "passed" || alphaOutcome?.status === "failed"
        ? alphaOutcome.data
        : undefined;
    assert.equal(
      new TextDecoder().decode(
        canonicalJsonBytes({ final: alphaData, record: snapshot.records[0]?.data })
      ),
      '{"final":{"10":10,"2":"two"},"record":{"10":{"10":10,"2":2},"2":"two"}}'
    );
    assert.equal(validateCoreSnapshot(snapshot).ok, true);
    assert.strictEqual(session.freeze(), snapshot);
  });

  it("binds structural Record ownership, retains prior Records, and contains invalid author writes", () => {
    const session = createCoreCheckSession([
      { definition: definition("alpha-check") },
      { definition: definition("beta-check") }
    ]);
    const alpha = session.openCheckScope("alpha-check");
    const beta = session.openCheckScope("beta-check");

    assert.equal(alpha.records.report({ id: "shared" }, { retained: true }), "committed");
    assert.equal(alpha.records.report({ id: "shared" }, { retained: true }), "rejected");
    assert.equal(beta.records.report({ id: "shared" }, { independent: true }), "committed");
    assert.deepEqual(alpha.settle({ status: "passed", data: { ignored: true } }), {
      authorResultAccepted: false,
      outcome: { status: "unavailable", reason: { code: "record-conflict" } }
    });
    beta.settle({ status: "not-applicable" });

    const snapshot = session.freeze();
    assert.deepEqual(snapshot.records, [
      { checkId: "alpha-check", id: "shared", data: { retained: true } },
      { checkId: "beta-check", id: "shared", data: { independent: true } }
    ]);
    assert.deepEqual(snapshot.checks[1]?.outcome, { status: "not-applicable" });
  });

  it("rejects malformed data and duplicate lifecycle closure without revising frozen facts", () => {
    const session = createCoreCheckSession([{ definition: definition("alpha-check") }]);
    const alpha = session.openCheckScope("alpha-check");
    assert.equal(alpha.records.report({ id: "retained" }, { value: true }), "committed");
    assert.equal(alpha.records.report({ id: "invalid", extra: true }, {}), "rejected");
    assert.deepEqual(alpha.settle({ status: "passed", data: {} }), {
      authorResultAccepted: false,
      outcome: { status: "unavailable", reason: { code: "record-invalid" } }
    });
    assert.throws(() => alpha.settle({ status: "failed", data: {} }), CoreInvariantFailure);
    const snapshot = session.freeze();
    assert.deepEqual(snapshot.records, [
      { checkId: "alpha-check", id: "retained", data: { value: true } }
    ]);
    assert.throws(() => session.openCheckScope("alpha-check"), CoreInvariantFailure);
  });

  it("maps unresolved scopes to Product unavailable outcomes while retaining accepted Records", () => {
    const session = createCoreCheckSession([
      { definition: definition("open-check") },
      { definition: definition("pending-check") }
    ]);
    const open = session.openCheckScope("open-check");
    assert.equal(open.records.report({ id: "retained" }, { value: 1 }), "committed");

    session.closeUnresolvedAsCancelled();
    assert.equal(open.records.report({ id: "late" }, {}), "rejected");
    const snapshot = session.freeze();
    assert.deepEqual(snapshot.records, [
      { checkId: "open-check", id: "retained", data: { value: 1 } }
    ]);
    assert.deepEqual(
      snapshot.checks.map((check) => check.outcome),
      [
        { status: "unavailable", reason: { code: "execution-cancelled" } },
        { status: "unavailable", reason: { code: "execution-cancelled" } }
      ]
    );
  });
});

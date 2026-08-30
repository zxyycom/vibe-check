import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { CoreInvariantFailure, createCoreCheckSession } from "./session.ts";
import { definition } from "./session.test-support.ts";

describe("check-record Core Check session", () => {
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
});

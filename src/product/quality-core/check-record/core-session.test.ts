import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  CoreInvariantFailure,
  createCoreCheckSession
} from "./core-session.ts";
import { validateCoreSnapshot } from "./validation.ts";

function definition(checkId: string) {
  return {
    checkId,
    displayName: checkId,
    recordTypes: [{
      recordTypeId: "finding",
      fields: [{ fieldId: "kind", valueType: "string", required: true }],
      identityFields: ["kind"]
    }]
  } as const;
}

function finding(kind: string, message = kind) {
  return {
    recordTypeId: "finding",
    level: "warning",
    semanticSubject: `src/${kind}.ts`,
    message,
    fields: { kind },
    location: { path: `src/${kind}.ts`, line: 1, column: 1 }
  } as const;
}

describe("check-record Core Check session", () => {
  it("closes every registered Check exactly once and freezes only canonical Check and Record facts", () => {
    const session = createCoreCheckSession([
      { definition: definition("zeta-check") },
      { definition: definition("alpha-check") }
    ]);
    const zeta = session.openCheckScope("zeta-check");
    assert.deepEqual(zeta.settle({ status: "not-applicable" }), { status: "not-applicable" });
    const alpha = session.openCheckScope("alpha-check");
    assert.equal(alpha.records.report(finding("alpha")), "committed");
    assert.deepEqual(alpha.settle({ status: "completed", verdict: "failed" }), {
      status: "completed", verdict: "failed"
    });

    const snapshot = session.freeze();
    assert.deepEqual(Object.keys(snapshot).sort(), ["checks", "records"]);
    assert.deepEqual(snapshot.checks.map((check) => ({
      checkId: check.checkId,
      outcome: check.outcome
    })), [{
      checkId: "alpha-check", outcome: { status: "completed", verdict: "failed" }
    }, {
      checkId: "zeta-check", outcome: { status: "not-applicable" }
    }]);
    assert.equal(snapshot.records.length, 1);
    assert.equal(snapshot.records[0]?.checkId, "alpha-check");
    assert.equal("checkRunId" in snapshot.records[0]!, false);
    assert.equal(validateCoreSnapshot(snapshot).ok, true);
    assert.strictEqual(session.freeze(), snapshot);
  });

  it("binds record ownership, retains independent Records, and gives record failures precedence", () => {
    const session = createCoreCheckSession([
      { definition: definition("alpha-check") },
      { definition: definition("beta-check") }
    ]);
    const alpha = session.openCheckScope("alpha-check");
    const beta = session.openCheckScope("beta-check");

    assert.equal(alpha.records.report(finding("retained-alpha")), "committed");
    assert.equal(alpha.records.report(finding("retained-alpha")), "replayed");
    assert.equal(alpha.records.report(finding("conflict", "first")), "committed");
    assert.equal(alpha.records.report(finding("conflict", "second")), "conflicted");
    assert.equal(alpha.records.report({ ...finding("invalid"), checkId: "beta-check" } as never), "rejected");
    assert.equal(beta.records.report(finding("retained-beta")), "committed");
    assert.deepEqual(alpha.settle({
      status: "unavailable",
      reason: { code: "execution-threw" }
    }), { status: "unavailable", reason: { code: "record-conflict" } });
    beta.settle({ status: "completed", verdict: "passed" });

    const snapshot = session.freeze();
    assert.deepEqual(snapshot.checks.map((check) => ({
      checkId: check.checkId,
      outcome: check.outcome
    })), [{
      checkId: "alpha-check",
      outcome: { status: "unavailable", reason: { code: "record-conflict" } }
    }, {
      checkId: "beta-check",
      outcome: { status: "completed", verdict: "passed" }
    }]);
    assert.deepEqual(snapshot.records.map((record) => record.semanticSubject), [
      "src/retained-alpha.ts",
      "src/retained-beta.ts"
    ]);
  });

  it("allows references only to committed records and rejects duplicate or late lifecycle changes", () => {
    const session = createCoreCheckSession([{ definition: definition("alpha-check") }]);
    const alpha = session.openCheckScope("alpha-check");
    const candidate = finding("retained");
    assert.equal(alpha.recordIdForReference(candidate), undefined);
    assert.equal(alpha.records.report(candidate), "committed");
    const reference = alpha.recordIdForReference({
      recordTypeId: candidate.recordTypeId,
      semanticSubject: candidate.semanticSubject,
      fields: candidate.fields
    });
    assert.equal(reference?.recordTypeId, "finding");
    alpha.settle({ status: "completed", verdict: "passed" });
    assert.equal(alpha.records.report(finding("late")), "rejected");
    assert.throws(
      () => alpha.settle({ status: "completed", verdict: "failed" }),
      CoreInvariantFailure
    );
    session.freeze();
    assert.throws(() => session.openCheckScope("alpha-check"), CoreInvariantFailure);
  });

  it("maps not-applicable records and unresolved scopes to Product unavailable outcomes", () => {
    const session = createCoreCheckSession([
      { definition: definition("not-applicable-check") },
      { definition: definition("open-check") },
      { definition: definition("pending-check") }
    ]);
    const notApplicable = session.openCheckScope("not-applicable-check");
    assert.equal(notApplicable.records.report(finding("invalid")), "committed");
    assert.deepEqual(notApplicable.settle({ status: "not-applicable" }), {
      status: "unavailable", reason: { code: "record-invalid" }
    });
    const open = session.openCheckScope("open-check");
    assert.equal(open.records.report(finding("retained-open")), "committed");

    session.closeUnresolvedAsCancelled();
    assert.equal(open.records.report(finding("late-open")), "rejected");
    const snapshot = session.freeze();
    assert.deepEqual(snapshot.checks.map((check) => ({
      checkId: check.checkId,
      outcome: check.outcome
    })), [{
      checkId: "not-applicable-check",
      outcome: { status: "unavailable", reason: { code: "record-invalid" } }
    }, {
      checkId: "open-check",
      outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
    }, {
      checkId: "pending-check",
      outcome: { status: "unavailable", reason: { code: "execution-cancelled" } }
    }]);
  });
});

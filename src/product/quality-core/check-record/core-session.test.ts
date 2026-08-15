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
      { definition: definition("zeta-check"), applicability: "not-applicable" },
      { definition: definition("alpha-check"), applicability: "applicable" }
    ]);
    session.closeNotApplicable("zeta-check");
    const alpha = session.openApplicableScope("alpha-check");
    assert.equal(alpha.records.report(finding("alpha")), "committed");
    assert.equal(alpha.settle({ kind: "completed", verdict: "failed" }), "available");

    const snapshot = session.freeze();
    assert.deepEqual(Object.keys(snapshot).sort(), ["checks", "records"]);
    assert.deepEqual(snapshot.checks.map((check) => ({
      checkId: check.checkId,
      outcome: check.outcome
    })), [{
      checkId: "alpha-check", outcome: { kind: "completed", verdict: "failed" }
    }, {
      checkId: "zeta-check", outcome: { kind: "not-applicable" }
    }]);
    assert.equal(snapshot.records.length, 1);
    assert.equal(snapshot.records[0]?.checkId, "alpha-check");
    assert.equal("checkRunId" in snapshot.records[0]!, false);
    assert.equal(validateCoreSnapshot(snapshot).ok, true);
    assert.strictEqual(session.freeze(), snapshot);
  });

  it("binds record ownership, retains accepted independent Records, and gives record failures precedence", () => {
    const session = createCoreCheckSession([
      { definition: definition("alpha-check"), applicability: "applicable" },
      { definition: definition("beta-check"), applicability: "applicable" }
    ]);
    const alpha = session.openApplicableScope("alpha-check");
    const beta = session.openApplicableScope("beta-check");

    assert.equal(alpha.records.report(finding("retained-alpha")), "committed");
    assert.equal(alpha.records.report(finding("retained-alpha")), "replayed");
    assert.equal(alpha.records.report(finding("conflict", "first")), "committed");
    assert.equal(alpha.records.report(finding("conflict", "second")), "conflicted");
    assert.equal(alpha.records.report({ ...finding("invalid"), checkId: "beta-check" } as never), "rejected");
    assert.equal(beta.records.report(finding("retained-beta")), "committed");
    assert.equal(alpha.settle({
      kind: "unavailable",
      diagnostic: { category: "execution-failed" }
    }), "unavailable");
    assert.equal(beta.settle({ kind: "completed", verdict: "passed" }), "available");

    const snapshot = session.freeze();
    assert.deepEqual(snapshot.checks.map((check) => ({
      checkId: check.checkId,
      outcome: check.outcome
    })), [{
      checkId: "alpha-check",
      outcome: { kind: "unavailable", diagnostic: { category: "record-conflict" } }
    }, {
      checkId: "beta-check",
      outcome: { kind: "completed", verdict: "passed" }
    }]);
    assert.deepEqual(snapshot.records.map((record) => record.semanticSubject), [
      "src/retained-alpha.ts",
      "src/retained-beta.ts"
    ]);

    const conflictSnapshot = (messages: readonly string[]) => {
      const conflicts = createCoreCheckSession([
        { definition: definition("conflict-check"), applicability: "applicable" }
      ]);
      const scope = conflicts.openApplicableScope("conflict-check");
      for (const [index, message] of messages.entries()) {
        assert.equal(
          scope.records.report(finding("same-id", message)),
          index === 0 ? "committed" : "conflicted"
        );
      }
      scope.settle({ kind: "completed", verdict: "passed" });
      return conflicts.freeze();
    };
    assert.deepEqual(
      conflictSnapshot(["first", "second"]),
      conflictSnapshot(["second", "first"])
    );
  });

  it("rejects scope-external, duplicate, and late mutation without revising facts", () => {
    const session = createCoreCheckSession([
      { definition: definition("alpha-check"), applicability: "applicable" },
      { definition: definition("not-applicable-check"), applicability: "not-applicable" }
    ]);
    assert.throws(
      () => session.openApplicableScope("not-applicable-check"),
      CoreInvariantFailure
    );
    assert.throws(() => session.openApplicableScope("missing-check"), CoreInvariantFailure);
    session.closeNotApplicable("not-applicable-check");
    assert.throws(() => session.closeNotApplicable("not-applicable-check"), CoreInvariantFailure);

    const alpha = session.openApplicableScope("alpha-check");
    assert.equal(alpha.records.report(finding("retained")), "committed");
    assert.equal(alpha.settle({ kind: "completed", verdict: "passed" }), "available");
    assert.equal(alpha.records.report(finding("late")), "rejected");
    assert.throws(
      () => alpha.settle({ kind: "completed", verdict: "failed" }),
      CoreInvariantFailure
    );

    const snapshot = session.freeze();
    assert.equal(alpha.records.report(finding("frozen")), "rejected");
    assert.deepEqual(snapshot.records.map((record) => record.semanticSubject), ["src/retained.ts"]);
  });

  it("maps malformed terminal values to a contained unavailable result and cancellation closes unresolved scopes", () => {
    const session = createCoreCheckSession([
      { definition: definition("completed-check"), applicability: "applicable" },
      { definition: definition("open-check"), applicability: "applicable" },
      { definition: definition("pending-check"), applicability: "applicable" }
    ]);
    const completed = session.openApplicableScope("completed-check");
    assert.equal(completed.records.report(finding("completed")), "committed");
    assert.equal(completed.settle({ verdict: "passed" } as never), "unavailable");
    const open = session.openApplicableScope("open-check");
    assert.equal(open.records.report(finding("retained-open")), "committed");

    session.closeUnresolvedAsCancelled();
    assert.equal(open.records.report(finding("late-open")), "rejected");
    const snapshot = session.freeze();
    assert.deepEqual(snapshot.checks.map((check) => ({
      checkId: check.checkId,
      outcome: check.outcome
    })), [{
      checkId: "completed-check",
      outcome: { kind: "unavailable", diagnostic: { category: "invalid-result" } }
    }, {
      checkId: "open-check",
      outcome: { kind: "unavailable", diagnostic: { category: "cancelled" } }
    }, {
      checkId: "pending-check",
      outcome: { kind: "unavailable", diagnostic: { category: "cancelled" } }
    }]);
    assert.deepEqual(snapshot.records.map((record) => record.semanticSubject), [
      "src/completed.ts",
      "src/retained-open.ts"
    ]);
  });
});

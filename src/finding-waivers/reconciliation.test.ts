import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reconcileFindingWaivers } from "./reconciliation.ts";

function reconcileUnknownWaivers(waivers: unknown): void {
  Reflect.apply(reconcileFindingWaivers, undefined, [
    { findings: [], identify: () => ({ path: "src/example.ts" }), waivers }
  ]);
}

describe("finding waiver reconciliation", () => {
  it("matches caller-defined structural identities, preserves reasons, and audits unused waivers", () => {
    const result = reconcileFindingWaivers({
      findings: [
        { functionName: "loadProject", limit: 5, metric: "parameter-count", path: "src/load.ts" },
        { functionName: "render", limit: 50, metric: "function-code-density", path: "src/view.ts" }
      ],
      identify: (finding) => ({
        functionName: finding.functionName,
        metric: finding.metric,
        path: finding.path
      }),
      waivers: [
        {
          identity: {
            metric: "parameter-count",
            path: "src/load.ts",
            functionName: "loadProject"
          },
          reason: "Protocol adapter intentionally mirrors the external fields."
        },
        {
          identity: {
            functionName: "removed",
            metric: "parameter-count",
            path: "src/removed.ts"
          },
          reason: "This should be removed when its target disappears."
        }
      ]
    });

    assert.deepEqual(result.findings, [
      {
        disposition: "waived",
        finding: {
          functionName: "loadProject",
          limit: 5,
          metric: "parameter-count",
          path: "src/load.ts"
        },
        waiver: {
          identity: {
            metric: "parameter-count",
            path: "src/load.ts",
            functionName: "loadProject"
          },
          reason: "Protocol adapter intentionally mirrors the external fields."
        }
      },
      {
        disposition: "actionable",
        finding: {
          functionName: "render",
          limit: 50,
          metric: "function-code-density",
          path: "src/view.ts"
        }
      }
    ]);
    assert.deepEqual(result.waiverAudits, [
      {
        matchCount: 1,
        status: "applied",
        waiver: {
          identity: {
            metric: "parameter-count",
            path: "src/load.ts",
            functionName: "loadProject"
          },
          reason: "Protocol adapter intentionally mirrors the external fields."
        }
      },
      {
        matchCount: 0,
        status: "unused",
        waiver: {
          identity: {
            functionName: "removed",
            metric: "parameter-count",
            path: "src/removed.ts"
          },
          reason: "This should be removed when its target disappears."
        }
      }
    ]);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.findings), true);
    assert.equal(Object.isFrozen(result.waiverAudits), true);
  });

  it("materializes waiver identity and reason without copying caller findings", () => {
    const finding = { path: "src/load.ts", subject: "loadProject" };
    const authoredWaiver = {
      identity: { path: "src/load.ts", subject: "loadProject", tags: ["protocol"] },
      reason: "Protocol adapter intentionally mirrors the external fields."
    };
    const result = reconcileFindingWaivers({
      findings: [finding],
      identify: (candidate) => ({
        path: candidate.path,
        subject: candidate.subject,
        tags: ["protocol"]
      }),
      waivers: [authoredWaiver]
    });

    authoredWaiver.identity.path = "src/changed.ts";
    authoredWaiver.identity.tags.push("changed");
    authoredWaiver.reason = "Changed after reconciliation.";
    const waived = result.findings[0];
    assert.ok(waived?.disposition === "waived");
    assert.equal(waived.finding, finding);
    assert.deepEqual(waived.waiver, {
      identity: { path: "src/load.ts", subject: "loadProject", tags: ["protocol"] },
      reason: "Protocol adapter intentionally mirrors the external fields."
    });
    assert.equal(Object.isFrozen(waived.waiver), true);
    assert.equal(Object.isFrozen(waived.waiver.identity), true);
    assert.ok(
      typeof waived.waiver.identity === "object" &&
        waived.waiver.identity !== null &&
        !Array.isArray(waived.waiver.identity)
    );
    const tags = waived.waiver.identity.tags;
    assert.ok(Array.isArray(tags));
    assert.equal(Object.isFrozen(tags), true);
  });

  it("does not waive findings when one caller-defined identity matches more than once", () => {
    const result = reconcileFindingWaivers({
      findings: [
        { functionName: "read", line: 12, path: "src/reader.ts" },
        { functionName: "read", line: 48, path: "src/reader.ts" }
      ],
      identify: (finding) => ({ functionName: finding.functionName, path: finding.path }),
      waivers: [
        {
          identity: { functionName: "read", path: "src/reader.ts" },
          reason: "This identifier is intentionally too broad for the test."
        }
      ]
    });

    assert.deepEqual(
      result.findings.map(({ disposition }) => disposition),
      ["overmatched", "overmatched"]
    );
    assert.deepEqual(
      result.waiverAudits.map(({ matchCount, status }) => ({ matchCount, status })),
      [{ matchCount: 2, status: "overmatched" }]
    );
  });

  it("rejects malformed and hostile waiver boundaries without invoking caller accessors", () => {
    const common = { path: "src/example.ts" };
    assert.throws(
      () =>
        reconcileFindingWaivers({
          findings: [],
          identify: () => common,
          waivers: [
            { identity: common, reason: "First reason." },
            { identity: { path: "src/example.ts" }, reason: "Second reason." }
          ]
        }),
      /duplicate canonical identities/
    );
    assert.throws(
      () =>
        reconcileFindingWaivers({
          findings: [],
          identify: () => ({ path: "src/example.ts" }),
          waivers: [{ identity: { path: "src/example.ts" }, reason: "" }]
        }),
      /non-empty strings/
    );
    assert.throws(
      () =>
        reconcileFindingWaivers({
          findings: [{ path: "src/example.ts" }],
          identify: () => ({ invalid: undefined }),
          waivers: []
        }),
      /finding identity must be canonical JSON/
    );
    assert.throws(
      () => reconcileUnknownWaivers([{ identity: { path: "src/example.ts" }, reason: 42 }]),
      /non-empty strings/
    );
    assert.throws(
      () => reconcileUnknownWaivers([{ reason: "Missing identity." }]),
      /identity and reason fields/
    );
    let accessorRead = false;
    const hostileWaiver = { reason: "Accessor must remain unread." };
    Object.defineProperty(hostileWaiver, "identity", {
      enumerable: true,
      get: () => {
        accessorRead = true;
        throw new Error("must not execute");
      }
    });
    assert.throws(() => reconcileUnknownWaivers([hostileWaiver]), /canonical JSON arrays/);
    assert.equal(accessorRead, false);
    const trappedWaivers = new Proxy([], {
      ownKeys: () => {
        throw new Error("credential=must-not-leak");
      }
    });
    assert.throws(() => reconcileUnknownWaivers(trappedWaivers), /canonical JSON arrays/);
  });
});

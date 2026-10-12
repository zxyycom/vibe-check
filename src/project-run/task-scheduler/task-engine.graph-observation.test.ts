import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { isRecord } from "../../data-boundary/value-shapes.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { runTaskGraph } from "./scheduler.ts";
import { decisionFor, recordingLogger } from "./task-engine.test-support.ts";

describe("static task engine", () => {
  it("records one graph and references its fingerprint from every scheduler decision", async () => {
    const observations: DiagnosticObservation[] = [];
    await runTaskGraph({
      diagnosticLogger: recordingLogger(observations),
      execute: () => undefined,
      graph: { tasks: [{ id: "first" }, { id: "second" }] },
      maxParallel: 2
    });
    const graphs = observations.filter((observation) => observation.event === "scheduler.graph");
    assert.equal(graphs.length, 1);
    const graphDetails = graphs[0]?.details;
    assert.ok(isRecord(graphDetails));
    const fingerprint = graphDetails.graphFingerprint;
    assert.equal(typeof fingerprint, "string");
    assert.equal(
      fingerprint,
      createHash("sha256").update(JSON.stringify(graphDetails.graph)).digest("hex")
    );
    const decisions = observations.filter(
      (observation) => observation.event === "scheduler.decision"
    );
    assert.ok(decisions.length > 1);
    for (const decision of decisions) {
      assert.ok(isRecord(decision.details));
      assert.equal(decision.details.graphFingerprint, fingerprint);
      assert.equal("graphIdentity" in decision.details, false);
    }

    const nextObservations: DiagnosticObservation[] = [];
    await runTaskGraph({
      diagnosticLogger: recordingLogger(nextObservations),
      execute: () => undefined,
      graph: { tasks: [{ id: "first" }, { id: "second", dependsOn: ["first"] }] },
      maxParallel: 2
    });
    const nextGraphs = nextObservations.filter(
      (observation) => observation.event === "scheduler.graph"
    );
    assert.equal(nextGraphs.length, 1);
    const nextGraphDetails = nextGraphs[0]?.details;
    assert.ok(isRecord(nextGraphDetails));
    const nextFingerprint = createHash("sha256")
      .update(JSON.stringify(nextGraphDetails.graph))
      .digest("hex");
    assert.equal(nextGraphDetails.graphFingerprint, nextFingerprint);
    assert.notEqual(nextFingerprint, fingerprint);
    const nextDecisions = nextObservations.filter(
      (observation) => observation.event === "scheduler.decision"
    );
    assert.ok(nextDecisions.length > 1);
    for (const decision of nextDecisions) {
      assert.ok(isRecord(decision.details));
      assert.equal(decision.details.graphFingerprint, nextFingerprint);
    }
    assert.equal(graphDetails.graphFingerprint, fingerprint);
  });

  it("distinguishes full graph identities with identical Task IDs but different scheduler semantics", () => {
    const baseline = decisionFor(
      {
        tasks: [
          { id: "source", mutex: ["shared"], scopeId: "limited" },
          { admissionPriority: 1, id: "target", observes: ["source"], scopeId: "limited" }
        ],
        scopes: [
          {
            activationTaskIds: ["source"],
            id: "limited",
            maxParallel: 1,
            terminalTaskId: "target"
          }
        ]
      },
      { maxParallel: 2 }
    );
    const changed = decisionFor(
      {
        tasks: [
          { admissionPriority: 3, id: "source", mutex: ["other"], scopeId: "limited" },
          { admissionPriority: 9, dependsOn: ["source"], id: "target", scopeId: "limited" }
        ],
        scopes: [
          {
            activationTaskIds: ["source"],
            id: "limited",
            maxParallel: 2,
            terminalTaskId: "target"
          }
        ]
      },
      { maxParallel: 2 }
    );

    assert.deepEqual(
      baseline.graphIdentity.tasks.map((task) => task.taskId),
      changed.graphIdentity.tasks.map((task) => task.taskId)
    );
    assert.notDeepEqual(baseline.graphIdentity, changed.graphIdentity);
  });
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { isRecord } from "../../data-boundary/value-shapes.ts";
import type { SchedulerGraphSnapshot } from "../../project-definition/project-definition.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { runTaskGraph } from "./scheduler.ts";
import type { TaskGraph } from "./graph.ts";
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
    const source = { id: "source", mutex: ["shared"], scopeId: "limited" };
    const target = { admissionPriority: 1, id: "target" };
    const scope = {
      activationTaskIds: ["source"],
      id: "limited",
      maxParallel: 1,
      terminalTaskId: "source"
    };
    const graph: TaskGraph = { tasks: [source, target], scopes: [scope] };
    const baseline = decisionFor(graph, { maxParallel: 2 }).graphIdentity;
    const sourceIdentity = {
      admissionPriority: 0,
      dependsOn: [],
      mutex: ["shared"],
      observes: [],
      resourceClaims: [],
      scopeId: "limited",
      taskId: "source"
    };
    const targetIdentity = {
      admissionPriority: 1,
      dependsOn: [],
      mutex: [],
      observes: [],
      resourceClaims: [],
      scopeId: null,
      taskId: "target"
    };
    const expected = {
      resourceCapacities: [],
      scopes: [scope],
      tasks: [sourceIdentity, targetIdentity]
    };
    assert.deepEqual(baseline, expected);

    const variants = [
      {
        name: "source priority",
        graph: { ...graph, tasks: [{ ...source, admissionPriority: 3 }, target] },
        expected: {
          ...expected,
          tasks: [{ ...sourceIdentity, admissionPriority: 3 }, targetIdentity]
        }
      },
      {
        name: "target priority",
        graph: { ...graph, tasks: [source, { ...target, admissionPriority: 9 }] },
        expected: {
          ...expected,
          tasks: [sourceIdentity, { ...targetIdentity, admissionPriority: 9 }]
        }
      },
      {
        name: "mutex",
        graph: { ...graph, tasks: [{ ...source, mutex: ["other"] }, target] },
        expected: { ...expected, tasks: [{ ...sourceIdentity, mutex: ["other"] }, targetIdentity] }
      },
      {
        name: "dependsOn",
        graph: { ...graph, tasks: [source, { ...target, dependsOn: ["source"] }] },
        expected: {
          ...expected,
          tasks: [sourceIdentity, { ...targetIdentity, dependsOn: ["source"] }]
        }
      },
      {
        name: "observes",
        graph: { ...graph, tasks: [source, { ...target, observes: ["source"] }] },
        expected: {
          ...expected,
          tasks: [sourceIdentity, { ...targetIdentity, observes: ["source"] }]
        }
      },
      {
        name: "scope capacity",
        graph: { ...graph, scopes: [{ ...scope, maxParallel: 2 }] },
        expected: { ...expected, scopes: [{ ...scope, maxParallel: 2 }] }
      }
    ] satisfies readonly {
      readonly name: string;
      readonly graph: TaskGraph;
      readonly expected: SchedulerGraphSnapshot;
    }[];
    for (const variant of variants) {
      const changed = decisionFor(variant.graph, { maxParallel: 2 }).graphIdentity;
      assert.deepEqual(changed, variant.expected, variant.name);
      assert.deepEqual(
        changed.tasks.map(({ taskId }) => taskId),
        ["source", "target"]
      );
      assert.notDeepEqual(baseline, changed, variant.name);
    }
  });
});

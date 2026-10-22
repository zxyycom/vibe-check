import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AdmissionPolicyContext } from "@zxyycom/vibe-check";

import { staticIdentity, staticPolicy } from "./policy.ts";
import { GATE_MAPPING } from "./gate-shape-fixture.ts";
import { FIXTURES, requiredFixture } from "./fixture-registry.ts";
import { INVESTIGATION_PROFILES } from "./scenario-fixtures.ts";
import { simulate, simulateEvidence } from "./simulate.ts";

describe("admission workbench", () => {
  it("matches shared-resource and serial hand-calculated oracles", () => {
    const parallel = simulate(FIXTURES["two-shared-claims"], staticPolicy);
    assert.equal(parallel.makespanMs, 150);
    assert.equal(parallel.slotTimeMs, 300);
    assert.equal(parallel.resourceUnitTimeMs.cpu, 300);

    let selected = 0;
    const serial = simulate(FIXTURES["two-shared-claims"], (context) => {
      if (context.runningTaskIds.length > 0) return { kind: "wait" };
      const taskId = context.candidates.find(({ canAdmit }) => canAdmit)?.taskId;
      assert.ok(taskId !== undefined && taskId !== "");
      selected += 1;
      return { kind: "select", taskId };
    });
    assert.equal(selected, 2);
    assert.equal(serial.makespanMs, 200);
    assert.equal(serial.slotTimeMs, 200);
    assert.equal(serial.resourceUnitTimeMs.cpu, 200);
  });

  it("matches empty single and chain boundaries without invoking policy for an empty graph", () => {
    let emptyCalls = 0;
    const empty = simulate(FIXTURES.empty, () => {
      emptyCalls += 1;
      return { kind: "wait" };
    });
    assert.equal(emptyCalls, 0);
    assert.equal(empty.makespanMs, 0);
    assert.deepEqual(empty.trace, []);

    assert.equal(simulate(FIXTURES.single).makespanMs, 25);
    const first = simulate(FIXTURES.chain, staticPolicy, 7);
    const replay = simulate(FIXTURES.chain, staticPolicy, 7);
    assert.equal(first.makespanMs, 150);
    assert.equal(first.slotTimeMs, 150);
    assert.deepEqual(first, replay);
  });

  it("shares sampled external work across policies while deriving replicates deterministically", () => {
    const reverse = (context: AdmissionPolicyContext) => {
      const candidate = [...context.candidates].reverse().find(({ canAdmit }) => canAdmit);
      return candidate === undefined
        ? ({ kind: "wait" } as const)
        : ({ kind: "select", taskId: candidate.taskId } as const);
    };
    const baseline = simulate(FIXTURES["profile-variation"], staticPolicy, 19, 2);
    const candidate = simulate(
      FIXTURES["profile-variation"],
      reverse,
      19,
      2,
      staticIdentity("static")
    );
    assert.equal(candidate.sampledWorkCommitment, baseline.sampledWorkCommitment);
    assert.deepEqual(candidate.sampledWork, baseline.sampledWork);
    assert.deepEqual(simulate(FIXTURES["profile-variation"], staticPolicy, 19, 2), baseline);
    assert.notEqual(
      simulate(FIXTURES["profile-variation"], staticPolicy, 19, 3).sampledWorkCommitment,
      baseline.sampledWorkCommitment
    );
  });

  it("provides only formal context and a real captured action-observation prefix", () => {
    const capturedContexts: Array<{
      readonly context: AdmissionPolicyContext;
      readonly observations: readonly ReturnType<
        AdmissionPolicyContext["actionHistory"]["measurementAt"]
      >[];
      readonly cumulative: AdmissionPolicyContext["cumulative"];
    }> = [];
    const result = simulate(FIXTURES.backfill, (context) => {
      capturedContexts.push({
        context,
        observations: Array.from({ length: context.actionHistory.measurementCount }, (_, index) =>
          context.actionHistory.measurementAt(index)
        ),
        cumulative: structuredClone(context.cumulative)
      });
      return staticPolicy(context);
    });
    assert.equal(result.policyContextId, "public-admission-policy-context-v2");
    assert.ok(capturedContexts.length >= 3);
    const initial = capturedContexts[0]?.context;
    const later = capturedContexts.find(
      ({ context }) => context.actionHistory.measurementCount > 0
    )?.context;
    assert.ok(initial !== undefined);
    assert.ok(later !== undefined);
    assert.equal(initial.actionHistory.measurementCount, 0);
    for (const { context, cumulative, observations } of capturedContexts) {
      const measurement = context.actionHistory;
      assert.deepEqual(context.cumulative, cumulative);
      assert.deepEqual(
        Array.from({ length: measurement.measurementCount }, (_, index) =>
          measurement.measurementAt(index)
        ),
        observations
      );
      for (const invalidIndex of [
        -1,
        measurement.measurementCount,
        measurement.measurementCount + 1,
        0.5,
        NaN,
        Infinity
      ]) {
        assert.equal(measurement.measurementAt(invalidIndex), undefined);
      }
      const expectedWaitMs = result.actionObservations
        .slice(0, measurement.measurementCount)
        .reduce(
          (total, entry) =>
            total +
            (entry.interval.availability === "available"
              ? entry.interval.contribution.acceptedWaitMs
              : 0),
          0
        );
      assert.equal(context.cumulative.timingFacts?.acceptedWaitMs, expectedWaitMs);
    }
    assert.equal(later.cumulative.timing.availability, "available");
    const observation = later.actionHistory.measurementAt(0);
    assert.equal(observation?.kind, "select");
    assert.deepEqual(observation?.effects[0], { kind: "admitted", taskId: "A" });
    assert.equal("sampledWork" in initial, false);
    assert.equal("trace" in initial, false);
    assert.equal("remainingWork" in initial, false);
    assert.equal(Object.isFrozen(initial.graph), true);
    assert.equal(Object.isFrozen(initial.candidates), true);
    assert.equal(
      result.actionObservations.every((entry) => entry.interval.availability === "available"),
      true
    );
  });

  it("preserves non-empty trace, time, boundary, and identities after a later policy failure", () => {
    let calls = 0;
    const evidence = simulateEvidence(
      FIXTURES.chain,
      (context) => {
        calls += 1;
        return calls === 1 ? staticPolicy(context) : { kind: "select", taskId: "not-a-task" };
      },
      11,
      3,
      staticIdentity("static")
    );
    assert.equal(evidence.status, "error");
    if (evidence.status !== "error") return;
    assert.equal(evidence.error.code, "policy-rejected");
    assert.equal(evidence.scenarioIdentity?.scenarioId, "chain");
    assert.equal(evidence.policyIdentity?.policyId, "static");
    assert.equal(evidence.seed, 11);
    assert.equal(evidence.replicate, 3);
    assert.equal(evidence.virtualTimeMs, 100);
    assert.equal(evidence.boundaryIndex, 2);
    assert.deepEqual(
      evidence.trace.map(({ kind }) => kind),
      ["select", "advance", "settle", "policy-rejection"]
    );
    assert.equal(evidence.actionObservations.length, 1);
    assert.deepEqual(evidence.actionObservations[0]?.effects, [
      { kind: "admitted", taskId: "first" },
      { kind: "settled", settlementKind: "completed", taskId: "first" }
    ]);
  });

  it("separates scenario schema rejection from public graph rejection", () => {
    const mismatched = {
      ...structuredClone(requiredFixture("chain")),
      profiles: requiredFixture("chain").profiles.map((entry, index) =>
        index === 0 ? { ...entry, resourceClaims: [{ resourceId: "unknown", units: 1 }] } : entry
      )
    };
    const invalid = simulateEvidence(mismatched, staticPolicy, 0, 0);
    assert.equal(invalid.status, "error");
    if (invalid.status === "error") {
      assert.equal(invalid.error.code, "invalid-input");
      assert.equal(invalid.scenarioIdentity, null);
    }

    for (const schemaInvalid of [
      {
        ...structuredClone(requiredFixture("chain")),
        profiles: [
          ...structuredClone(requiredFixture("chain").profiles),
          structuredClone(requiredFixture("chain").profiles[0])
        ]
      },
      {
        ...structuredClone(requiredFixture("chain")),
        taskProfiles: { ...requiredFixture("chain").taskProfiles, unknown: "first" }
      }
    ]) {
      const schemaFailure = simulateEvidence(schemaInvalid, staticPolicy, 0, 0);
      assert.equal(schemaFailure.status, "error");
      if (schemaFailure.status === "error") {
        assert.equal(schemaFailure.error.code, "invalid-input");
        assert.equal(schemaFailure.scenarioIdentity, null);
      }
    }

    const rejected = {
      ...structuredClone(requiredFixture("chain")),
      graph: { ...structuredClone(requiredFixture("chain").graph), maxParallel: 0 }
    };
    const graphFailure = simulateEvidence(rejected, staticPolicy, 0, 0);
    assert.equal(graphFailure.status, "error");
    if (graphFailure.status === "error") {
      assert.equal(graphFailure.error.code, "graph-rejected");
      assert.equal(graphFailure.scenarioIdentity?.scenarioId, "chain");
      assert.notEqual(graphFailure.profileSetIdentity, null);
    }
  });

  it("backfills past a capacity-blocked head and enforces scoped capacity", () => {
    const backfillContexts: AdmissionPolicyContext[] = [];
    const backfill = simulate(FIXTURES.backfill, (context) => {
      backfillContexts.push(context);
      return staticPolicy(context);
    });
    assert.deepEqual(
      backfill.trace.flatMap((entry) => (entry.kind === "select" ? [entry.taskId] : [])),
      ["A", "C", "B"]
    );
    const backfillBoundary = backfillContexts.find(
      ({ runningTaskIds }) => runningTaskIds.includes("A") && runningTaskIds.includes("C")
    );
    assert.ok(backfillBoundary);
    assert.equal(backfillBoundary.capacity.running, 2);
    assert.deepEqual(backfillBoundary.candidates, [{ canAdmit: false, taskId: "B" }]);

    const scopedContexts: AdmissionPolicyContext[] = [];
    const scoped = simulate(FIXTURES["scoped-capacity"], (context) => {
      scopedContexts.push(context);
      return staticPolicy(context);
    });
    assert.equal(scoped.status, "success");
    assert.equal(
      scoped.trace.some((entry) => entry.kind === "select" && entry.taskId === "scope-close"),
      true
    );
    const activeScopeBoundary = scopedContexts.find(({ activeScopeIds }) =>
      activeScopeIds.includes("serial-scope")
    );
    assert.ok(activeScopeBoundary);
    assert.equal(activeScopeBoundary.capacity.maxParallel, 2);
    assert.equal(activeScopeBoundary.capacity.effectiveMaxParallel, 1);
  });

  it("recomputes weak multi-resource rates after weighted and mutex occupancy changes", () => {
    const contexts: AdmissionPolicyContext[] = [];
    const result = simulate(FIXTURES["weighted-mutex-multi-resource"], (context) => {
      contexts.push(context);
      return staticPolicy(context);
    });
    const advances = result.trace.filter((entry) => entry.kind === "advance");
    const aRates = advances.flatMap((entry) =>
      entry.rates.filter(({ taskId }) => taskId === "A").map(({ rate }) => rate)
    );
    assert.equal(
      aRates.some((rate) => rate < 1),
      true
    );
    assert.equal(
      aRates.some((rate) => rate === 1),
      true
    );
    const cpuTime = result.resourceUnitTimeMs.cpu;
    const ioTime = result.resourceUnitTimeMs.io;
    if (cpuTime === undefined || ioTime === undefined) {
      throw new Error("weighted-mutex result lacks expected resource timings");
    }
    assert.equal(cpuTime > ioTime, true);
    const selections = result.trace.flatMap((entry) =>
      entry.kind === "select" ? [entry.taskId] : []
    );
    assert.equal(selections.indexOf("B") > selections.indexOf("A"), true);
    const mutexBoundary = contexts.find(
      ({ candidates, runningTaskIds }) =>
        runningTaskIds.includes("A") && candidates.some(({ taskId }) => taskId === "C")
    );
    assert.ok(mutexBoundary);
    assert.equal(
      mutexBoundary.candidates.some(({ taskId }) => taskId === "B"),
      false
    );
  });

  it("settles ties canonically and distinguishes unsatisfied dependencies from observers", () => {
    const tie = simulate(FIXTURES["wide-tie"]);
    assert.deepEqual(
      tie.trace.flatMap((entry) => (entry.kind === "settle" ? [entry.taskId] : [])),
      ["A", "B", "C"]
    );
    const unsatisfied = simulate(FIXTURES["unsatisfied-observes"]);
    assert.equal(
      unsatisfied.trace.some((entry) => entry.kind === "select" && entry.taskId === "dependent"),
      false
    );
    assert.equal(
      unsatisfied.trace.some(
        (entry) =>
          entry.kind === "forced-effect" &&
          entry.effect === "blocked" &&
          entry.taskId === "dependent"
      ),
      true
    );
    assert.equal(
      unsatisfied.trace.some((entry) => entry.kind === "select" && entry.taskId === "observer"),
      true
    );
  });

  it("freezes exact profile vectors and the claimed-only Gate resource shape", () => {
    assert.deepEqual(INVESTIGATION_PROFILES, [
      {
        id: "typecheck-product-like",
        nominalWorkMs: 356.19944599999997,
        multiplierSamples: [
          1, 1.0796332878069668, 1.0580729005401093, 0.9596890024360117, 0.9759981210077459
        ],
        resourceClaims: []
      },
      {
        id: "typecheck-scripts-like",
        nominalWorkMs: 357.39817600000003,
        multiplierSamples: [
          0.9921561071425277, 1.1083471114301378, 1, 1.1743827758091299, 0.9904026650656436
        ],
        resourceClaims: []
      },
      {
        id: "lint-product-like",
        nominalWorkMs: 1158.922142,
        multiplierSamples: [
          0.9859457219689569, 0.9550093374607387, 1.4119588993062833, 1.1495091971415627, 1
        ],
        resourceClaims: []
      },
      {
        id: "lint-scripts-like",
        nominalWorkMs: 830.415966,
        multiplierSamples: [
          0.9641929668775179, 0.8821034854717618, 1.3393843152577343, 1, 1.129553002838098
        ],
        resourceClaims: []
      }
    ]);
    const gate = requiredFixture("gate-shape-v1");
    assert.equal(gate.mappingIdentity, "project-gate-named-resources@b30477b6");
    assert.equal(GATE_MAPPING.identity, "project-gate-named-resources@b30477b6");
    assert.equal(gate.graph.maxParallel, 3);
    assert.equal(
      gate.graph.graph.tasks.filter(
        ({ resourceClaims }) => resourceClaims[0]?.resourceId === "project-gate-bun-test-runners"
      ).length,
      17
    );
    assert.equal(
      gate.graph.graph.tasks.filter(
        ({ resourceClaims }) => resourceClaims[0]?.resourceId === "project-gate-repository-scans"
      ).length,
      4
    );
    const result = simulate(gate);
    assert.equal(result.assumptions.virtualTimeIsGateTiming, false);
    assert.equal(result.scenarioIdentity.mappingIdentity, "project-gate-named-resources@b30477b6");
  });

  it("rejects wait without running work and illegal proposals without fallback", () => {
    for (const policy of [
      () => ({ kind: "wait" }) as const,
      () => ({ kind: "select", taskId: "none" }) as const
    ]) {
      const evidence = simulateEvidence(FIXTURES.chain, policy, 0, 0);
      assert.equal(evidence.status, "error");
      if (evidence.status !== "error") continue;
      assert.equal(["no-progress", "policy-rejected"].includes(evidence.error.code), true);
      assert.equal(
        evidence.trace.some((entry) => entry.kind === "select"),
        false
      );
    }
  });
});

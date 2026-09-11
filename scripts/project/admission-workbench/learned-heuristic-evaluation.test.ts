import assert from "node:assert/strict";
import { test } from "node:test";

import type { AdmissionPolicyContext } from "@zxyycom/vibe-check";

import { compareSuites } from "./learned-heuristic-comparison.ts";
import type { CostSummary, Protocol, Suite } from "./learned-heuristic-evaluation-types.ts";
import { requiredFixture } from "./fixture-registry.ts";
import {
  prepareLearnedPolicyWithFactory,
  REGISTERED_LEARNED_FIXTURE,
  staticIdentity,
  staticPolicy,
  type LearnedStrategyFactory
} from "./policy.ts";
import { simulate, type SimulationResult } from "./simulate.ts";

const protocol: Protocol = Object.freeze({
  hostCost: Object.freeze({ corpusIterations: 1, samples: 1, warmups: 0 }),
  protocolId: "test-protocol",
  scenarioInputs: Object.freeze([]),
  schemaVersion: 2,
  virtualComparison: Object.freeze({
    replicates: 1,
    seed: 7,
    secondary: Object.freeze({ improvementEligibleScenarioIds: Object.freeze(["regression"]) })
  })
});

const passingCost: CostSummary = Object.freeze({
  baseline: Object.freeze({ p50Ms: 24, p95Ms: 24, samplesMs: Object.freeze([24]) }),
  baselineContextCorpusSha256: "sha256:fixed-contexts",
  candidate: Object.freeze({ p50Ms: 25, p95Ms: 25, samplesMs: Object.freeze([25]) }),
  corpusContextCounts: Object.freeze([Object.freeze({ count: 1, scenarioId: "regression" })]),
  measurementBoundary: "fresh-public-prepared-direct-decide",
  measurementOrder: "alternating-baseline-first",
  warmupCount: 0
});

test("learned heuristic replay rejects a 204 to 300 makespan regression even when its cost guard passes", () => {
  const baseline = suiteFor(204);
  const candidate = suiteFor(300);
  const comparison = compareSuites(protocol, baseline, candidate, passingCost);

  assert.equal(comparison.costGuard.passes, true);
  assert.equal(comparison.disposition, "candidate-rejected");
  assert.deepEqual(comparison.findings, [
    "regression/0: makespan regressed",
    "regression: tail makespan regressed",
    "no strictly improved eligible scenario after primary and secondary checks"
  ]);
});

test("learned heuristic replay keeps a sticky fallback failure outside direct prepared decide replay", async () => {
  let context: AdmissionPolicyContext | undefined;
  simulate(requiredFixture("single"), (value) => {
    context = value;
    return staticPolicy(value);
  });
  const capturedContext = context;
  assert.ok(capturedContext);

  const handle = await prepareLearnedPolicyWithFactory(
    fallbackAfterDecisionFactory,
    REGISTERED_LEARNED_FIXTURE,
    requiredFixture("single").graph.graph
  );
  try {
    assert.deepEqual(handle.directDecide(capturedContext), { kind: "select", taskId: "only" });
    assert.throws(handle.assertValid, /fallback invalidates this comparison/);
    assert.throws(() => handle.decide(capturedContext), /fallback invalidates this comparison/);
  } finally {
    await handle.dispose();
  }
});

type ObservedFactoryOptions = Readonly<{
  readonly observe?: (
    event: Readonly<{ readonly kind: "history-unavailable"; readonly reason: "setup-failed" }>
  ) => void | Promise<void>;
}>;

const fallbackAfterDecisionFactory: LearnedStrategyFactory = (options: ObservedFactoryOptions) =>
  Object.freeze({
    kind: "prepared" as const,
    prepare: async () =>
      Object.freeze({
        decide: (context: AdmissionPolicyContext) => {
          const observation = options.observe?.({
            kind: "history-unavailable",
            reason: "setup-failed"
          });
          if (observation !== undefined) void observation.then(undefined, () => undefined);
          const selected = context.candidates.find(({ canAdmit }) => canAdmit);
          return selected === undefined
            ? Object.freeze({ kind: "wait" as const })
            : Object.freeze({ kind: "select" as const, taskId: selected.taskId });
        }
      })
  });

function suiteFor(makespanMs: number): Suite {
  const result = simulationResult(makespanMs);
  return Object.freeze({
    artifact: Object.freeze({
      entrySha256: "sha256:test",
      packageContentsSha256: "sha256:test-package",
      packageName: "@zxyycom/vibe-check" as const,
      packageVersion: "0.0.0-test"
    }),
    policyIdentity: staticIdentity("static"),
    scenarios: Object.freeze([
      Object.freeze({ results: Object.freeze([result]), scenarioId: "regression" })
    ])
  });
}

function simulationResult(makespanMs: number): SimulationResult {
  const result = simulate(requiredFixture("single"), staticPolicy, 7, 0, staticIdentity("static"));
  assert.equal(result.status, "success");
  return Object.freeze({ ...result, makespanMs });
}

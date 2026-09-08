import { canonicalJsonText } from "./evidence.ts";
import { compareSuites } from "./learned-heuristic-comparison.ts";
import { measureComparableCost } from "./learned-heuristic-cost.ts";
import {
  loadArtifact,
  loadProtocol,
  loadScenarioCases,
  parseInvocation,
  writeExclusive
} from "./learned-heuristic-evaluation-input.ts";
import type {
  EvaluationEvidence,
  Protocol,
  ScenarioCase,
  Suite
} from "./learned-heuristic-evaluation-types.ts";
import {
  prepareLearnedPolicyWithFactory,
  REGISTERED_LEARNED_FIXTURE,
  type PolicyIdentity
} from "./policy.ts";
import { simulateEvidence, type SimulationEvidence } from "./simulate.ts";

const COMMAND_ID = "bun scripts/project/admission-workbench/learned-heuristic-evaluation.ts";

/**
 * Compares two published package directories. Virtual behavior is evaluated against each
 * artifact's public strategy; host cost replays baseline-captured public contexts through both.
 */
export async function runLearnedHeuristicEvaluation(args: readonly string[]): Promise<void> {
  const invocation = parseInvocation(args);
  const { protocol, sha256 } = await loadProtocol();
  const scenarios = await loadScenarioCases(protocol);
  const baseline = await loadArtifact(invocation.baselineArtifactPath);
  const candidate = await loadArtifact(invocation.candidateArtifactPath);
  const baselineSuite = await evaluateSuite(baseline, scenarios, protocol);
  const candidateSuite = await evaluateSuite(candidate, scenarios, protocol);
  const hostCost = await measureComparableCost(baseline, candidate, scenarios, protocol);
  const evidence: EvaluationEvidence = Object.freeze({
    baseline: baselineSuite,
    candidate: candidateSuite,
    comparison: compareSuites(protocol, baselineSuite, candidateSuite, hostCost),
    environment: Object.freeze({
      architecture: process.arch,
      command: COMMAND_ID,
      bunVersion: process.versions.bun ?? "unknown",
      platform: process.platform
    }),
    hostCost,
    protocol: Object.freeze({
      id: protocol.protocolId,
      sha256,
      schemaVersion: protocol.schemaVersion
    }),
    scenarioInputs: Object.freeze(
      scenarios.map(({ scenarioId, source }) => Object.freeze({ scenarioId, source }))
    ),
    schemaVersion: 2 as const
  });
  await writeExclusive(invocation.outputPath, `${canonicalJsonText(evidence, 2)}\n`);
}

async function evaluateSuite(
  artifact: Awaited<ReturnType<typeof loadArtifact>>,
  scenarios: readonly ScenarioCase[],
  protocol: Protocol
): Promise<Suite> {
  const resultsByScenario: Suite["scenarios"][number][] = [];
  let policyIdentity: PolicyIdentity | undefined;
  for (const scenarioCase of scenarios) {
    const results = await evaluateScenarioReplicates(artifact, scenarioCase, protocol);
    policyIdentity ??= results.policyIdentity;
    resultsByScenario.push(
      Object.freeze({ results: results.evidence, scenarioId: scenarioCase.scenarioId })
    );
  }
  if (policyIdentity === undefined)
    throw new TypeError("protocol must contain at least one scenario");
  return Object.freeze({
    artifact: artifact.identity,
    policyIdentity,
    scenarios: Object.freeze(resultsByScenario)
  });
}

async function evaluateScenarioReplicates(
  artifact: Awaited<ReturnType<typeof loadArtifact>>,
  scenarioCase: ScenarioCase,
  protocol: Protocol
): Promise<
  Readonly<{
    readonly evidence: readonly SimulationEvidence[];
    readonly policyIdentity: PolicyIdentity;
  }>
> {
  const evidence: SimulationEvidence[] = [];
  let policyIdentity: PolicyIdentity | undefined;
  for (let replicate = 0; replicate < protocol.virtualComparison.replicates; replicate += 1) {
    const policy = await prepareLearnedPolicyWithFactory(
      artifact.factory,
      REGISTERED_LEARNED_FIXTURE,
      scenarioCase.scenario.graph.graph
    );
    policyIdentity ??= policy.identity;
    try {
      evidence.push(
        simulateEvidence(
          scenarioCase.scenario,
          policy.decide,
          protocol.virtualComparison.seed,
          replicate,
          policy.identity,
          artifact.identity
        )
      );
    } finally {
      await policy.dispose();
    }
  }
  if (policyIdentity === undefined) throw new TypeError("protocol requires at least one replicate");
  return Object.freeze({ evidence: Object.freeze(evidence), policyIdentity });
}

if (import.meta.main) await runLearnedHeuristicEvaluation(process.argv.slice(2));

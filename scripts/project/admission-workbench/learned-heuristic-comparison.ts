import type {
  Comparison,
  CostSummary,
  Protocol,
  Suite
} from "./learned-heuristic-evaluation-types.ts";
import type { SimulationResult } from "./simulate.ts";

/** Applies the frozen primary, secondary, and host-cost acceptance criteria to two suites. */
export function compareSuites(
  protocol: Protocol,
  baseline: Suite,
  candidate: Suite,
  hostCost: CostSummary
): Comparison {
  const findings: string[] = [];
  const improvements: string[] = [];
  const baselineByScenario = new Map(baseline.scenarios.map((entry) => [entry.scenarioId, entry]));
  for (const candidateScenario of candidate.scenarios) {
    const baselineScenario = baselineByScenario.get(candidateScenario.scenarioId);
    if (baselineScenario === undefined)
      findings.push(`${candidateScenario.scenarioId}: baseline scenario is missing`);
    else compareScenario(candidateScenario, baselineScenario, protocol, findings, improvements);
  }
  const costGuard = compareHostCost(hostCost, findings);
  if (improvements.length === 0)
    findings.push("no strictly improved eligible scenario after primary and secondary checks");
  return Object.freeze({
    costGuard,
    disposition: findings.length === 0 ? "candidate-proposed" : "candidate-rejected",
    findings: Object.freeze(findings),
    improvements: Object.freeze(improvements)
  });
}

interface ScenarioComparison {
  readonly baseline: Suite["scenarios"][number];
  readonly candidate: Suite["scenarios"][number];
  readonly findings: string[];
  readonly improvements: string[];
  readonly protocol: Protocol;
  readonly tails: { baseline: number; candidate: number };
}

function compareScenario(
  candidate: Suite["scenarios"][number],
  baseline: Suite["scenarios"][number],
  protocol: Protocol,
  findings: string[],
  improvements: string[]
): void {
  if (candidate.results.length !== baseline.results.length) {
    findings.push(`${candidate.scenarioId}: replicate count differs from baseline`);
    return;
  }
  const comparison: ScenarioComparison = {
    baseline,
    candidate,
    findings,
    improvements,
    protocol,
    tails: { baseline: 0, candidate: 0 }
  };
  for (let index = 0; index < candidate.results.length; index += 1)
    compareReplicate(comparison, index);
  if (comparison.tails.candidate > comparison.tails.baseline)
    findings.push(`${candidate.scenarioId}: tail makespan regressed`);
}

function compareReplicate(comparison: ScenarioComparison, index: number): void {
  const candidateResult = comparison.candidate.results[index];
  const baselineResult = comparison.baseline.results[index];
  if (candidateResult === undefined || baselineResult === undefined)
    throw new Error("replicate is missing");
  if (candidateResult.status !== "success" || baselineResult.status !== "success") {
    comparison.findings.push(
      `${comparison.candidate.scenarioId}/${index}: simulation did not succeed`
    );
    return;
  }
  comparison.tails.candidate = Math.max(comparison.tails.candidate, candidateResult.makespanMs);
  comparison.tails.baseline = Math.max(comparison.tails.baseline, baselineResult.makespanMs);
  comparePrimaryMetrics(comparison, index, candidateResult, baselineResult);
  recordEligibleImprovement(comparison, index, candidateResult, baselineResult);
}

function comparePrimaryMetrics(
  comparison: ScenarioComparison,
  index: number,
  candidate: SimulationResult,
  baseline: SimulationResult
): void {
  const prefix = `${comparison.candidate.scenarioId}/${index}`;
  if (candidate.sampledWorkCommitment !== baseline.sampledWorkCommitment)
    comparison.findings.push(`${prefix}: sampled work commitment changed`);
  if (candidate.makespanMs > baseline.makespanMs)
    comparison.findings.push(`${prefix}: makespan regressed`);
  if (candidate.slotTimeMs > baseline.slotTimeMs)
    comparison.findings.push(`${prefix}: slot time regressed`);
  compareResourceUnitTimes(
    prefix,
    candidate.resourceUnitTimeMs,
    baseline.resourceUnitTimeMs,
    comparison.findings
  );
}

function compareResourceUnitTimes(
  prefix: string,
  candidate: Readonly<Record<string, number>>,
  baseline: Readonly<Record<string, number>>,
  findings: string[]
): void {
  for (const [resourceId, baselineUnits] of Object.entries(baseline)) {
    const candidateUnits = candidate[resourceId];
    if (candidateUnits === undefined || candidateUnits > baselineUnits)
      findings.push(`${prefix}: ${resourceId} unit time regressed`);
  }
}

function recordEligibleImprovement(
  comparison: ScenarioComparison,
  index: number,
  candidate: SimulationResult,
  baseline: SimulationResult
): void {
  if (
    !comparison.protocol.virtualComparison.secondary.improvementEligibleScenarioIds.includes(
      comparison.candidate.scenarioId
    )
  )
    return;
  if (candidate.makespanMs < baseline.makespanMs)
    comparison.improvements.push(`${comparison.candidate.scenarioId}/${index}: makespan improved`);
}

function compareHostCost(hostCost: CostSummary, findings: string[]): Comparison["costGuard"] {
  const budgetP95Ms = hostCost.baseline.p95Ms * 1.25;
  const passes = hostCost.candidate.p95Ms <= budgetP95Ms;
  if (!passes) findings.push("host-cost: p95 exceeds the fixed 1.25x baseline budget");
  return Object.freeze({
    baselineP95Ms: hostCost.baseline.p95Ms,
    budgetP95Ms,
    candidateP95Ms: hostCost.candidate.p95Ms,
    passes
  });
}

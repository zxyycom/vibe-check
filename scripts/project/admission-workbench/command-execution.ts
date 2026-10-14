import { createAdmissionGraph } from "@zxyycom/vibe-check";
import {
  EVIDENCE_SCHEMA_VERSION,
  canonicalJsonText,
  scenarioEvidenceIdentity,
  type CandidateIdentity
} from "./evidence.ts";
import {
  prepareRegisteredPolicy,
  registeredPolicyIdentity,
  staticPolicy,
  type PolicyIdentity
} from "./policy.ts";
import { CommandFailure } from "./command-output.ts";
import type { PolicyRegistryId, Scenario } from "./scenario.ts";
import { simulateEvidence, type SimulationEvidence } from "./simulate.ts";

/** Normalized replicate inputs; output routing remains with the command entry. */
export interface ReplicateOptions {
  readonly policy: PolicyRegistryId;
  readonly replicates: number;
  readonly seed: number;
}

export interface WorkbenchEvidence {
  readonly candidateIdentity: CandidateIdentity;
  readonly policyIdentity: PolicyIdentity;
  readonly replicates: number;
  readonly results: readonly SimulationEvidence[];
  readonly scenarioIdentity: ReturnType<typeof scenarioEvidenceIdentity>;
  readonly schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
  readonly seed: number;
  readonly source: "virtual";
  readonly status: "error" | "success";
}

export async function executeReplicates(
  scenario: Scenario,
  options: ReplicateOptions,
  candidateIdentity: CandidateIdentity
): Promise<WorkbenchEvidence> {
  try {
    createAdmissionGraph(scenario.graph);
  } catch {
    const policyIdentity = registeredPolicyIdentity(options.policy);
    return workbenchEvidence({
      candidateIdentity,
      options,
      policyIdentity,
      results: Array.from({ length: options.replicates }, (_, replicate) =>
        simulateEvidence(
          scenario,
          staticPolicy,
          options.seed,
          replicate,
          policyIdentity,
          candidateIdentity
        )
      ),
      scenario
    });
  }
  const results: SimulationEvidence[] = [];
  let stablePolicyIdentity: PolicyIdentity | undefined;
  for (let replicate = 0; replicate < options.replicates; replicate += 1) {
    const policy = await prepareRegisteredPolicy(options.policy, scenario.graph.graph);
    stablePolicyIdentity ??= policy.identity;
    if (canonicalJsonText(stablePolicyIdentity) !== canonicalJsonText(policy.identity)) {
      await policy.dispose();
      throw new CommandFailure(
        "policy-rejected",
        "policy input identity changed across replicates"
      );
    }
    try {
      results.push(
        simulateEvidence(
          scenario,
          policy.decide,
          options.seed,
          replicate,
          policy.identity,
          candidateIdentity
        )
      );
    } finally {
      await policy.dispose();
    }
  }
  if (stablePolicyIdentity === undefined) {
    throw new CommandFailure("invalid-input", "replicate count produced no policy identity");
  }
  return workbenchEvidence({
    candidateIdentity,
    options,
    policyIdentity: stablePolicyIdentity,
    results,
    scenario
  });
}

interface WorkbenchEvidenceInput {
  readonly candidateIdentity: CandidateIdentity;
  readonly options: ReplicateOptions;
  readonly policyIdentity: PolicyIdentity;
  readonly results: readonly SimulationEvidence[];
  readonly scenario: Scenario;
}

function workbenchEvidence(input: WorkbenchEvidenceInput): WorkbenchEvidence {
  return Object.freeze({
    candidateIdentity: input.candidateIdentity,
    policyIdentity: input.policyIdentity,
    replicates: input.options.replicates,
    results: Object.freeze(input.results),
    scenarioIdentity: scenarioEvidenceIdentity(input.scenario),
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    seed: input.options.seed,
    source: "virtual" as const,
    status: input.results.some(({ status }) => status === "error")
      ? ("error" as const)
      : ("success" as const)
  });
}

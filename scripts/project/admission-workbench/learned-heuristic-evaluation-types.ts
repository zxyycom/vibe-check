import type { AdmissionPolicyContext } from "@zxyycom/vibe-check";

import type { CandidateIdentity } from "./evidence.ts";
import type { DecisionPolicy, LearnedStrategyFactory, PolicyIdentity } from "./policy.ts";
import type { Scenario } from "./scenario.ts";
import type { SimulationEvidence } from "./simulate.ts";

export interface ArtifactIdentity extends CandidateIdentity {
  readonly packageContentsSha256: string;
}

export interface Artifact {
  readonly directory: string;
  readonly factory: LearnedStrategyFactory;
  readonly identity: ArtifactIdentity;
}

export interface ProtocolScenarioInput {
  readonly fixtureId?: string;
  readonly path?: string;
}

export interface Protocol {
  readonly hostCost: Readonly<{
    readonly corpusIterations: number;
    readonly samples: number;
    readonly warmups: number;
  }>;
  readonly protocolId: string;
  readonly scenarioInputs: readonly ProtocolScenarioInput[];
  readonly schemaVersion: 2;
  readonly virtualComparison: Readonly<{
    readonly replicates: number;
    readonly seed: number;
    readonly secondary: Readonly<{
      readonly improvementEligibleScenarioIds: readonly string[];
    }>;
  }>;
}

export interface ScenarioCase {
  readonly scenario: Scenario;
  readonly scenarioId: string;
  readonly source: string;
}

export interface Suite {
  readonly artifact: ArtifactIdentity;
  readonly scenarios: readonly Readonly<{
    readonly results: readonly SimulationEvidence[];
    readonly scenarioId: string;
  }>[];
  readonly policyIdentity: PolicyIdentity;
}

export interface CostSummary {
  readonly baseline: TimingSummary;
  readonly candidate: TimingSummary;
  readonly baselineContextCorpusSha256: string;
  readonly corpusContextCounts: readonly Readonly<{
    readonly count: number;
    readonly scenarioId: string;
  }>[];
  readonly measurementBoundary: "fresh-public-prepared-direct-decide";
  readonly measurementOrder: "alternating-baseline-first";
  readonly warmupCount: number;
}

export interface TimingSummary {
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly samplesMs: readonly number[];
}

export interface Comparison {
  readonly costGuard: Readonly<{
    readonly budgetP95Ms: number;
    readonly candidateP95Ms: number;
    readonly baselineP95Ms: number;
    readonly passes: boolean;
  }>;
  readonly disposition: "candidate-proposed" | "candidate-rejected";
  readonly findings: readonly string[];
  readonly improvements: readonly string[];
}

export interface EvaluationEvidence {
  readonly baseline: Suite;
  readonly candidate: Suite;
  readonly comparison: Comparison;
  readonly environment: Readonly<{
    readonly architecture: string;
    readonly command: string;
    readonly bunVersion: string;
    readonly platform: string;
  }>;
  readonly hostCost: CostSummary;
  readonly protocol: Readonly<{
    readonly id: string;
    readonly sha256: string;
    readonly schemaVersion: 2;
  }>;
  readonly scenarioInputs: readonly Readonly<{
    readonly scenarioId: string;
    readonly source: string;
  }>[];
  readonly schemaVersion: 2;
}

export interface CapturedCorpusEntry {
  readonly contexts: readonly AdmissionPolicyContext[];
  readonly scenario: Scenario;
  readonly scenarioId: string;
}

export interface TimingCorpusEntry {
  readonly assertValid: () => void;
  readonly baselineDecide: DecisionPolicy;
  readonly candidateDecide: DecisionPolicy;
  readonly contexts: readonly AdmissionPolicyContext[];
  readonly dispose: () => Promise<void>;
}

export interface EvaluationInvocation {
  readonly baselineArtifactPath: string;
  readonly candidateArtifactPath: string;
  readonly outputPath: string;
}

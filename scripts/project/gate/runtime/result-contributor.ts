import type { PreparedPackageCandidate } from "../../../package/candidate/prepare.ts";

import type { ProjectGateSelection } from "./controls.ts";
import type { ProjectGatePerformanceBaseline } from "./performance-baseline.ts";
import type { ProjectGateMessage, ProjectGateResult } from "./result.ts";

/** Immutable timing facts from one candidate-backed Gate invocation. */
export interface ProjectGateTiming {
  readonly adapterSetupMs: number;
  readonly candidatePreparationMs: number;
  readonly elapsedToInitialResultMs: number;
  readonly initialResultAtMs: number;
  readonly productRunMs: number;
  readonly startedAtMs: number;
}

/** Immutable facts supplied to the project-owned result contribution. */
export interface ProjectGateContext {
  readonly invocationLogDirectory: string;
  readonly preparedCandidate: PreparedPackageCandidate;
  readonly performanceBaselines: readonly ProjectGatePerformanceBaseline[];
  readonly repositoryRoot: string;
  readonly runResult: unknown;
  readonly selection: ProjectGateSelection;
  readonly timing: ProjectGateTiming;
}

/** The frozen Product-derived Gate result that a contributor may inspect but never replace. */
export interface ProjectGateResultContributionContext extends ProjectGateContext {
  readonly initialResult: ProjectGateResult;
}

/** A contributor may only add messages and downgrade a passing Gate result. */
export interface ProjectGateResultContribution {
  readonly blocks: boolean;
  readonly messages: readonly ProjectGateMessage[];
}

/** Project-owned synchronous or asynchronous contribution to the final Gate result. */
export type ProjectGateResultContributor = (
  context: ProjectGateResultContributionContext
) => ProjectGateResultContribution | Promise<ProjectGateResultContribution>;

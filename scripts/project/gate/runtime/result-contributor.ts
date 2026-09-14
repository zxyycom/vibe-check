import type { PreparedPackageCandidate } from "../../../package/candidate/prepare.ts";

import type { ProjectGateSelection } from "./controls.ts";
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
  readonly repositoryRoot: string;
  readonly runResult: unknown;
  readonly selection: ProjectGateSelection;
  readonly timing: ProjectGateTiming;
}

/** The frozen Product-derived Gate result that a contributor may inspect but never replace. */
export interface ProjectGateResultContributionContext extends ProjectGateContext {
  readonly initialResult: ProjectGateResult;
}

/** Project-owned synchronous or asynchronous contribution of validated Gate messages. */
export type ProjectGateResultContributor = (
  context: ProjectGateResultContributionContext
) => readonly ProjectGateMessage[] | Promise<readonly ProjectGateMessage[]>;

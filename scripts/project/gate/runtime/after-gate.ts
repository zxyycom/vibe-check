import type { PreparedPackageCandidate } from "../../../package/candidate/prepare.ts";

import type { ProjectGateSelection } from "./controls.ts";
import type { ProjectGateResult } from "./result.ts";

/** Immutable timing facts from one candidate-backed Gate invocation. */
export interface ProjectGateTiming {
  readonly adapterSetupMs: number;
  readonly candidatePreparationMs: number;
  readonly elapsedToInitialResultMs: number;
  readonly initialResultAtMs: number;
  readonly productRunMs: number;
  readonly startedAtMs: number;
}

/** Immutable facts supplied to project-owned result post-processing. */
export interface ProjectGateContext {
  readonly invocationLogDirectory: string;
  readonly preparedCandidate: PreparedPackageCandidate;
  readonly repositoryRoot: string;
  readonly runResult: unknown;
  readonly selection: ProjectGateSelection;
  readonly timing: ProjectGateTiming;
}

/** A project-owned synchronous or asynchronous transformation of one Gate result. */
export type ProjectGateAfterHook = (
  result: ProjectGateResult,
  context: ProjectGateContext
) => ProjectGateResult | Promise<ProjectGateResult>;

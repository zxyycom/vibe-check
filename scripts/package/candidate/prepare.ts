import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { artifactDocumentation } from "../artifact/documentation-audit.ts";
import { CANDIDATE_NAME } from "../package-contract.ts";
import { buildCandidateArtifact, type CandidateArtifact } from "../artifact/build.ts";
import { createArtifactFingerprint } from "../artifact/fingerprint.ts";
import { inspectInstallation, installCandidate } from "./install.ts";
import {
  candidatePaths,
  clearCandidateBuildEvidence,
  clearCandidateState,
  assessReusableArtifact,
  receiptMatchesInstallation,
  writeReceipt,
  type CandidateArtifactReuseRejection,
  type InstalledCandidate
} from "./receipt.ts";

export type { CandidateArtifact } from "../artifact/build.ts";

interface PreparedPackageCandidateLocation {
  readonly consumerDirectory: string;
  readonly installedPackageDirectory: string;
  readonly resolvedEntryPath: string;
}

export type CandidatePreparationAction = "rebuild" | "reinstall" | "reuse";
export type CandidatePreparationReason =
  | CandidateArtifactReuseRejection
  | "installation-current"
  | "installation-invalid";

export type CandidatePreparationDecision =
  | Readonly<{ readonly action: "rebuild"; readonly reason: CandidateArtifactReuseRejection }>
  | Readonly<{ readonly action: "reinstall"; readonly reason: "installation-invalid" }>
  | Readonly<{ readonly action: "reuse"; readonly reason: "installation-current" }>;

export type CandidatePreparationFact =
  | Readonly<{
      readonly preparationAction: "rebuild";
      readonly preparationReason: CandidateArtifactReuseRejection;
      readonly reused: false;
    }>
  | Readonly<{
      readonly preparationAction: "reinstall";
      readonly preparationReason: "installation-invalid";
      readonly reused: false;
    }>
  | Readonly<{
      readonly preparationAction: "reuse";
      readonly preparationReason: "installation-current";
      readonly reused: true;
    }>;

export type PreparedPackageCandidate = Readonly<
  CandidateArtifact & PreparedPackageCandidateLocation & CandidatePreparationFact
>;

/** Read-only candidate state used by the root package status command. */
export interface PackageCandidateStatus {
  readonly candidateVersion: string;
  readonly freshness: "current" | "stale";
  readonly installedEntryPath: string | undefined;
  /** The fail-closed repair action when the inspected state is stale. */
  readonly requiredAction: CandidatePreparationDecision | undefined;
  readonly tarballPath: string;
  readonly unpackedPackagePath: string;
}

export interface PreparePackageCandidateOptions {
  /** Defaults to this checkout's repository root. */
  readonly repositoryRoot?: string;
  /** Defaults to the one shared private project consumer. */
  readonly consumerDirectory?: string;
  /** Defaults to the ignored candidate state directory in this checkout. */
  readonly stateDirectory?: string;
  /** Defaults to this checkout's `build/` package evidence root. */
  readonly buildDirectory?: string;
}

/**
 * Creates or safely reuses the one local package candidate consumed by repository
 * project runs. It never accepts a receipt, tarball, install, or resolved entry
 * that does not exactly match current inputs and the shared consumer location.
 */
export async function preparePackageCandidate(
  options: PreparePackageCandidateOptions = {}
): Promise<PreparedPackageCandidate> {
  const plan = createCandidatePreparationPlan(options);
  if (plan.action === "reuse") {
    return createPreparedCandidate({
      artifact: plan.artifact,
      consumerDirectory: plan.consumerDirectory,
      decision: plan,
      installation: plan.installation
    });
  }
  if (plan.action === "reinstall") {
    const installation = installCandidate({
      artifactPath: plan.artifact.artifactPath,
      candidateVersion: plan.candidateVersion,
      consumerDirectory: plan.consumerDirectory,
      expectedDocuments: plan.documentation.documents,
      expectedJSDocExamplePayloads: plan.documentation.expectedJSDocExamplePayloads,
      expectedReadme: plan.documentation.readme
    });
    writeReceipt({
      artifact: plan.artifact,
      consumerDirectory: plan.consumerDirectory,
      installation,
      receiptPath: plan.paths.receiptPath
    });
    return createPreparedCandidate({
      artifact: plan.artifact,
      consumerDirectory: plan.consumerDirectory,
      decision: plan,
      installation
    });
  }

  clearCandidateState(plan.paths);
  clearCandidateBuildEvidence(plan.paths);
  const artifact = await buildCandidateArtifact({
    artifactDirectory: plan.paths.artifactDirectory,
    candidateVersion: plan.candidateVersion,
    documentation: plan.documentation,
    inputFingerprint: plan.inputFingerprint,
    repositoryRoot: plan.repositoryRoot,
    stagingDirectory: plan.paths.stagingDirectory,
    tsBuildInfoPath: plan.paths.tsBuildInfoPath
  });
  const installation = installCandidate({
    artifactPath: artifact.artifactPath,
    candidateVersion: plan.candidateVersion,
    consumerDirectory: plan.consumerDirectory,
    expectedDocuments: plan.documentation.documents,
    expectedJSDocExamplePayloads: plan.documentation.expectedJSDocExamplePayloads,
    expectedReadme: plan.documentation.readme
  });
  writeReceipt({
    artifact,
    consumerDirectory: plan.consumerDirectory,
    installation,
    receiptPath: plan.paths.receiptPath
  });
  return createPreparedCandidate({
    artifact,
    consumerDirectory: plan.consumerDirectory,
    decision: plan,
    installation
  });
}

/** Returns the mutation-free candidate action and reason used by preparation execution. */
export function assessPackageCandidatePreparation(
  options: PreparePackageCandidateOptions = {}
): CandidatePreparationDecision {
  return candidatePreparationDecision(createCandidatePreparationPlan(options));
}

/** Inspects the exact state that preparation would accept without changing files or installation. */
export function inspectPackageCandidate(
  options: PreparePackageCandidateOptions = {}
): PackageCandidateStatus {
  const plan = createCandidatePreparationPlan(options);
  const preparation = candidatePreparationDecision(plan);
  return Object.freeze({
    candidateVersion: plan.candidateVersion,
    freshness: preparation.action === "reuse" ? "current" : "stale",
    installedEntryPath: plan.action === "reuse" ? plan.installation.resolvedEntryPath : undefined,
    requiredAction: preparation.action === "reuse" ? undefined : preparation,
    tarballPath: join(
      plan.paths.artifactDirectory,
      `${CANDIDATE_NAME}-${plan.candidateVersion}.tgz`
    ),
    unpackedPackagePath: plan.paths.stagingDirectory
  });
}

function candidatePreparationDecision(
  plan: CandidatePreparationPlan
): CandidatePreparationDecision {
  switch (plan.action) {
    case "rebuild":
      return Object.freeze({ action: "rebuild", reason: plan.reason });
    case "reinstall":
      return Object.freeze({ action: "reinstall", reason: plan.reason });
    case "reuse":
      return Object.freeze({ action: "reuse", reason: plan.reason });
  }
}

type CandidatePreparationContext = Readonly<{
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly documentation: ReturnType<typeof artifactDocumentation>;
  readonly inputFingerprint: string;
  readonly paths: ReturnType<typeof candidatePaths>;
  readonly repositoryRoot: string;
}>;

type CandidatePreparationPlan = CandidatePreparationContext &
  (
    | Readonly<{
        readonly action: "reinstall";
        readonly artifact: CandidateArtifact;
        readonly reason: "installation-invalid";
      }>
    | Readonly<{
        readonly action: "reuse";
        readonly artifact: CandidateArtifact;
        readonly installation: InstalledCandidate;
        readonly reason: "installation-current";
      }>
    | Readonly<{
        readonly action: "rebuild";
        readonly reason: CandidateArtifactReuseRejection;
      }>
  );

function createCandidatePreparationPlan(
  options: PreparePackageCandidateOptions
): CandidatePreparationPlan {
  const repositoryRoot = resolve(options.repositoryRoot ?? repositoryRootFromModule());
  const consumerDirectory = resolve(
    options.consumerDirectory ?? join(repositoryRoot, "scripts/project")
  );
  const paths = candidatePaths(repositoryRoot, {
    ...(options.buildDirectory === undefined ? {} : { buildDirectory: options.buildDirectory }),
    ...(options.stateDirectory === undefined ? {} : { stateDirectory: options.stateDirectory })
  });
  const documentation = artifactDocumentation(repositoryRoot);
  const inputFingerprint = createArtifactFingerprint(repositoryRoot);
  const candidateVersion = `0.0.0-local.${inputFingerprint.slice(0, 12)}`;

  const assessment = assessReusableArtifact({
    candidateVersion,
    expectedDocuments: documentation.documents,
    expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
    expectedReadme: documentation.readme,
    inputFingerprint,
    paths
  });
  const preparationContext: CandidatePreparationContext = Object.freeze({
    candidateVersion,
    consumerDirectory,
    documentation,
    inputFingerprint,
    paths,
    repositoryRoot
  });
  if (assessment.status === "reusable") {
    const reusable = assessment.candidate;
    const installation = inspectInstallation({
      candidateVersion,
      consumerDirectory,
      expectedDocuments: documentation.documents,
      expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
      expectedReadme: documentation.readme
    });
    if (
      installation !== undefined &&
      receiptMatchesInstallation(reusable.receipt, consumerDirectory, installation)
    ) {
      return Object.freeze({
        ...preparationContext,
        action: "reuse",
        artifact: reusable.artifact,
        installation,
        reason: "installation-current"
      });
    }
    return Object.freeze({
      ...preparationContext,
      action: "reinstall",
      artifact: reusable.artifact,
      reason: "installation-invalid"
    });
  }
  return Object.freeze({
    ...preparationContext,
    action: "rebuild",
    reason: assessment.reason
  });
}

function repositoryRootFromModule(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
}

function createPreparedCandidate(input: {
  readonly artifact: CandidateArtifact;
  readonly consumerDirectory: string;
  readonly decision: CandidatePreparationDecision;
  readonly installation: InstalledCandidate;
}): PreparedPackageCandidate {
  return Object.freeze({
    ...input.artifact,
    consumerDirectory: input.consumerDirectory,
    installedPackageDirectory: input.installation.installedPackageDirectory,
    ...candidatePreparationFact(input.decision),
    resolvedEntryPath: input.installation.resolvedEntryPath
  });
}

/** Projects the closed preparation decision into its retained Check fact. */
export function candidatePreparationFact(
  decision: CandidatePreparationDecision
): CandidatePreparationFact {
  switch (decision.action) {
    case "rebuild":
      return Object.freeze({
        preparationAction: "rebuild",
        preparationReason: decision.reason,
        reused: false
      });
    case "reinstall":
      return Object.freeze({
        preparationAction: "reinstall",
        preparationReason: decision.reason,
        reused: false
      });
    case "reuse":
      return Object.freeze({
        preparationAction: "reuse",
        preparationReason: decision.reason,
        reused: true
      });
  }
}

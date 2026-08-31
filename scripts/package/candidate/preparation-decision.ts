import type { CandidateArtifactReuseRejection } from "./receipt.ts";

export type LocalCandidatePreparationAction = "rebuild" | "reinstall" | "reuse";
export type LocalCandidatePreparationReason =
  | CandidateArtifactReuseRejection
  | "installation-current"
  | "installation-invalid";

export type LocalCandidatePreparationDecision =
  | Readonly<{ readonly action: "rebuild"; readonly reason: CandidateArtifactReuseRejection }>
  | Readonly<{ readonly action: "reinstall"; readonly reason: "installation-invalid" }>
  | Readonly<{ readonly action: "reuse"; readonly reason: "installation-current" }>;

export type LocalCandidatePreparationFact =
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

export type FormalReleasePreparationFact = Readonly<{
  readonly preparationAction: "release";
  readonly preparationReason: "release-receipt";
  readonly reused: false;
}>;

export type CandidatePreparationFact = LocalCandidatePreparationFact | FormalReleasePreparationFact;

export const RELEASE_RECEIPT_PREPARATION_FACT: FormalReleasePreparationFact = Object.freeze({
  preparationAction: "release",
  preparationReason: "release-receipt",
  reused: false
});

/** Projects the closed preparation decision into its retained Check fact. */
export function candidatePreparationFact(
  decision: LocalCandidatePreparationDecision
): LocalCandidatePreparationFact {
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

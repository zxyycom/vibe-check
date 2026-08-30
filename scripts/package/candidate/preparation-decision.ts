import type { CandidateArtifactReuseRejection } from "./receipt.ts";

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

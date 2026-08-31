import type {
  CandidatePreparationFact,
  FormalReleasePreparationFact,
  LocalCandidatePreparationFact
} from "../../../package/candidate/prepare.ts";

type RebuildPreparationFact = Extract<
  LocalCandidatePreparationFact,
  { readonly preparationAction: "rebuild" }
>;
type ReinstallPreparationFact = Extract<
  LocalCandidatePreparationFact,
  { readonly preparationAction: "reinstall" }
>;
type ReusePreparationFact = Extract<
  LocalCandidatePreparationFact,
  { readonly preparationAction: "reuse" }
>;

/** Restores the closed local or formal preparation provenance branch. */
export function parseCandidatePreparationFact(
  value: Readonly<Record<string, unknown>>
): CandidatePreparationFact {
  const fact =
    parseReleasePreparationFact(value) ??
    parseReusePreparationFact(value) ??
    parseReinstallPreparationFact(value) ??
    parseRebuildPreparationFact(value);
  if (fact !== undefined) return fact;
  throw new TypeError("prepared candidate data has an invalid preparation fact");
}

function parseReleasePreparationFact(
  value: Readonly<Record<string, unknown>>
): FormalReleasePreparationFact | undefined {
  if (
    value.preparationAction === "release" &&
    value.preparationReason === "release-receipt" &&
    value.reused === false
  ) {
    return Object.freeze({
      preparationAction: "release",
      preparationReason: "release-receipt",
      reused: false
    });
  }
  return undefined;
}

function parseReusePreparationFact(
  value: Readonly<Record<string, unknown>>
): ReusePreparationFact | undefined {
  if (
    value.preparationAction === "reuse" &&
    value.preparationReason === "installation-current" &&
    value.reused === true
  ) {
    return Object.freeze({
      preparationAction: "reuse",
      preparationReason: "installation-current",
      reused: true
    });
  }
  return undefined;
}

function parseReinstallPreparationFact(
  value: Readonly<Record<string, unknown>>
): ReinstallPreparationFact | undefined {
  if (
    value.preparationAction === "reinstall" &&
    value.preparationReason === "installation-invalid" &&
    value.reused === false
  ) {
    return Object.freeze({
      preparationAction: "reinstall",
      preparationReason: "installation-invalid",
      reused: false
    });
  }
  return undefined;
}

function parseRebuildPreparationFact(
  value: Readonly<Record<string, unknown>>
): RebuildPreparationFact | undefined {
  if (
    value.preparationAction === "rebuild" &&
    isArtifactReuseRejection(value.preparationReason) &&
    value.reused === false
  ) {
    return Object.freeze({
      preparationAction: "rebuild",
      preparationReason: value.preparationReason,
      reused: false
    });
  }
  return undefined;
}

function isArtifactReuseRejection(
  value: unknown
): value is RebuildPreparationFact["preparationReason"] {
  return (
    value === "artifact-invalid" ||
    value === "artifact-unavailable" ||
    value === "receipt-input-mismatch" ||
    value === "receipt-invalid" ||
    value === "receipt-missing"
  );
}

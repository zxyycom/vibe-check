import type {
  CheckDefinition,
  JsonPrimitive,
  PolicyOperandDefinition,
  PolicyOperandSource
} from "./model.ts";

export const REFERENCE_EVIDENCE_STATUSES = ["complete", "unavailable", "incomplete"] as const;
export type ReferenceEvidenceStatus = typeof REFERENCE_EVIDENCE_STATUSES[number];

export const GATE_RESULT_STATUSES = ["disabled", "passed", "failed", "not-evaluated"] as const;
export type GateResultStatus = typeof GATE_RESULT_STATUSES[number];

export const GATE_NOT_EVALUATED_REASONS = [
  "scan-incomplete",
  "no-eligible-input",
  "comparison-unavailable"
] as const;
export type GateNotEvaluatedReason = typeof GATE_NOT_EVALUATED_REASONS[number];

export interface NamedReferenceIdentity {
  readonly referenceName: string;
  readonly referenceId: string;
}

export interface RecordSelector {
  readonly checkId: string;
  readonly recordTypeId: string;
}

export type RecordOperandSource = PolicyOperandSource;
export type RecordOperandDefinition = PolicyOperandDefinition;

export interface RecordPolicySurface extends RecordSelector {
  readonly operands: readonly RecordOperandDefinition[];
  readonly relations: readonly string[];
}

export interface ValidatedPolicySurfaceRegistry {
  readonly catalogFingerprint: string;
  readonly recordTypes: readonly RecordPolicySurface[];
}

export interface ValidatedPolicyCatalog {
  readonly catalogFingerprint: string;
  readonly definitions: readonly CheckDefinition[];
}

export type RecordPredicate = Readonly<
  | { kind: "operand-equals"; operandId: string; value: Exclude<JsonPrimitive, null> }
  | { kind: "operand-includes"; operandId: string; value: string }
  | { kind: "relation-is"; referenceName: string; relationId: string }
  | { kind: "relation-kind-in"; referenceName: string; values: readonly string[] }
>;

export interface AcceptanceRule {
  readonly acceptanceId: string;
  readonly reason: string;
  readonly selector: RecordSelector;
  readonly predicates: readonly RecordPredicate[];
}

export interface NamedRecordView {
  readonly viewId: string;
  readonly selectors: readonly RecordSelector[];
  readonly acceptance: "all" | "accepted" | "unaccepted";
  readonly predicates: readonly RecordPredicate[];
}

export interface PolicyReferenceRequirement {
  readonly referenceName: string;
  readonly checkIds: readonly string[];
}

export type ReadinessPredicate = Readonly<
  | {
    kind: "check-outcome";
    checkId: string;
    outcome: "not-applicable" | "completed" | "unavailable";
  }
  | { kind: "check-verdict"; checkId: string; verdict: "passed" | "failed" }
  | {
    kind: "reference-status";
    checkId: string;
    referenceName: string;
    status: ReferenceEvidenceStatus;
  }
  | { kind: "view-empty"; viewId: string }
>;

export interface ReadinessClause {
  readonly readinessId: string;
  readonly predicate: ReadinessPredicate;
  readonly reason: GateNotEvaluatedReason;
}

export type BlockWhen = Readonly<
  | { kind: "view-not-empty"; viewId: string }
  | {
    kind: "check-outcome";
    checkId: string;
    outcome: "not-applicable" | "completed" | "unavailable";
  }
  | {
    kind: "reference-status";
    checkId: string;
    referenceName: string;
    status: ReferenceEvidenceStatus;
  }
>;

export interface DecisionPolicy {
  readonly policyId: string;
  readonly references: readonly PolicyReferenceRequirement[];
  readonly acceptance: readonly AcceptanceRule[];
  readonly views: readonly NamedRecordView[];
  readonly readiness: readonly ReadinessClause[];
  readonly blockWhen: BlockWhen;
}

export interface PolicyResolution {
  readonly catalogFingerprint: string;
  readonly policy: DecisionPolicy | null;
  readonly references: readonly NamedReferenceIdentity[];
}

export interface CheckReferenceEvidence {
  readonly checkId: string;
  readonly referenceName: string;
  readonly status: ReferenceEvidenceStatus;
}

export interface ComparisonRelation {
  readonly recordId: string;
  readonly referenceName: string;
  readonly relationId: string;
}

export interface ReferenceFacts {
  readonly evidence: readonly CheckReferenceEvidence[];
  readonly relations: readonly ComparisonRelation[];
}

export type EvidenceRef = Readonly<
  | { kind: "check"; checkId: string }
  | { kind: "record"; recordId: string }
  | { kind: "reference"; checkId: string; referenceName: string; referenceId: string }
  | { kind: "view"; viewId: string }
  | { kind: "readiness"; readinessId: string }
>;

export type RecordEvidenceRef = Extract<EvidenceRef, { kind: "record" }>;

export interface AcceptanceEvidence {
  readonly acceptanceId: string;
  readonly reason: string;
  readonly recordId: string;
}

export interface ViewEvidence {
  readonly viewId: string;
  readonly recordRefs: readonly RecordEvidenceRef[];
}

export type ReadinessEvidence = Readonly<
  | {
    readonly readinessId: string;
    readonly status: "passed";
    readonly evidenceRefs: readonly EvidenceRef[];
  }
  | {
    readonly readinessId: string;
    readonly status: "failed";
    readonly reason: GateNotEvaluatedReason;
    readonly evidenceRefs: readonly EvidenceRef[];
  }
>;

export interface BlockWhenEvidence {
  readonly status: "matched" | "not-matched";
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly blockingRecordRefs: readonly RecordEvidenceRef[];
}

export type GateResult = Readonly<
  | { status: "disabled"; policyId: null }
  | {
    status: "passed" | "failed";
    policyId: string;
    evidenceRefs: readonly EvidenceRef[];
    blockingRecordRefs: readonly RecordEvidenceRef[];
  }
  | {
    status: "not-evaluated";
    policyId: string;
    reason: GateNotEvaluatedReason;
    evidenceRefs: readonly EvidenceRef[];
  }
>;

export interface DecisionEvidence {
  readonly policyId: string | null;
  readonly acceptance: readonly AcceptanceEvidence[];
  readonly views: readonly ViewEvidence[];
  readonly readiness: readonly ReadinessEvidence[];
  readonly blockWhen: BlockWhenEvidence | null;
  readonly gate: GateResult;
}

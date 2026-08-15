import Type from "typebox";

import {
  RECORD_FIELD_VALUE_TYPES,
  RECORD_LEVELS,
  RUN_FAILURE_CATEGORIES
} from "../../check-record/model.ts";
import {
  GATE_NOT_EVALUATED_REASONS,
  REFERENCE_EVIDENCE_STATUSES
} from "../../check-record/policy-model.ts";
import {
  MACHINE_RECORD_V2_IDENTITY,
  MACHINE_RECORD_V2_SCHEMA_ID,
  MACHINE_RUN_V2_IDENTITY,
  MACHINE_RUN_V2_SCHEMA_ID
} from "./schema-identities.ts";

const NonEmptyString = Type.String({ minLength: 1 });
const StableIdString = Type.String({
  minLength: 1,
  pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$"
});
const FieldIdString = Type.String({
  minLength: 1,
  pattern: "^[a-z][A-Za-z0-9]*$"
});
const PolicyOperandIdString = Type.String({
  minLength: 1,
  pattern: "^[a-z][A-Za-z0-9]*(?:-[a-z0-9]+)*$"
});
const CheckRunIdString = Type.String({
  pattern: "^check-run/v1:[a-f0-9]{64}$"
});
const RecordIdString = Type.String({
  pattern: "^check-record/v1/record/sha256:[a-f0-9]{64}$"
});
const CatalogFingerprintString = Type.String({
  pattern: "^check-record/v1/catalog/sha256:[a-f0-9]{64}$"
});
const ReferenceIdString = Type.String({
  pattern: "^reference/v1/sha256:[a-f0-9]{64}$"
});
const NonNegativeInteger = Type.Integer({ minimum: 0 });
const PositiveInteger = Type.Integer({ minimum: 1 });
const NullableString = Type.Union([Type.String(), Type.Null()]);

const PolicyOperandSourceSchema = Type.Union([
  Type.Object({ kind: Type.Literal("level") }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("message") }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("location-path") }, { additionalProperties: false }),
  Type.Object({
    fieldId: FieldIdString,
    kind: Type.Literal("field")
  }, { additionalProperties: false })
]);

const PolicyOperandSchema = Type.Object({
  operandId: PolicyOperandIdString,
  source: PolicyOperandSourceSchema,
  valueType: Type.Enum(["boolean", "number", "string"], { type: "string" })
}, { additionalProperties: false });

const RecordFieldDefinitionSchema = Type.Object({
  fieldId: FieldIdString,
  required: Type.Boolean(),
  valueType: Type.Enum(RECORD_FIELD_VALUE_TYPES, { type: "string" })
}, { additionalProperties: false });

const RecordTypeDefinitionSchema = Type.Object({
  fields: Type.Array(RecordFieldDefinitionSchema),
  identityFields: Type.Array(FieldIdString),
  policy: Type.Optional(Type.Object({
    operands: Type.Array(PolicyOperandSchema),
    relations: Type.Array(StableIdString)
  }, { additionalProperties: false })),
  recordTypeId: StableIdString
}, { additionalProperties: false });

const CheckDefinitionSchema = Type.Object({
  checkId: StableIdString,
  displayName: NonEmptyString,
  recordTypes: Type.Array(RecordTypeDefinitionSchema)
}, { additionalProperties: false });

const CoverageSchema = Type.Object({
  acknowledgedWorkCount: NonNegativeInteger,
  plannedWorkCount: NonNegativeInteger
}, { additionalProperties: false });

const RunDiagnosticSchema = Type.Object({
  category: Type.Enum(RUN_FAILURE_CATEGORIES, { type: "string" }),
  tieBreakKey: NonEmptyString
}, { additionalProperties: false });

const CheckRunIdentity = {
  checkId: StableIdString,
  checkRunId: CheckRunIdString
} as const;

const CheckRunSchema = Type.Union([
  Type.Object({
    ...CheckRunIdentity,
    applicability: Type.Null(),
    coverage: Type.Null(),
    diagnostic: Type.Null(),
    result: Type.Null(),
    selection: Type.Literal("unselected"),
    status: Type.Literal("skipped")
  }, { additionalProperties: false }),
  Type.Object({
    ...CheckRunIdentity,
    applicability: Type.Literal("not-applicable"),
    coverage: CoverageSchema,
    diagnostic: Type.Null(),
    result: Type.Object({ verdict: Type.Literal("not-applicable") }, {
      additionalProperties: false
    }),
    selection: Type.Literal("selected"),
    status: Type.Literal("completed")
  }, { additionalProperties: false }),
  Type.Object({
    ...CheckRunIdentity,
    applicability: Type.Literal("applicable"),
    coverage: CoverageSchema,
    diagnostic: Type.Null(),
    result: Type.Object({
      verdict: Type.Enum(["passed", "failed"], { type: "string" })
    }, { additionalProperties: false }),
    selection: Type.Literal("selected"),
    status: Type.Literal("completed")
  }, { additionalProperties: false }),
  Type.Object({
    ...CheckRunIdentity,
    applicability: Type.Literal("applicable"),
    coverage: CoverageSchema,
    diagnostic: RunDiagnosticSchema,
    result: Type.Null(),
    selection: Type.Literal("selected"),
    status: Type.Literal("failed")
  }, { additionalProperties: false })
]);

const SnapshotIntegritySchema = Type.Object({
  conflicts: Type.Array(Type.Object({
    bodyFingerprints: Type.Array(NonEmptyString),
    checkId: NonEmptyString,
    checkRunId: NonEmptyString,
    kind: Type.Literal("record-conflict"),
    recordId: NonEmptyString,
    recordTypeId: NonEmptyString
  }, { additionalProperties: false })),
  invalidRecords: Type.Array(Type.Object({
    checkId: NonEmptyString,
    checkRunId: NonEmptyString,
    evidenceId: NonEmptyString,
    kind: Type.Literal("invalid-record"),
    recordTypeId: NonEmptyString
  }, { additionalProperties: false })),
  status: Type.Enum(["valid", "invalid", "conflicted"], { type: "string" })
}, { additionalProperties: false });

const SnapshotCompletenessSchema = Type.Object({
  acknowledgedWorkCount: NonNegativeInteger,
  completedRunCount: NonNegativeInteger,
  failedRunCount: NonNegativeInteger,
  plannedWorkCount: NonNegativeInteger,
  selectedRunCount: NonNegativeInteger,
  status: Type.Enum(["complete", "incomplete"], { type: "string" })
}, { additionalProperties: false });

const NamedReferenceSchema = Type.Object({
  referenceId: ReferenceIdString,
  referenceName: StableIdString
}, { additionalProperties: false });

const ReferenceEvidenceSchema = Type.Object({
  checkId: StableIdString,
  referenceName: StableIdString,
  status: Type.Enum(REFERENCE_EVIDENCE_STATUSES, { type: "string" })
}, { additionalProperties: false });

const ComparisonRelationSchema = Type.Object({
  recordId: RecordIdString,
  referenceName: StableIdString,
  relationId: StableIdString
}, { additionalProperties: false });

const EvidenceRefSchema = Type.Union([
  Type.Object({ checkRunId: CheckRunIdString, kind: Type.Literal("run") }, {
    additionalProperties: false
  }),
  Type.Object({ kind: Type.Literal("record"), recordId: RecordIdString }, {
    additionalProperties: false
  }),
  Type.Object({
    checkId: StableIdString,
    kind: Type.Literal("reference"),
    referenceId: ReferenceIdString,
    referenceName: StableIdString
  }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("view"), viewId: StableIdString }, {
    additionalProperties: false
  }),
  Type.Object({ kind: Type.Literal("readiness"), readinessId: StableIdString }, {
    additionalProperties: false
  })
]);

const AcceptanceEvidenceSchema = Type.Object({
  acceptanceId: StableIdString,
  reason: NonEmptyString,
  recordId: RecordIdString
}, { additionalProperties: false });

const ViewEvidenceSchema = Type.Object({
  recordIds: Type.Array(RecordIdString),
  viewId: StableIdString
}, { additionalProperties: false });

const ReadinessEvidenceSchema = Type.Union([
  Type.Object({
    evidenceRefs: Type.Array(EvidenceRefSchema),
    readinessId: StableIdString,
    reason: Type.Null(),
    status: Type.Literal("passed")
  }, { additionalProperties: false }),
  Type.Object({
    evidenceRefs: Type.Array(EvidenceRefSchema),
    readinessId: StableIdString,
    reason: Type.Enum(GATE_NOT_EVALUATED_REASONS, { type: "string" }),
    status: Type.Literal("failed")
  }, { additionalProperties: false })
]);

const BlockWhenEvidenceSchema = Type.Object({
  blockingRecordIds: Type.Array(RecordIdString),
  evidenceRefs: Type.Array(EvidenceRefSchema),
  status: Type.Enum(["matched", "not-matched"], { type: "string" })
}, { additionalProperties: false });

const GateResultSchema = Type.Union([
  Type.Object({ policyId: Type.Null(), status: Type.Literal("disabled") }, {
    additionalProperties: false
  }),
  Type.Object({
    blockingRecordIds: Type.Array(RecordIdString),
    evidenceRefs: Type.Array(EvidenceRefSchema),
    policyId: StableIdString,
    status: Type.Enum(["passed", "failed"], { type: "string" })
  }, { additionalProperties: false }),
  Type.Object({
    evidenceRefs: Type.Array(EvidenceRefSchema),
    policyId: StableIdString,
    reason: Type.Enum(GATE_NOT_EVALUATED_REASONS, { type: "string" }),
    status: Type.Literal("not-evaluated")
  }, { additionalProperties: false })
]);

const DecisionEvidenceSchema = Type.Object({
  blockWhen: Type.Union([BlockWhenEvidenceSchema, Type.Null()]),
  gate: GateResultSchema,
  policyId: NullableString,
  readiness: Type.Array(ReadinessEvidenceSchema),
  views: Type.Array(ViewEvidenceSchema)
}, { additionalProperties: false });

export const MACHINE_RECORD_V2_SCHEMA = Type.Object({
  checkId: StableIdString,
  checkRunId: CheckRunIdString,
  fields: Type.Record(Type.String(), Type.Union([
    Type.Boolean(),
    Type.Number(),
    Type.String()
  ]), {
    description: "Dynamic record fields constrained by the owning published record-type descriptor."
  }),
  level: Type.Enum(RECORD_LEVELS, { type: "string" }),
  location: Type.Union([Type.Object({
    column: PositiveInteger,
    line: PositiveInteger,
    path: NonEmptyString
  }, { additionalProperties: false }), Type.Null()]),
  message: NonEmptyString,
  recordId: RecordIdString,
  recordTypeId: StableIdString,
  schemaVersion: Type.Literal(MACHINE_RECORD_V2_IDENTITY),
  semanticSubject: NonEmptyString
}, {
  $id: MACHINE_RECORD_V2_SCHEMA_ID,
  $schema: "https://json-schema.org/draft/2020-12/schema",
  additionalProperties: false,
  title: "Vibe Check machine record v2"
});

export const MACHINE_RUN_V2_SCHEMA = Type.Object({
  acceptance: Type.Array(AcceptanceEvidenceSchema),
  catalogFingerprint: CatalogFingerprintString,
  completeness: SnapshotCompletenessSchema,
  decision: DecisionEvidenceSchema,
  definitions: Type.Array(CheckDefinitionSchema),
  integrity: SnapshotIntegritySchema,
  invocation: Type.Object({
    invocationId: NonEmptyString,
    projectRoot: Type.Literal("."),
    timestamp: Type.String({
      pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$"
    })
  }, { additionalProperties: false }),
  references: Type.Object({
    evidence: Type.Array(ReferenceEvidenceSchema),
    identities: Type.Array(NamedReferenceSchema),
    relations: Type.Array(ComparisonRelationSchema)
  }, { additionalProperties: false }),
  runs: Type.Array(CheckRunSchema),
  schemaVersion: Type.Literal(MACHINE_RUN_V2_IDENTITY)
}, {
  $id: MACHINE_RUN_V2_SCHEMA_ID,
  $schema: "https://json-schema.org/draft/2020-12/schema",
  additionalProperties: false,
  title: "Vibe Check machine run v2"
});

export type MachineRecordV2 = Type.Static<typeof MACHINE_RECORD_V2_SCHEMA>;
export type MachineRunV2 = Type.Static<typeof MACHINE_RUN_V2_SCHEMA>;

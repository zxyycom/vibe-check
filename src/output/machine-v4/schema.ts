import Type from "typebox";

import {
  MACHINE_RECORD_V4_IDENTITY,
  MACHINE_RECORD_V4_SCHEMA_ID,
  MACHINE_RUN_V4_IDENTITY,
  MACHINE_RUN_V4_SCHEMA_ID,
  MACHINE_V4_TIMESTAMP_PATTERN
} from "./schema-identities.ts";

const NonEmptyString = Type.String({ minLength: 1 });
const StableIdString = Type.String({
  minLength: 1,
  pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$"
});
const CanonicalJsonObject = Type.Record(Type.String(), Type.Any());
const NotApplicableReason = Type.Object({ code: NonEmptyString }, { additionalProperties: false });
const UnavailableReason = Type.Object(
  {
    checkIds: Type.Optional(Type.Array(StableIdString, { minItems: 1 })),
    code: NonEmptyString
  },
  { additionalProperties: false }
);

const CheckOutcomeSchema = Type.Union([
  Type.Object(
    { data: CanonicalJsonObject, status: Type.Literal("passed") },
    { additionalProperties: false }
  ),
  Type.Object(
    { data: CanonicalJsonObject, status: Type.Literal("failed") },
    { additionalProperties: false }
  ),
  Type.Object(
    { reason: Type.Optional(NotApplicableReason), status: Type.Literal("not-applicable") },
    { additionalProperties: false }
  ),
  Type.Object(
    { reason: UnavailableReason, status: Type.Literal("unavailable") },
    { additionalProperties: false }
  )
]);

const PublishedCheckSchema = Type.Object(
  {
    checkId: StableIdString,
    displayName: NonEmptyString,
    outcome: CheckOutcomeSchema
  },
  { additionalProperties: false }
);

export const MACHINE_RECORD_V4_SCHEMA = Type.Object(
  {
    checkId: StableIdString,
    data: CanonicalJsonObject,
    id: NonEmptyString,
    schemaVersion: Type.Literal(MACHINE_RECORD_V4_IDENTITY)
  },
  {
    $id: MACHINE_RECORD_V4_SCHEMA_ID,
    $schema: "https://json-schema.org/draft/2020-12/schema",
    additionalProperties: false,
    title: "Vibe Check machine record v4"
  }
);

export const MACHINE_RUN_V4_SCHEMA = Type.Object(
  {
    checks: Type.Array(PublishedCheckSchema),
    invocation: Type.Object(
      {
        invocationId: NonEmptyString,
        projectRoot: Type.Literal("."),
        timestamp: Type.String({ pattern: MACHINE_V4_TIMESTAMP_PATTERN })
      },
      { additionalProperties: false }
    ),
    recordsFingerprint: Type.String({
      pattern: "^check-record/v2/records/sha256:[a-f0-9]{64}$"
    }),
    schemaVersion: Type.Literal(MACHINE_RUN_V4_IDENTITY)
  },
  {
    $id: MACHINE_RUN_V4_SCHEMA_ID,
    $schema: "https://json-schema.org/draft/2020-12/schema",
    additionalProperties: false,
    title: "Vibe Check machine run v4"
  }
);

type DeepReadonly<Value> = Value extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : Value extends object
    ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
    : Value;

export type MachineRecordV4 = DeepReadonly<Type.Static<typeof MACHINE_RECORD_V4_SCHEMA>>;
export type MachineRunV4 = DeepReadonly<Type.Static<typeof MACHINE_RUN_V4_SCHEMA>>;

/**
 * Stable, declarative Check catalog data owned by Project Definition.
 *
 * This deliberately has no Core lifecycle, scheduler, or execution identity.
 * Core projects these definitions into its own settled facts after planning.
 */
export const RECORD_FIELD_VALUE_TYPES = ["boolean", "integer", "number", "string"] as const;
export type RecordFieldValueType = (typeof RECORD_FIELD_VALUE_TYPES)[number];

export interface RecordFieldDefinition {
  readonly fieldId: string;
  readonly valueType: RecordFieldValueType;
  readonly required: boolean;
}

export type PolicyOperandSource = Readonly<
  | { readonly kind: "level" }
  | { readonly kind: "message" }
  | { readonly kind: "location-path" }
  | { readonly kind: "field"; readonly fieldId: string }
>;

export interface PolicyOperandDefinition {
  readonly operandId: string;
  readonly valueType: "boolean" | "number" | "string";
  readonly source: PolicyOperandSource;
}

export interface RecordTypePolicySurface {
  readonly operands: readonly PolicyOperandDefinition[];
  readonly relations: readonly string[];
}

export interface RecordTypeDefinition {
  readonly recordTypeId: string;
  readonly fields: readonly RecordFieldDefinition[];
  readonly identityFields: readonly string[];
  readonly policy?: RecordTypePolicySurface;
}

/** The serializable definition projection of one selected Check leaf. */
export interface CheckDefinition {
  readonly checkId: string;
  readonly displayName: string;
  readonly recordTypes: readonly RecordTypeDefinition[];
}

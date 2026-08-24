import type { CheckDefinition } from "../definition/check-definition.ts";
import type { CheckOutcome } from "../definition/custom-check.ts";

export type {
  CanonicalJsonObject,
  CanonicalJsonPrimitive,
  CanonicalJsonValue
} from "../foundation/canonical-data.ts";
export type { CheckDefinition, CheckOutcome };

/** A Core Check has exactly one terminal outcome and no execution bookkeeping. */
export interface CoreCheck extends CheckDefinition {
  readonly outcome: CheckOutcome;
}

/** A supplemental Record is owned by its structural `{ checkId, id }` identity. */
export interface CoreRecord {
  readonly checkId: string;
  readonly id: string;
  readonly data: import("../foundation/canonical-data.ts").CanonicalJsonObject;
}

/** The complete Product entity projection. Invocation metadata belongs to Run, not Core. */
export interface CoreSnapshot {
  readonly checks: readonly CoreCheck[];
  readonly records: readonly CoreRecord[];
}

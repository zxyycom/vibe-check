import type { CheckDescriptor } from "../check/descriptor.ts";
import type { CheckOutcome } from "../check/check.ts";

export type {
  CanonicalJsonObject,
  CanonicalJsonPrimitive,
  CanonicalJsonValue
} from "../data-boundary/canonical-data.ts";
export type { CheckDescriptor, CheckOutcome };

/** A Core Check has exactly one terminal outcome and no execution bookkeeping. */
export interface CoreCheck extends CheckDescriptor {
  readonly outcome: CheckOutcome;
}

/** A supplemental Record is owned by its structural `{ checkId, id }` identity. */
export interface CoreRecord {
  readonly checkId: string;
  readonly id: string;
  readonly data: import("../data-boundary/canonical-data.ts").CanonicalJsonObject;
}

/** The complete Product entity projection. Invocation metadata belongs to Run, not Core. */
export interface CoreSnapshot {
  readonly checks: readonly CoreCheck[];
  readonly records: readonly CoreRecord[];
}

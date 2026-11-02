import type { CheckDescriptor } from "../check/descriptor.ts";
import type { CheckOutcome } from "../check/check.ts";

export type {
  CanonicalJsonObject,
  CanonicalJsonPrimitive,
  CanonicalJsonValue
} from "../data-boundary/canonical-data.ts";
export type { CheckDescriptor, CheckOutcome };

/** Core Check 恰有一个 terminal outcome，不携带 execution bookkeeping。 */
export interface CoreCheck extends CheckDescriptor {
  readonly outcome: CheckOutcome;
}

/** 补充 Record 以结构化的 `{ checkId, id }` 二元组标识身份。 */
export interface CoreRecord {
  readonly checkId: string;
  readonly id: string;
  readonly data: import("../data-boundary/canonical-data.ts").CanonicalJsonObject;
}

/** Product 实体的完整投影；invocation 元数据属于 Run，不属于 Core。 */
export interface CoreSnapshot {
  readonly checks: readonly CoreCheck[];
  readonly records: readonly CoreRecord[];
}

import { canonicalizeJsonObject } from "../data-boundary/canonical-data.ts";
import type { CoreRecord } from "./facts.ts";
import { snapshotClosedRecord } from "../data-boundary/closed-values.ts";

export type RecordSubmissionResult = "committed" | "rejected";

const EMPTY_RECORDS: readonly CoreRecord[] = Object.freeze([]);
export type RecordDiagnostic = "record-conflict" | "record-invalid";

export interface CoreRecordSlot {
  readonly checkId: string;
  readonly diagnostics: Set<RecordDiagnostic>;
}

/** Holds Check-local supplemental Records without inventing a composite string identity. */
export class CoreRecordStore {
  readonly #recordsByCheckId = new Map<string, Map<string, CoreRecord>>();

  public report(
    slot: CoreRecordSlot,
    rawIdentity: unknown,
    rawData: unknown
  ): RecordSubmissionResult {
    const id = recordId(rawIdentity);
    const data = canonicalizeJsonObject(rawData);
    if (id === undefined || data === undefined) return this.#reject(slot, "record-invalid");

    let records = this.#recordsByCheckId.get(slot.checkId);
    if (records?.has(id)) return this.#reject(slot, "record-conflict");
    if (records === undefined) {
      records = new Map<string, CoreRecord>();
      this.#recordsByCheckId.set(slot.checkId, records);
    }
    const record: CoreRecord = Object.freeze({ checkId: slot.checkId, id, data });
    records.set(id, record);
    return "committed";
  }

  public recordsForCheckInCanonicalOrder(checkId: string): readonly CoreRecord[] {
    const recordsById = this.#recordsByCheckId.get(checkId);
    if (recordsById === undefined) return EMPTY_RECORDS;
    return Object.freeze(
      [...recordsById.values()].sort((left, right) => compareText(left.id, right.id))
    );
  }

  public recordsInCanonicalOrder(): readonly CoreRecord[] {
    return Object.freeze(
      [...this.#recordsByCheckId.keys()]
        .sort(compareText)
        .flatMap((checkId) => this.recordsForCheckInCanonicalOrder(checkId))
    );
  }

  #reject(slot: CoreRecordSlot, diagnostic: RecordDiagnostic): "rejected" {
    slot.diagnostics.add(diagnostic);
    return "rejected";
  }
}

function recordId(value: unknown): string | undefined {
  const identity = snapshotClosedRecord(value);
  return identity !== undefined &&
    Object.keys(identity).length === 1 &&
    Object.hasOwn(identity, "id") &&
    typeof identity.id === "string" &&
    identity.id.length > 0
    ? identity.id
    : undefined;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

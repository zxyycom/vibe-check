import { canonicalizeJsonObject } from "../data-boundary/canonical-data.ts";
import type { CoreRecord } from "./facts.ts";
import { snapshotClosedRecord } from "../data-boundary/closed-values.ts";

export type RecordSubmissionResult = "committed" | "rejected";
export type RecordDiagnostic = "record-conflict" | "record-invalid";

export interface CoreRecordSlot {
  readonly checkId: string;
  readonly diagnostics: Set<RecordDiagnostic>;
  readonly recordIds: Set<string>;
}

/** Holds one Check's minimal Records without inventing a composite string identity. */
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
    if (slot.recordIds.has(id)) return this.#reject(slot, "record-conflict");

    const record: CoreRecord = Object.freeze({ checkId: slot.checkId, id, data });
    let records = this.#recordsByCheckId.get(slot.checkId);
    if (records === undefined) {
      records = new Map<string, CoreRecord>();
      this.#recordsByCheckId.set(slot.checkId, records);
    }
    records.set(id, record);
    slot.recordIds.add(id);
    return "committed";
  }

  public recordsInCanonicalOrder(): readonly CoreRecord[] {
    const records: CoreRecord[] = [];
    for (const checkId of [...this.#recordsByCheckId.keys()].sort(compareText)) {
      const byId = this.#recordsByCheckId.get(checkId);
      if (byId === undefined) continue;
      for (const id of [...byId.keys()].sort(compareText)) {
        const record = byId.get(id);
        if (record !== undefined) records.push(record);
      }
    }
    return Object.freeze(records);
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

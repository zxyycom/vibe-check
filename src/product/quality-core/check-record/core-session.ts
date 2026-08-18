import { canonicalJsonBytes, createRecordId } from "./identity.ts";
import type {
  CheckDefinition,
  CheckOutcome,
  CoreSnapshot,
  JsonObject,
  QualityRecord,
  QualityRecordCandidate,
  RecordTypeDefinition
} from "./model.ts";
import { hasExactPlainRecordKeys, snapshotPlainRecord } from "./plain-record-values.ts";
import {
  validateCheckDefinition,
  validateCoreSnapshot,
  validateQualityRecord
} from "./validation.ts";

const CANDIDATE_FIELDS = [
  "recordTypeId",
  "level",
  "semanticSubject",
  "message",
  "fields",
  "location"
] as const;

const REFERENCE_RECORD_FIELDS = ["recordTypeId", "semanticSubject", "fields"] as const;

export interface CoreCheckRegistration {
  readonly definition: CheckDefinition;
}

export type RecordSubmissionResult = "committed" | "replayed" | "conflicted" | "rejected";

/** Internal Record port bound to one currently executing Check. */
export interface RecordSink {
  report(candidate: QualityRecordCandidate): RecordSubmissionResult;
}

/** Only the Product Task adapter receives this Core lifecycle capability. */
export interface TrustedCheckScope {
  readonly records: RecordSink;
  /** Resolves an already retained Record identity for a reporter relation. */
  readonly recordIdForReference: (candidate: unknown) => Readonly<{
    readonly recordId: string;
    readonly recordTypeId: string;
  }> | undefined;
  readonly settle: (outcome: CheckOutcome) => CheckOutcome;
}

export interface CoreCheckSession {
  openCheckScope(checkId: string): TrustedCheckScope;
  closeUnresolvedAsCancelled(): void;
  freeze(): CoreSnapshot;
}

/** A trusted integration bug is fatal to the invocation, not a Check outcome. */
export class CoreInvariantFailure extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CoreInvariantFailure";
  }
}

interface RecordState {
  readonly bodies: Map<string, JsonObject>;
}

type RecordDiagnostic = "record-conflict" | "record-invalid";

type CoreSlotLifecycle = Readonly<
  | { readonly kind: "registered" }
  | { readonly kind: "open" }
  | { readonly kind: "settled"; readonly outcome: CheckOutcome }
>;

interface CoreSlot {
  readonly definition: CheckDefinition;
  readonly diagnostics: Set<RecordDiagnostic>;
  readonly recordIds: Set<string>;
  lifecycle: CoreSlotLifecycle;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function coreInvariant(message: string): never {
  throw new CoreInvariantFailure(message);
}

function candidateRecordType(slot: CoreSlot, recordTypeId: string): RecordTypeDefinition | undefined {
  return slot.definition.recordTypes.find((recordType) => recordType.recordTypeId === recordTypeId);
}

function recordBody(record: QualityRecord): JsonObject {
  return {
    recordId: record.recordId,
    checkId: record.checkId,
    recordTypeId: record.recordTypeId,
    level: record.level,
    semanticSubject: record.semanticSubject,
    message: record.message,
    fields: { ...record.fields },
    location: record.location === null ? null : { ...record.location }
  };
}

function bodyKey(body: JsonObject): string {
  return new TextDecoder().decode(canonicalJsonBytes(body));
}

function createSlots(registrations: readonly CoreCheckRegistration[]): CoreSlot[] {
  const slots: CoreSlot[] = [];
  const checkIds = new Set<string>();
  for (const registration of registrations) {
    if (registration === null || typeof registration !== "object") {
      coreInvariant("Core Check registration is invalid");
    }
    const definition = validateCheckDefinition(registration.definition);
    if (!definition.ok) coreInvariant("Core Check registration definition is invalid");
    if (checkIds.has(definition.value.checkId)) {
      coreInvariant("Core Check registration has a duplicate checkId");
    }
    checkIds.add(definition.value.checkId);
    slots.push({
      definition: definition.value,
      diagnostics: new Set(),
      lifecycle: { kind: "registered" },
      recordIds: new Set()
    });
  }
  return slots.sort((left, right) => compareText(left.definition.checkId, right.definition.checkId));
}

class CoreCheckSessionImpl implements CoreCheckSession {
  readonly #slots: CoreSlot[];
  readonly #records = new Map<string, QualityRecord>();
  readonly #recordStates = new Map<string, RecordState>();
  #snapshot: CoreSnapshot | undefined;

  public constructor(registrations: readonly CoreCheckRegistration[]) {
    this.#slots = createSlots(registrations);
  }

  public openCheckScope(checkId: string): TrustedCheckScope {
    const slot = this.#slotFor(checkId);
    if (this.#snapshot !== undefined || slot.lifecycle.kind !== "registered") {
      coreInvariant("Core Check scope is not available");
    }
    slot.lifecycle = Object.freeze({ kind: "open" });
    return Object.freeze({
      records: Object.freeze({
        report: (candidate: QualityRecordCandidate): RecordSubmissionResult => {
          if (this.#snapshot !== undefined || slot.lifecycle.kind !== "open") return "rejected";
          return this.#reportRecord(slot, candidate);
        }
      }),
      recordIdForReference: (candidate: unknown) => (
        this.#recordIdForReference(slot, candidate)
      ),
      settle: (outcome: CheckOutcome): CheckOutcome => this.#settleSlot(slot, outcome)
    });
  }

  public closeUnresolvedAsCancelled(): void {
    if (this.#snapshot !== undefined) {
      coreInvariant("Cancelled closure cannot mutate a frozen Core snapshot");
    }
    for (const slot of this.#slots) {
      if (slot.lifecycle.kind !== "settled") {
        this.#commitTerminal(slot, Object.freeze({
          status: "unavailable",
          reason: { code: "execution-cancelled" }
        }));
      }
    }
  }

  public freeze(): CoreSnapshot {
    if (this.#snapshot !== undefined) return this.#snapshot;
    const checks: { readonly definition: CheckDefinition; readonly outcome: CheckOutcome }[] = [];
    for (const slot of this.#slots) {
      if (slot.lifecycle.kind !== "settled") {
        return coreInvariant("Core snapshot cannot freeze before every Check slot closes");
      }
      checks.push({ definition: slot.definition, outcome: slot.lifecycle.outcome });
    }
    const records = [...this.#records.values()].sort((left, right) => (
      compareText(left.recordId, right.recordId)
    ));
    const validated = validateCoreSnapshot({
      checks: checks.map(({ definition, outcome }) => ({ ...definition, outcome })),
      records
    });
    if (!validated.ok) return coreInvariant("Core snapshot violates its trusted fact invariant");
    this.#snapshot = validated.value;
    return this.#snapshot;
  }

  #slotFor(checkId: string): CoreSlot {
    if (typeof checkId !== "string") coreInvariant("Core Check scope requires a checkId");
    const slot = this.#slots.find((candidate) => candidate.definition.checkId === checkId);
    return slot ?? coreInvariant("Core Check scope does not own this checkId");
  }

  #settleSlot(slot: CoreSlot, outcome: CheckOutcome): CheckOutcome {
    if (this.#snapshot !== undefined || slot.lifecycle.kind !== "open") {
      return coreInvariant("Trusted Core Check settlement is duplicate, late, or out of scope");
    }
    return this.#commitTerminal(slot, outcome);
  }

  #commitTerminal(slot: CoreSlot, terminal: CheckOutcome): CheckOutcome {
    if (slot.lifecycle.kind === "settled") coreInvariant("Core Check terminal closure is duplicate");
    if (terminal.status === "not-applicable" && slot.recordIds.size > 0) {
      slot.diagnostics.add("record-invalid");
    }
    const diagnostic = slot.diagnostics.has("record-conflict")
      ? "record-conflict"
      : slot.diagnostics.has("record-invalid")
        ? "record-invalid"
        : undefined;
    const outcome = diagnostic === undefined
      ? terminal
      : Object.freeze({ status: "unavailable" as const, reason: { code: diagnostic } });
    slot.lifecycle = Object.freeze({ kind: "settled", outcome });
    return outcome;
  }

  #reportRecord(slot: CoreSlot, rawCandidate: unknown): RecordSubmissionResult {
    const candidate = snapshotPlainRecord(rawCandidate);
    if (candidate === undefined || !hasExactPlainRecordKeys(candidate, CANDIDATE_FIELDS)
      || typeof candidate.recordTypeId !== "string") {
      return this.#rejectInvalidRecord(slot);
    }
    const recordType = candidateRecordType(slot, candidate.recordTypeId);
    if (recordType === undefined) return this.#rejectInvalidRecord(slot);
    const record = this.#validateRecord(slot, candidate, recordType);
    if (record === undefined) return this.#rejectInvalidRecord(slot);

    const body = recordBody(record);
    const key = bodyKey(body);
    const state = this.#recordStates.get(record.recordId);
    if (state === undefined) {
      this.#recordStates.set(record.recordId, { bodies: new Map([[key, body]]) });
      this.#records.set(record.recordId, record);
      slot.recordIds.add(record.recordId);
      return "committed";
    }
    if (state.bodies.has(key)) return this.#records.has(record.recordId) ? "replayed" : "conflicted";
    state.bodies.set(key, body);
    this.#records.delete(record.recordId);
    slot.diagnostics.add("record-conflict");
    return "conflicted";
  }

  #recordIdForReference(slot: CoreSlot, rawCandidate: unknown): Readonly<{
    readonly recordId: string;
    readonly recordTypeId: string;
  }> | undefined {
    try {
      const candidate = snapshotPlainRecord(rawCandidate);
      if (candidate === undefined || !hasExactPlainRecordKeys(candidate, REFERENCE_RECORD_FIELDS)
        || typeof candidate.recordTypeId !== "string" || typeof candidate.semanticSubject !== "string") {
        return undefined;
      }
      const recordType = candidateRecordType(slot, candidate.recordTypeId);
      if (recordType === undefined) return undefined;
      const recordId = createRecordId({
        checkId: slot.definition.checkId,
        fields: candidate.fields as QualityRecordCandidate["fields"],
        recordTypeId: candidate.recordTypeId,
        semanticSubject: candidate.semanticSubject
      }, recordType).recordId;
      return this.#records.has(recordId)
        ? Object.freeze({ recordId, recordTypeId: recordType.recordTypeId })
        : undefined;
    } catch {
      return undefined;
    }
  }

  #validateRecord(
    slot: CoreSlot,
    candidate: Readonly<Record<string, unknown>>,
    recordType: RecordTypeDefinition
  ): QualityRecord | undefined {
    try {
      const bound = {
        checkId: slot.definition.checkId,
        recordTypeId: candidate.recordTypeId as string,
        level: candidate.level as QualityRecordCandidate["level"],
        semanticSubject: candidate.semanticSubject as string,
        message: candidate.message as string,
        fields: candidate.fields as QualityRecordCandidate["fields"],
        location: candidate.location as QualityRecordCandidate["location"]
      };
      const recordId = createRecordId(bound, recordType).recordId;
      const validated = validateQualityRecord({ ...bound, recordId }, slot.definition);
      return validated.ok ? validated.value : undefined;
    } catch {
      return undefined;
    }
  }

  #rejectInvalidRecord(slot: CoreSlot): "rejected" {
    slot.diagnostics.add("record-invalid");
    return "rejected";
  }
}

export function createCoreCheckSession(
  registrations: readonly CoreCheckRegistration[]
): CoreCheckSession {
  return new CoreCheckSessionImpl(registrations);
}

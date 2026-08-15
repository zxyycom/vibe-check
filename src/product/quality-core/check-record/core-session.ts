import {
  canonicalJsonBytes,
  createRecordId
} from "./identity.ts";
import type {
  CheckDefinition,
  CheckOutcome,
  CheckUnavailableDiagnosticCategory,
  CoreCheck,
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

const DIAGNOSTIC_RANK: Readonly<Record<CheckUnavailableDiagnosticCategory, number>> = Object.freeze({
  "record-conflict": 0,
  "invalid-record": 1,
  "capability-protocol": 2,
  "invalid-result": 3,
  "dependency-unavailable": 4,
  "execution-failed": 5,
  cancelled: 6
});

export type CoreCheckApplicability = "applicable" | "not-applicable";

/** The minimal Run-owned projection Core needs for one canonical Resolved Check. */
export interface CoreCheckRegistration {
  readonly definition: CheckDefinition;
  readonly applicability: CoreCheckApplicability;
}

export type RecordSubmissionResult = "committed" | "replayed" | "conflicted" | "rejected";

/**
 * This closure is bound to one Check slot. Candidate authors cannot provide or
 * revise the owning `checkId`.
 */
export interface RecordSink {
  report(candidate: QualityRecordCandidate): RecordSubmissionResult;
}

export type CoreCheckTerminalOutcome = Exclude<CheckOutcome, { kind: "not-applicable" }>;
export type CheckAvailability = "available" | "unavailable";

/** Only the Product direct/terminal adapter receives this capability. */
export interface TrustedApplicableCheckScope {
  readonly records: RecordSink;
  readonly settle: (outcome: CoreCheckTerminalOutcome) => CheckAvailability;
}

export interface CoreCheckSession {
  closeNotApplicable(checkId: string): void;
  openApplicableScope(checkId: string): TrustedApplicableCheckScope;
  closeUnresolvedAsCancelled(): void;
  freeze(): CoreSnapshot;
}

/** A trusted integration bug is fatal to the invocation, not an ordinary Check outcome. */
export class CoreInvariantFailure extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CoreInvariantFailure";
  }
}

interface SlotDiagnostic {
  readonly category: CheckUnavailableDiagnosticCategory;
  readonly tieBreakKey: string;
}

interface RecordState {
  readonly bodies: Map<string, JsonObject>;
}

type CoreSlotLifecycle = Readonly<
  | { readonly kind: "registered" }
  | { readonly kind: "open" }
  | { readonly kind: "settled"; readonly outcome: CheckOutcome }
>;

interface CoreSlot {
  readonly definition: CheckDefinition;
  readonly applicability: CoreCheckApplicability;
  readonly diagnostics: SlotDiagnostic[];
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

function candidateRecordType(
  slot: CoreSlot,
  recordTypeId: string
): RecordTypeDefinition | undefined {
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

function normalizedTerminalOutcome(value: unknown): CoreCheckTerminalOutcome {
  const terminal = snapshotPlainRecord(value);
  if (terminal?.kind === "completed"
    && hasExactPlainRecordKeys(terminal, ["kind", "verdict"])
    && (terminal.verdict === "passed" || terminal.verdict === "failed")) {
    return Object.freeze({ kind: "completed", verdict: terminal.verdict });
  }
  if (terminal?.kind === "unavailable"
    && hasExactPlainRecordKeys(terminal, ["kind", "diagnostic"])) {
    const diagnostic = snapshotPlainRecord(terminal.diagnostic);
    const category = diagnostic?.category;
    if (diagnostic !== undefined
      && hasExactPlainRecordKeys(diagnostic, ["category"])
      && isUnavailableCategory(category)) {
      return Object.freeze({
        kind: "unavailable" as const,
        diagnostic: { category }
      });
    }
  }
  return Object.freeze({
    kind: "unavailable" as const,
    diagnostic: { category: "invalid-result" as const }
  });
}

function isUnavailableCategory(value: unknown): value is CheckUnavailableDiagnosticCategory {
  return typeof value === "string" && Object.hasOwn(DIAGNOSTIC_RANK, value);
}

function availabilityFor(outcome: CheckOutcome): CheckAvailability {
  return outcome.kind === "unavailable" ? "unavailable" : "available";
}

function chooseDiagnostic(diagnostics: readonly SlotDiagnostic[]): SlotDiagnostic | undefined {
  return [...diagnostics].sort((left, right) => (
    DIAGNOSTIC_RANK[left.category] - DIAGNOSTIC_RANK[right.category]
      || compareText(left.tieBreakKey, right.tieBreakKey)
  ))[0];
}

function createSlots(registrations: readonly CoreCheckRegistration[]): CoreSlot[] {
  const slots: CoreSlot[] = [];
  const checkIds = new Set<string>();
  for (const registration of registrations) {
    if (registration === null || typeof registration !== "object"
      || (registration.applicability !== "applicable"
        && registration.applicability !== "not-applicable")) {
      coreInvariant("Core Check registration is invalid");
    }
    const definition = validateCheckDefinition(registration.definition);
    if (!definition.ok) {
      coreInvariant("Core Check registration definition is invalid");
    }
    if (checkIds.has(definition.value.checkId)) {
      coreInvariant("Core Check registration has a duplicate checkId");
    }
    checkIds.add(definition.value.checkId);
    slots.push({
      definition: definition.value,
      applicability: registration.applicability,
      diagnostics: [],
      lifecycle: { kind: "registered" }
    });
  }
  return slots.sort((left, right) => compareText(left.definition.checkId, right.definition.checkId));
}

class CoreCheckSessionImpl implements CoreCheckSession {
  readonly #slots: CoreSlot[];
  readonly #records = new Map<string, QualityRecord>();
  readonly #recordStates = new Map<string, RecordState>();
  #invalidRecordCount = 0;
  #snapshot: CoreSnapshot | undefined;

  public constructor(registrations: readonly CoreCheckRegistration[]) {
    this.#slots = createSlots(registrations);
  }

  public closeNotApplicable(checkId: string): void {
    const slot = this.#slotFor(checkId);
    if (this.#snapshot !== undefined || slot.applicability !== "not-applicable"
      || slot.lifecycle.kind !== "registered") {
      coreInvariant("Not-applicable Core Check closure is not available");
    }
    slot.lifecycle = Object.freeze({
      kind: "settled",
      outcome: Object.freeze({ kind: "not-applicable" })
    });
  }

  public openApplicableScope(checkId: string): TrustedApplicableCheckScope {
    const slot = this.#slotFor(checkId);
    if (this.#snapshot !== undefined || slot.applicability !== "applicable"
      || slot.lifecycle.kind !== "registered") {
      coreInvariant("Applicable Core Check scope is not available");
    }
    slot.lifecycle = Object.freeze({ kind: "open" });
    const records: RecordSink = Object.freeze({
      report: (candidate: QualityRecordCandidate): RecordSubmissionResult => {
        if (this.#snapshot !== undefined || slot.lifecycle.kind !== "open") return "rejected";
        return this.#reportRecord(slot, candidate);
      }
    });
    return Object.freeze({
      records,
      settle: (outcome: CoreCheckTerminalOutcome): CheckAvailability => this.#settleApplicableSlot(slot, outcome)
    });
  }

  public closeUnresolvedAsCancelled(): void {
    if (this.#snapshot !== undefined) {
      coreInvariant("Cancelled closure cannot mutate a frozen Core snapshot");
    }
    for (const slot of this.#slots) {
      if (slot.applicability === "applicable" && slot.lifecycle.kind !== "settled") {
        this.#commitTerminal(slot, Object.freeze({
          kind: "unavailable" as const,
          diagnostic: { category: "cancelled" as const }
        }));
      }
    }
  }

  public freeze(): CoreSnapshot {
    if (this.#snapshot !== undefined) return this.#snapshot;
    const checks: CoreCheck[] = [];
    for (const slot of this.#slots) {
      if (slot.lifecycle.kind !== "settled") {
        return coreInvariant("Core snapshot cannot freeze before every Check slot closes");
      }
      checks.push({ ...slot.definition, outcome: slot.lifecycle.outcome });
    }
    const records = [...this.#records.values()].sort((left, right) => (
      compareText(left.recordId, right.recordId)
    ));
    const validated = validateCoreSnapshot({ checks, records });
    if (!validated.ok) {
      return coreInvariant("Core snapshot violates its trusted fact invariant");
    }
    this.#snapshot = validated.value;
    return this.#snapshot;
  }

  #slotFor(checkId: string): CoreSlot {
    if (typeof checkId !== "string") coreInvariant("Core Check scope requires a checkId");
    const slot = this.#slots.find((candidate) => candidate.definition.checkId === checkId);
    return slot ?? coreInvariant("Core Check scope does not own this checkId");
  }

  #settleApplicableSlot(slot: CoreSlot, rawOutcome: unknown): CheckAvailability {
    if (this.#snapshot !== undefined || slot.lifecycle.kind !== "open") {
      return coreInvariant("Trusted Core Check settlement is duplicate, late, or out of scope");
    }
    return this.#commitTerminal(slot, normalizedTerminalOutcome(rawOutcome));
  }

  #commitTerminal(slot: CoreSlot, terminal: CoreCheckTerminalOutcome): CheckAvailability {
    if (slot.lifecycle.kind === "settled") {
      return coreInvariant("Core Check terminal closure is duplicate");
    }
    if (terminal.kind === "unavailable") {
      slot.diagnostics.push({
        category: terminal.diagnostic.category,
        tieBreakKey: `terminal/${terminal.diagnostic.category}`
      });
    }
    const diagnostic = chooseDiagnostic(slot.diagnostics);
    const outcome = diagnostic === undefined
      ? terminal
      : Object.freeze({ kind: "unavailable", diagnostic: { category: diagnostic.category } });
    slot.lifecycle = Object.freeze({ kind: "settled", outcome });
    return availabilityFor(outcome);
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
      return "committed";
    }
    if (state.bodies.has(key)) {
      return this.#records.has(record.recordId) ? "replayed" : "conflicted";
    }
    state.bodies.set(key, body);
    this.#records.delete(record.recordId);
    slot.diagnostics.push({ category: "record-conflict", tieBreakKey: record.recordId });
    return "conflicted";
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
    this.#invalidRecordCount += 1;
    slot.diagnostics.push({
      category: "invalid-record",
      tieBreakKey: `invalid-record/${String(this.#invalidRecordCount).padStart(12, "0")}`
    });
    return "rejected";
  }
}

export function createCoreCheckSession(
  registrations: readonly CoreCheckRegistration[]
): CoreCheckSession {
  return new CoreCheckSessionImpl(registrations);
}

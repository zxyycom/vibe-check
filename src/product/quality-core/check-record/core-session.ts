import type {
  CheckDefinition,
  CheckOutcome,
  CoreSnapshot,
  QualityRecordCandidate
} from "./model.ts";
import {
  CoreRecordStore,
  type CoreRecordSlot,
  type RecordDiagnostic,
  type RecordSubmissionResult,
  type RetainedRecordReference
} from "./core-record-store.ts";
import { validateCheckDefinition, validateCoreSnapshot } from "./validation.ts";

export type { RecordSubmissionResult } from "./core-record-store.ts";

export interface CoreCheckRegistration {
  readonly definition: CheckDefinition;
}

/** Internal Record port bound to one currently executing Check. */
export interface RecordSink {
  report(candidate: QualityRecordCandidate): RecordSubmissionResult;
}

/** Only the Product Task adapter receives this Core lifecycle capability. */
export interface TrustedCheckScope {
  readonly records: RecordSink;
  /** Resolves an already retained Record identity for a reporter relation. */
  readonly recordIdForReference: (candidate: unknown) => RetainedRecordReference | undefined;
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

type CoreSlotLifecycle = Readonly<
  | { readonly kind: "registered" }
  | { readonly kind: "open" }
  | { readonly kind: "settled"; readonly outcome: CheckOutcome }
>;

interface CoreSlot extends CoreRecordSlot {
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
  return slots.sort((left, right) =>
    compareText(left.definition.checkId, right.definition.checkId)
  );
}

class CoreCheckSessionImpl implements CoreCheckSession {
  readonly #slots: CoreSlot[];
  readonly #recordStore = new CoreRecordStore();
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
      recordIdForReference: (candidate: unknown) =>
        this.#recordStore.recordIdForReference(slot, candidate),
      settle: (outcome: CheckOutcome): CheckOutcome => this.#settleSlot(slot, outcome)
    });
  }

  public closeUnresolvedAsCancelled(): void {
    if (this.#snapshot !== undefined) {
      coreInvariant("Cancelled closure cannot mutate a frozen Core snapshot");
    }
    for (const slot of this.#slots) {
      if (slot.lifecycle.kind !== "settled") {
        this.#commitTerminal(
          slot,
          Object.freeze({
            status: "unavailable",
            reason: { code: "execution-cancelled" }
          })
        );
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
    const records = this.#recordStore.recordsInCanonicalOrder();
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
    if (slot.lifecycle.kind === "settled")
      coreInvariant("Core Check terminal closure is duplicate");
    if (terminal.status === "not-applicable" && slot.recordIds.size > 0) {
      slot.diagnostics.add("record-invalid");
    }
    const diagnostic = terminalDiagnostic(slot);
    const outcome =
      diagnostic === undefined
        ? terminal
        : Object.freeze({ status: "unavailable" as const, reason: { code: diagnostic } });
    slot.lifecycle = Object.freeze({ kind: "settled", outcome });
    return outcome;
  }

  #reportRecord(slot: CoreSlot, rawCandidate: unknown): RecordSubmissionResult {
    return this.#recordStore.report(slot, rawCandidate);
  }
}

function terminalDiagnostic(slot: CoreSlot): RecordDiagnostic | undefined {
  if (slot.diagnostics.has("record-conflict")) return "record-conflict";
  if (slot.diagnostics.has("record-invalid")) return "record-invalid";
  return undefined;
}

export function createCoreCheckSession(
  registrations: readonly CoreCheckRegistration[]
): CoreCheckSession {
  return new CoreCheckSessionImpl(registrations);
}

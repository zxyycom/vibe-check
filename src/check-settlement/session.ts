import type { CheckDescriptor } from "../check/descriptor.ts";
import type { CheckOutcome } from "../check/check.ts";
import { canonicalizeJsonObject } from "../data-boundary/canonical-data.ts";
import {
  CoreRecordStore,
  type CoreRecordSlot,
  type RecordDiagnostic,
  type RecordSubmissionResult
} from "./record-store.ts";
import type { CoreCheck, CoreSnapshot } from "./facts.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "../data-boundary/closed-values.ts";
import { validateCheckDescriptor } from "../check/descriptor-validation.ts";

export type { RecordSubmissionResult } from "./record-store.ts";

export interface CoreCheckRegistration {
  readonly definition: CheckDescriptor;
}

/** Internal Record port bound to one currently executing Check. */
export interface RecordSink {
  report(identity: unknown, data: unknown): RecordSubmissionResult;
}

/** Only the Product Task adapter receives this Core lifecycle capability. */
export interface TrustedCheckScope {
  readonly records: RecordSink;
  /** Core is the only author-result validation/canonicalization boundary. */
  readonly settle: (outcome: unknown) => AuthorCheckSettlement;
  /** Private Product lifecycle outcomes may include contained prerequisite IDs. */
  readonly settleProduct: (outcome: CheckOutcome) => CheckOutcome;
}

/** Core's private marker for an author result that survived every settlement guard. */
export interface AuthorCheckSettlement {
  readonly authorResultAccepted: boolean;
  readonly outcome: CheckOutcome;
}

export interface CoreCheckSession {
  openCheckScope(checkId: string): TrustedCheckScope;
  readSettledCheckOutcome(checkId: string): CheckOutcome;
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
  readonly definition: CheckDescriptor;
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
    const definition = validateCheckDescriptor(registration.definition);
    if (!definition.ok) coreInvariant("Core Check registration definition is invalid");
    if (checkIds.has(definition.value.checkId)) {
      coreInvariant("Core Check registration has a duplicate checkId");
    }
    checkIds.add(definition.value.checkId);
    slots.push({
      checkId: definition.value.checkId,
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
        report: (identity: unknown, data: unknown): RecordSubmissionResult => {
          if (this.#snapshot !== undefined || slot.lifecycle.kind !== "open") return "rejected";
          return this.#recordStore.report(slot, identity, data);
        }
      }),
      settle: (outcome: unknown): AuthorCheckSettlement => this.#settleAuthorSlot(slot, outcome),
      settleProduct: (outcome: CheckOutcome): CheckOutcome => this.#settleSlot(slot, outcome, true)
    });
  }

  public readSettledCheckOutcome(checkId: string): CheckOutcome {
    const slot = this.#slotFor(checkId);
    if (slot.lifecycle.kind !== "settled") {
      coreInvariant("Core settled Check is not available");
    }
    return slot.lifecycle.outcome;
  }

  public closeUnresolvedAsCancelled(): void {
    if (this.#snapshot !== undefined) {
      coreInvariant("Cancelled closure cannot mutate a frozen Core snapshot");
    }
    for (const slot of this.#slots) {
      if (slot.lifecycle.kind !== "settled") {
        this.#commitTerminal(
          slot,
          Object.freeze({ status: "unavailable", reason: { code: "execution-cancelled" } }),
          true
        );
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
      checks.push(coreCheckFor(slot));
    }
    this.#snapshot = Object.freeze({
      checks: Object.freeze(checks),
      records: this.#recordStore.recordsInCanonicalOrder()
    });
    return this.#snapshot;
  }

  #slotFor(checkId: string): CoreSlot {
    if (typeof checkId !== "string") coreInvariant("Core Check scope requires a checkId");
    const slot = this.#slots.find((candidate) => candidate.definition.checkId === checkId);
    return slot ?? coreInvariant("Core Check scope does not own this checkId");
  }

  #checkIds(): ReadonlySet<string> {
    return new Set(this.#slots.map((candidate) => candidate.checkId));
  }

  #settleSlot(slot: CoreSlot, outcome: unknown, productOutcome: boolean): CheckOutcome {
    if (this.#snapshot !== undefined || slot.lifecycle.kind !== "open") {
      return coreInvariant("Trusted Core Check settlement is duplicate, late, or out of scope");
    }
    return this.#commitTerminal(slot, outcome, productOutcome);
  }

  #settleAuthorSlot(slot: CoreSlot, terminal: unknown): AuthorCheckSettlement {
    if (this.#snapshot !== undefined || slot.lifecycle.kind !== "open") {
      return coreInvariant("Trusted Core Check settlement is duplicate, late, or out of scope");
    }
    const diagnostic = terminalDiagnostic(slot);
    const normalized =
      diagnostic === undefined ? normalizeOutcome(terminal, false, this.#checkIds()) : undefined;
    const outcome = normalized ?? unavailable(diagnostic ?? "invalid-execution-result");
    slot.lifecycle = Object.freeze({ kind: "settled", outcome });
    return Object.freeze({
      authorResultAccepted: diagnostic === undefined && normalized !== undefined,
      outcome
    });
  }

  #commitTerminal(slot: CoreSlot, terminal: unknown, productOutcome = false): CheckOutcome {
    if (slot.lifecycle.kind === "settled") {
      coreInvariant("Core Check terminal closure is duplicate");
    }
    const diagnostic = terminalDiagnostic(slot);
    const outcome =
      diagnostic === undefined
        ? (normalizeOutcome(terminal, productOutcome, this.#checkIds()) ??
          unavailable("invalid-execution-result"))
        : unavailable(diagnostic);
    slot.lifecycle = Object.freeze({ kind: "settled", outcome });
    return outcome;
  }
}

function terminalDiagnostic(slot: CoreSlot): RecordDiagnostic | undefined {
  if (slot.diagnostics.has("record-conflict")) return "record-conflict";
  if (slot.diagnostics.has("record-invalid")) return "record-invalid";
  return undefined;
}

function coreCheckFor(slot: CoreSlot): CoreCheck {
  if (slot.lifecycle.kind !== "settled") {
    coreInvariant("Core Check fact requires a settled slot");
  }
  return Object.freeze({
    checkId: slot.definition.checkId,
    displayName: slot.definition.displayName,
    outcome: slot.lifecycle.outcome
  });
}

function normalizeOutcome(
  value: unknown,
  productOutcome: boolean,
  knownCheckIds: ReadonlySet<string>
): CheckOutcome | undefined {
  const outcome = snapshotClosedRecord(value);
  if (outcome === undefined || typeof outcome.status !== "string") return undefined;
  if (outcome.status === "passed" || outcome.status === "failed") {
    if (!hasExactKeys(outcome, ["status", "data"])) return undefined;
    const data = canonicalizeJsonObject(outcome.data);
    return data === undefined ? undefined : Object.freeze({ status: outcome.status, data });
  }
  if (outcome.status === "not-applicable") {
    if (!hasOptionalKeys(outcome, ["status"], ["reason"])) return undefined;
    if (outcome.reason === undefined) return Object.freeze({ status: "not-applicable" });
    const reason = normalizeReason(outcome.reason, false, knownCheckIds);
    return reason === undefined ? undefined : Object.freeze({ status: "not-applicable", reason });
  }
  if (outcome.status === "unavailable") {
    if (!hasExactKeys(outcome, ["status", "reason"])) return undefined;
    const reason = normalizeReason(outcome.reason, productOutcome, knownCheckIds);
    return reason === undefined ? undefined : Object.freeze({ status: "unavailable", reason });
  }
  return undefined;
}

function normalizeReason(
  value: unknown,
  allowCheckIds: boolean,
  knownCheckIds: ReadonlySet<string>
): Readonly<{ readonly code: string; readonly checkIds?: readonly string[] }> | undefined {
  const reason = snapshotClosedRecord(value);
  if (
    reason === undefined ||
    typeof reason.code !== "string" ||
    reason.code.length === 0 ||
    !hasOptionalKeys(reason, ["code"], allowCheckIds ? ["checkIds"] : [])
  )
    return undefined;
  if (!Object.hasOwn(reason, "checkIds")) return Object.freeze({ code: reason.code });
  const rawCheckIds = snapshotClosedArray(reason.checkIds);
  if (!allowCheckIds || rawCheckIds === undefined || rawCheckIds.length === 0) return undefined;
  const checkIds: string[] = [];
  for (const checkId of rawCheckIds) {
    if (
      typeof checkId !== "string" ||
      !isSettlementCheckReference(checkId) ||
      !knownCheckIds.has(checkId) ||
      checkIds.includes(checkId)
    )
      return undefined;
    checkIds.push(checkId);
  }
  return Object.freeze({ code: reason.code, checkIds: Object.freeze(checkIds) });
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

function hasOptionalKeys(
  value: Readonly<Record<string, unknown>>,
  required: readonly string[],
  optional: readonly string[]
): boolean {
  const supported = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => supported.has(key))
  );
}

function unavailable(code: string): CheckOutcome {
  return Object.freeze({ status: "unavailable", reason: Object.freeze({ code }) });
}

export function createCoreCheckSession(
  registrations: readonly CoreCheckRegistration[]
): CoreCheckSession {
  return new CoreCheckSessionImpl(registrations);
}

function isSettlementCheckReference(value: string): boolean {
  return value.length > 0;
}

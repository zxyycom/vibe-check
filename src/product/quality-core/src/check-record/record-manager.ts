import type { ResolvedCheck, ResolvedCheckCatalog } from "./catalog.ts";
import {
  canonicalJsonBytes,
  createRecordConflictEvidence,
  createRecordId
} from "./identity.ts";
import {
  compareRunDiagnostics,
  type InvalidRecordEvidence,
  type JsonObject,
  type ManagerBoundQualityRecordCandidate,
  type QualityRecord,
  type QualityRecordCandidate,
  type RecordConflictEvidence,
  type RunDiagnostic,
  type SnapshotIntegrity
} from "./model.ts";
import { hasExactPlainRecordKeys, snapshotPlainRecord } from "./plain-record-values.ts";
import { validateQualityRecord } from "./validation.ts";

type SubmissionResult = "committed" | "replayed" | "conflicted" | "rejected";

export interface FinalRecordManagerState {
  readonly records: readonly QualityRecord[];
  readonly integrity: SnapshotIntegrity;
  readonly diagnostics: ReadonlyMap<string, readonly RunDiagnostic[]>;
}

interface RecordState {
  readonly recordTypeId: string;
  readonly bodies: Map<string, JsonObject>;
}

type InvalidRecordReason = "candidate-shape" | "candidate-validation" | "run-terminal";

interface InvalidRecordViolation {
  readonly checkId: string;
  readonly checkRunId: string;
  readonly recordTypeId: string;
  readonly reason: InvalidRecordReason;
}

const CANDIDATE_FIELDS = [
  "recordTypeId",
  "level",
  "semanticSubject",
  "message",
  "fields",
  "location"
] as const;

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function recordBody(record: QualityRecord): JsonObject {
  return {
    recordId: record.recordId,
    checkId: record.checkId,
    checkRunId: record.checkRunId,
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

function finalizeIntegrity(
  invalidViolations: ReadonlyMap<string, InvalidRecordViolation>,
  conflictsByRecordId: ReadonlyMap<string, RecordConflictEvidence>
): SnapshotIntegrity {
  const invalidRecords = Object.freeze([...invalidViolations.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([, violation], index): InvalidRecordEvidence => Object.freeze({
      kind: "invalid-record",
      checkId: violation.checkId,
      checkRunId: violation.checkRunId,
      recordTypeId: violation.recordTypeId,
      evidenceId: `invalid-record/v1:${String(index + 1).padStart(6, "0")}`
    })));
  const conflicts = Object.freeze([...conflictsByRecordId.values()]
    .sort((left, right) => compareText(left.recordId, right.recordId)));
  const status: SnapshotIntegrity["status"] = conflicts.length > 0
    ? "conflicted"
    : invalidRecords.length > 0 ? "invalid" : "valid";
  return Object.freeze({ status, invalidRecords, conflicts });
}

function finalizeDiagnostics(
  catalog: ResolvedCheckCatalog,
  integrity: SnapshotIntegrity
): ReadonlyMap<string, readonly RunDiagnostic[]> {
  const diagnostics = new Map<string, readonly RunDiagnostic[]>();
  for (const check of catalog.checks) {
    if (check.applicability !== "applicable") {
      continue;
    }
    const checkId = check.definition.checkId;
    const values: RunDiagnostic[] = [
      ...integrity.conflicts
        .filter((conflict) => conflict.checkId === checkId)
        .map((conflict): RunDiagnostic => ({
          category: "record-conflict",
          tieBreakKey: conflict.recordId
        })),
      ...integrity.invalidRecords
        .filter((invalidRecord) => invalidRecord.checkId === checkId)
        .map((invalidRecord): RunDiagnostic => ({
          category: "invalid-record",
          tieBreakKey: invalidRecord.evidenceId
        }))
    ].sort(compareRunDiagnostics).map((diagnostic) => Object.freeze(diagnostic));
    diagnostics.set(checkId, Object.freeze(values));
  }
  return diagnostics;
}

export class RecordManager {
  readonly #catalog: ResolvedCheckCatalog;
  readonly #records = new Map<string, QualityRecord>();
  readonly #recordStates = new Map<string, RecordState>();
  readonly #invalidViolations = new Map<string, InvalidRecordViolation>();
  readonly #conflicts = new Map<string, RecordConflictEvidence>();
  readonly #closedRuns = new Set<string>();
  #finalState: FinalRecordManagerState | undefined;

  public constructor(catalog: ResolvedCheckCatalog) {
    this.#catalog = catalog;
  }

  public createBoundSink(
    checkId: string,
    checkRunId: string
  ): (candidate: QualityRecordCandidate) => SubmissionResult {
    const check = this.#findApplicableCheck(checkId, checkRunId);
    if (check === undefined) {
      throw new TypeError("Record sink requires an applicable owned run");
    }
    return (candidate: QualityRecordCandidate): SubmissionResult => {
      if (this.#finalState !== undefined) {
        return "rejected";
      }
      if (this.#closedRuns.has(checkId)) {
        return this.#rejectInvalid(check, this.#canonicalRecordTypeId(check), "run-terminal");
      }
      return this.#submit(check, candidate);
    };
  }

  public closeRun(checkId: string, checkRunId: string): void {
    if (this.#finalState === undefined && this.#findApplicableCheck(checkId, checkRunId) !== undefined) {
      this.#closedRuns.add(checkId);
    }
  }

  public records(): readonly QualityRecord[] {
    return Object.freeze([...this.#records.values()]
      .sort((left, right) => compareText(left.recordId, right.recordId)));
  }

  public finalize(): FinalRecordManagerState {
    if (this.#finalState !== undefined) {
      return this.#finalState;
    }
    for (const check of this.#catalog.checks) {
      if (check.applicability === "applicable") {
        this.#closedRuns.add(check.definition.checkId);
      }
    }
    const integrity = finalizeIntegrity(this.#invalidViolations, this.#conflicts);
    const diagnostics = finalizeDiagnostics(this.#catalog, integrity);
    this.#finalState = Object.freeze({
      records: this.records(),
      integrity,
      diagnostics
    });
    return this.#finalState;
  }

  #findApplicableCheck(checkId: string, checkRunId: string): ResolvedCheck | undefined {
    return this.#catalog.checks.find((check) => (
      check.definition.checkId === checkId
      && check.checkRunId === checkRunId
      && check.applicability === "applicable"
    ));
  }

  #submit(check: ResolvedCheck, rawCandidate: unknown): SubmissionResult {
    const candidate = snapshotPlainRecord(rawCandidate);
    if (candidate === undefined || !hasExactPlainRecordKeys(candidate, CANDIDATE_FIELDS)
      || typeof candidate.recordTypeId !== "string") {
      return this.#rejectInvalid(check, this.#canonicalRecordTypeId(check), "candidate-shape");
    }
    const recordType = check.definition.recordTypes.find((item) => (
      item.recordTypeId === candidate.recordTypeId
    ));
    if (recordType === undefined) {
      return this.#rejectInvalid(check, this.#canonicalRecordTypeId(check), "candidate-shape");
    }

    const record = this.#validateCandidate(check, candidate, recordType);
    if (record === undefined) {
      return this.#rejectInvalid(check, recordType.recordTypeId, "candidate-validation");
    }
    const body = recordBody(record);
    const key = bodyKey(body);
    const state = this.#recordStates.get(record.recordId);
    if (state === undefined) {
      this.#recordStates.set(record.recordId, {
        recordTypeId: record.recordTypeId,
        bodies: new Map([[key, body]])
      });
      this.#records.set(record.recordId, record);
      return "committed";
    }
    if (state.bodies.has(key)) {
      return this.#conflicts.has(record.recordId) ? "conflicted" : "replayed";
    }

    state.bodies.set(key, body);
    this.#records.delete(record.recordId);
    this.#conflicts.set(record.recordId, createRecordConflictEvidence({
      checkId: check.definition.checkId,
      checkRunId: check.checkRunId,
      recordTypeId: state.recordTypeId,
      recordId: record.recordId,
      bodies: [...state.bodies.values()]
    }));
    return "conflicted";
  }

  #validateCandidate(
    check: ResolvedCheck,
    candidate: Readonly<Record<string, unknown>>,
    recordType: ResolvedCheck["definition"]["recordTypes"][number]
  ): QualityRecord | undefined {
    try {
      const boundCandidate: ManagerBoundQualityRecordCandidate = {
        checkId: check.definition.checkId,
        checkRunId: check.checkRunId,
        recordTypeId: candidate.recordTypeId as string,
        level: candidate.level as QualityRecordCandidate["level"],
        semanticSubject: candidate.semanticSubject as string,
        message: candidate.message as string,
        fields: candidate.fields as QualityRecordCandidate["fields"],
        location: candidate.location as QualityRecordCandidate["location"]
      };
      const recordId = createRecordId(boundCandidate, recordType).recordId;
      const validated = validateQualityRecord({ ...boundCandidate, recordId }, check.definition);
      return validated.ok ? validated.value : undefined;
    } catch {
      return undefined;
    }
  }

  #canonicalRecordTypeId(check: ResolvedCheck): string | undefined {
    return check.definition.recordTypes
      .map((recordType) => recordType.recordTypeId)
      .sort(compareText)[0];
  }

  #rejectInvalid(
    check: ResolvedCheck,
    recordTypeId: string | undefined,
    reason: InvalidRecordReason
  ): "rejected" {
    if (recordTypeId === undefined) {
      return "rejected";
    }
    const violation: InvalidRecordViolation = Object.freeze({
      checkId: check.definition.checkId,
      checkRunId: check.checkRunId,
      recordTypeId,
      reason
    });
    const key = new TextDecoder().decode(canonicalJsonBytes({ ...violation }));
    this.#invalidViolations.set(key, violation);
    return "rejected";
  }
}

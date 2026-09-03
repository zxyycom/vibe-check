import { promises as fs } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { canonicalJsonText } from "../../data-boundary/canonical-data.ts";
import {
  hasExactPlainRecordKeys,
  snapshotClosedArray,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import {
  emptySchedulerHistory,
  freezeSchedulerHistoryModel,
  isBoundedDurationMs,
  isObservationSequence,
  isSchedulerHistoryIdentityDigest,
  isSchedulerSettlementKind,
  MAX_SCHEDULER_HISTORY_SAMPLES_PER_SERIES,
  MAX_SCHEDULER_HISTORY_SERIES,
  SCHEDULER_HISTORY_ENVELOPE_VERSION,
  SCHEDULER_HISTORY_FILE_NAME,
  SCHEDULER_HISTORY_MODEL_VERSION,
  type SchedulerHistoryModel,
  type SchedulerHistorySample,
  type SchedulerHistorySeries
} from "./bounded-history.ts";

const ENVELOPE_KEYS = [
  "envelopeVersion",
  "latestObservationSequence",
  "modelVersion",
  "series"
] as const;
const SERIES_KEYS = ["identityDigest", "latestObservationSequence", "samples"] as const;
const SAMPLE_KEYS = ["durationMs", "observationSequence", "settlementKind"] as const;

export type SchedulerHistoryReadObservation =
  | "loaded"
  | "missing"
  | "invalid"
  | "incompatible"
  | "failed";

export type SchedulerHistoryWriteObservation = "stored" | "failed";

export interface SchedulerHistoryLoad {
  readonly history: SchedulerHistoryModel;
  readonly observation: SchedulerHistoryReadObservation;
}

/** Reads untrusted local state and always degrades to an empty model on an I/O or format fault. */
export async function loadSchedulerHistory(stateDirectory: string): Promise<SchedulerHistoryLoad> {
  let source: string;
  try {
    source = await fs.readFile(schedulerHistoryPath(stateDirectory), "utf8");
  } catch (error: unknown) {
    return Object.freeze({
      history: emptySchedulerHistory(),
      observation: isMissingPath(error) ? "missing" : "failed"
    });
  }

  try {
    const parsed = parseSchedulerHistoryEnvelope(JSON.parse(source));
    if (parsed.kind === "incompatible") {
      return Object.freeze({ history: emptySchedulerHistory(), observation: "incompatible" });
    }
    if (parsed.kind === "invalid") {
      return Object.freeze({ history: emptySchedulerHistory(), observation: "invalid" });
    }
    return Object.freeze({ history: parsed.history, observation: "loaded" });
  } catch {
    return Object.freeze({ history: emptySchedulerHistory(), observation: "invalid" });
  }
}

/** Publishes a full closed model through a same-directory temporary file and atomic replacement. */
export async function writeSchedulerHistory(
  stateDirectory: string,
  history: SchedulerHistoryModel
): Promise<SchedulerHistoryWriteObservation> {
  let temporaryPath: string | undefined;
  try {
    const targetPath = schedulerHistoryPath(stateDirectory);
    temporaryPath = join(stateDirectory, `.vibe-check-scheduler-history-${randomUUID()}.tmp`);
    await fs.mkdir(stateDirectory, { recursive: true });
    await fs.writeFile(temporaryPath, schedulerHistoryText(history), {
      encoding: "utf8",
      flag: "wx"
    });
    await fs.rename(temporaryPath, targetPath);
    return "stored";
  } catch {
    return "failed";
  } finally {
    if (temporaryPath !== undefined) {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  }
}

export function schedulerHistoryPath(stateDirectory: string): string {
  return join(stateDirectory, SCHEDULER_HISTORY_FILE_NAME);
}

function schedulerHistoryText(history: SchedulerHistoryModel): string {
  return canonicalJsonText({
    envelopeVersion: SCHEDULER_HISTORY_ENVELOPE_VERSION,
    latestObservationSequence: history.latestObservationSequence,
    modelVersion: SCHEDULER_HISTORY_MODEL_VERSION,
    series: history.series.map((series) => ({
      identityDigest: series.identityDigest,
      latestObservationSequence: series.latestObservationSequence,
      samples: series.samples.map((sample) => ({
        durationMs: sample.durationMs,
        observationSequence: sample.observationSequence,
        settlementKind: sample.settlementKind
      }))
    }))
  });
}

type ParsedEnvelope =
  | Readonly<{ readonly kind: "loaded"; readonly history: SchedulerHistoryModel }>
  | Readonly<{ readonly kind: "invalid" }>
  | Readonly<{ readonly kind: "incompatible" }>;

function parseSchedulerHistoryEnvelope(value: unknown): ParsedEnvelope {
  const envelope = snapshotClosedRecord(value);
  if (envelope === undefined || !hasExactPlainRecordKeys(envelope, ENVELOPE_KEYS)) {
    return Object.freeze({ kind: "invalid" });
  }
  if (
    typeof envelope.envelopeVersion !== "string" ||
    typeof envelope.modelVersion !== "string" ||
    !isObservationSequence(envelope.latestObservationSequence)
  ) {
    return Object.freeze({ kind: "invalid" });
  }
  if (
    envelope.envelopeVersion !== SCHEDULER_HISTORY_ENVELOPE_VERSION ||
    envelope.modelVersion !== SCHEDULER_HISTORY_MODEL_VERSION
  ) {
    return Object.freeze({ kind: "incompatible" });
  }

  const series = parseSeries(envelope.series);
  if (series === undefined) return Object.freeze({ kind: "invalid" });
  const greatestSequence = series.reduce(
    (greatest, entry) => Math.max(greatest, entry.latestObservationSequence),
    0
  );
  if (envelope.latestObservationSequence !== greatestSequence) {
    return Object.freeze({ kind: "invalid" });
  }

  return Object.freeze({
    kind: "loaded",
    history: freezeSchedulerHistoryModel({
      latestObservationSequence: envelope.latestObservationSequence,
      series
    })
  });
}

function parseSeries(value: unknown): readonly SchedulerHistorySeries[] | undefined {
  const entries = snapshotClosedArray(value);
  if (entries === undefined || entries.length > MAX_SCHEDULER_HISTORY_SERIES) return undefined;

  const identities = new Set<string>();
  const parsed: SchedulerHistorySeries[] = [];
  for (const entry of entries) {
    const series = parseSeriesEntry(entry);
    if (series === undefined || identities.has(series.identityDigest)) return undefined;
    identities.add(series.identityDigest);
    parsed.push(series);
  }
  return Object.freeze(parsed);
}

function parseSeriesEntry(value: unknown): SchedulerHistorySeries | undefined {
  const record = snapshotClosedRecord(value);
  if (record === undefined || !hasExactPlainRecordKeys(record, SERIES_KEYS)) return undefined;
  if (
    !isSchedulerHistoryIdentityDigest(record.identityDigest) ||
    !isObservationSequence(record.latestObservationSequence)
  ) {
    return undefined;
  }
  const samples = parseSamples(record.samples);
  if (
    samples === undefined ||
    samples.at(-1)?.observationSequence !== record.latestObservationSequence
  ) {
    return undefined;
  }
  return Object.freeze({
    identityDigest: record.identityDigest,
    latestObservationSequence: record.latestObservationSequence,
    samples
  });
}

function parseSamples(value: unknown): readonly SchedulerHistorySample[] | undefined {
  const entries = snapshotClosedArray(value);
  if (
    entries === undefined ||
    entries.length === 0 ||
    entries.length > MAX_SCHEDULER_HISTORY_SAMPLES_PER_SERIES
  ) {
    return undefined;
  }

  const samples: SchedulerHistorySample[] = [];
  let priorSequence = -1;
  for (const entry of entries) {
    const sample = parseSample(entry);
    if (sample === undefined || sample.observationSequence <= priorSequence) return undefined;
    priorSequence = sample.observationSequence;
    samples.push(sample);
  }
  return Object.freeze(samples);
}

function parseSample(value: unknown): SchedulerHistorySample | undefined {
  const record = snapshotClosedRecord(value);
  if (record === undefined || !hasExactPlainRecordKeys(record, SAMPLE_KEYS)) return undefined;
  if (
    !isBoundedDurationMs(record.durationMs) ||
    !isPositiveObservationSequence(record.observationSequence) ||
    !isSchedulerSettlementKind(record.settlementKind)
  ) {
    return undefined;
  }
  return Object.freeze({
    durationMs: record.durationMs,
    observationSequence: record.observationSequence,
    settlementKind: record.settlementKind
  });
}

function isMissingPath(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { readonly code?: unknown }).code === "ENOENT"
  );
}

function isPositiveObservationSequence(value: unknown): value is number {
  return isObservationSequence(value) && value > 0;
}

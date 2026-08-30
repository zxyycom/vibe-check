import { snapshotClosedArray, snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { isMaintenanceCommitId, isMaintenanceReminderId } from "./final-data.ts";

const MAINTENANCE_REMINDER_ENTRY_KEYS: readonly string[] = [
  "id",
  "baseCommit",
  "limits",
  "message",
  "mode"
];
const MAINTENANCE_REMINDER_LIMIT_KEYS: readonly string[] = ["commits", "changedLines"];
const MAINTENANCE_REMINDER_GIT_KEYS: readonly string[] = ["executable"];

export function validEntries(value: unknown): boolean {
  const entries = snapshotClosedArray(value);
  if (entries === undefined) return false;
  const identifiers = new Set<string>();
  return entries.every((candidate) => {
    const entry = snapshotClosedRecord(candidate);
    if (entry === undefined || !validEntry(entry)) return false;
    const identifier = entry.id;
    if (typeof identifier !== "string" || identifiers.has(identifier)) return false;
    identifiers.add(identifier);
    return true;
  });
}

function validEntry(entry: Readonly<Record<string, unknown>>): boolean {
  return (
    hasExpectedEntryKeys(entry) &&
    validEntryIdentity(entry) &&
    validLimits(entry.limits) &&
    validEntryMode(entry)
  );
}

function hasExpectedEntryKeys(entry: Readonly<Record<string, unknown>>): boolean {
  return (
    Object.keys(entry).every((key) => MAINTENANCE_REMINDER_ENTRY_KEYS.includes(key)) &&
    ["id", "baseCommit", "limits", "message"].every((key) => Object.hasOwn(entry, key))
  );
}

function validEntryIdentity(entry: Readonly<Record<string, unknown>>): boolean {
  return (
    isMaintenanceReminderId(entry.id) &&
    isMaintenanceCommitId(entry.baseCommit) &&
    typeof entry.message === "string" &&
    entry.message.length > 0
  );
}

function validEntryMode(entry: Readonly<Record<string, unknown>>): boolean {
  return !Object.hasOwn(entry, "mode") || entry.mode === "advisory" || entry.mode === "enforcing";
}

export function validGit(value: unknown): boolean {
  const git = exactRecord(value, MAINTENANCE_REMINDER_GIT_KEYS);
  return git !== undefined && typeof git.executable === "string" && git.executable.length > 0;
}

function validLimits(value: unknown): boolean {
  const limits = snapshotClosedRecord(value);
  if (limits === undefined) return false;
  const keys = Object.keys(limits);
  return (
    keys.length > 0 &&
    keys.every((key) => MAINTENANCE_REMINDER_LIMIT_KEYS.includes(key)) &&
    (!Object.hasOwn(limits, "commits") || positiveSafeInteger(limits.commits)) &&
    (!Object.hasOwn(limits, "changedLines") || positiveSafeInteger(limits.changedLines))
  );
}

export function exactRecord(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined &&
    Object.keys(record).length === keys.length &&
    keys.every((key) => Object.hasOwn(record, key))
    ? record
    : undefined;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

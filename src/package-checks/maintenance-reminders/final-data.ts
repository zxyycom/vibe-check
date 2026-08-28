import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import {
  exactFinalDataRecord,
  finalDataArray,
  invalidFinalData,
  nonNegativeSafeInteger
} from "../final-data-parsing.ts";

const EMPTY_EXCEEDED: readonly [] = Object.freeze([]);

const FULL_COMMIT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;
const REMINDER_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** 单条维护提醒无法测量时使用的稳定 reason code。 */
export const MAINTENANCE_REMINDER_UNAVAILABLE_REASON = Object.freeze({
  baseCommitUnavailable: "base-commit-unavailable",
  baseNotFirstParentAncestor: "base-not-first-parent-ancestor",
  firstParentHistoryInvalid: "first-parent-history-invalid",
  firstParentHistoryUnavailable: "first-parent-history-unavailable",
  headInvalid: "head-invalid",
  headUnavailable: "head-unavailable",
  numstatInvalid: "numstat-invalid",
  numstatUnavailable: "numstat-unavailable"
} as const);

export type MaintenanceReminderMode = "advisory" | "enforcing";

/** 单条维护提醒无法测量时保留在 final data 中的稳定 reason。 */
export type MaintenanceReminderUnavailableReason =
  (typeof MAINTENANCE_REMINDER_UNAVAILABLE_REASON)[keyof typeof MAINTENANCE_REMINDER_UNAVAILABLE_REASON];

const MAINTENANCE_REMINDER_UNAVAILABLE_REASONS: readonly MaintenanceReminderUnavailableReason[] =
  Object.freeze(Object.values(MAINTENANCE_REMINDER_UNAVAILABLE_REASON));

/** 判断 unknown value 是否为维护提醒的稳定局部 ID。 */
export function isMaintenanceReminderId(value: unknown): value is string {
  return typeof value === "string" && REMINDER_ID.test(value);
}

/** 判断 unknown value 是否为 Git 的完整 SHA-1 或 SHA-256 commit ID。 */
export function isMaintenanceCommitId(value: unknown): value is string {
  return typeof value === "string" && FULL_COMMIT_ID.test(value);
}

export type MeasuredMaintenanceReminderAssessment = Readonly<{
  readonly assessment: "clear" | "due";
  readonly baseCommit: string;
  readonly changedLines: number;
  readonly commitCount: number;
  readonly exceeded: readonly ("commits" | "changed-lines")[];
  readonly headCommit: string;
  readonly id: string;
  readonly mode: MaintenanceReminderMode;
}>;

export type UnavailableMaintenanceReminderAssessment = Readonly<{
  readonly assessment: "unavailable";
  readonly baseCommit: string;
  readonly changedLines: null;
  readonly commitCount: null;
  readonly exceeded: readonly [];
  readonly headCommit: string | null;
  readonly id: string;
  readonly mode: MaintenanceReminderMode;
  readonly reason: MaintenanceReminderUnavailableReason;
}>;

/** 单条维护提醒的 measured 或 unavailable discriminated assessment。 */
export type MaintenanceReminderAssessment =
  | MeasuredMaintenanceReminderAssessment
  | UnavailableMaintenanceReminderAssessment;

/** `maintenance-reminders` 在 passed/failed outcome 中发布的主数据。 */
export interface MaintenanceRemindersFinalData {
  readonly entries: readonly MaintenanceReminderAssessment[];
}

/** 验证 discriminated entry assessments 并脱离 canonical final data。 */
export function parseMaintenanceRemindersData(data: unknown): MaintenanceRemindersFinalData {
  const value = exactFinalDataRecord(data, ["entries"], "maintenanceReminders");
  const entries = finalDataArray(value.entries, "maintenanceReminders");
  const parsedEntries: MaintenanceReminderAssessment[] = [];
  const ids = new Set<string>();
  for (const entry of entries) {
    const parsed = parseAssessment(entry);
    if (ids.has(parsed.id)) throw invalidFinalData("maintenanceReminders");
    ids.add(parsed.id);
    parsedEntries.push(parsed);
  }
  return Object.freeze({ entries: Object.freeze(parsedEntries) });
}

function parseAssessment(value: unknown): MaintenanceReminderAssessment {
  const record = exactFinalDataRecord(
    value,
    valueAssessment(value) === "unavailable"
      ? [
          "assessment",
          "baseCommit",
          "changedLines",
          "commitCount",
          "exceeded",
          "headCommit",
          "id",
          "mode",
          "reason"
        ]
      : [
          "assessment",
          "baseCommit",
          "changedLines",
          "commitCount",
          "exceeded",
          "headCommit",
          "id",
          "mode"
        ],
    "maintenanceReminders"
  );
  const id = isMaintenanceReminderId(record.id) ? record.id : undefined;
  const mode = record.mode === "advisory" || record.mode === "enforcing" ? record.mode : undefined;
  const baseCommit = isMaintenanceCommitId(record.baseCommit) ? record.baseCommit : undefined;
  if (id === undefined || mode === undefined || baseCommit === undefined) {
    throw invalidFinalData("maintenanceReminders");
  }
  if (record.assessment === "unavailable") {
    return parseUnavailableAssessment(record, { baseCommit, id, mode });
  }
  if (record.assessment !== "clear" && record.assessment !== "due") {
    throw invalidFinalData("maintenanceReminders");
  }
  const commitCount = nonNegativeSafeInteger(record.commitCount);
  const changedLines = nonNegativeSafeInteger(record.changedLines);
  const headCommit = isMaintenanceCommitId(record.headCommit) ? record.headCommit : undefined;
  const exceeded = parseExceeded(record.exceeded);
  if (
    commitCount === undefined ||
    changedLines === undefined ||
    headCommit === undefined ||
    exceeded === undefined ||
    (record.assessment === "clear" ? exceeded.length !== 0 : exceeded.length === 0)
  ) {
    throw invalidFinalData("maintenanceReminders");
  }
  return Object.freeze({
    assessment: record.assessment,
    baseCommit,
    changedLines,
    commitCount,
    exceeded,
    headCommit,
    id,
    mode
  });
}

function parseUnavailableAssessment(
  record: Readonly<Record<string, unknown>>,
  identity: Readonly<{
    readonly baseCommit: string;
    readonly id: string;
    readonly mode: MaintenanceReminderMode;
  }>
): UnavailableMaintenanceReminderAssessment {
  const exceeded = finalDataArray(record.exceeded, "maintenanceReminders");
  const headCommit = record.headCommit;
  if (
    record.changedLines !== null ||
    record.commitCount !== null ||
    exceeded.length !== 0 ||
    (headCommit !== null && !isMaintenanceCommitId(headCommit)) ||
    !isUnavailableReason(record.reason)
  ) {
    throw invalidFinalData("maintenanceReminders");
  }
  return Object.freeze({
    assessment: "unavailable",
    baseCommit: identity.baseCommit,
    changedLines: null,
    commitCount: null,
    exceeded: EMPTY_EXCEEDED,
    headCommit,
    id: identity.id,
    mode: identity.mode,
    reason: record.reason
  });
}

function valueAssessment(value: unknown): unknown {
  return snapshotClosedRecord(value)?.assessment;
}

function parseExceeded(value: unknown): readonly ("commits" | "changed-lines")[] | undefined {
  const entries = finalDataArray(value, "maintenanceReminders");
  const exceeded: ("commits" | "changed-lines")[] = [];
  const uniqueEntries = new Set<string>();
  for (const entry of entries) {
    if ((entry !== "commits" && entry !== "changed-lines") || uniqueEntries.has(entry)) {
      return undefined;
    }
    uniqueEntries.add(entry);
    exceeded.push(entry);
  }
  return Object.freeze(exceeded);
}

function isUnavailableReason(value: unknown): value is MaintenanceReminderUnavailableReason {
  return MAINTENANCE_REMINDER_UNAVAILABLE_REASONS.some((reason) => reason === value);
}

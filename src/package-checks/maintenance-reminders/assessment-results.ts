import type { CheckMessage, CheckResult } from "../../check/check.ts";
import type {
  MaintenanceReminder,
  MaintenanceRemindersUnavailableCode,
  ReminderEvaluation,
  ReminderMeasurement,
  FirstParentHistoryResolution,
  FirstParentHistoryUnavailableReason
} from "./maintenance-reminders.ts";
import type {
  MaintenanceReminderAssessment,
  MaintenanceReminderMode,
  MaintenanceReminderUnavailableReason,
  MaintenanceRemindersFinalData,
  UnavailableMaintenanceReminderAssessment
} from "./final-data.ts";

const REMINDER_MESSAGE_CODE = Object.freeze({
  due: "maintenance-reminder-due",
  unavailable: "maintenance-reminder-unavailable"
});

export function completedResult(
  evaluations: readonly ReminderEvaluation[]
): CheckResult<MaintenanceRemindersFinalData> {
  const assessments = evaluations.map((evaluation) => evaluation.assessment);
  const messages = evaluations.flatMap(messageForEvaluation);
  const failed = evaluations.some(
    (evaluation) =>
      evaluation.assessment.mode === "enforcing" && evaluation.assessment.assessment !== "clear"
  );
  return {
    status: failed ? ("failed" as const) : ("passed" as const),
    data: { entries: assessments },
    ...(messages.length === 0 ? {} : { messages })
  };
}

export function unavailableResult(
  code: MaintenanceRemindersUnavailableCode
): CheckResult<MaintenanceRemindersFinalData> {
  return {
    status: "unavailable" as const,
    reason: { code },
    messages: [{ code, level: "error", message: wholeCheckUnavailableMessage(code) }]
  };
}

function wholeCheckUnavailableMessage(code: MaintenanceRemindersUnavailableCode): string {
  switch (code) {
    case "invalid-options":
      return "maintenanceReminders options are invalid; recreate the Check with maintenanceReminders(entries) or restore its complete resolved options.";
    case "execution-cancelled":
      return "Maintenance reminder evaluation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate.";
    case "maintenance-reminders-internal-failure":
      return "Maintenance reminders could not form a complete ordered assessment; check package/runtime integrity and retry.";
  }
}

function messageForEvaluation(evaluation: ReminderEvaluation): readonly CheckMessage[] {
  const { assessment, message } = evaluation;
  if (assessment.assessment === "clear") return [];
  const level = assessment.mode === "enforcing" ? ("error" as const) : ("warning" as const);
  const suffix = assessment.assessment === "unavailable" ? ` (${assessment.reason})` : "";
  return [
    {
      code:
        assessment.assessment === "due"
          ? REMINDER_MESSAGE_CODE.due
          : REMINDER_MESSAGE_CODE.unavailable,
      level,
      message: `${assessment.id}: ${message}${suffix}`
    }
  ];
}

export function unavailableAssessment(
  entry: Readonly<MaintenanceReminder>,
  headCommit: string | null,
  reason: MaintenanceReminderUnavailableReason
): UnavailableMaintenanceReminderAssessment {
  return {
    assessment: "unavailable",
    baseCommit: entry.baseCommit,
    changedLines: null,
    commitCount: null,
    exceeded: [],
    headCommit,
    id: entry.id,
    mode: modeOf(entry),
    reason
  };
}

export function modeOf(entry: Readonly<MaintenanceReminder>): MaintenanceReminderMode {
  return entry.mode === "enforcing" ? "enforcing" : "advisory";
}

export function unavailableHistory(
  reason: FirstParentHistoryUnavailableReason
): FirstParentHistoryResolution {
  return { kind: "unavailable", reason };
}

export function reminderEvaluation(
  entry: Readonly<MaintenanceReminder>,
  assessment: MaintenanceReminderAssessment
): ReminderEvaluation {
  return { assessment, message: entry.message };
}

export function completedMeasurement(
  entry: Readonly<MaintenanceReminder>,
  assessment: MaintenanceReminderAssessment
): ReminderMeasurement {
  return { kind: "succeeded", value: reminderEvaluation(entry, assessment) };
}

import {
  defineCheck,
  type CheckExecutionContext,
  type CheckResult,
  type TypedCheckWithOptions
} from "../../check/check.ts";
import {
  MAINTENANCE_REMINDER_UNAVAILABLE_REASON,
  parseMaintenanceRemindersData,
  type MaintenanceReminderAssessment,
  type MaintenanceRemindersFinalData
} from "./final-data.ts";
import { runGit } from "./maintenance-support.ts";
import { exactRecord, validEntries, validGit } from "./options-validation.ts";
import {
  completedResult,
  reminderEvaluation,
  unavailableAssessment,
  unavailableHistory,
  unavailableResult
} from "./assessment-results.ts";
import { measureReminder, parseCommitId, parseFirstParentHistory } from "./measurement.ts";

export const MAINTENANCE_REMINDERS_CHECK_ID = "maintenance-reminders";

const MAINTENANCE_REMINDER_OPTION_KEYS: readonly string[] = ["entries", "git"];
const WHOLE_CHECK_UNAVAILABLE_CODE = Object.freeze({
  invalidOptions: "invalid-options",
  executionCancelled: "execution-cancelled",
  internalFailure: "maintenance-reminders-internal-failure"
});

/** 一项维护提醒的项目政策输入。 */
export interface MaintenanceReminder {
  /** 在同一次构造函数调用中唯一的小写短横线命名局部标识。 */
  readonly id: string;
  /** 维护者在完成真实复核后手动推进的不可变完整 Git commit ID。 */
  readonly baseCommit: string;
  /** 超过任一已配置上限时触发该提醒。 */
  readonly limits: Readonly<{
    /** 从基线到 `HEAD` 的 `first-parent` 提交数上限。 */
    readonly commits?: number;
    /** 从基线到 `HEAD` 的累计 Git `numstat` 增加行加删除行上限。 */
    readonly changedLines?: number;
  }>;
  /** 到期或无法评估时展示给人的非空提醒正文。 */
  readonly message: string;
  /** 省略时只提示；`enforcing` 会使到期或不可测量的条目令所属 Check 失败。 */
  readonly mode?: "advisory" | "enforcing";
}

/** `maintenanceReminders` 生成且完全由 Check 持有的选项。 */
export interface MaintenanceReminderOptions {
  /** 保留作者声明顺序的提醒政策条目。 */
  readonly entries: readonly MaintenanceReminder[];
  /** 执行已提交历史测量的 Git 可执行文件。 */
  readonly git: Readonly<{
    readonly executable: string;
  }>;
}

/** `maintenance-reminders` whole-Check unavailable outcome 的稳定 reason code。 */
export type MaintenanceRemindersUnavailableCode =
  (typeof WHOLE_CHECK_UNAVAILABLE_CODE)[keyof typeof WHOLE_CHECK_UNAVAILABLE_CODE];
export type FirstParentHistoryUnavailableReason =
  | typeof MAINTENANCE_REMINDER_UNAVAILABLE_REASON.firstParentHistoryInvalid
  | typeof MAINTENANCE_REMINDER_UNAVAILABLE_REASON.firstParentHistoryUnavailable
  | typeof MAINTENANCE_REMINDER_UNAVAILABLE_REASON.headInvalid
  | typeof MAINTENANCE_REMINDER_UNAVAILABLE_REASON.headUnavailable;

export type ReminderEvaluation = Readonly<{
  readonly assessment: MaintenanceReminderAssessment;
  readonly message: string;
}>;

export type GitCommandResult =
  | Readonly<{ readonly kind: "cancelled" }>
  | Readonly<{ readonly kind: "failed" }>
  | Readonly<{ readonly kind: "succeeded"; readonly stdout: string }>;

export type FirstParentHistory = Readonly<{
  readonly commits: readonly string[];
  readonly headCommit: string;
}>;

export type FirstParentHistoryResolution =
  | Readonly<{ readonly kind: "cancelled" }>
  | Readonly<{ readonly kind: "unavailable"; readonly reason: FirstParentHistoryUnavailableReason }>
  | Readonly<{ readonly kind: "succeeded"; readonly value: FirstParentHistory }>;

export type ReminderMeasurement =
  | Readonly<{ readonly kind: "cancelled" }>
  | Readonly<{ readonly kind: "succeeded"; readonly value: ReminderEvaluation }>;

/**
 * 创建一个固定 ID 的普通 Check，并在其局部最终数据中评估多条维护提醒。
 *
 * @remarks 构造函数只接收项目无法可靠推断的提醒政策；它补齐 Git 可执行文件、身份、可见性和直接执行逻辑。返回值仍是普通 Check，可按现有原生对象组合规则替换完整 `options` 分支。
 * @example 创建一个单一 Check 的维护提醒
 * ```ts
 * import { defineConfig, maintenanceReminders, run } from "@zxyycom/vibe-check";
 *
 * // 下列 baseCommit 都是示例占位值；实际使用时，每条都必须替换为该提醒最近一次真实复核对应的完整 commit ID。
 * const maintenance = maintenanceReminders([
 *   {
 *     id: "documentation-review",
 *     baseCommit: "0123456789abcdef0123456789abcdef01234567",
 *     limits: { commits: 40, changedLines: 2_000 },
 *     message: "Review the documentation structure after this body of change."
 *   },
 *   {
 *     id: "optimization-audit",
 *     baseCommit: "89abcdef0123456789abcdef0123456789abcdef",
 *     limits: { commits: 80 },
 *     message: "Audit optimization quality before this becomes older.",
 *     mode: "enforcing"
 *   }
 * ]);
 *
 * const definition = defineConfig({
 *   checks: [maintenance],
 *   outputs: {
 *     diagnosticLogging: { enabled: false },
 *     machinePublication: { enabled: false },
 *     progressRendering: { enabled: false }
 *   }
 * });
 *
 * const result = await run(definition);
 * if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
 * ```
 */
export function maintenanceReminders(
  entries: readonly MaintenanceReminder[]
): TypedCheckWithOptions<
  typeof MAINTENANCE_REMINDERS_CHECK_ID,
  MaintenanceReminderOptions,
  typeof parseMaintenanceRemindersData
> {
  return defineCheck({
    checkId: MAINTENANCE_REMINDERS_CHECK_ID,
    displayName: "Maintenance reminders",
    execution: executeMaintenanceReminders,
    parseData: parseMaintenanceRemindersData,
    preflight: (options) =>
      validMaintenanceReminderOptions(options)
        ? { status: "success", preparedOptions: options }
        : {
            status: "failure",
            action: "block",
            reason: { code: "invalid-options" },
            messages: [
              {
                code: "invalid-options",
                level: "error",
                message:
                  "maintenanceReminders options are invalid; recreate the Check with maintenanceReminders(entries) or restore its complete resolved options."
              }
            ]
          },
    options: {
      entries,
      git: { executable: "git" }
    },
    visibility: "attention"
  });
}

/** 在普通对象组合后验证完整的选项形状。 */
export function validMaintenanceReminderOptions(
  value: unknown
): value is MaintenanceReminderOptions {
  const options = exactRecord(value, MAINTENANCE_REMINDER_OPTION_KEYS);
  return options !== undefined && validEntries(options.entries) && validGit(options.git);
}

async function executeMaintenanceReminders(
  context: CheckExecutionContext<MaintenanceReminderOptions>
): Promise<CheckResult<MaintenanceRemindersFinalData>> {
  if (!validMaintenanceReminderOptions(context.options))
    return unavailableResult("invalid-options");
  if (context.signal.aborted)
    return unavailableResult(WHOLE_CHECK_UNAVAILABLE_CODE.executionCancelled);

  try {
    const history = await resolveFirstParentHistory({
      executable: context.options.git.executable,
      projectRoot: context.project.root,
      signal: context.signal
    });
    if (history.kind === "cancelled") {
      return unavailableResult(WHOLE_CHECK_UNAVAILABLE_CODE.executionCancelled);
    }

    if (history.kind === "unavailable") {
      return completedResult(
        context.options.entries.map((entry) =>
          reminderEvaluation(entry, unavailableAssessment(entry, null, history.reason))
        )
      );
    }

    const evaluations: ReminderEvaluation[] = [];
    for (const entry of context.options.entries) {
      const measurement = await measureReminder({
        entry,
        executable: context.options.git.executable,
        history: history.value,
        projectRoot: context.project.root,
        signal: context.signal
      });
      if (measurement.kind === "cancelled") {
        return unavailableResult(WHOLE_CHECK_UNAVAILABLE_CODE.executionCancelled);
      }
      evaluations.push(measurement.value);
    }
    return completedResult(evaluations);
  } catch {
    return unavailableResult(WHOLE_CHECK_UNAVAILABLE_CODE.internalFailure);
  }
}

async function resolveFirstParentHistory(input: {
  readonly executable: string;
  readonly projectRoot: string;
  readonly signal: AbortSignal;
}): Promise<FirstParentHistoryResolution> {
  const head = await runGit({
    args: ["rev-parse", "--verify", "HEAD^{commit}"],
    executable: input.executable,
    projectRoot: input.projectRoot,
    signal: input.signal
  });
  if (head.kind === "cancelled") return head;
  if (head.kind === "failed")
    return unavailableHistory(MAINTENANCE_REMINDER_UNAVAILABLE_REASON.headUnavailable);

  const headCommit = parseCommitId(head.stdout);
  if (headCommit === null)
    return unavailableHistory(MAINTENANCE_REMINDER_UNAVAILABLE_REASON.headInvalid);

  const history = await runGit({
    args: ["rev-list", "--first-parent", "HEAD"],
    executable: input.executable,
    projectRoot: input.projectRoot,
    signal: input.signal
  });
  if (history.kind === "cancelled") return history;
  if (history.kind === "failed") {
    return unavailableHistory(
      MAINTENANCE_REMINDER_UNAVAILABLE_REASON.firstParentHistoryUnavailable
    );
  }

  const firstParentHistory = parseFirstParentHistory(history.stdout, headCommit);
  if (firstParentHistory === undefined) {
    return unavailableHistory(MAINTENANCE_REMINDER_UNAVAILABLE_REASON.firstParentHistoryInvalid);
  }

  return {
    kind: "succeeded",
    value: firstParentHistory
  };
}

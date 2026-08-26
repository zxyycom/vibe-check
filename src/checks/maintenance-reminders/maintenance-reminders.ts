import { spawn } from "node:child_process";

import {
  defineCheck,
  type CheckExecution,
  type CheckWithOptions
} from "../../definition/custom-check.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "../../foundation/closed-values.ts";

export const MAINTENANCE_REMINDERS_CHECK_ID = "maintenance-reminders";

const MAX_GIT_OUTPUT_BYTES = 64 * 1024 * 1024;
const REMINDER_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const FULL_COMMIT_ID = /^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/;
const MAINTENANCE_REMINDER_OPTION_KEYS: readonly string[] = ["entries", "git"];
const MAINTENANCE_REMINDER_ENTRY_KEYS: readonly string[] = [
  "id",
  "baseCommit",
  "limits",
  "message",
  "mode"
];
const MAINTENANCE_REMINDER_LIMIT_KEYS: readonly string[] = ["commits", "changedLines"];
const MAINTENANCE_REMINDER_GIT_KEYS: readonly string[] = ["executable"];
const WHOLE_CHECK_UNAVAILABLE_CODE = Object.freeze({
  invalidOptions: "invalid-options",
  executionCancelled: "execution-cancelled",
  internalFailure: "maintenance-reminders-internal-failure"
});
const ENTRY_UNAVAILABLE_REASON = Object.freeze({
  baseCommitUnavailable: "base-commit-unavailable",
  baseNotFirstParentAncestor: "base-not-first-parent-ancestor",
  firstParentHistoryInvalid: "first-parent-history-invalid",
  firstParentHistoryUnavailable: "first-parent-history-unavailable",
  headInvalid: "head-invalid",
  headUnavailable: "head-unavailable",
  numstatInvalid: "numstat-invalid",
  numstatUnavailable: "numstat-unavailable"
});
const REMINDER_MESSAGE_CODE = Object.freeze({
  due: "maintenance-reminder-due",
  unavailable: "maintenance-reminder-unavailable"
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

type ReminderMode = "advisory" | "enforcing";
type WholeCheckUnavailableCode =
  (typeof WHOLE_CHECK_UNAVAILABLE_CODE)[keyof typeof WHOLE_CHECK_UNAVAILABLE_CODE];
type ReminderUnavailableReason =
  (typeof ENTRY_UNAVAILABLE_REASON)[keyof typeof ENTRY_UNAVAILABLE_REASON];
type FirstParentHistoryUnavailableReason =
  | typeof ENTRY_UNAVAILABLE_REASON.firstParentHistoryInvalid
  | typeof ENTRY_UNAVAILABLE_REASON.firstParentHistoryUnavailable
  | typeof ENTRY_UNAVAILABLE_REASON.headInvalid
  | typeof ENTRY_UNAVAILABLE_REASON.headUnavailable;

type MeasuredReminderAssessment = Readonly<{
  readonly assessment: "clear" | "due";
  readonly baseCommit: string;
  readonly changedLines: number;
  readonly commitCount: number;
  readonly exceeded: readonly ("commits" | "changed-lines")[];
  readonly headCommit: string;
  readonly id: string;
  readonly mode: ReminderMode;
}>;

type UnavailableReminderAssessment = Readonly<{
  readonly assessment: "unavailable";
  readonly baseCommit: string;
  readonly changedLines: null;
  readonly commitCount: null;
  readonly exceeded: readonly [];
  readonly headCommit: string | null;
  readonly id: string;
  readonly mode: ReminderMode;
  readonly reason: ReminderUnavailableReason;
}>;

type ReminderAssessment = MeasuredReminderAssessment | UnavailableReminderAssessment;
type ReminderEvaluation = Readonly<{
  readonly assessment: ReminderAssessment;
  readonly message: string;
}>;

type GitCommandResult =
  | Readonly<{ readonly kind: "cancelled" }>
  | Readonly<{ readonly kind: "failed" }>
  | Readonly<{ readonly kind: "succeeded"; readonly stdout: string }>;

type FirstParentHistory = Readonly<{
  readonly commits: readonly string[];
  readonly headCommit: string;
}>;

type FirstParentHistoryResolution =
  | Readonly<{ readonly kind: "cancelled" }>
  | Readonly<{ readonly kind: "unavailable"; readonly reason: FirstParentHistoryUnavailableReason }>
  | Readonly<{ readonly kind: "succeeded"; readonly value: FirstParentHistory }>;

type ReminderMeasurement =
  | Readonly<{ readonly kind: "cancelled" }>
  | Readonly<{ readonly kind: "succeeded"; readonly value: ReminderEvaluation }>;

/**
 * 创建一个固定 ID 的普通 Check，并在其局部最终数据中评估多条维护提醒。
 *
 * @remarks 构造函数只接收项目无法可靠推断的提醒政策；它补齐 Git 可执行文件、身份、可见性和直接执行逻辑。返回值仍是普通 Check，可按现有原生对象组合规则替换完整 `options` 分支。
 * @example 创建一个单一 Check 的维护提醒
 * ```ts
 * import { defineConfig, maintenanceReminders, run } from "vibe-check";
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
 *   effects: {
 *     cache: { enabled: false },
 *     output: { enabled: false },
 *     progress: { enabled: false }
 *   }
 * });
 *
 * const result = await run(definition);
 * if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
 * ```
 */
export function maintenanceReminders(
  entries: readonly MaintenanceReminder[]
): CheckWithOptions<typeof MAINTENANCE_REMINDERS_CHECK_ID, MaintenanceReminderOptions> {
  return defineCheck<typeof MAINTENANCE_REMINDERS_CHECK_ID, MaintenanceReminderOptions>({
    checkId: MAINTENANCE_REMINDERS_CHECK_ID,
    displayName: "Maintenance reminders",
    execution: executeMaintenanceReminders,
    preflight: (options) =>
      validMaintenanceReminderOptions(options)
        ? { status: "success", preparedOptions: options }
        : { status: "failure", action: "block", reason: { code: "invalid-options" } },
    options: {
      entries,
      git: { executable: "git" }
    },
    visibility: "attention"
  });
}

/** 在普通对象组合后验证完整的选项形状。 */
export function validMaintenanceReminderOptions(value: object): boolean {
  const options = exactRecord(value, MAINTENANCE_REMINDER_OPTION_KEYS);
  return options !== undefined && validEntries(options.entries) && validGit(options.git);
}

const executeMaintenanceReminders: CheckExecution<MaintenanceReminderOptions> = async (context) => {
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
};

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
  if (head.kind === "failed") return unavailableHistory(ENTRY_UNAVAILABLE_REASON.headUnavailable);

  const headCommit = parseCommitId(head.stdout);
  if (headCommit === null) return unavailableHistory(ENTRY_UNAVAILABLE_REASON.headInvalid);

  const history = await runGit({
    args: ["rev-list", "--first-parent", "HEAD"],
    executable: input.executable,
    projectRoot: input.projectRoot,
    signal: input.signal
  });
  if (history.kind === "cancelled") return history;
  if (history.kind === "failed") {
    return unavailableHistory(ENTRY_UNAVAILABLE_REASON.firstParentHistoryUnavailable);
  }

  const firstParentHistory = parseFirstParentHistory(history.stdout, headCommit);
  if (firstParentHistory === undefined) {
    return unavailableHistory(ENTRY_UNAVAILABLE_REASON.firstParentHistoryInvalid);
  }

  return {
    kind: "succeeded",
    value: firstParentHistory
  };
}

async function measureReminder(input: {
  readonly entry: Readonly<MaintenanceReminder>;
  readonly executable: string;
  readonly history: FirstParentHistory;
  readonly projectRoot: string;
  readonly signal: AbortSignal;
}): Promise<ReminderMeasurement> {
  const base = await runGit({
    args: ["rev-parse", "--verify", `${input.entry.baseCommit}^{commit}`],
    executable: input.executable,
    projectRoot: input.projectRoot,
    signal: input.signal
  });
  if (base.kind === "cancelled") return base;
  if (base.kind === "failed")
    return completedMeasurement(
      input.entry,
      unavailableAssessment(
        input.entry,
        input.history.headCommit,
        ENTRY_UNAVAILABLE_REASON.baseCommitUnavailable
      )
    );

  const baseCommit = parseCommitId(base.stdout);
  if (baseCommit === null) {
    return completedMeasurement(
      input.entry,
      unavailableAssessment(
        input.entry,
        input.history.headCommit,
        ENTRY_UNAVAILABLE_REASON.baseCommitUnavailable
      )
    );
  }

  const baseIndex = input.history.commits.indexOf(baseCommit);
  if (baseIndex < 0) {
    return completedMeasurement(
      input.entry,
      unavailableAssessment(
        input.entry,
        input.history.headCommit,
        ENTRY_UNAVAILABLE_REASON.baseNotFirstParentAncestor
      )
    );
  }

  let changedLines = 0;
  for (const commit of input.history.commits.slice(0, baseIndex)) {
    const numstat = await runGit({
      args: ["diff-tree", "--no-commit-id", "--numstat", "-r", `${commit}^`, commit],
      executable: input.executable,
      projectRoot: input.projectRoot,
      signal: input.signal
    });
    if (numstat.kind === "cancelled") return numstat;
    if (numstat.kind === "failed") {
      return completedMeasurement(
        input.entry,
        unavailableAssessment(
          input.entry,
          input.history.headCommit,
          ENTRY_UNAVAILABLE_REASON.numstatUnavailable
        )
      );
    }
    const count = parseChangedLines(numstat.stdout);
    if (count === null || !Number.isSafeInteger(changedLines + count)) {
      return completedMeasurement(
        input.entry,
        unavailableAssessment(
          input.entry,
          input.history.headCommit,
          ENTRY_UNAVAILABLE_REASON.numstatInvalid
        )
      );
    }
    changedLines += count;
  }

  const mode = modeOf(input.entry);
  const exceeded = [
    ...(input.entry.limits.commits !== undefined && baseIndex > input.entry.limits.commits
      ? (["commits"] as const)
      : []),
    ...(input.entry.limits.changedLines !== undefined &&
    changedLines > input.entry.limits.changedLines
      ? (["changed-lines"] as const)
      : [])
  ];
  return completedMeasurement(input.entry, {
    assessment: exceeded.length > 0 ? "due" : "clear",
    baseCommit: input.entry.baseCommit,
    changedLines,
    commitCount: baseIndex,
    exceeded,
    headCommit: input.history.headCommit,
    id: input.entry.id,
    mode
  });
}

function completedResult(evaluations: readonly ReminderEvaluation[]) {
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

function unavailableResult(code: WholeCheckUnavailableCode) {
  return { status: "unavailable" as const, reason: { code } };
}

function messageForEvaluation(evaluation: ReminderEvaluation) {
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

function unavailableAssessment(
  entry: Readonly<MaintenanceReminder>,
  headCommit: string | null,
  reason: ReminderUnavailableReason
): UnavailableReminderAssessment {
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

function modeOf(entry: Readonly<MaintenanceReminder>): ReminderMode {
  return entry.mode === "enforcing" ? "enforcing" : "advisory";
}

function unavailableHistory(
  reason: FirstParentHistoryUnavailableReason
): FirstParentHistoryResolution {
  return { kind: "unavailable", reason };
}

function reminderEvaluation(
  entry: Readonly<MaintenanceReminder>,
  assessment: ReminderAssessment
): ReminderEvaluation {
  return { assessment, message: entry.message };
}

function completedMeasurement(
  entry: Readonly<MaintenanceReminder>,
  assessment: ReminderAssessment
): ReminderMeasurement {
  return { kind: "succeeded", value: reminderEvaluation(entry, assessment) };
}

function parseCommitId(stdout: string): string | null {
  const value = stdout.trim();
  return FULL_COMMIT_ID.test(value) ? value.toLowerCase() : null;
}

function parseFirstParentHistory(
  stdout: string,
  headCommit: string
): FirstParentHistory | undefined {
  const commits: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (line.trim().length === 0) continue;
    const commit = parseCommitId(line);
    if (commit === null) return undefined;
    commits.push(commit);
  }
  if (commits.length === 0 || commits[0] !== headCommit) return undefined;
  return Object.freeze({ commits: Object.freeze(commits), headCommit });
}

function parseChangedLines(stdout: string): number | null {
  let changedLines = 0;
  for (const line of stdout.split(/\r?\n/)) {
    if (line.length === 0) continue;
    const [additions, deletions] = line.split("\t", 3);
    if (additions === "-" && deletions === "-") continue;
    if (!decimal(additions) || !decimal(deletions)) return null;
    const count = Number(additions) + Number(deletions);
    if (!Number.isSafeInteger(count) || !Number.isSafeInteger(changedLines + count)) return null;
    changedLines += count;
  }
  return changedLines;
}

async function runGit(input: {
  readonly args: readonly string[];
  readonly executable: string;
  readonly projectRoot: string;
  readonly signal: AbortSignal;
}): Promise<GitCommandResult> {
  if (input.signal.aborted) return { kind: "cancelled" };

  return new Promise((resolve) => {
    let settled = false;
    let outputBytes = 0;
    let stdout = "";
    let overflowed = false;
    let child: ReturnType<typeof spawn>;

    const settle = (result: GitCommandResult): void => {
      if (settled) return;
      settled = true;
      input.signal.removeEventListener("abort", abort);
      resolve(result);
    };
    const abort = (): void => {
      child.kill("SIGTERM");
    };

    try {
      child = spawn(input.executable, input.args, {
        cwd: input.projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true
      });
    } catch {
      settle({ kind: "failed" });
      return;
    }

    input.signal.addEventListener("abort", abort, { once: true });
    child.stdout?.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      outputBytes += Buffer.byteLength(text);
      if (outputBytes > MAX_GIT_OUTPUT_BYTES) {
        overflowed = true;
        child.kill("SIGTERM");
        return;
      }
      stdout += text;
    });
    child.once("error", () =>
      settle(input.signal.aborted ? { kind: "cancelled" } : { kind: "failed" })
    );
    child.once("close", (status) => {
      if (input.signal.aborted) {
        settle({ kind: "cancelled" });
      } else if (overflowed || status !== 0) {
        settle({ kind: "failed" });
      } else {
        settle({ kind: "succeeded", stdout });
      }
    });
  });
}

function validEntries(value: unknown): boolean {
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
    Object.keys(entry).every((key) => MAINTENANCE_REMINDER_ENTRY_KEYS.includes(key)) &&
    Object.hasOwn(entry, "id") &&
    Object.hasOwn(entry, "baseCommit") &&
    Object.hasOwn(entry, "limits") &&
    Object.hasOwn(entry, "message") &&
    typeof entry.id === "string" &&
    REMINDER_ID.test(entry.id) &&
    typeof entry.baseCommit === "string" &&
    FULL_COMMIT_ID.test(entry.baseCommit) &&
    typeof entry.message === "string" &&
    entry.message.length > 0 &&
    validLimits(entry.limits) &&
    (!Object.hasOwn(entry, "mode") || entry.mode === "advisory" || entry.mode === "enforcing")
  );
}

function validGit(value: unknown): boolean {
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

function exactRecord(
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

function decimal(value: string | undefined): value is string {
  return value !== undefined && /^(?:0|[1-9]\d*)$/.test(value);
}

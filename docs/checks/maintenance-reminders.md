# `maintenanceReminders`

## 用途

`maintenanceReminders(entries)` 创建固定 ID 为 `maintenance-reminders` 的 Check，用 Git first-parent history 提醒定期复核。

## 构造器项目声明

`maintenanceReminders` 保留 `maintenanceReminders(entries)`，并为 object input 提供三类 overload：
`MaintenanceRemindersInput<"maintenance-reminders">` 保留默认 literal；带必填
`{ checkId: Id }` 的 `MaintenanceRemindersInput<Id>` 保留 custom literal；宽化为
`MaintenanceRemindersInput` 的变量返回 `string` identity。默认 `checkId` 是 `maintenance-reminders`，默认
`displayName` 是 `Maintenance reminders`；`entries` 是唯一领域 policy，object input 的其余顶层字段用于项目声明。

例如，为需要单独选择的提醒设置 identity 与 flag 条件：

```ts
const dependencyReview = maintenanceReminders({
  checkId: "dependency-review",
  enabledByFlags: { when: "dependencies-changed" },
  entries: [{
    id: "dependencies",
    baseCommit: "0123456789abcdef0123456789abcdef01234567",
    limits: { commits: 40 },
    message: "Review dependency updates."
  }]
});
```

两种调用形式都返回原生 typed Check。项目声明字段不会进入 `.options` 或执行时的 `context.options`；
完整字段集合、投影和校验边界见[API 机制](../api-mechanics.md#随包-check-的构造器项目声明)。

## 最小用法

示例保留终端进度，不写 machine files。

```ts
import { defineConfig, maintenanceReminders, run } from "@zxyycom/vibe-check";
const check = maintenanceReminders([
  {
    id: "docs",
    baseCommit: "0123456789abcdef0123456789abcdef01234567",
    limits: { commits: 40 },
    message: "Review docs.",
    mode: "enforcing"
  }
]);
const result = await run(defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
}));
const outcome = result.kind === "completed"
  ? result.snapshot.checks.find(({ checkId }) => checkId === check.checkId)?.outcome
  : undefined;
if (result.kind !== "completed" || outcome?.status !== "passed") {
  console.error(`Maintenance reminders did not pass: ${result.kind} / ${outcome?.status ?? "no outcome"}`);
  process.exitCode = 1;
}
```

将占位 commit ID 换成项目 first-parent history 中的真实复核 commit；不存在的基线产生条目 `unavailable`。
示例使用 `enforcing`，会因到期或不可测量失败；默认 `advisory` 只提醒。

本例只接受 `completed` Run 中的 `passed` Check，否则退出非零。多个有效 Check 的调用级结论可读取默认严格 `aggregate`；需要不同领域解释时，提供同步 [`checkAggregation`](../api-mechanics.md#runcontrols-与-check-aggregation) 函数。`run(...)` 返回本身不表示通过。

## 参数与默认配置

构造函数接收以下 `entries`；它不接受 Git executable override：

```ts
ReadonlyArray<{
  id: string,
  baseCommit: string,
  limits: {
    commits?: number,
    changedLines?: number
  },
  message: string,
  mode?: "advisory" | "enforcing"
}>
```

- `id` 在本次构造中唯一，并使用小写短横线命名，例如 `documentation-review`。
- `baseCommit` 是最近一次真实复核对应的完整 40 或 64 位十六进制 commit ID。Product 不会自动推进它。
- `limits` 至少提供一个字段；`commits` 与 `changedLines` 都必须是正安全整数，实际值**严格超过**上限时才到期。
- `message` 是到期或不可测量时展示的非空人读正文。
- `mode` 省略时为 `advisory`；`enforcing` 使到期或不可测量的条目令所属 Check 失败。

constructor 把输入固定为完整 options `{ entries, git: { executable: "git" } }`。所属 Check 获 Scheduler admission 后，其 task-local
preparation 在自身 execution 前验证 unknown、sparse、duplicate 或 malformed entries；失败时当前 Check 以
`unavailable / invalid-options` 结算。

## 工作原理

measurement source 是从 `baseCommit` 到 `HEAD` 的 committed first-parent history 与 Git `numstat`。commit count 不包含
基线自身；changed lines 是每个后续 commit 相对其 first parent 的 additions + deletions，binary 行数按零计。workspace 与
staging area 不参与。维护者完成真实复核后，把 `baseCommit` 推进到新的复核基线。

## 效果与结果

该 Check 正常完成时返回 `{ entries }`，并按作者顺序保存以下 discriminated entry assessments。package root 导出的
`MaintenanceReminderAssessment` 与 `MaintenanceRemindersFinalData` 对应以下 shape：

```ts
type EntryAssessment =
  | Readonly<{
      id: string;
      mode: "advisory" | "enforcing";
      assessment: "clear" | "due";
      baseCommit: string;
      headCommit: string;
      commitCount: number;
      changedLines: number;
      exceeded: readonly ("commits" | "changed-lines")[];
    }>
  | Readonly<{
      id: string;
      mode: "advisory" | "enforcing";
      assessment: "unavailable";
      baseCommit: string;
      headCommit: string | null;
      commitCount: null;
      changedLines: null;
      exceeded: readonly [];
      reason:
        | "head-unavailable"
        | "head-invalid"
        | "first-parent-history-unavailable"
        | "first-parent-history-invalid"
        | "base-commit-unavailable"
        | "base-not-first-parent-ancestor"
        | "numstat-unavailable"
        | "numstat-invalid";
    }>;

type FinalData = Readonly<{ entries: readonly EntryAssessment[] }>;
```

| 条目评估 | `advisory`（默认） | `enforcing` |
| --- | --- | --- |
| `clear` | 无 message，不贡献失败。 | 无 message，不贡献失败。 |
| `due` | 附加 warning，不贡献失败。 | 附加 error，并令所属 Check 失败。 |
| `unavailable` | 附加 warning，不贡献失败。 | 附加 error，并令所属 Check 失败。 |

`due` message code 是 `maintenance-reminder-due`，`unavailable` message code 是
`maintenance-reminder-unavailable`。有条目贡献失败则 Check 为 `failed`，否则为 `passed`。
`due` 正文是 `<id>: <message>`；`unavailable` 追加 ` (<reason>)`。不发布 supplemental Records；条目不成为独立
Check、aggregation target、progress row 或 machine row。

启用 machine publication 时只发布所属 Check 的 final data，terminal messages 不进入 machine files。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseMaintenanceRemindersData(value)` 验证 final data。parser
验证每个 discriminated assessment、commit ID、唯一 reminder ID、计数、`exceeded` 与 reason 不变量，并返回
`MaintenanceRemindersFinalData`；不匹配时抛出 `TypeError`。输入与不可用分支还可分别使用 `MaintenanceReminder`、
`MaintenanceReminderOptions`、`MaintenanceReminderUnavailableReason` 与 `MaintenanceRemindersUnavailableCode` 标注。

## `not-applicable` 与 `unavailable`

该 Check 没有 `not-applicable` 分支；空 entries 返回 `passed` 与 `{ entries: [] }`，不产生 messages 或 Records。

Git/历史测量的普通失败会保留完整 final data，并把受影响条目标记为 `assessment: "unavailable"`；后续条目仍继续评估：

| entry `reason` | 含义与处理方式 |
| --- | --- |
| `head-unavailable` | 无法执行或读取 `HEAD`；检查 Git command 与 repository 状态。 |
| `head-invalid` | `HEAD` output 不是完整 commit ID；检查 Git wrapper 或 repository object。 |
| `first-parent-history-unavailable` | 无法读取 `HEAD` 的 first-parent history；检查 Git command 与 history。 |
| `first-parent-history-invalid` | history 为空、包含非法 ID 或没有从 `HEAD` 开始；检查 Git wrapper 或 repository object。 |
| `base-commit-unavailable` | 本 entry 的 `baseCommit` 无法解析；换成 repository 中存在的完整 commit ID。 |
| `base-not-first-parent-ancestor` | 基线不在 `HEAD` 的 first-parent 链上；选择该链中的真实复核 commit。 |
| `numstat-unavailable` | 无法读取某个 commit 的 `numstat`；检查 Git command 与 repository object。 |
| `numstat-invalid` | `numstat` 无法安全解析或累计；检查 Git wrapper output。 |

只有以下 whole-Check 边界结算为 `unavailable` 且不提供 final data：

| `reason.code` | 触发边界 |
| --- | --- |
| `invalid-options` | constructor 接收的 entries，或之后通过普通对象组合形成的完整 options，未通过 closed policy 校验。 |
| `execution-cancelled` | invocation signal 在可观察工作边界取消本 Check。 |
| `maintenance-reminders-internal-failure` | Product 无法形成完整、有序的评估数组。 |

每个 whole-Check `unavailable` 都携带与 `reason.code` 相同 code 的 error message，并指出应恢复 options、检查取消原因或
检查 package/runtime integrity。entry-level `unavailable` 仍按上一节保留 final data 与项目编写的提醒正文。

通用 preparation 语法见 [options preparation 与 execution](../api-mechanics.md#options-preparation-与-execution)。

## I/O 与安全边界

I/O boundary 是本机 Git 对 committed first-parent history 的 read-only 查询。workspace、staging area 与 network
request 数为零，baseline 更新由维护者提交。

## 适用边界

该 Check 适用于按 commit count 或 changed-line count 提醒维护复核。有效的 `enforcing` failure 会使默认严格 `aggregate` 为 `failed`；调用方负责把该调用级结论映射为自己的阻断或退出行为。只有需要不同领域解释时，才提供 `RunControls.checkAggregation` 同步函数。

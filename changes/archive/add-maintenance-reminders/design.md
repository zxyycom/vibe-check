# Design

`maintenanceReminders(entries)` 是一个唯一、专用的 public constructor：它产出一个 fixed-ID ordinary Check，在该 Check 内完成多个 local reminder assessment；既不建立 generic derivation surface，也不建立 reminder-level Check/Record identity。

## Context

用户已明确 `maintenanceReminders([配置 1, 配置 2])`、constructor 补齐默认值、多个 reminder 不污染 Check catalog、默认提醒但可显式阻断，以及完整 commit base 的人工推进。现已由 active + unaligned 的 [`complete-first-release-check-set-with-specialized-maintenance-reminder.md`](../../docs/decisions/complete-first-release-check-set-with-specialized-maintenance-reminder.md) 归并并取代此前与之冲突的发布 / public surface / default-composition 方向。

当前 Product 的 public entry 是 `src/index.ts`；`defineCheck` 能形成 typed ordinary Check，Project Definition 在 Run 前 closed-validate options 并把它们写入 declarative fingerprint。callback 已拥有 project root、AbortSignal、options、terminal messages 和四态 final result。progress / `RunResult.checkMessages` 是人读 message readback，generic v4 Check outcome 则承载 passed/failed final data；aggregation 只消费 settled Check status。

当前 built-ins 的 options/validation 位于 `src/definition/default-checks.ts`，相邻 execution 在 `src/checks/builtins/**`，根 export / public type inventory 由 `src/definition/project-definition.ts` 和 `src/index.ts` 汇集。`quality` 的 Project Definition 关闭 progress，scan adapter 也不消费 messages，因而不是本 package Change 的默认 consumer。

## Goals / Non-Goals

**Goals**

- 以 `maintenanceReminders(entries)` 提供低样板、typed、可导入的 maintenance reminder authoring path。
- 只产生一个 fixed-ID owning Check；entry identity 与 final assessment data 仅在该 Check 内有意义。
- 用可复现的 first-parent committed-history measurement 计算 commits 和 changed lines，并保存可审计的完整 assessment data。
- 默认为 visible-but-nonblocking advisory；enforcing 对到期和无法测量都 fail closed，同时保留 data。
- 以现有 Definition、Run、output、package 和 Case evidence 证明这项 public contract。

**Non-Goals**

- 不创建 generic `deriveCheck` / factory、partial override grammar、第二 Run entry、第二 Check family、shared baseline/reference service 或 Product-wide policy resolver。
- 不把 entry 变成 child Check、Record、dependency、aggregation target、separate progress row 或 machine row。
- 不读取 worktree/index delta，不实现 path filtering、wall-clock scheduling、acknowledgement、external notification、自动 baseline 推进或 Git-command constructor parameter。
- 不在本仓 `quality` Definition 配置具体 entries，也不改变其 progress、scan process exit 或 Gate policy。

## Decisions

### Intended Change

#### Public authoring contract

从根入口导出以下最小 surface：

```ts
export interface MaintenanceReminder {
  readonly id: string;
  readonly baseCommit: string;
  readonly limits: Readonly<{
    readonly commits?: number;
    readonly changedLines?: number;
  }>;
  readonly message: string;
  readonly mode?: "advisory" | "enforcing";
}

export interface MaintenanceReminderOptions {
  readonly entries: readonly MaintenanceReminder[];
  readonly git: Readonly<{ readonly executable: string }>;
}

export function maintenanceReminders(
  entries: readonly MaintenanceReminder[]
): Check<MaintenanceReminderOptions>;
```

constructor 物化 `checkId: "maintenance-reminders"`、`displayName: "Maintenance reminders"`、`visibility: "attention"`、`git.executable: "git"`、typed execution 与完整 `options`。它不接收 Git override parameter；返回 ordinary Check 后的原生 object composition 仍按现有 language semantics 替换完整 branch，不产生 hidden merge/default materialization。`git.executable` 保留在 Check-owned options，因而进入 Definition validation 和 fingerprint。

`entries` 是 dense array；每项 `id` 必须在 array 内唯一且匹配 lower-kebab-case，`baseCommit` 必须正好是 40 或 64 个 hex 字符，`limits` 只允许 `commits` / `changedLines` 且至少一个是正安全整数，`message` 非空，`mode` 省略时为 advisory。Check-specific validation 以 fixed check ID 拒绝 unknown key 和 malformed ordinary-composed options；generic Definition validation 仍拥有 tree-level duplicate Check-ID rejection。

#### Git measurement and assessment data

private adapter 从 `context.project.root` 运行 `options.git.executable`，把 `context.signal` 传给所有 process work。它先解析 immutable `HEAD`，验证每项 base 可以解析并位于 `HEAD` 的 first-parent chain，再统计 `base..HEAD` 的 first-parent commits；对该链的每个 commit 按其 first parent 读取 numstat，并累计 additions + deletions。base 不计入，merge 只按 first parent diff 计一次，revert 计实际活动，binary 变化加零行，rename 使用 Git numstat；任何 configured limit **严格超过**时为 due。

adapter 为每个 entry 形成一个 ordered local assessment：

```ts
{
  id: string;
  mode: "advisory" | "enforcing";
  assessment: "clear" | "due" | "unavailable";
  baseCommit: string;
  headCommit: string | null;
  commitCount: number | null;
  changedLines: number | null;
  exceeded: readonly ("commits" | "changed-lines")[];
  reason?: string;
}
```

final data 以 `{ entries: readonly Assessment[] }` 保存所有 assessment，不产生 supplemental Records。entry-level command / history / parse error 产生 `unavailable` assessment 和稳定、可行动 reason，不能被降格为 clear；其它 entries 继续评估。只有 process/cancellation/internal protocol 使完整 ordered array 无法可信形成时，callback 才返回 whole-Check `unavailable`。

#### Status, message and output folding

| Entry outcome | advisory（默认） | enforcing |
| --- | --- | --- |
| `clear` | 无 message；不导致失败。 | 无 message；不导致失败。 |
| `due` | warning；owning Check `passed`。 | error；owning Check `failed`。 |
| `unavailable` | warning；owning Check `passed`。 | error；owning Check `failed`。 |

当所有 entries assessment 完整时，result 必定是 `passed` 或 `failed`，且带完整 final data。message code 由 owning Check 固定拥有；message 使用 entry 的 author message 与 status context。`attention` 仅隐藏无 message 的 passed settled row，带 warning/error 的提醒仍在人读 progress / `RunResult.checkMessages` 可见。message 不进入 v4；final data 正常经 generic Check outcome 发布。调用方若要阻断 process，继续显式把 `maintenance-reminders` 选入其 `checkAggregation`。

### Resulting Impacts

| Boundary | Change and evidence |
| --- | --- |
| Definition / public API | 新增 constructor、两个 supporting type roots、fixed-ID option validator 与 fingerprint / invalid-definition tests；不增加新 runtime entry。 |
| Check execution | 新增 private Git adapter 与 direct callback，严格区分 entry unavailable、completed assessment payload 与 whole-Check unavailable；用 temporary Git repository fixtures 覆盖 history semantics。 |
| Core / output / presentation | 不改 shared four-state grammar、aggregation 或 v4 schema；补充 Run/progress/output tests，证明 messages 与 final data 的既有边界。 |
| Package material | 更新 configuration / quality metrics / output 说明、README template/JSDoc projection、public export inventory、artifact and isolated-consumer expectations。 |
| Test evidence | 新增或更新语义 Case，覆盖 Definition validation、Git assessment folding 和 package consumer；每次修改 test node/正文时维护 Case mapping。 |
| Repository consumer | 不改 `scripts/project/quality/**`；其具体 policy 留待独立 Change 或明确用户选择。 |

## Risks / Trade-offs

- 专用 constructor 有意是 public surface 的窄例外；它必须只处理 reminder policy，而不能演化成 generic Check derivation。
- 一组 entries 共用一个 terminal Check status，调用方不能对单条 entry 做 aggregation；这是避免 Check pollution 的直接代价。
- advisory unavailable 不阻断，但 warning、reason 和 final data 必须使它不可被误读为 clear；enforcing unavailable 则 fail closed。
- Git history依赖本地 repository 与 executable；hermetic fixture 必须覆盖 first-parent、merge、revert、binary/rename 和 error classification，避免把 endpoint diff 或 worktree 状态误作周期活动。
- public exports、generated package materials 和 Case catalog 跨越多个 owner；实现必须在同一 Change 内闭合这些证据，不能只让 source unit tests 通过。

## Open Questions

无。专用 constructor、single-Check identity、entry contract、measurement、enforcing unavailable、Git customization boundary 和 repository dogfood scope 均已由当前 Decision 与本 Plan 确定。

# Design

本设计用一个 fixed-ID ordinary default Check value 承接多条 Check-local maintenance reminders；它把可复现的 Git first-parent activity 直接转换为有序 assessment、terminal messages 和一个四态 Check outcome。

## Context

当前 Product 已有 ordinary Check values、Check-owned options/execution dependencies、four-state final result、terminal messages、`attention` visibility、explicit aggregation 与 native object composition。callback 已获得 `context.project.root` 和 invocation `AbortSignal`；private process adapter 是实现 Git 调用的正确边界，而不是新的 public operational-dependency API。

下列当前决策约束本 Change：

| Decision / owner | 对本设计的作用 |
| --- | --- |
| [`complete-first-release-check-set-before-publication.md`](../../docs/decisions/complete-first-release-check-set-before-publication.md) | 将 `maintenanceReminders` 纳入首版，并要求它保持 fixed-ID ordinary value，不增加 constructor。 |
| [`use-native-object-composition-for-check-customization.md`](../../docs/decisions/use-native-object-composition-for-check-customization.md) | 项目以原生 object spread / array 操作替换完整 options，不使用 partial override 或 product-specific derivation API。 |
| [`keep-comparison-semantics-inside-producing-checks.md`](../../docs/decisions/keep-comparison-semantics-inside-producing-checks.md) | baseline acquisition、comparison、classification 与 failure semantics 留在 producing Check，不进入 Run/Core。 |
| [`let-check-options-own-execution-dependencies.md`](../../docs/decisions/let-check-options-own-execution-dependencies.md) | Git executable 与 availability probe 是该 Check 的完整 options，而非 shared binding 或 Run Control。 |
| [`cancel-task-admission-and-drain-started-work.md`](../../docs/decisions/cancel-task-admission-and-drain-started-work.md) | Run 只负责停止新 Task admission 并 drain 已启动 Task；adapter 需要尊重 callback signal，但不创建另一套 cancellation lifecycle。 |

本 Change 的术语如下：

| Term | Meaning in this Change |
| --- | --- |
| **owning Check** | 唯一的 executable `maintenance-reminders` Check；Core、output、progress 和 aggregation 只看见此 Check identity。 |
| **reminder entry** | `options.reminders` 的一个 local configuration / assessment unit；它不是 Check、Record 或 dependency target。 |
| **current** | 已完成评估且没有任一已配置 maximum 被严格超过的 entry state。 |
| **due** | 已完成评估且 `commitCount` 或 `changedLines` 严格大于相应已配置 maximum 的 entry state。 |
| **whole-Check failure** | Git availability、history validation、process、parse 或 cancellation 令任一必需评估无法可信完成；结果为一个 `unavailable` Check，而非 partial clean assessment。 |

## Goals / Non-Goals

**Goals**

- 让 package consumer 用一个 exported ordinary value 和 complete options 配置多条维护提醒。
- 固定 committed-history 的可复现度量、author-order messages 与 advisory/enforcing folding。
- 让默认提醒可见但不阻断；是否让 failed / unavailable 影响流程仍由 caller 的 explicit aggregation 和 Gate mapping 决定。
- 保持 reminder 的 policy、baseline 与 final classification 由 producing Check 拥有。

**Non-Goals**

- 不新增 factory/constructor、generic baseline service、reminder Records、第二 scheduler 或第二 Check family。
- 不读取 worktree/index delta，不按 wall clock 调度，不自动修改 base commit。
- 不实现 path filters、acknowledgement state、notifications、task-management workflow 或 shared baseline channel。

## Decisions

### Intended Change

#### 1. One fixed ordinary value and closed options

`maintenanceReminders` 是一个 direct executable ordinary value，具有 `checkId = "maintenance-reminders"`、`displayName = "Maintenance reminders"`、`visibility = "attention"` 与 complete default options。一个 Project Definition 配置这一组 reminders；多个 entries 不获得 reminder-level global identity。

`MaintenanceRemindersOptions` 精确包含：

- `git`：exact `{ executable, availabilityArgs }`；`executable` 非空，`availabilityArgs` 为 dense string array；
- `reminders`：dense array，每项 exact `{ id, baseCommit, mode, message, maximumCommits?, maximumChangedLines? }`；
- `id` 为 unique lower-kebab；`message` 非空；每个 present maximum 是 positive safe integer；至少一个 maximum present；`baseCommit` 是 lowercase 40 或 64 hex。

Definition validation 负责 closed-shape validation、snapshot 与 fingerprint。它不会 materialize 缺失 nested options，也不会允许环境变量、Run flags、repository tooling 或 exported value identity 改写 Git 或 reminder policy。

#### 2. Repository and activity model

Measurement 从 `context.project.root` 启动 Git。`baseCommit` 必须解析为 commit object，并精确在 current `HEAD` first-parent chain 中；不接受可移动 ref、缩写 ID、tag、branch、off-chain ancestor 或无法获得的 shallow history。

Base 不参与统计。对每条 entry：

1. 枚举 `base..HEAD` 的 first-parent commits，得到 `commitCount`；
2. 对每个该范围内 commit 相对其 first parent 的 diff 累加 Git numstat additions + deletions，得到 `changedLines`；
3. merge 只按 first parent 计一次；revert 仍计自身 diff；binary 条目计零；rename 按 Git numstat；worktree/index 不参与。

上述算法定义的是**累计活动量**，不是 base 与 HEAD 的净 tree 差异。

#### 3. Due, messages and one terminal outcome

已配置 maximum 的比较均为严格大于：等于 limit 保持 current；任一维度超出即 due。due entries 按 `options.reminders` 的 author order 生成 messages，固定 code 为 `maintenance-reminder-due`：advisory 为 `warning`，enforcing 为 `error`，message 正文为 validated author string。

空 `reminders` 立即返回 `not-applicable`。所有 entries 正常完成后，Check 返回 versioned final data，包含总 counts 和 ordered assessments。至少一个 enforcing due 时终态为 `failed`；否则终态为 `passed`，所以 advisory due 可表现为 `passed` + warning message。

#### 4. Failure and publication boundaries

Git unavailable、invalid history、process failure、malformed output 或 cancellation 导致 whole-Check `unavailable`，并使用 Check-owned closed reason code；该分支不携带 final data。此 Check 不报告 Records，因此不会产生 partial Record retention 问题。

正常 final data 是 generic Check outcome data，可进入 v4 machine publication。terminal messages 只进入 progress 和 `RunResult.checkMessages`，不进入 Core Records 或 machine output。reminder entry 不影响 aggregation selection；caller 仍显式选择 owning Check ID 并决定 failed/unavailable 的流程后果。

#### 5. Public/package closure

实现应在 default-check registration、runtime options validation、root export、public contract inventory、Configuration/Quality/Output owners、README/JSDoc/example、semantic Case 和 isolated Bun candidate 中使用同一个 public value/options contract；不增加 CLI、subpath 或 public process API。

### Resulting Impacts

| Impact | Handling decision | Required evidence |
| --- | --- | --- |
| Declarative identity | complete Git/reminder options 和 reminder author order 进入 fingerprint；execution callback 不贡献 hidden policy。 | Definition validation/fingerprint tests。 |
| Private Git adapter | 以 `project.root`、Check-owned command values 和 callback signal 执行；其 raw command/output 不进入 public final data。 | focused fixture spike 与 adapter failure/cancellation tests。 |
| Check facts | assessments、messages、final data、passed/failed/unavailable 全由 owning Check 闭合。 | direct Check/Run status, message and data tests。 |
| Output | assessment data 走已有 generic v4；messages 只走 progress/`RunResult`。 | Output/Run tests 与 docs validation。 |
| Consumer policy | exported empty default 不替使用项目指定 base/threshold/mode；当前 Plan 未指定 repository policy。 | isolated consumer example；scope review。 |

## Risks / Trade-offs

- Cumulative changed lines 衡量活动量而非 endpoint 净差；revert 也计入是刻意的可审阅取舍。
- Full commit ID 要求 consumer 显式维护 baseline，但避免 symbolic ref 随时间移动导致同一 options 语义漂移。
- 一条必需 history 无法完成时 whole Check `unavailable`，会抑制其它 entry 的 final data；这比发布不完整但看似干净的 assessment 更可信。
- 默认 value 本身不预设项目 policy。若本仓立即配置真实 reminders，必须先决定其 baseline、阈值、mode 以及 progress/output 的复核路径；这些决定不能从 package default 推导。

## Open Questions

无阻塞的产品或架构问题。

实施前的 `0.3` 仍须用最小 spike 确认当前 private process runner 对 Git 子进程取消、SHA-1/SHA-256 object ID、merge/revert/binary/rename 和 shallow history 的实际命令边界。该确认只决定 private adapter 的实现方式；它不得新增 public option、Core state 或 repository policy。若用户要求在 `scripts/project/quality/definition.ts` 配置非空 reminders，则这是会扩大范围的独立策略决定，须先更新本 Plan 的 scope、tasks 和验证。

## Implementation Observations

2026-08-24：首版 Check 组合已将 maintenance reminders 提前，并把原 constructor 方向收敛为 ordinary default value。当前 Plan 已固定 public identity、first-parent activity、empty/failure folding 和 no-constructor boundary；下一入口是 Readiness 0.3 的 Git fixture spike。

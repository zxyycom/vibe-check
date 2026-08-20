# Design

本 Design 把用户已确认的 progress 形状收敛为一个 Product-owned lifecycle renderer：统一的 internal started/settled feedback 驱动 TTY 临时 running 区域和 plain settled-only 输出，并与 final `RunResult` 复用 Product 测量的 Check duration。

## Context

### 实施前基线

本节保存 Plan 形成时的事实，不拥有当前运行时契约；当前稳定行为见 [Configuration](../../docs/configuration.md#invocation-and-results)、[Architecture](../../docs/architecture.md#execution-boundary) 与 [Output](../../docs/output.md)。

- `ProjectDefinition.effects.progress.enabled` 已存在且默认启用，Run controls 可以按 invocation 关闭它。
- `src/product/run/effects.ts` 当时只用 `console.log` 打印 `execution`、`effects` 两个固定阶段；首次 progress write 失败会在 Check work 前返回 `progress-failed`。
- `src/product/run/check-execution.ts` 在 Run-owned adapter 中打开 Check scope、执行 callback、验证 Record/reference submission 并固定 terminal outcome。它是 Check started/settled feedback 与 duration measurement 的最窄 Product owner。
- Check definition 已提供 canonical `checkId` 和 `displayName`；final `CheckOutcome` 已区分 completed passed/failed、not-applicable 与 unavailable。可见序号不需要也不能替代 `checkId`。
- completed、post-model effect failure 与 execution-phase cancellation 的现有 `RunResult` branches 带 final snapshot；configuration、planning、pre-work cancellation 和 task-engine/invariant failure 没有完整 Check facts。

### 参照与长期约束

当前 workspace verifier 的可复用能力是 header、按真实完成顺序追加 `status + label + duration`，以及 final outcome counts/elapsed。它的 profile wording、warning regex、log path、process transcript 和 exit mapping 属于 repository verifier，不进入 Product renderer。

[由 Product Run 提供 Check 生命周期进度](../../docs/decisions/provide-product-owned-check-progress.md) 记录了 Product-owned private lifecycle feedback、TTY completion history + running region、plain settled-only、两种可见序号、stream ownership 和 progress-failure isolation 的实施方向。该 Decision 的 `active + unaligned` 是 Plan 形成时的决策状态，不是当前实现状态；当前稳定行为由上述 owner 文档承接。

[在公开 package 发布前完成项目门禁](../../docs/decisions/complete-project-gate-before-public-package-release.md) 已确认：Product 为实际执行的 Check 测量一次 `durationMs`，同时用于 settled feedback 与 final structured summary；duration 不进入 QualityRecord、Core、machine 或 policy。该记录不定义 renderer，也不要求 public observer。

[让程序化 API 成为唯一正式产品执行入口](../../docs/decisions/use-programmatic-api-as-product-entry.md) 与[默认启用工具运行副作用](../../docs/decisions/enable-tool-effects-by-default.md)共同约束本 Change：调用方仍通过 structured `run` API 获得核心事实，Product 可以提供默认 progress effect，但 progress 文本不是调用方恢复结果的机器协议。

### 稳定术语

| 术语 | 本 Change 中的唯一含义 |
| --- | --- |
| completion history | TTY `Checks:` 下已经永久写入、常规刷新不再改动的 settled rows。 |
| running region | 紧随 completion history、只显示当前 running Checks、每次 lifecycle feedback 后可整体清除和重绘的临时区域。 |
| completion ordinal | settled row 的 `[n/total]` 中的 `n`；表示 renderer 收到的第 n 个 settled feedback，写入后不再改变。 |
| running display index | running row 的临时 `n`；等于 `completedCount + runningPosition`，只表示当前可见行位置。 |
| terminal row | settled 后使用最终 status、duration/not-run 与可用 reason 写入的永久 completion row。 |
| Check identity | internal `checkId`；started/settled 关联、duration summary 和 outcome lookup 都使用它，而不是可见序号。 |

## Goals / Non-Goals

### Goals

- 让任意 npm Product consumer 启用现有 progress effect 后，在所有 target 看到总数、连续完成进度、terminal status/duration 和 final execution summary，并仅在 TTY target 看到当前 running Checks。
- 让 TTY 与 plain presentation 消费同一 internal feedback、completion counter、status mapping 和 terminal-row formatter；TTY 只额外拥有 running state 与 cursor redraw。
- 在 Run-owned Check execution boundary 测量 duration，并让 progress 与 final `RunResult.checkDurations` 复用同一次测量。
- 让 progress failure 可观察但不能成为第二个 Check/Record execution control plane。

### Non-Goals

- 不增加 Check-owned lifecycle callback、project-supplied observer、public event union、custom renderer 或 scheduler public API。
- 不提供通用 spinner/bar、theme、refresh-frequency 配置或 renderer plugin。
- 不流式输出 Record、scanner stdout/stderr、Task identity、options 或 project process transcript。
- 不增加 wall-clock、Record timing、durable trace、performance budget 或 policy operand。
- 不逐字兼容 workspace verifier output；它只提供信息层级参照。

## Decisions

### 1. Product progress effect 拥有基础呈现

Product 已拥有 Check catalog、execution、outcome 与 effect orchestration，因此基础 progress renderer 由 Product progress effect 实现。Check 只执行既有 callback 并返回 `CheckResult`；project adapter 只控制是否启用 progress，并继续拥有 Product 外的 CLI/profile、per-process logs、exit mapping 和 gate policy。

首轮没有 public lifecycle/event/renderer surface。started/settled feedback 是 Product private handoff；必要的 scheduler integration 也保持 package-private，不把 progress 需求扩张为通用 public observer。

### 2. Internal feedback 只携带运行事实，不携带可见序号

| Feedback | 形成时机 | 必要事实 | Presentation |
| --- | --- | --- | --- |
| prepared | validation、planning、project context 与 static graph validation 成功，尚未执行 Check | total executable Checks | 打印 header，初始化 `completedCount = 0`。此前失败不打印伪造的零 Check header。 |
| started | Check 实际进入 execution path | `checkId`、`displayName` | TTY 更新 running region；plain 丢弃。 |
| settled | canonical Check 的 terminal outcome 已闭合 | `checkId`、`displayName`、final `CheckOutcome`、`durationMs` | TTY/plain 使用下一个 completion ordinal 生成同一 terminal row。未启动 Check 也有 settled，但没有 started。 |
| final | 全部 canonical Checks 已闭合 | outcome counts、execution elapsed | 在 completion rows 后打印 execution summary。 |

可见序号全部由 renderer state 计算，不写入 internal feedback，也不作为 Check identity。progress owner 串行处理 feedback；该处理顺序定义 completion history 的顺序。

### 3. TTY 只重绘 running region

TTY renderer 维护 `completedCount`、有序 running list 和上次绘制的 running row 数量：

1. **started：** 清除旧 running region，将新 Check 追加到 running list 末尾，再按 `completedCount + runningPosition` 重绘全部 running rows。
2. **settled：** 清除旧 running region，以 `completedCount + 1` 写入永久 terminal row；增加 `completedCount`，从 running list 移除相应 Check（从未 started 时无需移除），再保持其余 Checks 的相对顺序并重新计算临时显示序号。
3. **final：** running region 必须为空；completion history 保持 settled 顺序，然后打印 summary。

例如两个 Check 正在运行：

```text
Vibe Check
total 3 checks

Checks:
  [1/3] TypeScript product lint | running
  [2/3] Network links           | running
```

临时显示为 `[2/3]` 的 Network links 先完成后，它获得永久 completion ordinal `[1/3]`；剩余 running Check 被重新编号：

```text
Vibe Check
total 3 checks

Checks:
  [1/3] Network links           | passed | 2.5s
  [2/3] TypeScript product lint | running
```

Product tests 随后开始时取得当前临时位置 `[3/3]`：

```text
Vibe Check
total 3 checks

Checks:
  [1/3] Network links           | passed | 2.5s
  [2/3] TypeScript product lint | running
  [3/3] Product tests           | running
```

全部完成后，running region 消失，completion history 保留真实 settled 顺序：

```text
Vibe Check
total 3 checks

Checks:
  [1/3] Network links           | passed | 2.5s
  [2/3] TypeScript product lint | passed | 8s
  [3/3] Product tests           | failed | 14s

Execution summary:
  execution: completed
  total checks: 3
  passed: 2
  failed: 1
  not applicable: 0
  unavailable: 0
  elapsed: 14s
```

### 4. Plain output 只追加 terminal rows

非 TTY、重定向或 `TERM=dumb` 使用 plain policy：打印同一 header，丢弃 started，按 settled feedback 顺序使用共享 completion counter 和 terminal-row formatter追加完成行，最后打印同一 summary。plain output 不含 cursor 或 ANSI color bytes。

这种共享只统一业务信息，不强迫两个 presentation policy 拥有相同状态：TTY 维护 running list/cursor state，plain 不维护临时区域。

### 5. Terminal row 直接投影既有 status、duration 和 reason

status mapping 是封闭的：

| `CheckOutcome` | progress status |
| --- | --- |
| `completed/passed` | `passed` |
| `completed/failed` | `failed` |
| `not-applicable` | `not-applicable` |
| `unavailable` | `unavailable` |

label 直接使用 canonical `displayName`。reason suffix 只使用既有 outcome 的安全 `reason.code`；没有 reason 时不补造，也不默认展开可能很长的 prerequisite `checkIds`。Product 不从 Record level 推断 `warning`，也不复制 workspace verifier 的 warning regex。

实际开始执行的 Check 显示 Product-measured duration，即使 outcome 是 not-applicable 或 unavailable；prerequisite blocked 或 cancellation-before-start 等从未执行的 Check 显示 `not run`。duration measurement 独立于 progress 是否启用或成功。

### 6. Duration summary 与 progress 使用同一次测量

Run-owned Check adapter 在进入 callback 前启动 monotonic timer，在 callback result、Record/reference validation 与 Core settlement 固定后停止。scheduler queue wait、console rendering、policy、publication、logs 和 output effects 不计入 per-Check duration。

带 final snapshot 的 RunResult branches 新增：

```ts
readonly checkDurations: readonly Readonly<{
  checkId: string;
  durationMs: number | null;
}>[];
```

`checkDurations` 与 `snapshot.checks` 同序、同数量、同 `checkId`；没有 final snapshot 的 result 不伪造 summary。首轮不新增独立命名 type root，除非 exact-package consumer 证明真实 import 需求。

execution `elapsed` 使用独立的 invocation-local monotonic interval，从 prepared 后、即将进入 Check execution 时开始，到所有 Check terminal settlement 闭合时停止。并行 duration 会重叠，因此 elapsed 不是 duration 之和；首轮只显示 elapsed，不把它加入 structured RunResult。

### 7. Terminal capability 与颜色只影响 presentation

renderer 按实际目标 stream capability 选择 TTY/plain，不从 scheduler configuration 推断。支持颜色的 TTY 可用绿色 passed、红色 failed、弱化/青色 not-applicable、黄色 unavailable 和中性 running；无色环境仍显示完整 status text、count、title、duration/not-run 与 reason。

首轮使用私有 terminal helpers，不新增生产依赖，也不建立 theme contract。精确 spacing、alignment 和 escape sequence 由 output-focused tests 固定，但不升级为 machine schema。

### 8. Progress failure 对 execution facts fail-open

实施前基线会在首次 progress write 失败时于 Check work 前返回。此设计的目标行为是：第一次 write/rewrite failure 将 progress status 单向置为 failed，停止后续 progress writes，但继续 Task admission、Check settlement、Record closure 和其他 enabled effects。

如果 Run 最终形成 completed facts，返回携带这些 facts 的 progress effect failure；如果 Run 自身 cancellation/execution failure，保留更具体的 result kind并保留 failed progress status。多个 effects 同时失败时保留完整 statuses，并使用确定性的 effect diagnostic priority，而不是时间竞赛。console failure 不得伪造或改写 Check/Record facts。

### 9. Progress、logs 与 output 分责

- `progress`：运行期 header、running region、per-Check completion 和 final execution counts/elapsed。
- `logs`：现有 final quality/Record readable summary。
- `output`：现有 machine/report artifacts。
- project-owned logs：Check 私有 subprocess transcript、repository command line 和 gate-specific paths。

默认同时启用 progress 与 logs 时，execution progress 先于既有 quality summary；两者使用不同标题和事实集合，不重复计算 outcome。

## Risks / Trade-offs

- **共享 stream 干扰：** Check 或调用方若直接写入 TTY renderer 使用的 stream，会破坏 running row count 与 cursor 位置；本 Plan 明确不支持任意同-stream interleaving，Check/process 详细输出必须进入 project-owned logs。
- **并行顺序：** completion ordinal 表示 renderer 串行接收 settled feedback 的顺序，不是 Definition order；Check identity 始终使用 internal `checkId`。
- **双摘要：** progress execution summary 与 logs quality summary 可能连续出现；必须用标题和事实范围区分，避免重复噪声。
- **计时波动：** duration evidence 必须使用可控 monotonic clock，不能依赖真实 sleep 的精确毫秒值。
- **下游漂移：** 后续若改变 progress owner 或 public surface，必须同步 Gate Change、portfolio 与 delivery navigation，避免再次引入 project observer/renderer。
- **candidate drift：** public RunResult/runtime output 改变后，现有 candidate handoff 不再证明新契约；Gate 必须使用 fresh candidate。

## Open Questions

无。

## Verification Strategy

`tasks.md` 按以下证据链覆盖实现与验证：

1. 运行 `test-evidence` 变更前检查，并维护新增/修改的 Product output、execution、result 与 exact-package Cases。
2. 用 injected stream/capability 证明 prepared header、started/settled feedback、completion ordinal、running display index、TTY running-region redraw、plain settled-only、零 Check 与 final summary。
3. 证明先显示为临时 `[2/3]` 的 Check 可成为第一个完成的永久 `[1/3]`，其余 running rows 保持相对顺序并重新编号。
4. 覆盖 passed/failed、not-applicable with/without reason、started unavailable、prerequisite unavailable、callback failure、parallel completion、cancellation-before-start 与 execution cancellation。
5. 用可控 monotonic clock 证明 duration 非负有限、未启动为 `null`、progress/final 同值、`checkDurations` canonical order，以及 elapsed 与并行 duration sum 不同。
6. 证明 TTY/plain terminal-row parity、no-color 信息完整性、cursor/ANSI 只出现在支持的 TTY，以及选定的 stream ownership 边界。
7. 证明 progress failure 首错隔离、effect/result precedence、其他 effects 继续且 Check/Record facts 不变。
8. 同步 public inventory、Configuration/Architecture/Output owner 及下游 handoff，构建 fresh package candidate 并运行 isolated consumer。
9. 运行最窄 Product/package tests、typecheck、lint、dependency/entry checks、Decision/Change/test-evidence checks和 `bun run verify:vibe-check-workspace:required`。

## Plan Readiness

`tasks.md` 已从本 Design 派生 Readiness、Implementation 与 Verification 的完整依赖链，每项 Success Criteria 都有 owner、实施产物和验证出口。

以下保留 Plan 开始实施时的 Readiness 快照：stream ownership 已固定，长期 Decision 当时记录为 `active + unaligned`，下游 handoff 已同步，Run/scheduler/Core seam、测试 Case 基线和 public/package candidate 边界均已审计。它不表示当前实施进度；当前完成状态仍以 `tasks.md` 的实际 checkbox 证据和稳定 owner 为准。

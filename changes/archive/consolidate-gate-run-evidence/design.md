# Design

本设计将 Gate 的阻断性 terminal facts 与一次 Product Run 的人读 diagnostic 分开归属：Gate 不再等待无结论贡献的 quality wrapper，而 test-owned execution 仍可保存单份可复核的 core diagnostic evidence。

## Context

- 在 Plan 形成时，`scripts/project/gate/**` 已拥有 required/full selection、candidate preparation、Gate-owned process checks、aggregate 与 invocation log directory；`repository-quality` 当时只是 scan-only Run 的 process wrapper，quality 结果不参与 Gate blocking aggregate。当前实现已移除该 wrapper、其 selection identity 与短命令，Gate 只保留会贡献 aggregate 或明确 assurance 的 Checks。
- `src/project-run/**` 与 `docs/architecture.md` 拥有 Check preflight、generic Task scheduler、completion 和 `RunResult.outputs`。归档的 `docs/decisions/archive/add-ephemeral-project-run-diagnostic-logging.md` 记录已实现的 diagnostic 基线；当前日志边界仍由这些 stable owner 和 active Decision 共同约束，不提供 parser/schema/observer/verbosity/multiple-file contract。
- 在 Plan 基线中，`docs/script-tooling.md` 的 `Quality dogfood` 章节拥有该 root entry。当前 stable owner 已移除该章节和 `bun run quality`；这不等于把短命令迁移到另一未定义入口，也不授权恢复独立 observation workflow。
- `changes/archive/reduce-project-run-diagnostics-to-runtime-decisions/` 与其它 archived Change 只保存形成时材料；本 Plan 以当前 owner、active Decision 和现有 source/tests 为准。

AI consumption contract：proposal 说明范围、成功标准和完成出口；本 design 区分 Plan 基线与当前 owner、目录边界和不可扩张的 public surface；tasks 提供实施/验证事实。长期方向由已对齐的 `consolidate-project-gate-run-evidence.md` 承接；本 Change 不把任务进度或日志文本转写成稳定事实。

## Goals / Non-Goals

### Goals

- 让一次 Gate invocation 的每个启动 Check 都提供 Gate aggregate 或明确 Gate-owned assurance，而没有只等待完成的 nested quality Run。
- 保持一 Run 一 core diagnostic 文件：Gate bound Run 由 Gate invocation directory 承接，测试主动启用的文件由 test-owned fixture 可复核、可清理。
- 让 diagnostic 记录真实 resolution/decision context，而不是重复生命周期标记或损失用于解释 scheduler 选择的字段。
- 维持 four-state Check result、RunResult output status、logging-failure containment、cancellation、candidate/test-lane resource ownership 与 required/full assurance 的既有边界。

### Non-Goals

- 不以本 Change 恢复、替代或重设计独立 quality observation workflow；不保留兼容 alias 或 hidden `quality` 短命令。
- 不把 diagnostic event name、summary、details layout 或目录字符串升级为 parser/schema、公共 API、跨版本兼容或 machine output。
- 不增加 core 多日志、index、latest、retention、remote transport、verbosity/filter、public observer 或 Check logger。
- 不改变 Gate 以外 Product Run 的 consumer 默认、Check final data/Record semantics、scheduler policy、或 quality findings 的领域解释；只修改本次已确认的 evidence ownership 和 diagnostic presentation。

## Decisions

### Intended Change

1. **删除无阻断 nested Run。** Gate entry factory、catalog tag/profile selection、definition tests、Case materials 和 command scripts 只保留当前有 aggregate/assurance consumer 的 checks。`repository-quality` process entry 及其 `quality` tag 一并退出；先做 caller audit，再移除只服务 `bun run quality` 的 root script/wrapper。不要用“process completed”取代 quality facts，也不要把它换名后继续放入 Gate。

2. **test-owned diagnostic evidence。** Product core 继续从 enabled Run 创建唯一 `run-<UTC compact timestamp>-<UUID>.log`。Gate bound Run 保持由当前 Gate invocation directory 承接；各 Product/runtime test 在主动启用 diagnostic 时把 directory 指向其 test-owned fixture（例如 `<test-fixture>/project-run-diagnostic/`），并由该 fixture 的 cleanup 规则管理。普通 `.log/project-run` 不接收测试产生的 diagnostic。directory 选择是 repository-consumer/test wiring，不改变 external consumer default、`RunResult.outputs.diagnosticLogging` 的单-file readback 或日志正文的 private 边界。

3. **preflight 一次 resolution。** `prepareCheck` 在每条出口构造唯一的 resolution fact，再由一个 observation helper 写 `preflight.resolved`。skipped authored options 也写该项；prepared/continued、blocked、cancelled-before/after callback、throw 与 malformed 各在同一项中表达 outcome、reason、安全 raw/summary（适用时）。不再先写 `preflight.started` 再写 `preflight.finished`。

4. **完整 SchedulerDecision 证据。** 纯 core 继续由 immutable snapshot 和 trigger 返回同一个 `SchedulerDecision`，imperative shell 记录并应用该值。每一个 decision details 都含完整 capacity object（`maxParallel`、`effectiveMaxParallel`、`running`）、当前 blocker context（无 blocker 明确为 null/empty）和 reservation context（无 reservation 明确为 empty/no reservation），再加 kind/reason/task/trigger 等选择事实。summary 可针对 admit、await、blocked、cancel、complete 改善人读解释；不可为了压缩而省略数值相等的 capacity fields。

5. **无冲突的 closing projection。** close 前的 diagnostic observation 使用逻辑 pending-close value 代表该 logger 的唯一临时状态，并从同一 details 的 output snapshot 排除 diagnostic 的 initial `not-run`。close 后的 `succeeded`/`failed` 仍只由 `RunResult.outputs` 的 final value 回读；logger failure 继续仅影响自身 output。

### Resulting Impacts

1. **Gate selection and command removal：** caller audit 必须覆盖 package scripts、Gate adapters/tests、stable docs、Case refs 和 Test Evidence entities。删除后 required/full profile 和 disabled-tag path 不得残留无效 `quality` selection 或错误的 expected count；不应把历史 Gate membership 当固定数值契约。
2. **Directory ownership：** Gate invocation directory 和 test fixture directory 分别由其 caller 拥有；后者需要 containment、unique naming、cleanup/retention 边界和 target test assertions。diagnostic core 只接收既有 configured directory，不知晓 Gate 或 test fixture 语义。
3. **Diagnostic owner coverage：** preflight helper 必须避免每个 branch 重新格式化或安全读取 author data；scheduler detail producer 从 same decision value 投影，shell 不重新计算 blocker/reservation/capacity。focused tests 要证明 skipped 有一次 resolution、各 decision 完整 fields 且没有 logger/scheduler side-effect leak into pure core。
4. **Output failure boundary：** closing 变更不得把 pending-close 写入 final RunResult，亦不得隐藏其它 outputs 的 actual pre-close states；configuration/disabled branch、partial write、append/close failure 与 cancellation 保留原有结果优先级。
5. **Stable material/evidence：** 更新 current docs/Case only where command, identity, directory ownership or readback has changed. Event prose remains descriptive and product-private; Case asserts observable behavior rather than parsing text grammar. required/full smoke should establish Gate aggregate and evidence directory behavior after the catalog change.

## Risks / Trade-offs

- 删除 nonblocking observation 会减少 Gate 内可见的 quality scan output；这是明确取舍，而非将该 output 隐藏在另一个 wrapper。需要独立 observation 时必须新建方案。
- 完整 scheduler context 会保留一些重复数值，但提高了单项 decision 的可解释性；降噪只作用于 lifecycle repetition，不作用于 decision evidence。
- test-owned evidence 增加 test fixture path coordination；分别由 test/Gate caller清理可避免 core runtime 引入 repository-specific retention policy。
- closing 只记录 close 前状态，进程强制中断仍可能留下未完成日志；不承诺 fsync/crash consistency。

## Open Questions

无。具体目录 helper 名称、测试 fixture 路径和 summary wording 由实现 owner 在不扩张上述边界的前提下选择；若 caller audit 发现独立 `quality` consumer 或 public contract，则必须先回写本 Plan 并重新审阅范围。

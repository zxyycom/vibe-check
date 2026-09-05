# Design

本设计已在 recording owner 内引入返回实际合并结果的私有阶段；Change 目前仍是已完成任务、未归档的 active Plan。

## Context

`docs/architecture.md` 与 `docs/api-mechanics.md` 将 history 定义为 caller-owned、untrusted、cache-like 的私有本地优化状态：它只保留 digest identity、admitted-to-settled duration、settlement kind 与 observation sequence。`recordSchedulerHistory` 接收 sealed terminal measurement 与 frozen prediction，并负责 timing gate、admission validation、per-identity window update、series retention、history freeze 和 observation projection。实施前的 focused quality records 将其 function-code-density 记录为 68，阈值为 50。

## Goals / Non-Goals

目标是消除这一条 function-code-density Finding，并让「按已验证 admission 合并 identity history」成为能独立说明输入、顺序和结果的真实私有阶段。非目标是改变 samples、prediction、retention 策略、持久化 schema、测试 Case、admission 策略、provider/preparation、Scheduler legality 或 concurrency。

## Decisions

### Intended Change

公共函数保留 timing 可用性 guard 与最终 output projection。`mergeVerifiedAdmissionSamples` 从已有 series 建立 identity 映射，按 timing facts 的 admission 顺序取得 sample，跳过无效或 sequence 饱和的 sample，更新同 identity 的尾部 32 项窗口，并返回更新后的 identity series、latest sequence 与 accepted count。调用方继续以原有 recent-series 排序/截断形成最多 4096 项，再调用原有 history freeze 函数。

### Resulting Impacts

- **identity semantics：** Map 构建、same-identity append 和 sequence 递增都在合并阶段内完成；每个 accepted admission 的顺序和状态提交点保持不变。
- **unavailable semantics：** public guard 在进入合并前返回原 history 引用和冻结的 `timing-unavailable` observation；不构建 Map，也不产生新 history。
- **storage/privacy semantics：** 合并阶段只写入 sample 的 digest、duration 和 settled kind；series 不写入 task ID、authored options 或 flags。
- **quality evidence：** focused quality 的 records 比较显示目标 Record 消失，Record 总数由 31 降至 30，未出现新增 Record。

## Risks / Trade-offs

拆分若改变 admission 迭代、在 sequence 饱和前后调用 sample 验证的顺序、Map 的 duplicate overwrite 行为或 retention tie-break，可能细微改变 history。实现仅移动真实累计结果，并保留原循环条件与调用顺序。未新增测试节点；现有定向测试覆盖关键边界，但不能单独证明所有输入组合的等价性。

## Open Questions

无阻塞问题。验证范围、证据定位和未运行项见下文；这些边界不构成归档授权。

## Implementation Observations

### Current Phase

这是 `active/plan` Change：8/8 tasks 已勾选，`baseCommit` 与当前 `HEAD` 均为 `c25b1a63a7e9172c0a4331fc45d9444b3d41aef7`。它未归档、未提交、未推送；完成 task 和通过机械 check 均不构成归档授权。

### Implemented Shape

`recordSchedulerHistory` 先保留 timing guard，再调用 `mergeVerifiedAdmissionSamples`，最后负责 retention、freeze 与 observation projection。私有阶段返回 `seriesByIdentity`、`latestObservationSequence` 和 `acceptedSampleCount`；`appendSampleToIdentityHistory` 集中提交同 identity window，不是参数转发 wrapper。

### Focused Evidence

- `bun test src/project-run/scheduler-duration-model/scheduler-duration-model.test.ts`：通过，4/4。该现有文件覆盖 bounded admitted samples、timing unavailable 和 oldest-series eviction 等 recording 路径。
- `bun run typecheck -- product`、`bun run lint -- product`、`bun run format -- check`：均记录为通过。
- `bun run check -- --quality`：通过（exit 0）。基线 records 为 `.log/project-gate/2026-09-05T03-57-26.818Z-1875378-23f4f999-d403-48d8-b06f-ec13fccac097/machine/records.ndjson`（31 条）；实施后为 `.log/project-gate/2026-09-05T04-02-50.558Z-1879460-f61a045e-d524-46cc-acb9-caf3659e7523/machine/records.ndjson`（30 条）。按 Record ID 比较，唯一移除项是 `recordSchedulerHistory` 的 function-code-density Record，未新增 Record。

### Not Run / Evidence Boundary

除已记录的 focused 与默认 Gate 外，未运行全量 `bun run check -- --all`、完整产品测试套件或 test-evidence check。`--quality` 直接证明 function-metrics Record 集合，不替代 typecheck、lint、format 或未选择的 Gate checks；上述工具的结果仅由各自记录的命令承担。此次没有测试源改动，也没有以 focused 或默认结果推断未运行范围的通过。
- 授权后的默认 `bun run check` 通过（31 passed、5 not-applicable、0 failed），日志为 `.log/project-gate/2026-09-05T04-09-25.390Z-1885420-7e74b6da-9f36-40de-ba65-35afcd8a866c`；未运行 full Gate。

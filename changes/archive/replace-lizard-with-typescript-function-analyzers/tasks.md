# Tasks

本文件是本 Change 的唯一执行顺序和 checkbox 进度。checkbox 只记录已有直接证据；全部技术任务已完成。Change 保持 active 仅因归档需要单独的明确授权。

## Readiness

- [x] 0.1 审计旧 Change、language Decision 与 registry，确认原 TypeScript/Rust-only 范围不能继续实施，并保存形成时调查报告。
- [x] 0.2 固定 Lizard 1.23 oracle、27-reader/55-extension full parity、hard cut、无 fallback、无 SCC/generic framework、无首轮 1.24 upgrade 与 public scanner migration 边界。
- [x] 0.3 记录产品 owner 已确认完整移除 Python/Lizard runtime、长期拥有所有 readers、忠实翻译、后续 upstream 跟随、提示 Check、删除 `scanner.executable` 与独立 legal inventory。
- [x] 0.4 重新核对 public options、Finding waiver、Records/final data、55-extension registry、package/Gate 与三条 current Decisions；保存 Plan 基线后的语义漂移审计，并确认没有 functionMetrics cache migration 义务。
- [x] 0.5 提交可审 Readiness evidence：79-entry source/range→target/exclusion provenance 与 deviation ledger、82 normal/edge 和 27 malformed oracle observations、source identity、resource/cancellation spike、current candidate/installed boundary 与 advisory fixed-source/explicit/bounded-transport contract。该 Readiness 快照只证明 source-tree correctness 已就绪且资源观察尚无性能预算；其形成时尚未覆盖最终 workspace Gate，后者由 2.5 的独立验收记录闭合。

## Implementation

- [x] 1.1 将 Readiness ledger 落为 checked-in source/range→target/exclusion mapping、deviation ledger、internal extension protocol corpus 与 reader/family oracle；translated range 带 source/SPDX/modified header，legal inventory 输入闭合，19 个 deferred concrete extension body 保持未注册。
- [x] 1.2 按 source-aligned core/extensions boundaries 实现完整 internal protocol、27-reader/55-extension Product-owned analyzer 与 reader/family fidelity review；实现 normalized results、exact-path byte admission、source decoding 和单 Worker cancellation/resource model。parity 前不以简化或统一改写 reader 语义。
- [x] 1.3 实现 repository-owned upstream advisory、显式 maintenance selection、official release transport、非阻断 diagnostic 与 default-Gate absence；它不成为 package public Check 或自动升级入口。
- [x] 1.4 切换 source-tree measurement backend，删除 Lizard availability/process/parser/CSV、Python/Lizard tool binding、production fallback 和 public `scanner.executable`，并同步 options、waivers、Records、stable docs、release materials 与相关 Decisions 的实施事实。

## Verification

- [x] 2.1 对 core/internal extension protocol、每个 enabled reader/family 和所有 registered extensions 运行 lifecycle/order/deferred-disable、normal、edge、malformed-robustness、read-error、cancellation、order 与 waiver fidelity tests；新增 Case 已完成 Test Evidence closure。
- [x] 2.2 运行 resource/cancellation 与 source-decoding differential、产品 typecheck、source-quality checks 和 function-metrics/analyzer target tests；资源 spike 记录 latency/RSS observation，但不伪称未声明的 performance budget 已通过。
- [x] 2.3 运行 dependency/import/process absence、public API inventory、current candidate/installed consumer 与 legal inventory tests；证明 source/package candidate 无 Python/Lizard runtime path、`scanner.executable` hard cut 完整，translated/deferred/excluded source ranges 与 license/notice/provenance materials 对应。
- [x] 2.4 验证 advisory 的 explicit authorization、fixed target、bounded response、new-version/no-update/network-failure 与 default-Gate absence，并运行 docs、Decision、Change 与 Test Evidence checks。
- [x] 2.5 对当前 candidate 运行 workspace required/full Gate，并复核 full parity、无 fallback、public migration、性能观察边界与三条 Decision owner alignment 后交付。

  **2026-09-02 最终优化树验收记录（审计证据，不是版本或发布政策）：**
  最终优化后重新构建 candidate 并运行 `bun run verify:vibe-check-workspace:required`；36 项 Check 中 30 项 passed，另有 required profile 预期的 3 项 not-applicable 和 3 项 dependency-unavailable，整体结果为 passed。`bun run verify:vibe-check-workspace:full` 通过，36/36，Markdown link validation 无 warning。该次验收使用的 local candidate 标识为 `0.0.0-local.ab9e57f091f9`；它只标识本次可复核输入，不能替代正式 release version、receipt 或后续 Gate 证据。

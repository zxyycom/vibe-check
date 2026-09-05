# Design

本 Plan 以 Gate 自有配置收紧 repository-quality policy，并保持 Product settlement 与 Gate aggregation 的既有职责边界。

## Context

`keep-package-quality-defaults-advisory-and-make-project-gate-strict.md` 是本 Change 的长期方向：package constructors 的默认 advisory evidence 不变，但 Project Gate 应以四项显式 blocking policy 使未豁免 normal Finding 进入普通 aggregate failure。`docs/quality-metrics.md` 规定 aggregate 只读取 settled Check status；`docs/script-tooling.md#project-gate` 是 Gate 当前组合与 policy 的稳定事实 owner。

## Goals / Non-Goals

目标是让四项 Gate-owned top-level `findingPolicy` 从 `non-blocking` 变为 `blocking`，并用 configuration、settlement/aggregate 与 zero-Finding evidence 证明链路。非目标是修改 package defaults、metrics thresholds、file scope、selection exclusions、waiver semantics、required/flag grammar、aggregate implementation、Record shape、release-only logic，或新增另一种 quality aggregate。

## Decisions

### Intended Change

在 `scripts/project/gate/checks/repository-quality.ts` 只调整 duplicate-detection、file-metrics、function-metrics 与 markdown-link-validation 顶层 options 的 `findingPolicy`。保留既有 strict values、scope、exclusions、waiver input 与 Check construction；Product owning Check 继续按 policy 结算 status，Gate Definition 继续以 effective selection 和 `all` aggregate 消费 status。

### Resulting Impacts

稳定 Gate 文档必须把四项 policy、selection 与 package-default 分层写为当前事实：四项都在 required、`--quality` 与完整 `--all` 内，只有 Markdown link validation 还在 `--docs` 内。测试必须证明 definition 配置、每项 blocking settlement、aggregate failed、zero-Finding passed 及 waiver/exclusion 不变；测试正文/Cases 改动遵循 Test Evidence 流程。完成后才对 active Decision 核对 alignment；初阶段的 focused validation 不替代默认 Gate，最终归档与提交须另获明确授权。

## Risks / Trade-offs

已有未豁免 quality Finding 会使实际 focused quality Gate 非零；本 Change 不通过提高阈值、扩大 exclusion 或增加 waiver 规避这一事实。自动化 test injection 必须复用 Product 的真实 settlement/aggregate path，不能构造第二个 Gate outcome reducer。

## Open Questions

无阻塞性开放问题。当前 0-Finding focused quality run 是初阶段的直接验证；它不把 default 或 `--all` Gate 设为初阶段门槛。完成后的明确授权已允许恰好一次 default Gate 作为最终广度验证；`--all` 仍不运行。

## Implementation Observations

2026-09-05：四项 Gate-owned top-level policy 已改为 `blocking`；没有修改 Product constructor default、阈值、scope、exclusion、waiver、flags、required membership、aggregate 或 Record shape。真实四 Check fixture 证明 zero Finding 的 effective aggregate 为 `passed`，而各项 normal Finding 令 owning Check 与同一 aggregate 为 `failed`。focused `bun run check -- --quality` 已在当前工作树通过，四项 final finding count 均为零，machine `records.ndjson` 为零字节。相关 Decision 已据此标记 aligned。最终获授权的唯一一次 default `bun run check` 也通过：31 passed、0 failed、5 package-acceptance Checks 未选择；machine `records.ndjson` 为零字节，四项 quality Check 的 finding count 均为零。`--all` 未运行。

本 design 起草 scanner capability completeness 的统一模型；当前 change 仅在 `openspec/changes/make-scan-completeness-observable/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Context

当前 runtime 在 scan scope 构造前检查全部工具，并把 unavailable component 记录为 skipped。后续 aggregation 使用空数组或缺失值继续执行，所以“profile 有意跳过”“没有 eligible input”“依赖缺失”和“component 失败”可能在最终 summary 中都表现为 zero metrics。最终 `passed` / `warning` 只由 warning 数量决定。

本 change 在现有 exact-input 规范的实现缺口作为直接 bug fix 修复后，为 capability plan、执行状态和最终可信度建立 product-owned model。

## Goals / Non-Goals

**Goals:**

- 明确本次 profile 和 scope 计划运行哪些 capability。
- 为 file metrics、function metrics、duplicate detection 记录稳定状态。
- 只有完整或合法 empty 的 current measurement 可以得到成功 outcome。
- console、report、machine artifact 和 CLI exit 从同一 completeness data 派生。

**Non-Goals:**

- 不改变 scanner 算法、warning threshold 或 supported language。
- 不在本 change 定义稳定公共 JSON schema；该工作由 `stabilize-machine-readable-output` 完成。
- 不把 quick profile 有意跳过 jscpd 视为失败。

## Decisions

### Decision 1: 使用 capability plan 后置 availability check

Core 先完成 scope 和 per-capability input planning，再只检查本次真正需要启动的 components。固定 capability IDs 为 `file-metrics`、`function-metrics` 和 `duplicate-detection`。

### Decision 2: Capability 状态使用封闭枚举

每项 capability 记录 `not-planned`、`no-input`、`succeeded`、`unavailable` 或 `failed`：

- `not-planned`：profile 明确不启用。
- `no-input`：profile 启用，但 normalized scope 没有 eligible input。
- `succeeded`：component 完成并通过 normalization。
- `unavailable`：有输入且需要执行，但 preflight 无法解析或验证 component。
- `failed`：启动后 execution、report、parse 或 validation 失败。

状态 record 同时包含 capability、component、phase 和 normalized diagnostic；不得用 zero metric 代替。

### Decision 3: Current measurement 只允许 complete、empty 或 failed

所有 planned capability 均为 `succeeded` 或 `no-input` 时，overall completeness 为 `complete`；全部 planned capability 都是 `no-input` 时为 `empty`；任一 planned capability 为 `unavailable` 或 `failed` 时为 `failed`。`not-planned` 不降低 completeness。

第一版不提供“partial 但成功”的 outcome，避免调用者再次把残缺结果当作可信 snapshot。

### Decision 4: Completeness 先于 warning status

只有 completeness 为 `complete` 或 `empty` 时才计算最终 `passed` / `warning`。Completeness 为 `failed` 时 core 返回 `failed`，CLI 使用现有 runtime failure exit `2`；warning 数量不能覆盖该结果。

## Risks / Trade-offs

- [缺少某个 tool 会从成功变为失败] → 这是有意的 correctness change；console 和 diagnostic 给出 component、安装/配置入口与重试方式。
- [先收集 scope 再检查工具会改变进度顺序] → 同步更新 CLI/output owner 和入口测试，不把旧 banner 顺序当作更高优先级。
- [后续可能需要 optional capability] → 先由 profile 决定 `not-planned`；若未来开放配置化 optional policy，再单独扩展 plan contract。

## Migration Plan

1. 先直接修复 scc empty-input / out-of-scope regression 并把证明合入主分支；该符合性修复不另建 OpenSpec change。
2. 引入 capability plan/status model 和 validation。
3. 将 availability check 移到 input planning 后。
4. 让 adapters、aggregation、output 和 CLI 消费同一 completeness。
5. 更新 artifacts、docs、tests，并重放 missing-scc 与 no-input smoke。

## Open Questions

1. 用户显式要求 baseline（`--baseline <sha>`）但 baseline measurement 不完整时，是否必须让整个 scan `failed`；推荐“显式 baseline 失败、自动 baseline unavailable 仍保留 current 成功结果”。

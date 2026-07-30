# stabilize-machine-readable-output

## Status

- **Readiness**: implementation-ready.
- **Progress**: change 审计 4/4 已完成；product implementation 尚未开始。
- **Prerequisites**: scan completeness 与 CI quality gate changes 已归档并进入主规范。
- **Execution order**: 当前 active changes 中优先实施本 change；从 `tasks.md` 的 1.1
  projection baseline 开始。

## Product Outcome

`metrics.json`、`warnings.ndjson` 与 `warnings-all.ndjson` 成为 TypeScript/Bun
产品唯一公开、可按统一规则验证的 machine contract。Producer 只发布满足该 contract
的 artifacts；`quality:annotate` 只在完整 warning input 通过同一 contract 后渲染
annotations。

## Development Outcome

Machine DTO、runtime schema、serializer 与 validators 由 Product Output 拥有，并与 core
business models 分离。Core 内部功能和重构只要不改变 machine DTO，就不需要修改 schemas、
examples 或 consumers；真正改变公开 machine structure 时，整个仓库显式硬切到新的唯一
contract。

## Scope

本 change 交付：

- output-owned `MachineMetricsV1` / `MachineWarningV1`；
- canonical JSON Schemas 与 deterministic artifact-set examples；
- artifact-set 和 warning-stream 两个 boundary validators，共享同一 current contract
  definitions；
- publication 前 validation、cross-artifact consistency 与统一 output failure；
- annotation consumer 的全量验证和 exit `2` infrastructure failure；
- owner docs、focused tests 与 required producer-to-consumer acceptance。

它不增加 JSON stdout、第二套 result artifact、manifest、scanner behavior、gate policy、
Product CLI process-outcome kind 或公开 SDK。

## Relationship to Other Active Changes

- `add-external-project-config-workflow` 可以增加 config selection context 和 console
  provenance，但不得让未来 core metadata 自动进入 machine v1。Machine-visible provenance
  需要显式修改 output contract。
- `port-lizard-function-metrics-to-typescript` 可以替换 scanner backend 和内部 identity，
  但必须保持本 change 固定的 DTO field set、warning records 和 artifact-set predicate；
  真正改变公开 projection 时必须独立 version cut。

## AI Execution Path

1. 先读 `proposal.md` 恢复结果、范围和成功标准。
2. 再读 `design.md` 恢复唯一 owner、公开 predicate、依赖边界和 hard-cut 规则。
3. 把 `specs/**` 作为可观察目标 contract，把 `tasks.md` 作为唯一执行顺序。
4. 只在对应实现与验证证据完成后勾选 task；测试正文变化同时遵循当前
   test-evidence workflow。

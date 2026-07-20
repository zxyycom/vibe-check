# stabilize-machine-readable-output

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

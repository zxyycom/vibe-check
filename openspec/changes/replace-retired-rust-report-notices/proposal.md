本 change 的目标是替换 TypeScript 产品人读报告中两类已过时的 Rust release-contract notice；本文仅形成待审计临时计划，不修改其它文档、主规范或现有行为。

## Why

TypeScript/Bun CLI 已成为唯一产品运行时，但人读报告仍声称 Rust CLI、schema 和测试是 release contract，导致报告向用户描述已经退役的所有权。该文案应与当前产品边界一致，同时避免借机改变稳定的报告协议。

## What Changes

- 替换两类过时 notice：Rust CLI 功能仍是 release contract，以及 Rust schema/tests 仍是 release contract。
- 新 notice 明确 TypeScript 产品拥有对应 release contract，不再把已删除的 Rust runtime 描述为当前 owner。
- 保持 artifact shape、字段、status、section 顺序和报告结构不变。
- 为两类替换后的 notice 增加聚焦测试，不引入新的报告抽象。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `output-contract`: 更新人读报告 notice 的当前产品所有权，同时保持既有报告结构和机器可读契约不变。

## Impact

- 预计只修改 `src/product/config.ts` 中生成两类 notice 的文案及相邻聚焦测试。
- 不修改机器可读 artifact、schema、字段、status、报告 section 结构、依赖或 CLI surface。
- 所有计划 artifacts 仅位于 `openspec/changes/replace-retired-rust-report-notices/`。

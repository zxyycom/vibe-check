## Why

TypeScript/Bun CLI 已成为唯一产品运行时，但人读报告的顶部和 footer notice 仍将已退役的 Rust CLI、schema 和测试描述为 release contract 或 release gates。这两处文案需要反映当前产品所有权，同时保持既有报告契约稳定。

## What Changes

- 顶部 notice 将 TypeScript/Bun 产品 CLI、报告契约和产品测试标识为当前 release contract。
- Footer notice 将 TypeScript/Bun 产品测试和契约校验标识为当前 release gates。
- 两处 notice 保留 non-blocking development snapshot 语义。
- 聚焦测试证明新所有权文案及其渲染位置，并由既有验证保护报告结构和机器可读输出。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `output-contract`: 更新人读报告 notice 的当前产品所有权，同时保持既有报告结构和机器可读契约不变。

## Impact

- 实现范围限于 `src/product/config.ts` 的两个 notice 字符串和对应产品层测试。
- 可观察变化限于人读报告文案；artifact shape、字段、status、section 顺序和机器可读输出保持不变。
- 配置模型、依赖和 CLI surface 保持不变。

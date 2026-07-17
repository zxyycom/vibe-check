本 change 的目标是先移除 Rust 产品路径，再把成熟的 TypeScript 质量脚本按现有行为上移为仓库自有产品源码；本文仅形成待审计临时计划，不修改现有主规范或其它 change。

## Why

现有 TypeScript/Bun 质量脚本已经承担实际扫描工作，但仍位于开发脚本目录；此前方案同时重写架构、契约和扫描实现，扩大了迁移风险。现在需要把“产品化”收敛为一次可验证的源码归位，并停止继续投资不再作为目标实现的 Rust 路径。

## What Changes

- **BREAKING**：把删除 Rust 产品代码、构建入口、测试和专用配置作为首个实现切片；Rust 不再是迁移目标或行为基准。
- 将 pinned `scripts/tools/quality-core/**`、`scripts/quality/scan.ts`、参数与默认配置及其必要 `foundation` 运行时依赖按现有结构和行为移动到 `src/product/**`。
- 让正式命令直接调用 `src/product/**`；需要保留的 `scripts/quality/scan.ts` 仅作为指向产品入口的薄兼容包装。
- 用迁移前后的 quick、full、baseline、warning 和 artifact 对照证明源码归位没有顺带改变行为。
- 将配置重做、输出契约重做、scanner 重写、已知缺陷修复和 Lizard TypeScript 移植留给后续独立 change。

## Capabilities

### New Capabilities

- `product-runtime`：定义 TypeScript 质量工具成为唯一产品实现时的源码所有权、入口方向和行为保持要求。

### Modified Capabilities

无。现有质量指标、扫描范围和输出要求在本次迁移中保持不变。

## Impact

- 删除 Rust 产品 crate、Rust 产品入口及其专用构建与测试接线。
- 移动当前 TypeScript 扫描入口、质量核心、运行时 helper、测试和必要 fixtures 到 `src/product/**`；CI annotation 等仓库 consumer 继续留在 `scripts/**`。
- 调整 `package.json` 中的正式产品命令和保留的开发期兼容入口。
- 不新增扫描器、配置格式、报告字段、退出码或指标语义。

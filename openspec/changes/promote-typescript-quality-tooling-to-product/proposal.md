本 change 在长期文档调整后执行两个独立代码任务：完整删除 Rust 产品路径；将现有 TypeScript/Bun 质量脚本按原有行为迁移到 `src/product/**`。Rust 只属于删除任务，TypeScript/Bun 实现是迁移任务的唯一来源。

## Why

现有 TypeScript/Bun 质量脚本已经承担实际扫描工作，但仍位于开发脚本目录。将源码归位与配置、输出、scanner 和 gate 重做同时推进会扩大验证范围；本 change 因此只删除不再采用的 Rust 产品，并把现有脚本归位为正式产品源码。

## What Changes

- 在代码任务前更新长期文档、直接受影响的 OpenSpec contracts 与 AGENTS，分别说明 Rust 产品删除和 TypeScript 产品归位；实现完成前不把目标状态写成已完成状态。
- **BREAKING**：完整删除 Rust 产品代码、测试、fixtures、构建入口、专用配置和执行接线；不保留 Rust 兼容层或迁移输入。
- 删除 Rust-only scanner 和 fixture contracts，并独立记录现有 TypeScript/Bun 脚本已经使用的 jscpd 与 Python/Lizard scanner boundary。
- 只从 pinned `scripts/tools/quality-core/**`、`scripts/quality/scan.ts`、参数与默认配置及其必要 `foundation` 运行时依赖迁移源码、测试和 fixtures，并按现有结构和行为放入 `src/product/**`。
- 让正式命令直接调用 `src/product/**`；需要保留的 `scripts/quality/scan.ts` 仅作为指向产品入口的薄兼容包装。
- 用上移前 TypeScript 脚本与新产品入口的 quick、full、baseline、显式 changed-files、warning 和 artifact 对照证明源码归位没有顺带改变行为。
- 将配置重做、输出契约重做、scanner 重写、已知缺陷修复和 Lizard TypeScript 移植留给后续独立 change。

## Capabilities

### New Capabilities

- `product-runtime`：定义 TypeScript 质量工具成为唯一产品实现时的源码所有权和入口方向。

### Modified Capabilities

- `duplicate-scanning`：删除 jscpd Rust integration requirement，并独立记录现有 TypeScript/Bun 脚本的 jscpd component boundary。
- `structural-scanning`：删除 ast-grep Rust integration requirement，并独立记录现有 TypeScript/Bun 脚本的 Python/Lizard function-metrics boundary。
- `test-fixtures`：删除 Rust CLI 与 ast-grep dependency characterization 专用 fixture requirements；现有 TypeScript 测试资产随源码原样上移。

## Impact

- architecture、CLI、scanner、script-tooling、testing 和 AGENTS 等长期说明先对齐目标 owner 与实现状态。
- Rust-specific scanner 和 fixture contracts 被删除；现有 TypeScript scanner boundary 被独立记录，normalized result、warning、gate 和 output contracts 保持不变。
- 删除 Rust 产品 crate、源码、测试、fixtures、产品入口及其专用构建与测试接线。
- 将当前 TypeScript 扫描入口、质量核心、运行时 helper、测试和必要 fixtures 迁移到 `src/product/**`；CI annotation 等仓库 consumer 继续留在 `scripts/**`。
- 调整 `package.json` 中的正式产品命令和保留的开发期兼容入口。
- 不新增扫描器、配置格式、报告字段、退出码或指标语义。

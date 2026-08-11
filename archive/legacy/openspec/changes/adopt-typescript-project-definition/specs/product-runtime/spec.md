> **核心句：**本 delta 保持 Product 实现由 `src/product/**` 唯一拥有，同时把 selected Project Definition 明确为 Product loader 调用的受信任外部代码，而不是第二套产品实现。

## MODIFIED Requirements

### Requirement: TypeScript 是唯一产品实现

系统 MUST 由 `src/product/**` 下的仓库自有 TypeScript/Bun 源码提供 Vibe Check 产品能力，并且 MUST 不
保留 Rust 产品执行路径。Product-owned runtime import closure MUST 不静态依赖 `scripts/**` 或 toolkit
gitlink。

正式 Project Definition loader MAY 按 `project-definition` contract 动态 import 一个 selected、受信任
的 project-owned TypeScript module 及其显式 imports，并将 `ProjectCheckDeclaration` 解析为 foundation
public metadata 与 private execution bindings。该 module 不是 Product implementation owner；Product
MUST 不把其 source 复制到 `src/product/**`、反向 import 开发脚本或让 project code 替换 CLI/Core/Output
managers。

#### Scenario: Rust 产品路径已删除

- **WHEN**检查产品源码、构建配置、package scripts 和 workspace 验证定义
- **THEN**不存在可构建或可调用的 Rust Vibe Check 产品入口

#### Scenario: 产品源码闭包由仓库所有

- **WHEN**从正式产品入口追踪静态 Product runtime imports
- **THEN**Product-owned 源码均位于 `src/product/**` 且不 import `scripts/**` 或 toolkit gitlink
- **AND**optional `vibe-check/project` entrypoint 只暴露 typed authoring aids 而不是另一 runtime owner

#### Scenario: Selected project code crosses one explicit loader boundary

- **WHEN**module-backed scan 加载受信任 `.vibe-check/config.ts`
- **THEN**只有 Project Definition loader 按 selected path 进入 project-owned module 及其显式 imports
- **AND**resolved public definitions/private bindings 通过 Product validators 进入 Core，不成为平行 CLI/Core 实现

#### Scenario: No-definition mode preserves the closed Product runtime

- **WHEN**调用者使用 `--no-project-definition`
- **THEN**正式入口不动态 import 任何 project definition module
- **AND**execution closure 只包含 Product-owned runtime 及其既有 internal dependencies

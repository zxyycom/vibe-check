## ADDED Requirements

### Requirement: TypeScript 是唯一产品实现
系统 MUST 由 `src/product/**` 下的仓库自有 TypeScript/Bun 源码提供质量扫描产品能力，并且 MUST 不保留 Rust 产品执行路径。

#### Scenario: Rust 产品路径已删除
- **WHEN** 检查产品源码、构建配置、package scripts 和 workspace 验证定义
- **THEN** 不存在可构建或可调用的 Rust Vibe Check 产品入口

#### Scenario: 产品源码闭包由仓库所有
- **WHEN** 从正式产品入口追踪运行时 import
- **THEN** 所有运行时源码均位于 `src/product/**`，且没有 import `scripts/**` 或 toolkit gitlink

### Requirement: 正式入口和 dogfood 入口共享同一核心
系统 SHALL 提供 `bun run product:cli -- scan [project-root]` 作为正式本地入口，并 SHALL 让仓库 `quality:*` 命令通过薄 wrapper 调用同一产品实现。

#### Scenario: 正式入口执行扫描
- **WHEN** 调用者运行 `bun run product:cli -- scan [project-root]` 并传入现有 scan flags
- **THEN** 产品入口把归一化 project root 和 flags 交给上移后的扫描实现

#### Scenario: 省略 project root
- **WHEN** 调用者运行 `bun run product:cli -- scan` 且没有提供 project root
- **THEN** 产品入口使用启动 cwd 作为 project root

#### Scenario: 仓库命令继续 dogfood
- **WHEN** 仓库 automation 调用保留的 `quality:check`、`quality:full-check` 或 `quality:scan`
- **THEN** wrapper 显式传入 Vibe Check 仓库根，并执行 `src/product/**` 中的同一扫描核心

# product-runtime Specification

## Purpose
定义 `src/product/**` 作为唯一 TypeScript/Bun 产品运行时 owner，并固定正式 Product CLI、
dogfood wrapper 与 product core 的单向调用关系，使已退役 Rust 路径和开发脚本不能成为
并行产品实现或运行时依赖。
## Requirements
### Requirement: TypeScript 是唯一产品实现
系统 MUST 由 `src/product/**` 下的仓库自有 TypeScript/Bun 源码提供质量扫描产品能力，并且 MUST 不保留 Rust 产品执行路径。

#### Scenario: Rust 产品路径已删除
- **WHEN** 检查产品源码、构建配置、package scripts 和 workspace 验证定义
- **THEN** 不存在可构建或可调用的 Rust Vibe Check 产品入口

#### Scenario: 产品源码闭包由仓库所有
- **WHEN** 从正式产品入口追踪运行时 import
- **THEN** 所有运行时源码均位于 `src/product/**`，且没有 import `scripts/**` 或 toolkit gitlink

### Requirement: 正式入口和 dogfood 入口共享同一核心

系统 SHALL 提供 `bun run product:cli -- scan [project-root]` 作为正式本地入口，并 SHALL 让仓库 `quality:*` 命令通过薄 wrapper 调用同一产品实现。Repository SHALL 提供 opt-in `bun run quality:gate`，通过 wrapper 对仓库根执行 full `regressions` gate，并要求调用者透传显式 `--baseline <revision>`；wrapper MUST NOT 选择或推断 revision。既有 `quality:check`、`quality:full-check` 与 `quality:scan` MUST 保持省略 gate 的观察行为，其中 `quality:full-check` MUST 是无 baseline 的 full current snapshot。

#### Scenario: 正式入口执行扫描

- **WHEN** 调用者运行 `bun run product:cli -- scan [project-root]` 并传入受支持的 scan flags
- **THEN** 产品入口把归一化 project root、gate request 与其它 flags 交给同一扫描核心

#### Scenario: 省略 project root

- **WHEN** 调用者运行 `bun run product:cli -- scan` 且没有提供 project root
- **THEN** 产品入口使用启动 cwd 作为 project root

#### Scenario: 既有仓库命令保持观察行为

- **WHEN** 仓库 automation 调用 `quality:check`、`quality:full-check` 或 `quality:scan`
- **THEN** wrapper 显式传入 Vibe Check 仓库根并执行同一扫描核心
- **AND** invocation 不隐式选择 gate policy 或 baseline

#### Scenario: Full check is a current snapshot

- **WHEN** 调用者运行 `bun run quality:full-check`
- **THEN** thin wrapper 执行 full profile 的当前快照扫描
- **AND** invocation 不选择、推断或扫描 baseline

#### Scenario: 仓库显式 dogfood regression gate

- **WHEN** 调用者通过 `bun run quality:gate` 透传 `--baseline <revision>`
- **THEN** thin wrapper 对 Vibe Check 仓库根执行 `--profile full --gate regressions --baseline <revision>`
- **AND** comparison prerequisite、GateResult 与 process exit 使用正式产品 contract

#### Scenario: Dogfood gate does not infer a missing baseline

- **WHEN** 调用者运行 `bun run quality:gate` 但没有透传 `--baseline`
- **THEN** 正式 Product CLI 以 missing comparison prerequisite 退出 `3`
- **AND** wrapper 不读取 Git history、branch、upstream 或 remote 来补全 baseline

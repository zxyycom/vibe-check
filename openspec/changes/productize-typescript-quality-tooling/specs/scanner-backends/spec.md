本 capability 定义 TS/Bun 产品核心如何管理不同实现语言的内建 scanner backend；本文只在本 change 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Product-owned scanner adapter boundary
每项 scanner capability SHALL 通过 Vibe Check-owned adapter 接收 product core 提供的 normalized input，并返回 Vibe Check-owned result、diagnostic 或 failure。Backend 的原生类型、私有输出、进程协议和实现语言 MUST 停留在 adapter boundary 内。

#### Scenario: 不同语言 backend 返回统一结果
- **WHEN** product core 调用 JS、native process、Python tool 或 WASM backend
- **THEN** product core 只接收对应 capability 的 Vibe Check-owned normalized result
- **AND** warning、gate 与 report 不依赖 backend 原生类型

### Requirement: Built-in backend registry
第一版产品 SHALL 只从随产品发布的内建 registry 选择 backend。Production execution MUST NOT 通过 PATH、目标项目 `node_modules`、全局 Python environment 或第三方 plugin discovery 静默替换 manifest 声明的 backend。

#### Scenario: 目标机器存在同名全局工具
- **WHEN** 目标机器 PATH 中存在与内建 scanner 同名但版本不同的命令
- **THEN** Vibe Check 仍使用产品 manifest 声明的内建 backend

### Requirement: Versioned semantic profiles
每个可比较的 scanner capability SHALL 声明 stable semantic profile identity。Profile MUST 覆盖 backend identity/version、影响结果的固定选项和 normalization rule version；cache、baseline 和结果 metadata MUST 能区分不兼容 profile。

#### Scenario: Backend 行为发生不兼容变化
- **WHEN** backend version、固定选项或 normalization rules 的变化会改变 normalized results
- **THEN** scanner capability 使用不同 semantic profile identity
- **AND**旧 profile 的 cache 或 baseline 不会被当作新 profile 的等价结果

### Requirement: Explicit backend replacement
不同 backend 只有在声明相同 semantic profile 且四语言 characterization fixtures 证明 normalized results 等价时 MAY 透明替换。否则替换 MUST 通过新的 profile 和显式产品变更完成。

#### Scenario: Rust sidecar 与 Lizard 结果不同
- **WHEN** Rust function-metrics sidecar 在任一已批准 fixture 上产生与 Lizard profile 不同的 normalized metric
- **THEN** sidecar 不得以相同 profile identity 静默替换 Lizard
- **AND**差异进入独立评估或后续 change

### Requirement: Internal extension boundary
第一版 backend adapter contract SHALL 只作为 Vibe Check 内部边界，不构成第三方 plugin API、npm package contract 或跨仓稳定 SDK。

#### Scenario: 新增内建 backend
- **WHEN** Vibe Check 后续增加新的内建 scanner 实现
- **THEN** 该实现可以在保持产品 capability contract 的前提下调整内部 adapter API
- **AND**无需维持未发布的第三方 plugin compatibility

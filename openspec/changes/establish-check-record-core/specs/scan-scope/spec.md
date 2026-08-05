> **核心句：**本 delta 让当前内置 checks 从一次 normalized inventory 获得 resolved exact inputs，同时把动态 definition 与任务编排留在各自后续 owner。

## ADDED Requirements

### Requirement: Built-in check inputs derive from one normalized inventory

Scan Scope SHALL 按 selected semantic scope 构造一次 canonical normalized project-relative inventory。`file-metrics`、`function-metrics` 与 `duplicate-detection` 的 resolved input selector MUST 只从该 inventory、对应 semantic settings 和 applicable named-reference inventory 构造 exact inputs；这些 runner 与 adapter MUST NOT 重新遍历 project root、重新解释 include/exclude 或通过 dependency-private filtering 重新加入 excluded path。

Current、named reference 与 Git-failure fallback SHALL 复用相同 scope/classification semantics。Scope owner 只产生 inventory 和 built-in resolved inputs，不负责发现 CheckDefinition、决定 CheckResult、注册 TaskPlan 或调度 execution。后续 project-defined check 若需要不同 scope contract，必须由其 owning change 显式声明，不能让本 requirement 伪装成 sandbox 保证。

#### Scenario: Each built-in check receives only eligible inputs

- **WHEN**normalized inventory 同时包含 Markdown、TypeScript 和 Rust files
- **THEN**三个 current built-in selectors 只选择其已声明支持的 exact inputs
- **AND**新增其它 check 不改变这些 built-in input sets

#### Scenario: Scope does not become a task scheduler

- **WHEN**resolved check invocations 进入 execution-coordinator boundary
- **THEN**Scan Scope 只提供冻结的 inventory/input values
- **AND**dependency、parallelism、resource 和 task lifecycle 不由 scope owner 决定

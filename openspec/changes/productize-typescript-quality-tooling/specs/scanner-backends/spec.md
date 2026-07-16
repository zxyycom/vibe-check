本 capability 将现有 scc、Lizard/Python 与 jscpd 实现确立为固定产品检测栈，并定义其 component mapping、adapter、依赖解析、process isolation 和错误边界。

## ADDED Requirements

### Requirement: Fixed product scanner stack
TS/Bun 产品 SHALL 使用固定 scanner stack：scc 提供 LOC/file metrics，Lizard/Python 提供 function metrics，jscpd 提供 duplicate detection。Typed product tool config MUST 为每项 capability 声明 command、受支持版本、固定参数、resolution strategy 和 protocol；runtime MUST 按该声明执行。

#### Scenario: 默认扫描使用固定组件
- **WHEN** product core 规划一次完整扫描
- **THEN** LOC 调用 tool config 中的 scc，function metrics 调用 tool config 中的 Python/Lizard，duplicate detection 调用 tool config 中的 jscpd
- **AND** 每项 capability 只有一个 production component mapping

### Requirement: Product-owned scanner adapter boundary
每项 scanner capability SHALL 通过 Vibe Check-owned adapter 接收 product core 提供的 normalized input，并返回 Vibe Check-owned result、diagnostic 或 failure。Component 的原生类型、私有 output、process protocol 和实现语言 MUST 停留在 adapter boundary 内。

#### Scenario: 固定组件返回统一结果
- **WHEN** product core 调用 scc、Lizard/Python 或 jscpd
- **THEN** product core 只接收对应 capability 的 Vibe Check-owned normalized result
- **AND** warning、gate 与 stable report 不依赖 component-native type

### Requirement: Repository-owned component resolution
Product execution SHALL 从 repo-owned typed tool config 解析 scanner components，并复用现有 tool-availability checks 验证组件。Resolution MAY 使用仓库 dependency path 或显式配置的 local executable，但 MUST 验证 component identity 与受支持版本；目标项目的 package metadata MUST NOT 改变 component mapping。组件缺失、不可执行或版本不兼容 MUST 在扫描前产生可行动 fatal diagnostic。

#### Scenario: 目标机器存在同名工具
- **WHEN** PATH 或目标项目中存在与 scc、Lizard 或 jscpd 同名但版本不同的工具
- **THEN** Vibe Check 使用 typed tool config 解析并通过 availability check 的 component
- **AND** 同名工具不能静默改变 product behavior

#### Scenario: 声明组件缺失或版本不兼容
- **WHEN** typed tool config 声明的 scanner component 无法解析、不可执行或版本不受支持
- **THEN** product control plane 在启动扫描前返回 scanner fatal diagnostic
- **AND** scan 不产生看似成功的空结果

### Requirement: Result-affecting scanner identity
每项固定 scanner capability SHALL 提供 result-affecting identity，覆盖 tool/runtime version、固定参数、parser/protocol、normalization rules 和 product config。Cache 与 baseline metadata MUST 记录该 identity，并只在 identity 与 input semantics 兼容时复用 state。

#### Scenario: Scanner identity 兼容
- **WHEN** component、固定参数、parser/normalization、config 和 input semantics 与已有 state 兼容
- **THEN** product core 可以按现有 cache/baseline contract 复用该 state

#### Scenario: Scanner identity 不兼容
- **WHEN** 任一 result-affecting component fact 改变并导致旧 state 不再等价
- **THEN** product core 不复用该 state
- **AND** 返回明确的重新扫描、baseline 处理或 incompatibility diagnostic

### Requirement: External process isolation
Process adapter SHALL 使用 tool-config-resolved command、structured arguments、明确 working directory、timeout 和 bounded stdout/stderr capture。Adapter MUST NOT 通过 shell command string 拼接 project inputs，也 MUST NOT 让 component-native output 直接改变 stable product output。

#### Scenario: 含空格与 Unicode 的项目路径
- **WHEN** product core 把含空格或 Unicode 的 exact input paths 传给 scanner component
- **THEN** adapter 以独立 arguments 传递 paths
- **AND** component 不通过 shell re-parsing 或 project-root discovery 扩大输入范围

#### Scenario: Component protocol failure
- **WHEN** component 超时、输出超过上限或返回无法解析的 protocol data
- **THEN** adapter 返回受控 diagnostic 或 fatal failure
- **AND** raw stdout/stderr 不直接进入 stable human 或 machine output

### Requirement: Fixed-stack failure semantics
固定 scanner component 的 availability、identity、execution、protocol 和 normalization failures SHALL 映射到 product-owned diagnostic categories。Product execution MUST 把组件不可用或版本不兼容视为 setup 或执行缺陷；MUST NOT 把缺失 component、invalid output 或 normalization failure 投影为 zero metrics、zero duplicates 或 clean scan。

#### Scenario: jscpd 无法启动
- **WHEN** typed tool config 解析的 jscpd entry 无法启动
- **THEN** duplicate capability 返回 product-owned fatal failure
- **AND** report 不把 duplicate count 表达为可信的 zero

#### Scenario: Lizard CSV 不符合固定 protocol
- **WHEN** configured Lizard 输出无法按 pinned protocol 解析
- **THEN** function-metrics adapter 返回明确 protocol diagnostic 或 fatal failure
- **AND** invalid rows 不被静默当成完整 function set

### Requirement: Internal extension boundary
Scanner adapter contract SHALL 只作为 Vibe Check 内部模块边界，不构成第三方 plugin API、npm package contract 或跨仓稳定 SDK。

#### Scenario: 固定组件实现升级
- **WHEN** Vibe Check 升级 scc、Lizard/Python 或 jscpd integration
- **THEN** internal adapter API 可以随 product modules 一起调整
- **AND** 对应 capability 的 product-owned result、diagnostic 和 owner tests 保持满足

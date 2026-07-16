本 delta 将现有 Lizard/Python pipeline 确立为正式 function-metrics component，并保留其 function model、参数、ordering 和 diagnostic contract。

## ADDED Requirements

### Requirement: Function metrics backend boundary
Structural scanning SHALL 由 typed product tool config 中固定的 Python/Lizard `function-metrics` component 提供。Adapter MUST 把 Lizard output 归一化为 Vibe Check-owned metrics、component provenance、diagnostics 或 failure，并 MUST 满足本 capability 的 normalization contract。Lizard-native types 和 CSV protocol MUST 停留在 adapter boundary 内。

#### Scenario: Product function metrics scan
- **WHEN** 固定 component 扫描 TypeScript、Go、Rust 或 Python supported input
- **THEN** product core 调用 typed tool config 解析并通过 availability check 的 Python/Lizard component
- **AND** 只消费 Vibe Check-owned normalized function metrics 与 diagnostics

#### Scenario: Function metrics 记录固定组件 provenance
- **WHEN** Lizard/Python scan 成功产生 normalized function metrics
- **THEN** result batch 记录 Python、Lizard 与 parser/normalization identities
- **AND** baseline、cache、warning、gate 与 report data 使用该 normalized result

## MODIFIED Requirements

### Requirement: Structural scanner adapter input
Product core SHALL 从 Vibe Check normalized scan scope 运行 structural scanning。function-metrics adapter MUST 只接收已收集的 supported files，MUST NOT 扫描 project root、被 scan scope rules 排除的文件或 product control plane 判定为 unsupported 的文件。Supported structural inputs MUST 只包含 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py`；`.d.ts` MUST 按 TypeScript supported input 处理。

#### Scenario: 接收 exact supported file paths
- **WHEN** scan scope 包含 supported files `src/app.ts` 和 `src/lib.rs`
- **THEN** function-metrics adapter 接收这两个 exact supported file paths
- **AND** adapter 不通过 project root 重新发现输入

#### Scenario: 不接收 unsupported 或 excluded files
- **WHEN** scan scope 包含 supported file `src/app.ts`、unsupported ordinary file `src/view.tsx`，且 `generated/schema.ts` 已被 scope rules 排除
- **THEN** function-metrics adapter 只接收 `src/app.ts`
- **AND** `src/view.tsx` 与 `generated/schema.ts` 不进入 structural scanner input

#### Scenario: 没有 supported files 时正常完成
- **WHEN** normalized scan scope 不包含 supported files
- **THEN** product core 跳过 function-metrics adapter
- **AND** scan 正常完成，不产生 function warning 或 structural diagnostic

### Requirement: Normalized stable-named function metrics
Function-metrics backend results SHALL 在 warning generation 前归一化为 Vibe Check-owned `FunctionMetric` records。每条 record MUST 包含 project-root-relative `/` path、stable lowercase language、kind、display name、1-based inclusive source range、function NLOC、cyclomatic complexity 和 normalized parameter count。Kind MUST 为 `function`、`method` 或 `constructor`。Result batch MUST 标识 result-affecting scanner identity；backend-private fields MAY 保留在 bounded raw diagnostic artifact，但 MUST NOT 成为 Core metric contract。

Supported function forms MUST 包含有 executable body 且能从 declaration、method、constructor 或 direct binding 得到稳定名称的函数形态：TypeScript named function declarations、methods、constructors 和直接绑定到 identifier 的 arrow / function expressions；Go functions 与 methods；Rust free / nested functions、impl methods 和带 body 的 trait default methods；Python sync / async free functions、nested functions 与 class methods。Signature-only declarations、无 body 的 abstract / trait declarations，以及没有稳定 declaration 或 binding name 的 anonymous closures / callbacks MUST NOT 产生 `FunctionMetric`。

Function NLOC、cyclomatic complexity、position mapping 和 normalization rules MUST 由本 requirement 与 adapter contract 明文定义；同一 source、scan scope、scanner identity 与 config MUST 产生确定性 metrics。

#### Scenario: 四种 supported language 产生 normalized metrics
- **WHEN** TypeScript、Go、Rust 和 Python supported fixtures 分别包含有 executable body 的 named function 或 method
- **THEN** adapter 为每个受支持形态返回 normalized path、language、kind、display name、range、NLOC、cyclomatic complexity 和 parameter count

#### Scenario: 稳定绑定的 TypeScript arrow function 被纳入
- **WHEN** TypeScript source 将 arrow function 直接绑定到 identifier `buildReport`
- **THEN** adapter 返回 display name 为 `buildReport`、kind 为 `function` 的 normalized metric

#### Scenario: Declaration-only function 不产生 metric
- **WHEN** `.d.ts`、TypeScript abstract member 或 Rust trait signature 声明函数但没有 executable body
- **THEN** adapter 不为该 declaration 产生 `FunctionMetric`
- **AND** 该状态不产生 structural diagnostic

#### Scenario: 匿名 callback 不产生 metric
- **WHEN** supported source 包含无法从 declaration 或 direct binding 得到稳定名称的 anonymous callback 或 closure
- **THEN** adapter 不为该 callback 或 closure 产生 `FunctionMetric`

#### Scenario: Component 私有字段被隔离
- **WHEN** Lizard 返回 native function record
- **THEN** adapter 只把 function-metrics contract 定义的 normalized fields 交给 product core
- **AND** Lizard-native structure 不进入 warning、gate 或 stable output owner

### Requirement: Cross-language parameter count semantics
`FunctionMetric.parameter_count` SHALL 表示调用者显式传入的 parameter slots。Go method receiver、Rust self receiver、TypeScript `this` pseudo-parameter，以及 Python non-static class method 的第一个 receiver parameter MUST NOT 计入。Python `@staticmethod` parameters MUST 全部按普通 explicit parameters 计数。Default、optional、destructured、rest 和 variadic parameter forms MUST 各按一个 parameter slot 计数。Go / TypeScript parameter-list comment 与 unnamed punctuation MUST NOT 贡献 parameter slot，也 MUST NOT 产生 structural diagnostic 或 scanner fatal。

Structural-scanning owner MUST 明文记录并通过四语言 fixtures 证明这些规则。任何改变 receiver、compound parameter 或 comment handling 的实现 MUST 先更新本 requirement、兼容性处理和对应 fixtures。

#### Scenario: Language receiver 不计入参数数量
- **WHEN** Go method、Rust method、TypeScript method 或 Python non-static class method 各声明一个 receiver 和四个 explicit parameters
- **THEN** 每条 normalized metric 的 `parameter_count` 为 `4`

#### Scenario: Python static method 没有隐式 receiver
- **WHEN** Python `@staticmethod` 声明五个 parameters
- **THEN** normalized metric 的 `parameter_count` 为 `5`

#### Scenario: 复合 parameter form 按槽计数
- **WHEN** supported function 包含 default、optional、destructured、rest 或 variadic parameter
- **THEN** 每个 source-level parameter slot 对 `parameter_count` 贡献 `1`
- **AND** binding 内部包含的名字数量不增加 parameter count

#### Scenario: Parameter-list comment 不改变参数数量
- **WHEN** Go 或 TypeScript supported function 的 parameter list 在四个 explicit parameters 之间包含 comment
- **THEN** normalized `parameter_count` 仍为 `4`
- **AND** scan 不产生 structural diagnostic 或 scanner fatal

#### Scenario: 参数语义变化更新 owner contract
- **WHEN** Lizard/Python、固定参数或 normalization 升级在 receiver 或 compound parameter fixture 上产生不兼容 count
- **THEN** function-metrics capability 更新本 requirement 与 result-affecting scanner identity
- **AND** 旧 baseline、cache 或 accepted-warning state 只按明确兼容性结果处理

### Requirement: Structural scanner diagnostics
Structural scanner problems SHALL 显式可见。单文件不存在、不是 regular file、不可读、不是 UTF-8，或 backend 能可靠归因到单文件的 parse/measurement failure 时，adapter MUST 跳过该文件的全部 function metrics，并为该文件产生 warning-severity `STRUCTURAL_SCAN_PARTIAL` diagnostic；scan report MUST 标记为 `partial`。即使所有 structural inputs 都因这些文件级问题被跳过，只要其它 scanner report data 仍可信，scan MUST 返回带 diagnostics 的 partial report。

Backend dependency resolution/version failure、初始化或 spawn failure、timeout、unbounded/invalid protocol output、panic、supported language mapping 缺失、project root 外 path、无效 source range、normalization invariant failure，或无法归因且使 normalized result 不可信的 process failure MUST 映射为 scanner fatal error，MUST NOT 转换成 empty structural result。

#### Scenario: 单文件 parse 或 measurement error 产生 partial report
- **WHEN** backend 能把一个 supported file 的 parse 或 measurement failure 可靠归因到该文件，且 scan pipeline 仍能产生其它可信 report data
- **THEN** adapter 不返回该文件的 function metrics
- **AND** report 包含该文件的 `STRUCTURAL_SCAN_PARTIAL` diagnostic
- **AND** `summary.status` 为 `partial`

#### Scenario: 所有 structural inputs 都发生文件级问题
- **WHEN** scan scope 包含 supported files，但每个 structural input 都因可归因的读取、UTF-8、parse 或 measurement 问题被跳过
- **THEN** scan 返回带对应 `STRUCTURAL_SCAN_PARTIAL` diagnostics 的 partial report
- **AND** structural failure 不表现为 clean completed report

#### Scenario: Adapter result 无法信任时 fatal
- **WHEN** dependency resolution、version、initialization、spawn、timeout、protocol、language mapping、path、range 或 normalization invariant 失效
- **THEN** CLI 以 scanner fatal exit code `3` 退出
- **AND** stdout 不包含 human 或 JSON scan report

## REMOVED Requirements

### Requirement: ast-grep Rust integration boundary
**Reason**: Production structural scanning 固定由现有 Python/Lizard pipeline 承担，不再把 `ast-grep-core` / `ast-grep-language` 作为长期 product boundary。

**Migration**: 将默认 component mapping、长期 owner 与 fixtures 切换到 Python/Lizard；product core 继续消费 Vibe Check-owned `FunctionMetric` contract。
